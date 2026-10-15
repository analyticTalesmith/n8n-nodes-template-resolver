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
  TableRowNode,
  TernaryNode,
  SectionNode,
  FenceNode,
  VariableMap,
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
  DivisionByZeroError,
  evaluateCondition,
  evaluateMathExpression,
  formatNumber,
  hasStrayCharacter,
  isMathExpression,
  isTruthy,
  subtractionHint,
} from "./expressions";
import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
import { COLLECTION_FILTERS } from "./filters-collection";

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
  private loopContext: Map<string, TemplateValue> = new Map();

  constructor(
    private variables: VariableMap,
    options?: { strictMode?: boolean; limits?: Partial<Limits>; render?: boolean }
  ) {
    this.strictMode = options?.strictMode ?? true;
    this.render = options?.render ?? false;
    this.limits = withDefaultLimits(options?.limits);
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
        const result = evaluateMathExpression(pathStr, this.getAllVariables(), {
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
    let branch = node;
    for (;;) {
      const current = branch;
      const result = this.at(current, () =>
        evaluateCondition(current.condition, this.getAllVariables())
      );
      if (result) return this.visitBody(current.consequent);

      const { alternate } = current;
      if (!alternate) return "";
      if (Array.isArray(alternate)) return this.visitBody(alternate);
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
      if (valueStr === whenNode.value) {
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
    const iterable = this.at(node, () => this.resolveNestedPath(node.iterable));
    const array = tryCoerceToArray(iterable);

    if (array === null) {
      if (this.strictMode) {
        throw new TypeError(
          `Cannot iterate over non-array value: ${describeValue(iterable)}`,
          node.line,
          node.column,
          "Ensure the value is an array or can be coerced to one"
        );
      }
      return "";
    }

    const results: string[] = [];
    let length = 0;
    const outerLoopContext = new Map(this.loopContext);

    for (let i = 0; i < array.length; i++) {
      this.countIteration(node);

      // Set loop context
      this.loopContext.set(node.itemName, array[i]);
      this.loopContext.set("@index0", i);
      this.loopContext.set("@index1", i + 1);
      this.loopContext.set("@first", i === 0);
      this.loopContext.set("@last", i === array.length - 1);
      this.loopContext.set("@notFirst", i !== 0);
      this.loopContext.set("@notLast", i !== array.length - 1);

      // Render body
      const output = node.body.map((child) => this.visit(child)).join("");
      length += output.length;
      this.checkOutputLength(length, node);
      results.push(output);
    }

    this.restoreLoopContext(outerLoopContext);

    return results.join("");
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

  private restoreLoopContext(saved: Map<string, TemplateValue>): void {
    this.loopContext.clear();
    for (const [key, value] of saved) {
      this.loopContext.set(key, value);
    }
  }

  /**
   * Visit LIST node
   */
  private visitList(node: ListNode, depth = 0): string {
    const indent = "   ".repeat(depth); // 3 spaces per level
    let counter = 1;
    const results: string[] = [];

    for (const item of node.items) {
      const output = this.visitListItem(item, counter, depth);
      if (output !== null) {
        results.push(`${indent}${counter}. ${output}`);
        counter++;
      }
    }

    return results.join("\n");
  }

  /**
   * Visit LIST_ITEM node
   */
  private visitListItem(
    node: ListItemNode,
    counter: number,
    depth: number
  ): string | null {
    // Check condition
    if (node.condition) {
      const condition = node.condition;
      const result = this.at(node, () =>
        evaluateCondition(condition, this.getAllVariables())
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

    // Process rows (may include FOR loops)
    for (const rowNode of node.rows) {
      // Check if this row contains a FOR loop
      if (
        rowNode.cells.length === 1 &&
        rowNode.cells[0].length === 1 &&
        rowNode.cells[0][0].type === "For"
      ) {
        const forNode = rowNode.cells[0][0] as ForNode;

        // Iterate and generate rows
        const iterable = this.at(forNode, () =>
          this.resolveNestedPath(forNode.iterable)
        );
        const array = tryCoerceToArray(iterable);

        if (array) {
          const outerLoopContext = new Map(this.loopContext);
          for (let i = 0; i < array.length; i++) {
            this.countIteration(forNode);

            // Set loop context
            this.loopContext.set(forNode.itemName, array[i]);
            this.loopContext.set("@index0", i);
            this.loopContext.set("@index1", i + 1);
            this.loopContext.set("@first", i === 0);
            this.loopContext.set("@last", i === array.length - 1);
            this.loopContext.set("@notFirst", i !== 0);
            this.loopContext.set("@notLast", i !== array.length - 1);

            // Process FOR body - look for TableRow nodes
            for (const bodyNode of forNode.body) {
              if (bodyNode.type === "TableRow") {
                const tableRowNode = bodyNode as TableRowNode;
                const cells = this.processCellsArray(tableRowNode.cells);
                rows.push(cells);
              } else {
                // Fallback: render and split by |
                const forOutput = this.visit(bodyNode);
                if (forOutput.trim()) {
                  const cells = forOutput.split("|").map((cell) => cell.trim());
                  rows.push(cells);
                }
              }
            }
          }

          this.restoreLoopContext(outerLoopContext);
        }
      } else {
        // Regular row - process all cells
        const cells = this.processCellsArray(rowNode.cells);
        rows.push(cells);
      }
    }

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
   * Process cells array where each cell is an array of AST nodes
   * Returns an array of strings, one per cell
   */
  private processCellsArray(cells: ASTNode[][]): string[] {
    return cells.map((cellNodes) => {
      const content = cellNodes.map((node) => this.visit(node)).join("");
      return content.replace(/\r?\n/g, " ").replace(/(?<!\\)\|/g, "\\|").trim();
    });
  }

  /**
   * Visit TERNARY node
   */
  private visitTernary(node: TernaryNode): string {
    const result = evaluateCondition(node.condition, this.getAllVariables());

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

    let current: TemplateValue;
    const hasKey = this.hasRootKey(rootKey);

    // Determine correct root value
    if (this.loopContext.has(rootKey)) {
      current = this.loopContext.get(rootKey);
    } else if (this.variables.has(rootKey)) {
      current = this.variables.get(rootKey);
    }

    // Missing variable (not existing key)
    if (!hasKey) {
      if (!allowUndefined && this.strictMode) {
        throw new MissingVariableError(
          rootKey,
          1,
          1,
          Array.from(this.variables.keys()),
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
        current = (current as Record<string, TemplateValue>)[path[i]];
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
    return this.loopContext.has(rootKey) || this.variables.has(rootKey);
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

  /**
   * Get all variables (including loop context)
   */
  private getAllVariables(): VariableMap {
    const combined = new Map(this.variables);
    for (const [key, value] of this.loopContext.entries()) {
      combined.set(key, value);
    }
    return combined;
  }
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
