/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { KEYWORDS } from "../../core/src/lexer";
import { render, validate } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { spec } from "../../core/src/spec";
import { Limits } from "../../core/src/types";
import { runGoldenCases } from "../golden/harness";
import { check } from "../headless/http-helpers";

// {{DEFINE name(params)}}...{{END_DEFINE}} gives a reusable text block and {{CALL name(args)}} prints it. Every row below runs in
// all four entries (render and resolve, strict and lenient) unless it names its own. Ids: mc-define mc-call mc-link mc-scope
// mc-depth mc-iterations mc-output mc-locate mc-names mc-ws mc-analyze mc-spec mc-compat.

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];
const RENDER: Entry[] = ["render-strict", "render-lenient"];
const RESOLVE: Entry[] = ["resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  message?: string;
  output?: string;
  iterations?: number;
  omitted?: number;
}

type RunOptions = Record<string, any>;

function run(entry: Entry, template: string, data: Record<string, any>, limits?: Partial<Limits>, opts?: RunOptions): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode, limits, ...opts });
      if (r.ok) return { code: "ok", output: r.output, iterations: r.stats.iterations, omitted: r.stats.sectionsOmitted };
      const d = r.diagnostics[0] as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message, output: r.output, iterations: r.stats.iterations };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode, limits, ...opts });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
  }
}

/** validate and analyze reported as one outcome; a TemplateError thrown by analyze counts as its diagnostic. */
function runStatic(kind: "validate" | "analyze", template: string, limits?: Partial<Limits>): Outcome {
  try {
    if (kind === "validate") {
      const r = validate(template, limits ? { limits } : undefined);
      if (r.ok) return { code: "ok" };
      const d = (r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0]) as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message };
    }
    const a = analyze(template, limits ? { limits } : undefined);
    const d = a.diagnostics[0] as any;
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, message: d.message };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
  }
}

/** analyze, with a thrown TemplateError turned into a failed assertion that says what was thrown. */
function analyzed(tpl: string, limits?: Partial<Limits>): any {
  try {
    return analyze(tpl, limits ? { limits } : undefined);
  } catch (e) {
    check(`${(e as any)?.code}: ${(e as Error)?.message}`, `analyze accepts ${JSON.stringify(tpl).slice(0, 200)}`).toBe("ok");
    throw e;
  }
}

type Want = { out: string } | { err: string; line: number; col: number; alts?: Array<{ line: number; col: number }>; has?: string[]; lacks?: string[]; once?: boolean };
type Wants = Want | { strict: Want; lenient: Want };
const OUT = (out: string): Want => ({ out });
const ERR = (err: string, line: number, col: number, has?: string | string[], lacks?: string | string[], once?: boolean): Want => ({
  err,
  line,
  col,
  has: has === undefined ? undefined : ([] as string[]).concat(has),
  lacks: lacks === undefined ? undefined : ([] as string[]).concat(lacks),
  once,
});
/** An error that may be located at any one of several places the spec allows. */
const ERR_ANY = (err: string, at: Array<{ line: number; col: number }>, has?: string | string[]): Want => ({ ...(ERR(err, at[0].line, at[0].col, has) as any), alts: at.slice(1) });
const SL = (strict: Want, lenient: Want): Wants => ({ strict, lenient });
const pick = (w: Wants, entry: Entry): Want => ("strict" in w ? (entry.endsWith("strict") ? w.strict : w.lenient) : w);

interface Row {
  name: string;
  tpl: string;
  data: Record<string, any>;
  want: Wants;
  entries?: Entry[];
  limits?: Partial<Limits>;
  opts?: RunOptions;
  /** extra assertions on the outcome (stats.iterations and so on) */
  also?: (o: Outcome, entry: Entry) => void;
}

const INSIDE = "(in macro";

