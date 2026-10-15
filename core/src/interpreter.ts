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
  SetNode,
  DefineNode,
  CallNode,
  CallArg,
  ValueExpr,
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
  TemplateError,
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
import { linkProgram, macroNote } from "./macros";

/**
 * The deepest run-time nesting of blocks and calls, whatever maxDepth says: it
 * keeps the interpreter's own recursion far from the engine's stack limit
 */
const MAX_RUNTIME_DEPTH = 256;

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
 * - SET: locals bound for the rest of their block
 * - DEFINE and CALL: macros whose bodies see their parameters and the data
 */
export class Interpreter {
  private strictMode: boolean;
  private limits: Limits;
  private render: boolean;
  private iterations = 0;
  private omittedSections = 0;
  /** Blocks and calls being run now, bounded by depthCap */
  private depth = 0;
  private readonly depthCap: number;
  /** Characters of the finished children of every body being built, across calls */
  private held = 0;
  /** True while a body that trims its text is being built (not through a macro body) */
  private inTrimmed = false;
  /** Whitespace that trimmed counts left out of the output of the CALLs run so far */
  private callBlanks = 0;
  private macros = new Map<string, DefineNode>();
  private readonly root: RootScope;
  /** The innermost scope: a block or loop frame while one renders, else the root */
  private scope: VariableLookup;

  constructor(
    variables: VariableLookup,
    options?: { strictMode?: boolean; limits?: Partial<Limits>; render?: boolean }
  ) {
    this.strictMode = options?.strictMode ?? true;
    this.render = options?.render ?? false;
    this.limits = withDefaultLimits(options?.limits);
    this.depthCap = Math.min(this.limits.maxDepth, MAX_RUNTIME_DEPTH);
    this.root = new RootScope(variables);
    this.scope = this.root;
  }

  /**
   * FOR iterations and CALLs run by the latest interpret call
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
    this.depth = 0;
    this.held = 0;
    this.inTrimmed = false;
    this.callBlanks = 0;
    this.scope = this.root;
    // linking comes first: a bad call is found before any output
    this.macros = linkProgram(ast);
    return this.visitProgram(ast);
  }

  /**
   * Visit program node (root)
   */
  private visitProgram(node: ProgramNode): string {
    return this.block(node.body, () => this.renderChildren(node.body));
  }

  /**
   * Render the children of one body and join them. Each finished child adds its
   * characters to the ones already held by every body being built (this one
   * and the ones around it, across calls); the child that tips the total over
   * maxOutputChars is where the error is located, or `at` when the caller
   * names the node (a loop keeps its own place). The body's characters are
   * released when it returns: the parent then adds the returned text.
   * Inside a body that trims its text (SECTION, LIST_ITEM, a cell) a child
   * adds only its text without the blanks around it, so text the trim drops
   * never fails the limit; the blanks of CALL output inside the child are
   * added back, since a macro body starts a fresh context and its whole
   * output counts.
   */
  private renderChildren(
    nodes: ASTNode[],
    at?: ASTNode,
    render: (child: ASTNode) => string = (child) => this.visit(child)
  ): string {
    const parts: string[] = [];
    let mine = 0;
    try {
      for (const child of nodes) {
        const blanksBefore = this.callBlanks;
        const output = render(child);
        parts.push(output);
        const kept = this.inTrimmed
          ? output.trim().length + (this.callBlanks - blanksBefore)
          : output.length;
        mine += kept;
        this.hold(kept, at ?? child);
      }
    } finally {
      this.held -= mine;
    }
    return parts.join("");
  }

  /** Add characters to `held`; the limit is crossed at `node` */
  private hold(length: number, node: ASTNode): void {
    this.held += length;
    this.checkOutputLength(this.held, node);
  }

  /** Run a body with its trimming context set, restoring the one around it */
  private trimming<T>(value: boolean, run: () => T): T {
    const outer = this.inTrimmed;
    this.inTrimmed = value;
    try {
      return run();
    } finally {
      this.inTrimmed = outer;
    }
  }

