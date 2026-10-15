import {
  ProgramNode,
  ASTNode,
  TextNode,
  VariableNode,
  IfNode,
  CaseNode,
  ForNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableChild,
  TableRowNode,
  TernaryNode,
  SectionNode,
  FenceNode,
  VariableLookup,
  ForWindowArg,
  TemplateValue,
  Limits,
  withDefaultLimits,
} from "./types";
import {
  TypeError,
  MissingVariableError,
  MathSyntaxError,
  LimitError,
  locateError,
} from "./errors";
import {
  tryCoerceToArray,
  tryCoerceToString,
  tryCoerceStringForPathSegment,
} from "./coercion";
import {
  builtInLength,
  DivisionByZeroError,
  evaluateCondition,
  evaluateMathExpression,
  evaluateWhen,
  formatNumber,
  hasStrayCharacter,
  isMathExpression,
  isTruthy,
  subtractionHint,
} from "./expressions";
import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
import { COLLECTION_FILTERS } from "./filters-collection";
import { Frame, RootScope, readOwn } from "./scope";

/** Filters that take any value as it is, so they run before the unprintable check */
const KEEPS_RAW_INPUT = new Set([
  ...COLLECTION_FILTERS.map((filter) => filter.name).filter(
    (name) => name !== "lines" && name !== "join"
  ),
  "default",
]);

/**
 * Interpreter: Walks AST and produces output string
 *
 * Features:
 * - Variable substitution with safe nested access
 * - Math expressions in variables
 * - Conditional rendering (IF/ELSE/ELSEIF)
 * - CASE/WHEN/DEFAULT blocks
 * - FOR loops with special variables (@index0, @first, @last, etc.)
 * - Lists (numbered, nested)
 * - Tables (with/without headers, alignment)
 * - Code fences sized to their content (FENCE)
 * - Filters (head, tail, trim, escape_md, fence, heading_offset)
 * - Default operator (??)
 * - Ternary with variable references
 */
export class Interpreter {
  private strictMode: boolean;
  private limits: Limits;
  private render: boolean;
  private iterations = 0;
  private omittedSections = 0;
  private readonly root: RootScope;
  /** The innermost scope: a loop frame while a loop renders, else the root */
  private scope: VariableLookup;

  constructor(
    variables: VariableLookup,
    options?: { strictMode?: boolean; limits?: Partial<Limits>; render?: boolean }
  ) {
    this.strictMode = options?.strictMode ?? true;
    this.render = options?.render ?? false;
    this.limits = withDefaultLimits(options?.limits);
    this.root = new RootScope(variables);
    this.scope = this.root;
  }

  /**
   * FOR iterations run by the latest interpret call
   */
  get iterationCount(): number {
    return this.iterations;
  }

  /**
   * Sections dropped for an empty body by the latest interpret call
   */
  get sectionsOmitted(): number {
    return this.omittedSections;
  }

  /**
   * Main interpretation entry point
   */
  interpret(ast: ProgramNode): string {
    this.iterations = 0;
    this.omittedSections = 0;
    this.scope = this.root;
    return this.visitProgram(ast);
  }

  /**
   * Visit program node (root)
   */
  private visitProgram(node: ProgramNode): string {
    const parts: string[] = [];
    let length = 0;
    for (const child of node.body) {
      const output = this.visit(child);
      length += output.length;
      this.checkOutputLength(length, child);
      parts.push(output);
    }
    return parts.join("");
  }

  /**
   * Run a node's own evaluation, locating any error it throws at the node
   */
  private at<T>(node: ASTNode, evaluate: () => T): T {
    try {
      return evaluate();
    } catch (error) {
      throw locateError(error, node.line, node.column);
    }
  }

  private countIteration(node: ForNode): void {
    this.iterations++;
    if (this.iterations > this.limits.maxIterations) {
      throw new LimitError(
        "limit-iterations",
        `Loops ran more than ${this.limits.maxIterations} iterations in total`,
        node.line,
        node.column,
        "Iterate over less data or raise limits.maxIterations"
      );
    }
  }