function verifyOutcome(o: Outcome, want: Want, label: string): void {
  if ("err" in want) {
    check(o.code, `${label}: expects the error ${want.err} (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe(want.err);
    const places = [{ line: want.line, col: want.col }, ...(want.alts ?? [])];
    check(places.some((p) => p.line === o.line && p.col === o.column), `${label}: located at ${places.map((p) => `${p.line}:${p.col}`).join(" or ")} (got ${o.line}:${o.column})`).toBe(true);
    // DEFINE, END_DEFINE and CALL are known tags: their syntax errors never say "Unknown template tag"
    if (want.err === "syntax-error" && !(want.has ?? []).includes(UNKNOWN_TAG)) {
      check((o.message ?? "").includes(UNKNOWN_TAG), `${label}: the tag is known, so the error is not an unknown tag (got ${o.message ?? ""})`).toBe(false);
    }
    for (const h of want.has ?? []) check(o.message ?? "", `${label}: the message holds ${JSON.stringify(h)}`).toContain(h);
    for (const l of want.lacks ?? []) check((o.message ?? "").includes(l), `${label}: the message does not hold ${JSON.stringify(l)} (got ${o.message ?? ""})`).toBe(false);
    if (want.once) check(((o.message ?? "").match(/\(in macro/g) ?? []).length, `${label}: the macro is named once in the message (got ${o.message ?? ""})`).toBe(1);
    return;
  }
  check(o.code, `${label}: renders without an error (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
  check(o.output, `${label}: renders ${JSON.stringify(want.out)}`).toBe(want.out);
}

function verify(entry: Entry, r: Row, id: string): void {
  const o = run(entry, r.tpl, r.data, r.limits, r.opts);
  verifyOutcome(o, pick(r.want, entry), `${id} [${entry}] ${r.name}`);
  if (r.also) r.also(o, entry);
}

function expand(rows: Row[]) {
  return rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
}

interface Pos {
  line: number;
  col: number;
}
/** The line and column of an index in a template. */
function posOf(tpl: string, index: number): Pos {
  const before = tpl.slice(0, index);
  return { line: before.split("\n").length, col: before.length - (before.lastIndexOf("\n") + 1) + 1 };
}
/** The position of the n-th (1-based) occurrence of a text. */
function nth(tpl: string, needle: string, n = 1): Pos {
  let at = -1;
  for (let i = 0; i < n; i++) {
    at = tpl.indexOf(needle, at + 1);
    check(at >= 0, `the template holds ${n} copies of ${JSON.stringify(needle)}`).toBe(true);
  }
  return posOf(tpl, at);
}

/** A template with § at the place where the error is located and ¤ at the CALL that entered the failing body. */
function marked(tplMarked: string): { tpl: string; line: number; col: number; call: Pos } {
  let tpl = "";
  let at: Pos = { line: 1, col: 1 };
  let call: Pos = { line: 1, col: 1 };
  for (const ch of tplMarked) {
    if (ch === "§") at = posOf(tpl, tpl.length);
    else if (ch === "¤") call = posOf(tpl, tpl.length);
    else tpl += ch;
  }
  return { tpl, line: at.line, col: at.col, call };
}

const annot = (macro: string, call: Pos) => `${INSIDE} '${macro}', called at line ${call.line}, col ${call.col})`;

// ---- data: the probe data of the unmodified code, plus a few names for the macro rows ----

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(5);
const PROBE: Record<string, any> = {
  a: "A", b: 2, n: 5, zero: 0, f: false, nul: null, empty: "", s: "hello world", xs: ["b", "a", "b"],
  o: { k: "v", n: { d: 1 } }, cyc, big, long: "x".repeat(30), price: 0.1, q: 0.2, items: [{ n: "x" }, { n: "y" }],
};
const DATA: Record<string, any> = {
  ...PROBE, t: true, e: [], ys: ["p", "q"], one: ["z"], five: [1, 2, 3, 4, 5], many: Array.from({ length: 50 }, (_, i) => i), x: "DX",
};

function row(name: string, tpl: string, want: Wants, extra: Partial<Row> = {}): Row {
  return { name, tpl, want, ...extra, data: { ...DATA, ...(extra.data ?? {}) } };
}
/** An error located at the § mark (the same in every mode unless `lenient` gives an output). */
function mrow(name: string, tplMarked: string, code: string, has: string | string[] | undefined, lenient: string | "same", extra: Partial<Row> = {}): Row {
  const m = marked(tplMarked);
  const err = ERR(code, m.line, m.col, has);
  return { name, tpl: m.tpl, data: DATA, want: SL(err, lenient === "same" ? err : OUT(lenient)), ...extra };
}
const always = (name: string, tplMarked: string, code: string, has?: string | string[], extra: Partial<Row> = {}): Row => mrow(name, tplMarked, code, has, "same", extra);
const MV = "missing-variable";
/**
 * An error raised inside the body of macro `macro`: located at § and named with the CALL at ¤ in the message, never
 * located at the CALL. `lenient` is the lenient output, or "same" for an error in every mode.
 */
function inBody(name: string, tplMarked: string, code: string, macro: string, lenient: string | "same", extra: Partial<Row> = {}, more: string[] = []): Row {
  const m = marked(tplMarked);
  const err = ERR(code, m.line, m.col, [annot(macro, m.call), ...more], undefined, true);
  return { name, tpl: m.tpl, data: DATA, want: SL(err, lenient === "same" ? err : OUT(lenient)), ...extra };
}

function goldenCase(name: string): { count: number; message: string } {
  const casesDir = path.join(__dirname, "..", "golden", "render-cases");
  const only = fs.mkdtempSync(path.join(os.tmpdir(), "tr-gold-"));
  try {
    const src = path.join(casesDir, name);
    const dst = path.join(only, name);
    fs.mkdirSync(dst);
    for (const f of ["template.md", "data.json", "options.json", "expected.md"]) {
      check(fs.existsSync(path.join(src, f)), `the case folder ${name} holds ${f}`).toBe(true);
      fs.copyFileSync(path.join(src, f), path.join(dst, f));
    }
    const results = runGoldenCases(
      only,
      (template, data, options) => {
        const r = render(template, data, options);
        if (!r.ok) throw new Error(`render failed: ${r.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`);
        return r.output;
      },
      { update: false },
    );
    return { count: results.length, message: results[0]?.passed ? "" : (results[0]?.message ?? "no result") };
  } finally {
    fs.rmSync(only, { recursive: true, force: true });
  }
}

// ---- small builders ----

const rep = (s: string, n: number): string => s.repeat(n);
const def = (name: string, params: string, body: string): string => `{{DEFINE ${name}(${params})}}${body}{{END_DEFINE}}`;
const calls = (name: string, n: number): string => rep(`{{CALL ${name}()}}`, n);
const F = def("f", "p", "[\${{p}}]"); // the macro most rows call: prints its parameter in brackets
const UNKNOWN_TAG = "Unknown template tag";


// =====================================================================================
// mc-define: hoisted, top level only, prints nothing, one definition per name
// =====================================================================================

const HOIST_ROWS: Row[] = [
  row("a CALL before the DEFINE works (hoisted)", "{{CALL a()}}{{DEFINE a()}}hi{{END_DEFINE}}", OUT("hi")),
  row("the DEFINE itself prints nothing", "[{{DEFINE a()}}body{{END_DEFINE}}]", OUT("[]")),
  row("a DEFINE then a later CALL", "{{DEFINE a()}}hi{{END_DEFINE}}[{{CALL a()}}]", OUT("[hi]")),
  row("a macro called twice prints twice", "{{DEFINE a()}}hi{{END_DEFINE}}{{CALL a()}}{{CALL a()}}", OUT("hihi")),
  row("a macro never called prints nothing", "x{{DEFINE a()}}hi{{END_DEFINE}}y", OUT("xy")),
  row("an empty body prints nothing", "{{DEFINE a()}}{{END_DEFINE}}[{{CALL a()}}]", OUT("[]")),
  row("a body of blanks keeps its blanks", "{{DEFINE a()}}  {{END_DEFINE}}[{{CALL a()}}]", OUT("[  ]")),
  row("a CALL in a branch that never renders and a later CALL, the DEFINE last", "{{IF f}}{{CALL a()}}{{END_IF}}[{{CALL a()}}]{{DEFINE a()}}hi{{END_DEFINE}}", OUT("[hi]")),
  row("a CALL in a FOR before the DEFINE", "{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}{{DEFINE a()}}-{{END_DEFINE}}", OUT("---")),
  row("a macro calls a macro defined after it", "{{DEFINE a()}}<{{CALL b()}}>{{END_DEFINE}}{{DEFINE b()}}B{{END_DEFINE}}{{CALL a()}}", OUT("<B>")),
  row("a macro calls a macro defined before it", "{{DEFINE b()}}B{{END_DEFINE}}{{DEFINE a()}}<{{CALL b()}}>{{END_DEFINE}}{{CALL a()}}", OUT("<B>")),
  row("names that differ in case are two macros", "{{DEFINE a()}}1{{END_DEFINE}}{{DEFINE A()}}2{{END_DEFINE}}{{CALL a()}}{{CALL A()}}", OUT("12")),
  row("a name with digits and underscores", "{{DEFINE _m_2()}}ok{{END_DEFINE}}{{CALL _m_2()}}", OUT("ok")),
  row("a macro named like a data variable", "{{DEFINE a()}}M{{END_DEFINE}}\${{a}}{{CALL a()}}", OUT("AM")),
  row("a macro named like a filter or keyword word", "{{DEFINE upper()}}U{{END_DEFINE}}{{DEFINE IF2()}}I{{END_DEFINE}}{{CALL upper()}}{{CALL IF2()}}", OUT("UI")),
  row("the same body with CRLF line breaks in the text", "{{DEFINE a()}}x\r\ny{{END_DEFINE}}{{CALL a()}}", OUT("x\ny")),
];

/** [label, text before the DEFINE, text after it] */
const CONTAINERS: Array<[string, string, string]> = [
  ["an IF", "{{IF t}}", "{{END_IF}}"],
  ["an IF branch that never renders", "{{IF f}}", "{{END_IF}}"],
  ["an ELSEIF", "{{IF f}}a{{ELSEIF t}}", "{{END_IF}}"],
  ["an ELSE", "{{IF t}}a{{ELSE}}", "{{END_IF}}"],
  ["a CASE WHEN", "{{CASE b}}{{WHEN 2}}", "{{END_CASE}}"],
  ["a CASE DEFAULT", "{{CASE b}}{{WHEN 1}}w{{DEFAULT}}", "{{END_CASE}}"],
  ["a FOR", "{{FOR xs AS i}}", "{{END_FOR}}"],
  ["the ELSE body of a FOR", "{{FOR e AS i}}x{{ELSE}}", "{{END_FOR}}"],
  ["a LIST", "{{LIST}}", "{{END_LIST}}"],
  ["a LIST_ITEM", "{{LIST}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_LIST}}"],
  ["a TABLE", "{{TABLE}}", "{{END_TABLE}}"],
  ["a HEADER", "{{TABLE}}{{HEADER}}", "{{END_HEADER}}{{END_TABLE}}"],
  ["a ROW", "{{TABLE}}{{ROW}}", "{{END_ROW}}{{END_TABLE}}"],
  ["a SECTION", '{{SECTION "T"}}', "{{END_SECTION}}"],
  ["a FENCE", "{{FENCE}}", "{{END_FENCE}}"],
  ["another DEFINE", "{{DEFINE o()}}", "{{END_DEFINE}}"],
  ["an IF inside another DEFINE", "{{DEFINE o()}}{{IF t}}", "{{END_IF}}{{END_DEFINE}}"],
  ["a FOR after a CALL", "{{CALL o()}}{{FOR xs AS i}}", "{{END_FOR}}{{DEFINE o()}}{{END_DEFINE}}"],
];
const NESTED_DEFINE_ROWS: Row[] = CONTAINERS.map(([label, before, after]) =>
  always(`a DEFINE inside ${label} is a syntax-error at the DEFINE`, `${before}§${def("a", "", "x")}${after}`, "syntax-error"),
);

const TWICE_ROWS: Row[] = [
  mrow("a name defined twice is a syntax-error at the second", `${def("a", "", "x")}\n§${def("a", "", "y")}`, "syntax-error", ["line 1"], "same"),
  mrow("the second has other parameters: still a duplicate", `${def("a", "", "x")}\n§${def("a", "p", "y")}`, "syntax-error", ["line 1"], "same"),
  mrow("the third copy does not move the error", `${def("a", "", "x")}\n§${def("a", "", "y")}\n${def("a", "", "z")}`, "syntax-error", "line 1", "same"),
  mrow("after a CALL and other text", `{{CALL a()}}\nmore\n${def("a", "", "x")}\ntext\n§${def("a", "", "y")}`, "syntax-error", ["line 3"], "same"),
  mrow("the first definition of the name is on a later line", `x\n\n${def("b", "", "z")}\n${def("a", "", "x")}\n§${def("a", "", "y")}`, "syntax-error", "line 4", "same"),
  mrow("two prototype names defined twice", `${def("toString", "", "x")}\n§${def("toString", "", "y")}`, "syntax-error", ["toString", "line 1"], "same"),
  mrow("a duplicate of a macro that is never called", `${def("a", "", "x")}\n§${def("a", "", "y")}\ntext`, "syntax-error", "line 1", "same"),
  mrow("a duplicate wins over an unknown macro called earlier", `{{CALL nope()}}\n${def("a", "", "x")}\n§${def("a", "", "y")}`, "syntax-error", ["line 2"], "same"),
];

const BAD_DEFINE_TAGS = [
  "{{DEFINE}}", "{{DEFINE f}}", "{{DEFINE f(}}", "{{DEFINE f)}}", "{{DEFINE f(a,)}}", "{{DEFINE f(,a)}}", "{{DEFINE f(a,,b)}}",
  "{{DEFINE f(a,a)}}", "{{DEFINE f(a, b, a)}}", "{{DEFINE f(1a)}}", "{{DEFINE f(@a)}}", "{{DEFINE f(a.b)}}", "{{DEFINE 1f()}}",
  "{{DEFINE f() x}}", "{{DEFINE f(a b)}}", "{{DEFINE f(a))}}", "{{DEFINE f((a)}}", "{{DEFINE ()}}", "{{DEFINE f(a-b)}}",
  '{{DEFINE f("a")}}', "{{DEFINE f(1)}}", "{{DEFINE f-g()}}", "{{DEFINE f ()x}}", "{{DEFINE f(a)(b)}}", "{{DEFINE f(a) = 1}}",
];
const BAD_DEFINE_ROWS: Row[] = BAD_DEFINE_TAGS.map((tag) => always(`${tag} is a syntax-error at the tag`, `a\n§${tag}x{{END_DEFINE}}`, "syntax-error"));
const BAD_DEFINE_HIDDEN: Row[] = [
  always("a DEFINE with a bad parameter list inside a branch that never renders is a syntax-error at the tag", "{{IF f}}§{{DEFINE f(a,a)}}x{{END_DEFINE}}{{END_IF}}", "syntax-error"),
  always("a bad DEFINE after the text is found before any output", "text {{CALL a()}} more\n§{{DEFINE a(1)}}x{{END_DEFINE}}", "syntax-error"),
];
const SHAPE_ROWS: Row[] = [
  always("an unclosed DEFINE is reported at its opening tag", "a\n§{{DEFINE f()}}x", "syntax-error"),
  always("a stray END_DEFINE is reported at the closer", "a\n§{{END_DEFINE}}", "syntax-error"),
  always("an END_DEFINE that closes a block opened inside it is reported at the closer", "{{DEFINE a()}}{{IF t}}x§{{END_DEFINE}}{{END_IF}}", "syntax-error"),
  always("an END_DEFINE with arguments is a syntax-error at the closer", "{{DEFINE a()}}x§{{END_DEFINE x}}", "syntax-error"),
  always("an END_IF that closes a DEFINE is reported at the closer", "{{DEFINE a()}}x§{{END_IF}}", "syntax-error"),
  always("an unclosed DEFINE after a closed one", "{{DEFINE a()}}x{{END_DEFINE}}\n§{{DEFINE b()}}y", "syntax-error"),
];

describe("mc-define: a DEFINE is hoisted, top level, silent and unique by name", () => {
  it.each(expand(HOIST_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(NESTED_DEFINE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(TWICE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(BAD_DEFINE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(BAD_DEFINE_HIDDEN))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(SHAPE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));

  // the same errors through validate (an error diagnostic) and analyze (thrown), located the same way
  const staticRows = [...NESTED_DEFINE_ROWS, ...TWICE_ROWS, ...BAD_DEFINE_ROWS, ...BAD_DEFINE_HIDDEN, ...SHAPE_ROWS];
  const statics = staticRows.flatMap((r) => (["validate", "analyze"] as const).map((kind) => ({ kind, r, name: r.name })));
  it.each(statics)("mc-define: [$kind] $name", ({ kind, r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const o = runStatic(kind, r.tpl);
    verifyOutcome(o, ERR(want.err, want.line, want.col), `mc-define [${kind}] ${r.name}`);
  });

  it("mc-define: the failed render of a DEFINE error has no output and ok false", () => {
    const r = render("text {{DEFINE a()}}x{{END_DEFINE}} {{IF t}}{{DEFINE b()}}y{{END_DEFINE}}{{END_IF}}", DATA);
    check(r.ok, "render fails").toBe(false);
    check(r.output, "no output of a failed render").toBe("");
    check(r.diagnostics[0].code, "the code").toBe("syntax-error");
    check(r.diagnostics[0].message.includes(UNKNOWN_TAG), `the tag is known: ${r.diagnostics[0].message}`).toBe(false);
    check({ line: r.diagnostics[0].line, column: r.diagnostics[0].column }, "located at the inner DEFINE").toEqual({ line: 1, column: 44 });
  });
});

// =====================================================================================
// mc-call: arguments bind by position, paths and literals, values stay values
// =====================================================================================

/** [argument text, the output of F = "[\${{p}}]" for it] */
const ARG_CASES: Array<[string, string]> = [
  ['"hi"', "[hi]"], ["'hi'", "[hi]"], ["5", "[5]"], ["-3", "[-3]"], ["1.50", "[1.5]"], ["0", "[0]"], ["true", "[true]"], ["false", "[false]"],
  ["null", "[]"], ['""', "[]"], ["''", "[]"],
  ["a", "[A]"], ["zero", "[0]"], ["f", "[false]"], ["nul", "[]"], ["empty", "[]"], ["s", "[hello world]"], ["o.k", "[v]"], ["o.n.d", "[1]"],
  ["xs.0", "[b]"], ["xs.1", "[a]"], ["xs.length", "[3]"], ["o.zz", "[]"], ["o.n.zz.deep", "[]"],
  ["o", '[{"k":"v","n":{"d":1}}]'], ["xs", '[["b","a","b"]]'],
  ['"a,b"', "[a,b]"], ['"a)b"', "[a)b]"], ['"(x)"', "[(x)]"], ['"a|b"', "[a|b]"], ['"a ?? b"', "[a ?? b]"], ['"a}b"', "[a}b]"], ['"a{b"', "[a{b]"],
  ['"a + 1"', "[a + 1]"], ['"a | upper"', "[a | upper]"], ["'say \"hi\"'", '[say "hi"]'], ['"it\'s"', "[it's]"], ['"  pad  "', "[  pad  ]"],
  ['"a.b"', "[a.b]"], ['"a{{b}}c"', "[a{{b}}c]"], ['"x\\n"', "[x\\n]"], ['"5"', "[5]"], ['"true"', "[true]"], ['"null"', "[null]"],
];
const ARG_ROWS: Row[] = ARG_CASES.map(([arg, out]) => row(`CALL f(${arg}) binds the argument and the body prints ${JSON.stringify(out)}`, `${F}{{CALL f(${arg})}}`, OUT(out)));

const BIND_ROWS: Row[] = [
  row("positional arguments bind to parameters in order", `${def("f", "a, b", "[\${{a}}|\${{b}}]")}{{CALL f("1", "2")}}`, OUT("[1|2]")),
  row("swapped path arguments swap the values", `${def("f", "a, b", "[\${{a}}|\${{b}}]")}{{CALL f(b, a)}}`, OUT("[2|A]")),
  row("a path and a literal", `${def("f", "a, b", "[\${{a}}|\${{b}}]")}{{CALL f(a, "lit")}}{{CALL f("lit", o.k)}}`, OUT("[A|lit][lit|v]")),
  row("three parameters with letters, digits and underscores", `${def("f", "_a, B1, c_2", "\${{_a}}\${{B1}}\${{c_2}}")}{{CALL f(1, 2, 3)}}`, OUT("123")),
  row("whitespace around the parts is free", `${def("f", " a , b ", "[\${{a}}|\${{b}}]")}{{CALL  f ( a , "b" ) }}`, OUT("[A|b]")),
  row("zero parameters with a call that has spaces inside", `${def("g", "", "z")}{{CALL g()}}{{CALL g( )}}`, OUT("zz")),
  row("a call result inside text", `${F}<{{CALL f("a")}}|{{CALL f("b")}}>`, OUT("<[a]|[b]>")),
  row("the same macro with the same argument twice shares nothing", `${F}{{CALL f("x")}}{{CALL f("x")}}`, OUT("[x][x]")),
  row("two macros with the same parameter name", `${def("g", "p", "g\${{p}}")}${def("h", "p", "h\${{p}}")}{{CALL g(1)}}{{CALL h(2)}}`, OUT("g1h2")),
  row("a parameter passed on to another macro", `${def("g", "q", "<\${{q}}>")}${def("h", "p", "{{CALL g(p)}}")}{{CALL h(a)}}`, OUT("<A>")),
  row("a parameter and a literal passed on", `${def("g", "q", "<\${{q}}>")}${def("h", "p", '{{CALL g(p)}}{{CALL g("lit")}}')}{{CALL h(5)}}`, OUT("<5><lit>")),
  row("a macro called inside a macro called inside a macro", `${def("c", "", "C")}${def("b", "", "B{{CALL c()}}")}${def("a", "", "A{{CALL b()}}")}{{CALL a()}}`, OUT("ABC")),
  row("a literal containing a quote of the other kind", `${F}{{CALL f('a"b')}}{{CALL f("a'b")}}`, OUT("[a\"b][a'b]")),
];

const VALUE_ROWS: Row[] = [
  row("an array argument is walked by a FOR with limit and @total", `${def("g", "p", "{{FOR p AS i limit=2}}\${{i}}\${{@total}}{{END_FOR}}")}{{CALL g(xs)}}`, OUT("b2a2")),
  row("an array argument keeps its paths", `${def("g", "p", "\${{p.1}}\${{p.length}}")}{{CALL g(xs)}}`, OUT("a3")),
  row("an array of objects stays walkable", `${def("g", "p", "{{FOR p AS i}}\${{i.n}}{{END_FOR}}")}{{CALL g(items)}}`, OUT("xy")),
  row("an object argument is read by path", `${def("g", "p", "\${{p.k}}\${{p.n.d}}")}{{CALL g(o)}}`, OUT("v1")),
  row("a number argument is a number in math", `${def("g", "p", "\${{p + 1}}")}{{CALL g(n)}}`, OUT("6")),
  row("the literal 5 is a number in math", `${def("g", "p", "\${{p + 1}}")}{{CALL g(5)}}`, OUT("6")),
  row("the literal -3 is a number in math", `${def("g", "p", "\${{p + 1}}")}{{CALL g(-3)}}`, OUT("-2")),
  row("a number is compared as a number", `${def("g", "p", "{{IF p > 3}}y{{ELSE}}n{{END_IF}}")}{{CALL g(n)}}{{CALL g(2)}}{{CALL g(1.50)}}`, OUT("ynn")),
  row("false, true and null in a condition", `${def("g", "p", "{{IF p}}y{{ELSE}}n{{END_IF}}")}{{CALL g(false)}}{{CALL g(f)}}{{CALL g(true)}}{{CALL g(null)}}{{CALL g(a)}}`, OUT("nnyny")),
  row("a text is compared as a text", `${def("g", "p", '{{IF p == "a"}}y{{ELSE}}n{{END_IF}}')}{{CALL g("a")}}{{CALL g("b")}}`, OUT("yn")),
  row("@index0 of the caller's loop is passed as a number", `${F}{{FOR xs AS i}}{{CALL f(@index0)}}{{END_FOR}}`, OUT("[0][1][2]")),
  row("a passed @index0 is used in math", `${def("g", "p", "\${{p + 1}}")}{{FOR xs AS i}}{{CALL g(@index0)}}{{END_FOR}}`, OUT("123")),
  row("@total and @first are passed as values", `${F}{{FOR xs AS i limit=2}}{{CALL f(@total)}}{{CALL f(@first)}}{{END_FOR}}`, OUT("[2][true][2][false]")),
  row("the caller's loop item is an argument", `${F}{{FOR xs AS i}}{{CALL f(i)}}{{END_FOR}}`, OUT("[b][a][b]")),
  row("a field of the caller's loop item is an argument", `${F}{{FOR items AS it}}{{CALL f(it.n)}}{{END_FOR}}`, OUT("[x][y]")),
  row("a SET local of the caller is an argument", `${F}{{SET l = "loc"}}{{CALL f(l)}}`, OUT("[loc]")),
  row("a SET local that holds an array is an argument and stays an array", `${def("g", "p", "{{FOR p AS i}}\${{i}}{{END_FOR}}")}{{SET l = xs | sort}}{{CALL g(l)}}`, OUT("abb")),
  row("a SET local that holds a number is a number in the body", `${def("g", "p", "\${{p + 1}}")}{{SET l = 2 * 3}}{{CALL g(l)}}`, OUT("7")),
  row("an argument read in a FOR sees the item of that iteration", `${F}{{FOR items AS it}}{{CALL f(it.n)}}[\${{@index1}}]{{END_FOR}}`, OUT("[x][1][y][2]")),
  row("astral characters pass through unchanged and keep today's length rule", `${def("g", "p", "\${{p | length}}|\${{p | upper}}")}{{CALL g("😀😀")}}`, OUT("4|😀😀")),
  row("an argument that is a data text with astral characters", `${def("g", "p", "\${{p | length}}")}{{CALL g(emoji)}}`, OUT("4"), { data: { emoji: "😀😀" } }),
  row("the argument of a call inside a FOR is read per iteration", `${def("g", "p", "\${{p}}")}{{FOR many AS i limit=3}}{{CALL g(i)}}{{END_FOR}}`, OUT("012")),
];

const CONTEXT_ROWS: Row[] = [
  row("a CALL in an IF body", `${F}{{IF t}}{{CALL f("x")}}{{END_IF}}`, OUT("[x]")),
  row("a CALL in an ELSEIF body", `${F}{{IF f}}n{{ELSEIF t}}{{CALL f("x")}}{{END_IF}}`, OUT("[x]")),
  row("a CALL in an ELSE body", `${F}{{IF f}}n{{ELSE}}{{CALL f("x")}}{{END_IF}}`, OUT("[x]")),
  row("a CALL in a CASE clause", `${F}{{CASE b}}{{WHEN 2}}{{CALL f("x")}}{{END_CASE}}`, OUT("[x]")),
  row("a CALL in a CASE DEFAULT", `${F}{{CASE b}}{{WHEN 1}}w{{DEFAULT}}{{CALL f("x")}}{{END_CASE}}`, OUT("[x]")),
  row("a CALL in the ELSE body of a FOR", `${F}{{FOR e AS i}}y{{ELSE}}{{CALL f("x")}}{{END_FOR}}`, OUT("[x]")),
  row("a CALL in a SECTION", `${F}{{SECTION "T"}}{{CALL f("x")}}{{END_SECTION}}`, OUT("## T\n\n[x]\n")),
  row("a CALL in a FENCE", `${F}{{FENCE}}{{CALL f("x")}}{{END_FENCE}}`, OUT("```\n[x]\n```\n")),
  row("a CALL in a LIST_ITEM", `${F}{{LIST}}{{LIST_ITEM}}{{CALL f("x")}}{{END_LIST_ITEM}}{{END_LIST}}`, OUT("1. [x]")),
  row("a CALL in a ROW cell", `${F}{{TABLE}}{{ROW}}{{CALL f("x")}}|b{{END_ROW}}{{END_TABLE}}`, OUT("| [x] | b |")),
  row("a CALL in the body of a FOR written in a TABLE is part of the row text", `${F}{{TABLE}}{{FOR xs AS x}}{{CALL f(x)}}|1\n{{END_FOR}}{{END_TABLE}}`, OUT("| [b] | 1 |\n| [a] | 1 |\n| [b] | 1 |")),
  row("a CALL in a macro called in a LIST_ITEM of a FOR in a LIST", `${F}{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}{{CALL f(x)}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}`, OUT("1. [b]\n2. [a]\n3. [b]")),
  row("a macro whose body holds a LIST", `${def("g", "", "{{LIST}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{END_LIST}}")}{{CALL g()}}`, OUT("1. one\n2. two")),
  row("a macro whose body holds a TABLE", `${def("g", "", "{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}")}{{CALL g()}}`, OUT("| 1 | 2 |")),
  row("a macro whose body holds a SECTION and a FENCE", `${def("g", "", '{{SECTION "S"}}{{FENCE}}c{{END_FENCE}}{{END_SECTION}}')}{{CALL g()}}`, OUT("## S\n\n```\nc\n```\n")),
  row("a macro whose body holds a FOR with an ELSE body", `${def("g", "p", "{{FOR p AS i}}\${{i}}{{ELSE}}none{{END_FOR}}")}{{CALL g(xs)}}|{{CALL g(e)}}`, OUT("bab|none")),
  row("a macro whose body holds a CASE", `${def("g", "p", '{{CASE p}}{{WHEN "a"}}A{{WHEN "b"}}B{{DEFAULT}}?{{END_CASE}}')}{{CALL g("a")}}{{CALL g("b")}}{{CALL g("c")}}`, OUT("AB?")),
  row("a CALL between texts", `${F}a{{CALL f("1")}}b{{CALL f("2")}}c`, OUT("a[1]b[2]c")),
];

const MISSING_ROWS: Row[] = [
  mrow("a missing path argument: strict error at the CALL, lenient null", `a\n  §{{CALL f(missing)}}${F}`, MV, "'missing'", "a\n  []", {}),
  mrow("a missing dotted path argument", `a\n  §{{CALL f(missing.deep)}}${F}`, MV, "'missing'", "a\n  []"),
  mrow("a missing @ name outside a loop", `a\n  §{{CALL f(@index0)}}${F}`, MV, "'@index0'", "a\n  []"),
  mrow("the second of two arguments is missing", `a\n  §{{CALL f2(a, missing)}}${def("f2", "p, q", "[\${{p}}|\${{q}}]")}`, MV, "'missing'", "a\n  [A|]"),
  mrow("a missing argument inside a FOR is located at the CALL", `${F}{{FOR xs AS i}}x\n  §{{CALL f(missing)}}{{END_FOR}}`, MV, "'missing'", "x\n  []x\n  []x\n  []"),
  mrow("lenient null makes IF false", `${def("g", "p", "{{IF p}}y{{ELSE}}n{{END_IF}}")}§{{CALL g(missing)}}`, MV, "'missing'", "n"),
  row("a nested missing key is null in both modes", `${F}{{CALL f(o.zz)}}{{CALL f(o.k.zz)}}`, OUT("[][]")),
  mrow("a nested missing key under a missing root is still an error in strict mode", `${F}§{{CALL f(missing.zz)}}`, MV, "'missing'", "[]"),
  row("a present null is a value, not a missing name", `${F}{{CALL f(nul)}}`, OUT("[]")),
  ((): Row => {
    const m = marked(`${F}§{{CALL f(missing)}}`);
    return row("the error at a CALL argument names no macro", m.tpl, SL(ERR(MV, m.line, m.col, "'missing'", INSIDE), OUT("[]")));
  })(),
];

const PRINT_ROWS: Row[] = [
  row("a cyclic value passed to a macro that never prints it is fine", `${def("g", "p", "ok")}{{CALL g(cyc)}}`, OUT("ok")),
  row("a BigInt passed to a macro that never prints it is fine", `${def("g", "p", "ok")}{{CALL g(big)}}`, OUT("ok")),
  row("a cyclic value passed on to another macro is fine", `${def("g", "q", "ok")}${def("h", "p", "{{CALL g(p)}}")}{{CALL h(cyc)}}`, OUT("ok")),
  row("a cyclic value used for its length of keys: a SET of it is fine", `${def("g", "p", "{{SET c = p}}ok")}{{CALL g(cyc)}}`, OUT("ok")),
];

describe("mc-call: arguments bind by position, paths and literals, values stay values", () => {
  it.each(expand(ARG_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(BIND_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(VALUE_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(CONTEXT_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(MISSING_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(PRINT_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));

  it("mc-call: render and resolve agree on every argument case in lenient and strict mode", () => {
    for (const [arg] of ARG_CASES) {
      const tpl = `${F}{{CALL f(${arg})}}`;
      const outs = ENTRIES.map((e) => run(e, tpl, DATA).output);
      check(new Set(outs).size, `${arg}: the four entries print the same ${JSON.stringify(outs)}`).toBe(1);
    }
  });

  it("mc-call: a call does not write the caller's data (render twice, then the Map)", () => {
    const data: Record<string, any> = { a: "A", o: { k: "v" }, xs: ["b"] };
    const before = JSON.stringify(data);
    const tpl = `${def("g", "a, o", '{{SET q = "z"}}\${{a}}\${{o.k}}{{FOR xs AS i}}\${{i}}{{END_FOR}}')}{{CALL g("P", o)}}[\${{a}}]`;
    const one = render(tpl, data);
    const two = render(tpl, data);
    check(one.output, "the first render").toBe("Pvb[A]");
    check(two.output, "the second render is the same").toBe("Pvb[A]");
    check(JSON.stringify(data), "the data object is untouched").toBe(before);
    const map = new Map<string, any>(Object.entries(data));
    check(resolveTemplate(tpl, map), "resolve prints the same").toBe("Pvb[A]");
    check([...map.keys()], "the Map keys are untouched").toEqual(["a", "o", "xs"]);
    check(map.get("a"), "the Map value of the parameter name is untouched").toBe("A");
  });
});

// =====================================================================================
// mc-link: an unknown macro or a wrong argument count is found before any output
// =====================================================================================

const UNKNOWN_ROWS: Row[] = [
  mrow("an unknown macro is a syntax-error at the CALL", "a\n  §{{CALL nope()}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("a macro that differs only in case is unknown", `${def("a", "", "x")}\n§{{CALL A()}}`, "syntax-error", ["Unknown macro", "A"], "same"),
  mrow("in an IF branch that never renders", "{{IF f}}§{{CALL nope()}}{{END_IF}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in an ELSE branch that never renders", "{{IF t}}a{{ELSE}}§{{CALL nope()}}{{END_IF}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a FOR over nothing", "{{FOR e AS i}}§{{CALL nope()}}{{END_FOR}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a CASE clause that never matches", "{{CASE b}}{{WHEN 1}}§{{CALL nope()}}{{END_CASE}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a DEFINE body that is never called", `${def("a", "", "§{{CALL nope()}}")}x`, "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a LIST item", "{{LIST}}{{LIST_ITEM}}§{{CALL nope()}}{{END_LIST_ITEM}}{{END_LIST}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a ROW cell", "{{TABLE}}{{ROW}}§{{CALL nope()}}|b{{END_ROW}}{{END_TABLE}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in the body of a FOR written in a TABLE", "{{TABLE}}{{FOR xs AS x}}§{{CALL nope()}}|1\n{{END_FOR}}{{END_TABLE}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a SECTION and a FENCE", '{{SECTION "T"}}{{FENCE}}§{{CALL nope()}}{{END_FENCE}}{{END_SECTION}}', "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("after text and variables the error is still at the CALL", "text \${{a}} \nmore\n  §{{CALL nope()}} end", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("the first unknown call in source order is reported", "x\n§{{CALL one()}}{{CALL two()}}", "syntax-error", ["Unknown macro", "one"], "same"),
  mrow("an unknown call inside a macro that comes before a later unknown call at the top", `${def("a", "", "§{{CALL inner()}}")}{{CALL outer()}}`, "syntax-error", ["Unknown macro", "inner"], "same"),
  mrow("a lexing error comes before the link check", "{{CALL nope()}}§{{FOO}}", "syntax-error", UNKNOWN_TAG, "same"),
  mrow("a parse error comes before the link check", "{{CALL nope()}}\n§{{DEFINE a(1)}}x{{END_DEFINE}}", "syntax-error", undefined, "same"),
];

const COUNT_ROWS: Row[] = [
  mrow("a call with too few arguments", `${def("a", "x, y", "")}\n§{{CALL a(1)}}`, "syntax-error", "Macro 'a' takes 2 argument(s), got 1", "same"),
  mrow("a call with too many arguments", `${def("a", "x, y", "")}\n§{{CALL a(1, 2, 3)}}`, "syntax-error", "Macro 'a' takes 2 argument(s), got 3", "same"),
  mrow("a zero-parameter macro called with an argument", `${def("z", "", "")}\n§{{CALL z(1)}}`, "syntax-error", "Macro 'z' takes 0 argument(s), got 1", "same"),
  mrow("a one-parameter macro called with none", `${F}\n§{{CALL f()}}`, "syntax-error", "Macro 'f' takes 1 argument(s), got 0", "same"),
  mrow("a wrong count in a branch that never renders", `${F}{{IF f}}§{{CALL f()}}{{END_IF}}`, "syntax-error", "takes 1 argument(s), got 0", "same"),
  mrow("a wrong count inside a macro that is never called", `${F}${def("a", "", "§{{CALL f(1, 2)}}")}x`, "syntax-error", "takes 1 argument(s), got 2", "same"),
  mrow("a wrong count for a macro defined later", `§{{CALL f(1, 2)}}${F}`, "syntax-error", "takes 1 argument(s), got 2", "same"),
  mrow("a wrong count in a FOR with no items", `${F}{{FOR e AS i}}§{{CALL f()}}{{END_FOR}}`, "syntax-error", "takes 1 argument(s), got 0", "same"),
  mrow("the first wrong call in source order is reported", `${F}\n§{{CALL f()}}{{CALL f(1, 2)}}`, "syntax-error", "got 0", "same"),
  mrow("a wrong count and an unknown macro: the first in source order is reported", `${F}\n§{{CALL nope()}}{{CALL f()}}`, "syntax-error", "Unknown macro", "same"),
  mrow("an unknown macro and then a wrong count: the first in source order is reported", `${F}\n§{{CALL f()}}{{CALL nope()}}`, "syntax-error", "got 0", "same"),
  mrow("a right count with a text argument that holds a comma is one argument", `${F}§{{CALL f("a,b", "c")}}`, "syntax-error", "takes 1 argument(s), got 2", "same"),
];

const CALL_SYNTAX: string[] = [
  "{{CALL}}", "{{CALL f}}", "{{CALL f(}}", "{{CALL f)}}", "{{CALL f(a,)}}", "{{CALL f(,a)}}", "{{CALL f(a,,b)}}", "{{CALL f(a b)}}",
  "{{CALL f(a + 1)}}", "{{CALL f(a | upper)}}", '{{CALL f(a ?? "d")}}', '{{CALL f("unclosed)}}', "{{CALL f() x}}", "{{CALL 1f()}}",
  "{{CALL f(a)(b)}}", "{{CALL f(1 2)}}",
  "{{CALL f(a * 2)}}", "{{CALL f(a == b)}}", '{{CALL f("a" "b")}}', "{{CALL f-g()}}", "{{CALL f ()x}}", "{{CALL f[a]}}",
];
const CALL_SYNTAX_ROWS: Row[] = CALL_SYNTAX.map((tag) => always(`${tag} is a syntax-error at the CALL`, `${F}\n§${tag}`, "syntax-error"));
const CALL_SYNTAX_HIDDEN: Row[] = [
  always("a bad CALL in a branch that never renders", `${F}{{IF f}}§{{CALL f(a + 1)}}{{END_IF}}`, "syntax-error"),
  always("a bad CALL in a macro that is never called", `${F}${def("g", "", "§{{CALL f(a | upper)}}")}`, "syntax-error"),
  always("a bad CALL after text that would print", `text\n§{{CALL f(a ?? "d")}}${F}`, "syntax-error"),
  always("{{END_CALL}} is an unknown tag", "a\n§{{END_CALL}}", "syntax-error", UNKNOWN_TAG),
  always("{{call f()}} in lower case is an unknown tag", "a\n§{{call f()}}", "syntax-error", UNKNOWN_TAG),
  always("{{define f()}} in lower case is an unknown tag", "a\n§{{define f()}}", "syntax-error", UNKNOWN_TAG),
  always("{{Call f()}} in mixed case is an unknown tag", "a\n§{{Call f()}}", "syntax-error", UNKNOWN_TAG),
  always("{{CALL}} among LIST children is the same located error as any other tag", `${F}{{LIST}}§{{CALL f("x")}}{{END_LIST}}`, "syntax-error", "Unexpected token in LIST: CALL"),
  always("{{CALL}} among TABLE children is the same located error", `${F}{{TABLE}}§{{CALL f("x")}}{{END_TABLE}}`, "syntax-error", "Unexpected token in TABLE: CALL"),
  always("{{CALL}} in a FOR that builds list items is the same located error", `${F}{{LIST}}{{FOR xs AS x}}§{{CALL f(x)}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}`, "syntax-error", "Unexpected token in LIST: CALL"),
  always("{{CALL}} in an IF that builds list items is the same located error", `${F}{{LIST}}{{IF t}}§{{CALL f("x")}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}`, "syntax-error", "Unexpected token in LIST: CALL"),
  always("{{CALL}} in an IF that builds table rows is the same located error", `${F}{{TABLE}}{{IF t}}§{{CALL f("x")}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}`, "syntax-error", "Unexpected token in TABLE: CALL"),
  always("{{CALL}} in a FOR that builds table rows is the same located error", `${F}{{TABLE}}{{IF t}}{{FOR xs AS x}}§{{CALL f(x)}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}`, "syntax-error", "Unexpected token in TABLE: CALL"),
];

describe("mc-link: an unknown macro or a wrong argument count is a syntax-error at the CALL", () => {
  it.each(expand(UNKNOWN_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it.each(expand(COUNT_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it.each(expand(CALL_SYNTAX_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it.each(expand(CALL_SYNTAX_HIDDEN))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));

  it.each(RENDER)("mc-link: [%s] a link error comes before any output and any work", (entry) => {
    for (const [tpl, says] of [["text \${{a}} {{FOR xs AS i}}x{{END_FOR}}{{CALL nope()}}", "Unknown macro: nope"], [`${F}{{FOR xs AS i}}{{CALL f(i)}}{{END_FOR}}{{CALL f()}}`, "Macro 'f' takes 1 argument(s), got 0"]]) {
      const o = run(entry, tpl, DATA);
      check(o.message ?? "", `[${entry}] the link error says what is wrong`).toContain(says);
      check(o.code, `[${entry}] ${tpl}: syntax-error`).toBe("syntax-error");
      check(o.output, `[${entry}] a failed render has no output`).toBe("");
      check(o.iterations, `[${entry}] no loop item or call ran before the link error`).toBe(0);
    }
  });

  // validate and analyze: an unknown name is a diagnostic (a warning in validate), a wrong count is thrown like a parse error
  const unknownStatic = UNKNOWN_ROWS.slice(0, 14);
  it.each(unknownStatic.map((r) => ({ r, name: r.name })))("mc-link: [analyze] $name is an unknown-macro diagnostic at the CALL, not a throw", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const a = analyzed(r.tpl);
    check(a.diagnostics[0]?.code, "the first diagnostic is unknown-macro").toBe("unknown-macro");
    check({ line: a.diagnostics[0].line, column: a.diagnostics[0].column }, "located at the CALL").toEqual({ line: want.line, column: want.col });
    check(a.diagnostics[0].message, "the message names the macro").toContain("Unknown macro");
    for (const h of want.has ?? []) check(a.diagnostics[0].message, `the message holds ${h}`).toContain(h);
  });
  it.each(unknownStatic.map((r) => ({ r, name: r.name })))("mc-link: [validate] $name is an analysis-warning at the CALL and validate stays ok", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const v = validate(r.tpl);
    check(v.ok, "an unresolved macro is a warning, not an error").toBe(true);
    const w = v.diagnostics.find((d) => d.code === "analysis-warning" && d.message.includes("Unknown macro"));
    check(w, `an analysis-warning for the unknown macro in ${JSON.stringify(v.diagnostics)}`).toBeDefined();
    check(w?.severity, "severity warning").toBe("warning");
    check({ line: w?.line, column: w?.column }, "located at the CALL").toEqual({ line: want.line, column: want.col });
  });

  const countStatic = [...COUNT_ROWS.filter((_, i) => i !== 9 && i !== 10), ...TWICE_ROWS.slice(0, 3)];
  it.each(countStatic.map((r) => ({ r, name: r.name })))("mc-link: [analyze] $name is thrown like a parse error", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const o = runStatic("analyze", r.tpl);
    verifyOutcome(o, ERR("syntax-error", want.line, want.col, want.has), `mc-link [analyze] ${r.name}`);
    check(() => analyze(r.tpl), "analyze throws the error like a parse error").toThrow(TemplateError);
  });
  it.each(countStatic.map((r) => ({ r, name: r.name })))("mc-link: [validate] $name is an error diagnostic", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const v = validate(r.tpl);

    check(v.ok, "validate is not ok").toBe(false);
    const d = v.diagnostics.find((x) => x.severity === "error");
    check({ code: d?.code, line: d?.line, column: d?.column }, "an error diagnostic at the CALL or the second definition").toEqual({ code: "syntax-error", line: want.line, column: want.col });
    check((d?.message ?? "").includes(UNKNOWN_TAG), `the tags are known (got ${d?.message})`).toBe(false);
  });

  const both = [
    { name: "a wrong count first and an unknown macro after", m: marked("§{{CALL a(1)}}{{CALL nope()}}"), pre: def("a", "", "x") },
    { name: "an unknown macro first and a wrong count after", m: marked("{{CALL nope()}}\n§{{CALL a(1)}}"), pre: def("a", "", "x") },
  ];
  it.each(both)("mc-link: $name: analyze throws the wrong count and validate is not ok", ({ m, pre }) => {
    const tpl = pre + m.tpl;
    const want = { line: m.line, col: m.col + (m.line === 1 ? pre.length : 0) };
    const o = runStatic("analyze", tpl);
    verifyOutcome(o, ERR("syntax-error", want.line, want.col, "takes 0 argument(s), got 1"), "mc-link analyze");
    const v = validate(tpl);
    check(v.ok, "validate is not ok").toBe(false);
    check(v.diagnostics.find((d) => d.severity === "error")?.code, "the wrong count is the error").toBe("syntax-error");
  });

  it("mc-link: two unknown macros are two diagnostics in source order, the analysis still complete", () => {
    const tpl = "\${{a}}{{CALL one()}}\n{{CALL two(a)}}";
    const a = analyzed(tpl);
    check(a.diagnostics.map((d: any) => [d.code, d.line, d.column]), "the diagnostics").toEqual([["unknown-macro", 1, 7], ["unknown-macro", 2, 1]]);
    check(a.variables.map((v: any) => v.name), "the names read are still listed").toEqual(["a"]);
    const v = validate(tpl);
    check(v.ok, "only warnings").toBe(true);
    check(v.diagnostics.map((d) => d.code), "two warnings").toEqual(["analysis-warning", "analysis-warning"]);
  });

  it("mc-link: an unknown macro beside an unknown filter: validate is not ok because of the filter, and keeps the warning", () => {
    const v = validate("\${{s | nope}}{{CALL zz()}}");
    check(v.ok, "the filter is an error").toBe(false);
    check(v.diagnostics.map((d) => `${d.severity}:${d.code}`).sort(), "both diagnostics").toEqual(["error:unknown-filter", "warning:analysis-warning"]);
  });

  it("mc-link: a known call has no diagnostic in analyze and validate", () => {
    const tpl = `${F}{{CALL f(a)}}`;
    check(analyzed(tpl).diagnostics, "no diagnostics").toEqual([]);
    check(validate(tpl), "validate is ok").toEqual({ ok: true, diagnostics: [] });
  });
});

// =====================================================================================
// mc-scope: the body sees its parameters and the data, nothing of the caller
// =====================================================================================

// the link check walks every branch of a long ELSEIF chain without a stack overflow (the existing chain tests run 8000 branches)
const elseifChain = (n: number, last: string, text = true): string =>
  `{{IF v == "0"}}${text ? "b0" : ""}` + Array.from({ length: n - 1 }, (_, i) => `{{ELSEIF v == "${i + 1}"}}${text ? `b${i + 1}` : ""}`).join("") + `{{ELSE}}${last}{{END_IF}}`;
const CHAIN_DATA = { v: "1" };
const ELSEIF_ROWS: Row[] = [
  mrow("an unknown macro in the ELSE of a 19000-branch ELSEIF chain is found", elseifChain(19000, "§{{CALL nope()}}", false), "syntax-error", ["Unknown macro", "nope"], "same", { data: CHAIN_DATA }),
  mrow("a wrong count in the ELSE of a 19000-branch ELSEIF chain is found", `${def("a", "", "x")}${elseifChain(19000, "§{{CALL a(1)}}", false)}`, "syntax-error", "takes 0 argument(s), got 1", "same", { data: CHAIN_DATA }),
  mrow("an unknown macro in the middle branch of an 8000-branch ELSEIF chain is found", elseifChain(8000, "x").replace('{{ELSEIF v == "4000"}}b4000', '{{ELSEIF v == "4000"}}§{{CALL nope()}}'), "syntax-error", ["Unknown macro", "nope"], "same", { data: CHAIN_DATA }),
  row("a known macro in the ELSE of an 8000-branch ELSEIF chain links and the chain renders its true branch", `${def("a", "", "x")}${elseifChain(8000, "{{CALL a()}}")}`, OUT("b1"), { data: CHAIN_DATA }),
  row("a known macro called by the true branch of a long chain renders", `${def("a", "", "x")}${elseifChain(8000, "z").replace('{{ELSEIF v == "1"}}b1', '{{ELSEIF v == "1"}}{{CALL a()}}')}`, OUT("x"), { data: CHAIN_DATA }),
];
describe("mc-link: a long ELSEIF chain is walked without a stack overflow", () => {
  it.each(expand(ELSEIF_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it("mc-link: analyze and validate walk a 19000-branch chain: an unknown macro is one diagnostic at the CALL, a known one is clean", () => {
    const m = marked(elseifChain(19000, "§{{CALL nope()}}", false));
    check(analyzed(m.tpl).diagnostics.map((d: any) => [d.code, d.line, d.column]), "the unknown macro").toEqual([["unknown-macro", m.line, m.col]]);
    const v = validate(m.tpl);
    check(v.ok, "a warning, still ok").toBe(true);
    check(v.diagnostics.map((d) => [d.code, d.line, d.column]), "one warning").toEqual([["analysis-warning", m.line, m.col]]);
    const ok = `${def("a", "", "x")}${elseifChain(19000, "{{CALL a()}}", false)}`;
    check(analyzed(ok).diagnostics, "a known macro in the last branch").toEqual([]);
    check(validate(ok), "validate is ok").toEqual({ ok: true, diagnostics: [] });
  });
  it("mc-link: analyze throws a wrong count found in the last branch of a 19000-branch chain", () => {
    const m = marked(`${def("a", "", "x")}${elseifChain(19000, "§{{CALL a(1)}}", false)}`);
    verifyOutcome(runStatic("analyze", m.tpl), ERR("syntax-error", m.line, m.col, "takes 0 argument(s), got 1"), "mc-link analyze");
  });
});

const loop = (name: string) => `${def("f", "", `[§\${{${name}}}]`)}{{FOR one AS i}}{{CALL f()}}{{END_FOR}}`;
const SCOPE_ROWS: Row[] = [
  row("the body reads the data", `${def("f", "", "[\${{a}}]")}{{CALL f()}}`, OUT("[A]")),
  row("the body reads data inside nested blocks", `${def("f", "", "{{IF t}}{{FOR xs AS i limit=1}}[\${{a}}\${{i}}]{{END_FOR}}{{END_IF}}")}{{CALL f()}}`, OUT("[Ab]")),
  mrow("the body cannot read the caller's SET local", `${def("f", "", "[§\${{loc}}]")}{{SET loc = "L"}}{{CALL f()}}`, MV, "'loc'", "[]"),
  mrow("the body cannot read the caller's SET local set in a block", `${def("f", "", "[§\${{loc}}]")}{{IF t}}{{SET loc = "L"}}{{CALL f()}}{{END_IF}}`, MV, "'loc'", "[]"),
  mrow("the body cannot read the caller's FOR item", loop("i"), MV, "'i'", "[]"),
  ...["@index0", "@index1", "@total", "@first", "@last", "@notFirst", "@notLast"].map((m) => mrow(`the body cannot read the caller's ${m}`, loop(m), MV, `'${m}'`, "[]")),
  mrow("the body of a macro called from a macro cannot read the outer macro's parameter", `${def("g", "", "[§\${{p}}]")}${def("f", "p", "{{CALL g()}}")}{{CALL f("x")}}`, MV, "'p'", "[]"),
  mrow("the body cannot read the loop item of a loop inside another macro", `${def("g", "", "[§\${{j}}]")}${def("f", "", "{{FOR one AS j}}{{CALL g()}}{{END_FOR}}")}{{CALL f()}}`, MV, "'j'", "[]"),
  row("a data name with the name of the caller's SET local reads the data in the body", `${def("f", "", "[\${{x}}]")}{{SET x = "LOCAL"}}[\${{x}}]{{CALL f()}}`, OUT("[LOCAL][DX]")),
  row("a data name with the name of the caller's loop item reads the data in the body", `${def("f", "", "[\${{x}}]")}{{FOR one AS x}}\${{x}}{{CALL f()}}{{END_FOR}}`, OUT("z[DX]")),
  row("a parameter shadows the data", `${def("f", "a", "[\${{a}}]")}{{CALL f("P")}}[\${{a}}]`, OUT("[P][A]")),
  row("a parameter shadows the caller's loop item of the same name", `${def("f", "i", "[\${{i}}]")}{{FOR xs AS i limit=1}}\${{i}}{{CALL f("P")}}\${{i}}{{END_FOR}}`, OUT("b[P]b")),
  row("a parameter shadows a caller's SET local of the same name", `${def("f", "l", "[\${{l}}]")}{{SET l = "L"}}{{CALL f("P")}}[\${{l}}]`, OUT("[P][L]")),
  row("the caller's SET local is intact after the call", `${F}{{SET l = "L"}}{{CALL f("x")}}[\${{l}}]`, OUT("[x][L]")),
  row("the caller's loop item and metadata are intact after each call", `${F}{{FOR xs AS i}}{{CALL f(i)}}\${{@index0}}\${{i}}{{END_FOR}}`, OUT("[b]0b[a]1a[b]2b")),
  row("the caller's @total is intact after a call", `${F}{{FOR xs AS i}}{{CALL f("z")}}\${{@total}}{{END_FOR}}`, OUT("[z]3[z]3[z]3")),
  row("the caller's SET local is intact after a call that sets the same name", `${def("f", "", '{{SET l = "in"}}[\${{l}}]')}{{SET l = "out"}}{{CALL f()}}[\${{l}}]`, OUT("[in][out]")),
  row("a SET in the body is local to the call: the second call starts clean", `${def("f", "", '[\${{v ?? "none"}}]{{SET v = "in"}}[\${{v}}]')}{{CALL f()}}{{CALL f()}}`, OUT("[none][in][none][in]")),
  mrow("a SET in the body is gone after the call", `${def("f", "", '{{SET v = "in"}}[\${{v}}]')}{{CALL f()}}[§\${{v}}]`, MV, "'v'", "[in][]"),
  row("a SET in the body of a macro does not leak into the macro that called it", `${def("g", "", '{{SET v = "g"}}')}${def("f", "", '{{CALL g()}}[\${{v ?? "none"}}]')}{{CALL f()}}`, OUT("[none]")),
  row("a SET of another name than a parameter is fine", `${def("f", "p", "{{SET q = p}}[\${{q}}]")}{{CALL f("z")}}`, OUT("[z]")),
  row("a SET in the body reads the parameter and the data", `${def("f", "p", "{{SET q = p | upper}}{{SET r = a}}[\${{q}}\${{r}}]")}{{CALL f("z")}}`, OUT("[ZA]")),
  row("a FOR item named like a parameter is allowed and shadows inside the loop", `${def("f", "p", "{{FOR xs AS p}}\${{p}}{{END_FOR}}|\${{p}}")}{{CALL f("P")}}`, OUT("bab|P")),
  row("a SET at the top level of a name that another macro takes as a parameter is fine", `${F}{{SET p = "top"}}[\${{p}}]{{CALL f("x")}}`, OUT("[top][x]")),
  row("a SET in one macro of a name that another macro takes as a parameter is fine", `${F}${def("g", "", '{{SET p = "g"}}[\${{p}}]')}{{CALL g()}}{{CALL f("x")}}`, OUT("[g][x]")),
  row("each level of a recursion has its own parameter", `${def("c", "p", '[\${{p}}]{{IF p == "a"}}{{CALL c("b")}}{{END_IF}}{{IF p == "b"}}{{CALL c("x")}}{{END_IF}}[\${{p}}]')}{{CALL c("a")}}`, OUT("[a][b][x][x][b][a]")),
  row("a parameter named __proto__ or constructor reads back", `${def("f", "__proto__, constructor", "[\${{__proto__}}|\${{constructor}}]")}{{CALL f("p", "c")}}`, OUT("[p|c]")),
  row("a parameter named toString and hasOwnProperty reads back", `${def("f", "toString, hasOwnProperty", "[\${{toString}}|\${{hasOwnProperty}}]")}{{CALL f(1, 2)}}`, OUT("[1|2]")),
  row("a path through a parameter to constructor is empty", `${def("f", "q", "[\${{q.constructor}}][\${{q.__proto__}}][\${{q.toString}}]")}{{CALL f(o)}}`, OUT("[][][]")),
  row("a parameter holding an array reads length and index", `${def("f", "q", "\${{q.length}}\${{q.0}}")}{{CALL f(xs)}}`, OUT("3b")),
  mrow("a name that is neither a parameter nor data is missing in the body", `${def("f", "p", "[§\${{nowhere}}]")}{{CALL f(1)}}`, MV, "'nowhere'", "[]"),
  row("the data is read in place: a parameter named like a data key leaves the data key alone", `${def("f", "a", "\${{a}}")}{{CALL f("P")}}\${{a}}${def("g", "", "\${{a}}")}{{CALL g()}}`, OUT("PAA")),
];

const SET_PARAM_ROWS: Row[] = [
  always("a SET of a parameter name is a syntax-error at the SET", "{{DEFINE f(p)}}§{{SET p = 1}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of the second parameter name", "{{DEFINE f(a, p)}}x§{{SET p = 1}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside an IF in the body", "{{DEFINE f(p)}}{{IF t}}§{{SET p = 1}}{{END_IF}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a FOR in the body", "{{DEFINE f(p)}}{{FOR xs AS i}}§{{SET p = 1}}{{END_FOR}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside the ELSE body of a FOR in the body", "{{DEFINE f(p)}}{{FOR e AS i}}x{{ELSE}}§{{SET p = 1}}{{END_FOR}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a CASE clause in the body", "{{DEFINE f(p)}}{{CASE b}}{{WHEN 2}}§{{SET p = 1}}{{END_CASE}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a SECTION in the body", '{{DEFINE f(p)}}{{SECTION "T"}}§{{SET p = 1}}{{END_SECTION}}{{END_DEFINE}}', "syntax-error"),
  always("a SET of a parameter name inside a LIST_ITEM in the body", "{{DEFINE f(p)}}{{LIST}}{{LIST_ITEM}}§{{SET p = 1}}{{END_LIST_ITEM}}{{END_LIST}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a ROW in the body", "{{DEFINE f(p)}}{{TABLE}}{{ROW}}§{{SET p = 1}}a|b{{END_ROW}}{{END_TABLE}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside the macro that is never called", "{{DEFINE f(p)}}§{{SET p = 1}}{{END_DEFINE}}text", "syntax-error"),
  always("a SET of a prototype parameter name", "{{DEFINE f(constructor)}}§{{SET constructor = 1}}{{END_DEFINE}}", "syntax-error"),
  always("a SET naming a loop item inside a macro body is still an error", "{{DEFINE f()}}{{FOR xs AS i}}§{{SET i = 1}}{{END_FOR}}{{END_DEFINE}}", "syntax-error"),
];

describe("mc-scope: a body sees its parameters and the data, never the caller's names", () => {
  it.each(expand(SCOPE_ROWS))("mc-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-scope"));
  it.each(expand(SET_PARAM_ROWS))("mc-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-scope"));
  const statics = SET_PARAM_ROWS.flatMap((r) => (["validate", "analyze"] as const).map((kind) => ({ kind, r, name: r.name })));
  it.each(statics)("mc-scope: [$kind] $name", ({ kind, r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    verifyOutcome(runStatic(kind, r.tpl), ERR(want.err, want.line, want.col), `mc-scope [${kind}] ${r.name}`);
  });
  it.each(ENTRIES)("mc-scope: [%s] the error of a body read names the macro that was running, not the caller's scope", (entry) => {
    const m = marked(`${def("g", "", "[§\${{p}}]")}${def("f", "p", "¤{{CALL g()}}")}{{CALL f("x")}}`);
    const o = run(entry, m.tpl, DATA);
    if (entry.endsWith("lenient")) return check(o.output, "lenient: empty").toBe("[]");
    verifyOutcome(o, ERR(MV, m.line, m.col, annot("g", m.call)), `mc-scope [${entry}]`);
  });
});

// =====================================================================================
// mc-depth: one runtime counter for blocks and calls, bounded by maxDepth and by 256
// =====================================================================================

const IFS = (n: number) => rep("{{IF t}}", n);
const END_IFS = (n: number) => rep("{{END_IF}}", n);
const nestedIf = (n: number, mid = "x") => IFS(n) + mid + END_IFS(n);
/** m1..mN, each body holding `nest` IFs around a CALL of the next macro (the last one holds `leaf`), then a CALL of m1. */
function chain(count: number, nest: number, leaf = "end"): string {
  let t = "";
  for (let k = 1; k <= count; k++) {
    const inner = k < count ? `{{CALL m${k + 1}()}}` : leaf;
    t += def(`m${k}`, "", IFS(nest) + inner + END_IFS(nest));
  }
  return `${t}{{CALL m1()}}`;
}
const INFINITE = `${def("a", "", "{{CALL a()}}")}{{CALL a()}}`; // the CALL inside the body is at 1:15
const MUTUAL = `${def("a", "", "{{CALL b()}}")}${def("b", "", "{{CALL a()}}")}{{CALL a()}}`;

/** The CALL of MUTUAL that makes call number n (the top call is number 1): b's body holds the odd ones, a's body the even ones. */
function mutualCrossing(n: number): Pos {
  return n % 2 === 0 ? nth(MUTUAL, "{{CALL b()}}") : nth(MUTUAL, "{{CALL a()}}");
}

const INFINITE_ROWS: Row[] = [
  row("an infinite recursion at default limits ends at the 33rd call", INFINITE, ERR("limit-depth", 1, 15, "(in macro 'a'")),
  ...[1, 2, 3, 10, 100].map((d) => row(`an infinite recursion at maxDepth ${d}`, INFINITE, ERR("limit-depth", 1, 15, "(in macro 'a'"), { limits: { maxDepth: d } })),
  ...[256, 257, 1000, 10000, 1000000].map((d) => row(`an infinite recursion at maxDepth ${d} is bounded by the cap of 256`, INFINITE, ERR("limit-depth", 1, 15, "(in macro 'a'"), { limits: { maxDepth: d } })),
  ...[32, 3, 100, 1000].map((d) => {
    const at = mutualCrossing(Math.min(d, 256) + 1);
    return row(`a mutual recursion at maxDepth ${d} ends at the call that is number ${Math.min(d, 256) + 1}`, MUTUAL, ERR("limit-depth", at.line, at.col, "(in macro '"), { limits: { maxDepth: d } });
  }),
  row("a macro that calls itself twice ends in limit-depth, not in limit-iterations", `${def("a", "", "{{CALL a()}}{{CALL a()}}")}{{CALL a()}}`, ERR("limit-depth", 1, 15)),
  ((): Row => {
    const tpl = `${def("a", "", "x{{CALL a()}}")}{{CALL a()}}`;
    const at = nth(tpl, "{{CALL a()}}");
    return row("a macro that calls itself after text ends in limit-depth", tpl, ERR("limit-depth", at.line, at.col));
  })(),
  ((): Row => {
    const tpl = `${def("a", "p", "{{CALL a(p)}}")}{{CALL a(1)}}`;
    const at = nth(tpl, "{{CALL a(p)}}");
    return row("a macro that calls itself through a parameter ends in limit-depth", tpl, ERR("limit-depth", at.line, at.col));
  })(),
  row("a macro that calls itself only while a condition holds ends when it stops holding", `${def("a", "p", '{{IF p != "end"}}{{CALL a("end")}}{{END_IF}}x')}{{CALL a("go")}}`, OUT("xx")),
];

// recursion through every kind of nested body, at default limits and at a raised maxDepth
const WRAPPERS: Array<[string, string, string]> = [
  ["two IF blocks", "{{IF t}}{{IF t}}", "{{END_IF}}{{END_IF}}"],
  ["an ELSEIF body", "{{IF f}}n{{ELSEIF t}}", "{{END_IF}}"],
  ["an ELSE body", "{{IF f}}n{{ELSE}}", "{{END_IF}}"],
  ["a FOR over one item", "{{FOR one AS i}}", "{{END_FOR}}"],
  ["the ELSE body of a FOR", "{{FOR e AS i}}y{{ELSE}}", "{{END_FOR}}"],
  ["a SECTION", '{{SECTION "T"}}', "{{END_SECTION}}"],
  ["a FENCE", "{{FENCE}}", "{{END_FENCE}}"],
  ["a CASE clause", "{{CASE b}}{{WHEN 2}}", "{{END_CASE}}"],
  ["a CASE DEFAULT", "{{CASE b}}{{WHEN 1}}w{{DEFAULT}}", "{{END_CASE}}"],
  ["a LIST_ITEM", "{{LIST}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_LIST}}"],
  ["a FOR in a LIST that builds items", "{{LIST}}{{FOR one AS x}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}"],
  ["an IF in a LIST that builds items", "{{LIST}}{{IF t}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}"],
  ["a ROW", "{{TABLE}}{{ROW}}", "{{END_ROW}}{{END_TABLE}}"],
  ["a FOR and an IF in a TABLE that build rows", "{{TABLE}}{{FOR one AS x}}{{IF t}}{{ROW}}", "{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}"],
  ["a FOR written in a TABLE", "{{TABLE}}{{FOR one AS x}}", "|1\n{{END_FOR}}{{END_TABLE}}"],
];
const NEST_RECURSION: Array<{ label: string; tpl: string; limits?: Partial<Limits> }> = WRAPPERS.flatMap(([label, open, close]) =>
  [undefined, 1000, 100000].map((d) => ({
    label: `recursion through ${label} at ${d === undefined ? "default limits" : `maxDepth ${d}`}`,
    tpl: `${def("a", "", `${open}{{CALL a()}}${close}`)}{{CALL a()}}`,
    limits: d === undefined ? undefined : { maxDepth: d },
  })),
);

const COUNTING_ROWS: Row[] = [
  // two IFs around the CALL: the counter is 3n + 1 when call n is entered; the cap crosses at the first IF (col 15), or at the second at default limits
  row("recursion through two IFs at default limits crosses at the second IF of the 11th call", `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`, ERR("limit-depth", 1, 23)),
  row("recursion through two IFs at maxDepth 100 crosses at the first IF of the 34th call", `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`, ERR("limit-depth", 1, 15), { limits: { maxDepth: 100 } }),
  row("recursion through two IFs at maxDepth 1000 crosses at the first IF of the 86th call (the cap of 256)", `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`, ERR("limit-depth", 1, 15), { limits: { maxDepth: 1000 } }),
  // a chain of a few blocks around the CALL
  ...[
    { name: "a body with three nested IFs, called at the top, at maxDepth 5", d: 5, out: "x" },
    { name: "a body with three nested IFs, called at the top, at maxDepth 4", d: 4, out: "x" },
  ].map((c) => row(c.name, `${def("a", "", nestedIf(3))}{{CALL a()}}`, OUT(c.out), { limits: { maxDepth: c.d } })),
  row("a body with three nested IFs does not parse at maxDepth 3: the DEFINE is a block", `${def("a", "", nestedIf(3))}{{CALL a()}}`, ERR("limit-depth", 1, 31), { limits: { maxDepth: 3 } }),
  row("a call from two IFs to a body of three IFs is depth 6: renders at maxDepth 6", `${def("a", "", nestedIf(3))}{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}`, OUT("x"), { limits: { maxDepth: 6 } }),
  mrow("a call from two IFs to a body of three IFs: maxDepth 5 crosses at the third IF of the body", `{{DEFINE a()}}{{IF t}}{{IF t}}§{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}{{END_DEFINE}}{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}`, "limit-depth", undefined, "same", { limits: { maxDepth: 5 } }),
  row("maxDepth 0 does not parse a DEFINE", "{{DEFINE a()}}x{{END_DEFINE}}{{CALL a()}}", ERR("limit-depth", 1, 1), { limits: { maxDepth: 0 } }),
  row("maxDepth 1 runs a CALL to a body with no blocks", "{{DEFINE a()}}x{{END_DEFINE}}{{CALL a()}}", OUT("x"), { limits: { maxDepth: 1 } }),
  row("maxDepth 1 does not parse a body with an IF: located at the IF", "{{DEFINE a()}}{{IF t}}x{{END_IF}}{{END_DEFINE}}{{CALL a()}}", ERR("limit-depth", 1, 15), { limits: { maxDepth: 1 } }),
  ((): Row => {
    const tpl = "{{DEFINE a()}}x{{END_DEFINE}}{{IF t}}{{CALL a()}}{{END_IF}}";
    const at = nth(tpl, "{{CALL a()}}");
    return row("maxDepth 1 and a CALL inside an IF is depth 2: located at the CALL", tpl, ERR("limit-depth", at.line, at.col), { limits: { maxDepth: 1 } });
  })(),
  row("maxDepth 2 and a CALL inside an IF renders", "{{DEFINE a()}}x{{END_DEFINE}}{{IF t}}{{CALL a()}}{{END_IF}}", OUT("x"), { limits: { maxDepth: 2 } }),
  row("a macro called three levels deep: renders at maxDepth 3", `${def("a", "", "{{CALL b()}}")}${def("b", "", "{{CALL c()}}")}${def("c", "", "x")}{{CALL a()}}`, OUT("x"), { limits: { maxDepth: 3 } }),
  ((): Row => {
    const tpl = `${def("a", "", "{{CALL b()}}")}${def("b", "", "{{CALL c()}}")}${def("c", "", "x")}{{CALL a()}}`;
    const at = nth(tpl, "{{CALL c()}}");
    return row("a macro called three levels deep: maxDepth 2 crosses at the CALL in the second body, named with that macro", tpl, ERR("limit-depth", at.line, at.col, "(in macro 'b'"), { limits: { maxDepth: 2 } });
  })(),
  row("sequential calls do not add up: 40 calls at maxDepth 1", `${def("a", "", "x")}${calls("a", 40)}`, OUT(rep("x", 40)), { limits: { maxDepth: 1 } }),
  row("sequential blocks and calls do not add up at default limits", `${def("a", "", "{{IF t}}x{{END_IF}}")}${rep("{{IF t}}{{CALL a()}}{{END_IF}}", 40)}`, OUT(rep("x", 40))),
  row("calls in a FOR of 50 items at maxDepth 2: the counter falls after each item", `${def("a", "", "x")}{{FOR many AS i}}{{CALL a()}}{{END_FOR}}`, OUT(rep("x", 50)), { limits: { maxDepth: 2 } }),
  row("the counter falls after each call: three calls in one body that each hold an IF at maxDepth 3", `${def("a", "", "{{IF t}}x{{END_IF}}")}${def("b", "", "{{CALL a()}}{{CALL a()}}{{CALL a()}}")}{{CALL b()}}`, OUT("xxx"), { limits: { maxDepth: 3 } }),
];

// a path through the blocks that a LIST or a TABLE runs without visit(): the counter must rise there too (a CALL is one deeper than the parse depth)
const DA = def("a", "", "x");
const CALL_A = "{{CALL a()}}";
const PATH_ROWS: Array<{ name: string; tpl: string; ok: number; out: string }> = [
  { name: "a CALL in an IF in a FOR in an IF in a LIST item", tpl: `${DA}{{LIST}}{{IF t}}{{FOR one AS i}}{{IF t}}{{LIST_ITEM}}${CALL_A}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_LIST}}`, ok: 5, out: "1. x" },
  { name: "a CALL in a ROW in an IF in a FOR in an IF in a TABLE", tpl: `${DA}{{TABLE}}{{IF t}}{{FOR one AS i}}{{IF t}}{{ROW}}${CALL_A}|b{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}`, ok: 5, out: "| x | b |" },
  { name: "a CALL in the body of a FOR written in a TABLE", tpl: `${DA}{{TABLE}}{{FOR one AS i}}${CALL_A}|b\n{{END_FOR}}{{END_TABLE}}`, ok: 3, out: "| x | b |" },
  { name: "a CALL in an IF in a LIST item", tpl: `${DA}{{LIST}}{{LIST_ITEM}}{{IF t}}${CALL_A}{{END_IF}}{{END_LIST_ITEM}}{{END_LIST}}`, ok: 3, out: "1. x" },
  { name: "a CALL in a LIST item of a FOR in a LIST", tpl: `${DA}{{LIST}}{{FOR one AS i}}{{LIST_ITEM}}${CALL_A}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}`, ok: 3, out: "1. x" },
  { name: "a CALL in a ROW of an IF in a TABLE", tpl: `${DA}{{TABLE}}{{IF t}}{{ROW}}${CALL_A}|b{{END_ROW}}{{END_IF}}{{END_TABLE}}`, ok: 3, out: "| x | b |" },
  { name: "a CALL in a header cell of a TABLE", tpl: `${DA}{{TABLE}}{{HEADER}}${CALL_A}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}`, ok: 2, out: "| x | h |\n|:-----|:-----|\n| 1 | 2 |" },
];
const BLOCK_ROWS: Array<[string, string, string, string]> = [
  ["an IF", "{{IF t}}", "{{END_IF}}", "x"],
  ["an ELSEIF", "{{IF f}}n{{ELSEIF t}}", "{{END_IF}}", "x"],
  ["an ELSE", "{{IF f}}n{{ELSE}}", "{{END_IF}}", "x"],
  ["a CASE clause", "{{CASE b}}{{WHEN 2}}", "{{END_CASE}}", "x"],
  ["a CASE DEFAULT", "{{CASE b}}{{WHEN 1}}w{{DEFAULT}}", "{{END_CASE}}", "x"],
  ["a FOR", "{{FOR one AS i}}", "{{END_FOR}}", "x"],
  ["the ELSE body of a FOR", "{{FOR e AS i}}y{{ELSE}}", "{{END_FOR}}", "x"],
  ["a SECTION", '{{SECTION "T"}}', "{{END_SECTION}}", "## T\n\nx\n"],
  ["a FENCE", "{{FENCE}}", "{{END_FENCE}}", "```\nx\n```\n"],
  ["a LIST_ITEM", "{{LIST}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_LIST}}", "1. x"],
  ["a ROW", "{{TABLE}}{{ROW}}", "{{END_ROW}}{{END_TABLE}}", "| x |"],
];
const PATH_DEPTH_ROWS: Row[] = [
  ...PATH_ROWS.flatMap((p) => {
    const at = nth(p.tpl, CALL_A);
    return [
      row(`${p.name}: renders at maxDepth ${p.ok}`, p.tpl, OUT(p.out), { limits: { maxDepth: p.ok } }),
      row(`${p.name}: maxDepth ${p.ok - 1} crosses at the CALL`, p.tpl, ERR("limit-depth", at.line, at.col), { limits: { maxDepth: p.ok - 1 } }),
    ];
  }),
  ...BLOCK_ROWS.flatMap(([label, open, close, out]) => {
    const tpl = `${DA}${open}${CALL_A}${close}`;
    const at = nth(tpl, CALL_A);
    return [
      row(`a CALL in ${label}: renders at maxDepth 2`, tpl, OUT(out), { limits: { maxDepth: 2 } }),
      row(`a CALL in ${label}: maxDepth 1 crosses at the CALL`, tpl, ERR("limit-depth", at.line, at.col), { limits: { maxDepth: 1 } }),
    ];
  }),
];

const CHAIN32 = chain(32, 31);
const CHAIN20 = chain(20, 5);
const defAt = (tpl: string, name: string, extra: number): Pos => {
  const tag = `{{DEFINE ${name}()}}`;
  const p = nth(tpl, tag);
  return { line: p.line, col: p.col + tag.length + extra };
};
const CHAIN_ROWS: Row[] = [
  row("32 chained calls with a body of 31 nested IFs end in limit-depth at default limits, at the CALL of the second macro", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m2()}}").line, nth(CHAIN32, "{{CALL m2()}}").col, "(in macro 'm1'")),
  row("the same 32 chained calls at maxDepth 32 are the same", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m2()}}").line, nth(CHAIN32, "{{CALL m2()}}").col), { limits: { maxDepth: 32 } }),
  row("the same chain at maxDepth 10000 is cut by the cap of 256 at the CALL of the ninth macro", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m9()}}").line, nth(CHAIN32, "{{CALL m9()}}").col), { limits: { maxDepth: 10000 } }),
  row("the same chain at maxDepth 1000 is cut by the cap too", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m9()}}").line, nth(CHAIN32, "{{CALL m9()}}").col), { limits: { maxDepth: 1000 } }),
  row("20 chained calls with 5 nested IFs (depth 120) render at maxDepth 10000", CHAIN20, OUT("end"), { limits: { maxDepth: 10000 } }),
  row("the same chain renders at maxDepth 256", CHAIN20, OUT("end"), { limits: { maxDepth: 256 } }),
  row("the same chain renders at maxDepth 120, exactly at the limit", CHAIN20, OUT("end"), { limits: { maxDepth: 120 } }),
  ((): Row => {
    const at = defAt(CHAIN20, "m20", 4 * "{{IF t}}".length);
    return row("the same chain at maxDepth 119 crosses at the fifth IF of the last body", CHAIN20, ERR("limit-depth", at.line, at.col, "(in macro 'm20'"), { limits: { maxDepth: 119 } });
  })(),
  ((): Row => {
    const at = defAt(CHAIN20, "m6", 1 * "{{IF t}}".length);
    return row("the same chain at default limits crosses at the second IF of the sixth body", CHAIN20, ERR("limit-depth", at.line, at.col, "(in macro 'm6'"));
  })(),
  row("5 chained calls with 5 nested IFs (depth 30) render at default limits", chain(5, 5), OUT("end")),
];

const NO_CALL_ROWS: Row[] = [
  row("300 nested IFs at maxDepth 1000 end in limit-depth at the 257th block (the cap)", nestedIf(300), ERR("limit-depth", 1, 8 * 256 + 1), { limits: { maxDepth: 1000 } }),
  row("257 nested IFs at maxDepth 1000 end in limit-depth at the 257th block", nestedIf(257), ERR("limit-depth", 1, 8 * 256 + 1), { limits: { maxDepth: 1000 } }),
  row("256 nested IFs at maxDepth 1000 render", nestedIf(256), OUT("x"), { limits: { maxDepth: 1000 } }),
  row("200 nested IFs at maxDepth 1000 render", nestedIf(200), OUT("x"), { limits: { maxDepth: 1000 } }),
  row("1000 nested IFs at maxDepth 100000 end in limit-depth at the 257th block", nestedIf(1000), ERR("limit-depth", 1, 8 * 256 + 1), { limits: { maxDepth: 100000 } }),
  row("300 nested FORs over one item at maxDepth 1000 end in limit-depth", rep("{{FOR one AS i}}", 300) + "x" + rep("{{END_FOR}}", 300), ERR("limit-depth", 1, 16 * 256 + 1), { limits: { maxDepth: 1000 } }),
  row("256 nested FORs over one item at maxDepth 1000 render", rep("{{FOR one AS i}}", 256) + "x" + rep("{{END_FOR}}", 256), OUT("x"), { limits: { maxDepth: 1000 } }),
];

describe("mc-depth: one runtime counter, bounded by maxDepth and by 256", () => {
  it.each(expand(INFINITE_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(NEST_RECURSION.flatMap((c) => ENTRIES.map((entry) => ({ entry, ...c }))))("mc-depth: [$entry] $label ends in a located limit-depth of the running macro", ({ entry, tpl, limits }) => {
    const o = run(entry, tpl, DATA, limits);
    check(o.code, `[${entry}] limit-depth, never a RangeError or a type-error (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    check(o.line === 1 && (o.column ?? 0) > 1, `[${entry}] located in the body, not at 1:1 (got ${o.line}:${o.column})`).toBe(true);
    check(o.message ?? "", `[${entry}] the message names the macro`).toContain("(in macro 'a'");
  });
  it.each(expand(COUNTING_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(expand(PATH_DEPTH_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(expand(CHAIN_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(expand(NO_CALL_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));

  it.each(ENTRIES)("mc-depth: [%s] a depth error is a TemplateError with a code, never a RangeError or a type-error", (entry) => {
    for (const tpl of [INFINITE, MUTUAL, CHAIN32, `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`]) {
      for (const limits of [undefined, { maxDepth: 1000 }, { maxDepth: 100000 }]) {
        const o = run(entry, tpl, DATA, limits);
        check(o.code, `[${entry}] ${JSON.stringify(limits)}: limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
      }
    }
  });

  // validate and analyze never follow a CALL: a recursion and a long chain are plain and prompt
  it.each([
    { name: "an infinite recursion", tpl: INFINITE, macros: ["a"] },
    { name: "a mutual recursion", tpl: MUTUAL, macros: ["a", "b"] },
    { name: "32 chained macros of 31 nested IFs", tpl: CHAIN32, macros: Array.from({ length: 32 }, (_, i) => `m${i + 1}`) },
  ])("mc-depth: validate and analyze of $name return a clean result", ({ tpl, macros }) => {
    const started = Date.now();
    const v = validate(tpl);
    check(v, "validate finds nothing wrong").toEqual({ ok: true, diagnostics: [] });
    const a = analyzed(tpl);
    check(a.diagnostics, "analyze finds nothing wrong").toEqual([]);
    check(a.macros.map((m: any) => m.name), "analyze lists the macros it saw").toEqual(macros);
    check(Date.now() - started < 2000, "both return promptly").toBe(true);
  });

  // a stray RangeError becomes a limit-depth diagnostic in render, validate and analyze
  const DEEP = [5000].map((n) => ({ n, tpl: nestedIf(n) }));
  const RAISED = { maxDepth: 100000 };
  it.each(DEEP)("mc-depth: render of $n nested IFs at maxDepth 100000 is a limit-depth diagnostic, not a RangeError", ({ tpl }) => {
    const o = run("render-strict", tpl, DATA, RAISED);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    const r = render(tpl, DATA, { limits: RAISED });
    check(r.ok, "render did not succeed").toBe(false);
    check(r.output, "no output").toBe("");
    check(r.diagnostics[0].severity, "an error diagnostic").toBe("error");
    check(r.diagnostics[0].line >= 1 && r.diagnostics[0].column >= 1, "a position").toBe(true);
  });
  it.each(DEEP)("mc-depth: validate of $n nested IFs at maxDepth 100000 is an error diagnostic limit-depth", ({ tpl }) => {
    const o = runStatic("validate", tpl, RAISED);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    const v = validate(tpl, { limits: RAISED });
    check(v.ok, "validate is not ok").toBe(false);
    check(v.diagnostics.map((d) => `${d.severity}:${d.code}`), "one error diagnostic").toEqual(["error:limit-depth"]);
  });
  it.each(DEEP)("mc-depth: analyze of $n nested IFs at maxDepth 100000 throws a TemplateError limit-depth", ({ tpl }) => {
    const o = runStatic("analyze", tpl, RAISED);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    check(() => analyze(tpl, { limits: RAISED }), "analyze throws a TemplateError").toThrow(TemplateError);
  });
  // a stack overflow inside the interpreter or the analyzer (a condition nested far deeper than any block) passes through locateError unchanged
  // the rows below build 25000-deep nested conditions: they assume the default stack size of the node process; raise the depth if a machine overflows later
  const PARENS = [
    { name: "an IF condition with 25000 nested parentheses", cond: rep("(", 25000) + "a" + rep(")", 25000) },
  ];
  it.each(PARENS)("mc-depth: render of $name is a limit-depth diagnostic, not a type-error", ({ cond }) => {
    for (const tpl of [`{{IF ${cond}}}x{{END_IF}}`, `${def("f", "", `{{IF ${cond}}}x{{END_IF}}`)}{{CALL f()}}`]) {
      for (const strictMode of [true]) {
        const r = render(tpl, DATA, { strictMode });
        check(r.ok, "render fails").toBe(false);
        check(r.diagnostics[0].code, `a stack overflow is a limit-depth, not a type-error (got ${r.diagnostics[0].code}: ${r.diagnostics[0].message})`).toBe("limit-depth");
        check(r.output, "no output").toBe("");
      }
    }
  });
  it.each(PARENS)("mc-depth: validate of $name is an error diagnostic limit-depth", ({ cond }) => {
    const o = runStatic("validate", `{{IF ${cond}}}x{{END_IF}}`);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    const v = validate(`{{IF ${cond}}}x{{END_IF}}`);
    check(v.ok, "validate is not ok").toBe(false);
    check(v.diagnostics.map((d) => `${d.severity}:${d.code}`), "one error diagnostic").toEqual(["error:limit-depth"]);
  });
  it.each(PARENS)("mc-depth: analyze of $name throws a TemplateError limit-depth, not a RangeError", ({ cond }) => {
    const o = runStatic("analyze", `{{IF ${cond}}}x{{END_IF}}`);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
  });
  it("mc-depth: a plain Error from a filter is still a type-error but a RangeError is not retyped", () => {
    const r = render("a\n  \${{s | head=x}}", DATA);
    check(r.diagnostics[0]?.code, "a bad filter parameter is a type-error").toBe("type-error");
    const deep = run("render-strict", nestedIf(5000), DATA, RAISED);
    check(deep.code, `a stack overflow is a limit-depth (got ${deep.code})`).toBe("limit-depth");
  });
});

// =====================================================================================
// mc-iterations: every CALL counts one with the FOR items
// =====================================================================================

/** leaf l0 prints x; level k calls level k-1 twice; the top calls level `levels`. 2^(levels+1) - 1 calls in all. */
function fan(levels: number): string {
  let t = def("l0", "", "x");
  for (let k = 1; k <= levels; k++) t += def(`l${k}`, "", `{{CALL l${k - 1}()}}{{CALL l${k - 1}()}}`);
  return `${t}{{CALL l${levels}()}}`;
}
const callsIn = (levels: number) => 2 ** (levels + 1) - 1;
const startsWithCall = (tpl: string, o: Outcome) => tpl.split("\n")[(o.line ?? 1) - 1]?.slice((o.column ?? 1) - 1).startsWith("{{CALL") ?? false;
const ITER_ENTRIES: Entry[] = ["render-strict", "resolve-lenient"];
const iters = (n: number) => (o: Outcome, entry: Entry): void => {
  if (entry.startsWith("render")) check(o.iterations, `[${entry}] stats.iterations counts the FOR items and the CALLs`).toBe(n);
};

const ITER_ROWS: Row[] = [
  row("a fan-out of 12 levels (8191 calls) renders at default limits", fan(12), OUT(rep("x", 4096)), { entries: ITER_ENTRIES, also: iters(callsIn(12)) }),
  row("a fan-out of 10 levels is exactly 2047 calls: renders with maxIterations 2047", fan(10), OUT(rep("x", 1024)), { limits: { maxIterations: 2047 }, also: iters(2047) }),
  row("a fan-out of 14 levels with maxIterations 100000 renders 32767 calls", fan(14), OUT(rep("x", 16384)), { limits: { maxIterations: 100000 }, entries: ITER_ENTRIES, also: iters(callsIn(14)) }),
  row("a fan-out of 15 levels with maxIterations 100000 renders 65535 calls", fan(15), OUT(rep("x", 32768)), { limits: { maxIterations: 100000 }, entries: ITER_ENTRIES, also: iters(callsIn(15)) }),
  row("each CALL counts one: exactly maxIterations calls render", `${def("a", "", "x")}${calls("a", 5)}`, OUT("xxxxx"), { limits: { maxIterations: 5 }, also: iters(5) }),
  row("ten calls at the top level count ten", `${def("a", "", "x")}${calls("a", 10)}`, OUT(rep("x", 10)), { also: iters(10) }),
  row("a CALL with an empty body still counts one", `${def("a", "", "")}{{CALL a()}}`, OUT(""), { also: iters(1) }),
  row("a macro called from a macro counts both calls", `${def("b", "", "x")}${def("a", "", "{{CALL b()}}{{CALL b()}}")}{{CALL a()}}`, OUT("xx"), { also: iters(3) }),
  row("a DEFINE counts nothing", `${def("a", "", "x")}text`, OUT("text"), { also: iters(0) }),
  row("a CALL in a branch that does not run counts nothing", `${def("a", "", "x")}{{IF f}}{{CALL a()}}{{END_IF}}`, OUT(""), { also: iters(0) }),
  row("FOR items and CALLs add up: 3 items each calling once is 6", `${def("a", "", "x")}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`, OUT("xxx"), { limits: { maxIterations: 6 }, also: iters(6) }),
  row("a CALL in the ELSE body of a FOR counts one and the empty loop none", `${def("a", "", "x")}{{FOR e AS i}}y{{ELSE}}{{CALL a()}}{{END_FOR}}`, OUT("x"), { also: iters(1) }),
  row("a FOR of 5 items in a macro called 3 times is 3 + 15 = 18", `${def("a", "", "{{FOR five AS i}}\${{i}}{{END_FOR}}")}{{CALL a()}}{{CALL a()}}{{CALL a()}}`, OUT("123451234512345"), { limits: { maxIterations: 18 }, also: iters(18) }),
  row("a nested macro in a FOR of a macro adds all of them", `${def("c", "", "x")}${def("b", "", "{{FOR xs AS i}}{{CALL c()}}{{END_FOR}}")}{{CALL b()}}`, OUT("xxx"), { also: iters(7) }),
  row("maxIterations 0 renders a template with no CALL and no FOR", "text \${{a}}", OUT("text A"), { limits: { maxIterations: 0 }, also: iters(0) }),
];
describe("mc-iterations: every CALL counts one toward maxIterations", () => {
  it.each(expand(ITER_ROWS))("mc-iterations: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-iterations"));

  const fails: Array<{ name: string; levels: number; limits?: Partial<Limits> }> = [
    { name: "14 levels at default limits (32767 calls)", levels: 14 },
    { name: "13 levels at default limits (16383 calls)", levels: 13 },
    { name: "10 levels with maxIterations 2046", levels: 10, limits: { maxIterations: 2046 } },
    { name: "16 levels with maxIterations 100000 (131071 calls)", levels: 16, limits: { maxIterations: 100000 } },
    { name: "14 levels with maxIterations 16000", levels: 14, limits: { maxIterations: 16000 } },
  ];
  it.each(fails.flatMap((f) => ENTRIES.map((entry) => ({ entry, ...f }))))("mc-iterations: [$entry] a fan-out of $name ends in limit-iterations at a CALL, quickly", ({ entry, levels, limits }) => {
    const tpl = fan(levels);
    const started = Date.now();
    const o = run(entry, tpl, DATA, limits);
    check(o.code, `[${entry}] limit-iterations (got ${o.code} ${o.message ?? ""})`).toBe("limit-iterations");
    check(startsWithCall(tpl, o), `[${entry}] located at a CALL tag (${o.line}:${o.column})`).toBe(true);
    check(Date.now() - started < 3000, `[${entry}] the failure is fast`).toBe(true);
    if (entry.startsWith("render")) check(o.iterations, `[${entry}] a failed render still reports its iterations`).toBeGreaterThanOrEqual(limits?.maxIterations ?? 10000);
  });

  const exact = `${def("a", "", "x")}${calls("a", 5)}`;
  const forCall = `${def("a", "", "x")}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`;
  const inMacro = `${def("a", "", "{{FOR five AS i}}\${{i}}{{END_FOR}}")}{{CALL a()}}{{CALL a()}}{{CALL a()}}`;
  const failRows: Row[] = [
    row("one call more than maxIterations is located at the last CALL", exact, ERR("limit-iterations", nth(exact, "{{CALL a()}}", 5).line, nth(exact, "{{CALL a()}}", 5).col), { limits: { maxIterations: 4 }, also: (o, e) => e.startsWith("render") && check(o.iterations, "iterations reported").toBeGreaterThanOrEqual(4) }),
    row("maxIterations 0 fails at the first CALL", exact, ERR("limit-iterations", nth(exact, "{{CALL a()}}", 1).line, nth(exact, "{{CALL a()}}", 1).col), { limits: { maxIterations: 0 } }),
    row("3 items each calling once with maxIterations 5 fails at the CALL of the last item", forCall, ERR("limit-iterations", nth(forCall, "{{CALL a()}}").line, nth(forCall, "{{CALL a()}}").col), { limits: { maxIterations: 5 } }),
    row("3 items each calling once with maxIterations 4 fails at the FOR for the last item", forCall, ERR("limit-iterations", nth(forCall, "{{FOR xs").line, nth(forCall, "{{FOR xs").col), { limits: { maxIterations: 4 } }),
    row("a FOR of 5 items in a macro called 3 times with maxIterations 17 fails at the FOR in the body, named with the macro", inMacro, ERR("limit-iterations", nth(inMacro, "{{FOR five").line, nth(inMacro, "{{FOR five").col, "(in macro 'a'"), { limits: { maxIterations: 17 } }),
    mrow("maxIterations 1 fails at the second CALL", `${def("a", "", "x")}{{CALL a()}}§{{CALL a()}}`, "limit-iterations", undefined, "same", { limits: { maxIterations: 1 } }),
  ];
  it.each(expand(failRows))("mc-iterations: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-iterations"));
  it("mc-iterations: the macro that held the crossing CALL is named in the message", () => {
    const m = marked(`${def("b", "", "x")}${def("a", "", "§{{CALL b()}}")}¤{{CALL a()}}`);
    for (const entry of ENTRIES) {
      verifyOutcome(run(entry, m.tpl, DATA, { maxIterations: 1 }), ERR("limit-iterations", m.line, m.col, annot("a", m.call)), `mc-iterations [${entry}]`);
    }
  });
});

// =====================================================================================
// mc-output: maxOutputChars is enforced across and inside macro bodies
// =====================================================================================

const LIMIT = 1000;
const X100 = rep("x", 100);
const ADEF = def("a", "", X100);
const OUT_LIMITS = { maxOutputChars: LIMIT };
/** Where a template puts its 100 calls: [label, a function from the calls to the whole template] */
const OUT_WRAPS: Array<[string, (c: string) => string]> = [
  ["the top level", (c) => c],
  ["an IF body", (c) => `{{IF t}}${c}{{END_IF}}`],
  ["an ELSEIF body", (c) => `{{IF f}}n{{ELSEIF t}}${c}{{END_IF}}`],
  ["an ELSE body", (c) => `{{IF f}}n{{ELSE}}${c}{{END_IF}}`],
  ["two nested IFs", (c) => `{{IF t}}{{IF t}}${c}{{END_IF}}{{END_IF}}`],
  ["a CASE clause", (c) => `{{CASE b}}{{WHEN 2}}${c}{{END_CASE}}`],
  ["a CASE DEFAULT", (c) => `{{CASE b}}{{WHEN 1}}w{{DEFAULT}}${c}{{END_CASE}}`],
  ["a SECTION body", (c) => `{{SECTION "T"}}${c}{{END_SECTION}}`],
  ["a FENCE body", (c) => `{{FENCE}}${c}{{END_FENCE}}`],
  ["a LIST_ITEM", (c) => `{{LIST}}{{LIST_ITEM}}${c}{{END_LIST_ITEM}}{{END_LIST}}`],
  ["another macro", (c) => `${def("b", "", c)}{{CALL b()}}`],
  ["an IF in another macro", (c) => `${def("b", "", `{{IF t}}${c}{{END_IF}}`)}{{CALL b()}}`],
  ["a CASE in another macro", (c) => `${def("b", "", `{{CASE b}}{{WHEN 2}}${c}{{END_CASE}}`)}{{CALL b()}}`],
  ["a macro that calls a macro that holds an IF", (c) => `${def("c", "", `{{IF t}}${c}{{END_IF}}`)}${def("b", "", "{{CALL c()}}")}{{CALL b()}}`],
];
const stopsNearTheLimit = (bodySize: number, count = 100) => (o: Outcome, entry: Entry): void => {
  if (!entry.startsWith("render")) return;
  const bound = Math.min(count, (2 * LIMIT) / bodySize + 2);
  check(o.iterations, `[${entry}] the failed render did not run all ${count} calls: stats.iterations ${o.iterations} <= ${bound}`).toBeLessThanOrEqual(bound);
  check(o.iterations, `[${entry}] some calls ran`).toBeGreaterThanOrEqual(1);
};
/** The text of the macro a (defined first): the child inside the body that tips the held total at the eleventh call. */
const BODY_TEXT: Pos = { line: 1, col: 15 };
const OUT_ROWS: Row[] = OUT_WRAPS.map(([label, wrap]) => {
  const tpl = ADEF + wrap(calls("a", 100));
  const at = nth(tpl, "{{CALL a()}}", 11);
  return row(`100 calls of a 100-character macro from ${label} end in limit-output at the 11th call`, tpl, ERR_ANY("limit-output", [at, BODY_TEXT]), { limits: OUT_LIMITS, also: stopsNearTheLimit(100) });
});
const BODY_ROWS: Row[] = [
  ...[1000, 1001].map((n): Row => {
    const m = marked(`{{DEFINE a()}}§${rep("x", n)}{{END_DEFINE}}¤{{CALL a()}}`);
    return n > LIMIT
      ? { name: `a macro body of ${n} characters is over the limit of ${LIMIT}: limit-output at its text, named with the macro`, tpl: m.tpl, data: DATA, limits: OUT_LIMITS, want: ERR("limit-output", m.line, m.col, annot("a", m.call)) }
      : row(`a macro body of ${n} characters called once fits a limit of ${LIMIT} exactly`, m.tpl, OUT(rep("x", n)), { limits: OUT_LIMITS });
  }),
  row("10 calls of 100 characters fit a limit of 1000 exactly", ADEF + calls("a", 10), OUT(rep("x", 1000)), { limits: OUT_LIMITS }),
  row("10 calls in an IF body fit a limit of 1000 exactly", `${ADEF}{{IF t}}${calls("a", 10)}{{END_IF}}`, OUT(rep("x", 1000)), { limits: OUT_LIMITS }),
  row("10 calls from another macro fit a limit of 1000 exactly", `${ADEF}${def("b", "", calls("a", 10))}{{CALL b()}}`, OUT(rep("x", 1000)), { limits: OUT_LIMITS }),
  ((): Row => {
    const tpl = ADEF + calls("a", 11);
    const at = nth(tpl, "{{CALL a()}}", 11);
    return row("an eleventh call crosses the limit at the eleventh CALL or at the text of its body", tpl, ERR_ANY("limit-output", [at, BODY_TEXT]), { limits: OUT_LIMITS });
  })(),
  ((): Row => {
    const m = marked(`${def("a", "", "§" + rep("x", 600))}{{DEFINE b()}}${rep("y", 600)}¤{{CALL a()}}{{END_DEFINE}}{{CALL b()}}`);
    return { name: "a body of 0.6 of the limit that calls a body of 0.6 of the limit: limit-output at the text of the inner one", tpl: m.tpl, data: DATA, limits: OUT_LIMITS, want: ERR("limit-output", m.line, m.col, annot("a", m.call), undefined, true) };
  })(),
  ((): Row => {
    const m = marked(`{{DEFINE a()}}§${rep("x", 600)}{{END_DEFINE}}${rep("y", 500)}¤{{CALL a()}}`);
    return { name: "text held by the caller counts: 500 characters at the top and a body of 600 end in limit-output at the text of the body", tpl: m.tpl, data: DATA, limits: OUT_LIMITS, want: ERR("limit-output", m.line, m.col, annot("a", m.call)) };
  })(),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 100))}${def("b", "", calls("a", 50))}{{CALL b()}}`;
    const at = nth(tpl, "{{CALL a()}}", 11);
    return row("a fan-out: a macro calling a 100-character macro 50 times stops at the 11th call", tpl, ERR_ANY("limit-output", [at, BODY_TEXT]), { limits: OUT_LIMITS, also: stopsNearTheLimit(100, 51) });
  })(),
  row("a body of 1/10 of the limit called 9 times fits", `${def("a", "", rep("x", 100))}${calls("a", 9)}`, OUT(rep("x", 900)), { limits: OUT_LIMITS }),
  row("a macro called in a FOR over two items: 2 x 400 characters fit", `${def("a", "", rep("x", 400))}{{FOR ys AS i}}{{CALL a()}}{{END_FOR}}`, OUT(rep("x", 800)), { limits: OUT_LIMITS }),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 400))}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`;
    const at = nth(tpl, "{{FOR xs");
    return row("a loop alone over the limit keeps its place at the FOR: 3 x 400 characters", tpl, ERR("limit-output", at.line, at.col), { limits: OUT_LIMITS });
  })(),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 400))}{{FOR xs AS i}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_FOR}}`;
    const at = nth(tpl, "{{FOR xs");
    return row("a loop whose body holds an IF and a CALL keeps its place at the FOR", tpl, ERR("limit-output", at.line, at.col), { limits: OUT_LIMITS });
  })(),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 400))}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`;
    return row("a loop of calls that fits the limit exactly renders", tpl, OUT(rep("x", 1200)), { limits: { maxOutputChars: 1200 } });
  })(),
];