  /**
   * Run a block or a call one level deeper. The counter rises on every block
   * entered and every CALL and falls when it ends, so it bounds recursion and
   * nesting alike; crossing the cap is located at the opening tag.
   */
  private enter<T>(node: ASTNode, what: "block" | "call", run: () => T): T {
    if (this.depth >= this.depthCap) {
      throw new LimitError(
        "limit-depth",
        what === "call"
          ? `Calls and blocks nest deeper than the maximum depth of ${this.depthCap}`
          : `Block nesting exceeds the maximum depth of ${this.depthCap}`,
        node.line,
        node.column,
        "Flatten nested blocks, end the recursion sooner or raise limits.maxDepth (a depth above 256 is never run)"
      );
    }
    this.depth++;
    try {
      return run();
    } finally {
      this.depth--;
    }
  }

  /**
   * Run a block's nodes. A block that directly holds a SET gets its own frame
   * for the run, so a SET never outlives its block and never writes the
   * caller's data; any other block keeps the scope it has.
   */
  private block<T>(nodes: ASTNode[], run: () => T): T {
    if (!nodes.some((child) => child.type === "Set")) return run();
    const outer = this.scope;
    this.scope = new Frame(outer);
    try {
      return run();
    } finally {
      this.scope = outer;
    }
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

  /** One FOR item or one CALL, counted toward maxIterations */
  private countIteration(node: ForNode | CallNode): void {
    this.iterations++;
    if (this.iterations > this.limits.maxIterations) {
      throw new LimitError(
        "limit-iterations",
        node.type === "Call"
          ? `Loops and macro calls ran more than ${this.limits.maxIterations} iterations in total`
          : `Loops ran more than ${this.limits.maxIterations} iterations in total`,
        node.line,
        node.column,
        "Iterate over less data or raise limits.maxIterations"
      );
    }
  }

  private checkOutputLength(length: number, node: ASTNode): void {
    if (length > this.limits.maxOutputChars) {
      throw this.outputTooLong(node.line, node.column);
    }
  }

  private outputTooLong(line: number, column: number): LimitError {
    return new LimitError(
      "limit-output",
      `Output is longer than ${this.limits.maxOutputChars} characters`,
      line,
      column,
      "Render less content or raise limits.maxOutputChars"
    );
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
      case "Set":
        return this.at(node, () => this.visitSet(node as SetNode));
      case "Define":
        return ""; // hoisted into the macro table; prints nothing
      case "Call":
        return this.visitCall(node as CallNode);
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
    return this.valueToString(this.evaluateValue(node));
  }

  /**
   * Visit SET: bind the value in the block's own frame, print nothing
   */
  private visitSet(node: SetNode): string {
    const value = this.evaluateValue(node.value);
    this.checkValueSize(value);
    if (!(this.scope instanceof Frame)) {
      throw new Error("A SET ran outside a block frame");
    }
    this.scope.set(node.name, value);
    return "";
  }

  /**
   * Visit CALL: read the arguments in the caller's scope, then run the macro
   * body in a scope of its own. The call counts one iteration and one level of
   * depth. An error raised inside the body keeps the position of the failing
   * body node and says which macro was running.
   */
  private visitCall(node: CallNode): string {
    const macro = this.macros.get(node.name) as DefineNode; // linked in interpret
    this.countIteration(node);
    const args = this.at(node, () => node.args.map((arg) => this.readArgument(arg)));
    const output = this.enter(node, "call", () => this.runMacro(macro, node, args));
    // a trimming body may drop the blanks around the output, but a macro's
    // text counts in full: keep what the trimmed count leaves out
    if (this.inTrimmed) this.callBlanks += output.length - output.trim().length;
    return output;
  }

  /** An argument value, passed as the value (an array stays an array) */
  private readArgument(arg: CallArg): TemplateValue {
    return arg.kind === "literal" ? arg.value : this.resolveNestedPath(arg.path);
  }

  /**
   * Run a macro body in a fresh frame over the data alone: its parameters
   * shadow the data, and the caller's locals, loop names and @ metadata are
   * out of reach. The caller's scope comes back whatever happens.
   */
  private runMacro(macro: DefineNode, call: CallNode, args: TemplateValue[]): string {
    const frame = new Frame(this.root);
    macro.params.forEach((param, i) => frame.set(param, args[i]));
    const outer = this.scope;
    const outerCallBlanks = this.callBlanks;
    this.scope = frame;
    try {
      // a body starts a fresh context that trims nothing
      return this.trimming(false, () => this.renderChildren(macro.body));
    } catch (error) {
      if (error instanceof TemplateError) error.addNote(macroNote(macro, call));
      throw error;
    } finally {
      this.scope = outer;
      this.callBlanks = outerCallBlanks;
    }
  }

  /**
   * The one value evaluator behind ${{ }} and SET: a path, arithmetic or a
   * literal, then the ?? default and the filter chain. Returns the value, not
   * its text.
   */
  private evaluateValue(expr: ValueExpr): TemplateValue {
    if (expr.literal) return this.shapeValue(expr, expr.literal.value);

    // Check if this is a math expression (contains operators)
    const pathStr = expr.path.join(".");
    let mathError: unknown = null;
    if (isMathExpression(pathStr) || hasStrayCharacter(pathStr)) {
      try {
        const result = evaluateMathExpression(pathStr, this.scope, {
          zeroIsError: this.render,
        });
        // render binds the number its output prints
        return this.render ? Number(formatNumber(result)) : result;
      } catch (error) {
        if (error instanceof DivisionByZeroError) throw error;
        // Not a valid math expression, continue with normal resolution
        mathError = error;
      }
    }

    const allowUndefined = expr.defaultValue !== undefined;
    let value: TemplateValue = null;
    let lookupError: unknown = null;
    try {
      value = this.resolveNestedPath(expr.path, allowUndefined);
    } catch (error) {
      lookupError = error;
    }
    // A malformed math text is an error only when no variable has that name
    if (mathError instanceof MathSyntaxError && !this.hasRootKey(expr.path[0])) {
      throw mathError;
    }
    if (lookupError !== null) throw lookupError;

    return this.shapeValue(expr, value);
  }

  /**
   * Apply the ?? default (when the value is falsy), then each filter, checking
   * the size of a text result after every filter so a chain cannot grow a text
   * without bound
   */
  private shapeValue(expr: ValueExpr, start: TemplateValue): TemplateValue {
    let value = start;
    if (expr.defaultValue !== undefined && !isTruthy(value)) {
      value = expr.defaultValue;
    }

    for (const filter of expr.filters ?? []) {
      // text filters would turn an unprintable value into ""
      if (!KEEPS_RAW_INPUT.has(filter.name)) this.valueToString(value);
      value = applyFilters(value, [filter]) as TemplateValue;
      this.checkValueSize(value);
    }
    return value;
  }

  /**
   * A text longer than maxOutputChars is a limit-output; arrays, objects and
   * numbers are not measured (no filter grows an array past its input). The
   * caller locates the error at its node.
   */
  private checkValueSize(value: TemplateValue): void {
    if (typeof value !== "string" || value.length <= this.limits.maxOutputChars) {
      return;
    }
    throw this.outputTooLong(1, 1);
  }

  /**
   * Visit IF node
   */
  private visitIf(node: IfNode): string {
    return this.enter(node, "block", () => this.visitBody(this.selectBranch(node)));
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

  /** `loop` is the FOR whose body this is: its output limit is located there */
  private visitBody(nodes: ASTNode[], loop?: ForNode): string {
    return this.block(nodes, () => this.renderChildren(nodes, loop));
  }

  /**
   * Visit CASE node
   */
  private visitCase(node: CaseNode): string {
    return this.enter(node, "block", () => this.runCase(node));
  }

  private runCase(node: CaseNode): string {
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
      if (matches) return this.visitBody(whenNode.body);
    }

    // Fall to DEFAULT
    if (node.default) return this.visitBody(node.default.body);

    return "";
  }

  /**
   * Visit FOR loop
   */
  private visitFor(node: ForNode): string {
    const results: string[] = [];
    this.enter(node, "block", () =>
      this.runLoop(node, false, (nodes) => {
        const output = this.visitBody(nodes, node);
        results.push(output);
        return output.length;
      })
    );
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
    return this.enter(node, "block", () => this.runSection(node));
  }

  private runSection(node: SectionNode): string {
    const title = this.at(node, () => this.sectionTitle(node));
    const heading = `${"#".repeat(node.level)} ${title}\n`;
    // the body loses blank edges below, so its children count trimmed
    const body = this.trimming(true, () => this.visitBody(node.body)).replace(
      /\r\n/g,
      "\n"
    );

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
    return this.enter(node, "block", () => this.runFence(node));
  }

  private runFence(node: FenceNode): string {
    const lang = this.at(node, () => {
      const value = this.fenceLang(node);
      checkFenceLang(value);
      return value;
    });
    return fenced(this.visitBody(node.body), lang);
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
    // each finished line counts into `held` and is released when the list returns
    const start = this.held;
    try {
      this.enter(node, "block", () => this.collectListItems(node.items, depth, lines, node));
    } finally {
      this.held = start;
    }
    return lines.join("\n");
  }

  /**
   * Add the numbered lines of LIST children: an item gives its line, an IF
   * the lines of its branch, a FOR the lines of each iteration (or of its
   * ELSE body). The numbering follows the lines already collected for this
   * LIST, so items from any source share one counter. Returns the characters
   * the lines hold. The limit is crossed at `list`, where it was before lines
   * counted as they finish.
   */
  private collectListItems(
    children: ASTNode[],
    depth: number,
    lines: string[],
    list: ListNode
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
          this.hold(line.length, list);
        }
      } else if (child.type === "If") {
        length += this.enter(child, "block", () =>
          this.collectListItems(this.selectBranch(child as IfNode), depth, lines, list)
        );
      } else if (child.type === "For") {
        this.enter(child, "block", () =>
          this.runLoop(child as ForNode, false, (nodes) => {
            const added = this.collectListItems(nodes, depth, lines, list);
            length += added;
            return added;
          })
        );
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

    // Render content, in a block of its own
    // the content is trimmed, so its children count trimmed (see renderChildren)
    const content = this.trimming(true, () =>
      this.block(node.content, () =>
        this.renderChildren(node.content, undefined, (child) =>
          child.type === "List"
            ? "\n" + this.visitList(child as ListNode, depth + 1) // nested list
            : this.visit(child)
        )
      )
    );

    return content.trim();
  }

