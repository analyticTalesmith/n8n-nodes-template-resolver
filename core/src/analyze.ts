import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { parseFilter } from "./filters";
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
  ForNode,
  IfNode,
  ListItemNode,
  ListNode,
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

export interface TemplateAnalysis {
  variables: VariableUsage[];
  filters: FilterUsage[];
  diagnostics: AnalysisDiagnostic[];
}

const KNOWN_FILTERS = new Set(["head", "tail", "trim", "escape_md"]);

/**
 * Report the variables a template reads and the filters it applies, derived
 * from the parsed template. Loop item names (inside their loop) and
 * @-metadata are not inputs.
 */
export function analyze(template: string): TemplateAnalysis {
  const ast = new Parser(new Lexer(template).tokenize()).parse();
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
      })),
      filters: Array.from(this.filterCounts, ([name, count]) => ({
        name,
        count,
      })),
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
        return this.visitIf(node as IfNode, "if");
      case "Case":
        return this.visitCase(node as CaseNode);
      case "For":
        return this.visitFor(node as ForNode);
      case "List":
        return (node as ListNode).items.forEach((i) => this.visitListItem(i));
      case "Table":
        return this.visitTable(node as TableNode);
      case "Header":
      case "TableRow":
        return this.visitCells(node as TableHeaderNode | TableRowNode);
    }
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
      const { name } = parseFilter(filter.name);
      this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
      if (!KNOWN_FILTERS.has(name)) {
        this.diagnostics.push({
          code: "unknown-filter",
          message: `Unknown filter: ${name}`,
          line: node.line,
          column: node.column,
        });
      }
    }
  }

  private visitIf(node: IfNode, kind: "if" | "elseif"): void {
    this.visitCondition(node.condition, kind, node);
    this.visitAll(node.consequent);
    if (Array.isArray(node.alternate)) this.visitAll(node.alternate);
    else if (node.alternate) this.visitIf(node.alternate, "elseif");
  }

  private visitCase(node: CaseNode): void {
    this.record(node.expression, "case", false);
    for (const when of node.cases) this.visitAll(when.body);
    if (node.default) this.visitAll(node.default.body);
  }

  private visitFor(node: ForNode): void {
    this.record(node.iterable.join("."), "for", false);
    this.scopes.push(node.itemName);
    this.visitAll(node.body);
    this.scopes.pop();
  }

  private visitListItem(node: ListItemNode): void {
    if (node.condition) this.visitCondition(node.condition, "list_item", node);
    this.visitAll(node.content);
  }

  private visitTable(node: TableNode): void {
    if (node.header) this.visitCells(node.header);
    for (const row of node.rows) this.visitCells(row);
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
