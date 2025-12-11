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
  VariableMap,
  TemplateValue,
} from "./types";
import { TypeError, MissingVariableError } from "./errors";
import {
  tryCoerceToArray,
  tryCoerceToObject,
  tryCoerceToString,
} from "./coercion";
import {
  evaluateCondition,
  evaluateMathExpression,
  isTruthy,
} from "./expressions";
import { parseFilter, applyFilters } from "./filters";

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
 * - Filters (head, tail, trim, escape_md)
 * - Default operator (??)
 * - Ternary with variable references
 */
export class Interpreter {
  private strictMode: boolean;
  private loopContext: Map<string, TemplateValue> = new Map();

  constructor(
    private variables: VariableMap,
    options?: { strictMode?: boolean }
  ) {
    this.strictMode = options?.strictMode ?? true;
  }

  /**
   * Main interpretation entry point
   */
  interpret(ast: ProgramNode): string {
    return this.visitProgram(ast);
  }

  /**
   * Visit program node (root)
   */
  private visitProgram(node: ProgramNode): string {
    return node.body.map((child) => this.visit(child)).join("");
  }

  /**
   * Visit dispatcher
   */
  private visit(node: ASTNode): string {
    switch (node.type) {
      case "Text":
        return this.visitText(node as TextNode);
      case "Variable":
        return this.visitVariable(node as VariableNode);
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
      case "Ternary":
        return this.visitTernary(node as TernaryNode);
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
    if (this.isMathExpression(pathStr)) {
      try {
        const result = evaluateMathExpression(pathStr, this.getAllVariables());
        return String(result);
      } catch (error) {
        console.log("Invalid math expression error:", error);
        // Not a valid math expression, continue with normal resolution
      }
    }

    const allowUndefined = node.defaultValue !== undefined;
    let value = this.resolveNestedPath(node.path, allowUndefined);

    // Apply default operator if value is falsy
    if (node.defaultValue !== undefined && !isTruthy(value)) {
      value = node.defaultValue;
    }

    // Apply filters
    if (node.filters && node.filters.length > 0) {
      const text = this.valueToString(value);
      const filters = node.filters.map((f) => parseFilter(f.name));
      value = applyFilters(text, filters);
    }

    return this.valueToString(value);
  }

  /**
   * Check if expression is a math expression
   */
  private isMathExpression(expr: string): boolean {
    // Contains math operators but isn't just a path
    const hasMathOp = /[+\-*/%]/.test(expr);
    const hasParens = /[()]/.test(expr);
    return hasMathOp || hasParens;
  }

  /**
   * Visit IF node
   */
  private visitIf(node: IfNode): string {
    const result = evaluateCondition(node.condition, this.getAllVariables());

    if (result) {
      return node.consequent.map((child) => this.visit(child)).join("");
    }

    if (node.alternate) {
      if (Array.isArray(node.alternate)) {
        // ELSE branch
        return node.alternate.map((child) => this.visit(child)).join("");
      } else {
        // ELSEIF (nested IfNode)
        return this.visitIf(node.alternate);
      }
    }

    return "";
  }

  /**
   * Visit CASE node
   */
  private visitCase(node: CaseNode): string {
    const value = this.resolveNestedPath(node.expression.split("."));
    const valueStr = this.valueToString(value);

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
    const iterable = this.resolveNestedPath(node.iterable);
    const array = tryCoerceToArray(iterable);

    if (array === null) {
      if (this.strictMode) {
        throw new TypeError(
          `Cannot iterate over non-array value: ${JSON.stringify(iterable)}`,
          node.line,
          node.column,
          "Ensure the value is an array or can be coerced to one"
        );
      }
      return "";
    }

    const results: string[] = [];

    for (let i = 0; i < array.length; i++) {
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
      results.push(output);
    }

    // Clear loop context
    this.loopContext.clear();

    return results.join("");
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
      const result = evaluateCondition(node.condition, this.getAllVariables());
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
        const iterable = this.resolveNestedPath(forNode.iterable);
        const array = tryCoerceToArray(iterable);

        if (array) {
          for (let i = 0; i < array.length; i++) {
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

          // Clear loop context
          this.loopContext.clear();
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
      return content.trim();
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
    const hasKey = this.loopContext.has(rootKey) || this.variables.has(rootKey);

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
          Array.from(this.variables.keys())
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
        const parsed = tryCoerceToObject(current);
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
   * Convert value to string for output
   */
  private valueToString(value: TemplateValue): string {
    if (value == null) return "";

    const str = tryCoerceToString(value);
    return str || "";
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