  /**
   * Visit TABLE node
   */
  private visitTable(node: TableNode): string {
    return this.enter(node, "block", () => this.runTable(node));
  }

  /**
   * The finished cells count into `held` as they finish (see processCellsArray)
   * and are released when the table returns: the parent then adds its text.
   */
  private runTable(node: TableNode): string {
    const start = this.held;
    try {
      return this.buildTable(node);
    } finally {
      this.held = start;
    }
  }

  private buildTable(node: TableNode): string {
    const rows: string[][] = [];

    // Process header
    if (node.header) {
      const headerCells = this.processCellsArray(node.header);
      rows.push(headerCells);
    }

    // Process rows (ROW, FOR and IF blocks, in source order)
    for (const child of node.rows) this.rowsFromChild(child, rows, child.type !== "For");

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
   * `strict` is a row context: an IF written directly in the TABLE and every FOR
   * and IF nested in it, which the parser guarantees hold only ROW, FOR and IF.
   * The body of a FOR written directly in the TABLE is parsed generically, so it
   * is not strict.
   * Returns the characters the rows hold.
   */
  private rowsFromChild(child: TableChild, rows: string[][], strict: boolean): number {
    if (child.type === "For") {
      let length = 0;
      this.enter(child, "block", () =>
        this.runLoop(child, true, (nodes) => {
          const added = this.tableRowsFrom(nodes, rows, strict);
          length += added;
          return added;
        })
      );
      return length;
    }
    if (child.type === "If") {
      return this.enter(child, "block", () =>
        this.tableRowsFrom(this.selectBranch(child), rows, strict)
      );
    }
    const cells = this.processCellsArray(child);
    rows.push(cells);
    return cells.reduce((sum, cell) => sum + cell.length, 0);
  }

  /**
   * Render the nodes of a FOR or IF body in a TABLE into rows: a ROW node gives its
   * cells, an IF or FOR that holds a ROW builds rows too, and a run of other
   * nodes is rendered together and split on a pipe.
   * Returns the characters the rows hold.
   */
  private tableRowsFrom(nodes: ASTNode[], rows: string[][], strict: boolean): number {
    return this.block(nodes, () => this.collectRows(nodes, rows, strict));
  }

  private collectRows(nodes: ASTNode[], rows: string[][], strict: boolean): number {
    let length = 0;
    const add = (cells: string[]): void => {
      rows.push(cells);
      length += cells.reduce((sum, cell) => sum + cell.length, 0);
    };
    if (strict) {
      for (const bodyNode of nodes) {
        if (bodyNode.type === "TableRow") add(this.processCellsArray(bodyNode as TableRowNode));
        else if (bodyNode.type === "For" || bodyNode.type === "If") length += this.rowsFromChild(bodyNode as TableChild, rows, true);
      }
      return length;
    }

    const addText = (text: string, at: ASTNode): void => {
      if (text.trim()) {
        const cells = text.split("|").map((cell) => cell.trim());
        for (const cell of cells) this.hold(cell.length, at);
        add(cells);
      }
    };
    const inline = ["Text", "Variable", "Ternary", "Comment", "Set", "Call"];
    let run: ASTNode[] = [];
    const flush = (): void => {
      if (run.length === 1) {
        // a row text is trimmed, so its nodes count trimmed as they finish
        addText(this.trimming(true, () => this.renderChildren(run)), run[0]);
      } else if (run.length > 1) {
        const text = this.trimming(true, () => this.renderChildren(run));
        for (const line of text.split(/\r?\n/)) addText(line, run[0]);
      }
      run = [];
    };
    for (const bodyNode of nodes) {
      if (bodyNode.type === "TableRow") {
        flush();
        add(this.processCellsArray(bodyNode as TableRowNode));
      } else if (holdsRow(bodyNode)) {
        flush();
        length += this.rowsFromChild(bodyNode as TableChild, rows, false);
      } else if (inline.includes(bodyNode.type)) {
        run.push(bodyNode);
      } else {
        flush();
        addText(this.visit(bodyNode), bodyNode);
      }
    }
    flush();
    return length;
  }

  /**
   * Process cells array where each cell is an array of AST nodes
   * Returns an array of strings, one per cell
   */
  private processCellsArray(row: ASTNode & { cells: ASTNode[][] }): string[] {
    // one block for the whole row: a SET in one cell reads on in the next
    return this.block(row.cells.flat(), () =>
      row.cells.map((cellNodes) => {
        // a cell is trimmed, so its children count trimmed (see renderChildren)
        const content = this.trimming(true, () => this.renderChildren(cellNodes));
        const cell = content
          .replace(/\r?\n/g, " ")
          .replace(/(\\*)\|/g, (found, slashes: string) =>
            slashes.length % 2 === 0 ? `${slashes}\\|` : found
          )
          .trim();
        this.hold(cell.length, cellNodes[0] ?? row);
        return cell;
      })
    );
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
