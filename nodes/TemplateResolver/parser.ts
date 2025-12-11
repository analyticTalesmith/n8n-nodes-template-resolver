import {
  Token,
  TokenType,
  ProgramNode,
  ASTNode,
  TextNode,
  VariableNode,
  IfNode,
  CaseNode,
  WhenNode,
  DefaultNode,
  ForNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableHeaderNode,
  TableRowNode,
  CommentNode,
  FilterCall,
} from "./types";
import { SyntaxError } from "./errors";

/**
 * Parser: Builds Abstract Syntax Tree from tokens
 *
 * Uses recursive descent parsing for clean nesting support.
 */
export class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  /**
   * Main parsing entry point
   */
  parse(): ProgramNode {
    const body: ASTNode[] = [];

    while (!this.isAtEnd()) {
      const node = this.parseNode();
      if (node) {
        body.push(node);
      }
    }

    return {
      type: "Program",
      body,
      line: 1,
      column: 1,
    };
  }

  /**
   * Parse single node
   */
  private parseNode(): ASTNode | null {
    const token = this.current();

    switch (token.type) {
      case TokenType.TEXT:
        return this.parseText();
      case TokenType.VARIABLE:
        return this.parseVariable();
      case TokenType.IF:
        return this.parseIf();
      case TokenType.CASE:
        return this.parseCase();
      case TokenType.FOR:
        return this.parseFor();
      case TokenType.LIST:
        return this.parseList();
      case TokenType.TABLE:
        return this.parseTable();
      case TokenType.HEADER:
        return this.parseTableHeader();
      case TokenType.ROW:
        return this.parseTableRow();
      case TokenType.COMMENT:
        return this.parseComment();
      case TokenType.EOF:
        return null;
      default:
        throw new SyntaxError(
          `Unexpected token: ${token.type}`,
          token.line,
          token.column,
          "Check template syntax"
        );
    }
  }

  /**
   * Parse text node
   */
  private parseText(): TextNode {
    const token = this.consume(TokenType.TEXT);
    return {
      type: "Text",
      content: token.value,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse variable: ${{name}}, ${{user.name | filter}}
   */
  private parseVariable(): VariableNode {
    const token = this.consume(TokenType.VARIABLE);
    const parts = this.parseVariableExpression(token.value);

    return {
      type: "Variable",
      path: parts.path,
      defaultValue: parts.defaultValue,
      filters: parts.filters,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse variable expression with filters and default operator
   * Examples:
   * - "name" â†’ { path: ["name"] }
   * - "user.name" â†’ { path: ["user", "name"] }
   * - 'name ?? "default"' â†’ { path: ["name"], defaultValue: "default" }
   * - "text | trim | head=10" â†’ { path: ["text"], filters: [...] }
   */
  private parseVariableExpression(expr: string): {
    path: string[];
    defaultValue?: string;
    filters?: FilterCall[];
  } {
    // --- 1. Split filters FIRST ---
    const parts = expr.split("|").map((p) => p.trim());
    const core = parts[0];
    const filterExprs = parts.slice(1);

    // --- 2. Extract default operator (??) ---
    let pathExpr = core;
    let defaultValue: string | undefined = undefined;

    const defaultIdx = core.indexOf("??");
    if (defaultIdx !== -1) {
      pathExpr = core.slice(0, defaultIdx).trim();
      defaultValue = core
        .slice(defaultIdx + 2)
        .trim()
        .replace(/^["']|["']$/g, "");
    }

    // --- 3. Parse path ---
    const path = pathExpr.split(".").map((p) => p.trim());

    // --- 4. Parse filters ---
    const filters: FilterCall[] =
      filterExprs.length > 0
        ? filterExprs.map((f) => ({
            name: f,
            params: {},
          }))
        : [];

    return {
      path,
      defaultValue,
      filters: filters.length > 0 ? filters : undefined,
    };
  }

  /**
   * Parse IF block: {{IF condition}}...{{ELSEIF}}...{{ELSE}}...{{END_IF}}
   */
  private parseIf(): IfNode {
    const token = this.consume(TokenType.IF);
    const condition = this.extractCondition(token.value);

    const consequent: ASTNode[] = [];
    let alternate: ASTNode[] | IfNode | null = null;

    // Parse consequent (true branch)
    while (
      !this.check(TokenType.ELSEIF) &&
      !this.check(TokenType.ELSE) &&
      !this.check(TokenType.END_IF)
    ) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          `Unclosed {{IF}} block starting at line ${token.line}`,
          token.line,
          token.column,
          "Add {{END_IF}}"
        );
      }
      const node = this.parseNode();
      if (node) consequent.push(node);
    }

    // Parse ELSEIF/ELSE
    if (this.check(TokenType.ELSEIF)) {
      // ELSEIF becomes nested IfNode
      const elseIfToken = this.consume(TokenType.ELSEIF);
      const elseIfCondition = this.extractCondition(elseIfToken.value);

      // Create nested IF node
      const nestedIf: IfNode = {
        type: "If",
        condition: elseIfCondition,
        consequent: [],
        alternate: null,
        line: elseIfToken.line,
        column: elseIfToken.column,
      };

      // Parse ELSEIF body
      while (
        !this.check(TokenType.ELSEIF) &&
        !this.check(TokenType.ELSE) &&
        !this.check(TokenType.END_IF)
      ) {
        if (this.isAtEnd()) {
          throw new SyntaxError(
            "Unclosed {{ELSEIF}} block",
            elseIfToken.line,
            elseIfToken.column,
            "Add {{END_IF}}"
          );
        }
        const node = this.parseNode();
        if (node) nestedIf.consequent.push(node);
      }

      // Check for more ELSEIF or ELSE
      if (this.check(TokenType.ELSEIF) || this.check(TokenType.ELSE)) {
        // Recursively handle more branches
        if (this.check(TokenType.ELSEIF)) {
          this.consume(TokenType.ELSEIF);
          // Put token back and recurse
          this.pos--;
          // Parse as new IF starting from ELSEIF
          const recursiveIf = this.parseElseIf();
          nestedIf.alternate = recursiveIf;
        } else {
          // ELSE after ELSEIF
          this.consume(TokenType.ELSE);
          const elseBody: ASTNode[] = [];
          while (!this.check(TokenType.END_IF)) {
            if (this.isAtEnd()) {
              throw new SyntaxError(
                "Unclosed {{ELSE}} block",
                token.line,
                token.column,
                "Add {{END_IF}}"
              );
            }
            const node = this.parseNode();
            if (node) elseBody.push(node);
          }
          nestedIf.alternate = elseBody;
        }
      }

      alternate = nestedIf;
    } else if (this.check(TokenType.ELSE)) {
      this.consume(TokenType.ELSE);
      alternate = [];
      while (!this.check(TokenType.END_IF)) {
        if (this.isAtEnd()) {
          throw new SyntaxError(
            "Unclosed {{ELSE}} block",
            token.line,
            token.column,
            "Add {{END_IF}}"
          );
        }
        const node = this.parseNode();
        if (node) (alternate as ASTNode[]).push(node);
      }
    }

    this.consume(TokenType.END_IF);

    return {
      type: "If",
      condition,
      consequent,
      alternate,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Helper to parse ELSEIF as nested IF
   */
  private parseElseIf(): IfNode {
    const token = this.consume(TokenType.ELSEIF);
    const condition = this.extractCondition(token.value);

    const consequent: ASTNode[] = [];

    while (
      !this.check(TokenType.ELSEIF) &&
      !this.check(TokenType.ELSE) &&
      !this.check(TokenType.END_IF)
    ) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{ELSEIF}} block",
          token.line,
          token.column,
          "Add {{END_IF}}"
        );
      }
      const node = this.parseNode();
      if (node) consequent.push(node);
    }

    let alternate: ASTNode[] | IfNode | null = null;

    if (this.check(TokenType.ELSEIF)) {
      alternate = this.parseElseIf();
    } else if (this.check(TokenType.ELSE)) {
      this.consume(TokenType.ELSE);
      alternate = [];
      while (!this.check(TokenType.END_IF)) {
        if (this.isAtEnd()) {
          throw new SyntaxError(
            "Unclosed {{ELSE}} block",
            token.line,
            token.column,
            "Add {{END_IF}}"
          );
        }
        const node = this.parseNode();
        if (node) (alternate as ASTNode[]).push(node);
      }
    }

    return {
      type: "If",
      condition,
      consequent,
      alternate,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse CASE block: {{CASE var}}{{WHEN "val"}}...{{END_WHEN}}{{DEFAULT}}...{{END_CASE}}
   */
  private parseCase(): CaseNode {
    const token = this.consume(TokenType.CASE);
    const expression = this.extractExpression(token.value);

    const cases: WhenNode[] = [];
    let defaultNode: DefaultNode | null = null;

    while (!this.check(TokenType.END_CASE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{CASE}} block",
          token.line,
          token.column,
          "Add {{END_CASE}}"
        );
      }

      if (this.check(TokenType.WHEN)) {
        cases.push(this.parseWhen());
      } else if (this.check(TokenType.DEFAULT)) {
        defaultNode = this.parseDefault();
      } else if (this.check(TokenType.TEXT)) {
        // Skip whitespace text between WHEN/DEFAULT blocks
        const textToken = this.current();
        if (textToken.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in CASE: "${textToken.value.trim()}"`,
            textToken.line,
            textToken.column,
            "CASE blocks should only contain {{WHEN}} and {{DEFAULT}}"
          );
        }
        this.advance(); // Skip whitespace
      } else {
        const unexpected = this.current();
        throw new SyntaxError(
          `Unexpected token in CASE: ${unexpected.type}`,
          unexpected.line,
          unexpected.column,
          "Expected {{WHEN}} or {{DEFAULT}}"
        );
      }
    }

    this.consume(TokenType.END_CASE);

    return {
      type: "Case",
      expression,
      cases,
      default: defaultNode,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse WHEN clause
   */
  private parseWhen(): WhenNode {
    const token = this.consume(TokenType.WHEN);
    const value = this.extractQuotedValue(token.value);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_WHEN)) {
      if (
        this.check(TokenType.WHEN) ||
        this.check(TokenType.DEFAULT) ||
        this.check(TokenType.END_CASE)
      ) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{WHEN}} block",
          token.line,
          token.column,
          "Add {{END_WHEN}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    if (this.check(TokenType.END_WHEN)) {
      this.consume(TokenType.END_WHEN);
    }

    return {
      type: "When",
      value,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse DEFAULT clause
   */
  private parseDefault(): DefaultNode {
    const token = this.consume(TokenType.DEFAULT);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_DEFAULT)) {
      if (this.check(TokenType.END_CASE)) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{DEFAULT}} block",
          token.line,
          token.column,
          "Add {{END_DEFAULT}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    if (this.check(TokenType.END_DEFAULT)) {
      this.consume(TokenType.END_DEFAULT);
    }

    return {
      type: "Default",
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse FOR loop: {{FOR items AS item}}...{{END_FOR}}
   */
  private parseFor(): ForNode {
    const token = this.consume(TokenType.FOR);
    const { iterable, itemName } = this.parseForExpression(token.value);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_FOR)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{FOR}} block",
          token.line,
          token.column,
          "Add {{END_FOR}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    this.consume(TokenType.END_FOR);

    return {
      type: "For",
      iterable,
      itemName,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse FOR expression: "FOR items AS item" â†’ { iterable: ["items"], itemName: "item" }
   */
  private parseForExpression(expr: string): {
    iterable: string[];
    itemName: string;
  } {
    const match = expr.match(/FOR\s+(.+?)\s+AS\s+(\w+)/i);
    if (!match) {
      throw new SyntaxError(
        `Invalid FOR syntax: ${expr}`,
        this.current().line,
        this.current().column,
        "Expected: {{FOR items AS item}}"
      );
    }

    const iterablePath = match[1]
      .trim()
      .split(".")
      .map((p) => p.trim());
    const itemName = match[2].trim();

    return { iterable: iterablePath, itemName };
  }

  /**
   * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
   */
  private parseList(): ListNode {
    const token = this.consume(TokenType.LIST);
    const items: ListItemNode[] = [];

    while (!this.check(TokenType.END_LIST)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{LIST}} block",
          token.line,
          token.column,
          "Add {{END_LIST}}"
        );
      }

      if (this.check(TokenType.LIST_ITEM)) {
        items.push(this.parseListItem());
      } else if (this.check(TokenType.TEXT)) {
        // Skip whitespace text between list items
        const textToken = this.current();
        if (textToken.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in LIST: "${textToken.value.trim()}"`,
            textToken.line,
            textToken.column,
            "LIST should only contain {{LIST_ITEM}}"
          );
        }
        this.advance(); // Skip whitespace
      } else {
        const unexpected = this.current();
        throw new SyntaxError(
          `Unexpected token in LIST: ${unexpected.type}`,
          unexpected.line,
          unexpected.column,
          "Expected {{LIST_ITEM}}"
        );
      }
    }

    this.consume(TokenType.END_LIST);

    return {
      type: "List",
      items,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse LIST_ITEM
   */
  private parseListItem(): ListItemNode {
    const token = this.consume(TokenType.LIST_ITEM);

    // Parse optional condition and fallback
    const { condition, fallback } = this.parseListItemAttributes(token.value);

    const content: ASTNode[] = [];
    while (!this.check(TokenType.END_LIST_ITEM)) {
      if (this.check(TokenType.LIST_ITEM) || this.check(TokenType.END_LIST)) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{LIST_ITEM}} block",
          token.line,
          token.column,
          "Add {{END_LIST_ITEM}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_LIST_ITEM)) {
      this.consume(TokenType.END_LIST_ITEM);
    }

    return {
      type: "ListItem",
      content,
      condition,
      fallback,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse LIST_ITEM attributes: {{LIST_ITEM condition | fallback="text"}}
   */
  private parseListItemAttributes(expr: string): {
    condition?: string;
    fallback?: string;
  } {
    const afterKeyword = expr.replace(/^LIST_ITEM\s*/, "").trim();
    if (!afterKeyword) return {};

    const parts = afterKeyword.split("|");
    const condition = parts[0]?.trim();
    const fallbackMatch = parts[1]?.match(/fallback\s*=\s*["'](.+?)["']/);
    const fallback = fallbackMatch?.[1];

    return { condition: condition || undefined, fallback };
  }

  /**
   * Parse TABLE: {{TABLE}}{{HEADER}}...{{ROW}}...{{END_TABLE}}
   */
  private parseTable(): TableNode {
    const token = this.consume(TokenType.TABLE);
    const alignment = this.parseTableAlignment(token.value);

    let header: TableHeaderNode | null = null;
    const rows: TableRowNode[] = [];

    while (!this.check(TokenType.END_TABLE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{TABLE}} block",
          token.line,
          token.column,
          "Add {{END_TABLE}}"
        );
      }

      if (this.check(TokenType.HEADER)) {
        header = this.parseTableHeader();
      } else if (this.check(TokenType.ROW)) {
        rows.push(this.parseTableRow());
      } else if (this.check(TokenType.FOR)) {
        // Allow FOR loops to generate rows
        const forNode = this.parseFor();

        // Wrap in a special TableRowNode
        rows.push({
          type: "TableRow",
          cells: [[forNode]],
          line: forNode.line,
          column: forNode.column,
        });
      } else if (this.check(TokenType.TEXT)) {
        // Skip whitespace text between rows
        const textToken = this.current();
        if (textToken.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in TABLE: "${textToken.value.trim()}"`,
            textToken.line,
            textToken.column,
            "TABLE should only contain {{HEADER}}, {{ROW}}, or {{FOR}}"
          );
        }
        this.advance(); // Skip whitespace
      } else {
        const unexpected = this.current();
        throw new SyntaxError(
          `Unexpected token in TABLE: ${unexpected.type}`,
          unexpected.line,
          unexpected.column,
          "Expected {{HEADER}}, {{ROW}}, or {{FOR}}"
        );
      }
    }

    this.consume(TokenType.END_TABLE);

    return {
      type: "Table",
      header,
      rows,
      hasHeader: header !== null,
      alignment,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse table alignment: {{TABLE align="left|center|right"}}
   */
  private parseTableAlignment(expr: string): string[] | undefined {
    const match = expr.match(/align\s*=\s*["'](.+?)["']/);
    if (!match) return undefined;

    return match[1].split("|").map((a) => a.trim());
  }

  /**
   * Parse table header
   */
  private parseTableHeader(): TableHeaderNode {
    const token = this.consume(TokenType.HEADER);

    const content: ASTNode[] = [];

    while (!this.check(TokenType.END_HEADER)) {
      if (this.check(TokenType.END_TABLE)) break;
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{HEADER}} block",
          token.line,
          token.column,
          "Add {{END_HEADER}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_HEADER)) this.consume(TokenType.END_HEADER);
    const cells = this.splitCells(content);

    return {
      type: "Header",
      cells,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse table row
   */
  private parseTableRow(): TableRowNode {
    const token = this.consume(TokenType.ROW);

    const content: ASTNode[] = [];

    while (!this.check(TokenType.END_ROW)) {
      if (this.check(TokenType.ROW) || this.check(TokenType.END_TABLE)) break;
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{ROW}} block",
          token.line,
          token.column,
          "Add {{END_ROW}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_ROW)) this.consume(TokenType.END_ROW);

    // --- NEW: split at "|" ---
    const cells = this.splitCells(content);

    return {
      type: "TableRow",
      cells,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Split AST nodes into cells by pipe character
   * Handles text nodes containing pipes by splitting them
   */
  private splitCells(nodes: ASTNode[]): ASTNode[][] {
    const cells: ASTNode[][] = [[]];

    for (const node of nodes) {
      if (node.type === "Text") {
        const textNode = node as TextNode;
        const content = textNode.content;

        // Check if this text node contains pipe(s)
        if (content.includes("|")) {
          const parts = content.split("|");

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Add text content to current cell if non-empty
            if (part !== "") {
              cells[cells.length - 1].push({
                type: "Text",
                content: part,
                line: textNode.line,
                column: textNode.column,
              } as TextNode);
            }

            // Start new cell after each pipe (except after last part)
            if (i < parts.length - 1) {
              cells.push([]);
            }
          }
        } else {
          // No pipe - add entire text node to current cell
          cells[cells.length - 1].push(node);
        }
      } else {
        // Non-text node - add to current cell
        cells[cells.length - 1].push(node);
      }
    }

    return cells;
  }

  /**
   * Parse comment (excluded from output)
   */
  private parseComment(): CommentNode {
    const token = this.consume(TokenType.COMMENT);
    return {
      type: "Comment",
      content: token.value,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Extract condition from IF or ELSEIF token: "IF show" -> "show", "ELSEIF b" -> "b"
   */
  private extractCondition(expr: string): string {
    return expr.replace(/^(ELSE)?IF\s+/i, "").trim();
  }

  /**
   * Extract expression from CASE token: "CASE status" â†’ "status"
   */
  private extractExpression(expr: string): string {
    return expr.replace(/^CASE\s+/i, "").trim();
  }

  /**
   * Extract quoted value: 'WHEN "active"' â†’ "active"
   */
  private extractQuotedValue(expr: string): string {
    const match = expr.match(/["'](.+?)["']/);
    return match ? match[1] : "";
  }

  // ==================== Token Stream Helpers ====================

  /**
   * Get current token without advancing
   */
  private current(): Token {
    return this.tokens[this.pos];
  }

  /**
   * Check if current token matches type
   */
  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.current().type === type;
  }

  /**
   * Advance to next token and return previous
   */
  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  }

  /**
   * Consume expected token type or throw error
   */
  private consume(type: TokenType): Token {
    if (this.check(type)) return this.advance();

    const token = this.current();
    throw new SyntaxError(
      `Expected ${type}, got ${token.type}`,
      token.line,
      token.column,
      `Check template syntax near line ${token.line}`
    );
  }

  /**
   * Check if we've reached EOF
   */
  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }
}
