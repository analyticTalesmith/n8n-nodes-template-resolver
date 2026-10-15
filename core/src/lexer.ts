import { Token, TokenType, WhitespaceOptions } from "./types";
import { SyntaxError } from "./errors";
import { applyWhitespace } from "./whitespace";

const RAW_CLOSER = /\{\{-?[ \t]*END_RAW[ \t]*-?\}\}/y;

/** The tag keywords the lexer knows, each with its token type */
export const KEYWORDS: Readonly<Record<string, TokenType>> = {
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
  RAW: TokenType.RAW,
  END_RAW: TokenType.END_RAW,
  SECTION: TokenType.SECTION,
  END_SECTION: TokenType.END_SECTION,
  FENCE: TokenType.FENCE,
  END_FENCE: TokenType.END_FENCE,
  SET: TokenType.SET,
};

/** Block closers checked for balance, each with the opener it closes */
const CLOSERS: Partial<Record<TokenType, TokenType>> = {
  [TokenType.END_IF]: TokenType.IF,
  [TokenType.END_FOR]: TokenType.FOR,
  [TokenType.END_CASE]: TokenType.CASE,
  [TokenType.END_TABLE]: TokenType.TABLE,
  [TokenType.END_LIST]: TokenType.LIST,
  [TokenType.END_SECTION]: TokenType.SECTION,
  [TokenType.END_FENCE]: TokenType.FENCE,
};
const OPENERS = new Set(Object.values(CLOSERS));

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
 * - Sections: {{SECTION "Title" level=2}}, {{END_SECTION}}
 * - Code fences: {{FENCE lang="md"}}, {{END_FENCE}}
 * - Locals: {{SET name = expression}}
 * - Ternary: {{condition ? "true" : "false"}}
 * - Comments: {{# comment #}}
 * - Literal blocks: {{RAW}}...{{END_RAW}}; \{{ is a literal brace pair
 * - Trim markers: {{- TAG}} and {{TAG -}}
 */
export class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(
    private template: string,
    private options: WhitespaceOptions = {}
  ) {}

  /**
   * Validate that all blocks are properly closed. An open SECTION that meets
   * another block's closer, or the end of the template, is reported at the
   * latest SECTION tag opened inside it.
   */
  private validateBlocks(): void {
    const stack: Token[] = [];
    let latestSection: Token | null = null;

    for (const token of this.tokens) {
      if (OPENERS.has(token.type)) {
        stack.push(token);
        if (token.type === TokenType.SECTION) latestSection = token;
        continue;
      }

      const opener = CLOSERS[token.type];
      if (opener === undefined) continue;
      const top = stack[stack.length - 1];
      if (top?.type === opener) {
        stack.pop();
        continue;
      }
      if (top?.type === TokenType.SECTION) this.unclosed(latestSection ?? top);
      throw new SyntaxError(
        `Unexpected {{${token.type}}} without matching {{${opener}}}`,
        token.line,
        token.column,
        "Check template structure"
      );
    }

    const unclosed = stack[stack.length - 1];
    if (unclosed === undefined) return;
    this.unclosed(
      unclosed.type === TokenType.SECTION ? latestSection ?? unclosed : unclosed
    );
  }

  private unclosed(opener: Token): never {
    const typeName = opener.type.replace("_", " ");
    throw new SyntaxError(
      `Unclosed {{${typeName}}} block starting at line ${opener.line}`,
      opener.line,
      opener.column,
      `Add {{END_${typeName}}}`
    );
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

    return applyWhitespace(this.tokens, this.options).filter(
      (t) => t.type !== TokenType.RAW && t.type !== TokenType.END_RAW
    );
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

    const trimBefore = this.peek() === "-";
    if (trimBefore) this.advance();

    // Skip whitespace
    this.skipWhitespace();

    // Check for comment: {{# ... #}}
    if (this.peek() === "#") {
      this.scanComment(startLine, startColumn, trimBefore);
      return;
    }

    let content = this.scanUntilClosing();
    const trimAfter = content.endsWith("-");
    if (trimAfter) content = content.slice(0, -1);
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

    if (
      trimmed !== keyword &&
      (keyword === "ELSE" || keyword === "RAW" || keyword.startsWith("END_"))
    ) {
      const isElseIf =
        keyword === "ELSE" && /^IF(\s|$)/i.test(trimmed.slice(4).trim());
      throw new SyntaxError(
        isElseIf
          ? "Invalid tag {{ELSE IF}}"
          : `Unexpected arguments in {{${keyword}}} tag`,
        startLine,
        startColumn,
        isElseIf
          ? "Use {{ELSEIF condition}} for an else-if branch"
          : `Use {{${keyword}}} with no arguments`
      );
    }

    if (tokenType === TokenType.END_RAW) {
      throw new SyntaxError(
        "Unexpected {{END_RAW}} without matching {{RAW}}",
        startLine,
        startColumn,
        "Check template structure"
      );
    }

    this.tokens.push({
      type: tokenType,
      value: trimmed,
      line: startLine,
      column: startColumn,
      trimBefore,
      trimAfter,
    });

    if (tokenType === TokenType.RAW) this.scanRaw(startLine, startColumn);
  }

  /**
   * Scan the literal content of a RAW block and its {{END_RAW}} closer
   */
  private scanRaw(startLine: number, startColumn: number): void {
    const contentLine = this.line;
    const contentColumn = this.column;
    let content = "";

    while (this.pos < this.template.length) {
      RAW_CLOSER.lastIndex = this.pos;
      if (RAW_CLOSER.test(this.template)) {
        if (content.length > 0) {
          this.tokens.push({
            type: TokenType.TEXT,
            value: content.replace(/\r\n/g, "\n"),
            line: contentLine,
            column: contentColumn,
          });
        }
        this.scanRawCloser();
        return;
      }
      content += this.current();
      this.advance();
    }

    throw new SyntaxError(
      `Unclosed RAW block starting at line ${startLine}`,
      startLine,
      startColumn,
      "Add {{END_RAW}}"
    );
  }

  /**
   * Scan {{END_RAW}}, with its optional trim markers
   */
  private scanRawCloser(): void {
    const line = this.line;
    const column = this.column;
    this.advance(2);
    const trimBefore = this.peek() === "-";
    const content = this.scanUntilClosing();
    this.tokens.push({
      type: TokenType.END_RAW,
      value: "END_RAW",
      line,
      column,
      trimBefore,
      trimAfter: content.endsWith("-"),
    });
  }

  /**
   * Scan comment: {{# comment text #}}
   */
  private scanComment(
    startLine: number,
    startColumn: number,
    trimBefore: boolean
  ): void {
    // Consume #
    this.advance();

    let content = "";
    while (this.pos < this.template.length) {
      const trimAfter = this.peek(1) === "-";
      const closer = trimAfter ? 1 : 0;
      if (
        this.peek() === "#" &&
        this.peek(1 + closer) === "}" &&
        this.peek(2 + closer) === "}"
      ) {
        // Found closing #}} or #-}}
        this.advance(3 + closer);
        this.tokens.push({
          type: TokenType.COMMENT,
          value: content,
          line: startLine,
          column: startColumn,
          trimBefore,
          trimAfter,
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
      if (this.peek() === "\\" && this.peek(1) === "{" && this.peek(2) === "{") {
        // \{{ is a literal {{
        content += "{{";
        this.advance(3);
        continue;
      }
      if (
        this.peek() === "\\" &&
        this.peek(1) === "\\" &&
        this.peek(2) === "{" &&
        this.peek(3) === "{"
      ) {
        // \\{{ is a literal backslash followed by an active tag
        content += "\\";
        this.advance(2);
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
    // Own property only: a word such as "constructor" is not a keyword
    return Object.prototype.hasOwnProperty.call(KEYWORDS, keyword)
      ? KEYWORDS[keyword]
      : null;
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