describe("mc-output: maxOutputChars is enforced across and inside macro bodies", () => {
  it.each(expand(OUT_ROWS))("mc-output: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-output"));
  it.each(expand(BODY_ROWS))("mc-output: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-output"));

  it.each(ENTRIES)("mc-output: [%s] 100 calls in a FOR over one item end in limit-output", (entry) => {
    const tpl = `${ADEF}{{FOR one AS i}}${calls("a", 100)}{{END_FOR}}`;
    const o = run(entry, tpl, DATA, OUT_LIMITS);
    check(o.code, `[${entry}] limit-output (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
  });
  it.each(ENTRIES)("mc-output: [%s] a variable text longer than the limit in a body is a limit-output at that variable", (entry) => {
    const m = marked(`{{DEFINE a(p)}}[§\${{p | upper}}]{{END_DEFINE}}\n¤{{CALL a(long)}}`);
    verifyOutcome(run(entry, m.tpl, DATA, { maxOutputChars: 20 }), ERR("limit-output", m.line, m.col, annot("a", m.call)), `mc-output [${entry}]`);
  });
  it.each(ENTRIES)("mc-output: [%s] the limit is checked while the body is built: 5000 calls in an IF body of a 1000-character limit stop at once", (entry) => {
    const tpl = `${ADEF}{{IF t}}${calls("a", 5000)}{{END_IF}}`;
    const started = Date.now();
    const o = run(entry, tpl, DATA, { ...OUT_LIMITS, maxNodes: 100000 });
    check(o.code, `[${entry}] limit-output`).toBe("limit-output");
    check(Date.now() - started < 2000, `[${entry}] stopped quickly`).toBe(true);
    if (entry.startsWith("render")) check(o.iterations, `[${entry}] about 11 calls ran, not 5000`).toBeLessThanOrEqual(22);
  });
});

// =====================================================================================
// mc-locate: an error in a body is located at the failing body node and names the macro
// =====================================================================================

const FB = (body: string) => `{{DEFINE f(p)}}${body}{{END_DEFINE}}`;
const LOCATE_ROWS: Row[] = [
  inBody("a missing variable in the body", `${FB("[§\${{missing}}]")}\nx ¤{{CALL f("a")}}`, MV, "f", "\nx []", {}, ["'missing'"]),
  inBody("a missing variable after other text on later lines", `{{DEFINE f(p)}}line\n  one [§\${{missing}}]{{END_DEFINE}}\n\n  ¤{{CALL f("a")}}`, MV, "f", "\n\n  line\n  one []"),
  inBody("a cyclic value through upper is a type-error at the variable", `${FB("[§\${{p | upper}}]")}\n  ¤{{CALL f(cyc)}}`, "type-error", "f", "same"),
  inBody("a cyclic value printed is a type-error at the variable", `${FB("[§\${{p}}]")}\n  ¤{{CALL f(cyc)}}`, "type-error", "f", "same"),
  inBody("a BigInt printed is a type-error at the variable", `${FB("[§\${{p}}]")}\n  ¤{{CALL f(big)}}`, "type-error", "f", "same"),
  inBody("an unknown filter is an unknown-filter at the variable", `${FB("[§\${{p | nope}}]")}\n  ¤{{CALL f("s")}}`, "unknown-filter", "f", "same", {}, ["nope"]),
  inBody("a bad filter parameter is a type-error at the variable", `${FB("[§\${{p | head=x}}]")}\n  ¤{{CALL f("s")}}`, "type-error", "f", "same"),
  inBody("a division by zero in render is a type-error at the variable", `${FB("[§\${{n / 0}}]")}\n  ¤{{CALL f(1)}}`, "type-error", "f", "same", { entries: RENDER }, ["divide"]),
  row("a division by zero in resolve is Infinity as at the top level", `${FB("[\${{n / 0}}]")}\n{{CALL f(1)}}`, OUT("\n[Infinity]"), { entries: RESOLVE }),
  inBody("a missing argument of a CALL in a body is located at that inner CALL", `{{DEFINE h(q)}}{{END_DEFINE}}{{DEFINE g()}}x\n  §{{CALL h(missing)}}{{END_DEFINE}}\n¤{{CALL g()}}`, MV, "g", "\nx\n  ", {}, ["'missing'"]),
  inBody("an error in a block of the body", `${FB("{{IF t}}[§\${{missing}}]{{END_IF}}")}\n¤{{CALL f(1)}}`, MV, "f", "\n[]"),
  inBody("an error in a FOR of the body", `${FB("{{FOR xs AS i}}[§\${{missing}}]{{END_FOR}}")}\n¤{{CALL f(1)}}`, MV, "f", "\n[][][]"),
  inBody("an error in a SECTION of the body", `${FB('{{SECTION "T"}}[§\${{missing}}]{{END_SECTION}}')}\n¤{{CALL f(1)}}`, MV, "f", "\n## T\n\n[]\n"),
  inBody("an error in a SET of the body is located at the SET", `${FB("§{{SET v = missing}}z")}\n¤{{CALL f(1)}}`, MV, "f", "\nz"),
  inBody("an error in the condition of an IF in the body is located at the IF", `${FB("\n  §{{IF missing > 1}}x{{END_IF}}")}\n¤{{CALL f(1)}}`, "type-error", "f", "same"),
  inBody("a FOR over null in the body is a strict type-error at the FOR", `${FB("[§{{FOR p AS i}}\${{i}}{{END_FOR}}]")}\n¤{{CALL f(null)}}`, "type-error", "f", "\n[]"),
  inBody("an error in a macro called in a LIST_ITEM", `${FB("[§\${{missing}}]")}\n{{LIST}}{{LIST_ITEM}}¤{{CALL f(1)}}{{END_LIST_ITEM}}{{END_LIST}}`, MV, "f", "\n1. []"),
  inBody("an error in a macro called in a ROW cell", `${FB("[§\${{missing}}]")}\n{{TABLE}}{{ROW}}¤{{CALL f(1)}}|b{{END_ROW}}{{END_TABLE}}`, MV, "f", "\n| [] | b |"),
  inBody("an error in a macro called in the body of a FOR written in a TABLE", `${FB("[§\${{missing}}]")}\n{{TABLE}}{{FOR one AS x}}¤{{CALL f(1)}}|b\n{{END_FOR}}{{END_TABLE}}`, MV, "f", "\n| [] | b |"),
  inBody("a depth error at a CALL inside a body is located at that CALL and named with the macro", "{{DEFINE a()}}\n  §¤{{CALL a()}}\n{{END_DEFINE}}\n{{CALL a()}}", "limit-depth", "a", "same"),
  inBody("an iteration error at a CALL inside a body", `{{DEFINE b()}}{{END_DEFINE}}{{DEFINE a()}}\n  §{{CALL b()}}\n{{END_DEFINE}}\n¤{{CALL a()}}`, "limit-iterations", "a", "same", { limits: { maxIterations: 1 } }),
  inBody("a limit-output error at a node of the body", `{{DEFINE a()}}§${rep("x", 30)}{{END_DEFINE}}¤{{CALL a()}}`, "limit-output", "a", "same", { limits: { maxOutputChars: 20 } }),
  ((): Row => {
    // nested calls name the innermost macro only, once
    const m = marked(`{{DEFINE g()}}[§\${{missing}}]{{END_DEFINE}}{{DEFINE f()}}\n  ¤{{CALL g()}}{{END_DEFINE}}\n{{CALL f()}}`);
    return { name: "nested calls name the innermost macro only, once", tpl: m.tpl, data: DATA, want: SL(ERR(MV, m.line, m.col, annot("g", m.call), "macro 'f'", true), OUT("\n\n  []")) };
  })(),
  ((): Row => {
    const m = marked(`{{DEFINE c()}}[§\${{missing}}]{{END_DEFINE}}{{DEFINE b()}}{{CALL c()}}{{END_DEFINE}}{{DEFINE a()}}\n  {{CALL b()}}{{END_DEFINE}}\n{{CALL a()}}`);
    const callC = nth(m.tpl, "{{CALL c()}}");
    return { name: "three levels deep: the innermost macro and the CALL that entered it", tpl: m.tpl, data: DATA, want: SL(ERR(MV, m.line, m.col, annot("c", { line: callC.line, col: callC.col }), ["macro 'b'", "macro 'a'"], true), OUT("\n\n  []")) };
  })(),
  ((): Row => {
    const m = marked(`${FB("x")}{{CALL f(1)}}\n§\${{missing}}`);
    return { name: "an error after a call, at the top level, has no macro text", tpl: m.tpl, data: DATA, want: SL(ERR(MV, m.line, m.col, "'missing'", INSIDE), OUT("x\n")) };
  })(),
  ((): Row => {
    const m = marked(`${FB("x")}\n  §{{CALL f(missing)}}`);
    return { name: "an error in the argument of a top-level CALL is at the CALL and has no macro text", tpl: m.tpl, data: DATA, want: SL(ERR(MV, m.line, m.col, "'missing'", INSIDE), OUT("\n  x")) };
  })(),
  ((): Row => {
    const m = marked(`${FB("x")}${F.replace("f", "g")}{{DEFINE h()}}\n  §{{CALL g(missing)}}{{END_DEFINE}}\n¤{{CALL h()}}`);
    return { name: "an error in the argument of a CALL inside a body is at that CALL and named with the body's macro", tpl: m.tpl, data: DATA, want: SL(ERR(MV, m.line, m.col, annot("h", m.call), undefined, true), OUT("\n\n  []")) };
  })(),
];
const REPEATED_CALL_ROW: Row = (() => {
  const m = marked(`${FB("[§\${{missing}}]")}{{FOR xs AS i}}\n  ¤{{CALL f(i)}}{{END_FOR}}`);
  return { name: "a macro called in a FOR: the CALL is the same every item and the body node is the same", tpl: m.tpl, data: DATA, want: SL(ERR(MV, m.line, m.col, annot("f", m.call)), OUT("\n  []\n  []\n  []")) };
})();

describe("mc-locate: an error in a body is located at the failing body node", () => {
  it.each(expand([...LOCATE_ROWS, REPEATED_CALL_ROW]))("mc-locate: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-locate"));
  it("mc-locate: the diagnostic message of a body error holds the macro and the CALL position", () => {
    const m = marked(`${FB("[§\${{missing}}]")}\n  ¤{{CALL f(1)}}`);
    const r = render(m.tpl, DATA, { strictMode: true });
    check(r.ok, "strict render fails").toBe(false);
    check(r.diagnostics[0].message, "the message names the macro and the call").toContain(annot("f", m.call));
    check({ line: r.diagnostics[0].line, column: r.diagnostics[0].column }, "the diagnostic is at the failing node").toEqual({ line: m.line, column: m.col });
  });
  it("mc-locate: the thrown error of resolveTemplate carries the macro text in its message and the failing node in line and column", () => {
    const m = marked(`${FB("[§\${{missing}}]")}\n  ¤{{CALL f(1)}}`);
    let err: any;
    try {
      resolveTemplate(m.tpl, new Map(Object.entries(DATA)), { strictMode: true });
    } catch (e) {
      err = e;
    }
    check(err instanceof TemplateError, "a TemplateError is thrown").toBe(true);
    check({ line: err.line, column: err.column }, "located at the failing node").toEqual({ line: m.line, column: m.col });
    check(err.message, "the message names the macro").toContain(annot("f", m.call));
    check(err.message.includes(`line ${m.line}, col ${m.col}`), "and the message starts at the failing node").toBe(true);
  });
});

// =====================================================================================
// mc-names: macro names are table keys, never object members
// =====================================================================================

const NAMES = ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf", "length"];
const NAME_DATA: Record<string, any> = JSON.parse('{"__proto__":"PV","constructor":"CV","toString":"TV","hasOwnProperty":"HV","valueOf":"OV","length":"LV"}');
const NAME_ROWS: Row[] = NAMES.flatMap((n, i) => {
  const others = NAMES.filter((x) => x !== n)
    .map((x) => def(x, "", `<${x}>`))
    .join("");
  const unknownOnly = marked(`${def("other", "", "x")}§{{CALL ${n}()}}`);
  const unknownAmongNames = marked(`${others}§{{CALL ${n}()}}`);
  const unknownAlone = marked(`§{{CALL ${n}()}}`);
  const data = NAME_DATA;
  return [
    row(`a macro named ${n} defines and calls`, `${def(n, "", `<${n}>`)}{{CALL ${n}()}}`, OUT(`<${n}>`)),
    row(`a macro named ${n} called before its DEFINE`, `{{CALL ${n}()}}${def(n, "", `<${n}>`)}`, OUT(`<${n}>`)),
    row(`a macro named ${n} with a parameter of the same name`, `${def(n, n, `<\${{${n}}}>`)}{{CALL ${n}("v")}}`, OUT("<v>")),
    row(`a macro named ${n} calling a macro named ${NAMES[(i + 1) % NAMES.length]}`, `${def(n, "", `{{CALL ${NAMES[(i + 1) % NAMES.length]}()}}`)}${def(NAMES[(i + 1) % NAMES.length], "", "ok")}{{CALL ${n}()}}`, OUT("ok")),
    row(`two macros are told apart: ${n} and the next one`, `${def(n, "", "A")}${def(NAMES[(i + 1) % NAMES.length], "", "B")}{{CALL ${n}()}}{{CALL ${NAMES[(i + 1) % NAMES.length]}()}}`, OUT("AB")),
    row(`the data key ${n} is read as an argument in the body of a macro named ${n}`, `${def(n, "p", "[\${{p}}]")}{{CALL ${n}(${n})}}`, OUT(`[${NAME_DATA[n]}]`), { data }),
    row(`the data key ${n} is read in the body`, `${def("f", "", `[\${{${n}}}]`)}{{CALL f()}}`, OUT(`[${NAME_DATA[n]}]`), { data }),
    row(`a path argument named ${n} with no such data: strict missing-variable at the CALL, lenient null`, `${F}{{CALL f(${n})}}`, SL(ERR(MV, 1, F.length + 1, `'${n}'`), OUT("[]"))),
    { name: `an unknown call to ${n} when only other names are defined is Unknown macro`, tpl: unknownOnly.tpl, data: DATA, want: ERR("syntax-error", unknownOnly.line, unknownOnly.col, ["Unknown macro", n]) },
    { name: `an unknown call to ${n} when the other prototype names are defined is Unknown macro`, tpl: unknownAmongNames.tpl, data: DATA, want: ERR("syntax-error", unknownAmongNames.line, unknownAmongNames.col, ["Unknown macro", n]) },
    { name: `an unknown call to ${n} when nothing is defined is Unknown macro`, tpl: unknownAlone.tpl, data: DATA, want: ERR("syntax-error", unknownAlone.line, unknownAlone.col, ["Unknown macro", n]) },
  ];
});

describe("mc-names: names such as __proto__ and constructor define and call like any name", () => {
  it.each(expand(NAME_ROWS))("mc-names: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-names"));
  it.each(NAMES)("mc-names: %s in analyze and validate: an unknown call is a diagnostic, a definition is listed", (n) => {
    const un = analyzed(`{{CALL ${n}()}}`);
    check(un.diagnostics.map((d: any) => d.code), "an unknown-macro diagnostic").toEqual(["unknown-macro"]);
    check(un.diagnostics[0].message, "the message names the macro").toContain(n);
    const v = validate(`{{CALL ${n}()}}`);
    check(v.ok && v.diagnostics.map((d) => d.code).join(), "a warning, still ok").toBe("analysis-warning");
    const known = analyzed(`${def(n, "p", "\${{p}}")}{{CALL ${n}(a)}}`);
    check(known.diagnostics, "a defined macro has no diagnostic").toEqual([]);
    check(known.macros.map((m: any) => [m.name, m.params]), "the macro is listed").toEqual([[n, ["p"]]]);
    check(known.blocks.DEFINE, "one DEFINE").toBe(1);
  });
  it.each(NAMES)("mc-names: %s defined twice is a duplicate at the second", (n) => {
    const m = marked(`${def(n, "", "x")}\n§${def(n, "", "y")}`);
    for (const entry of ENTRIES) verifyOutcome(run(entry, m.tpl, DATA), ERR("syntax-error", m.line, m.col, [`'${n}'`, "line 1"]), `mc-names [${entry}] ${n}`);
  });
  it.each(ENTRIES)("mc-names: [%s] a macro named constructor leaves {{constructor}} an unknown tag", (entry) => {
    const o = run(entry, `${def("constructor", "", "x")}a\n{{constructor}}`, DATA);
    check({ code: o.code, line: o.line, column: o.column }, "the tag stays unknown").toEqual({ code: "syntax-error", line: 2, column: 1 });
    check(o.message ?? "", "unknown template tag").toContain(UNKNOWN_TAG);
  });
});

// =====================================================================================
// mc-ws: DEFINE and END_DEFINE are standalone tags, CALL is not, trim markers work on all three
// =====================================================================================

/** The same template with standaloneLines on and off. */
function wsRows(name: string, tpl: string, on: string, off: string = on, extra: Partial<Row> = {}): Row[] {
  return [
    row(`${name} (standaloneLines on)`, tpl, OUT(on), { ...extra, opts: { standaloneLines: true } }),
    row(`${name} (standaloneLines off)`, tpl, OUT(off), { ...extra, opts: { standaloneLines: false } }),
  ];
}
const WS_ROWS: Row[] = [
  ...wsRows("the DEFINE and END_DEFINE lines vanish with their line breaks and a CALL on its own line keeps its break", "A\n{{DEFINE f()}}\nbody\n{{END_DEFINE}}\n{{CALL f()}}\nB", "A\nbody\n\nB", "A\n\n\nbody\n\nB"),
  ...wsRows("the same with CRLF line breaks", "A\r\n{{DEFINE f()}}\r\nbody\r\n{{END_DEFINE}}\r\n{{CALL f()}}\r\nB", "A\nbody\n\nB", "A\n\n\nbody\n\nB"),
  ...wsRows("an indented DEFINE and END_DEFINE lose their indentation too", "  {{DEFINE f()}}\n  body\n  {{END_DEFINE}}\n{{CALL f()}}", "  body\n", "  \n\n  body\n  "),
  ...wsRows("two DEFINE lines in a row", "{{DEFINE a()}}\nA\n{{END_DEFINE}}\n{{DEFINE b()}}\nB\n{{END_DEFINE}}\n{{CALL a()}}{{CALL b()}}", "A\nB\n", "\n\n\nA\n\nB\n"),
  ...wsRows("a DEFINE with text on its line keeps that text", "A{{DEFINE f()}} t{{END_DEFINE}}B{{CALL f()}}", "AB t"),
  ...wsRows("a DEFINE after text on its line is not standalone but its END_DEFINE line is", "x {{DEFINE f()}}\nbody\n{{END_DEFINE}}\ny", "x y", "x \ny"),
  ...wsRows("a CALL on its own line keeps its indentation and its break", "{{DEFINE f()}}b{{END_DEFINE}}\n  {{CALL f()}}\nz", "\n  b\nz"),
  ...wsRows("a CALL on its own line inside a FOR keeps its break for each item", "{{DEFINE f(p)}}[\${{p}}]{{END_DEFINE}}\n{{FOR xs AS i}}\n{{CALL f(i)}}\n{{END_FOR}}", "\n[b]\n[a]\n[b]\n", "\n\n[b]\n\n[a]\n\n[b]\n"),
  ...wsRows("trim markers on DEFINE and END_DEFINE", "A \n{{- DEFINE f() -}}\n  body  \n{{- END_DEFINE -}}\n B{{CALL f()}}", "ABbody"),
  ...wsRows("a trim marker at the start of the template", "{{- DEFINE f() -}}b{{END_DEFINE}}{{CALL f()}}", "b"),
  ...wsRows("a trim marker before END_DEFINE trims the end of the body", "{{DEFINE f()}}b  {{- END_DEFINE}}[{{CALL f()}}]", "[b]"),
  ...wsRows("a trim marker after DEFINE trims the start of the body", "{{DEFINE f() -}}\n  b{{END_DEFINE}}[{{CALL f()}}]", "[b]"),
  ...wsRows("trim markers on both sides of a CALL", "{{DEFINE f()}}b{{END_DEFINE}}X  \n{{- CALL f() -}}  \n Y", "XbY"),
  ...wsRows("a trim marker after a CALL", "{{DEFINE f()}}b{{END_DEFINE}}X {{CALL f() -}}  \n  Y", "X bY"),
  ...wsRows("a trim marker before a CALL", "{{DEFINE f()}}b{{END_DEFINE}}X  \n  {{- CALL f()}} Y", "Xb Y"),
  ...wsRows("a SECTION whose body is a CALL that renders empty is omitted with skip_empty", `${def("e", "", "")}{{SECTION "T" skip_empty=true}}{{CALL e()}}{{END_SECTION}}x`, "x", "x", {
    also: (o, entry) => entry.startsWith("render") && check(o.omitted, "one section omitted").toBe(1),
  }),
  ...wsRows("a SECTION whose body is a CALL that renders only blanks is omitted too", `${def("e", "", "  ")}{{SECTION "T" skip_empty=true}}{{CALL e()}}{{END_SECTION}}x`, "x"),
  ...wsRows("a SECTION whose body is a CALL that renders text keeps its heading", `${def("n", "", "t")}{{SECTION "T" skip_empty=true}}{{CALL n()}}{{END_SECTION}}x`, "## T\n\nt\nx"),
  ...wsRows("a SECTION with skip_empty=false and an empty CALL keeps its heading", `${def("e", "", "")}{{SECTION "T" skip_empty=false}}{{CALL e()}}{{END_SECTION}}x`, "## T\nx"),
  ...wsRows("a CALL in a LIST_ITEM: the numbering is unaffected and a multi-line body is trimmed as the item content", `${def("f", "", "  line1\nline2  ")}{{LIST}}{{LIST_ITEM}}{{CALL f()}}{{END_LIST_ITEM}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{END_LIST}}`, "1. line1\nline2\n2. two"),
  ...wsRows("a CALL in a ROW cell: newlines become spaces and a pipe is escaped", `${def("f", "", "a\nb|c")}{{TABLE}}{{ROW}}{{CALL f()}}|z{{END_ROW}}{{END_TABLE}}`, "| a b\\|c | z |"),
  ...wsRows("a CALL in the body of a FOR written in a TABLE is part of the row text", `${def("f", "p", "\${{p}}")}{{TABLE}}{{FOR xs AS x}}{{CALL f(x)}}|1\n{{END_FOR}}{{END_TABLE}}`, "| b | 1 |\n| a | 1 |\n| b | 1 |"),
  ...wsRows("a macro body with a leading and a trailing newline is output as it is, never trimmed", "{{DEFINE f()}}\n\nb\n\n{{END_DEFINE}}[{{CALL f()}}]", "[\nb\n\n]", "[\n\nb\n\n]"),
  ...wsRows("a DEFINE between two texts leaves the texts side by side", "a\n{{DEFINE f()}}b{{END_DEFINE}}\nc", "a\n\nc"),
  ...wsRows("a CALL result keeps the blank lines of the text around it", "a\n\n{{CALL f()}}\n\nb{{DEFINE f()}}-{{END_DEFINE}}", "a\n\n-\n\nb"),
];

describe("mc-ws: DEFINE and END_DEFINE are standalone tags, CALL is not", () => {
  it.each(expand(WS_ROWS))("mc-ws: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-ws"));
});

// =====================================================================================
// limits: maxNodes counts DEFINE, CALL and body nodes
// =====================================================================================

const T3 = "{{DEFINE a()}}x{{END_DEFINE}}{{CALL a()}}"; // three nodes: the DEFINE, its text, the CALL
const NODE_ROWS: Row[] = [
  row("a DEFINE, its text and a CALL are three nodes: they fit in 3", T3, OUT("x"), { limits: { maxNodes: 3 } }),
  row("maxNodes 2 crosses at the CALL", T3, ERR("limit-nodes", nth(T3, "{{CALL").line, nth(T3, "{{CALL").col), { limits: { maxNodes: 2 } }),
  row("maxNodes 1 crosses at the text of the body", T3, ERR("limit-nodes", 1, 15), { limits: { maxNodes: 1 } }),
  row("maxNodes 0 crosses at the DEFINE", T3, ERR("limit-nodes", 1, 1), { limits: { maxNodes: 0 } }),
  row("an empty DEFINE and 9 CALLs are 10 nodes: they fit in 10", `${def("a", "", "")}${calls("a", 9)}`, OUT(""), { limits: { maxNodes: 10 } }),
  row("an empty DEFINE and 9 CALLs cross 9 at the ninth CALL", `${def("a", "", "")}${calls("a", 9)}`, ERR("limit-nodes", nth(`${def("a", "", "")}${calls("a", 9)}`, "{{CALL a()}}", 9).line, nth(`${def("a", "", "")}${calls("a", 9)}`, "{{CALL a()}}", 9).col), { limits: { maxNodes: 9 } }),
  row("a DEFINE with three variables and a CALL are five nodes", "{{DEFINE a()}}\${{a}}\${{a}}\${{a}}{{END_DEFINE}}{{CALL a()}}", OUT("AAA"), { limits: { maxNodes: 5 } }),
  row("the same crosses 4 at the CALL", "{{DEFINE a()}}\${{a}}\${{a}}\${{a}}{{END_DEFINE}}{{CALL a()}}", ERR("limit-nodes", 1, 14 + 3 * 6 + 14 + 1), { limits: { maxNodes: 4 } }),
  row("a CALL in an IF is a node of the IF body", `${def("a", "", "x")}{{IF t}}{{CALL a()}}{{END_IF}}`, OUT("x"), { limits: { maxNodes: 4 } }),
];
describe("mc-define: maxNodes counts DEFINE and CALL", () => {
  it.each(expand(NODE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(["validate", "analyze"] as const)("mc-define: [%s] maxNodes 2 crosses at the CALL like a parse error", (kind) => {
    const at = nth(T3, "{{CALL");
    verifyOutcome(runStatic(kind, T3, { maxNodes: 2 }), ERR("limit-nodes", at.line, at.col), `mc-define [${kind}]`);
    check(runStatic(kind, T3, { maxNodes: 3 }).code, `[${kind}] 3 nodes fit`).toBe("ok");
  });
});

// =====================================================================================
// mc-analyze: analyze and validate walk each DEFINE body once and never follow a CALL
// =====================================================================================

type Macros = Array<{ name: string; params: string[] }>;
interface AnalyzeRow {
  name: string;
  tpl: string;
  vars: Record<string, { usedIn: string[]; paths?: string[]; optional?: boolean }>;
  blocks: Record<string, number>;
  filters?: string[];
  diag?: string[];
  /** the macros listed, or null when the key must be absent */
  macros: Macros | null;
}
const M = (name: string, ...params: string[]) => ({ name, params });
const ANALYZE_ROWS: AnalyzeRow[] = [
  { name: "a body read is an output input, a parameter is not, a path argument is a call input", tpl: "{{DEFINE f(p)}}\${{p}}\${{x}}{{END_DEFINE}}{{CALL f(a)}}", vars: { x: { usedIn: ["output"], paths: ["x"], optional: false }, a: { usedIn: ["call"], paths: ["a"], optional: false } }, blocks: { DEFINE: 1 }, macros: [M("f", "p")] },
  { name: "literal arguments read nothing", tpl: '{{DEFINE f(p)}}\${{p}}{{END_DEFINE}}{{CALL f("lit")}}{{CALL f(5)}}{{CALL f(true)}}{{CALL f(null)}}{{CALL f(-3)}}{{CALL f(1.50)}}', vars: {}, blocks: { DEFINE: 1 }, macros: [M("f", "p")] },
  { name: "dotted path arguments are listed by path", tpl: "{{DEFINE f(p)}}{{END_DEFINE}}{{CALL f(o.k)}}{{CALL f(o.n.d)}}{{CALL f(o.k)}}", vars: { o: { usedIn: ["call"], paths: ["o.k", "o.n.d"], optional: false } }, blocks: { DEFINE: 1 }, macros: [M("f", "p")] },
  { name: "a top-level SET before a DEFINE is not visible in its body: the name read there is an input", tpl: "{{SET x = a}}{{DEFINE f()}}\${{x}}{{END_DEFINE}}\${{x}}", vars: { a: { usedIn: ["set"] }, x: { usedIn: ["output"], paths: ["x"] } }, blocks: { DEFINE: 1 }, macros: [M("f")] },
  { name: "after the DEFINE the scope is as before: a SET name read at the top level is no input", tpl: "{{SET x = 1}}{{DEFINE f()}}{{END_DEFINE}}\${{x}}", vars: {}, blocks: { DEFINE: 1 }, macros: [M("f")] },
  { name: "a FOR item, a SET local and a field of the item as arguments are no inputs", tpl: "{{DEFINE f(p)}}{{END_DEFINE}}{{SET l = a}}{{FOR xs AS i}}{{CALL f(i)}}{{CALL f(l)}}{{CALL f(i.k)}}{{END_FOR}}", vars: { a: { usedIn: ["set"] }, xs: { usedIn: ["for"] } }, blocks: { DEFINE: 1, FOR: 1 }, macros: [M("f", "p")] },
  { name: "@index0 and @total as arguments are no inputs", tpl: "{{DEFINE f(p)}}{{END_DEFINE}}{{FOR xs AS i}}{{CALL f(@index0)}}{{CALL f(@total)}}{{END_FOR}}", vars: { xs: { usedIn: ["for"] } }, blocks: { DEFINE: 1, FOR: 1 }, macros: [M("f", "p")] },
  { name: "kinds of the names read in a body", tpl: "{{DEFINE f(p)}}{{IF c}}\${{o}}{{END_IF}}{{FOR l AS i}}\${{i}}{{END_FOR}}{{END_DEFINE}}", vars: { c: { usedIn: ["if"] }, o: { usedIn: ["output"] }, l: { usedIn: ["for"] } }, blocks: { DEFINE: 1, IF: 1, FOR: 1 }, macros: [M("f", "p")] },
  { name: "a parameter shadows a data name inside the body: only the top-level read counts", tpl: "{{DEFINE f(a)}}{{IF a}}y{{END_IF}}{{END_DEFINE}}\${{a}}", vars: { a: { usedIn: ["output"] } }, blocks: { DEFINE: 1, IF: 1 }, macros: [M("f", "a")] },
  { name: "a parameter read in a nested block of the body is no input", tpl: "{{DEFINE f(p)}}{{IF t2}}\${{p}}{{END_IF}}{{END_DEFINE}}", vars: { t2: { usedIn: ["if"] } }, blocks: { DEFINE: 1, IF: 1 }, macros: [M("f", "p")] },
  { name: "a CALL argument is required even when another read has a default", tpl: '\${{a ?? "d"}}{{DEFINE f(p)}}{{END_DEFINE}}{{CALL f(a)}}', vars: { a: { usedIn: ["output", "call"], optional: false } }, blocks: { DEFINE: 1 }, macros: [M("f", "p")] },
  { name: "a read with a default in a body stays optional", tpl: '{{DEFINE f()}}\${{a ?? "d"}}{{END_DEFINE}}', vars: { a: { usedIn: ["output"], optional: true } }, blocks: { DEFINE: 1 }, macros: [M("f")] },
  { name: "blocks counts every DEFINE and the blocks in bodies, never a CALL", tpl: "{{DEFINE f()}}{{IF t}}x{{END_IF}}{{END_DEFINE}}{{DEFINE g()}}y{{END_DEFINE}}{{CALL f()}}{{CALL g()}}{{CALL g()}}", vars: { t: { usedIn: ["if"] } }, blocks: { DEFINE: 2, IF: 1 }, macros: [M("f"), M("g")] },
  { name: "a template with only CALLs of defined macros counts one DEFINE", tpl: "{{DEFINE f()}}{{END_DEFINE}}{{CALL f()}}{{CALL f()}}{{CALL f()}}", vars: {}, blocks: { DEFINE: 1 }, macros: [M("f")] },
  { name: "the macros are listed in source order with their parameters in order", tpl: "{{DEFINE z(b, a)}}\${{a}}\${{b}}{{END_DEFINE}}{{DEFINE y()}}{{END_DEFINE}}{{DEFINE x(q)}}{{END_DEFINE}}", vars: {}, blocks: { DEFINE: 3 }, macros: [M("z", "b", "a"), M("y"), M("x", "q")] },
  { name: "a SET in a body is local to the body: the same name read at the top level is an input", tpl: "{{DEFINE f()}}{{SET v = a}}\${{v}}{{END_DEFINE}}\${{v}}", vars: { a: { usedIn: ["set"] }, v: { usedIn: ["output"] } }, blocks: { DEFINE: 1 }, macros: [M("f")] },
  { name: "a CALL in a body reads its argument in the scope of the body", tpl: "{{DEFINE g(q)}}{{END_DEFINE}}{{DEFINE f(p)}}{{CALL g(p)}}{{CALL g(other)}}{{END_DEFINE}}", vars: { other: { usedIn: ["call"] } }, blocks: { DEFINE: 2 }, macros: [M("g", "q"), M("f", "p")] },
  { name: "an unknown macro is an unknown-macro diagnostic and its arguments are still read; no DEFINE, no macros key", tpl: "{{CALL nope(a)}}", vars: { a: { usedIn: ["call"] } }, blocks: {}, diag: ["unknown-macro"], macros: null },
  { name: "a LIST in a body counts its block and reads its names", tpl: "{{DEFINE f(p)}}{{LIST}}{{LIST_ITEM}}\${{p}}\${{z}}{{END_LIST_ITEM}}{{END_LIST}}{{END_DEFINE}}", vars: { z: { usedIn: ["output"] } }, blocks: { DEFINE: 1, LIST: 1 }, macros: [M("f", "p")] },
  { name: "a TABLE in a body is read as a table and the table state is back after it", tpl: "{{DEFINE f()}}{{TABLE}}{{ROW}}\${{z}}|1{{END_ROW}}{{END_TABLE}}{{END_DEFINE}}\${{w}}", vars: { z: { usedIn: ["table"] }, w: { usedIn: ["output"] } }, blocks: { DEFINE: 1, TABLE: 1 }, macros: [M("f")] },
  { name: "a CALL in a ROW cell is a call read", tpl: "{{DEFINE f(p)}}{{END_DEFINE}}{{TABLE}}{{ROW}}{{CALL f(c)}}|1{{END_ROW}}{{END_TABLE}}", vars: { c: { usedIn: ["call"] } }, blocks: { DEFINE: 1, TABLE: 1 }, macros: [M("f", "p")] },
  { name: "a CALL in a LIST_ITEM is a call read", tpl: "{{DEFINE f(p)}}{{END_DEFINE}}{{LIST}}{{LIST_ITEM}}{{CALL f(c)}}{{END_LIST_ITEM}}{{END_LIST}}", vars: { c: { usedIn: ["call"] } }, blocks: { DEFINE: 1, LIST: 1 }, macros: [M("f", "p")] },
  { name: "the filters of a body are counted once however often it is called", tpl: "{{DEFINE f()}}\${{s | upper}}{{END_DEFINE}}{{CALL f()}}{{CALL f()}}{{CALL f()}}", vars: { s: { usedIn: ["output"] } }, blocks: { DEFINE: 1 }, filters: ["upper"], macros: [M("f")] },
  { name: "an unknown filter in a body is one diagnostic", tpl: "{{DEFINE f()}}\${{s | nope}}{{END_DEFINE}}{{CALL f()}}{{CALL f()}}", vars: { s: { usedIn: ["output"] } }, blocks: { DEFINE: 1 }, filters: ["nope"], diag: ["unknown-filter"], macros: [M("f")] },
  { name: "templates with no DEFINE have no macros key: FOR, SET and IF", tpl: "{{SET u = a}}{{FOR xs AS i}}\${{u}}{{IF t}}\${{i}}{{END_IF}}{{END_FOR}}", vars: { a: { usedIn: ["set"] }, xs: { usedIn: ["for"] }, t: { usedIn: ["if"] } }, blocks: { FOR: 1, IF: 1 }, macros: null },
  { name: "the empty template has no macros key", tpl: "", vars: {}, blocks: {}, macros: null },
];

function fanWide(count: number, width: number): string {
  let t = def("m0", "", "x");
  for (let k = 1; k < count; k++) t += def(`m${k}`, "", calls(`m${k - 1}`, width));
  return `${t}{{CALL m${count - 1}()}}`;
}

describe("mc-analyze: analyze and validate walk each body once and never follow a CALL", () => {
  it.each(ANALYZE_ROWS)("mc-analyze: $name", (r) => {
    const o = runStatic("analyze", r.tpl);
    check(r.diag ? "ok" : o.code, `analyze accepts the template (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
    const a = analyzed(r.tpl);
    const used: Record<string, string[]> = {};
    for (const v of a.variables) used[v.name] = [...v.usedIn].sort();
    const want: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(r.vars)) want[k] = [...v.usedIn].sort();
    check(used, "the inputs and the kinds they are used in").toEqual(want);
    for (const [k, v] of Object.entries(r.vars)) {
      const found = a.variables.find((x: any) => x.name === k);
      if (v.paths) check(found?.paths, `${k}: the paths`).toEqual(v.paths);
      if (v.optional !== undefined) {
        check(found?.optional, `${k}: optional`).toBe(v.optional);
        check(found?.required, `${k}: required is the opposite of optional`).toBe(!v.optional);
      }
    }
    check(a.blocks, "the block counts").toEqual(r.blocks);
    check(a.filters.map((f: any) => f.name).sort(), "the filters used").toEqual([...(r.filters ?? [])].sort());
    check(a.diagnostics.map((d: any) => d.code), "the diagnostics").toEqual(r.diag ?? []);
    if (r.macros === null) check("macros" in a, "the macros key is absent when the template has no DEFINE").toBe(false);
    else check(a.macros, "the macros seen, in source order").toEqual(r.macros);
  });
  it.each(ANALYZE_ROWS.filter((r) => !r.diag))("mc-analyze: validate accepts and agrees: $name", (r) => {
    check(validate(r.tpl), "validate is ok with no diagnostics").toEqual({ ok: true, diagnostics: [] });
  });

  it("mc-analyze: a filter in a body called many times is counted once", () => {
    check(analyzed("{{DEFINE f()}}\${{s | upper}}{{END_DEFINE}}{{CALL f()}}{{CALL f()}}{{CALL f()}}").filters, "one use").toEqual([{ name: "upper", count: 1 }]);
  });
  it("mc-analyze: an unknown filter in a body is located at the filter's variable in the body", () => {
    const m = marked("{{DEFINE f()}}\n  §\${{s | nope}}{{END_DEFINE}}\n{{CALL f()}}");
    check(analyzed(m.tpl).diagnostics.map((d: any) => [d.code, d.line, d.column]), "one diagnostic in the body").toEqual([["unknown-filter", m.line, m.col]]);
  });
  it("mc-analyze: a diagnostic of an unknown macro is located at the CALL, also inside a body", () => {
    const m = marked("{{DEFINE f()}}\n  §{{CALL nope()}}{{END_DEFINE}}");
    check(analyzed(m.tpl).diagnostics.map((d: any) => [d.code, d.line, d.column]), "located at the CALL").toEqual([["unknown-macro", m.line, m.col]]);
  });

  it.each([
    { name: "40 macros each calling the next twice", tpl: fanWide(41, 2) },
    { name: "200 macros each calling the next three times", tpl: fanWide(200, 3) },
    { name: "an infinite recursion", tpl: INFINITE },
    { name: "a mutual recursion", tpl: MUTUAL },
    { name: "a fan-out of 30 levels", tpl: fan(30) },
  ])("mc-analyze: $name is linear in validate and analyze", ({ tpl }) => {
    const started = Date.now();
    const a = analyzed(tpl);
    check(a.diagnostics, "no diagnostics beyond the expected").toEqual([]);
    check(a.blocks.DEFINE, "every DEFINE is counted once").toBe(a.macros.length);
    check(validate(tpl), "validate is ok").toEqual({ ok: true, diagnostics: [] });
    check(Date.now() - started < 2000, "both return promptly").toBe(true);
  });
  it("mc-analyze: a fan-out of 40 levels lists its 41 macros", () => {
    const a = analyzed(fan(40));
    check(a.macros.length, "41 macros").toBe(41);
    check(a.macros[0], "the first in source order").toEqual({ name: "l0", params: [] });
  });

  // analyze agrees with the run: a name that a run asks for is an input
  const agree: Array<{ name: string; tpl: string; data: Record<string, any>; input: string }> = [
    { name: "a name read only in a body", tpl: "{{DEFINE f()}}[\${{only_here}}]{{END_DEFINE}}{{CALL f()}}", data: {}, input: "only_here" },
    { name: "a name passed as an argument", tpl: "{{DEFINE f(p)}}[\${{p}}]{{END_DEFINE}}{{CALL f(only_here)}}", data: {}, input: "only_here" },
    { name: "a name read only in a body inside an IF", tpl: "{{DEFINE f()}}{{IF t}}[\${{only_here}}]{{END_IF}}{{END_DEFINE}}{{CALL f()}}", data: { t: true }, input: "only_here" },
    { name: "a name passed as an argument in a FOR", tpl: "{{DEFINE f(p)}}[\${{p}}]{{END_DEFINE}}{{FOR xs AS i limit=1}}{{CALL f(only_here)}}{{END_FOR}}", data: { xs: ["a"] }, input: "only_here" },
    { name: "a name passed as an argument and read by path in the body", tpl: "{{DEFINE f(p)}}[\${{p.k}}]{{END_DEFINE}}{{CALL f(only_here)}}", data: {}, input: "only_here" },
    { name: "a name read in the body of a macro called by a macro", tpl: "{{DEFINE g()}}[\${{only_here}}]{{END_DEFINE}}{{DEFINE f()}}{{CALL g()}}{{END_DEFINE}}{{CALL f()}}", data: {}, input: "only_here" },
    { name: "a name read in the body after a top-level SET of the same name", tpl: "{{SET only_here = 1}}{{DEFINE f()}}[\${{only_here}}]{{END_DEFINE}}{{CALL f()}}", data: {}, input: "only_here" },
  ];
  it.each(agree.flatMap((c) => (["render", "resolve"] as const).map((m) => ({ m, ...c }))))("mc-analyze: [$m] $name is an input that the run also asks for", (c) => {
    const names = analyzed(c.tpl).variables.map((v: any) => v.name);
    check(names, `analyze lists ${c.input} as an input`).toContain(c.input);
    const entry: Entry = c.m === "render" ? "render-strict" : "resolve-strict";
    const without = run(entry, c.tpl, c.data);
    check(without.code, `${c.m}: without ${c.input} the strict run asks for it (got ${without.code} ${without.message ?? ""})`).toBe("missing-variable");
    check(without.message ?? "", `${c.m}: the missing name is ${c.input}`).toContain(c.input);
    check(run(entry, c.tpl, { ...c.data, [c.input]: { k: "V" } }).code, `${c.m}: with ${c.input} it renders`).toBe("ok");
  });
  it.each([
    { name: "a FOR item passed as an argument", tpl: "{{DEFINE f(p)}}[\${{p}}]{{END_DEFINE}}{{FOR xs AS i}}{{CALL f(i)}}{{END_FOR}}", data: { xs: ["a"] }, inputs: ["xs"] },
    { name: "a SET local passed as an argument", tpl: '{{DEFINE f(p)}}[\${{p}}]{{END_DEFINE}}{{SET l = "v"}}{{CALL f(l)}}', data: {}, inputs: [] },
    { name: "a body that reads only its parameters", tpl: "{{DEFINE f(p, q)}}[\${{p}}\${{q}}]{{END_DEFINE}}{{CALL f(1, 2)}}", data: {}, inputs: [] },
    { name: "a parameter named like a name the caller sets", tpl: '{{DEFINE f(x)}}[\${{x}}]{{END_DEFINE}}{{SET x = "S"}}{{CALL f(x)}}', data: {}, inputs: [] },
  ])("mc-analyze: $name is no input and the strict run needs no data for it", (c) => {
    const names = analyzed(c.tpl).variables.map((v: any) => v.name);
    check(names, "the listed inputs").toEqual(c.inputs);
    for (const entry of ["render-strict", "resolve-strict"] as Entry[]) {
      const o = run(entry, c.tpl, c.data);
      check(o.code, `[${entry}] the strict run succeeds with only the listed inputs (got ${o.code} ${o.message ?? ""})`).toBe("ok");
    }
  });
});

