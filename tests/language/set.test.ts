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

// {{SET name = expression}} binds a block-scoped local from the value evaluator that ${{ }} uses. Every row below runs in
// all four entries (render and resolve, strict and lenient) unless it names its own. Ids: st-set st-math st-scope
// st-null st-names st-single st-ws st-analyze st-keywords st-size st-openapi st-compat.

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
}

type RunOptions = Record<string, any>;

function run(entry: Entry, template: string, data: Record<string, any>, limits?: Partial<Limits>, opts?: RunOptions): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode, limits, ...opts });
      if (r.ok) return { code: "ok", output: r.output, iterations: r.stats.iterations };
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
function runStatic(kind: "validate" | "analyze", template: string): Outcome {
  try {
    if (kind === "validate") {
      const r = validate(template);
      if (r.ok) return { code: "ok" };
      const d = (r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0]) as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message };
    }
    const a = analyze(template);
    const d = a.diagnostics[0] as any;
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, message: d.message };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

/** analyze, with a thrown TemplateError turned into a failed assertion that says what was thrown. */
function analyzed(tpl: string) {
  try {
    return analyze(tpl);
  } catch (e) {
    check(`${(e as any)?.code}: ${(e as Error)?.message}`, `analyze accepts ${JSON.stringify(tpl)}`).toBe("ok");
    throw e;
  }
}

/** resolveTemplate, with a thrown TemplateError turned into a failed assertion that says what was thrown. */
function resolved(tpl: string, data: Map<string, any>, options: RunOptions): string {
  try {
    return resolveTemplate(tpl, data, options);
  } catch (e) {
    check(`${(e as any)?.code}: ${(e as Error)?.message}`, `resolveTemplate renders ${JSON.stringify(tpl)}`).toBe("ok");
    throw e;
  }
}

type Want = { out: string } | { err: string; line: number; col: number; has?: string; lacks?: string };
type Wants = Want | { strict: Want; lenient: Want };
const OUT = (out: string): Want => ({ out });
const ERR = (err: string, line: number, col: number, has?: string, lacks?: string): Want => ({ err, line, col, has, lacks });
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
}

