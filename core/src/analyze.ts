import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { FILTER_REGISTRY, undeclaredParameterMessages } from "./filters";
import {
  conditionOperands,
  hasBareWhitespace,
  isMathExpression,
  mathVariableNames,
  parseLiteral,
} from "./expressions";
import {
  ASTNode,
  CaseNode,
  FenceNode,
  ForNode,
  IfNode,
  Limits,
  ListItemNode,
  ListNode,
  SectionNode,
  TableHeaderNode,
  TableNode,
  TableRowNode,
  VariableNode,
} from "./types";

export type UsageKind =
  | "output"
  | "if"
  | "elseif"
  | "case"
  | "for"
  | "list_item"
  | "table";

export interface VariableUsage {
  /** Root name, the part before the first dot */
  name: string;
  /** Distinct full paths read, in source order */
  paths: string[];
  /** Distinct constructs that read it, in source order */
  usedIn: UsageKind[];
  /** True when every read supplies a ?? default */
  optional: boolean;
  /** True when some read has no ?? default; always !optional */
  required: boolean;
}

export interface FilterUsage {
  name: string;
  count: number;
}

export interface AnalysisDiagnostic {
  code: string;
  message: string;
  line: number;
  column: number;
}

export type BlockKind =
  | "IF"
  | "CASE"
  | "FOR"
  | "LIST"
  | "TABLE"
  | "SECTION"
  | "FENCE";

export interface TemplateAnalysis {
  variables: VariableUsage[];
  filters: FilterUsage[];
  /** Count per block kind present in the template */
  blocks: Partial<Record<BlockKind, number>>;
  diagnostics: AnalysisDiagnostic[];
}

/** Nesting bound for analyze when the caller sets no maxDepth */
const ANALYZE_MAX_DEPTH = 256;

/**
 * Report the variables a template reads and the filters it applies, derived
 * from the parsed template. Loop item names (inside their loop) and
 * @-metadata are not inputs.
 */
export function analyze(
  template: string,
  options?: { limits?: Partial<Limits> }
): TemplateAnalysis {
  const ast = new Parser(new Lexer(template).tokenize(), {
    maxDepth: options?.limits?.maxDepth ?? ANALYZE_MAX_DEPTH,
    maxNodes: options?.limits?.maxNodes,
  }).parse();
  const walker = new Walker();
  walker.visitAll(ast.body);
  return walker.result();
}

interface Entry {
  paths: Set<string>;
  usedIn: Set<UsageKind>;
  allOptional: boolean;
}

class Walker {
  private entries = new Map<string, Entry>();
  private filterCounts = new Map<string, number>();
  private blocks: Partial<Record<BlockKind, number>> = {};
  private diagnostics: AnalysisDiagnostic[] = [];
  private scopes: string[] = [];
  private tableDepth = 0;

  result(): TemplateAnalysis {
    return {
      variables: Array.from(this.entries, ([name, entry]) => ({
        name,
        paths: Array.from(entry.paths),
        usedIn: Array.from(entry.usedIn),
        optional: entry.allOptional,
        required: !entry.allOptional,
      })),
      filters: Array.from(this.filterCounts, ([name, count]) => ({
        name,
        count,
      })),
      blocks: this.blocks,
      diagnostics: this.diagnostics,
    };
  }

  visitAll(nodes: ASTNode[]): void {
    for (const node of nodes) this.visit(node);
  }

  private visit(node: ASTNode): void {
    switch (node.type) {
      case "Variable":
        return this.visitVariable(node as VariableNode);
      case "If":
        this.countBlock("IF");
        return this.visitIf(node as IfNode, "if");
      case "Case":
        this.countBlock("CASE");
        return this.visitCase(node as CaseNode);
      case "For":
        this.countBlock("FOR");
        return this.visitFor(node as ForNode);
      case "List":
        this.countBlock("LIST");
        return this.visitAll((node as ListNode).items);
      case "ListItem":
        return this.visitListItem(node as ListItemNode);
      case "Table":
        this.countBlock("TABLE");
        return this.visitTable(node as TableNode);
      case "Section":
        this.countBlock("SECTION");
        return this.visitSection(node as SectionNode);
      case "Fence":
        this.countBlock("FENCE");
        return this.visitFence(node as FenceNode);
      case "Header":
      case "TableRow":
        return this.visitCells(node as TableHeaderNode | TableRowNode);
    }
  }

