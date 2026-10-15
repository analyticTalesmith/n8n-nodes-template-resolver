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
  ForWindowArg,
  ListNode,
  ListChild,
  ListItemNode,
  TableNode,
  TableChild,
  TableHeaderNode,
  TableRowNode,
  CommentNode,
  SectionNode,
  SectionTitle,
  FenceNode,
  FenceLang,
  FilterCall,
  DEFAULT_LIMITS,
} from "./types";
import { SyntaxError, TypeError, LimitError } from "./errors";
import { parseFilter } from "./filters";
import { parseWhenMatch } from "./expressions";

const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;

/** Parses one child of a block body; null for a child that leaves no node */
type ChildParser = () => ASTNode | null;

/**
 * Parser: Builds Abstract Syntax Tree from tokens
 *
 * Uses recursive descent parsing for clean nesting support.
 */
export class Parser {
  private pos = 0;
  private depth = 0;
  private nodes = 0;
  /** How many LIST_ITEM contents the parser is inside */
  private itemDepth = 0;
  private readonly maxDepth: number;
  private readonly maxNodes: number;

  constructor(
    private tokens: Token[],
    options?: { maxDepth?: number; maxNodes?: number }
  ) {
    this.maxDepth = options?.maxDepth ?? DEFAULT_LIMITS.maxDepth;
    this.maxNodes = options?.maxNodes ?? DEFAULT_LIMITS.maxNodes;
  }

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
        return this.nested(() => this.parseIf());
      case TokenType.CASE:
        return this.nested(() => this.parseCase());
      case TokenType.FOR:
        return this.nested(() => this.parseFor());
      case TokenType.LIST:
        return this.nested(() => this.parseList());
      case TokenType.TABLE:
        return this.nested(() => this.parseTable());
      case TokenType.SECTION:
        return this.nested(() => this.parseSection());
      case TokenType.FENCE:
        return this.nested(() => this.parseFence());
      case TokenType.HEADER:
        return this.parseTableHeader();
      case TokenType.ROW:
        return this.parseTableRow();
      case TokenType.COMMENT:
        return this.parseComment();
      case TokenType.EOF:
        return null;
      case TokenType.LIST_ITEM:
        if (this.itemDepth > 0) {
          throw new SyntaxError(
            "A {{LIST_ITEM}} cannot sit inside the content of another item",
            token.line,
            token.column,
            "Close the item with {{END_LIST_ITEM}} before the FOR or IF that builds items"
          );
        }
        return this.unexpectedToken(token);
      default:
        return this.unexpectedToken(token);
    }
  }

  private unexpectedToken(token: Token): never {
    throw new SyntaxError(
      `Unexpected token: ${token.type}`,
      token.line,
      token.column,
      "Check template syntax"
    );
  }

  /**
   * Parse a block one level deeper, rejecting it at its opening tag when the
   * nesting would exceed maxDepth
   */
  private nested<T>(parseBlock: () => T): T {
    if (this.depth >= this.maxDepth) {
      const token = this.current();
      throw new LimitError(
        "limit-depth",
        `Block nesting exceeds the maximum depth of ${this.maxDepth}`,
        token.line,
        token.column,
        "Flatten nested blocks or raise limits.maxDepth"
      );
    }
    this.depth++;
    const node = parseBlock();
    this.depth--;
    return node;
  }

  /**
   * Parse text node
   */
  private parseText(): TextNode {
    const token = this.open(TokenType.TEXT);
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
    const token = this.open(TokenType.VARIABLE);
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
    // --- 1. Split filters FIRST (pipes inside quotes belong to the default) ---
    const parts = this.splitOutsideQuotes(expr, "|").map((p) => p.trim());
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
        .replace(/^(["'])(.*)\1$/s, "$2");
    }

    // --- 3. Parse path ---
    const path = pathExpr.split(".").map((p) => p.trim());

    // --- 4. Parse filters ---
    const filters: FilterCall[] =
      filterExprs.length > 0
        ? filterExprs.map(parseFilter)
        : [];

    return {
      path,
      defaultValue,
      filters: filters.length > 0 ? filters : undefined,
    };
  }

  /**
   * Split on a separator character, ignoring separators inside quotes.
   * A quote only opens at the start of a value, so an apostrophe inside a
   * word is plain text, and so is a quote that never closes: the split is
   * redone with that quote left out.
   */
  private splitOutsideQuotes(
    text: string,
    separator: string,
    plainQuotes: ReadonlySet<number> = new Set()
  ): string[] {
    const parts: string[] = [];
    let quote: string | null = null;
    let quoteAt = -1;
    let start = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (
        (ch === '"' || ch === "'") &&
        !plainQuotes.has(i) &&
        /(^|\?\?|=)\s*$/.test(text.slice(start, i))
      ) {
        quote = ch;
        quoteAt = i;
      } else if (ch === separator) {
        parts.push(text.slice(start, i));
        start = i + 1;
      }
    }
    if (quote) {
      return this.splitOutsideQuotes(
        text,
        separator,
        new Set(plainQuotes).add(quoteAt)
      );
    }
    parts.push(text.slice(start));
    return parts;
  }

  /**
   * Parse IF block: {{IF condition}}...{{ELSEIF}}...{{ELSE}}...{{END_IF}}
   * ELSEIF branches nest in the alternate of the branch before them and are
   * parsed in a loop, so a long chain does not deepen the call stack.
   */
  private parseIf(child: ChildParser = () => this.parseNode()): IfNode {
    const root = this.parseIfBranch(TokenType.IF, child);
    let last = root;
    while (this.check(TokenType.ELSEIF)) {
      const branch = this.parseIfBranch(TokenType.ELSEIF, child);
      last.alternate = branch;
      last = branch;
    }
    if (this.check(TokenType.ELSE)) last.alternate = this.parseElse(last, child);

    this.consume(TokenType.END_IF);
    return root;
  }

  /**
   * Parse the head and body of an IF or ELSEIF branch, up to the next
   * ELSEIF, ELSE or END_IF
   */
  private parseIfBranch(
    type: TokenType.IF | TokenType.ELSEIF,
    child: ChildParser
  ): IfNode {
    const token = this.open(type);
    const consequent: ASTNode[] = [];

    while (
      !this.check(TokenType.ELSEIF) &&
      !this.check(TokenType.ELSE) &&
      !this.check(TokenType.END_IF)
    ) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          type === TokenType.IF
            ? `Unclosed {{IF}} block starting at line ${token.line}`
            : "Unclosed {{ELSEIF}} block",
          token.line,
          token.column,
          "Add {{END_IF}}"
        );
      }
      const node = child();
      if (node) consequent.push(node);
    }

    return {
      type: "If",
      condition: this.extractCondition(token.value),
      consequent,
      alternate: null,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the ELSE body of a branch, up to END_IF
   */
  private parseElse(branch: IfNode, child: ChildParser): ASTNode[] {
    this.consume(TokenType.ELSE);
    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_IF)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{ELSE}} block",
          branch.line,
          branch.column,
          "Add {{END_IF}}"
        );
      }
      const node = child();
      if (node) body.push(node);
    }
    return body;
  }

  /**
   * Parse CASE block: {{CASE var}}{{WHEN "val"}}...{{END_WHEN}}{{DEFAULT}}...{{END_CASE}}
   */
  private parseCase(): CaseNode {
    const token = this.open(TokenType.CASE);
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
    const token = this.open(TokenType.WHEN);
    const match = parseWhenMatch(
      token.value.replace(/^WHEN/i, ""),
      token.line,
      token.column
    );
    const first = match.kind === "list" ? match.items[0] : null;
    const value = first?.kind === "literal" && first.quoted ? first.text : "";

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
      match,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse DEFAULT clause
   */
  private parseDefault(): DefaultNode {
    const token = this.open(TokenType.DEFAULT);

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
   * Parse FOR loop: {{FOR items AS item [limit=N] [offset=N]}}...{{ELSE}}...{{END_FOR}}
   * An {{ELSE}} directly in the body starts the branch that renders when no
   * item does; an IF inside the body parses its own ELSE.
   */
  private parseFor(child: ChildParser = () => this.parseNode()): ForNode {
    const token = this.open(TokenType.FOR);
    const header = this.parseForHeader(token);

    const body: ASTNode[] = [];
    let elseBody: ASTNode[] | undefined;
    while (!this.check(TokenType.END_FOR)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{FOR}} block",
          token.line,
          token.column,
          "Add {{END_FOR}}"
        );
      }
      if (this.check(TokenType.ELSE)) {
        const elseToken = this.advance();
        if (elseBody !== undefined) {
          throw new SyntaxError(
            "A {{FOR}} block takes one {{ELSE}}",
            elseToken.line,
            elseToken.column,
            "Remove the second {{ELSE}}"
          );
        }
        elseBody = [];
        continue;
      }
      const node = child();
      if (node) (elseBody ?? body).push(node);
    }

    this.consume(TokenType.END_FOR);

    const node: ForNode = {
      type: "For",
      iterable: header.iterable,
      itemName: header.itemName,
      body,
      line: token.line,
      column: token.column,
    };
    if (header.limit) node.limit = header.limit;
    if (header.offset) node.offset = header.offset;
    if (elseBody) node.elseBody = elseBody;
    return node;
  }

  /**
   * Parse the FOR tag word by word: "FOR items AS item limit=2 offset=n".
   * Every problem is a syntax error at the tag.
   */
  private parseForHeader(token: Token): {
    iterable: string[];
    itemName: string;
    limit?: ForWindowArg;
    offset?: ForWindowArg;
  } {
    const fail = (why: string): never => {
      throw new SyntaxError(
        `Invalid FOR syntax: ${why}`,
        token.line,
        token.column,
        "Expected: {{FOR items AS item}} with optional limit=N and offset=N"
      );
    };

    const match = /^FOR\s+(.+?)\s+AS(?:\s+(.*))?$/is.exec(token.value.trim());
    const rest = match?.[2]?.trim();
    if (!match || !rest) return fail(token.value);
    const words = rest.split(/\s+/);
    const itemName = words[0];
    if (!/^\w+$/.test(itemName)) fail(`bad item name "${itemName}"`);

    const iterable = match[1].split(".").map((p) => p.trim());
    const result: {
      iterable: string[];
      itemName: string;
      limit?: ForWindowArg;
      offset?: ForWindowArg;
    } = { iterable, itemName };

    for (const word of words.slice(1)) {
      const argument = /^(limit|offset)=(.+)$/.exec(word);
      if (!argument) fail(`unexpected "${word}"`);
      const [, key, written] = argument as RegExpExecArray;
      const name = key as "limit" | "offset";
      if (result[name]) fail(`${name} is given twice`);
      if (/^[+-]?\d+(\.\d+)?$/.test(written)) {
        result[name] = { kind: "literal", value: Number(written) };
      } else if (VARIABLE_PATH.test(written)) {
        result[name] = { kind: "path", path: written.split(".") };
      } else {
        fail(`bad ${name} value "${written}"`);
      }
    }
    return result;
  }

  /**
   * Parse SECTION: {{SECTION "Title" level=2 skip_empty=false}}...{{END_SECTION}}
   */
  private parseSection(): SectionNode {
    const token = this.open(TokenType.SECTION);
    const { title, level, skipEmpty } = this.parseSectionArguments(token);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_SECTION)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{SECTION}} block",
          token.line,
          token.column,
          "Add {{END_SECTION}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    this.consume(TokenType.END_SECTION);

    return {
      type: "Section",
      title,
      level,
      skipEmpty,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the SECTION title (quoted string or variable path) and its
   * level and skip_empty options
   */
  private parseSectionArguments(token: Token): {
    title: SectionTitle;
    level: number;
    skipEmpty: boolean;
  } {
    const typeError = (message: string, suggestion: string) =>
      new TypeError(message, token.line, token.column, suggestion);
    const syntaxError = (message: string) =>
      new SyntaxError(
        message,
        token.line,
        token.column,
        'Expected: {{SECTION "Title" level=2 skip_empty=true}}'
      );

    let title: SectionTitle | null = null;
    let level = 2;
    let skipEmpty = true;
    const args = token.value.slice("SECTION".length);

    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
      if (key === "level") {
        if (!/^[+-]?\d+$/.test(value)) {
          throw typeError(
            `SECTION level must be an integer, got ${value}`,
            "Use level=1 through level=6"
          );
        }
        level = Math.min(6, Math.max(1, Number(value)));
      } else if (key === "skip_empty") {
        if (value !== "true" && value !== "false") {
          throw typeError(
            `SECTION skip_empty must be true or false, got ${value}`,
            "Use skip_empty=true or skip_empty=false"
          );
        }
        skipEmpty = value === "true";
      } else if (key !== undefined) {
        throw syntaxError(`Unknown SECTION option: ${key}`);
      } else if (title !== null) {
        throw syntaxError(`Unexpected SECTION argument: ${argument}`);
      } else if (/^(["']).*\1$/.test(argument)) {
        title = { kind: "literal", text: argument.slice(1, -1) };
      } else if (VARIABLE_PATH.test(argument)) {
        title = { kind: "path", path: argument.split(".") };
      } else {
        throw syntaxError(`Invalid SECTION title: ${argument}`);
      }
    }

    if (title === null || (title.kind === "literal" && title.text === "")) {
      throw typeError(
        "SECTION needs a non-empty title",
        'Give a quoted title or a variable path: {{SECTION "Title"}}'
      );
    }
    return { title, level, skipEmpty };
  }

  /**
   * Parse FENCE: {{FENCE lang="md"}}...{{END_FENCE}}
   */
  private parseFence(): FenceNode {
    const token = this.open(TokenType.FENCE);
    const lang = this.parseFenceLang(token);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_FENCE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{FENCE}} block",
          token.line,
          token.column,
          "Add {{END_FENCE}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    this.consume(TokenType.END_FENCE);

    return {
      type: "Fence",
      lang,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the optional FENCE lang option: a quoted string or a variable path
   */
  private parseFenceLang(token: Token): FenceLang | null {
    const syntaxError = (message: string) =>
      new SyntaxError(
        message,
        token.line,
        token.column,
        'Expected: {{FENCE lang="markdown"}} or {{FENCE lang=path.to.lang}}'
      );

    let lang: FenceLang | null = null;
    const args = token.value.slice("FENCE".length);

    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
      if (key !== "lang") {
        throw syntaxError(
          key === undefined
            ? `Unexpected FENCE argument: ${argument}`
            : `Unknown FENCE option: ${key}`
        );
      }
      if (/^(["']).*\1$/.test(value)) {
        lang = { kind: "literal", text: value.slice(1, -1) };
      } else if (VARIABLE_PATH.test(value)) {
        lang = { kind: "path", path: value.split(".") };
      } else {
        throw syntaxError(`Invalid FENCE lang: ${value}`);
      }
    }
    return lang;
  }

  /**
   * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
   * Its children are items, and FOR and IF blocks that build items.
   */
  private parseList(): ListNode {
    const token = this.open(TokenType.LIST);
    const items: ListChild[] = [];

    while (!this.check(TokenType.END_LIST)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{LIST}} block",
          token.line,
          token.column,
          "Add {{END_LIST}}"
        );
      }
      const child = this.parseListChild();
      if (child) items.push(child as ListChild);
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
   * Parse one child of a LIST, or of a FOR or IF that builds items: an item,
   * a FOR, an IF, a comment or whitespace; anything else is a syntax error at
   * its own token
   */
  private parseListChild(): ASTNode | null {
    const token = this.current();
    switch (token.type) {
      case TokenType.LIST_ITEM:
        return this.parseListItem();
      case TokenType.FOR:
        return this.nested(() => this.parseFor(() => this.parseListChild()));
      case TokenType.IF:
        return this.nested(() => this.parseIf(() => this.parseListChild()));
      case TokenType.COMMENT:
        this.parseComment();
        return null;
      case TokenType.TEXT:
        if (token.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in LIST: "${token.value.trim()}"`,
            token.line,
            token.column,
            "LIST should only contain {{LIST_ITEM}}, {{FOR}} or {{IF}}"
          );
        }
        this.advance(); // Skip whitespace
        return null;
      default:
        throw new SyntaxError(
          `Unexpected token in LIST: ${token.type}`,
          token.line,
          token.column,
          "Expected {{LIST_ITEM}}, {{FOR}} or {{IF}}"
        );
    }
  }

  /**
   * Parse LIST_ITEM. Without END_LIST_ITEM the item ends at the next item,
   * END_LIST, or the closer or branch word of the FOR or IF around it.
   */
  private parseListItem(): ListItemNode {
    const token = this.open(TokenType.LIST_ITEM);

    // Parse optional condition and fallback
    const { condition, fallback } = this.parseListItemAttributes(token.value);

    const content: ASTNode[] = [];
    this.itemDepth++;
    while (!this.check(TokenType.END_LIST_ITEM)) {
      if (
        this.check(TokenType.LIST_ITEM) ||
        this.check(TokenType.END_LIST) ||
        this.check(TokenType.END_FOR) ||
        this.check(TokenType.ELSE) ||
        this.check(TokenType.ELSEIF) ||
        this.check(TokenType.END_IF)
      ) {
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
    this.itemDepth--;

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
   * Its rows come from ROW, FOR and IF blocks. A FOR written directly in the
   * TABLE keeps its generic body (a body that is not a ROW is split on a
   * pipe when it runs); an IF holds rows only.
   */
  private parseTable(): TableNode {
    const token = this.open(TokenType.TABLE);
    const alignment = this.parseTableAlignment(token.value);

    let header: TableHeaderNode | null = null;
    const rows: TableChild[] = [];

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
      } else if (this.check(TokenType.FOR)) {
        // A FOR generates rows; its body is parsed as in any FOR
        this.count(this.current());
        rows.push(this.nested(() => this.parseFor()));
      } else {
        const child = this.parseRowChild();
        if (child) rows.push(child as TableChild);
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
   * Parse one child of a TABLE, or of an IF or FOR that builds rows: a ROW, a
   * FOR, an IF, a comment or whitespace; anything else is a syntax error at
   * its own token. A HEADER is only accepted by the TABLE itself.
   */
  private parseRowChild(): ASTNode | null {
    const token = this.current();
    switch (token.type) {
      case TokenType.ROW:
        return this.parseTableRow();
      case TokenType.FOR:
        return this.nested(() => this.parseFor(() => this.parseRowChild()));
      case TokenType.IF:
        return this.nested(() => this.parseIf(() => this.parseRowChild()));
      case TokenType.COMMENT:
        this.parseComment();
        return null;
      case TokenType.TEXT:
        if (token.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in TABLE: "${token.value.trim()}"`,
            token.line,
            token.column,
            "TABLE should only contain {{HEADER}}, {{ROW}}, {{FOR}} or {{IF}}"
          );
        }
        this.advance(); // Skip whitespace
        return null;
      default:
        throw new SyntaxError(
          `Unexpected token in TABLE: ${token.type}`,
          token.line,
          token.column,
          "Expected {{HEADER}}, {{ROW}}, {{FOR}} or {{IF}}"
        );
    }
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
    const token = this.open(TokenType.HEADER);

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
   * Parse table row. Without END_ROW the row ends at the next ROW,
   * END_TABLE, or the closer or branch word of the FOR or IF around it.
   */
  private parseTableRow(): TableRowNode {
    const token = this.open(TokenType.ROW);

    const content: ASTNode[] = [];

    while (!this.check(TokenType.END_ROW)) {
      if (
        this.check(TokenType.ROW) ||
        this.check(TokenType.END_TABLE) ||
        this.check(TokenType.END_FOR) ||
        this.check(TokenType.ELSE) ||
        this.check(TokenType.ELSEIF) ||
        this.check(TokenType.END_IF)
      ) {
        break;
      }
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
    const token = this.open(TokenType.COMMENT);
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
   * Consume the opening token of a node, counting the node against maxNodes
   */
  private open(type: TokenType): Token {
    const token = this.consume(type);
    this.count(token);
    return token;
  }

  /**
   * Count one node, failing at its opening token once maxNodes is crossed
   */
  private count(token: Token): void {
    if (++this.nodes <= this.maxNodes) return;
    throw new LimitError(
      "limit-nodes",
      `Template exceeds the maximum of ${this.maxNodes} nodes`,
      token.line,
      token.column,
      "Shorten the template or raise limits.maxNodes"
    );
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