// =====================================================================================
// mc-spec
// =====================================================================================

const has = (k: string) => Object.prototype.hasOwnProperty.call(KEYWORDS, k);
const derivedPairs = (): Array<[string, string | undefined]> =>
  Object.keys(KEYWORDS)
    .filter((k) => !k.startsWith("END_"))
    .map((k): [string, string | undefined] => [k, has(`END_${k}`) ? `END_${k}` : undefined]);

describe("mc-spec: the keyword table and spec() list DEFINE and CALL", () => {
  it("mc-spec: KEYWORDS has DEFINE, END_DEFINE and CALL, and no END_CALL", () => {
    check(has("DEFINE"), "DEFINE is a keyword").toBe(true);
    check(has("END_DEFINE"), "END_DEFINE is a keyword").toBe(true);
    check(has("CALL"), "CALL is a keyword").toBe(true);
    check(has("END_CALL"), "END_CALL is not a keyword").toBe(false);
  });
  it("mc-spec: the block pairs derived from the keyword table hold DEFINE with END_DEFINE and CALL with no closer", () => {
    const got = new Map(derivedPairs());
    check(got.get("DEFINE"), "DEFINE closes with END_DEFINE").toBe("END_DEFINE");
    check(got.has("CALL"), "CALL is listed as an opener").toBe(true);
    check(got.get("CALL"), "CALL has no closer").toBeUndefined();
    for (const [open, close] of [["IF", "END_IF"], ["FOR", "END_FOR"], ["CASE", "END_CASE"], ["SECTION", "END_SECTION"], ["FENCE", "END_FENCE"], ["LIST", "END_LIST"], ["TABLE", "END_TABLE"]]) {
      check(got.get(open), `${open} keeps its closer`).toBe(close);
    }
    check(got.get("SET"), "SET has no closer").toBeUndefined();
  });
  it("mc-spec: spec().blocks lists DEFINE with closes END_DEFINE and CALL with no closes", () => {
    const define = spec().blocks.find((b) => b.name === "DEFINE");
    const call = spec().blocks.find((b) => b.name === "CALL");
    check(define, "DEFINE is listed").toBeDefined();
    check(call, "CALL is listed").toBeDefined();
    check(define?.closes, "DEFINE closes with END_DEFINE").toBe("END_DEFINE");
    check(call?.closes, "CALL has no closer").toBeUndefined();
    check(define?.args, "DEFINE shows its arguments").toBe("name(param, ...)");
    check(call?.args, "CALL shows its arguments").toBe("name(arg, ...)");
    check(/hoist/i.test(define?.description ?? ""), `the DEFINE description says it is hoisted: ${define?.description}`).toBe(true);
    check(/iteration/i.test(call?.description ?? ""), `the CALL description says every call counts one iteration: ${call?.description}`).toBe(true);
  });
  it("mc-spec: every opener in the keyword table has a spec().blocks entry with the closer the table gives", () => {
    for (const [open, close] of derivedPairs()) {
      const block = spec().blocks.find((b) => b.name === open);
      check(block, `spec().blocks lists ${open}`).toBeDefined();
      check(block?.closes, `${open} closes with ${close ?? "nothing"}`).toBe(close);
    }
  });
  it("mc-spec: spec().blocks has no name outside the keyword table", () => {
    const known = derivedPairs().map(([o]) => o);
    check(spec().blocks.map((b) => b.name).filter((n) => !known.includes(n)), "names outside the table").toEqual([]);
  });
  it.each(["DEFINE", "END_DEFINE", "CALL"])("mc-spec: the lexer accepts {{%s}} as a known tag (its syntax error is not an unknown tag)", (word) => {
    const o = run("render-strict", `a\n{{${word}}}`, DATA);
    check(o.code, `{{${word}}} is a syntax-error`).toBe("syntax-error");
    check((o.message ?? "").includes(UNKNOWN_TAG), `{{${word}}} is known: ${o.message}`).toBe(false);
  });
  it.each(["END_CALL", "call", "define", "end_define", "Call"])("mc-spec: {{%s}} is an unknown tag in render, validate and analyze", (word) => {
    for (const entry of ENTRIES) {
      const o = run(entry, `a\n{{${word}}}`, DATA);
      verifyOutcome(o, ERR("syntax-error", 2, 1, UNKNOWN_TAG), `mc-spec [${entry}] {{${word}}}`);
    }
    for (const kind of ["validate", "analyze"] as const) verifyOutcome(runStatic(kind, `a\n{{${word}}}`), ERR("syntax-error", 2, 1, UNKNOWN_TAG), `mc-spec [${kind}] {{${word}}}`);
  });
});

