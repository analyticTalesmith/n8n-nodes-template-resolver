import { SyntaxError } from "./errors";
import {
  ASTNode,
  CallArg,
  CallNode,
  DefineNode,
  IfNode,
  ProgramNode,
  CaseNode,
  ForNode,
  ListItemNode,
  ListNode,
  SectionNode,
  FenceNode,
  TableNode,
  TableHeaderNode,
  TableRowNode,
} from "./types";

/**
 * Macros as pure functions over the parsed tree: the tag headers, the table of
 * definitions and the link check. Nothing here holds interpreter state, so the
 * interpreter and analyze share it, and a later source of macros (partials)
 * only has to hand over more DEFINE nodes.
 */

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/;
const WHOLE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
const NUMBER = /^-?\d+(\.\d+)?$/;

/** What a header parser returns when the tag text is wrong */
export interface HeaderError {
  error: string;
}

export interface DefineHeader {
  name: string;
  params: string[];
}

export interface CallHeader {
  name: string;
  args: CallArg[];
}

const fail = (error: string): HeaderError => ({ error });

function skipSpaces(text: string, from: number): number {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

/**
 * Read `  name (` from the text after the tag word; returns the name and the
 * index just after the opening parenthesis
 */
function readName(text: string): { name: string; at: number } | HeaderError {
  if (text !== "" && !/^\s/.test(text)) return fail("a space must follow the tag word");
  let i = skipSpaces(text, 0);
  const match = IDENTIFIER.exec(text.slice(i));
  if (!match) {
    return fail(i >= text.length ? "a name is missing" : `bad name near "${text.slice(i, i + 12)}"`);
  }
  const name = match[0];
  i = skipSpaces(text, i + name.length);
  if (text[i] !== "(") return fail('"(" must follow the name');
  return { name, at: i + 1 };
}

/** The text must hold nothing after the closing parenthesis at `close` */
function checkEnd(text: string, close: number): HeaderError | null {
  const rest = text.slice(close + 1).trim();
  return rest === "" ? null : fail(`unexpected "${rest.slice(0, 12)}" after the )`);
}

/**
 * Read the text after DEFINE: `name(param, param)`. A parameter is a plain
 * identifier, given once.
 */
export function parseDefineHeader(text: string): DefineHeader | HeaderError {
  const head = readName(text);
  if ("error" in head) return head;
  const close = text.indexOf(")", head.at);
  if (close === -1) return fail("the closing ) is missing");
  const unexpected = checkEnd(text, close);
  if (unexpected) return unexpected;

  const inner = text.slice(head.at, close);
  const params: string[] = [];
  if (inner.trim() === "") return { name: head.name, params };
  const seen = new Set<string>();
  for (const raw of inner.split(",")) {
    const param = raw.trim();
    if (param === "") return fail("a parameter is empty");
    if (param.startsWith("@")) return fail(`"${param}" is a name the loops own`);
    if (!WHOLE_IDENTIFIER.test(param)) {
      return fail(`bad parameter "${param}"`);
    }
    if (seen.has(param)) return fail(`parameter "${param}" is given twice`);
    seen.add(param);
    params.push(param);
  }
  return { name: head.name, params };
}

/** One unquoted argument: true, false, null, a number or a variable path */
function readWord(word: string): CallArg | HeaderError {
  if (word === "") return fail("an argument is empty");
  if (word === "true") return { kind: "literal", value: true };
  if (word === "false") return { kind: "literal", value: false };
  if (word === "null") return { kind: "literal", value: null };
  if (NUMBER.test(word)) return { kind: "literal", value: Number(word) };
  if (PATH.test(word)) return { kind: "path", path: word.split(".") };
  return fail(`bad argument "${word}" (an argument is a path, a quoted text, a number, true, false or null)`);
}

/**
 * Read the text after CALL: `name(arg, arg)`, character by character. A quoted
 * text is taken as it is up to the same quote, so a comma, a parenthesis, a
 * pipe or two question marks inside it are plain text.
 */
export function parseCallHeader(text: string): CallHeader | HeaderError {
  const head = readName(text);
  if ("error" in head) return head;

  const args: CallArg[] = [];
  let i = skipSpaces(text, head.at);
  if (text[i] === ")") return finishCall(text, i, head.name, args);

  for (;;) {
    i = skipSpaces(text, i);
    const quote = text[i];
    if (quote === '"' || quote === "'") {
      const end = text.indexOf(quote, i + 1);
      if (end === -1) return fail("a quoted text is not closed");
      args.push({ kind: "literal", value: text.slice(i + 1, end) });
      i = end + 1;
    } else {
      let end = i;
      while (end < text.length && text[end] !== "," && text[end] !== ")") end++;
      const arg = readWord(text.slice(i, end).trim());
      if ("error" in arg) return arg;
      args.push(arg);
      i = end;
    }

    i = skipSpaces(text, i);
    if (text[i] === ",") {
      i++;
    } else if (text[i] === ")") {
      return finishCall(text, i, head.name, args);
    } else {
      return fail(
        i >= text.length ? "the closing ) is missing" : `unexpected "${text.slice(i, i + 12)}" after an argument`
      );
    }
  }
}

function finishCall(text: string, close: number, name: string, args: CallArg[]): CallHeader | HeaderError {
  return checkEnd(text, close) ?? { name, args };
}

/**
 * The macros of a program by name. A Map, so a name such as __proto__ or
 * constructor is a key and never reaches an engine object. A name defined
 * twice is a syntax error at the second definition.
 */
export function buildMacroTable(defines: DefineNode[]): Map<string, DefineNode> {
  const table = new Map<string, DefineNode>();
  for (const define of defines) {
    const first = table.get(define.name);
    if (first) {
      throw new SyntaxError(
        `Macro '${define.name}' is already defined at line ${first.line}`,
        define.line,
        define.column,
        "Give each macro a name of its own"
      );
    }
    table.set(define.name, define);
  }
  return table;
}

/** The DEFINE nodes of a program; the parser allows them at the top level only */
export function topLevelDefines(program: ProgramNode): DefineNode[] {
  return program.body.filter((node): node is DefineNode => node.type === "Define");
}

/**
 * Every CALL in the nodes, wherever it sits (DEFINE bodies, branches that never
 * render, LIST and TABLE children, cells), in source order. It walks with its
 * own stack, so a long ELSEIF chain or a wide template cannot overflow the
 * call stack.
 */
export function findCalls(nodes: ASTNode[]): CallNode[] {
  const calls: CallNode[] = [];
  const pending: ASTNode[] = [];
  const push = (list: ASTNode[] | undefined): void => {
    if (list) for (const node of list) pending.push(node);
  };
  const pushCells = (cells: ASTNode[][]): void => {
    for (const cell of cells) push(cell);
  };

  push(nodes);
  while (pending.length > 0) {
    const node = pending.pop() as ASTNode;
    switch (node.type) {
      case "Call":
        calls.push(node as CallNode);
        break;
      case "Define":
        push((node as DefineNode).body);
        break;
      case "If": {
        const branch = node as IfNode;
        push(branch.consequent);
        if (Array.isArray(branch.alternate)) push(branch.alternate);
        else if (branch.alternate) pending.push(branch.alternate);
        break;
      }
      case "Case": {
        const { cases, default: fallback } = node as CaseNode;
        for (const when of cases) push(when.body);
        push(fallback?.body);
        break;
      }
      case "For": {
        const loop = node as ForNode;
        push(loop.body);
        push(loop.elseBody);
        break;
      }
      case "List":
        push((node as ListNode).items);
        break;
      case "ListItem":
        push((node as ListItemNode).content);
        break;
      case "Table": {
        const table = node as TableNode;
        if (table.header) pending.push(table.header);
        push(table.rows);
        break;
      }
      case "Header":
      case "TableRow":
        pushCells((node as TableHeaderNode | TableRowNode).cells);
        break;
      case "Section":
      case "Fence":
        push((node as SectionNode | FenceNode).body);
        break;
    }
  }
  return calls.sort((a, b) => a.line - b.line || a.column - b.column);
}

/** One CALL that does not match the macro table */
export interface LinkProblem {
  call: CallNode;
  kind: "unknown" | "arity";
  message: string;
}

/**
 * The problems of the calls, in the order given: a name no macro has, or a
 * known name with the wrong number of arguments
 */
export function linkProblems(
  calls: CallNode[],
  table: Map<string, DefineNode>
): LinkProblem[] {
  const problems: LinkProblem[] = [];
  for (const call of calls) {
    const macro = table.get(call.name);
    if (!macro) {
      problems.push({ call, kind: "unknown", message: `Unknown macro: ${call.name}` });
    } else if (macro.params.length !== call.args.length) {
      problems.push({
        call,
        kind: "arity",
        message: `Macro '${call.name}' takes ${macro.params.length} argument(s), got ${call.args.length}`,
      });
    }
  }
  return problems;
}

/**
 * The macro table of a program, after the link check: a duplicate name, then
 * the first unknown macro or wrong argument count in source order, is a syntax
 * error at it, whether or not the call would ever run.
 */
export function linkProgram(program: ProgramNode): Map<string, DefineNode> {
  const table = buildMacroTable(topLevelDefines(program));
  const [first] = linkProblems(findCalls(program.body), table);
  if (first) {
    throw new SyntaxError(
      first.message,
      first.call.line,
      first.call.column,
      first.kind === "unknown"
        ? "Define it with {{DEFINE name(param, ...)}}"
        : "Give the call as many arguments as the macro has parameters"
    );
  }
  return table;
}

/**
 * What an error raised in a macro body says about where the body came from.
 * The one place the wording lives, so a later source of macros can add to it.
 */
export function macroNote(macro: DefineNode, call: CallNode): string {
  return ` (in macro '${macro.name}', called at line ${call.line}, col ${call.column})`;
}
