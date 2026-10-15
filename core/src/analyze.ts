import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { LimitError, SyntaxError } from "./errors";
import {
  buildMacroTable,
  findCalls,
  linkProblems,
  topLevelDefines,
} from "./macros";
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
  CallNode,
  CaseNode,
  DefineNode,
  FenceNode,
  ForNode,
  IfNode,
  Limits,
  ListItemNode,
  ListNode,
  SectionNode,
  SetNode,
  TableHeaderNode,
  TableNode,
  TableRowNode,
  ValueExpr,
  VariableNode,
} from "./types";

export type UsageKind =
  | "output"
  | "if"
  | "elseif"
  | "case"
  | "for"
  | "list_item"
  | "table"
  | "set"
  | "call";

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
  | "DEFINE"
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
  /** The macros the template defines, in source order; present only when it defines any */
  macros?: { name: string; params: string[] }[];
}

/** Nesting bound for analyze when the caller sets no maxDepth */
const ANALYZE_MAX_DEPTH = 256;

/**
 * Report the variables a template reads and the filters it applies, derived
 * from the parsed template. Loop item names (inside their loop) and
 * @-metadata are not inputs. A macro body is walked once and a CALL is never
 * followed, so the work is linear in the template however the macros call
 * each other.
 *
 * A duplicate macro name or a wrong argument count is thrown like a parse
 * error; an unknown macro is a diagnostic, since partials may supply it at
 * render.
 */