function verifyOutcome(o: Outcome, want: Want, label: string): void {
  if ("err" in want) {
    check(o.code, `${label}: expects the error ${want.err} (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe(want.err);
    check({ line: o.line, column: o.column }, `${label}: located at ${want.line}:${want.col}`).toEqual({ line: want.line, column: want.col });
    if (want.has) check(o.message ?? "", `${label}: the message holds ${JSON.stringify(want.has)}`).toContain(want.has);
    if (want.lacks) check((o.message ?? "").includes(want.lacks), `${label}: the message is not ${JSON.stringify(want.lacks)}, the tag is known (got ${o.message ?? ""})`).toBe(false);
    return;
  }
  check(o.code, `${label}: renders without an error (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
  check(o.output, `${label}: renders ${JSON.stringify(want.out)}`).toBe(want.out);
}

function verify(entry: Entry, r: Row, id: string): void {
  const o = run(entry, r.tpl, r.data, r.limits, r.opts);
  verifyOutcome(o, pick(r.want, entry), `${id} [${entry}] ${r.name}`);
}

function expand(rows: Row[]) {
  return rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
}

/** A hand-written row with a § in the template at the place where the error is located. */
function marked(tplMarked: string): { tpl: string; line: number; col: number } {
  const i = tplMarked.indexOf("§");
  const before = tplMarked.slice(0, i);
  return { tpl: tplMarked.replace("§", ""), line: before.split("\n").length, col: before.length - (before.lastIndexOf("\n") + 1) + 1 };
}

// ---- data: the probe data of the unmodified code, plus a few names for the scope rows ----

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(5);
const PROBE: Record<string, any> = {
  a: "A", b: 2, n: 5, zero: 0, f: false, nul: null, empty: "", s: "hello world", xs: ["b", "a", "b"],
  o: { k: "v", n: { d: 1 } }, cyc, big, long: "x".repeat(30), price: 0.1, q: 0.2, items: [{ n: "x" }, { n: "y" }],
};
const DATA: Record<string, any> = { ...PROBE, t: true, e: [], ys: ["p", "q"] };

function row(name: string, tpl: string, want: Wants, extra: Partial<Row> = {}): Row {
  return { name, tpl, want, ...extra, data: { ...DATA, ...(extra.data ?? {}) } };
}
/** An error located at the § mark in strict mode; lenient gives `lenient` ("same" keeps the error). */
function mrow(name: string, tplMarked: string, code: string, has: string | undefined, lenient: string | "same", extra: Partial<Row> = {}): Row {
  const m = marked(tplMarked);
  const err = ERR(code, m.line, m.col, has);
  return { name, tpl: m.tpl, data: DATA, want: SL(err, lenient === "same" ? err : OUT(lenient)), ...extra };
}
/** A name read where it is no longer (or not yet) bound: a missing variable in strict mode, empty in lenient mode. */
function leak(name: string, tplMarked: string, lenientOut: string, extra: Partial<Row> = {}): Row {
  return mrow(name, tplMarked, "missing-variable", "'x'", lenientOut, extra);
}
/** The error is the same in every mode. */
function always(name: string, tplMarked: string, code: string, has?: string, extra: Partial<Row> = {}): Row {
  return mrow(name, tplMarked, code, has, "same", extra);
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

/** The message an unknown tag gives; a SET tag is known, so its syntax errors never say this. */
const UNKNOWN_TAG = "Unknown template tag";
const V = (expr: string) => "{{SET x = " + expr + "}}[${{x}}]";

// =====================================================================================
// st-set: the value is kept and the evaluator is the one of ${{ }}
// =====================================================================================

const VALUE_CASES: Array<[string, string]> = [
  // literals
  ['"text"', "[text]"],
  ["'text'", "[text]"],
  ['"a ?? b"', "[a ?? b]"],
  ['"a | b"', "[a | b]"],
  ['"a.b"', "[a.b]"],
  ['"a + b"', "[a + b]"],
  ['"a}b"', "[a}b]"],
  ['""', "[]"],
  ["5", "[5]"],
  ["-3", "[-3]"],
  ["1.50", "[1.5]"],
  ["0", "[0]"],
  ["true", "[true]"],
  ["false", "[false]"],
  ["null", "[]"],
  ['"a b" | upper', "[A B]"],
  ['"abcdef" | head=2', "[ab]"],
  ['"v" ?? "d"', "[v]"],
  ['"" ?? "d"', "[d]"],
  ['null ?? "d"', "[d]"],
  // paths
  ["a", "[A]"],
  ["b", "[2]"],
  ["zero", "[0]"],
  ["f", "[false]"],
  ["nul", "[]"],
  ["empty", "[]"],
  ["o.k", "[v]"],
  ["o.n.d", "[1]"],
  ["o.nope", "[]"],
  ["xs.1", "[a]"],
  ["xs.length", "[3]"],
  ["o", '[{"k":"v","n":{"d":1}}]'],
  ["xs", '[["b","a","b"]]'],
  // filters
  ["s | upper", "[HELLO WORLD]"],
  ["s | upper | head=5", "[HELLO]"],
  ["xs | sort", '[["a","b","b"]]'],
  ['xs | unique | join="-"', "[b-a]"],
  ["xs | length", "[3]"],
  ["o | json", '[{"k":"v","n":{"d":1}}]'],
  ["s | json", '["hello world"]'],
  // defaults
  ['missing ?? "d"', "[d]"],
  ['a ?? "d"', "[A]"],
  ['empty ?? "d"', "[d]"],
  ['zero ?? "d"', "[d]"],
  ['f ?? "d"', "[d]"],
  ['nul ?? "d"', "[d]"],
  // math that does not depend on the mode
  ["2 * 3", "[6]"],
  ["b + n", "[7]"],
  ["n / 2", "[2.5]"],
];
const SET_ROWS: Row[] = VALUE_CASES.map(([expr, out]) => row(`SET x = ${expr} binds the value and \${{x}} prints it`, V(expr), OUT(out)));

const KEPT_ROWS: Row[] = [
  row("an array stays an array: a FOR walks a SET of xs | sort", "{{SET l = xs | sort}}{{FOR l AS i}}${{i}}{{END_FOR}}", OUT("abb")),
  row("a FOR over a SET array takes limit, offset and @total of the array", "{{SET l = xs}}{{FOR l AS i limit=2 offset=1}}${{i}}${{@total}}{{END_FOR}}", OUT("a2b2")),
  row("an array of objects stays walkable", "{{SET l = items}}{{FOR l AS i}}${{i.n}}${{@index1}} {{END_FOR}}", OUT("x1 y2 ")),
  row("a SET of a SET: the second reads the array of the first", "{{SET l = xs}}{{SET m = l | length}}${{m}}", OUT("3")),
  row("a path into a SET array", "{{SET l = xs}}${{l.1}}${{l.length}}", OUT("a3")),
  row("a path into a SET object", "{{SET c = o}}${{c.k}}${{c.n.d}}", OUT("v1")),
  row("an object keeps its paths after a filter chain on another name", "{{SET c = o}}{{SET j = c | json}}${{j}}", OUT('{"k":"v","n":{"d":1}}')),
  row("a number stays a number in a condition", "{{SET c = n}}{{IF c > 3}}y{{ELSE}}n{{END_IF}}", OUT("y")),
  row("a boolean false stays false in a condition", "{{SET c = f}}{{IF c}}y{{ELSE}}n{{END_IF}}", OUT("n")),
  row("the literal true is true in a condition", "{{SET c = true}}{{IF c}}y{{ELSE}}n{{END_IF}}", OUT("y")),
  row("the literal null is false in a condition", "{{SET c = null}}{{IF c}}y{{ELSE}}n{{END_IF}}", OUT("n")),
  row("a SET of a present null is bound and false", "{{SET c = nul}}{{IF c}}y{{ELSE}}n{{END_IF}}[${{c}}]", OUT("n[]")),
  row("a SET number is compared as a number", "{{SET c = 2}}{{IF c == b}}y{{ELSE}}n{{END_IF}}", OUT("y")),
  row("SET x = x + 1 reads the old data value, then binds", "{{SET x = x + 1}}${{x}}", OUT("2"), { data: { x: 1 } }),
  row("SET x = x + 1 reads the earlier SET", "{{SET x = 1}}{{SET x = x + 1}}${{x}}", OUT("2")),
  row("SET x = x | upper reads the data text", "{{SET x = x | upper}}${{x}}", OUT("D"), { data: { x: "d" } }),
  row("a SET text is a plain text: it prints as it is", '{{SET x = "a|b"}}${{x}}', OUT("a|b")),
  row("binding a cyclic value with no filter is fine", "{{SET c = cyc}}[ok]", OUT("[ok]")),
  row("binding a BigInt with no filter is fine", "{{SET c = big}}[ok]", OUT("[ok]")),
  row("a BigInt through length binds a number", "{{SET c = big | length}}[${{c}}]", OUT("[1]")),
  always("a bound cyclic value printed later is the type-error of ${{cyc}}, at the printing tag", "a\n{{SET c = cyc}}x§${{c}}", "type-error"),
  always("a bound BigInt printed later is a type-error at the printing tag", "a\n{{SET c = big}}x§${{c}}", "type-error"),
  always("a bound cyclic value through json is the cyclic type-error at the printing tag", "a\n{{SET c = cyc}}x§${{c | json}}", "type-error", "cyclic"),
];

// The same pieces give the same code and message in SET x = <expr> as in ${{<expr>}}, located at the SET tag.
// codes: render strict, render lenient, resolve strict, resolve lenient
interface ExprCase {
  expr: string;
  codes: [string, string, string, string];
}
const MV = "missing-variable";
const UF = "unknown-filter";
const TE = "type-error";
const EXPR_CASES: ExprCase[] = [
  { expr: "missing", codes: [MV, "ok", MV, "ok"] },
  { expr: "missing.deep", codes: [MV, "ok", MV, "ok"] },
  { expr: "missing + 1", codes: [MV, "ok", MV, "ok"] },
  { expr: "n + missing", codes: [MV, "ok", MV, "ok"] },
  { expr: "a + 1", codes: [MV, "ok", MV, "ok"] },
  { expr: "s | nope", codes: [UF, UF, UF, UF] },
  { expr: "s | upper | nope", codes: [UF, UF, UF, UF] },
  { expr: "missing | nope", codes: [MV, UF, MV, UF] },
  { expr: "s | head=x", codes: [TE, TE, TE, TE] },
  { expr: "s | head", codes: [TE, TE, TE, TE] },
  { expr: "cyc | upper", codes: [TE, TE, TE, TE] },
  { expr: "big | upper", codes: [TE, TE, TE, TE] },
  { expr: "cyc | json", codes: [TE, TE, TE, TE] },
  { expr: "n / 0", codes: [TE, TE, "ok", "ok"] },
  { expr: "n % 0", codes: [TE, TE, "ok", "ok"] },
  { expr: "o.nope", codes: ["ok", "ok", "ok", "ok"] },
  { expr: "big | length", codes: ["ok", "ok", "ok", "ok"] },
];
const normalizeMessage = (m?: string) => (m ?? "").replace(/\(line \d+, col \d+\)/g, "(line L, col C)").replace(/\s+/g, " ").trim();

describe("st-set: SET binds a value from the evaluator of ${{ }}", () => {
  it.each(expand(SET_ROWS))("st-set: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-set"));
  it.each(expand(KEPT_ROWS))("st-set: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-set"));

  const exprCases = EXPR_CASES.flatMap((c) => ENTRIES.map((entry, i) => ({ entry, expr: c.expr, want: c.codes[i] })));
  it.each(exprCases)("st-set: [$entry] SET x = $expr gives the code, message and place of the same text in ${{ }}", (c) => {
    const printed = marked("a\n  §${{" + c.expr + "}}");
    const bound = marked("a\n  §{{SET x = " + c.expr + "}}[${{x}}]");
    const base = run(c.entry, printed.tpl, DATA);
    check(base.code, `[${c.entry}] \${{ ${c.expr} }} itself gives ${c.want}`).toBe(c.want);
    const o = run(c.entry, bound.tpl, DATA);
    check(o.code, `[${c.entry}] SET x = ${c.expr} gives ${c.want} (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe(c.want);
    if (c.want === "ok") return;
    check({ line: o.line, column: o.column }, `[${c.entry}] the error is located at the SET tag`).toEqual({ line: bound.line, column: bound.col });
    check(normalizeMessage(o.message), `[${c.entry}] the message is the one of \${{ ${c.expr} }}`).toBe(normalizeMessage(base.message));
  });

  it("st-set: validate and analyze accept a template made of SET tags", () => {
    for (const tpl of ["{{SET x = 1}}${{x}}", '{{SET x = "a" | upper}}', "{{IF t}}{{SET x = a ?? \"d\"}}{{END_IF}}", "{{SET x = 0.1 + 0.2}}"]) {
      check(runStatic("validate", tpl).code, `validate accepts ${tpl}`).toBe("ok");
      check(runStatic("analyze", tpl).code, `analyze accepts ${tpl}`).toBe("ok");
    }
  });
});

// =====================================================================================
// st-math: the number a SET binds in render is the number the output prints
// =====================================================================================

const MATH_ROWS: Row[] = [
  row("render: 0.1 + 0.2 binds 0.3 and prints it", "{{SET t = 0.1 + 0.2}}[${{t}}]", OUT("[0.3]"), { entries: RENDER }),
  row("render: the bound 0.3 equals the literal 0.3 in a condition", "{{SET t = 0.1 + 0.2}}{{IF t == 0.3}}y{{ELSE}}n{{END_IF}}", OUT("y"), { entries: RENDER }),
  row("render: price + q binds 0.3, prints and compares it", "{{SET t = price + q}}[${{t}}]{{IF t == 0.3}}y{{ELSE}}n{{END_IF}}", OUT("[0.3]y"), { entries: RENDER }),
  row("render: the SET prints what ${{0.1 + 0.2}} prints", "{{SET t = 0.1 + 0.2}}${{t}}|${{0.1 + 0.2}}", OUT("0.3|0.3"), { entries: RENDER }),
  row("render: a filter after math is ignored as before", "{{SET t = price + q | round=1}}[${{t}}]", OUT("[0.3]"), { entries: RENDER }),
  row("render: a default after math is ignored as before", '{{SET t = price + q ?? "d"}}[${{t}}]', OUT("[0.3]"), { entries: RENDER }),
  row("render: a bound result takes part in later math", "{{SET t = 0.1 + 0.2}}{{SET u = t + 1}}[${{u}}]", OUT("[1.3]"), { entries: RENDER }),
  row("resolve: 0.1 + 0.2 keeps the plain number", "{{SET t = 0.1 + 0.2}}[${{t}}]", OUT("[0.30000000000000004]"), { entries: RESOLVE }),
  row("resolve: the SET prints what ${{0.1 + 0.2}} prints", "{{SET t = 0.1 + 0.2}}${{t}}|${{0.1 + 0.2}}", OUT("0.30000000000000004|0.30000000000000004"), { entries: RESOLVE }),
  row("resolve: the plain bound number is not 0.3 in a condition", "{{SET t = price + q}}{{IF t == 0.3}}y{{ELSE}}n{{END_IF}}", OUT("n"), { entries: RESOLVE }),
  row("resolve: price + q keeps the plain number", "{{SET t = price + q}}[${{t}}]", OUT("[0.30000000000000004]"), { entries: RESOLVE }),
  row("resolve: a filter after math is ignored as before", "{{SET t = price + q | round=1}}[${{t}}]", OUT("[0.30000000000000004]"), { entries: RESOLVE }),
  row("an integer result is the same everywhere", "{{SET t = b + n}}[${{t}}]", OUT("[7]")),
  row("a division with a fraction", "{{SET t = n / 2}}[${{t}}]", OUT("[2.5]")),
  row("a product of two literals", "{{SET t = 2 * 3}}[${{t}}]", OUT("[6]")),
  row("a literal start with a path", "{{SET t = 2 * b}}[${{t}}]", OUT("[4]")),
];
const MATH_ERROR_ROWS: Row[] = [
  always("render: 1 / 0 is the divide-by-zero type-error at the SET", "a\n  §{{SET z = 1 / 0}}[${{z}}]", "type-error", "Cannot divide by zero", { entries: RENDER }),
  always("render: n / 0 is the divide-by-zero type-error at the SET", "a\n  §{{SET z = n / 0}}[${{z}}]", "type-error", "Cannot divide by zero", { entries: RENDER }),
  always("render: n % 0 is the remainder type-error at the SET", "a\n  §{{SET z = n % 0}}[${{z}}]", "type-error", "remainder", { entries: RENDER }),
  row("resolve: n / 0 binds the number ${{n / 0}} prints", "{{SET z = n / 0}}[${{z}}]", OUT("[Infinity]"), { entries: RESOLVE }),
  row("resolve: 1 / 0 binds the number ${{1 / 0}} prints", "{{SET z = 1 / 0}}[${{z}}]", OUT("[Infinity]"), { entries: RESOLVE }),
  row("resolve: n % 0 binds the number ${{n % 0}} prints", "{{SET z = n % 0}}[${{z}}]", OUT("[NaN]"), { entries: RESOLVE }),
  mrow("a math text with a missing name: strict missing-variable at the SET, lenient binds null", "a\n  §{{SET m = missing + 1}}[${{m}}]", MV, "missing + 1", "a\n  []"),
  mrow("a math text that is not a number is the same error as ${{a + 1}}", "a\n  §{{SET m = a + 1}}[${{m}}]", MV, "a + 1", "a\n  []"),
];

describe("st-math: the SET number is the number the output prints", () => {
  it.each(expand(MATH_ROWS))("st-math: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-math"));
  it.each(expand(MATH_ERROR_ROWS))("st-math: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-math"));
});

// =====================================================================================
// st-null: a missing value binds null in lenient mode and is an error in strict mode
// =====================================================================================

const NULL_ROWS: Row[] = [
  mrow("a missing name: strict error at the SET (never 1:1), lenient binds null and prints empty", "a\n  §{{SET x = missing}}[${{x}}]", MV, "'missing'", "a\n  []"),
  mrow("a missing name in a SET after other text keeps the SET position", "line one\nline two {{SET y = 1}}§{{SET x = missing}}[${{x}}]", MV, "'missing'", "line one\nline two []"),
  row("lenient: the bound null is not a missing variable and IF x is false", "{{SET x = missing}}{{IF x}}y{{ELSE}}n{{END_IF}}[${{x}}]", SL(ERR("missing-variable", 1, 1, "'missing'"), OUT("n[]"))),
  row("lenient: a bound null read again later is still found", "{{SET x = missing}}[${{x}}][${{x}}]{{SET y = x}}[${{y}}]", SL(ERR("missing-variable", 1, 1, "'missing'"), OUT("[][][]"))),
  row("SET x = missing ?? \"d\" binds d in every mode", '{{SET x = missing ?? "d"}}[${{x}}]', OUT("[d]")),
  mrow("a missing name with a filter: strict error, lenient binds null", "a\n  §{{SET x = missing | upper}}[${{x}}]", MV, "'missing'", "a\n  []"),
  mrow("a missing dotted name: strict error, lenient binds null", "a\n  §{{SET x = missing.deep}}[${{x}}]", MV, "'missing'", "a\n  []"),
  row("a present null is bound in every mode", "{{SET x = nul}}[${{x}}]{{IF x}}y{{ELSE}}n{{END_IF}}", OUT("[]n")),
  row("a present null takes the default", '{{SET x = nul}}{{SET y = x ?? "d"}}[${{y}}]', OUT("[d]")),
  row("a bound zero is printed and is not a default", '{{SET x = zero}}{{SET y = x}}[${{y}}]', OUT("[0]")),
  row("a bound empty text prints empty and takes a default", '{{SET x = empty}}[${{x}}]{{SET y = x ?? "d"}}[${{y}}]', OUT("[][d]")),
  row("a bound false prints false", "{{SET x = f}}[${{x}}]", OUT("[false]")),
  row("a missing leaf of a present object is empty, not an error", "{{SET x = o.k.zz}}[${{x}}]", OUT("[]")),
  row("a lenient null takes a default on the next SET", '{{SET x = missing}}{{SET y = x ?? "d"}}[${{y}}]', SL(ERR("missing-variable", 1, 1, "'missing'"), OUT("[d]"))),
  row("a SET x = x + 1 with no x: strict error at the SET naming the text, lenient null", "{{SET x = x + 1}}[${{x}}]", SL(ERR("missing-variable", 1, 1, "x + 1"), OUT("[]")), { data: {} }),
];

describe("st-null: missing values", () => {
  it.each(expand(NULL_ROWS))("st-null: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-null"));
});

// =====================================================================================
// st-scope: a SET lives from its tag to the end of its block
// =====================================================================================

const SCOPE_ROWS: Row[] = [
  // top level and data
  row("top level: visible from the tag on", V('"a"'), OUT("[a]")),
  row("a read before the tag is the data", '[${{x}}]{{SET x = "a"}}[${{x}}]', OUT("[D][a]"), { data: { x: "D" } }),
  leak("a read before the tag with no data is a missing name", '[§${{x}}]{{SET x = "a"}}[${{x}}]', "[][a]"),
  row("a SET shadows data of the same name", '{{SET x = "S"}}[${{x}}]', OUT("[S]"), { data: { x: "D" } }),
  row("rebinding in the same block overwrites", "{{SET x = 1}}{{SET x = 2}}[${{x}}]", OUT("[2]")),
  row("a SET of another name leaves the data name alone", '{{SET y = "S"}}[${{x}}]', OUT("[D]"), { data: { x: "D" } }),
  // IF, ELSEIF, ELSE
  row("IF: visible inside its branch", '{{IF t}}{{SET x = "i"}}[${{x}}]{{END_IF}}', OUT("[i]")),
  leak("IF: not visible after END_IF", '{{IF t}}{{SET x = "i"}}[${{x}}]{{END_IF}}[§${{x}}]', "[i][]"),
  leak("ELSEIF: not visible after END_IF", '{{IF f}}n{{ELSEIF b > 1}}{{SET x = "e"}}[${{x}}]{{END_IF}}[§${{x}}]', "[e][]"),
  leak("ELSE: not visible after END_IF", '{{IF f}}n{{ELSE}}{{SET x = "e"}}[${{x}}]{{END_IF}}[§${{x}}]', "[e][]"),
  leak("a branch SET is not visible in a sibling branch that renders", '{{IF f}}{{SET x = "i"}}{{ELSE}}[§${{x}}]{{END_IF}}', "[]"),
  row("a SET at the top is visible in the branch", '{{SET x = "T"}}{{IF t}}[${{x}}]{{END_IF}}', OUT("[T]")),
  row("a SET at the top is visible in an ELSE branch", '{{SET x = "T"}}{{IF f}}n{{ELSE}}[${{x}}]{{END_IF}}', OUT("[T]")),
  row("rebinding in a branch ends with the branch: the outer value is back", '{{SET x = "o"}}{{IF t}}{{SET x = "i"}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[i][o]")),
  row("rebinding two blocks deep ends one block at a time", '{{SET x = "a"}}{{IF t}}{{SET x = "b"}}{{IF t}}{{SET x = "c"}}[${{x}}]{{END_IF}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[c][b][a]")),
  row("rebinding in an ELSEIF branch ends with it", '{{SET x = "o"}}{{IF f}}n{{ELSEIF t}}{{SET x = "e"}}[${{x}}]{{ELSE}}{{SET x = "z"}}{{END_IF}}[${{x}}]', OUT("[e][o]")),
  row("an IF branch rebinding reads the outer value first", '{{SET x = "o"}}{{IF t}}{{SET x = x | upper}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[O][o]")),
  row("a SET shadowing data in a branch leaves the data after the branch", '{{IF t}}{{SET x = "S"}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[S][D]"), { data: { x: "D" } }),
  // CASE
  row("WHEN: visible inside its clause", '{{CASE b}}{{WHEN 2}}{{SET x = "w"}}[${{x}}]{{DEFAULT}}d{{END_CASE}}', OUT("[w]")),
  leak("WHEN: not visible after END_CASE", '{{CASE b}}{{WHEN 2}}{{SET x = "w"}}[${{x}}]{{DEFAULT}}d{{END_CASE}}[§${{x}}]', "[w][]"),
  row("DEFAULT: visible inside its clause", '{{CASE b}}{{WHEN 9}}n{{DEFAULT}}{{SET x = "d"}}[${{x}}]{{END_CASE}}', OUT("[d]")),
  leak("DEFAULT: not visible after END_CASE", '{{CASE b}}{{WHEN 9}}n{{DEFAULT}}{{SET x = "d"}}[${{x}}]{{END_CASE}}[§${{x}}]', "[d][]"),
  row("a SET at the top is visible in a clause", '{{SET x = "T"}}{{CASE b}}{{WHEN 2}}[${{x}}]{{END_CASE}}', OUT("[T]")),
  row("rebinding in a clause ends with the clause", '{{SET x = "o"}}{{CASE b}}{{WHEN 2}}{{SET x = "w"}}[${{x}}]{{END_CASE}}[${{x}}]', OUT("[w][o]")),
  // FOR
  row("a FOR body can read the loop item into a SET", "{{FOR xs AS i limit=2}}{{SET u = i | upper}}${{u}}{{END_FOR}}", OUT("BA")),
  row("a FOR body binds fresh each iteration: the read before the SET is the data every time", "{{FOR xs AS i}}[${{x}}]{{SET x = i}}[${{x}}]{{END_FOR}}", OUT("[D][b][D][a][D][b]"), { data: { x: "D" } }),
  leak("a FOR body binds fresh each iteration: iteration two does not see the SET of iteration one", "{{FOR xs AS i}}[§${{x}}]{{SET x = i}}{{END_FOR}}", "[][][]"),
  leak("a SET in a FOR body does not leak after END_FOR", "{{FOR xs AS i}}{{SET x = i}}{{END_FOR}}[§${{x}}]", "[]"),
  leak("the ELSE body of a FOR is its own block: a SET in it does not leak", '{{FOR e AS i}}b{{ELSE}}{{SET x = "z"}}[${{x}}]{{END_FOR}}[§${{x}}]', "[z][]"),
  row("a SET at the top is visible in every FOR iteration", '{{SET x = "T"}}{{FOR xs AS i limit=2}}[${{x}}${{i}}]{{END_FOR}}', OUT("[Tb][Ta]")),
  row("a SET at the top is visible in the ELSE body of a FOR", '{{SET x = "T"}}{{FOR e AS i}}b{{ELSE}}[${{x}}]{{END_FOR}}', OUT("[T]")),
  row("rebinding in a FOR body ends with each iteration", '{{SET x = "o"}}{{FOR xs AS i limit=2}}{{SET x = i}}[${{x}}]{{END_FOR}}[${{x}}]', OUT("[b][a][o]")),
  row("a SET in a nested FOR ends with the inner loop and the outer value is back", "{{FOR xs AS i limit=2}}{{SET x = i}}{{FOR ys AS j}}{{SET x = j}}[${{x}}]{{END_FOR}}[${{x}}]{{END_FOR}}", OUT("[p][q][b][p][q][a]")),
  row("the inner loop reads the SET of the outer loop", "{{FOR xs AS i limit=2}}{{SET x = i}}{{FOR ys AS j}}[${{x}}${{j}}]{{END_FOR}}{{END_FOR}}", OUT("[bp][bq][ap][aq]")),
  row("a SET in a FOR body does not clobber the loop name or its metadata", '{{FOR xs AS i limit=2}}{{SET y = "z"}}${{i}}${{@index0}}${{y}}{{END_FOR}}', OUT("b0za1z")),
  row("a SET can read the metadata of the loop", "{{FOR xs AS i limit=2}}{{SET k = @index1}}${{k}}{{END_FOR}}", OUT("12")),
  row("a SET named like a data name shadows it in the iteration only", '{{FOR xs AS i limit=1}}{{SET a = "S"}}${{a}}{{END_FOR}}${{a}}', OUT("SA")),
  row("a SET may take the name of a loop that has ended", '{{FOR xs AS i limit=1}}{{END_FOR}}{{SET i = "z"}}[${{i}}]', OUT("[z]")),
  row("a SET may take the loop name in the ELSE body", '{{FOR e AS i}}b{{ELSE}}{{SET i = "z"}}[${{i}}]{{END_FOR}}', OUT("[z]")),
  row("a SET may name the item of a different FOR in a sibling loop", '{{FOR xs AS i limit=1}}{{END_FOR}}{{FOR xs AS j limit=1}}{{SET i = "z"}}[${{i}}${{j}}]{{END_FOR}}', OUT("[zb]")),
  // LIST, SECTION, FENCE
  leak("a LIST_ITEM SET does not leak into the next item", '{{LIST}}{{LIST_ITEM}}{{SET x = "i"}}${{x}}{{END_LIST_ITEM}}{{LIST_ITEM}}[§${{x}}]{{END_LIST_ITEM}}{{END_LIST}}', "1. i\n2. []"),
  leak("a LIST_ITEM SET does not leak after END_LIST", '{{LIST}}{{LIST_ITEM}}{{SET x = "i"}}${{x}}{{END_LIST_ITEM}}{{END_LIST}}[§${{x}}]', "1. i[]"),
  row("a SET before a LIST is visible in its items", '{{SET x = "z"}}{{LIST}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_LIST}}', OUT("1. z")),
  row("a SET in the items a FOR builds is fresh for each item", "{{LIST}}{{FOR xs AS i limit=2}}{{LIST_ITEM}}{{SET u = i | upper}}${{u}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", OUT("1. B\n2. A")),
  leak("a SECTION SET does not leak after END_SECTION", '{{SECTION "T"}}{{SET x = "s"}}${{x}}{{END_SECTION}}[§${{x}}]', "## T\n\ns\n[]"),
  row("a SECTION body rebinding ends with the section", '{{SET x = "o"}}{{SECTION "T"}}{{SET x = "s"}}${{x}}{{END_SECTION}}[${{x}}]', OUT("## T\n\ns\n[o]")),
  leak("a FENCE SET does not leak after END_FENCE", '{{FENCE lang="js"}}{{SET x = "s"}}${{x}}{{END_FENCE}}[§${{x}}]', "```js\ns\n```\n[]"),
  row("a SET before a SECTION is visible in its body", '{{SET x = "z"}}{{SECTION "T"}}${{x}}{{END_SECTION}}', OUT("## T\n\nz\n")),
  // TABLE
  leak("a SET in a ROW cell does not leak into the next row", '{{TABLE}}{{ROW}}{{SET x = "c"}}${{x}}|1{{END_ROW}}{{ROW}}§${{x}}|2{{END_ROW}}{{END_TABLE}}', "| c | 1 |\n|  | 2 |"),
  leak("a SET in a HEADER cell does not leak into the rows", '{{TABLE}}{{HEADER}}{{SET x = "h"}}${{x}}|1{{END_HEADER}}{{ROW}}§${{x}}|2{{END_ROW}}{{END_TABLE}}', "| h | 1 |\n|:-----|:-----|\n|  | 2 |"),
  leak("a SET in a ROW cell does not leak after END_TABLE", '{{TABLE}}{{ROW}}{{SET x = "c"}}${{x}}|1{{END_ROW}}{{END_TABLE}}[§${{x}}]', "| c | 1 |[]"),
  row("a SET before a TABLE is visible in a row", '{{SET x = "z"}}{{TABLE}}{{ROW}}${{x}}|1{{END_ROW}}{{END_TABLE}}', OUT("| z | 1 |")),
  row("a SET in the rows a FOR builds is fresh for each row", "{{TABLE}}{{FOR xs AS i limit=2}}{{ROW}}{{SET u = i | upper}}${{u}}|${{@index1}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", OUT("| B | 1 |\n| A | 2 |")),
  // a SET inside an item or a row is fine; before the LIST or TABLE too
  row("a SET inside a LIST_ITEM prints through ${{ }} of the same item", '{{LIST}}{{LIST_ITEM}}{{SET y = "i"}}${{y}}{{END_LIST_ITEM}}{{END_LIST}}', OUT("1. i")),
];

// scopes are Maps: names of the prototype chain are ordinary names
const PROTO_ROWS: Row[] = [
  row("SET __proto__ is an ordinary name", "{{SET __proto__ = 1}}[${{__proto__}}]", OUT("[1]")),
  row("SET constructor is an ordinary name", "{{SET constructor = 2}}[${{constructor}}]", OUT("[2]")),
  row("SET toString is an ordinary name", "{{SET toString = 3}}[${{toString}}]", OUT("[3]")),
  row("SET length is an ordinary name", "{{SET length = 4}}[${{length}}]", OUT("[4]")),
  row("SET hasOwnProperty is an ordinary name", "{{SET hasOwnProperty = 5}}[${{hasOwnProperty}}]", OUT("[5]")),
  row("a SET named like a prototype name shadows data of that name and the data is back after its block", "[${{constructor}}]{{IF t}}{{SET constructor = 2}}[${{constructor}}]{{END_IF}}[${{constructor}}]", OUT("[C][2][C]"), { data: { constructor: "C" } }),
  row("a read of a prototype name before any SET is still missing", "[${{toString}}]{{SET toString = 1}}[${{toString}}]", SL(ERR("missing-variable", 1, 2, "'toString'"), OUT("[][1]"))),
  row("a SET object does not expose the prototype chain through a path", "{{SET c = o}}[${{c.constructor}}][${{c.__proto__}}][${{c.toString}}]", OUT("[][][]")),
  row("the name of a SET does not reach the prototype of the data", '{{SET __proto__ = "p"}}[${{o.k}}][${{a}}]', OUT("[v][A]")),
];

describe("st-scope: visible from the tag to the end of the block", () => {
  it.each(expand(SCOPE_ROWS))("st-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-scope"));
  it.each(expand(PROTO_ROWS))("st-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-scope"));

  it.each(ENTRIES)("st-scope: [%s] a SET never writes the caller's data", (entry) => {
    const data: Record<string, any> = { x: "D", o: { k: 1 }, xs: ["a", "b"] };
    const copy = JSON.parse(JSON.stringify(data));
    const o1 = run(entry, '{{SET x = "S"}}{{SET y = "Y"}}{{FOR xs AS i}}{{SET x = i}}{{END_FOR}}[${{x}}]', data);
    check(o1.output, `[${entry}] the SET value is read`).toBe("[S]");
    check(data, `[${entry}] the data object is untouched`).toEqual(copy);
    check(Object.keys(data).sort(), `[${entry}] no name was added to the data object`).toEqual(["o", "x", "xs"]);
    const o2 = run(entry, "[${{x}}]", data);
    check(o2.output, `[${entry}] a second run with the same data sees the data again`).toBe("[D]");
  });

  it.each([true, false])("st-scope: resolveTemplate never writes the caller's Map (strictMode %s)", (strictMode) => {
    const m = new Map<string, any>([["x", "D"], ["xs", ["a", "b"]]]);
    const out = resolved('{{SET x = "S"}}{{SET y = "Y"}}{{FOR xs AS i}}{{SET x = i}}{{END_FOR}}[${{x}}${{y}}]', m, { strictMode });
    check(out, "the SET values are read").toBe("[SY]");
    check([...m.keys()], "the Map has the names it had").toEqual(["x", "xs"]);
    check(m.get("x"), "the Map keeps the data value").toBe("D");
    check(resolved("[${{x}}]", m, { strictMode }), "a second call with the same Map sees the data").toBe("[D]");
  });
});

// =====================================================================================
// st-names and st-single: where the name or the shape of the tag is wrong
// =====================================================================================

// every row is a syntax-error at the § mark in render, resolveTemplate, validate and analyze, in every mode
const SYNTAX_ROWS: Array<{ name: string; tplMarked: string; has?: string }> = [
  { name: "{{SET}} has no name", tplMarked: "§{{SET}}" },
  { name: "{{SET x}} has no value", tplMarked: "§{{SET x}}" },
  { name: "{{SET x =}} has an empty expression", tplMarked: "§{{SET x =}}" },
  { name: "{{SET = 1}} has no name", tplMarked: "§{{SET = 1}}" },
  { name: "{{SET x == 1}} is a comparison, not a bind", tplMarked: "§{{SET x == 1}}" },
  { name: "{{SET 1x = 2}} starts the name with a digit", tplMarked: "§{{SET 1x = 2}}" },
  { name: "{{SET a.b = 1}} names a path", tplMarked: "§{{SET a.b = 1}}" },
  { name: "{{SET @x = 1}} names a metadata name", tplMarked: "§{{SET @x = 1}}" },
  { name: "{{SET @index0 = 1}} names a metadata name", tplMarked: "§{{SET @index0 = 1}}" },
  { name: "{{SET my-var = 1}} has a dash in the name", tplMarked: "§{{SET my-var = 1}}" },
  { name: "{{SET x y = 1}} has two words as the name", tplMarked: "§{{SET x y = 1}}" },
  { name: "the tag is located after other text on its line", tplMarked: "a\n  b {{IF t}}§{{SET}}{{END_IF}}" },
  { name: "a tag with no name inside a branch that never renders is found at parse time", tplMarked: "{{IF f}}x{{ELSE}}y§{{SET = 1}}{{END_IF}}" },
  { name: "a metadata name inside a FOR whose ELSE body never runs is found at parse time", tplMarked: "{{FOR xs AS i}}a{{ELSE}}§{{SET @x = 1}}{{END_FOR}}" },
  { name: "the item name of the enclosing FOR is a live loop name", tplMarked: "{{FOR xs AS i}}§{{SET i = 1}}{{END_FOR}}" },
  { name: "a live loop name inside an IF in the FOR body", tplMarked: "{{FOR xs AS i}}{{IF t}}§{{SET i = 1}}{{END_IF}}{{END_FOR}}" },
  { name: "a live loop name in a branch that never renders", tplMarked: "{{FOR xs AS i}}{{IF f}}§{{SET i = 1}}{{END_IF}}{{END_FOR}}" },
  { name: "the item name of the outer FOR inside a nested FOR", tplMarked: "{{FOR xs AS i}}{{FOR ys AS j}}§{{SET i = 1}}{{END_FOR}}{{END_FOR}}" },
  { name: "the item name of the inner FOR", tplMarked: "{{FOR xs AS i}}{{FOR ys AS j}}§{{SET j = 1}}{{END_FOR}}{{END_FOR}}" },
  { name: "a live loop name inside a LIST_ITEM of a FOR", tplMarked: "{{LIST}}{{FOR xs AS i}}{{LIST_ITEM}}§{{SET i = 1}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}" },
  { name: "a live loop name inside a SECTION in the FOR body", tplMarked: '{{FOR xs AS i}}{{SECTION "T"}}§{{SET i = 1}}{{END_SECTION}}{{END_FOR}}' },
];

describe("st-names: the name of a SET", () => {
  const cases = SYNTAX_ROWS.map((s) => ({ ...s, ...marked(s.tplMarked) }));
  it.each(cases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-names: [$entry] $c.name is a syntax-error at the tag", ({ entry, c }) => {
    const o = run(entry, c.tpl, DATA);
    verifyOutcome(o, ERR("syntax-error", c.line, c.col, undefined, UNKNOWN_TAG), `st-names [${entry}] ${c.name}`);
  });
  it.each(cases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-names: [$kind] $c.name is reported at the tag", ({ kind, c }) => {
    const o = runStatic(kind, c.tpl);
    verifyOutcome(o, ERR("syntax-error", c.line, c.col, undefined, UNKNOWN_TAG), `st-names [${kind}] ${c.name}`);
  });

  const valid: Row[] = [
    row("a SET may name the loop item of a FOR in the ELSE body", '{{FOR e AS i}}b{{ELSE}}{{SET i = "z"}}[${{i}}]{{END_FOR}}', OUT("[z]")),
    row("a SET may name the loop item after END_FOR", '{{FOR xs AS i limit=1}}{{END_FOR}}{{SET i = "z"}}[${{i}}]', OUT("[z]")),
    row("a SET may be named like a filter or a lower case keyword word", "{{SET set = 1}}{{SET upper = 3}}[${{set}}${{upper}}]", OUT("[13]")),
    row("a name may hold digits and underscores", '{{SET _a1_b2 = "v"}}[${{_a1_b2}}]', OUT("[v]")),
    row("a name may be one letter, upper case", '{{SET X = "v"}}[${{X}}]', OUT("[v]")),
    row("the name may be long", '{{SET ' + "n".repeat(60) + ' = "v"}}[${{' + "n".repeat(60) + "}}]", OUT("[v]")),
  ];
  it.each(expand(valid))("st-names: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-names"));
});

describe("st-single: a SET is one tag with no closer", () => {
  const unknown: Array<{ name: string; tplMarked: string; has: string }> = [
    { name: "{{END_SET}} is an unknown tag", tplMarked: "a\n  §{{END_SET}}", has: "Unknown template tag: {{END_SET}}" },
    { name: "{{END_SET}} after a SET is an unknown tag", tplMarked: '{{SET x = 1}}§{{END_SET}}', has: "Unknown template tag: {{END_SET}}" },
    { name: "{{set x = 1}} in lower case is an unknown tag", tplMarked: "a\n  §{{set x = 1}}", has: "Unknown template tag: {{set x = 1}}" },
  ];
  const cases = unknown.map((s) => ({ ...s, ...marked(s.tplMarked) }));
  it.each(cases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-single: [$entry] $c.name", ({ entry, c }) => {
    verifyOutcome(run(entry, c.tpl, DATA), ERR("syntax-error", c.line, c.col, c.has), `st-single [${entry}] ${c.name}`);
  });
  it.each(cases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-single: [$kind] $c.name", ({ kind, c }) => {
    verifyOutcome(runStatic(kind, c.tpl), ERR("syntax-error", c.line, c.col, c.has), `st-single [${kind}] ${c.name}`);
  });

  const text: Row[] = [
    row("the words SET x = 1 outside a tag are plain text", "SET x = 1 and more", OUT("SET x = 1 and more")),
  ];
  it.each(expand(text))("st-single: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-single"));

  it.each(["{{SET x = 1}}", "{{SET x = 1}}\n", "a {{SET x = 1}} b"])("st-single: a SET needs no closer: %j is valid", (tpl) => {
    check(runStatic("validate", tpl).code, "validate accepts it").toBe("ok");
    check(runStatic("analyze", tpl).code, "analyze accepts it").toBe("ok");
    for (const entry of ENTRIES) check(run(entry, tpl, DATA).code, `[${entry}] renders it`).toBe("ok");
  });

  const listRows: Array<{ name: string; tplMarked: string; has: string }> = [
    { name: "a SET directly among LIST children", tplMarked: "{{LIST}}§{{SET x = 1}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", has: "Unexpected token in LIST: SET" },
    { name: "a SET between two items", tplMarked: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}§{{SET x = 1}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_LIST}}", has: "Unexpected token in LIST: SET" },
    { name: "a SET directly among TABLE children", tplMarked: "{{TABLE}}§{{SET x = 1}}{{ROW}}a|b{{END_ROW}}{{END_TABLE}}", has: "Unexpected token in TABLE: SET" },
    { name: "a SET between a HEADER and a ROW", tplMarked: "{{TABLE}}{{HEADER}}h|i{{END_HEADER}}§{{SET x = 1}}{{ROW}}a|b{{END_ROW}}{{END_TABLE}}", has: "Unexpected token in TABLE: SET" },
    { name: "a SET in a FOR that builds items", tplMarked: "{{LIST}}{{FOR xs AS x}}§{{SET y = 1}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", has: "Unexpected token" },
    { name: "a SET in an IF that builds items", tplMarked: "{{LIST}}{{IF t}}§{{SET y = 1}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", has: "Unexpected token" },
    { name: "a SET in a FOR that builds rows", tplMarked: "{{TABLE}}{{IF t}}{{FOR xs AS x}}§{{SET y = 1}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", has: "Unexpected token" },
    { name: "a SET in an IF that builds rows", tplMarked: "{{TABLE}}{{IF t}}§{{SET y = 1}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", has: "Unexpected token" },
  ];
  const lcases = listRows.map((s) => ({ ...s, lacks: UNKNOWN_TAG, ...marked(s.tplMarked) }));
  it.each(lcases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-single: [$entry] $c.name is a syntax-error at the tag", ({ entry, c }) => {
    verifyOutcome(run(entry, c.tpl, DATA), ERR("syntax-error", c.line, c.col, c.has, c.lacks), `st-single [${entry}] ${c.name}`);
  });
  it.each(lcases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-single: [$kind] $c.name is reported at the tag", ({ kind, c }) => {
    verifyOutcome(runStatic(kind, c.tpl), ERR("syntax-error", c.line, c.col, c.has, c.lacks), `st-single [${kind}] ${c.name}`);
  });
});

// =====================================================================================
// st-ws: SET is a standalone tag, takes trim markers and prints nothing
// =====================================================================================

const ON = { standaloneLines: true };
const OFF = { standaloneLines: false };
const WS_ROWS: Row[] = [
  row("a line holding only a SET vanishes with its line break", "a\n{{SET x = 1}}\nb\n", OUT("a\nb\n"), { opts: ON }),
  row("a SET line with indentation and trailing spaces vanishes", "a\n  {{SET x = 1}}  \nb", OUT("a\nb"), { opts: ON }),
  row("a line holding several SET tags vanishes", "a\n{{SET x = 1}}{{SET y = 2}}\nb\n", OUT("a\nb\n"), { opts: ON }),
  row("SET tags separated by a space on one line vanish", "a\n{{SET x = 1}} {{SET y = 2}}\n${{x}}${{y}}\n", OUT("a\n12\n"), { opts: ON }),
  row("two SET lines in a row vanish", "a\n{{SET x = 1}}\n{{SET y = 2}}\n${{x}}${{y}}", OUT("a\n12"), { opts: ON }),
  row("a SET at the start of the template on its own line vanishes", "{{SET x = 1}}\n${{x}}", OUT("1"), { opts: ON }),
  row("a SET on the last line without a line break vanishes", "a\n{{SET x = 1}}", OUT("a\n"), { opts: ON }),
  row("a SET with text on its line leaves the text", "a\n{{SET x = 1}}text\nb", OUT("a\ntext\nb"), { opts: ON }),
  row("a SET with text keeps the indentation and the space after it", "a\n  {{SET x = 1}} text\nb", OUT("a\n   text\nb"), { opts: ON }),
  row("a SET inside a FOR body on its own line leaves no blank line", "{{FOR xs AS i limit=2}}\n{{SET u = i | upper}}\n${{u}}\n{{END_FOR}}\n", OUT("B\nA\n"), { opts: ON }),
  row("a SET inside an IF branch on its own line keeps the indented text line", "{{IF t}}\n  {{SET x = 1}}\n  x=${{x}}\n{{END_IF}}\n", OUT("  x=1\n"), { opts: ON }),
  row("a CRLF template: the SET line vanishes with its CRLF", "a\r\n{{SET x = 1}}\r\nb\r\n${{x}}", OUT("a\nb\n1"), { opts: ON }),
  row("standaloneLines off: the line break of a SET line stays", "a\n{{SET x = 1}}\nb\n${{x}}", OUT("a\n\nb\n1"), { opts: OFF }),
  row("standaloneLines off: the indentation of a SET line stays", "a\n  {{SET x = 1}}\nb", OUT("a\n  \nb"), { opts: OFF }),
  row("a SET prints nothing between two texts", "[{{SET x = 1}}]", OUT("[]")),
  row("trim markers on both sides take the spaces around the SET", "a {{- SET x = 5 -}} b ${{x}}", OUT("ab 5"), { opts: ON }),
  row("trim markers on both sides take the spaces around the SET (standaloneLines off)", "a {{- SET x = 5 -}} b ${{x}}", OUT("ab 5"), { opts: OFF }),
  row("trim markers take the line breaks around the SET", "x \n{{- SET v = 1 -}}\n y ", OUT("xy "), { opts: ON }),
  row("trim markers take the line breaks around the SET (standaloneLines off)", "x \n{{- SET v = 1 -}}\n y ", OUT("xy "), { opts: OFF }),
  row("the right trim marker leaves the expression alone", "{{SET x = 5 -}}  \n  [${{x}}]", OUT("[5]"), { opts: OFF }),
  row("a SECTION whose body holds only a SET renders the heading with an empty body when it is kept", '{{SECTION "T" skip_empty=false}}{{SET v = 1}}{{END_SECTION}}z', OUT("## T\nz")),
  row("a SECTION whose body holds only a SET is omitted with skip_empty", '{{SECTION "T" skip_empty=true}}{{SET v = 1}}{{END_SECTION}}z', OUT("z")),
  row("a SECTION whose body holds only a SET is omitted by default", '{{SECTION "T"}}{{SET v = 1}}{{END_SECTION}}z', OUT("z")),
  row("a SECTION whose body holds a SET and text is kept", '{{SECTION "T"}}{{SET v = 1}}${{v}}{{END_SECTION}}z', OUT("## T\n\n1\nz")),
];

describe("st-ws: whitespace around a SET", () => {
  it.each(expand(WS_ROWS))("st-ws: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-ws"));
});

// =====================================================================================
// the limits a SET takes part in
// =====================================================================================

const SET1 = "{{SET x = 1}}";
const NODE_ROWS: Row[] = [
  row("five SET tags fit in maxNodes 5", SET1.repeat(5), OUT(""), { limits: { maxNodes: 5 } }),
  row("the sixth SET tag crosses maxNodes 5 and is located at its tag", SET1.repeat(6), ERR("limit-nodes", 1, 66), { limits: { maxNodes: 5 } }),
  row("a SET and a variable are two nodes and fit in 2", "{{SET x = 1}}${{x}}", OUT("1"), { limits: { maxNodes: 2 } }),
  row("a SET and a variable cross 1 at the variable", "{{SET x = 1}}${{x}}", ERR("limit-nodes", 1, 14), { limits: { maxNodes: 1 } }),
  row("a SET in an IF is the second node and fits in 2", "{{IF t}}{{SET x = 1}}{{END_IF}}", OUT(""), { limits: { maxNodes: 2 } }),
  row("a SET in an IF crosses 1 at the SET tag", "{{IF t}}{{SET x = 1}}{{END_IF}}", ERR("limit-nodes", 1, 9), { limits: { maxNodes: 1 } }),
  row("a SET on the second line is located on its line", "a\n  " + SET1 + SET1 + SET1, ERR("limit-nodes", 2, 29), { limits: { maxNodes: 3 } }),
  row("a SET in a branch that never renders still counts", "{{IF f}}{{SET x = 1}}{{END_IF}}", ERR("limit-nodes", 1, 9), { limits: { maxNodes: 1 } }),
  row("a SET adds no depth: a SET in an IF fits maxDepth 1", "{{IF t}}{{SET x = 1}}[${{x}}]{{END_IF}}", OUT("[1]"), { limits: { maxDepth: 1 } }),
  row("a SET adds no depth: two IFs still cross maxDepth 1 at the inner IF", "{{IF t}}{{IF t}}{{SET x = 1}}{{END_IF}}{{END_IF}}", ERR("limit-depth", 1, 9), { limits: { maxDepth: 1 } }),
  row("a SET adds no depth: two IFs and a SET fit maxDepth 2", "{{IF t}}{{IF t}}{{SET x = 1}}[${{x}}]{{END_IF}}{{END_IF}}", OUT("[1]"), { limits: { maxDepth: 2 } }),
  row("a SET inside a FOR counts the iterations of the FOR as before", "a\n  {{FOR xs AS i}}{{SET u = i}}{{END_FOR}}", ERR("limit-iterations", 2, 3), { limits: { maxIterations: 2 } }),
  row("a SET inside a FOR fits the iterations of the FOR", "{{FOR xs AS i}}{{SET u = i}}${{u}}{{END_FOR}}", OUT("bab"), { limits: { maxIterations: 3 } }),
];

describe("st-set: a SET takes part in the limits", () => {
  it.each(expand(NODE_ROWS))("st-set: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-set"));
  it("st-set: render counts one iteration per FOR iteration and none per SET", () => {
    const r = render("{{FOR xs AS i}}{{SET u = i}}{{SET w = u}}{{END_FOR}}", DATA, { strictMode: true });
    check(r.ok, `render is ok (${r.diagnostics.map((d) => d.code).join(",")})`).toBe(true);
    check(r.stats.iterations, "stats.iterations is the 3 iterations of the FOR").toBe(3);
  });
});

// =====================================================================================
// st-size: a text longer than maxOutputChars is a limit-output at its variable or SET
// =====================================================================================

const LONG60 = "0123456789".repeat(6);
const LONG50 = "0123456789".repeat(5);
const CHAIN = "{{SET a = a | json}}";
const SIZE_ROWS: Row[] = [
  // ${{ }} in the same evaluator: a text that shrinks again is still an error
  row("${{ }}: an intermediate text over the limit that shrinks later is a limit-output at the variable", "a\n  ${{long | upper | head=4}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: json then head over the limit is a limit-output at the variable", "a\n  ${{long | json | head=3}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: the same chain under the default limit renders", "a\n  ${{long | upper | head=4}}", OUT("a\n  XXXX")),
  row("${{ }}: a chain that grows past the limit is a limit-output at the variable", "a\n  ${{s | json | json | json}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: a chain that stays within the limit renders", "${{s | json | json}}", OUT('"\\"hello world\\""'), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: a data text longer than the limit with no filter keeps the existing output check", "a\n  ${{long}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: a data text of exactly the limit renders", "${{long}}", OUT("x".repeat(30)), { limits: { maxOutputChars: 30 } }),
  // SET
  always("a literal longer than the limit is a limit-output at the SET", 'a\n  §{{SET x = "' + LONG60 + '"}}z', "limit-output", undefined, { limits: { maxOutputChars: 50 } }),
  row("a literal of exactly the limit binds", '{{SET x = "' + LONG50 + '"}}z', OUT("z"), { limits: { maxOutputChars: 50 } }),
  always("a data text longer than the limit is a limit-output at the SET", "a\n  §{{SET x = long}}z", "limit-output", undefined, { limits: { maxOutputChars: 20 } }),
  row("a data text of exactly the limit binds", "{{SET x = long}}z", OUT("z"), { limits: { maxOutputChars: 30 } }),
  always("a filter result longer than the limit is a limit-output at the SET", "a\n  §{{SET x = long | upper}}z", "limit-output", undefined, { limits: { maxOutputChars: 20 } }),
  always("a chain that shrinks again is a limit-output at the SET", "a\n  §{{SET x = long | upper | head=4}}z", "limit-output", undefined, { limits: { maxOutputChars: 20 } }),
  row("a short filter result binds", "{{SET x = s | upper}}z", OUT("z"), { limits: { maxOutputChars: 20 } }),
  row("an array over the limit in length is not an error", "{{SET l = xs}}z", OUT("z"), { limits: { maxOutputChars: 2 } }),
  row("an object over the limit in length is not an error", "{{SET l = o}}z", OUT("z"), { limits: { maxOutputChars: 2 } }),
  row("a FOR over a SET array longer than the limit in length is not an error", "{{SET l = items}}{{FOR l AS i}}${{i.n}}{{END_FOR}}", OUT("xy"), { limits: { maxOutputChars: 5 } }),
  row("a sort of an array is not measured", "{{SET l = xs | sort}}z", OUT("z"), { limits: { maxOutputChars: 2 } }),
  // the chain a SET a = a | json repeated cannot double a value without bound
  row("eleven json SETs in a row stay within 5000 characters", CHAIN.repeat(11) + "${{a | length}}", OUT("4095"), { data: { a: "x" }, limits: { maxOutputChars: 5000 } }),
  row("the twelfth json SET crosses 5000 characters and is located at its tag", CHAIN.repeat(12) + "${{a | length}}", ERR("limit-output", 1, 221), { data: { a: "x" }, limits: { maxOutputChars: 5000 } }),
  row("twelve json SETs fit a large limit", CHAIN.repeat(12) + "${{a | length}}", OUT("8191"), { data: { a: "x" }, limits: { maxOutputChars: 100000 } }),
  row("twelve json SETs in a FOR body are located at the crossing SET", "{{FOR r2 AS i}}" + CHAIN.repeat(12) + "{{END_FOR}}", ERR("limit-output", 1, 236), { data: { a: "x", r2: ["p", "q"] }, limits: { maxOutputChars: 5000 } }),
  row("a SET in a FOR with twelve iterations binds fresh each iteration: no growth carries across", "{{FOR r AS i}}" + CHAIN + "{{END_FOR}}[${{a}}]", OUT("[x]"), { data: { a: "x", r: Array.from({ length: 12 }, (_, i) => i) }, limits: { maxOutputChars: 50 } }),
  // the default limit is untouched by ordinary templates
  row("an ordinary chain of SETs under the default limit", "{{SET x = s | json | json | json}}${{x | length}}", OUT("25")),
  row("a SET of a long text under the default limit", "{{SET x = long | upper}}${{x | length}}", OUT("30")),
  // astral characters keep their length rule (UTF-16 units)
  row("astral: a literal with a filter within the limit binds", '{{SET x = "😀😀" | upper}}${{x | length}}', OUT("4"), { limits: { maxOutputChars: 4 } }),
  always("astral: a literal with a filter over the limit is a limit-output at the SET", 'a\n  §{{SET x = "😀😀😀" | upper}}${{x | length}}', "limit-output", undefined, { limits: { maxOutputChars: 4 } }),
  row("astral: a data text within the limit binds", "{{SET x = e2 | upper}}z", OUT("z"), { data: { e2: "😀😀" }, limits: { maxOutputChars: 4 } }),
  always("astral: a data text over the limit is a limit-output at the SET", "a\n  §{{SET x = e2 | upper}}z", "limit-output", undefined, { data: { e2: "😀😀😀" }, limits: { maxOutputChars: 4 } }),
  row("astral: the same text through ${{ }} within the limit", "${{e2 | upper}}", OUT("😀😀"), { data: { e2: "😀😀" }, limits: { maxOutputChars: 4 } }),
  row("astral: a chain through ${{ }} over the limit", "${{e2 | upper}}", ERR("limit-output", 1, 1), { data: { e2: "😀😀" }, limits: { maxOutputChars: 3 } }),
  row("astral: length of a bound astral text keeps the filter rule", '{{SET x = "😀😀"}}${{x | length}}', OUT("4")),
];

describe("st-size: the one evaluator measures a text", () => {
  it.each(expand(SIZE_ROWS))("st-size: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-size"));
});

// =====================================================================================
// st-analyze
// =====================================================================================

interface AnalyzeRow {
  name: string;
  tpl: string;
  vars: Record<string, { usedIn: string[]; paths?: string[]; optional?: boolean }>;
  blocks: Record<string, number>;
  filters?: string[];
  diag?: string[];
}
const ANALYZE_ROWS: AnalyzeRow[] = [
  { name: "a variable read in a SET expression is kind set and the SET name is a local", tpl: "{{SET x = a}}${{x}}", vars: { a: { usedIn: ["set"], paths: ["a"], optional: false } }, blocks: {} },
  { name: "a SET name is a local in an IF, a FOR iterable and a CASE subject", tpl: "{{SET x = a}}{{IF x}}y{{END_IF}}{{FOR x AS i}}${{i}}{{END_FOR}}{{CASE x}}{{WHEN 1}}w{{END_CASE}}", vars: { a: { usedIn: ["set"] } }, blocks: { IF: 1, FOR: 1, CASE: 1 } },
  { name: "a read of the same name before the SET is an input", tpl: "${{x}}{{SET x = 1}}${{x}}", vars: { x: { usedIn: ["output"] } }, blocks: {} },
  { name: "a SET that reads its own name first makes it an input of kind set", tpl: "{{SET x = x + 1}}${{x}}", vars: { x: { usedIn: ["set"], paths: ["x"] } }, blocks: {} },
  { name: "a read after the block of the SET is an input", tpl: "{{IF t}}{{SET x = 1}}${{x}}{{END_IF}}${{x}}", vars: { t: { usedIn: ["if"] }, x: { usedIn: ["output"] } }, blocks: { IF: 1 } },
  { name: "a read in the sibling branch is an input", tpl: "{{IF t}}{{SET x = 1}}{{ELSE}}${{x}}{{END_IF}}", vars: { t: { usedIn: ["if"] }, x: { usedIn: ["output"] } }, blocks: { IF: 1 } },
  { name: "a read in the ELSE body of a FOR does not see the SET of the body", tpl: "{{FOR xs AS i}}{{SET x = 1}}{{ELSE}}${{x}}{{END_FOR}}", vars: { xs: { usedIn: ["for"] }, x: { usedIn: ["output"] } }, blocks: { FOR: 1 } },
  { name: "a nested block reads a name set in an outer block: not an input", tpl: "{{SET x = 1}}{{IF t}}${{x}}{{END_IF}}{{FOR xs AS i}}${{x}}{{END_FOR}}", vars: { t: { usedIn: ["if"] }, xs: { usedIn: ["for"] } }, blocks: { IF: 1, FOR: 1 } },
  { name: "a SET in a FOR body ends with the body", tpl: "{{FOR xs AS i}}{{SET u = i}}${{u}}{{END_FOR}}${{u}}", vars: { xs: { usedIn: ["for"] }, u: { usedIn: ["output"] } }, blocks: { FOR: 1 } },
  { name: "the loop name is still scoped and a SET may read it", tpl: "{{FOR xs AS i}}{{SET u = i.k}}${{u}}${{i}}{{END_FOR}}", vars: { xs: { usedIn: ["for"] } }, blocks: { FOR: 1 } },
  { name: "a SET of a SET reads a local: only the data name is an input", tpl: "{{SET x = a}}{{SET y = x}}[${{y}}]", vars: { a: { usedIn: ["set"] } }, blocks: {} },
  { name: "rebinding a name with its own value reads the local", tpl: "{{SET x = a}}{{SET x = x + 1}}", vars: { a: { usedIn: ["set"] } }, blocks: {} },
  { name: "a ?? default makes the read optional and the default text is not a read", tpl: '{{SET x = a ?? "d"}}', vars: { a: { usedIn: ["set"], paths: ["a"], optional: true } }, blocks: {} },
  { name: "a second read without a default makes the name required", tpl: '{{SET x = a ?? "d"}}${{a}}', vars: { a: { usedIn: ["set", "output"], optional: false } }, blocks: {} },
  { name: "a math expression records its names with kind set", tpl: "{{SET t = a + b}}", vars: { a: { usedIn: ["set"], paths: ["a"] }, b: { usedIn: ["set"], paths: ["b"] } }, blocks: {} },
  { name: "the paths of one root are listed once each", tpl: "{{SET x = o.k}}{{SET y = o.n.d}}{{SET z = o.k}}", vars: { o: { usedIn: ["set"], paths: ["o.k", "o.n.d"] } }, blocks: {} },
  { name: "filters in the expression are counted", tpl: "{{SET x = s | upper | head=3}}", vars: { s: { usedIn: ["set"] } }, blocks: {}, filters: ["head", "upper"] },
  { name: "filters on a literal are counted and read nothing", tpl: '{{SET x = "a" | upper}}', vars: {}, blocks: {}, filters: ["upper"] },
  { name: "an unknown filter in a SET is an unknown-filter diagnostic", tpl: "{{SET x = s | nope}}", vars: { s: { usedIn: ["set"] } }, blocks: {}, filters: ["nope"], diag: ["unknown-filter"] },
  { name: "a text literal reads nothing", tpl: '{{SET x = "a"}}${{x}}', vars: {}, blocks: {} },
  { name: "a number literal reads nothing", tpl: "{{SET x = 5}}{{SET y = true}}{{SET z = null}}", vars: {}, blocks: {} },
  { name: "SET is not counted in blocks", tpl: "{{SET p = 1}}{{SET q = 2}}{{IF t}}{{SET r = 3}}{{END_IF}}", vars: { t: { usedIn: ["if"] } }, blocks: { IF: 1 } },
  { name: "a SET in a LIST_ITEM reads data and its name ends with the item", tpl: "{{LIST}}{{LIST_ITEM}}{{SET u = a}}${{u}}{{END_LIST_ITEM}}{{LIST_ITEM}}${{u}}{{END_LIST_ITEM}}{{END_LIST}}", vars: { a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { LIST: 1 } },
  { name: "a SET in a ROW cell reads data and its name ends with the row", tpl: "{{TABLE}}{{ROW}}{{SET u = a}}${{u}}|1{{END_ROW}}{{ROW}}${{u}}|2{{END_ROW}}{{END_TABLE}}", vars: { a: { usedIn: ["set"] }, u: { usedIn: ["table"] } }, blocks: { TABLE: 1 } },
  { name: "a SET in a SECTION ends with the section", tpl: '{{SECTION "T"}}{{SET u = a}}${{u}}{{END_SECTION}}${{u}}', vars: { a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { SECTION: 1 } },
  { name: "a SET in a FENCE ends with the fence", tpl: '{{FENCE lang="js"}}{{SET u = a}}${{u}}{{END_FENCE}}${{u}}', vars: { a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { FENCE: 1 } },
  { name: "a SET in a WHEN clause ends with the clause", tpl: "{{CASE b}}{{WHEN 1}}{{SET u = a}}${{u}}{{DEFAULT}}${{u}}{{END_CASE}}", vars: { b: { usedIn: ["case"] }, a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { CASE: 1 } },
  { name: "a SET in an ELSEIF branch reads data", tpl: "{{IF t}}{{ELSEIF b}}{{SET x = a}}${{x}}{{END_IF}}", vars: { t: { usedIn: ["if"] }, b: { usedIn: ["elseif"] }, a: { usedIn: ["set"] } }, blocks: { IF: 1 } },
  { name: "a SET of an array name used as a FOR iterable reads the array only once", tpl: "{{SET l = xs}}{{FOR l AS i}}${{i}}{{END_FOR}}", vars: { xs: { usedIn: ["set"] } }, blocks: { FOR: 1 } },
  { name: "the usedIn kinds of one name are listed together", tpl: "{{SET x = a}}{{IF a}}y{{END_IF}}{{FOR a AS i}}z{{END_FOR}}${{a}}", vars: { a: { usedIn: ["set", "if", "for", "output"] } }, blocks: { IF: 1, FOR: 1 } },
];

describe("st-analyze: analyze follows the scope of a SET", () => {
  it.each(ANALYZE_ROWS)("st-analyze: $name", (row) => {
    const o = runStatic("analyze", row.tpl);
    check(row.diag ? "ok" : o.code, `analyze accepts the template (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
    const a = analyzed(row.tpl);
    const used: Record<string, string[]> = {};
    for (const v of a.variables) used[v.name] = [...v.usedIn].sort();
    const want: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(row.vars)) want[k] = [...v.usedIn].sort();
    check(used, "the inputs and the kinds they are used in").toEqual(want);
    for (const [k, v] of Object.entries(row.vars)) {
      const found = a.variables.find((x) => x.name === k);
      if (v.paths) check(found?.paths, `${k}: the paths`).toEqual(v.paths);
      if (v.optional !== undefined) {
        check(found?.optional, `${k}: optional`).toBe(v.optional);
        check(found?.required, `${k}: required is the opposite of optional`).toBe(!v.optional);
      }
    }
    check(a.blocks, "the block counts").toEqual(row.blocks);
    check(a.filters.map((f) => f.name).sort(), "the filters used").toEqual([...(row.filters ?? [])].sort());
    check(a.diagnostics.map((d) => d.code), "the diagnostics").toEqual(row.diag ?? []);
  });

  it("st-analyze: a diagnostic of a SET is located at the SET tag", () => {
    const m = marked("a\n  §{{SET x = s | nope}}");
    const a = analyzed(m.tpl);
    check(a.diagnostics.map((d) => ({ code: d.code, line: d.line, column: d.column })), "unknown-filter at the SET").toEqual([{ code: "unknown-filter", line: m.line, column: m.col }]);
  });

  const agree: Array<{ name: string; tpl: string; data: Record<string, any>; input: string }> = [
    { name: "a name read only in a SET expression", tpl: "{{SET x = only_here | upper}}[${{x}}]", data: {}, input: "only_here" },
    { name: "a name read only in a SET inside an IF", tpl: "{{IF t}}{{SET x = only_here}}[${{x}}]{{END_IF}}", data: { t: true }, input: "only_here" },
    { name: "a name read only in a SET inside a FOR body", tpl: "{{FOR xs AS i limit=1}}{{SET x = only_here}}[${{x}}]{{END_FOR}}", data: { xs: ["a"] }, input: "only_here" },
    { name: "a name read after the block of a SET of the same name", tpl: "{{IF t}}{{SET only_here = 1}}{{END_IF}}[${{only_here}}]", data: { t: true }, input: "only_here" },
    { name: "a name read before the SET of the same name", tpl: "[${{only_here}}]{{SET only_here = 1}}", data: {}, input: "only_here" },
  ];
  it.each(agree.flatMap((a) => (["render", "resolve"] as const).map((m) => ({ m, ...a }))))("st-analyze: [$m] $name is an input that the run also asks for", (c) => {
    const names = analyzed(c.tpl).variables.map((v) => v.name);
    check(names, `analyze lists ${c.input} as an input`).toContain(c.input);
    const entry: Entry = c.m === "render" ? "render-strict" : "resolve-strict";
    const without = run(entry, c.tpl, c.data);
    check(without.code, `${c.m}: without ${c.input} the strict run asks for it`).toBe("missing-variable");
    check(without.message ?? "", `${c.m}: the missing name is ${c.input}`).toContain(c.input);
    check(run(entry, c.tpl, { ...c.data, [c.input]: "V" }).code, `${c.m}: with ${c.input} it renders`).toBe("ok");
  });

  it.each([
    { name: "a name set and read at the top", tpl: '{{SET x = "a"}}[${{x}}]{{IF x}}y{{END_IF}}', data: {} },
    { name: "a name set in a FOR body and read there", tpl: "{{FOR xs AS i}}{{SET u = i}}[${{u}}]{{END_FOR}}", data: { xs: ["a", "b"] } },
    { name: "a name set at the top and read in nested blocks", tpl: '{{SET x = "a"}}{{IF t}}{{FOR xs AS i}}[${{x}}${{i}}]{{END_FOR}}{{END_IF}}', data: { t: true, xs: ["a"] } },
  ])("st-analyze: $name is no input and the strict run needs no data for it", (c) => {
    const names = analyzed(c.tpl).variables.map((v) => v.name);
    for (const entry of ["render-strict", "resolve-strict"] as Entry[]) {
      const o = run(entry, c.tpl, c.data);
      check(o.code, `[${entry}] the strict run succeeds with only the listed inputs ${JSON.stringify(names)} (got ${o.code} ${o.message ?? ""})`).toBe("ok");
    }
    check(names.filter((n) => n === "x" || n === "u"), "the SET name is not an input").toEqual([]);
  });
});

// =====================================================================================
// st-keywords: the lexer reads its table by own property and exports it
// =====================================================================================

const OLD_PAIRS: Array<[string, string | undefined]> = [
  ["IF", "END_IF"], ["ELSEIF", undefined], ["ELSE", undefined], ["CASE", "END_CASE"], ["WHEN", "END_WHEN"], ["DEFAULT", "END_DEFAULT"],
  ["FOR", "END_FOR"], ["LIST", "END_LIST"], ["LIST_ITEM", "END_LIST_ITEM"], ["TABLE", "END_TABLE"], ["HEADER", "END_HEADER"],
  ["ROW", "END_ROW"], ["SECTION", "END_SECTION"], ["FENCE", "END_FENCE"], ["RAW", "END_RAW"],
];
const has = (k: string) => Object.prototype.hasOwnProperty.call(KEYWORDS, k);
/** The block list derived from the keyword table, as surfaces.test.ts derives it. */
const derivedPairs = (): Array<[string, string | undefined]> =>
  Object.keys(KEYWORDS)
    .filter((k) => !k.startsWith("END_"))
    .map((k): [string, string | undefined] => [k, has(`END_${k}`) ? `END_${k}` : undefined]);

describe("st-keywords: the keyword table", () => {
  const tags = ["constructor", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"];
  const tagCases = tags.map((t) => ({ t, ...marked("a\n  §{{" + t + "}}") }));
  it.each(tagCases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-keywords: [$entry] {{$c.t}} is an unknown tag", ({ entry, c }) => {
    verifyOutcome(run(entry, c.tpl, DATA), ERR("syntax-error", c.line, c.col, `Unknown template tag: {{${c.t}}}`), `st-keywords [${entry}] {{${c.t}}}`);
  });
  it.each(tagCases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-keywords: [$kind] {{$c.t}} is an unknown tag", ({ kind, c }) => {
    verifyOutcome(runStatic(kind, c.tpl), ERR("syntax-error", c.line, c.col, `Unknown template tag: {{${c.t}}}`), `st-keywords [${kind}] {{${c.t}}}`);
  });
  it.each(ENTRIES)("st-keywords: [%s] {{__proto__}} keeps its message", (entry) => {
    verifyOutcome(run(entry, "{{__proto__}}", DATA), ERR("syntax-error", 1, 1, "Unknown template tag: {{__}}"), `st-keywords [${entry}] {{__proto__}}`);
  });

  it("st-keywords: the lexer exports a keyword table with SET and with no END_SET", () => {
    check(typeof KEYWORDS, "KEYWORDS is exported").toBe("object");
    check(has("SET"), "SET is a keyword").toBe(true);
    check(has("END_SET"), "END_SET is not a keyword").toBe(false);
  });
  it("st-keywords: every END_<K> keyword has an opener K", () => {
    const orphans = Object.keys(KEYWORDS).filter((k) => k.startsWith("END_") && !has(k.slice(4)));
    check(orphans, "closers with no opener").toEqual([]);
  });
  it("st-keywords: the derived block table keeps today's rows and adds SET with no closer", () => {
    const got = new Map(derivedPairs());
    const want = new Map<string, string | undefined>([...OLD_PAIRS, ["SET", undefined]]);
    check([...got.entries()].sort(), "the openers with their closers").toEqual([...want.entries()].sort());
  });
  it("st-keywords: every opener in the table has a spec().blocks entry with the closer the table gives", () => {
    for (const [open, close] of derivedPairs()) {
      const block = spec().blocks.find((b) => b.name === open);
      check(block, `spec().blocks lists ${open}`).toBeDefined();
      check(block?.closes, `${open} closes with ${close ?? "nothing"}`).toBe(close);
    }
  });
  it("st-keywords: spec().blocks has no name outside the table", () => {
    const known = derivedPairs().map(([o]) => o);
    check(spec().blocks.map((b) => b.name).filter((n) => !known.includes(n)), "names outside the table").toEqual([]);
  });
  it("st-keywords: spec().blocks lists SET with its arguments, a description and no closes", () => {
    const set = spec().blocks.find((b) => b.name === "SET");
    check(set, "SET is listed").toBeDefined();
    check(set?.closes, "SET has no closer").toBeUndefined();
    check(set?.args, "SET shows its arguments").toBe("name = expression");
    check(/local/i.test(set?.description ?? "") && /block/i.test(set?.description ?? ""), `the description says it binds a local for the rest of its block: ${set?.description}`).toBe(true);
  });
});

// =====================================================================================
// st-openapi: usedIn is not a closed enum
// =====================================================================================

describe("st-openapi: the usedIn list names its kinds in a description", () => {
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "api", "openapi.json"), "utf8"));
  const found: any[] = [];
  const walk = (node: any) => {
    if (node && typeof node === "object") {
      if (node.properties && node.properties.usedIn) found.push(node.properties.usedIn);
      for (const v of Object.values(node)) walk(v);
    }
  };
  walk(doc);
  it("st-openapi: the document has the usedIn schema of an analysis variable", () => {
    check(found.length > 0, "a usedIn schema is in api/openapi.json").toBe(true);
  });
  it.each(found.map((f, i) => ({ i, f })))("st-openapi: usedIn #$i is an array of strings with no enum", ({ f }) => {
    check(f.type, "usedIn is an array").toBe("array");
    check(f.items?.type, "its items are strings").toBe("string");
    check(f.items && "enum" in f.items, "its items have no enum").toBe(false);
  });
  it.each(found.map((f, i) => ({ i, f })))("st-openapi: usedIn #$i describes the kinds, set among them", ({ f }) => {
    const text: string = `${f.items?.description ?? ""} ${f.description ?? ""}`;
    for (const kind of ["output", "if", "elseif", "case", "for", "list_item", "table", "set"]) {
      check(new RegExp(`\\b${kind}\\b`).test(text), `the description names ${kind}: ${JSON.stringify(text)}`).toBe(true);
    }
  });
});