  private checkOutputLength(length: number, node: ASTNode): void {
    if (length > this.limits.maxOutputChars) {
      throw new LimitError(
        "limit-output",
        `Output is longer than ${this.limits.maxOutputChars} characters`,
        node.line,
        node.column,
        "Render less content or raise limits.maxOutputChars"
      );
    }
  }

  /**
   * Visit dispatcher
   */
  private visit(node: ASTNode): string {
    switch (node.type) {
      case "Text":
        return this.visitText(node as TextNode);
      case "Variable":
        return this.at(node, () => this.visitVariable(node as VariableNode));
      case "If":
        return this.visitIf(node as IfNode);
      case "Case":
        return this.visitCase(node as CaseNode);
      case "For":
        return this.visitFor(node as ForNode);
      case "List":
        return this.visitList(node as ListNode);
      case "Table":
        return this.visitTable(node as TableNode);
      case "Section":
        return this.visitSection(node as SectionNode);
      case "Fence":
        return this.visitFence(node as FenceNode);
      case "Ternary":
        return this.at(node, () => this.visitTernary(node as TernaryNode));
      case "Comment":
        return ""; // Comments excluded from output
      default:
        return "";
    }
  }

  /**
   * Visit text node (pass through)
   */
  private visitText(node: TextNode): string {
    return node.content;
  }

  /**
   * Visit variable node: ${{name}}, ${{user.name | filter}}, ${{a + b}}
   */
  private visitVariable(node: VariableNode): string {
    // Check if this is a math expression (contains operators)
    const pathStr = node.path.join(".");
    let mathError: unknown = null;
    if (isMathExpression(pathStr) || hasStrayCharacter(pathStr)) {
      try {
        const result = evaluateMathExpression(pathStr, this.scope, {
          zeroIsError: this.render,
        });
        return this.render ? formatNumber(result) : String(result);
      } catch (error) {
        if (error instanceof DivisionByZeroError) throw error;
        // Not a valid math expression, continue with normal resolution
        mathError = error;
      }
    }

    const allowUndefined = node.defaultValue !== undefined;
    let value: TemplateValue = null;
    let lookupError: unknown = null;
    try {
      value = this.resolveNestedPath(node.path, allowUndefined);
    } catch (error) {
      lookupError = error;
    }
    // A malformed math text is an error only when no variable has that name
    if (mathError instanceof MathSyntaxError && !this.hasRootKey(node.path[0])) {
      throw mathError;
    }
    if (lookupError !== null) throw lookupError;

    // Apply default operator if value is falsy
    if (node.defaultValue !== undefined && !isTruthy(value)) {
      value = node.defaultValue;
    }

    // Apply filters
    if (node.filters && node.filters.length > 0) {
      for (const filter of node.filters) {
        // text filters would turn an unprintable value into ""
        if (!KEEPS_RAW_INPUT.has(filter.name)) this.valueToString(value);
        value = applyFilters(value, [filter]) as TemplateValue;
      }
    }

    return this.valueToString(value);
  }

  /**
   * Visit IF node
   */
  private visitIf(node: IfNode): string {
    return this.visitBody(this.selectBranch(node));
  }

  /**
   * The body an IF chain runs: the first branch whose condition holds, else
   * the ELSE body, else nothing
   */
  private selectBranch(node: IfNode): ASTNode[] {
    let branch = node;
    for (;;) {
      const current = branch;
      const result = this.at(current, () =>
        evaluateCondition(current.condition, this.scope)
      );
      if (result) return current.consequent;

      const { alternate } = current;
      if (!alternate) return [];
      if (Array.isArray(alternate)) return alternate;
      branch = alternate;
    }
  }

  private visitBody(nodes: ASTNode[]): string {
    return nodes.map((child) => this.visit(child)).join("");
  }

  /**
   * Visit CASE node
   */
  private visitCase(node: CaseNode): string {
    const valueStr = this.at(node, () =>
      this.valueToString(this.resolveNestedPath(node.expression.split(".")))
    );

    // Check WHEN clauses
    for (const whenNode of node.cases) {
      const matches = this.at(whenNode, () =>
        evaluateWhen(whenNode.match, valueStr, (path) =>
          this.valueToString(this.resolveNestedPath(path))
        )
      );
      if (matches) {
        return whenNode.body.map((child) => this.visit(child)).join("");
      }
    }

    // Fall to DEFAULT
    if (node.default) {
      return node.default.body.map((child) => this.visit(child)).join("");
    }

    return "";
  }