export function analyze(
  template: string,
  options?: { limits?: Partial<Limits> }
): TemplateAnalysis {
  try {
    const ast = new Parser(new Lexer(template).tokenize(), {
      maxDepth: options?.limits?.maxDepth ?? ANALYZE_MAX_DEPTH,
      maxNodes: options?.limits?.maxNodes,
    }).parse();
    const macros = buildMacroTable(topLevelDefines(ast));
    const walker = new Walker(macros);
    walker.checkCounts(findCalls(ast.body));
    walker.visitBlock(ast.body);
    return walker.result();
  } catch (error) {
    // a stack overflow in a very deep template is a depth error, not a crash
    if (!(error instanceof RangeError)) throw error;
    throw new LimitError(
      "limit-depth",
      "The template nests too deeply to analyze",
      1,
      1,
      "Flatten the nested blocks or lower limits.maxDepth"
    );
  }
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
  /** Names bound so far in each enclosing block, innermost last: loop items and SET locals */
  private scopes: Set<string>[] = [];
  private tableDepth = 0;
  private macroList: { name: string; params: string[] }[] = [];

  constructor(private readonly macros: Map<string, DefineNode>) {}

  /** Throw the first call, in source order, that gives a known macro the wrong number of arguments */
  checkCounts(calls: CallNode[]): void {
    const wrong = linkProblems(calls, this.macros).find((p) => p.kind === "arity");
    if (wrong) {
      throw new SyntaxError(
        wrong.message,
        wrong.call.line,
        wrong.call.column,
        "Give the call as many arguments as the macro has parameters"
      );
    }
  }

  result(): TemplateAnalysis {
    const result: TemplateAnalysis = {
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
    if (this.macroList.length > 0) result.macros = this.macroList;
    return result;
  }

  visitAll(nodes: ASTNode[]): void {
    for (const node of nodes) this.visit(node);
  }

  /**
   * Visit the nodes of one block: names bound inside (the given ones, such as
   * a loop item, and every SET from its tag on) end with it
   */
  visitBlock(nodes: ASTNode[], bound: string[] = []): void {
    this.scopes.push(new Set(bound));
    this.visitAll(nodes);
    this.scopes.pop();
  }

  private visit(node: ASTNode): void {
    switch (node.type) {
      case "Variable":
        return this.visitValue(
          node as VariableNode,
          node as VariableNode,
          this.tableDepth > 0 ? "table" : "output"
        );
      case "Set":
        return this.visitSet(node as SetNode);
      case "Define":
        this.countBlock("DEFINE");
        return this.visitDefine(node as DefineNode);
      case "Call":
        return this.visitCall(node as CallNode);
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

  /**
   * A DEFINE body is walked once, as a block of its own: its names are its
   * parameters, and nothing of the scope around the DEFINE is visible in it
   */
  private visitDefine(node: DefineNode): void {
    this.macroList.push({ name: node.name, params: node.params });
    const outerScopes = this.scopes;
    const outerTableDepth = this.tableDepth;
    this.scopes = [];
    this.tableDepth = 0;
    try {
      this.visitBlock(node.body, node.params);
    } finally {
      this.scopes = outerScopes;
      this.tableDepth = outerTableDepth;
    }
  }

  /** A CALL reads each path argument; an unknown macro is a diagnostic; the body is not followed */
  private visitCall(node: CallNode): void {
    for (const arg of node.args) {
      if (arg.kind === "path") this.record(arg.path.join("."), "call", false);
    }
    if (!this.macros.has(node.name)) {
      this.diagnostics.push({
        code: "unknown-macro",
        message: `Unknown macro: ${node.name}`,
        line: node.line,
        column: node.column,
      });
    }
  }

  /**
   * A SET reads its expression like an output does, then binds its name for
   * the rest of the block
   */
  private visitSet(node: SetNode): void {
    this.visitValue(node.value, node, "set");
    this.scopes[this.scopes.length - 1].add(node.name);
  }

  /** Record the reads and filters of a value expression; diagnostics sit at `at` */
  private visitValue(expr: ValueExpr, at: ASTNode, kind: UsageKind): void {
    const text = expr.path.join(".");

    // a literal first term reads nothing
    if (!expr.literal && isMathExpression(text)) {
      for (const name of mathVariableNames(text)) this.record(name, kind, false);
    } else if (!expr.literal) {
      this.record(text, kind, expr.defaultValue !== undefined);
    }

    for (const filter of expr.filters ?? []) {
      const { name } = filter;
      this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
      const definition = FILTER_REGISTRY.find((f) => f.name === name);
      if (!definition) {
        this.diagnostics.push({
          code: "unknown-filter",
          message: `Unknown filter: ${name}`,
          line: at.line,
          column: at.column,
        });
        continue;
      }
      for (const message of undeclaredParameterMessages(definition, filter)) {
        this.diagnostics.push({
          code: "type-error",
          message,
          line: at.line,
          column: at.column,
        });
      }
    }
  }

  private visitIf(node: IfNode, kind: "if" | "elseif"): void {
    let branch = node;
    let branchKind = kind;
    for (;;) {
      this.visitCondition(branch.condition, branchKind, branch);
      this.visitBlock(branch.consequent);
      const { alternate } = branch;
      if (Array.isArray(alternate)) return this.visitBlock(alternate);
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
      this.visitBlock(when.body);
    }
    if (node.default) this.visitBlock(node.default.body);
  }

  private visitFor(node: ForNode): void {
    this.record(node.iterable.join("."), "for", false);
    for (const arg of [node.limit, node.offset]) {
      if (arg?.kind === "path") this.record(arg.path.join("."), "for", false);
    }
    this.visitBlock(node.body, [node.itemName]);
    if (node.elseBody) this.visitBlock(node.elseBody);
  }

  private visitSection(node: SectionNode): void {
    if (node.title.kind === "path") {
      this.record(node.title.path.join("."), "output", false);
    }
    this.visitBlock(node.body);
  }

  private visitFence(node: FenceNode): void {
    if (node.lang?.kind === "path") {
      this.record(node.lang.path.join("."), "output", true);
    }
    this.visitBlock(node.body);
  }

  private visitListItem(node: ListItemNode): void {
    if (node.condition) this.visitCondition(node.condition, "list_item", node);
    this.visitBlock(node.content);
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
    this.visitBlock(node.cells.flat()); // one block per row
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
    if (root.startsWith("@") || this.scopes.some((scope) => scope.has(root))) {
      return;
    }

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