// =====================================================================================
// golden case
// =====================================================================================

describe("st-set: golden case", () => {
  it("st-set: golden case lang-set renders to its expected file", () => {
    const g = goldenCase("lang-set");
    check(g.count, "one golden case ran").toBe(1);
    check(g.message, "the case renders to expected.md").toBe("");
  });
});

// =====================================================================================
// st-compat: templates that were valid keep their output (the unmodified code gives these outputs)
// =====================================================================================

// [name, template, maxOutputChars (0 = default), render strict, render lenient, resolve strict, resolve lenient]
// a result starting with ! is an error: !code@line:column
type Guard = [string, string, number, string, string, string, string];
const GUARDS: Guard[] = [
  ["plain","${{a}}",0,"A","A","A","A"],
  ["plain (maxOutputChars 20)","${{a}}",20,"A","A","A","A"],
  ["defMissing","${{missing ?? \"d\"}}",0,"d","d","d","d"],
  ["defMissing (maxOutputChars 20)","${{missing ?? \"d\"}}",20,"d","d","d","d"],
  ["defEmpty","${{empty ?? \"d\"}}",0,"d","d","d","d"],
  ["defEmpty (maxOutputChars 20)","${{empty ?? \"d\"}}",20,"d","d","d","d"],
  ["defZero","${{zero ?? \"d\"}}",0,"d","d","d","d"],
  ["defZero (maxOutputChars 20)","${{zero ?? \"d\"}}",20,"d","d","d","d"],
  ["defFalse","${{f ?? \"d\"}}",0,"d","d","d","d"],
  ["defFalse (maxOutputChars 20)","${{f ?? \"d\"}}",20,"d","d","d","d"],
  ["defNull","${{nul ?? \"d\"}}",0,"d","d","d","d"],
  ["defNull (maxOutputChars 20)","${{nul ?? \"d\"}}",20,"d","d","d","d"],
  ["missing","${{missing}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["missing (maxOutputChars 20)","${{missing}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["missingFilter","${{missing | upper}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["missingFilter (maxOutputChars 20)","${{missing | upper}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["nested","${{o.k}} ${{o.n.d}} ${{xs.1}}",0,"v 1 a","v 1 a","v 1 a","v 1 a"],
  ["nested (maxOutputChars 20)","${{o.k}} ${{o.n.d}} ${{xs.1}}",20,"v 1 a","v 1 a","v 1 a","v 1 a"],
  ["math","${{b + n}}",0,"7","7","7","7"],
  ["math (maxOutputChars 20)","${{b + n}}",20,"7","7","7","7"],
  ["mathFloat","${{price + q}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathFloat (maxOutputChars 20)","${{price + q}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathLit","${{0.1 + 0.2}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathLit (maxOutputChars 20)","${{0.1 + 0.2}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathDiv","${{n / 2}}",0,"2.5","2.5","2.5","2.5"],
  ["mathDiv (maxOutputChars 20)","${{n / 2}}",20,"2.5","2.5","2.5","2.5"],
  ["mathDivZero","${{n / 0}}",0,"!type-error@1:1","!type-error@1:1","Infinity","Infinity"],
  ["mathDivZero (maxOutputChars 20)","${{n / 0}}",20,"!type-error@1:1","!type-error@1:1","Infinity","Infinity"],
  ["mathMod0","${{n % 0}}",0,"!type-error@1:1","!type-error@1:1","NaN","NaN"],
  ["mathMod0 (maxOutputChars 20)","${{n % 0}}",20,"!type-error@1:1","!type-error@1:1","NaN","NaN"],
  ["mathFilter","${{price + q | round=1}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathFilter (maxOutputChars 20)","${{price + q | round=1}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathDefault","${{price + q ?? \"d\"}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathDefault (maxOutputChars 20)","${{price + q ?? \"d\"}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathMissing","${{missing + 1}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["mathMissing (maxOutputChars 20)","${{missing + 1}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["mathBad","${{a + 1}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["mathBad (maxOutputChars 20)","${{a + 1}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["upper","${{s | upper}}",0,"HELLO WORLD","HELLO WORLD","HELLO WORLD","HELLO WORLD"],
  ["upper (maxOutputChars 20)","${{s | upper}}",20,"HELLO WORLD","HELLO WORLD","HELLO WORLD","HELLO WORLD"],
  ["chain","${{s | upper | head=5}}",0,"HELLO","HELLO","HELLO","HELLO"],
  ["chain (maxOutputChars 20)","${{s | upper | head=5}}",20,"HELLO","HELLO","HELLO","HELLO"],
  ["join","${{xs | join=\", \"}}",0,"b, a, b","b, a, b","b, a, b","b, a, b"],
  ["join (maxOutputChars 20)","${{xs | join=\", \"}}",20,"b, a, b","b, a, b","b, a, b","b, a, b"],
  ["uniqueJoin","${{xs | unique | join=\"-\"}}",0,"b-a","b-a","b-a","b-a"],
  ["uniqueJoin (maxOutputChars 20)","${{xs | unique | join=\"-\"}}",20,"b-a","b-a","b-a","b-a"],
  ["json","${{o | json}}",0,"{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}"],
  ["json (maxOutputChars 20)","${{o | json}}",20,"!limit-output@1:1","!limit-output@1:1","!limit-output@1:1","!limit-output@1:1"],
  ["jsonStr","${{s | json}}",0,"\"hello world\"","\"hello world\"","\"hello world\"","\"hello world\""],
  ["jsonStr (maxOutputChars 20)","${{s | json}}",20,"\"hello world\"","\"hello world\"","\"hello world\"","\"hello world\""],
  ["length","${{xs | length}}",0,"3","3","3","3"],
  ["length (maxOutputChars 20)","${{xs | length}}",20,"3","3","3","3"],
  ["len2","${{xs.length}}",0,"3","3","3","3"],
  ["len2 (maxOutputChars 20)","${{xs.length}}",20,"3","3","3","3"],
  ["proto","${{__proto__}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["proto (maxOutputChars 20)","${{__proto__}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["ctor","${{constructor}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["ctor (maxOutputChars 20)","${{constructor}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["oCtor","${{o.constructor}}",0,"","","",""],
  ["oCtor (maxOutputChars 20)","${{o.constructor}}",20,"","","",""],
  ["oProto","${{o.__proto__}}",0,"","","",""],
  ["oProto (maxOutputChars 20)","${{o.__proto__}}",20,"","","",""],
  ["toStr","${{o.toString}}",0,"","","",""],
  ["toStr (maxOutputChars 20)","${{o.toString}}",20,"","","",""],
  ["cyclic","${{cyc}}",0,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["cyclic (maxOutputChars 20)","${{cyc}}",20,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["cyclicJson","${{cyc | json}}",0,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["cyclicJson (maxOutputChars 20)","${{cyc | json}}",20,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["bigint","${{big}}",0,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["bigint (maxOutputChars 20)","${{big}}",20,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["bigintLen","${{big | length}}",0,"1","1","1","1"],
  ["bigintLen (maxOutputChars 20)","${{big | length}}",20,"1","1","1","1"],
  ["nullPrint","[${{nul}}]",0,"[]","[]","[]","[]"],
  ["nullPrint (maxOutputChars 20)","[${{nul}}]",20,"[]","[]","[]","[]"],
  ["objPrint","${{o}}",0,"{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}"],
  ["objPrint (maxOutputChars 20)","${{o}}",20,"!limit-output@1:1","!limit-output@1:1","!limit-output@1:1","!limit-output@1:1"],
  ["arrPrint","${{xs}}",0,"[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]"],
  ["arrPrint (maxOutputChars 20)","${{xs}}",20,"[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]"],
  ["boolPrint","${{f}}",0,"false","false","false","false"],
  ["boolPrint (maxOutputChars 20)","${{f}}",20,"false","false","false","false"],
  ["forVar","{{FOR items AS i}}${{i.n}}${{@index1}} {{END_FOR}}",0,"x1 y2 ","x1 y2 ","x1 y2 ","x1 y2 "],
  ["forVar (maxOutputChars 20)","{{FOR items AS i}}${{i.n}}${{@index1}} {{END_FOR}}",20,"x1 y2 ","x1 y2 ","x1 y2 ","x1 y2 "],
  ["forMissingMeta","${{@index0}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["forMissingMeta (maxOutputChars 20)","${{@index0}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["forShadow","{{FOR items AS a}}${{a.n}}{{END_FOR}}${{a}}",0,"xyA","xyA","xyA","xyA"],
  ["forShadow (maxOutputChars 20)","{{FOR items AS a}}${{a.n}}{{END_FOR}}${{a}}",20,"xyA","xyA","xyA","xyA"],
  ["ifCond","{{IF b > 1}}y{{ELSE}}n{{END_IF}}",0,"y","y","y","y"],
  ["ifCond (maxOutputChars 20)","{{IF b > 1}}y{{ELSE}}n{{END_IF}}",20,"y","y","y","y"],
  ["longPlain","${{long}}",0,"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"],
  ["longPlain (maxOutputChars 20)","${{long}}",20,"!limit-output@1:1","!limit-output@1:1","!limit-output@1:1","!limit-output@1:1"],
  ["tagLower","{{set x = 1}}",0,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagLower (maxOutputChars 20)","{{set x = 1}}",20,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagEndSet","{{END_SET}}",0,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagEndSet (maxOutputChars 20)","{{END_SET}}",20,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagProto","{{__proto__}}",0,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagProto (maxOutputChars 20)","{{__proto__}}",20,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
];

function guardWant(s: string): Want {
  if (!s.startsWith("!")) return OUT(s);
  const m = /^!([a-z-]+)@(\d+):(\d+)$/.exec(s) as RegExpExecArray;
  return ERR(m[1], Number(m[2]), Number(m[3]));
}

describe("st-compat: old templates keep their output", () => {
  const cases = GUARDS.flatMap((g) => ENTRIES.map((entry, i) => ({ entry, name: g[0], tpl: g[1], limit: g[2], want: g[3 + i] as string })));
  it.each(cases)("st-compat: [$entry] $name", ({ entry, tpl, limit, want, name }) => {
    const o = run(entry, tpl, PROBE, limit ? { maxOutputChars: limit } : undefined);
    verifyOutcome(o, guardWant(want), `st-compat [${entry}] ${name}`);
  });

  it.each(ENTRIES)("st-compat: [%s] the words SET x = 1 outside a tag are plain text", (entry) => {
    check(run(entry, "SET x = 1 and more", PROBE).output, "plain text").toBe("SET x = 1 and more");
  });
  it.each(ENTRIES)("st-compat: [%s] a data name read after a FOR with the same item name is the data again", (entry) => {
    check(run(entry, "{{FOR items AS a}}${{a.n}}{{END_FOR}}[${{a}}]", PROBE).output, "xy then A").toBe("xy[A]");
  });
});