  /**
   * Visit FOR loop
   */
  private visitFor(node: ForNode): string {
    const results: string[] = [];
    this.runLoop(node, false, (nodes) => {
      const output = this.visitBody(nodes);
      results.push(output);
      return output.length;
    });
    return results.join("");
  }

  /**
   * The one loop runner behind FOR and the rows a TABLE builds with FOR.
   * renderBranch renders a body (the loop body per item, then the ELSE body
   * when no item rendered) and returns the characters it added.
   * A TABLE keeps its legacy rule: a non-iterable value is no rows, no error.
   */
  private runLoop(
    node: ForNode,
    silentNonIterable: boolean,
    renderBranch: (nodes: ASTNode[]) => number
  ): void {
    const iterable = this.at(node, () => this.resolveNestedPath(node.iterable));
    const array = tryCoerceToArray(iterable);
    if (array === null && this.strictMode && !silentNonIterable) {
      throw new TypeError(
        `Cannot iterate over non-array value: ${describeValue(iterable)}`,
        node.line,
        node.column,
        "Ensure the value is an array or can be coerced to one"
      );
    }

    const limit = this.at(node, () => this.readWindow(node.limit, "limit"));
    const offset = this.at(node, () => this.readWindow(node.offset, "offset"));
    const start = offset ?? 0;
    const items = array
      ? array.slice(start, limit === undefined ? undefined : start + limit)
      : [];

    let length = 0;
    if (items.length > 0) {
      const outer = this.scope;
      const frame = new Frame(outer);
      this.scope = frame;
      try {
        for (let i = 0; i < items.length; i++) {
          this.countIteration(node);
          frame.set(node.itemName, items[i]);
          frame.set("@index0", i);
          frame.set("@index1", i + 1);
          frame.set("@first", i === 0);
          frame.set("@last", i === items.length - 1);
          frame.set("@notFirst", i !== 0);
          frame.set("@notLast", i !== items.length - 1);
          frame.set("@total", items.length);

          length += renderBranch(node.body);
          this.checkOutputLength(length, node);
        }
      } finally {
        this.scope = outer;
      }
    } else if (node.elseBody) {
      length += renderBranch(node.elseBody);
      this.checkOutputLength(length, node);
    }
  }

  /**
   * Read a limit or offset: a number or a variable path read in the scope
   * outside the loop. A missing value is an error in strict mode and an
   * ignored argument in lenient mode; undefined means no such argument.
   */
  private readWindow(
    arg: ForWindowArg | undefined,
    name: "limit" | "offset"
  ): number | undefined {
    if (!arg) return undefined;
    let value: TemplateValue;
    if (arg.kind === "literal") {
      value = arg.value;
    } else {
      value = this.resolveNestedPath(arg.path, true);
      if (value == null) {
        if (!this.strictMode) return undefined;
        throw new MissingVariableError(
          arg.path.join("."),
          1,
          1,
          this.root.names(),
          subtractionHint(arg.path[0])
        );
      }
    }

    const number = windowNumber(value);
    if (number === null) {
      throw new TypeError(
        `${name} must be a whole number of 0 or more, got ${describeValue(value)}`,
        1,
        1,
        `Give ${name}= a whole number or a variable that holds one`
      );
    }
    return number;
  }

  /**
   * Visit SECTION: the heading, a blank line and the body without its
   * leading and trailing blank lines; nothing when the body is blank and
   * skipEmpty is set
   */
  private visitSection(node: SectionNode): string {
    const title = this.at(node, () => this.sectionTitle(node));
    const heading = `${"#".repeat(node.level)} ${title}\n`;
    const body = node.body
      .map((child) => this.visit(child))
      .join("")
      .replace(/\r\n/g, "\n");

    if (body.trim() === "") {
      if (!node.skipEmpty) return heading;
      this.omittedSections++;
      return "";
    }
    const trimmed = body
      .replace(/^([ \t]*\n)+/, "")
      .replace(/(\n[ \t]*)+$/, "");
    return `${heading}\n${trimmed}\n`;
  }

