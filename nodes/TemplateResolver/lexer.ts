import { Token, TokenType } from "./types";
import { SyntaxError } from "./errors";

/**
 * Lexer: Converts template string into array of tokens with position tracking
 *
 * Handles all template syntax:
 * - Variables: ${{name}}, ${{user.name}}
 * - Control flow: {{IF}}, {{ELSE}}, {{ELSEIF}}, {{END_IF}}
 * - CASE: {{CASE}}, {{WHEN}}, {{DEFAULT}}, {{END_CASE}}
 * - Loops: {{FOR items AS item}}, {{END_FOR}}
 * - Tables: {{TABLE}}, {{HEADER}}, {{ROW}}, {{END_TABLE}}
 * - Lists: {{LIST}}, {{LIST_ITEM}}, {{END_LIST}}
 * - Ternary: {{condition ? "true" : "false"}}
 * - Comments: {{# comment #}}
 */
export class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(private template: string) {}

  /**
   * Validate that all blocks are properly closed
   */
  private validateBlocks(): void {
    const stack: Array<{ type: string; line: number; column: number }> = [];

    for (const token of this.tokens) {
      // Opening blocks
      if (
        [
          TokenType.IF,
          TokenType.FOR,
          TokenType.CASE,
          TokenType.TABLE,
          TokenType.LIST,
        ].includes(token.type)
      ) {
        stack.push({
          type: token.type,
          line: token.line,
          column: token.column,
        });
      }

      // Closing blocks
      if (token.type === TokenType.END_IF) {
        if (
          stack.length === 0 ||
          stack[stack.length - 1].type !== TokenType.IF
        ) {
          throw new SyntaxError(
            `Unexpected {{END_IF}} without matching {{IF}}`,
            token.line,
            token.column,
            "Check template structure"
          );
        }
        stack.pop();
      }

      if (token.type === TokenType.END_FOR) {
        if (
          stack.length === 0 ||
          stack[stack.length - 1].type !== TokenType.FOR
        ) {
          throw new SyntaxError(
            `Unexpected {{END_FOR}} without matching {{FOR}}`,
            token.line,
            token.column,
            "Check template structure"
          );
        }
        stack.pop();
      }

      if (token.type === TokenType.END_CASE) {
        if (
          stack.length === 0 ||
          stack[stack.length - 1].type !== TokenType.CASE
        ) {
          throw new SyntaxError(
            `Unexpected {{END_CASE}} without matching {{CASE}}`,
            token.line,
            token.column,
            "Check template structure"
          );
        }
        stack.pop();
      }

      if (token.type === TokenType.END_TABLE) {
        if (
          stack.length === 0 ||
          stack[stack.length - 1].type !== TokenType.TABLE
        ) {
          throw new SyntaxError(
            `Unexpected {{END_TABLE}} without matching {{TABLE}}`,
            token.line,
            token.column,
            "Check template structure"
          );
        }
        stack.pop();
      }

      if (token.type === TokenType.END_LIST) {
        if (
          stack.length === 0 ||
          stack[stack.length - 1].type !== TokenType.LIST
        ) {
          throw new SyntaxError(
            `Unexpected {{END_LIST}} without matching {{LIST}}`,
            token.line,
            token.column,
            "Check template structure"
          );
        }
        stack.pop();
      }
    }

    // Check for unclosed blocks
    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1];
      const typeName = unclosed.type.replace("_", " ");
      throw new SyntaxError(
        `Unclosed {{${typeName}}} block starting at line ${unclosed.line}`,
        unclosed.line,
        unclosed.column,
        `Add {{END_${typeName}}}`
      );
    }
  }

  /**
   * Tokenize the input template
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (this.pos < this.template.length) {
      if (
        this.current() === "$" &&
        this.peek(1) === "{" &&
        this.peek(2) === "{"
      ) {
        this.scanVariable();
      } else if (this.current() === "{" && this.peek() === "{") {
        this.scanTag();
      } else {
        this.scanText();
      }
    }

    // Add EOF token
    this.tokens.push({
      type: TokenType.EOF,
      value: "",
      line: this.line,
      column: this.column,
    });

    // Validate blocks are properly closed
    this.validateBlocks();

    return this.tokens;
  }
  /**
   * Scan variable substitution: ${{name}}, ${{user.name | filter}}
   */
  private scanVariable(): void {
    const startLine = this.line;
    const startColumn = this.column;

    // Consume ${{
    this.advance(3);

    let content = "";
    while (this.pos < this.template.length) {
      if (this.peek() === "}" && this.peek(1) === "}") {
        // Found closing }}
        this.advance(2);
        this.tokens.push({
          type: TokenType.VARIABLE,
          value: content.trim(),
          line: startLine,
          column: startColumn,
        });
        return;
      }
      content += this.current();
      this.advance();
    }

    // Unclosed variable
    throw new SyntaxError(
      "Unclosed variable substitution ${{...}}",
      startLine,
      startColumn,
      "Add closing }}"
    );
  }

  /**
   * Scan template tag: {{IF}}, {{FOR}}, etc.
   */
  private scanTag(): void {
    const startLine = this.line;
    const startColumn = this.column;

    // Consume {{
    this.advance(2);

    // Skip whitespace
    this.skipWhitespace();

    // Check for comment: {{# ... #}}
    if (this.peek() === "#") {
      this.scanComment(startLine, startColumn);
      return;
    }

    const content = this.scanUntilClosing();
    const trimmed = content.trim();

    // Parse keyword
    const keyword = this.extractKeyword(trimmed);
    const tokenType = this.getTokenType(keyword);

    if (tokenType === null) {
      throw new SyntaxError(
        `Unknown template tag: {{${keyword}}}`,
        startLine,
        startColumn,
        "Check syntax - valid tags: IF, CASE, FOR, TABLE, LIST, etc."
      );
    }

    this.tokens.push({
      type: tokenType,
      value: trimmed,
      line: startLine,
      column: startColumn,
    });
  }

  /**
   * Scan comment: {{# comment text #}}
   */
  private scanComment(startLine: number, startColumn: number): void {
    // Consume #
    this.advance();

    let content = "";
    while (this.pos < this.template.length) {
      if (this.peek() === "#" && this.peek(1) === "}" && this.peek(2) === "}") {
        // Found closing #}}
        this.advance(3);
        this.tokens.push({
          type: TokenType.COMMENT,
          value: content,
          line: startLine,
          column: startColumn,
        });
        return;
      }
      content += this.current();
      this.advance();
    }

    throw new SyntaxError(
      "Unclosed comment {{# ... #}}",
      startLine,
      startColumn,
      "Add closing #}}"
    );
  }

  /**
   * Scan plain text (everything outside {{ }})
   */
  private scanText(): void {
    const startLine = this.line;
    const startColumn = this.column;
    let content = "";

    while (this.pos < this.template.length) {
      // Stop at template syntax
      if (this.peek() === "$" && this.peek(1) === "{" && this.peek(2) === "{") {
        break;
      }
      if (this.peek() === "{" && this.peek(1) === "{") {
        break;
      }
      content += this.current();
      this.advance();
    }

    if (content.length > 0) {
      const normalized = content.replace(/\r\n/g, "\n"); // Normalize CRLF -> LF
      this.tokens.push({
        type: TokenType.TEXT,
        value: normalized,
        line: startLine,
        column: startColumn,
      });
    }
  }

  /**
   * Scan until closing }}
   */
  private scanUntilClosing(): string {
    let content = "";
    let depth = 0;

    while (this.pos < this.template.length) {
      if (this.peek() === "{" && this.peek(1) === "{") {
        depth++;
        content += this.current();
        this.advance();
        content += this.current();
        this.advance();
      } else if (this.peek() === "}" && this.peek(1) === "}") {
        if (depth === 0) {
          // Found matching closing }}
          this.advance(2);
          return content;
        }
        depth--;
        content += this.current();
        this.advance();
        content += this.current();
        this.advance();
      } else {
        content += this.current();
        this.advance();
      }
    }

    throw new SyntaxError(
      "Unclosed tag {{...}}",
      this.line,
      this.column,
      "Add closing }}"
    );
  }

  /**
   * Extract keyword from tag content (e.g., "IF show" â†’ "IF")
   */
  private extractKeyword(content: string): string {
    const match = content.match(/^([A-Z_]+)/);
    return match ? match[1] : content;
  }

  /**
   * Map keyword to TokenType
   */
  private getTokenType(keyword: string): TokenType | null {
    const mapping: Record<string, TokenType> = {
      IF: TokenType.IF,
      ELSEIF: TokenType.ELSEIF,
      ELSE: TokenType.ELSE,
      END_IF: TokenType.END_IF,
      CASE: TokenType.CASE,
      WHEN: TokenType.WHEN,
      DEFAULT: TokenType.DEFAULT,
      END_WHEN: TokenType.END_WHEN,
      END_DEFAULT: TokenType.END_DEFAULT,
      END_CASE: TokenType.END_CASE,
      FOR: TokenType.FOR,
      END_FOR: TokenType.END_FOR,
      LIST: TokenType.LIST,
      LIST_ITEM: TokenType.LIST_ITEM,
      END_LIST_ITEM: TokenType.END_LIST_ITEM,
      END_LIST: TokenType.END_LIST,
      TABLE: TokenType.TABLE,
      HEADER: TokenType.HEADER,
      END_HEADER: TokenType.END_HEADER,
      ROW: TokenType.ROW,
      END_ROW: TokenType.END_ROW,
      END_TABLE: TokenType.END_TABLE,
    };

    return mapping[keyword] || null;
  }

  /**
   * Get current character
   */
  private current(): string {
    return this.template[this.pos];
  }

  /**
   * Peek ahead N characters
   */
  private peek(offset = 0): string {
    return this.template[this.pos + offset] || "";
  }

  /**
   * Advance position by N characters
   */
  private advance(count = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.pos >= this.template.length) break;

      if (this.template[this.pos] === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  /**
   * Skip whitespace (but not newlines - preserve formatting)
   */
  private skipWhitespace(): void {
    while (this.pos < this.template.length && /[ \t]/.test(this.current())) {
      this.advance();
    }
  }
}