  private countBlock(kind: BlockKind): void {
    this.blocks[kind] = (this.blocks[kind] ?? 0) + 1;
  }

  private visitVariable(node: VariableNode): void {
    const kind: UsageKind = this.tableDepth > 0 ? "table" : "output";
    const text = node.path.join(".");

    if (isMathExpression(text)) {
      for (const name of mathVariableNames(text)) this.record(name, kind, false);
    } else {
      this.record(text, kind, node.defaultValue !== undefined);
    }

    for (const filter of node.filters ?? []) {
      const { name } = filter;
      this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
      const definition = FILTER_REGISTRY.find((f) => f.name === name);
      if (!definition) {
        this.diagnostics.push({
          code: "unknown-filter",
          message: `Unknown filter: ${name}`,
          line: node.line,
          column: node.column,
        });
        continue;
      }
      for (const message of undeclaredParameterMessages(definition, filter)) {
        this.diagnostics.push({
          code: "type-error",
          message,
          line: node.line,
          column: node.column,
        });
      }
    }
  }

  private visitIf(node: IfNode, kind: "if" | "elseif"): void {
    let branch = node;
    let branchKind = kind;
    for (;;) {
      this.visitCondition(branch.condition, branchKind, branch);
      this.visitAll(branch.consequent);
      const { alternate } = branch;
      if (Array.isArray(alternate)) return this.visitAll(alternate);
      if (!alternate) return;
      branch = alternate;
      branchKind = "elseif";
    }
  }

  private visitCase(node: CaseNode): void {
    this.record(node.expression, "case", false);
    for (const when of node.cases) {
      const { match } = when;
      const items = match.kind === "list" ? match.items : [match.item];
      for (const item of items) {
        if (item.kind === "path") this.record(item.path.join("."), "case", false);
      }
      this.visitAll(when.body);
    }
    if (node.default) this.visitAll(node.default.body);
  }

  private visitFor(node: ForNode): void {
    this.record(node.iterable.join("."), "for", false);
    for (const arg of [node.limit, node.offset]) {
      if (arg?.kind === "path") this.record(arg.path.join("."), "for", false);
    }
    this.scopes.push(node.itemName);
    this.visitAll(node.body);
    this.scopes.pop();
    if (node.elseBody) this.visitAll(node.elseBody);
  }

  private visitSection(node: SectionNode): void {
    if (node.title.kind === "path") {
      this.record(node.title.path.join("."), "output", false);
    }
    this.visitAll(node.body);
  }

  private visitFence(node: FenceNode): void {
    if (node.lang?.kind === "path") {
      this.record(node.lang.path.join("."), "output", true);
    }
    this.visitAll(node.body);
  }

  private visitListItem(node: ListItemNode): void {
    if (node.condition) this.visitCondition(node.condition, "list_item", node);
    this.visitAll(node.content);
  }

  private visitTable(node: TableNode): void {
    if (node.header) this.visitCells(node.header);
    for (const row of node.rows) {
      // a FOR written directly in a TABLE reads its body as table cells
      this.tableDepth++;
      this.visit(row);
      this.tableDepth--;
    }
  }

  private visitCells(node: TableHeaderNode | TableRowNode): void {
    this.tableDepth++;
    for (const cell of node.cells) this.visitAll(cell);
    this.tableDepth--;
  }

  private visitCondition(
    condition: string,
    kind: UsageKind,
    at: ASTNode
  ): void {
    for (const operand of conditionOperands(condition)) {
      if (operand === "" || parseLiteral(operand) !== null) continue;
      if (hasBareWhitespace(operand)) {
        this.diagnostics.push({
          code: "unrecognized-condition",
          message: `Unrecognized condition: ${operand}`,
          line: at.line,
          column: at.column,
        });
        continue;
      }
      this.record(operand, kind, false);
    }
  }

  private record(path: string, kind: UsageKind, optional: boolean): void {
    const root = path.split(".")[0];
    if (root.startsWith("@") || this.scopes.includes(root)) return;

    let entry = this.entries.get(root);
    if (!entry) {
      entry = { paths: new Set(), usedIn: new Set(), allOptional: true };
      this.entries.set(root, entry);
    }
    entry.paths.add(path);
    entry.usedIn.add(kind);
    if (!optional) entry.allOptional = false;
  }
}