  private sectionTitle(node: SectionNode): string {
    if (node.title.kind === "literal") return node.title.text;
    const value = this.resolveNestedPath(node.title.path);
    if (typeof value !== "string" || value === "") {
      throw new TypeError(
        `SECTION title must be a non-empty string, got ${describeValue(value)}`,
        node.line,
        node.column,
        "Map the title variable to a non-empty string"
      );
    }
    return value;
  }

  /**
   * Visit FENCE: the rendered body in a code fence sized to it
   */
  private visitFence(node: FenceNode): string {
    const lang = this.at(node, () => {
      const value = this.fenceLang(node);
      checkFenceLang(value);
      return value;
    });
    const body = node.body.map((child) => this.visit(child)).join("");
    return fenced(body, lang);
  }

  /**
   * The FENCE language; a missing, null or empty value gives a bare fence
   */
  private fenceLang(node: FenceNode): string {
    if (node.lang === null) return "";
    if (node.lang.kind === "literal") return node.lang.text;
    const value = this.resolveNestedPath(node.lang.path, true);
    if (value == null) return "";
    if (typeof value !== "string") {
      throw new TypeError(
        `FENCE lang must be a string, got ${describeValue(value)}`,
        node.line,
        node.column,
        "Map the lang variable to a string"
      );
    }
    return value;
  }

  /**
   * Visit LIST node
   */
  private visitList(node: ListNode, depth = 0): string {
    const lines: string[] = [];
    this.collectListItems(node.items, depth, lines);
    return lines.join("\n");
  }

  /**
   * Add the numbered lines of LIST children: an item gives its line, an IF
   * the lines of its branch, a FOR the lines of each iteration (or of its
   * ELSE body). The numbering follows the lines already collected for this
   * LIST, so items from any source share one counter. Returns the characters
   * the lines hold.
   */
  private collectListItems(
    children: ASTNode[],
    depth: number,
    lines: string[]
  ): number {
    const indent = "   ".repeat(depth); // 3 spaces per level
    let length = 0;
    for (const child of children) {
      if (child.type === "ListItem") {
        const output = this.visitListItem(child as ListItemNode, depth);
        if (output !== null) {
          const line = `${indent}${lines.length + 1}. ${output}`;
          lines.push(line);
          length += line.length;
        }
      } else if (child.type === "If") {
        length += this.collectListItems(
          this.selectBranch(child as IfNode),
          depth,
          lines
        );
      } else if (child.type === "For") {
        this.runLoop(child as ForNode, false, (nodes) => {
          const added = this.collectListItems(nodes, depth, lines);
          length += added;
          return added;
        });
      }
    }
    return length;
  }

  /**
   * Visit LIST_ITEM node
   */
  private visitListItem(node: ListItemNode, depth: number): string | null {
    // Check condition
    if (node.condition) {
      const condition = node.condition;
      const result = this.at(node, () =>
        evaluateCondition(condition, this.scope)
      );
      if (!result) {
        // Show fallback if provided
        return node.fallback || null;
      }
    }

    // Render content
    let content = "";
    for (const child of node.content) {
      if (child.type === "List") {
        // Nested list
        content += "\n" + this.visitList(child as ListNode, depth + 1);
      } else {
        content += this.visit(child);
      }
    }

    return content.trim();
  }