// =====================================================================================
// golden case
// =====================================================================================

describe("mc-call: golden case", () => {
  it("mc-call: golden case lang-macro renders to its expected file", () => {
    const g = goldenCase("lang-macro");
    check(g.count, "one golden case ran").toBe(1);
    check(g.message, "the case renders to expected.md").toBe("");
  });
});

// =====================================================================================
// mc-compat: templates that were valid keep their output (the unmodified code gives these outputs)
// =====================================================================================

// [name, template, limits (0 = none), render strict, render lenient, resolve strict, resolve lenient]
// a result starting with ! is an error: !code@line:column, or !code@*:* when only the code is pinned
type Guard = [string, string, Partial<Limits> | 0, string, string, string, string];
const GUARDS: Guard[] = [
  ["IF nested 1 at maxDepth 1", "{{IF t}}x{{END_IF}}", {"maxDepth":1}, "x", "x", "x", "x"],
  ["IF nested 1 at maxDepth 0", "{{IF t}}x{{END_IF}}", {"maxDepth":0}, "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1"],
  ["IF nested 3 at maxDepth 3", "{{IF t}}{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}", {"maxDepth":3}, "x", "x", "x", "x"],
  ["IF nested 3 at maxDepth 2", "{{IF t}}{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}", {"maxDepth":2}, "!limit-depth@1:17", "!limit-depth@1:17", "!limit-depth@1:17", "!limit-depth@1:17"],
  ["IF nested 5 at maxDepth 5", "{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}", {"maxDepth":5}, "x", "x", "x", "x"],
  ["IF nested 5 at maxDepth 4", "{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}", {"maxDepth":4}, "!limit-depth@1:33", "!limit-depth@1:33", "!limit-depth@1:33", "!limit-depth@1:33"],
  ["CASE nested 1 at maxDepth 1", "{{CASE b}}{{WHEN 2}}x{{END_CASE}}", {"maxDepth":1}, "x", "x", "x", "x"],
  ["CASE nested 1 at maxDepth 0", "{{CASE b}}{{WHEN 2}}x{{END_CASE}}", {"maxDepth":0}, "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1"],
  ["CASE nested 3 at maxDepth 3", "{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}x{{END_CASE}}{{END_CASE}}{{END_CASE}}", {"maxDepth":3}, "x", "x", "x", "x"],
  ["CASE nested 3 at maxDepth 2", "{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}x{{END_CASE}}{{END_CASE}}{{END_CASE}}", {"maxDepth":2}, "!limit-depth@1:41", "!limit-depth@1:41", "!limit-depth@1:41", "!limit-depth@1:41"],
  ["CASE nested 5 at maxDepth 5", "{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}x{{END_CASE}}{{END_CASE}}{{END_CASE}}{{END_CASE}}{{END_CASE}}", {"maxDepth":5}, "x", "x", "x", "x"],
  ["CASE nested 5 at maxDepth 4", "{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}{{CASE b}}{{WHEN 2}}x{{END_CASE}}{{END_CASE}}{{END_CASE}}{{END_CASE}}{{END_CASE}}", {"maxDepth":4}, "!limit-depth@1:81", "!limit-depth@1:81", "!limit-depth@1:81", "!limit-depth@1:81"],
  ["FOR nested 1 at maxDepth 1", "{{FOR one AS i}}x{{END_FOR}}", {"maxDepth":1}, "x", "x", "x", "x"],
  ["FOR nested 1 at maxDepth 0", "{{FOR one AS i}}x{{END_FOR}}", {"maxDepth":0}, "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1"],
  ["FOR nested 3 at maxDepth 3", "{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}x{{END_FOR}}{{END_FOR}}{{END_FOR}}", {"maxDepth":3}, "x", "x", "x", "x"],
  ["FOR nested 3 at maxDepth 2", "{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}x{{END_FOR}}{{END_FOR}}{{END_FOR}}", {"maxDepth":2}, "!limit-depth@1:33", "!limit-depth@1:33", "!limit-depth@1:33", "!limit-depth@1:33"],
  ["FOR nested 5 at maxDepth 5", "{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}x{{END_FOR}}{{END_FOR}}{{END_FOR}}{{END_FOR}}{{END_FOR}}", {"maxDepth":5}, "x", "x", "x", "x"],
  ["FOR nested 5 at maxDepth 4", "{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}{{FOR one AS i}}x{{END_FOR}}{{END_FOR}}{{END_FOR}}{{END_FOR}}{{END_FOR}}", {"maxDepth":4}, "!limit-depth@1:65", "!limit-depth@1:65", "!limit-depth@1:65", "!limit-depth@1:65"],
  ["SECTION nested 1 at maxDepth 1", "{{SECTION \"T\"}}x{{END_SECTION}}", {"maxDepth":1}, "## T\n\nx\n", "## T\n\nx\n", "## T\n\nx\n", "## T\n\nx\n"],
  ["SECTION nested 1 at maxDepth 0", "{{SECTION \"T\"}}x{{END_SECTION}}", {"maxDepth":0}, "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1"],
  ["SECTION nested 3 at maxDepth 3", "{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}x{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}", {"maxDepth":3}, "## T\n\n## T\n\n## T\n\nx\n", "## T\n\n## T\n\n## T\n\nx\n", "## T\n\n## T\n\n## T\n\nx\n", "## T\n\n## T\n\n## T\n\nx\n"],
  ["SECTION nested 3 at maxDepth 2", "{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}x{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}", {"maxDepth":2}, "!limit-depth@1:31", "!limit-depth@1:31", "!limit-depth@1:31", "!limit-depth@1:31"],
  ["SECTION nested 5 at maxDepth 5", "{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}x{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}", {"maxDepth":5}, "## T\n\n## T\n\n## T\n\n## T\n\n## T\n\nx\n", "## T\n\n## T\n\n## T\n\n## T\n\n## T\n\nx\n", "## T\n\n## T\n\n## T\n\n## T\n\n## T\n\nx\n", "## T\n\n## T\n\n## T\n\n## T\n\n## T\n\nx\n"],
  ["SECTION nested 5 at maxDepth 4", "{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}{{SECTION \"T\"}}x{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}{{END_SECTION}}", {"maxDepth":4}, "!limit-depth@1:61", "!limit-depth@1:61", "!limit-depth@1:61", "!limit-depth@1:61"],
  ["FENCE nested 1 at maxDepth 1", "{{FENCE}}x{{END_FENCE}}", {"maxDepth":1}, "```\nx\n```\n", "```\nx\n```\n", "```\nx\n```\n", "```\nx\n```\n"],
  ["FENCE nested 1 at maxDepth 0", "{{FENCE}}x{{END_FENCE}}", {"maxDepth":0}, "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1"],
  ["FENCE nested 3 at maxDepth 3", "{{FENCE}}{{FENCE}}{{FENCE}}x{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}", {"maxDepth":3}, "`````\n````\n```\nx\n```\n````\n`````\n", "`````\n````\n```\nx\n```\n````\n`````\n", "`````\n````\n```\nx\n```\n````\n`````\n", "`````\n````\n```\nx\n```\n````\n`````\n"],
  ["FENCE nested 3 at maxDepth 2", "{{FENCE}}{{FENCE}}{{FENCE}}x{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}", {"maxDepth":2}, "!limit-depth@1:19", "!limit-depth@1:19", "!limit-depth@1:19", "!limit-depth@1:19"],
  ["FENCE nested 5 at maxDepth 5", "{{FENCE}}{{FENCE}}{{FENCE}}{{FENCE}}{{FENCE}}x{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}", {"maxDepth":5}, "```````\n``````\n`````\n````\n```\nx\n```\n````\n`````\n``````\n```````\n", "```````\n``````\n`````\n````\n```\nx\n```\n````\n`````\n``````\n```````\n", "```````\n``````\n`````\n````\n```\nx\n```\n````\n`````\n``````\n```````\n", "```````\n``````\n`````\n````\n```\nx\n```\n````\n`````\n``````\n```````\n"],
  ["FENCE nested 5 at maxDepth 4", "{{FENCE}}{{FENCE}}{{FENCE}}{{FENCE}}{{FENCE}}x{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}", {"maxDepth":4}, "!limit-depth@1:37", "!limit-depth@1:37", "!limit-depth@1:37", "!limit-depth@1:37"],
  ["LIST nested 2 in an item at maxDepth 2", "{{LIST}}{{LIST_ITEM}}{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}", {"maxDepth":2}, "1. 1. x", "1. 1. x", "1. 1. x", "1. 1. x"],
  ["LIST nested 2 in an item at maxDepth 1", "{{LIST}}{{LIST_ITEM}}{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}", {"maxDepth":1}, "!limit-depth@1:22", "!limit-depth@1:22", "!limit-depth@1:22", "!limit-depth@1:22"],
  ["LIST alone at maxDepth 1", "{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}", {"maxDepth":1}, "1. x", "1. x", "1. x", "1. x"],
  ["LIST alone at maxDepth 0", "{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}", {"maxDepth":0}, "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1"],
  ["TABLE alone at maxDepth 1", "{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", {"maxDepth":1}, "| 1 | 2 |", "| 1 | 2 |", "| 1 | 2 |", "| 1 | 2 |"],
  ["TABLE alone at maxDepth 0", "{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", {"maxDepth":0}, "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1", "!limit-depth@1:1"],
  ["IF in a TABLE at maxDepth 2", "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", {"maxDepth":2}, "| a | b |", "| a | b |", "| a | b |", "| a | b |"],
  ["IF in a TABLE at maxDepth 1", "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", {"maxDepth":1}, "!limit-depth@1:10", "!limit-depth@1:10", "!limit-depth@1:10", "!limit-depth@1:10"],
  ["FOR in a TABLE at maxDepth 2", "{{TABLE}}{{FOR xs AS x}}{{ROW}}\${{x}}|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", {"maxDepth":2}, "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |"],
  ["FOR in a TABLE at maxDepth 1", "{{TABLE}}{{FOR xs AS x}}{{ROW}}\${{x}}|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", {"maxDepth":1}, "!limit-depth@1:10", "!limit-depth@1:10", "!limit-depth@1:10", "!limit-depth@1:10"],
  ["generic FOR body in a TABLE at maxDepth 2", "{{TABLE}}{{FOR xs AS x}}\${{x}}|b\n{{END_FOR}}{{END_TABLE}}", {"maxDepth":2}, "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |"],
  ["generic FOR body in a TABLE at maxDepth 1", "{{TABLE}}{{FOR xs AS x}}\${{x}}|b\n{{END_FOR}}{{END_TABLE}}", {"maxDepth":1}, "!limit-depth@1:10", "!limit-depth@1:10", "!limit-depth@1:10", "!limit-depth@1:10"],
  ["FOR in an IF in a TABLE at maxDepth 3", "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}\${{x}}|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", {"maxDepth":3}, "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |", "| b | b |\n| a | b |\n| b | b |"],
  ["FOR in an IF in a TABLE at maxDepth 2", "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}\${{x}}|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", {"maxDepth":2}, "!limit-depth@1:18", "!limit-depth@1:18", "!limit-depth@1:18", "!limit-depth@1:18"],
  ["FOR in a LIST at maxDepth 2", "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}\${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", {"maxDepth":2}, "1. b\n2. a\n3. b", "1. b\n2. a\n3. b", "1. b\n2. a\n3. b", "1. b\n2. a\n3. b"],
  ["FOR in a LIST at maxDepth 1", "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}\${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", {"maxDepth":1}, "!limit-depth@1:9", "!limit-depth@1:9", "!limit-depth@1:9", "!limit-depth@1:9"],
  ["IF in a FOR in an IF in a LIST at maxDepth 4", "{{LIST}}{{IF t}}{{FOR xs AS x}}{{IF t}}{{LIST_ITEM}}\${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_LIST}}", {"maxDepth":4}, "1. b\n2. a\n3. b", "1. b\n2. a\n3. b", "1. b\n2. a\n3. b", "1. b\n2. a\n3. b"],
  ["IF in a FOR in an IF in a LIST at maxDepth 3", "{{LIST}}{{IF t}}{{FOR xs AS x}}{{IF t}}{{LIST_ITEM}}\${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_LIST}}", {"maxDepth":3}, "!limit-depth@1:32", "!limit-depth@1:32", "!limit-depth@1:32", "!limit-depth@1:32"],
  ["FOR in an ELSE of a FOR at maxDepth 2", "{{FOR e AS i}}x{{ELSE}}{{FOR xs AS j}}\${{j}}{{END_FOR}}{{END_FOR}}", {"maxDepth":2}, "bab", "bab", "bab", "bab"],
  ["FOR in an ELSE of a FOR at maxDepth 1", "{{FOR e AS i}}x{{ELSE}}{{FOR xs AS j}}\${{j}}{{END_FOR}}{{END_FOR}}", {"maxDepth":1}, "!limit-depth@1:24", "!limit-depth@1:24", "!limit-depth@1:24", "!limit-depth@1:24"],
  ["mixed five blocks at maxDepth 5", "{{IF t}}{{FOR one AS i}}{{CASE b}}{{WHEN 2}}{{SECTION \"T\"}}{{FENCE}}x{{END_FENCE}}{{END_SECTION}}{{END_CASE}}{{END_FOR}}{{END_IF}}", {"maxDepth":5}, "## T\n\n```\nx\n```\n", "## T\n\n```\nx\n```\n", "## T\n\n```\nx\n```\n", "## T\n\n```\nx\n```\n"],
  ["mixed five blocks at maxDepth 4", "{{IF t}}{{FOR one AS i}}{{CASE b}}{{WHEN 2}}{{SECTION \"T\"}}{{FENCE}}x{{END_FENCE}}{{END_SECTION}}{{END_CASE}}{{END_FOR}}{{END_IF}}", {"maxDepth":4}, "!limit-depth@1:60", "!limit-depth@1:60", "!limit-depth@1:60", "!limit-depth@1:60"],
  ["32 nested IF at the default maxDepth", "{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}", 0, "x", "x", "x", "x"],
  ["33 nested IF at the default maxDepth", "{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}", 0, "!limit-depth@1:257", "!limit-depth@1:257", "!limit-depth@1:257", "!limit-depth@1:257"],
  ["IF body over maxOutputChars 20", "{{IF t}}012345678901234567890123456789{{END_IF}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["IF body at exactly maxOutputChars 30", "{{IF t}}012345678901234567890123456789{{END_IF}}", {"maxOutputChars":30}, "012345678901234567890123456789", "012345678901234567890123456789", "012345678901234567890123456789", "012345678901234567890123456789"],
  ["IF body one over maxOutputChars 29", "{{IF t}}012345678901234567890123456789{{END_IF}}", {"maxOutputChars":29}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["CASE body over maxOutputChars 20", "{{CASE b}}{{WHEN 2}}012345678901234567890123456789{{END_CASE}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["SECTION body over maxOutputChars 20", "{{SECTION \"T\"}}012345678901234567890123456789{{END_SECTION}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["FENCE body over maxOutputChars 20", "{{FENCE}}012345678901234567890123456789{{END_FENCE}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["nested IF bodies over maxOutputChars 20", "{{IF t}}{{IF t}}012345678901234567890123456789{{END_IF}}{{END_IF}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["two IF bodies together over maxOutputChars 20", "{{IF t}}0123456789{{END_IF}}{{IF t}}01234567890123456789{{END_IF}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["top-level text over maxOutputChars 20", "012345678901234567890123456789", {"maxOutputChars":20}, "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1"],
  ["LIST_ITEM content over maxOutputChars 20", "{{LIST}}{{LIST_ITEM}}012345678901234567890123456789{{END_LIST_ITEM}}{{END_LIST}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["FOR loop over maxOutputChars 20", "{{FOR xs AS i}}0123456789{{END_FOR}}", {"maxOutputChars":20}, "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1"],
  ["FOR loop at exactly maxOutputChars 30", "{{FOR xs AS i}}0123456789{{END_FOR}}", {"maxOutputChars":30}, "012345678901234567890123456789", "012345678901234567890123456789", "012345678901234567890123456789", "012345678901234567890123456789"],
  ["FOR loop in an IF over maxOutputChars 20", "{{IF t}}{{FOR xs AS i}}0123456789{{END_FOR}}{{END_IF}}", {"maxOutputChars":20}, "!limit-output@1:9", "!limit-output@1:9", "!limit-output@1:9", "!limit-output@1:9"],
  ["FOR loop with an IF body over maxOutputChars 20", "{{FOR xs AS i}}{{IF t}}0123456789{{END_IF}}{{END_FOR}}", {"maxOutputChars":20}, "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1"],
  ["FOR loop ELSE body over maxOutputChars 20", "{{FOR e AS i}}x{{ELSE}}012345678901234567890123456789{{END_FOR}}", {"maxOutputChars":20}, "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*", "!limit-output@*:*"],
  ["FOR with three items", "{{FOR xs AS i}}\${{i}}{{END_FOR}}", 0, "bab", "bab", "bab", "bab"],
  ["FOR in FOR", "{{FOR xs AS i}}{{FOR ys AS j}}\${{i}}\${{j}}{{END_FOR}}{{END_FOR}}", 0, "bpbqapaqbpbq", "bpbqapaqbpbq", "bpbqapaqbpbq", "bpbqapaqbpbq"],
  ["FOR else and IF", "{{FOR e AS i}}x{{ELSE}}none{{END_FOR}}[{{IF t}}\${{a}}{{END_IF}}]", 0, "none[A]", "none[A]", "none[A]", "none[A]"],
  ["maxIterations 3 with a 3-item FOR", "{{FOR xs AS i}}\${{i}}{{END_FOR}}", {"maxIterations":3}, "bab", "bab", "bab", "bab"],
  ["maxIterations 2 with a 3-item FOR", "{{FOR xs AS i}}\${{i}}{{END_FOR}}", {"maxIterations":2}, "!limit-iterations@1:1", "!limit-iterations@1:1", "!limit-iterations@1:1", "!limit-iterations@1:1"],
  ["a SET then a FOR", "{{SET x = a}}{{FOR xs AS i}}\${{x}}\${{i}}{{END_FOR}}", 0, "AbAaAb", "AbAaAb", "AbAaAb", "AbAaAb"],
  ["a SET in an IF in a FOR", "{{FOR xs AS i}}{{IF t}}{{SET u = i}}\${{u}}{{END_IF}}{{END_FOR}}", 0, "bab", "bab", "bab", "bab"],
  ["bad filter parameter on line 2", "a\n  \${{s | head=x}}", 0, "!type-error@2:3", "!type-error@2:3", "!type-error@2:3", "!type-error@2:3"],
  ["unknown filter on line 2", "a\n  \${{s | nope}}", 0, "!unknown-filter@2:3", "!unknown-filter@2:3", "!unknown-filter@2:3", "!unknown-filter@2:3"],
  ["math division by zero on line 2", "a\n  \${{n / 0}}", 0, "!type-error@2:3", "!type-error@2:3", "a\n  Infinity", "a\n  Infinity"],
  ["missing variable on line 2", "a\n  \${{missing}}", 0, "!missing-variable@2:3", "a\n  ", "!missing-variable@2:3", "a\n  "],
  ["cyclic print on line 2", "a\n  \${{cyc}}", 0, "!type-error@2:3", "!type-error@2:3", "!type-error@2:3", "!type-error@2:3"],
  ["constructor tag", "{{constructor}}", 0, "!syntax-error@1:1", "!syntax-error@1:1", "!syntax-error@1:1", "!syntax-error@1:1"],
  ["call-like words are text", "CALL f() and DEFINE g() are words", 0, "CALL f() and DEFINE g() are words", "CALL f() and DEFINE g() are words", "CALL f() and DEFINE g() are words", "CALL f() and DEFINE g() are words"],
  ["a lower case call tag is unknown", "{{call f()}}", 0, "!syntax-error@1:1", "!syntax-error@1:1", "!syntax-error@1:1", "!syntax-error@1:1"],
  ["a lower case define tag is unknown", "{{define f()}}", 0, "!syntax-error@1:1", "!syntax-error@1:1", "!syntax-error@1:1", "!syntax-error@1:1"],
  ["section with a path title", "{{SECTION s}}x{{END_SECTION}}", 0, "## hello world\n\nx\n", "## hello world\n\nx\n", "## hello world\n\nx\n", "## hello world\n\nx\n"],
  ["TABLE with a header and FOR rows", "{{TABLE}}{{HEADER}}N|M{{END_HEADER}}{{FOR items AS it}}{{ROW}}\${{it.n}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", 0, "| N | M |\n|:-----|:-----|\n| x | 1 |\n| y | 1 |", "| N | M |\n|:-----|:-----|\n| x | 1 |\n| y | 1 |", "| N | M |\n|:-----|:-----|\n| x | 1 |\n| y | 1 |", "| N | M |\n|:-----|:-----|\n| x | 1 |\n| y | 1 |"],
  ["LIST with FOR items", "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}\${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", 0, "1. b\n2. a\n3. b", "1. b\n2. a\n3. b", "1. b\n2. a\n3. b", "1. b\n2. a\n3. b"],
  ["FENCE with a language", "{{FENCE lang=\"js\"}}let x = \${{n}};{{END_FENCE}}", 0, "```js\nlet x = 5;\n```\n", "```js\nlet x = 5;\n```\n", "```js\nlet x = 5;\n```\n", "```js\nlet x = 5;\n```\n"],
  ["CASE with a default", "{{CASE b}}{{WHEN 1}}one{{DEFAULT}}other{{END_CASE}}", 0, "other", "other", "other", "other"],
  ["FOR body children over maxOutputChars 20 (one item)", "{{FOR one AS i}}0123456789{{IF t}}0123456789{{END_IF}}0123456789{{END_FOR}}", {"maxOutputChars":20}, "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1"],
  ["FOR ELSE body children over maxOutputChars 20", "{{FOR e AS i}}x{{ELSE}}0123456789{{IF t}}0123456789{{END_IF}}0123456789{{END_FOR}}", {"maxOutputChars":20}, "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1"],
  ["FOR body with a SECTION over maxOutputChars 20", "{{FOR one AS i}}0123456789{{SECTION \"T\"}}0123456789{{END_SECTION}}{{END_FOR}}", {"maxOutputChars":20}, "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1", "!limit-output@1:1"],
  ["nested FOR bodies over maxOutputChars 20", "{{FOR one AS i}}{{FOR one AS j}}0123456789{{IF t}}0123456789{{END_IF}}0123456789{{END_FOR}}{{END_FOR}}", {"maxOutputChars":20}, "!limit-output@1:17", "!limit-output@1:17", "!limit-output@1:17", "!limit-output@1:17"],
];

function guardCheck(o: Outcome, s: string, label: string): void {
  const m = /^!([a-z-]+)@(\d+|\*):(\d+|\*)$/.exec(s);
  if (!m) return verifyOutcome(o, OUT(s), label);
  if (m[2] === "*") return void check(o.code, `${label}: expects the error ${m[1]} (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe(m[1]);
  verifyOutcome(o, ERR(m[1], Number(m[2]), Number(m[3]), m[1] === "syntax-error" ? UNKNOWN_TAG : undefined), label);
}

const BIG_GUARDS: Array<[string, string, Partial<Limits>, string]> = [
  ["100 nested IF at maxDepth 100", nestedIf(100), { maxDepth: 100 }, "x"],
  ["200 nested IF at maxDepth 1000", nestedIf(200), { maxDepth: 1000 }, "x"],
  ["256 nested IF at maxDepth 256", nestedIf(256), { maxDepth: 256 }, "x"],
  ["99 nested IF at maxDepth 98", nestedIf(99), { maxDepth: 98 }, "!limit-depth@1:785"],
];

describe("mc-compat: old templates keep their output", () => {
  const cases = GUARDS.flatMap((g) => ENTRIES.map((entry, i) => ({ entry, name: g[0], tpl: g[1], limits: g[2] || undefined, want: g[3 + i] as string })));
  it.each(cases)("mc-compat: [$entry] $name", ({ entry, tpl, limits, want, name }) => {
    guardCheck(run(entry, tpl, DATA, limits), want, `mc-compat [${entry}] ${name}`);
  });
  const bigCases = BIG_GUARDS.flatMap((g) => ENTRIES.map((entry) => ({ entry, name: g[0], tpl: g[1], limits: g[2], want: g[3] })));
  it.each(bigCases)("mc-compat: [$entry] $name", ({ entry, tpl, limits, want, name }) => {
    guardCheck(run(entry, tpl, DATA, limits), want, `mc-compat [${entry}] ${name}`);
  });

  it("mc-compat: analyze of templates with FOR, SET, IF and CASE gives the same analysis and has no macros key", () => {
    const one = analyzed("{{FOR xs AS i}}{{SET u = i}}\${{u}}{{IF t}}\${{s | upper}}{{END_IF}}{{END_FOR}}");
    check(one, "the analysis of a FOR with a SET and an IF").toEqual({
      variables: [
        { name: "xs", paths: ["xs"], usedIn: ["for"], optional: false, required: true },
        { name: "t", paths: ["t"], usedIn: ["if"], optional: false, required: true },
        { name: "s", paths: ["s"], usedIn: ["output"], optional: false, required: true },
      ],
      filters: [{ name: "upper", count: 1 }],
      blocks: { FOR: 1, IF: 1 },
      diagnostics: [],
    });
    check("macros" in one, "no macros key").toBe(false);
    const two = analyzed("{{SET x = a}}\${{x}}{{IF b > 1}}y{{END_IF}}{{CASE b}}{{WHEN 1}}w{{END_CASE}}");
    check(two, "the analysis of a SET, an IF and a CASE").toEqual({
      variables: [
        { name: "a", paths: ["a"], usedIn: ["set"], optional: false, required: true },
        { name: "b", paths: ["b"], usedIn: ["if", "case"], optional: false, required: true },
      ],
      filters: [],
      blocks: { IF: 1, CASE: 1 },
      diagnostics: [],
    });
    check("macros" in two, "no macros key").toBe(false);
    check(analyzed("plain \${{a}}"), "plain text").toEqual({ variables: [{ name: "a", paths: ["a"], usedIn: ["output"], optional: false, required: true }], filters: [], blocks: {}, diagnostics: [] });
    check(analyzed(""), "the empty template").toEqual({ variables: [], filters: [], blocks: {}, diagnostics: [] });
  });
  it("mc-compat: validate of an unknown filter is still an error and a known one is ok", () => {
    check(validate("\${{s | nope}}"), "an unknown filter").toEqual({ ok: false, diagnostics: [{ severity: "error", code: "unknown-filter", message: "Unknown filter: nope", line: 1, column: 1 }] });
    check(validate("\${{s | upper}}"), "a known filter").toEqual({ ok: true, diagnostics: [] });
  });
  it.each(ENTRIES)("mc-compat: [%s] the words CALL f() and DEFINE g() outside a tag are plain text", (entry) => {
    check(run(entry, "CALL f() and DEFINE g() and END_DEFINE", DATA).output, "plain text").toBe("CALL f() and DEFINE g() and END_DEFINE");
  });
  it.each(ENTRIES)("mc-compat: [%s] a data name read after a FOR with the same item name is the data again", (entry) => {
    check(run(entry, "{{FOR items AS a}}\${{a.n}}{{END_FOR}}[\${{a}}]", DATA).output, "xy then A").toBe("xy[A]");
  });
});

// =====================================================================================
// review fixes: where a DEFINE may stand, what a trimming body counts, and finished list lines and table cells
// =====================================================================================

// ---- mc-define: a DEFINE that is not a direct child of the template is a syntax-error at the DEFINE ----

/** [label, text before the DEFINE, text after it]: containers that a ROW, a HEADER or a LIST_ITEM opens */
const PLACE_CONTAINERS: Array<[string, string, string]> = [
  ["a ROW at the top level", "{{ROW}}", "{{END_ROW}}"],
  ["a HEADER at the top level", "{{HEADER}}", "{{END_HEADER}}"],
  ["a ROW cell after other cells at the top level", "{{ROW}}a|", "{{END_ROW}}"],
  ["a ROW inside a TABLE", "{{TABLE}}{{ROW}}", "{{END_ROW}}{{END_TABLE}}"],
  ["a HEADER inside a TABLE", "{{TABLE}}{{HEADER}}", "{{END_HEADER}}{{END_TABLE}}"],
  ["a ROW cell after other cells inside a TABLE", "{{TABLE}}{{ROW}}a|", "{{END_ROW}}{{END_TABLE}}"],
  ["a ROW in a FOR inside a TABLE", "{{TABLE}}{{FOR xs AS x}}{{ROW}}", "{{END_ROW}}{{END_FOR}}{{END_TABLE}}"],
  ["a LIST_ITEM inside a LIST", "{{LIST}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_LIST}}"],
  ["a LIST_ITEM at the top level", "{{LIST_ITEM}}", "{{END_LIST_ITEM}}"],
];
const PLACE_ROWS: Row[] = PLACE_CONTAINERS.flatMap(([label, before, after]) =>
  [
    ["", ""],
    [" and a CALL after it", "{{CALL a()}}"],
  ].map(([suffixLabel, suffix]): Row => {
    const m = marked(`${before}§${def("a", "", "x")}${after}${suffix}`);
    return { name: `a DEFINE in ${label}${suffixLabel} is a syntax-error at the DEFINE, not an unknown macro`, tpl: m.tpl, data: DATA, want: ERR("syntax-error", m.line, m.col, undefined, "Unknown macro") };
  }),
);

describe("mc-define: a DEFINE in a ROW, a HEADER or a LIST_ITEM is a syntax-error at the DEFINE", () => {
  it.each(expand(PLACE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  const statics = PLACE_ROWS.flatMap((r) => (["validate", "analyze"] as const).map((kind) => ({ kind, r, name: r.name })));
  it.each(statics)("mc-define: [$kind] $name", ({ kind, r }) => {
    const want = r.want as Extract<Want, { err: string }>;
    verifyOutcome(runStatic(kind, r.tpl), ERR(want.err, want.line, want.col, undefined, want.lacks), `mc-define [${kind}] ${r.name}`);
  });
  it.each(ENTRIES)("mc-define: [%s] a top-level DEFINE after a top-level TABLE and between texts still works", (entry) => {
    const tpl = `a{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}b${def("a", "", "x")}c{{CALL a()}}{{LIST}}{{LIST_ITEM}}{{CALL a()}}{{END_LIST_ITEM}}{{END_LIST}}`;
    check(run(entry, tpl, DATA).output, `[${entry}] the table, the texts, the macro in text and in a LIST_ITEM`).toBe("a| 1 | 2 |bcx1. x");
  });
});

// ---- mc-compat and mc-output: the running output check counts only what a trimming body keeps ----

interface Sc {
  name: string;
  tpl: string;
  data: Record<string, any>;
  limits?: Partial<Limits>;
}
const V = "${{v}}";
const NL_TEXT = "x" + rep("\n", 30);
const BLANK_TEXT = rep(" ", 30);
const SPACE_TEXT = "x" + rep(" ", 30);
const PADDED_TEXT = rep(" ", 15) + "x" + rep(" ", 15);
const LINES_TEXT = rep("\n", 30) + "x";
const L20 = { maxOutputChars: 20 };
/** Where a variable sits inside a trimming body: [label, a function from the variable tag to the body] */
const TRIM_CTXS: Array<[string, (b: string) => string]> = [
  ["the body itself", (b) => b],
  ["an IF", (b) => `{{IF t}}${b}{{END_IF}}`],
  ["a CASE clause", (b) => `{{CASE b}}{{WHEN 2}}${b}{{END_CASE}}`],
  ["a FOR with one item", (b) => `{{FOR one AS i}}${b}{{END_FOR}}`],
  ["an IF in an IF", (b) => `{{IF t}}{{IF t}}${b}{{END_IF}}{{END_IF}}`],
];
const TRIM_SCENARIOS: Sc[] = TRIM_CTXS.flatMap(([label, w]): Sc[] => {
  const sc = (name: string, tpl: string, v: string, limits: Partial<Limits> = L20): Sc => ({ name: `${name} in ${label}`, tpl, data: { ...DATA, v }, limits });
  const section = (attrs = "") => `{{SECTION "T"${attrs}}}${w(V)}{{END_SECTION}}`;
  return [
    sc("a SECTION body with 30 trailing newlines, limit 20", section(), NL_TEXT),
    sc("a SECTION body of 30 blanks, limit 20", section(), BLANK_TEXT),
    sc("a SECTION body of 30 blanks with skip_empty=true, limit 20", section(" skip_empty=true"), BLANK_TEXT),
    sc("a SECTION body of 30 blanks with skip_empty=false, limit 20", section(" skip_empty=false"), BLANK_TEXT),
    sc("a LIST_ITEM with 30 trailing blanks, limit 20", `{{LIST}}{{LIST_ITEM}}${w(V)}{{END_LIST_ITEM}}{{END_LIST}}`, SPACE_TEXT),
    sc("a LIST_ITEM padded on both sides, limit 20", `{{LIST}}{{LIST_ITEM}}${w(V)}{{END_LIST_ITEM}}{{END_LIST}}`, PADDED_TEXT),
    sc("a ROW cell with 30 trailing blanks, limit 20", `{{TABLE}}{{ROW}}${w(V)}|b{{END_ROW}}{{END_TABLE}}`, SPACE_TEXT),
    sc("a ROW cell with 30 leading line breaks, limit 20", `{{TABLE}}{{ROW}}${w(V)}|b{{END_ROW}}{{END_TABLE}}`, LINES_TEXT),
    sc("a HEADER cell with 30 trailing blanks, limit 20", `{{TABLE}}{{HEADER}}${w(V)}{{END_HEADER}}{{END_TABLE}}`, SPACE_TEXT),
  ];
});
/** A trimmed body exactly at the limit renders and one more character does not */
const PAD_NL = rep("\n", 30) + rep("y", 10) + rep("\n", 30);
const PAD_SP = rep(" ", 30) + rep("y", 10) + rep(" ", 30);
const TRIM_EDGES: Sc[] = [
  { name: "a SECTION whose kept text fills the limit exactly", tpl: `{{SECTION "T"}}${V}{{END_SECTION}}`, data: { ...DATA, v: PAD_NL }, limits: { maxOutputChars: 17 } },
  { name: "a SECTION whose kept text is one character over the limit", tpl: `{{SECTION "T"}}${V}{{END_SECTION}}`, data: { ...DATA, v: PAD_NL }, limits: { maxOutputChars: 16 } },
  { name: "a LIST_ITEM whose kept text fills the limit exactly", tpl: `{{LIST}}{{LIST_ITEM}}${V}{{END_LIST_ITEM}}{{END_LIST}}`, data: { ...DATA, v: PAD_SP }, limits: { maxOutputChars: 13 } },
  { name: "a LIST_ITEM whose kept text is one character over the limit", tpl: `{{LIST}}{{LIST_ITEM}}${V}{{END_LIST_ITEM}}{{END_LIST}}`, data: { ...DATA, v: PAD_SP }, limits: { maxOutputChars: 12 } },
  { name: "a ROW cell whose kept text fills the limit exactly", tpl: `{{TABLE}}{{ROW}}${V}{{END_ROW}}{{END_TABLE}}`, data: { ...DATA, v: PAD_SP }, limits: { maxOutputChars: 14 } },
  { name: "a ROW cell whose kept text is one character over the limit", tpl: `{{TABLE}}{{ROW}}${V}{{END_ROW}}{{END_TABLE}}`, data: { ...DATA, v: PAD_SP }, limits: { maxOutputChars: 13 } },
];
/** The base output of each scenario above, in the guard notation (one text when the four entries agree) */
const TRIM_WANT: Record<string, string | string[]> = {
  "a SECTION body with 30 trailing newlines, limit 20 in the body itself": "## T\n\nx\n",
  "a SECTION body of 30 blanks, limit 20 in the body itself": "",
  "a SECTION body of 30 blanks with skip_empty=true, limit 20 in the body itself": "",
  "a SECTION body of 30 blanks with skip_empty=false, limit 20 in the body itself": "## T\n",
  "a LIST_ITEM with 30 trailing blanks, limit 20 in the body itself": "1. x",
  "a LIST_ITEM padded on both sides, limit 20 in the body itself": "1. x",
  "a ROW cell with 30 trailing blanks, limit 20 in the body itself": "| x | b |",
  "a ROW cell with 30 leading line breaks, limit 20 in the body itself": "| x | b |",
  "a HEADER cell with 30 trailing blanks, limit 20 in the body itself": "| x |\n|:-----|",
  "a SECTION body with 30 trailing newlines, limit 20 in an IF": "## T\n\nx\n",
  "a SECTION body of 30 blanks, limit 20 in an IF": "",
  "a SECTION body of 30 blanks with skip_empty=true, limit 20 in an IF": "",
  "a SECTION body of 30 blanks with skip_empty=false, limit 20 in an IF": "## T\n",
  "a LIST_ITEM with 30 trailing blanks, limit 20 in an IF": "1. x",
  "a LIST_ITEM padded on both sides, limit 20 in an IF": "1. x",
  "a ROW cell with 30 trailing blanks, limit 20 in an IF": "| x | b |",
  "a ROW cell with 30 leading line breaks, limit 20 in an IF": "| x | b |",
  "a HEADER cell with 30 trailing blanks, limit 20 in an IF": "| x |\n|:-----|",
  "a SECTION body with 30 trailing newlines, limit 20 in a CASE clause": "## T\n\nx\n",
  "a SECTION body of 30 blanks, limit 20 in a CASE clause": "",
  "a SECTION body of 30 blanks with skip_empty=true, limit 20 in a CASE clause": "",
  "a SECTION body of 30 blanks with skip_empty=false, limit 20 in a CASE clause": "## T\n",
  "a LIST_ITEM with 30 trailing blanks, limit 20 in a CASE clause": "1. x",
  "a LIST_ITEM padded on both sides, limit 20 in a CASE clause": "1. x",
  "a ROW cell with 30 trailing blanks, limit 20 in a CASE clause": "| x | b |",
  "a ROW cell with 30 leading line breaks, limit 20 in a CASE clause": "| x | b |",
  "a HEADER cell with 30 trailing blanks, limit 20 in a CASE clause": "| x |\n|:-----|",
  "a SECTION body with 30 trailing newlines, limit 20 in a FOR with one item": "!limit-output@1:16",
  "a SECTION body of 30 blanks, limit 20 in a FOR with one item": "!limit-output@1:16",
  "a SECTION body of 30 blanks with skip_empty=true, limit 20 in a FOR with one item": "!limit-output@1:32",
  "a SECTION body of 30 blanks with skip_empty=false, limit 20 in a FOR with one item": "!limit-output@1:33",
  "a LIST_ITEM with 30 trailing blanks, limit 20 in a FOR with one item": "!limit-output@1:22",
  "a LIST_ITEM padded on both sides, limit 20 in a FOR with one item": "!limit-output@1:22",
  "a ROW cell with 30 trailing blanks, limit 20 in a FOR with one item": "!limit-output@1:17",
  "a ROW cell with 30 leading line breaks, limit 20 in a FOR with one item": "!limit-output@1:17",
  "a HEADER cell with 30 trailing blanks, limit 20 in a FOR with one item": "!limit-output@1:20",
  "a SECTION body with 30 trailing newlines, limit 20 in an IF in an IF": "## T\n\nx\n",
  "a SECTION body of 30 blanks, limit 20 in an IF in an IF": "",
  "a SECTION body of 30 blanks with skip_empty=true, limit 20 in an IF in an IF": "",
  "a SECTION body of 30 blanks with skip_empty=false, limit 20 in an IF in an IF": "## T\n",
  "a LIST_ITEM with 30 trailing blanks, limit 20 in an IF in an IF": "1. x",
  "a LIST_ITEM padded on both sides, limit 20 in an IF in an IF": "1. x",
  "a ROW cell with 30 trailing blanks, limit 20 in an IF in an IF": "| x | b |",
  "a ROW cell with 30 leading line breaks, limit 20 in an IF in an IF": "| x | b |",
  "a HEADER cell with 30 trailing blanks, limit 20 in an IF in an IF": "| x |\n|:-----|",
  "a SECTION whose kept text fills the limit exactly": "## T\n\nyyyyyyyyyy\n",
  "a SECTION whose kept text is one character over the limit": "!limit-output@1:1",
  "a LIST_ITEM whose kept text fills the limit exactly": "1. yyyyyyyyyy",
  "a LIST_ITEM whose kept text is one character over the limit": "!limit-output@1:1",
  "a ROW cell whose kept text fills the limit exactly": "| yyyyyyyyyy |",
  "a ROW cell whose kept text is one character over the limit": "!limit-output@1:1",
};

// ---- mc-output: a finished LIST line and a finished TABLE cell or row count as soon as it finishes ----

const HUNDRED = Array.from({ length: 100 }, (_, i) => i);
const LI = (n: number): string => rep("{{LIST_ITEM}}{{CALL a()}}{{END_LIST_ITEM}}", n);
/** Bodies that hold 100 calls of the 100-character macro a: [label, template part] */
const FANOUTS: Array<[string, string]> = [
  ["100 LIST_ITEMs", `{{LIST}}${LI(100)}{{END_LIST}}`],
  ["100 LIST_ITEMs in a LIST in a LIST_ITEM", `{{LIST}}{{LIST_ITEM}}top{{LIST}}${LI(100)}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}`],
  ["LIST_ITEMs built by a FOR", "{{LIST}}{{FOR hundred AS i}}{{LIST_ITEM}}{{CALL a()}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}"],
  ["LIST_ITEMs built by a FOR in an IF", "{{LIST}}{{IF t}}{{FOR hundred AS i}}{{LIST_ITEM}}{{CALL a()}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}"],
  ["one ROW of 100 cells", `{{TABLE}}{{ROW}}${rep("{{CALL a()}}|", 100)}{{END_ROW}}{{END_TABLE}}`],
  ["100 ROWs", `{{TABLE}}${rep("{{ROW}}{{CALL a()}}|b{{END_ROW}}", 100)}{{END_TABLE}}`],
  ["a HEADER of 100 cells", `{{TABLE}}{{HEADER}}${rep("{{CALL a()}}|", 100)}{{END_HEADER}}{{ROW}}1{{END_ROW}}{{END_TABLE}}`],
  ["ROWs built by a FOR", "{{TABLE}}{{FOR hundred AS i}}{{ROW}}{{CALL a()}}|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}"],
  ["ROWs built by a FOR in an IF", "{{TABLE}}{{IF t}}{{FOR hundred AS i}}{{ROW}}{{CALL a()}}|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}"],
  ["rows written as text in a FOR of a TABLE", "{{TABLE}}{{FOR hundred AS i}}{{CALL a()}}|1\n{{END_FOR}}{{END_TABLE}}"],
  ["100 calls in one cell", `{{TABLE}}{{ROW}}${calls("a", 100)}|b{{END_ROW}}{{END_TABLE}}`],
];
const FANOUT_WRAPS: Array<[string, (c: string) => string]> = [
  ["the top level", (c) => c],
  ["an IF body", (c) => `{{IF t}}${c}{{END_IF}}`],
];
const FANOUT_ROWS = FANOUTS.flatMap(([label, part]) =>
  FANOUT_WRAPS.flatMap(([where, wrap]) => ENTRIES.map((entry) => ({ entry, name: `${label} at ${where}`, tpl: ADEF + wrap(part) }))),
);
const EXACT_LIST = Array.from({ length: 9 }, (_, i) => `${i + 1}. ${X100}`).join("\n");
const EXACT_TABLE = rep(`| ${X100} | b |\n`, 5).trimEnd();
const EXACT_ROWS = [
  { name: "9 LIST_ITEMs of 100 characters", tpl: ADEF + `{{LIST}}${LI(9)}{{END_LIST}}`, out: EXACT_LIST },
  { name: "5 ROWs with a cell of 100 characters", tpl: ADEF + "{{TABLE}}" + rep("{{ROW}}{{CALL a()}}|b{{END_ROW}}", 5) + "{{END_TABLE}}", out: EXACT_TABLE },
].flatMap((r) => ENTRIES.map((entry) => ({ ...r, entry })));

/** a 1,100,000-character leaf and nine levels that each call the one below twice: the text of the top call is over any string the engine can hold */
const HUGE_LEAF = rep("y", 1100000);
const HUGE_CHAIN =
  `{{DEFINE m0()}}${HUGE_LEAF}{{END_DEFINE}}` +
  Array.from({ length: 9 }, (_, i) => `{{DEFINE m${i + 1}()}}{{CALL m${i}()}}{{CALL m${i}()}}{{END_DEFINE}}`).join("") +
  "{{CALL m9()}}";

describe("mc-compat: a trimming body keeps the output it had before macros", () => {
  const all = [...TRIM_SCENARIOS, ...TRIM_EDGES];
  const cases = all.flatMap((sc) => ENTRIES.map((entry, i) => ({ entry, i, sc, name: sc.name })));
  it.each(cases)("mc-compat: [$entry] $name", ({ entry, i, sc }) => {
    const w = TRIM_WANT[sc.name];
    check(w !== undefined, `the base output of ${sc.name} is recorded`).toBe(true);
    guardCheck(run(entry, sc.tpl, sc.data, sc.limits), Array.isArray(w) ? w[i] : (w as string), `mc-compat [${entry}] ${sc.name}`);
  });
});

describe("mc-output: a trimming body still counts what a CALL printed", () => {
  const SPACES_MACRO = def("s", "", rep(" ", 100));
  const NEWLINES_MACRO = def("m", "", "x" + rep("\n", 30));
  const wraps: Array<[string, (c: string) => string]> = [
    ["a SECTION", (c) => `{{SECTION "T"}}${c}{{END_SECTION}}`],
    ["an IF in a SECTION", (c) => `{{SECTION "T"}}{{IF t}}${c}{{END_IF}}{{END_SECTION}}`],
    ["a CASE in a SECTION", (c) => `{{SECTION "T"}}{{CASE b}}{{WHEN 2}}${c}{{END_CASE}}{{END_SECTION}}`],
    ["a LIST_ITEM", (c) => `{{LIST}}{{LIST_ITEM}}${c}{{END_LIST_ITEM}}{{END_LIST}}`],
  ];
  const fan = wraps.flatMap(([label, wrap]) => ENTRIES.map((entry) => ({ entry, label, tpl: SPACES_MACRO + wrap(calls("s", 100)) })));
  it.each(fan)("mc-output: [$entry] 100 calls of a macro that prints 100 blanks in $label end in limit-output after about 11 calls", ({ entry, tpl }) => {
    const o = run(entry, tpl, DATA, OUT_LIMITS);
    check(o.code, `[${entry}] limit-output (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
    if (entry.startsWith("render")) check(o.iterations, `[${entry}] stats.iterations ${o.iterations} <= 22`).toBeLessThanOrEqual(22);
  });
  const trail = wraps.flatMap(([label, wrap]) => ENTRIES.map((entry) => ({ entry, label, tpl: NEWLINES_MACRO + wrap("{{CALL m()}}") })));
  it.each(trail)("mc-output: [$entry] a macro that prints 30 trailing line breaks in $label counts them in full: limit 20 is limit-output", ({ entry, tpl }) => {
    const o = run(entry, tpl, DATA, L20);
    check(o.code, `[${entry}] the call's whole text counts (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
  });
});

describe("mc-output: a finished list line, table cell and table row counts as it finishes", () => {
  it.each(FANOUT_ROWS)("mc-output: [$entry] $name end in limit-output after about 11 calls", ({ entry, tpl }) => {
    const o = run(entry, tpl, { ...DATA, hundred: HUNDRED }, OUT_LIMITS);
    check(o.code, `[${entry}] limit-output (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
    if (entry.startsWith("render")) check(o.iterations, `[${entry}] stats.iterations ${o.iterations} <= 22: the calls stop when the held text passes the limit`).toBeLessThanOrEqual(22);
  });
  it.each(EXACT_ROWS)("mc-output: [$entry] $name fill a limit exactly and render", ({ entry, tpl, out }) => {
    const o = run(entry, tpl, DATA, { maxOutputChars: out.length });
    check(o.code, `[${entry}] renders at the limit (got ${o.code} ${o.message ?? ""})`).toBe("ok");
    check(o.output, `[${entry}] the whole text`).toBe(out);
  });
  it.each(EXACT_ROWS)("mc-output: [$entry] $name are limit-output with a limit one under", ({ entry, tpl, out }) => {
    const o = run(entry, tpl, DATA, { maxOutputChars: out.length - 1 });
    check(o.code, `[${entry}] one character over the limit (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
  });
  it.each(RENDER)("mc-output: [%s] a text grown past what the engine can hold is limit-output, not limit-depth and not a thrown error", (entry) => {
    const r = render(HUGE_CHAIN, DATA, { strictMode: entry.endsWith("strict"), limits: { maxOutputChars: Number.MAX_SAFE_INTEGER } });
    check(r.ok, `[${entry}] render fails`).toBe(false);
    check(r.diagnostics[0]?.code, `[${entry}] a string past the engine maximum is limit-output (got ${r.diagnostics[0]?.code}: ${r.diagnostics[0]?.message})`).toBe("limit-output");
    check(r.output, `[${entry}] no output`).toBe("");
  });
});

// ---- mc-output and mc-compat: a legacy text row of a TABLE FOR counts each node as it finishes ----

const ROWTXT_DATA = { ...DATA, xs: [1] };
/** The row text of a TABLE FOR with 100 calls, in the shapes a legacy text row can take: [label, text] */
const ROWTXT_BODIES: Array<[string, string]> = [
  ["100 calls on one line", calls("a", 100)],
  ["100 calls with a pipe after each", rep("{{CALL a()}}|", 100)],
  ["100 calls mixed with text and variables", rep("t${{x}}{{CALL a()}}", 100)],
  ["100 calls in an IF in the FOR", `{{IF t}}${calls("a", 100)}{{END_IF}}`],
];
const ROWTXT_WRAPS: Array<[string, (c: string) => string]> = [
  ["the top level", (c) => c],
  ["an IF body", (c) => `{{IF t}}${c}{{END_IF}}`],
];
const ROWTXT_FAN = ROWTXT_BODIES.flatMap(([label, body]) =>
  ROWTXT_WRAPS.flatMap(([where, wrap]) =>
    ENTRIES.map((entry) => ({ entry, name: `${label} at ${where}`, tpl: ADEF + wrap(`{{TABLE}}{{FOR xs AS x}}${body}{{END_FOR}}{{END_TABLE}}`) })),
  ),
);
/** Rows that fill a limit exactly: 5 calls in one cell, and 1 call in each of 3 cells */
const ROWTXT_CELL5 = `| ${rep("x", 500)} |`;
const ROWTXT_CELL3 = `| ${X100} | ${X100} | ${X100} |`;
const ROWTXT_EXACT = [
  { name: "5 calls in one cell of a text row", body: calls("a", 5), out: ROWTXT_CELL5 },
  { name: "3 cells of a text row with a call each", body: "{{CALL a()}}|{{CALL a()}}|{{CALL a()}}", out: ROWTXT_CELL3 },
].flatMap((r) =>
  ROWTXT_WRAPS.flatMap(([where, wrap]) =>
    ENTRIES.map((entry) => ({ entry, name: `${r.name} at ${where}`, out: r.out, tpl: ADEF + wrap(`{{TABLE}}{{FOR xs AS x}}${r.body}{{END_FOR}}{{END_TABLE}}`) })),
  ),
);
/** Old templates, no CALL: [name, template, limits, the base output (the four entries agree; the error row pins the code only, the base located it at 1:10)] */
const ROWTXT_GUARDS: Array<[string, string, Partial<Limits> | undefined, string]> = [
  ["a Variable in a text row", "{{TABLE}}{{FOR xs AS x}}${{x}}|1\n{{END_FOR}}{{END_TABLE}}", undefined, "| b | 1 |\n| a | 1 |"],
  ["a Text in a text row", "{{TABLE}}{{FOR xs AS x}}k|1\n{{END_FOR}}{{END_TABLE}}", undefined, "| k | 1 |\n| k | 1 |"],
  ["a Set in a text row", "{{TABLE}}{{FOR xs AS x}}{{SET w = x}}${{w}}|1\n{{END_FOR}}{{END_TABLE}}", undefined, "| b | 1 |\n| a | 1 |"],
  ["a Comment in a text row", "{{TABLE}}{{FOR xs AS x}}{{# note #}}${{x}}|1\n{{END_FOR}}{{END_TABLE}}", undefined, "| b | 1 |\n| a | 1 |"],
  ["a pipe line in a text row", "{{TABLE}}{{FOR xs AS x}}a | ${{x}} | c\n{{END_FOR}}{{END_TABLE}}", undefined, "| a | b | c |\n| a | a | c |"],
  ["multi-line text in a text row", "{{TABLE}}{{FOR xs AS x}}p${{x}}|1\nq|2\n{{END_FOR}}{{END_TABLE}}", undefined, "| pb | 1 |\n| q | 2 |\n| pa | 1 |\n| q | 2 |"],
  ["a text row in an IF in the FOR", "{{TABLE}}{{FOR xs AS x}}{{IF t}}${{x}}|1\n{{END_IF}}{{END_FOR}}{{END_TABLE}}", undefined, "| b | 1 |\n| a | 1 |"],
  ["a trailing-blank body at limit 30", "{{TABLE}}{{FOR xs AS x}}${{x}}|1   \n\n   {{END_FOR}}{{END_TABLE}}", { maxOutputChars: 30 }, "| b | 1 |\n| a | 1 |"],
  ["a trailing-blank body at limit 19, the exact size", "{{TABLE}}{{FOR xs AS x}}${{x}}|1   \n\n   {{END_FOR}}{{END_TABLE}}", { maxOutputChars: 19 }, "| b | 1 |\n| a | 1 |"],
  ["a trailing-blank body at limit 18, one under", "{{TABLE}}{{FOR xs AS x}}${{x}}|1   \n\n   {{END_FOR}}{{END_TABLE}}", { maxOutputChars: 18 }, "!limit-output@1:1"],
  ["a long text row at limit 20", "{{TABLE}}{{FOR xs AS x}}${{x}}|0123456789012345678901234567890\n{{END_FOR}}{{END_TABLE}}", { maxOutputChars: 20 }, "!limit-output@*:*"],
  ["a padded text row at limit 20", "{{TABLE}}{{FOR xs AS x}}                    ${{x}}|1                    {{END_FOR}}{{END_TABLE}}", { maxOutputChars: 20 }, "| b | 1 |\n| a | 1 |"],
];

describe("mc-output: a legacy text row of a TABLE FOR counts each node as it finishes", () => {
  it.each(ROWTXT_FAN)("mc-output: [$entry] $name end in limit-output after about 11 calls", ({ entry, tpl }) => {
    const o = run(entry, tpl, ROWTXT_DATA, OUT_LIMITS);
    check(o.code, `[${entry}] limit-output (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
    if (entry.startsWith("render")) check(o.iterations, `[${entry}] stats.iterations ${o.iterations} <= 22: the calls stop when the held text passes the limit`).toBeLessThanOrEqual(22);
  });
  it.each(ROWTXT_EXACT)("mc-output: [$entry] $name fill a limit exactly and render", ({ entry, tpl, out }) => {
    const o = run(entry, tpl, ROWTXT_DATA, { maxOutputChars: out.length });
    check(o.code, `[${entry}] renders at the limit (got ${o.code} ${o.message ?? ""})`).toBe("ok");
    check(o.output, `[${entry}] the whole row`).toBe(out);
  });
  it.each(ROWTXT_EXACT)("mc-output: [$entry] $name are limit-output with a limit one under", ({ entry, tpl, out }) => {
    const o = run(entry, tpl, ROWTXT_DATA, { maxOutputChars: out.length - 1 });
    check(o.code, `[${entry}] one character over the limit (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
  });
});

describe("mc-compat: legacy text rows of a TABLE FOR keep their output", () => {
  const cases = ROWTXT_GUARDS.flatMap(([name, tpl, limits, want]) => ENTRIES.map((entry) => ({ entry, name, tpl, limits, want })));
  it.each(cases)("mc-compat: [$entry] $name", ({ entry, name, tpl, limits, want }) => {
    guardCheck(run(entry, tpl, { xs: ["b", "a"], t: true }, limits), want, `mc-compat [${entry}] ${name}`);
  });
});