  /**
   * Visit TABLE node
   */
  private visitTable(node: TableNode): string {
    const rows: string[][] = [];

    // Process header
    if (node.header) {
      const headerCells = this.processCellsArray(node.header.cells);
      rows.push(headerCells);
    }

    // Process rows (ROW, FOR and IF blocks, in source order)
    for (const child of node.rows) this.rowsFromChild(child, rows);

    // Auto-pad rows to match header length
    const maxCols = Math.max(...rows.map((r) => r.length));
    rows.forEach((row) => {
      while (row.length < maxCols) {
        row.push("");
      }
    });

    // Build markdown table
    const lines: string[] = [];

    // Header row
    if (node.hasHeader && rows.length > 0) {
      const headerRow = rows[0];
      lines.push(`| ${headerRow.join(" | ")} |`);

      // Separator row with alignment
      const separators = headerRow.map((cell, idx) => {
        const align = node.alignment?.[idx] || "left";
        // choose width at least 5 or cell length + 2 padding
        const width = Math.max(5, String(cell).length);
        const hyphens = "-".repeat(width);
        switch (align) {
          case "center":
            return `:${hyphens}:`;
          case "right":
            return `${hyphens}:`;
          default:
            return `:${hyphens}`;
        }
      });
      lines.push(`|${separators.join("|")}|`);

      // Data rows
      for (let i = 1; i < rows.length; i++) {
        lines.push(`| ${rows[i].join(" | ")} |`);
      }
    } else {
      // No header - just rows
      for (const row of rows) {
        lines.push(`| ${row.join(" | ")} |`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Add the rows a TABLE child builds: a ROW gives its cells, an IF the rows
   * of its branch, a FOR the rows of each iteration (or of its ELSE body). A
   * TABLE never errors on the iterable of a FOR that builds rows.
   * Returns the characters the rows hold.
   */
  private rowsFromChild(child: TableChild, rows: string[][]): number {
    if (child.type === "For") {
      let length = 0;
      this.runLoop(child, true, (nodes) => {
        const added = this.tableRowsFrom(nodes, rows);
        length += added;
        return added;
      });
      return length;
    }
    if (child.type === "If") {
      return this.tableRowsFrom(this.selectBranch(child), rows);
    }
    const cells = this.processCellsArray(child.cells);
    rows.push(cells);
    return cells.reduce((sum, cell) => sum + cell.length, 0);
  }

  /**
   * Render the nodes of a FOR or IF body in a TABLE into rows: a ROW node gives its
   * cells, an IF or FOR that holds a ROW builds rows too, and a run of other
   * nodes is rendered together and split on a pipe.
   * Returns the characters the rows hold.
   */
  private tableRowsFrom(nodes: ASTNode[], rows: string[][]): number {
    let length = 0;
    const add = (cells: string[]): void => {
      rows.push(cells);
      length += cells.reduce((sum, cell) => sum + cell.length, 0);
    };

    const addText = (text: string): void => {
      if (text.trim()) {
        add(text.split("|").map((cell) => cell.trim()));
      }
    };
    const inline = ["Text", "Variable", "Ternary", "Comment"];
    let run: ASTNode[] = [];
    const flush = (): void => {
      if (run.length === 1) {
        addText(this.visit(run[0]));
      } else if (run.length > 1) {
        const text = run.map((node) => this.visit(node)).join("");
        for (const line of text.split(/\r?\n/)) addText(line);
      }
      run = [];
    };
    for (const bodyNode of nodes) {
      if (bodyNode.type === "TableRow") {
        flush();
        add(this.processCellsArray((bodyNode as TableRowNode).cells));
      } else if (holdsRow(bodyNode)) {
        flush();
        length += this.rowsFromChild(bodyNode as TableChild, rows);
      } else if (inline.includes(bodyNode.type)) {
        run.push(bodyNode);
      } else {
        flush();
        addText(this.visit(bodyNode));
      }
    }
    flush();
    return length;
  }

  /**
   * Process cells array where each cell is an array of AST nodes
   * Returns an array of strings, one per cell
   */
  private processCellsArray(cells: ASTNode[][]): string[] {
    return cells.map((cellNodes) => {
      const content = cellNodes.map((node) => this.visit(node)).join("");
      return content
        .replace(/\r?\n/g, " ")
        .replace(/(\\*)\|/g, (found, slashes: string) =>
          slashes.length % 2 === 0 ? `${slashes}\\|` : found
        )
        .trim();
    });
  }

  /**
   * Visit TERNARY node
   */
  private visitTernary(node: TernaryNode): string {
    const result = evaluateCondition(node.condition, this.scope);

    if (result) {
      return this.resolveTernaryValue(node.trueValue);
    } else {
      return this.resolveTernaryValue(node.falseValue);
    }
  }

  /**
   * Resolve ternary value (can be string literal or variable reference)
   */
  private resolveTernaryValue(value: string | TernaryNode): string {
    if (typeof value !== "string") {
      // Nested ternary
      return this.visitTernary(value);
    }

    // Check if it's a variable reference: ${{varName}}
    const varMatch = value.match(/^\$\{\{(.+?)\}\}$/);
    if (varMatch) {
      const path = varMatch[1].split(".");
      const resolved = this.resolveNestedPath(path);
      return this.valueToString(resolved);
    }

    // Static string
    return value;
  }

  /**
   * Resolve nested property path with safe access
   *
   * Features:
   * - Dot notation: user.profile.name
   * - Array index: items.0
   * - JSON string auto-parsing
   * - Null safety (returns null on missing properties)
   */
  private resolveNestedPath(
    path: string[],
    allowUndefined = false
  ): TemplateValue {
    const rootKey = path[0];

    const hasKey = this.hasRootKey(rootKey);
    let current: TemplateValue = hasKey ? this.scope.get(rootKey) : undefined;

    // Missing variable (not existing key)
    if (!hasKey) {
      if (!allowUndefined && this.strictMode) {
        throw new MissingVariableError(
          rootKey,
          1,
          1,
          this.root.names(),
          subtractionHint(rootKey)
        );
      }
      return null;
    }

    // Key exists â€” even if value === undefined
    // That is allowed and should not throw.
    // Continue resolving nested keys.
    for (let i = 1; i < path.length; i++) {
      if (current == null) return null;

      if (path[i] === "length") {
        const built = builtInLength(current);
        if (built) {
          current = built.value;
          continue;
        }
      }

      // Try JSON parsing if string
      if (typeof current === "string") {
        const parsed = tryCoerceStringForPathSegment(current, path[i]);
        if (parsed) {
          current = parsed;
        } else {
          return null;
        }
      }

      // Access property
      if (typeof current === "object" && !Array.isArray(current)) {
        current = readOwn(current, path[i]);
      } else if (Array.isArray(current)) {
        const index = parseInt(path[i]);
        current = current[index];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * True when a variable or loop value holds this name, whatever its value
   */
  private hasRootKey(rootKey: string): boolean {
    return this.scope.has(rootKey);
  }

  /**
   * Convert value to string for output
   */
  private valueToString(value: TemplateValue): string {
    if (value == null) return "";
    if (tryCoerceToString(value) === null) {
      throw new TypeError(
        "Cannot print a value with no text form (a cyclic structure or a BigInt)",
        1,
        1,
        "Map the variable to text, a number or plain data without cycles"
      );
    }
    return valueToText(value);
  }
}

/**
 * True for an IF or FOR that holds a ROW directly in one of its branches or
 * bodies, through nested IF and FOR: it builds table rows
 */
function holdsRow(node: ASTNode): boolean {
  const holds = (nodes: ASTNode[]): boolean =>
    nodes.some((child) => child.type === "TableRow" || holdsRow(child));
  if (node.type === "For") {
    const { body, elseBody } = node as ForNode;
    return holds(body) || (elseBody !== undefined && holds(elseBody));
  }
  if (node.type !== "If") return false;
  let branch: IfNode | null = node as IfNode;
  while (branch) {
    if (holds(branch.consequent)) return true;
    const alternate: ASTNode[] | IfNode | null = branch.alternate;
    if (Array.isArray(alternate)) return holds(alternate);
    branch = alternate;
  }
  return false;
}

/**
 * The value as JSON, or its plain string form when JSON cannot hold it
 * (a cycle, a BigInt)
 */
function describeValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * A FOR window value as a number: a number, or a text holding a plain decimal
 * number, that is a whole number from 0 up to the largest safe integer; null
 * for anything else
 */
function windowNumber(value: TemplateValue): number | null {
  let number: number;
  if (typeof value === "number") {
    number = value;
  } else if (
    typeof value === "string" &&
    /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/.test(value)
  ) {
    number = Number(value);
  } else {
    return null;
  }
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
