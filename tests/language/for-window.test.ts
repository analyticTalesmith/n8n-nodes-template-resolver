/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render, validate } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { spec } from "../../core/src/spec";
import { Interpreter } from "../../core/src/interpreter";
import { Limits } from "../../core/src/types";
import { runGoldenCases } from "../golden/harness";
import { check } from "../headless/http-helpers";

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];
const LENIENT: Entry[] = ["render-lenient", "resolve-lenient"];
const STRICT: Entry[] = ["render-strict", "resolve-strict"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  message?: string;
  output?: string;
  iterations?: number;
}

function run(entry: Entry, template: string, data: Record<string, any>, limits?: Partial<Limits>): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode, limits });
      if (r.ok) return { code: "ok", output: r.output, iterations: r.stats.iterations };
      const d = r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, message: d.message, output: r.output, iterations: r.stats.iterations };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode, limits });
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
      const d = r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, message: d.message };
    }
    const a = analyze(template);
    const d = a.diagnostics[0];
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, message: d.message };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

type Want = { out: string } | { err: string; line: number; col: number; has?: string };
type Wants = Want | { strict: Want; lenient: Want };
const OUT = (out: string): Want => ({ out });
const ERR = (err: string, line: number, col: number, has?: string): Want => ({ err, line, col, has });
const SL = (strict: Want, lenient: Want): Wants => ({ strict, lenient });
const pick = (w: Wants, entry: Entry): Want => ("strict" in w ? (entry.endsWith("strict") ? w.strict : w.lenient) : w);

interface Row {
  name: string;
  tpl: string;
  data: Record<string, any>;
  want: Wants;
  entries?: Entry[];
  limits?: Partial<Limits>;
}

function verify(entry: Entry, r: Row, id: string): void {
  const o = run(entry, r.tpl, r.data, r.limits);
  const want = pick(r.want, entry);
  if ("err" in want) {
    check(o.code, `${id} [${entry}] ${r.name}: expects the error ${want.err}`).toBe(want.err);
    check({ line: o.line, column: o.column }, `${id} [${entry}] ${r.name}: located at ${want.line}:${want.col}`).toEqual({
      line: want.line,
      column: want.col,
    });
    if (want.has) check(o.message ?? "", `${id} [${entry}] ${r.name}: the message names ${want.has}`).toContain(want.has);
    return;
  }
  check(o.code, `${id} [${entry}] ${r.name}: renders without an error`).toBe("ok");
  check(o.output, `${id} [${entry}] ${r.name}: renders ${JSON.stringify(want.out)}`).toBe(want.out);
}

function expand(rows: Row[]) {
  return rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
}

const XS = ["a", "b", "c", "d", "e"];
/** A FOR tag that starts at line 2, column 3, so every located error is told apart from 1:1. */
const PRE = "a\n  ";
const forT = (args: string, body = "${{x}},", els?: string) =>
  `${PRE}{{FOR xs AS x${args ? " " + args : ""}}}${body}${els === undefined ? "" : "{{ELSE}}" + els}{{END_FOR}}`;
const O = (s: string) => OUT(PRE + s);
const AT = (code: string, has?: string) => ERR(code, 2, 3, has);

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(10);

// =====================================================================================
// fw-window
// =====================================================================================

describe("fw-window: limit and offset", () => {
  const rows: Row[] = [
    { name: "limit=2 literal", tpl: forT("limit=2"), data: { xs: XS }, want: O("a,b,") },
    { name: "offset=2 literal", tpl: forT("offset=2"), data: { xs: XS }, want: O("c,d,e,") },
    { name: "limit=2 offset=1", tpl: forT("limit=2 offset=1"), data: { xs: XS }, want: O("b,c,") },
    { name: "offset=1 limit=2 (any order)", tpl: forT("offset=1 limit=2"), data: { xs: XS }, want: O("b,c,") },
    { name: "limit=0 renders nothing", tpl: forT("limit=0"), data: { xs: XS }, want: O("") },
    { name: "offset=0 renders everything", tpl: forT("offset=0"), data: { xs: XS }, want: O("a,b,c,d,e,") },
    { name: "limit larger than the array", tpl: forT("limit=99"), data: { xs: XS }, want: O("a,b,c,d,e,") },
    { name: "offset past the end", tpl: forT("offset=99"), data: { xs: XS }, want: O("") },
    { name: "offset equal to the length", tpl: forT("offset=5"), data: { xs: XS }, want: O("") },
    { name: "limit at the largest safe integer", tpl: forT("limit=9007199254740991"), data: { xs: XS }, want: O("a,b,c,d,e,") },
    { name: "limit from a path", tpl: forT("limit=n"), data: { xs: XS, n: 2 }, want: O("a,b,") },
    { name: "offset from a path", tpl: forT("offset=n"), data: { xs: XS, n: 3 }, want: O("d,e,") },
    { name: "both from nested paths", tpl: forT("limit=cfg.page.size offset=cfg.page.skip"), data: { xs: XS, cfg: { page: { size: 2, skip: 2 } } }, want: O("c,d,") },
    { name: "a numeric string 2 is accepted", tpl: forT("limit=n"), data: { xs: XS, n: "2" }, want: O("a,b,") },
    { name: "a numeric string with surrounding spaces is accepted", tpl: forT("limit=n"), data: { xs: XS, n: " 2 " }, want: O("a,b,") },
    { name: "a numeric string 2.0 is accepted as the integer 2", tpl: forT("limit=n"), data: { xs: XS, n: "2.0" }, want: O("a,b,") },
    { name: "a path value 0 means zero items", tpl: forT("limit=n"), data: { xs: XS, n: 0 }, want: O("") },
    { name: "the window applies to an empty array", tpl: forT("limit=2 offset=1"), data: { xs: [] }, want: O("") },
    // paths are read in the scope outside the loop
    { name: "the loop's own item name is not visible to its window path (data x is read)", tpl: forT("limit=x"), data: { xs: XS, x: 1 }, want: O("a,") },
    { name: "the loop's own item name is not visible: strict mode, no data x", tpl: forT("limit=x"), data: { xs: XS }, want: SL(AT("missing-variable", "x"), O("a,b,c,d,e,")) },
    { name: "an @ name outside any loop is a missing window path", tpl: forT("limit=@index0"), data: { xs: XS }, want: SL(AT("missing-variable"), O("a,b,c,d,e,")) },
    {
      name: "an outer loop's item name is visible to the window path",
      tpl: "{{FOR outer AS o}}{{FOR xs AS x limit=o}}${{x}}{{END_FOR}}|{{END_FOR}}",
      data: { xs: ["a", "b", "c"], outer: [1, 2] },
      want: OUT("a|ab|"),
    },
    {
      name: "an outer loop's @index1 is visible to the window path",
      tpl: "{{FOR outer AS o}}{{FOR xs AS x limit=@index1}}${{x}}{{END_FOR}}|{{END_FOR}}",
      data: { xs: ["a", "b", "c"], outer: ["p", "q"] },
      want: OUT("a|ab|"),
    },
    {
      name: "an inner window path that names the outer item of the same name reads the outer item",
      tpl: "{{FOR outer AS o}}{{FOR xs AS o limit=o}}${{o}}{{END_FOR}}|{{END_FOR}}",
      data: { xs: ["a", "b", "c"], outer: [1, 2] },
      want: OUT("a|ab|"),
    },
    {
      name: "a literal -1 in a branch that never runs is not an error",
      tpl: "{{IF false}}{{FOR xs AS x limit=-1}}${{x}}{{END_FOR}}{{END_IF}}z",
      data: { xs: XS },
      want: OUT("z"),
    },
  ];
  it.each(expand(rows))("fw-window: [$entry] $name", ({ entry, r }) => verify(entry, r, "fw-window"));

  // a window value that is not a non-negative safe integer is a type-error at the FOR, whether or not the loop has items
  const bad: Array<[string, any]> = [
    ["-1", -1],
    ["1.5", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["9007199254740992 (unsafe)", 9007199254740992],
    ["the text abc", "abc"],
    ["the text -1", "-1"],
    ["the text 1.5", "1.5"],
    ["the empty text", ""],
    ["the text 1e3", "1e3"],
    ["true", true],
    ["false", false],
    ["an array", [1]],
    ["an object", { a: 1 }],
  ];
  const badRows: Row[] = [];
  for (const arg of ["limit", "offset"]) {
    for (const [label, v] of bad) {
      badRows.push({ name: `${arg}=n with n ${label}, items present`, tpl: forT(`${arg}=n`), data: { xs: XS, n: v }, want: AT("type-error") });
      badRows.push({ name: `${arg}=n with n ${label}, no items`, tpl: forT(`${arg}=n`), data: { xs: [], n: v }, want: AT("type-error") });
    }
  }
  for (const lit of ["limit=-1", "offset=-1", "limit=1.5", "offset=1.5", "limit=9007199254740992", "offset=9007199254740992", "limit=2 offset=-1", "limit=-1 offset=2"]) {
    badRows.push({ name: `the literal ${lit}`, tpl: forT(lit), data: { xs: XS }, want: AT("type-error") });
  }
  for (const [label, xs] of [["an object", { a: 1 }], ["null", null]] as Array<[string, any]>) {
    badRows.push({ name: `a bad limit is not hidden when the iterable is ${label} (lenient)`, tpl: forT("limit=n"), data: { xs, n: -1 }, want: AT("type-error"), entries: LENIENT });
  }
  it.each(expand(badRows))("fw-window: [$entry] a bad window value is a type-error at the FOR: $name", ({ entry, r }) => verify(entry, r, "fw-window"));

  // a missing, null or undefined window path
  const missing: Array<[string, Record<string, any>]> = [
    ["absent", {}],
    ["null", { n: null }],
    ["undefined", { n: undefined }],
  ];
  const missRows: Row[] = [];
  for (const [label, extra] of missing) {
    missRows.push({ name: `limit=n with n ${label}`, tpl: forT("limit=n"), data: { xs: XS, ...extra }, want: SL(AT("missing-variable", "n"), O("a,b,c,d,e,")) });
    missRows.push({ name: `offset=n with n ${label}`, tpl: forT("offset=n"), data: { xs: XS, ...extra }, want: SL(AT("missing-variable", "n"), O("a,b,c,d,e,")) });
    missRows.push({ name: `limit=n offset=2 with n ${label}: only the missing one is ignored`, tpl: forT("limit=n offset=2"), data: { xs: XS, ...extra }, want: SL(AT("missing-variable", "n"), O("c,d,e,")) });
    missRows.push({ name: `limit=2 offset=n with n ${label}: only the missing one is ignored`, tpl: forT("limit=2 offset=n"), data: { xs: XS, ...extra }, want: SL(AT("missing-variable", "n"), O("a,b,")) });
  }
  missRows.push({ name: "a missing nested path names the whole path", tpl: forT("limit=cfg.page.size"), data: { xs: XS, cfg: {} }, want: SL(AT("missing-variable", "cfg.page.size"), O("a,b,c,d,e,")) });
  it.each(expand(missRows))("fw-window: [$entry] a missing path: $name", ({ entry, r }) => verify(entry, r, "fw-window"));
});

// =====================================================================================
// fw-meta
// =====================================================================================

describe("fw-meta: metadata describes the rendered window", () => {
  const META = "${{@index0}}/${{@index1}}/${{@first}}/${{@last}}/${{@notFirst}}/${{@notLast}}/${{@total}};";
  const rows: Row[] = [
    { name: "limit=3 offset=1 numbers the window from 0", tpl: forT("limit=3 offset=1", META), data: { xs: XS }, want: O("0/1/true/false/false/true/3;1/2/false/false/true/true/3;2/3/false/true/true/false/3;") },
    { name: "no window: @total is the array length", tpl: forT("", "${{@total}}"), data: { xs: XS }, want: O("55555") },
    { name: "limit=2: @total is 2", tpl: forT("limit=2", "${{@total}}"), data: { xs: XS }, want: O("22") },
    { name: "offset=3: @total is the 2 items left", tpl: forT("offset=3", "${{@total}}"), data: { xs: XS }, want: O("22") },
    { name: "limit larger than the rest: @total is what remains", tpl: forT("limit=9 offset=3", "${{@total}}"), data: { xs: XS }, want: O("22") },
    { name: "a single windowed item is first and last", tpl: forT("limit=1 offset=2", "${{@first}}${{@last}}${{@notFirst}}${{@notLast}}${{@total}}"), data: { xs: XS }, want: O("truetruefalsefalse1") },
    { name: "@first and @last follow the window, not the array", tpl: forT("limit=2 offset=1", "{{IF @first}}[{{END_IF}}${{x}}{{IF @last}}]{{END_IF}}"), data: { xs: XS }, want: O("[bc]") },
    { name: "@total in a condition", tpl: forT("limit=3", "{{IF @total == 3}}Y{{ELSE}}N{{END_IF}}"), data: { xs: XS }, want: O("YYY") },
    { name: "@index1 as the last position equals @total", tpl: forT("limit=2 offset=1", "{{IF @index1 == @total}}last{{END_IF}}"), data: { xs: XS }, want: O("last") },
    {
      name: "inner and outer @total are told apart and the outer one returns after the inner loop",
      tpl: "{{FOR outer AS o}}${{@total}}[{{FOR xs AS x limit=2}}${{@total}}{{END_FOR}}]${{@total}};{{END_FOR}}",
      data: { xs: XS, outer: [1, 2, 3] },
      want: OUT("3[22]3;3[22]3;3[22]3;"),
    },
    {
      name: "a windowed outer loop and its metadata after an inner loop",
      tpl: "{{FOR outer AS o limit=2}}{{FOR xs AS x limit=1}}${{x}}{{END_FOR}}${{o}}${{@index0}}${{@total}};{{END_FOR}}",
      data: { xs: XS, outer: [1, 2, 3] },
      want: OUT("a102;a212;"),
    },
    { name: "@total outside any loop", tpl: "${{@total}}", data: {}, want: SL(ERR("missing-variable", 1, 1, "@total"), OUT("")) },
    { name: "@total after the loop ended", tpl: "{{FOR xs AS x}}${{x}}{{END_FOR}}[${{@total}}]", data: { xs: XS }, want: SL(ERR("missing-variable", 1, 34, "@total"), OUT("abcde[]")) },
    { name: "@total in an IF condition outside a loop", tpl: "{{IF @total}}Y{{ELSE}}N{{END_IF}}", data: {}, want: SL(ERR("missing-variable", 1, 1), OUT("N")) },
  ];
  it.each(expand(rows))("fw-meta: [$entry] $name", ({ entry, r }) => verify(entry, r, "fw-meta"));

  it.each(["render", "resolve"])("fw-meta: [%s] the golden-style windowed output keeps astral characters", (m) => {
    const tpl = forT("limit=2", "${{x}}${{@index1}},");
    const o = run(m === "render" ? "render-strict" : "resolve-strict", tpl, { xs: ["😀", "𝒳", "z"] });
    check(o.output, `${m}: emoji items survive the window`).toBe(PRE + "😀1,𝒳2,");
  });

  it("fw-meta: golden case lang-for-window renders to its expected file", () => {
    const casesDir = path.join(__dirname, "..", "golden", "render-cases");
    const only = fs.mkdtempSync(path.join(os.tmpdir(), "tr-gold-"));
    try {
      const src = path.join(casesDir, "lang-for-window");
      const dst = path.join(only, "lang-for-window");
      fs.mkdirSync(dst);
      for (const f of ["template.md", "data.json", "options.json", "expected.md"]) {
        check(fs.existsSync(path.join(src, f)), `the case folder holds ${f}`).toBe(true);
        fs.copyFileSync(path.join(src, f), path.join(dst, f));
      }
      const results = runGoldenCases(
        only,
        (template, data, options) => {
          const r = render(template, data, options);
          if (!r.ok) throw new Error(`render failed: ${r.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`);
          return r.output;
        },
        { update: false }
      );
      check(results.length, "one golden case ran").toBe(1);
      check(results[0].message ?? "", "the case renders to expected.md").toBe("");
    } finally {
      fs.rmSync(only, { recursive: true, force: true });
    }
  });
});

// =====================================================================================
// fw-else
// =====================================================================================

describe("fw-else: the empty branch", () => {
  const E = (args: string) => forT(args, "${{x}},", "none");
  const rows: Row[] = [
    { name: "an empty array", tpl: E(""), data: { xs: [] }, want: O("none") },
    { name: "offset past the end", tpl: E("offset=9"), data: { xs: XS }, want: O("none") },
    { name: "limit=0", tpl: E("limit=0"), data: { xs: XS }, want: O("none") },
    { name: "limit from a path equal to 0", tpl: E("limit=n"), data: { xs: XS, n: 0 }, want: O("none") },
    { name: "one item renders: no empty branch", tpl: E(""), data: { xs: ["a"] }, want: O("a,") },
    { name: "a window of one item renders: no empty branch", tpl: E("limit=1 offset=4"), data: { xs: XS }, want: O("e,") },
    { name: "several items render: no empty branch", tpl: E("limit=2"), data: { xs: XS }, want: O("a,b,") },
    { name: "an item that renders empty text still counts as rendered", tpl: forT("", "${{x}}", "none"), data: { xs: [""] }, want: O("") },
    { name: "an empty main body with items renders nothing and not the ELSE", tpl: forT("", "", "none"), data: { xs: XS }, want: O("") },
    { name: "an empty ELSE body with no items renders nothing", tpl: forT("", "${{x}}", ""), data: { xs: [] }, want: O("") },
    { name: "a missing iterable", tpl: E(""), data: {}, want: SL(AT("missing-variable", "xs"), O("none")) },
    { name: "a null iterable", tpl: E(""), data: { xs: null }, want: SL(AT("type-error"), O("none")) },
    { name: "a non-iterable object", tpl: E(""), data: { xs: { a: 1 } }, want: SL(AT("type-error"), O("none")) },
    // not bound inside the ELSE body
    { name: "the loop name is not bound in the ELSE body (strict: missing)", tpl: "{{FOR xs AS x}}${{x}}{{ELSE}}[${{x}}]{{END_FOR}}", data: { xs: [] }, want: SL(ERR("missing-variable", 1, 31, "x"), OUT("[]")) },
    { name: "the loop name in the ELSE body reads the data variable of that name", tpl: "{{FOR xs AS x}}${{x}}{{ELSE}}[${{x}}]{{END_FOR}}", data: { xs: [], x: "D" }, want: OUT("[D]") },
    { name: "@index0 is not bound in the ELSE body", tpl: "{{FOR xs AS x}}{{ELSE}}[${{@index0}}]{{END_FOR}}", data: { xs: [] }, want: SL(ERR("missing-variable", 1, 25, "@index0"), OUT("[]")) },
    { name: "@total is not bound in the ELSE body", tpl: "{{FOR xs AS x}}{{ELSE}}[${{@total}}]{{END_FOR}}", data: { xs: [] }, want: SL(ERR("missing-variable", 1, 25, "@total"), OUT("[]")) },
    {
      name: "an outer loop's name and metadata stay visible in the inner ELSE body",
      tpl: "{{FOR outer AS o}}{{FOR xs AS x}}{{ELSE}}${{o}}${{@index0}}${{@total}}{{END_FOR}}{{END_FOR}}",
      data: { outer: [7, 8], xs: [] },
      want: OUT("702812"),
    },
    // IF and FOR are not confused
    { name: "an IF's own ELSE inside a FOR body, items present", tpl: forT("", '{{IF x == "a"}}A{{ELSE}}O{{END_IF}}', "E"), data: { xs: ["a", "b"] }, want: O("AO") },
    { name: "an IF's own ELSE inside a FOR body, no items", tpl: forT("", '{{IF x == "a"}}A{{ELSE}}O{{END_IF}}', "E"), data: { xs: [] }, want: O("E") },
    { name: "a FOR with ELSE inside an IF branch (true)", tpl: "{{IF t}}{{FOR xs AS x}}${{x}}{{ELSE}}E{{END_FOR}}{{ELSE}}F{{END_IF}}", data: { t: true, xs: [] }, want: OUT("E") },
    { name: "a FOR with ELSE inside an IF branch (false)", tpl: "{{IF t}}{{FOR xs AS x}}${{x}}{{ELSE}}E{{END_FOR}}{{ELSE}}F{{END_IF}}", data: { t: false, xs: [] }, want: OUT("F") },
    { name: "a FOR with ELSE inside an IF ELSE branch", tpl: "{{IF t}}Y{{ELSE}}{{FOR xs AS x}}${{x}}{{ELSE}}E{{END_FOR}}{{END_IF}}", data: { t: false, xs: [] }, want: OUT("E") },
    { name: "text after the FOR in the IF branch is not part of the ELSE", tpl: "{{IF t}}{{FOR xs AS x}}${{x}}{{ELSE}}E{{END_FOR}}X{{ELSE}}F{{END_IF}}", data: { t: true, xs: ["a"] }, want: OUT("aX") },
    {
      name: "ELSE in a nested FOR inside an IF inside a FOR",
      tpl: "{{FOR outer AS o}}{{IF o}}{{FOR xs AS x limit=o}}${{x}}{{ELSE}}-{{END_FOR}}{{ELSE}}off{{END_IF}};{{END_FOR}}",
      data: { outer: [0, 1, 2], xs: ["a", "b", "c"] },
      want: OUT("off;a;ab;"),
    },
    {
      name: "the same loop name in two sequential loops, the first empty",
      tpl: "{{FOR xs AS x}}${{x}}{{ELSE}}none{{END_FOR}}{{FOR ys AS x}}${{x}}{{ELSE}}none{{END_FOR}}",
      data: { xs: [], ys: ["q"] },
      want: OUT("noneq"),
    },
    {
      name: "an ELSE directly inside an inner FOR belongs to the inner FOR",
      tpl: "{{FOR outer AS o}}{{FOR xs AS x}}${{x}}{{ELSE}}i{{END_FOR}}{{ELSE}}o{{END_FOR}}",
      data: { outer: [1], xs: [] },
      want: OUT("i"),
    },
    {
      name: "an outer FOR ELSE runs when the outer is empty, the inner never runs",
      tpl: "{{FOR outer AS o}}{{FOR xs AS x}}${{x}}{{ELSE}}i{{END_FOR}}{{ELSE}}o{{END_FOR}}",
      data: { outer: [], xs: [] },
      want: OUT("o"),
    },
  ];
  it.each(expand(rows))("fw-else: [$entry] $name", ({ entry, r }) => verify(entry, r, "fw-else"));

  const syn: Array<{ name: string; tpl: string; line: number; col: number }> = [
    { name: "a second ELSE in one FOR", tpl: "a\n{{FOR xs AS x}}b{{ELSE}}c\n  {{ELSE}}d{{END_FOR}}", line: 3, col: 3 },
    { name: "a second ELSE directly after the first", tpl: "{{FOR xs AS x}}{{ELSE}}{{ELSE}}{{END_FOR}}", line: 1, col: 24 },
    { name: "a second ELSE in a FOR that never runs", tpl: "{{IF false}}{{FOR xs AS x}}b{{ELSE}}c{{ELSE}}d{{END_FOR}}{{END_IF}}", line: 1, col: 38 },
    { name: "ELSEIF directly inside a FOR is an unexpected token", tpl: "a\n{{FOR xs AS x}}b\n  {{ELSEIF t}}c{{END_FOR}}", line: 3, col: 3 },
    { name: "ELSEIF after the FOR's ELSE", tpl: "{{FOR xs AS x}}b{{ELSE}}c{{ELSEIF t}}d{{END_FOR}}", line: 1, col: 26 },
    { name: "ELSE outside IF and FOR", tpl: "a\n  {{ELSE}}b", line: 2, col: 3 },
    { name: "ELSE in a nested non-FOR block is not the FOR's", tpl: '{{FOR xs AS x}}{{SECTION "T"}}a{{ELSE}}b{{END_SECTION}}{{END_FOR}}', line: 1, col: 32 },
    { name: "ELSE after END_FOR", tpl: "{{FOR xs AS x}}a{{END_FOR}}{{ELSE}}b", line: 1, col: 28 },
  ];
  const synCases = syn.flatMap((s) => ENTRIES.map((entry) => ({ entry, ...s })));
  it.each(synCases)("fw-else: [$entry] $name is a syntax-error at the tag", (c) => {
    const o = run(c.entry, c.tpl, { xs: XS, t: true });
    check(o.code, `${c.entry}: ${c.name} is a syntax-error`).toBe("syntax-error");
    check({ line: o.line, column: o.column }, `${c.entry}: located at ${c.line}:${c.col}`).toEqual({ line: c.line, column: c.col });
  });
  const stCases = syn.flatMap((s) => (["validate", "analyze"] as const).map((kind) => ({ kind, ...s })));
  it.each(stCases)("fw-else: [$kind] $name is reported as a syntax-error at the tag", (c) => {
    const o = runStatic(c.kind, c.tpl);
    check(o.code, `${c.kind}: ${c.name} is a syntax-error`).toBe("syntax-error");
    check({ line: o.line, column: o.column }, `${c.kind}: located at ${c.line}:${c.col}`).toEqual({ line: c.line, column: c.col });
  });

  it.each(["{{ELSE}}", "{{ELSEIF t}}"])("fw-else: ELSE misuse keeps the Unexpected token message (%s)", (tag) => {
    const tpl = tag === "{{ELSE}}" ? "a{{ELSE}}b" : "{{FOR xs AS x}}a" + tag + "b{{END_FOR}}";
    const o = run("render-strict", tpl, { xs: XS, t: true });
    check(o.code, "syntax-error").toBe("syntax-error");
    check(o.message ?? "", "the message says Unexpected token").toContain("Unexpected token");
  });

  it.each(["validate", "analyze"] as const)("fw-else: [%s] a FOR with an ELSE body and a window is valid", (kind) => {
    check(runStatic(kind, forT("limit=2 offset=1", "${{x}}", "none")).code, `${kind}: ok`).toBe("ok");
  });
});

// =====================================================================================
// fw-args
// =====================================================================================

describe("fw-args: bad FOR arguments are syntax errors at the FOR tag", () => {
  const bad: Array<[string, string]> = [
    ["an unknown argument", "xs AS x max=3"],
    ["an unknown argument after a good one", "xs AS x limit=1 max=3"],
    ["an upper case LIMIT", "xs AS x LIMIT=3"],
    ["an upper case OFFSET", "xs AS x OFFSET=3"],
    ["a repeated limit", "xs AS x limit=1 limit=2"],
    ["a repeated offset", "xs AS x offset=1 offset=2"],
    ["a repeated limit around an offset", "xs AS x limit=1 offset=2 limit=3"],
    ["a trailing word", "xs AS x extra"],
    ["a trailing word after a window", "xs AS x limit=1 extra"],
    ["two trailing words", "xs AS x y z"],
    ["a missing item name", "xs AS"],
    ["a missing item name before an argument", "xs AS limit=1"],
    ["a missing AS", "xs"],
    ["limit without a value sign", "xs AS x limit"],
    ["offset without a value sign", "xs AS x offset"],
    ["an empty limit value", "xs AS x limit="],
    ["an empty offset value", "xs AS x offset= limit=1"],
    ["a quoted limit value", 'xs AS x limit="3"'],
    ["a single quoted offset value", "xs AS x offset='3'"],
    ["a space before the equals sign", "xs AS x limit =3"],
    ["a space after the equals sign", "xs AS x limit= 3"],
    ["spaces around the equals sign", "xs AS x limit = 3"],
    ["a comma between arguments", "xs AS x limit=1,offset=2"],
    ["a window argument with a bad path", "xs AS x limit=a..b"],
    ["a second item name", "xs AS x AS y"],
  ];
  const placements: Array<[string, (t: string) => string, number, number]> = [
    ["plain", (t) => `a\n  ${t}b{{END_FOR}}`, 2, 3],
    ["in an IF that never renders", (t) => `a\n{{IF false}}\n  ${t}b{{END_FOR}}\n{{END_IF}}`, 3, 3],
    ["in a FOR with no items", (t) => `a\n{{FOR none AS n}}\n  ${t}b{{END_FOR}}\n{{END_FOR}}`, 3, 3],
    ["in a TABLE", (t) => `{{TABLE}}${t}{{ROW}}b{{END_ROW}}{{END_FOR}}{{END_TABLE}}`, 1, 10],
    ["in an ELSE branch of an IF that never renders", (t) => `{{IF t}}x{{ELSE}}\n  ${t}b{{END_FOR}}{{END_IF}}`, 2, 3],
  ];
  const data = { xs: XS, none: [] as any[], t: true };
  const cases = placements.flatMap(([pn, build, line, col]) => bad.map(([label, args]) => ({ pn, label, template: build(`{{FOR ${args}}}`), line, col })));
  const runCases = cases.flatMap((c) => ENTRIES.map((entry) => ({ entry, ...c })));
  it.each(runCases)("fw-args: [$entry] $pn: $label is a syntax-error at the FOR tag", (c) => {
    const o = run(c.entry, c.template, data);
    check(o.code, `${c.entry}: ${c.label} is a syntax-error`).toBe("syntax-error");
    check({ line: o.line, column: o.column }, `${c.entry}: located at the FOR tag ${c.line}:${c.col}`).toEqual({ line: c.line, column: c.col });
  });
  const stCases = cases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, ...c })));
  it.each(stCases)("fw-args: [$kind] $pn: $label is reported as a syntax-error at the FOR tag", (c) => {
    const o = runStatic(c.kind, c.template);
    check(o.code, `${c.kind}: ${c.label} is a syntax-error`).toBe("syntax-error");
    check({ line: o.line, column: o.column }, `${c.kind}: located at the FOR tag`).toEqual({ line: c.line, column: c.col });
  });

  const good: Array<[string, string]> = [
    ["no argument", ""],
    ["limit", "limit=2"],
    ["offset", "offset=1"],
    ["limit then offset", "limit=2 offset=1"],
    ["offset then limit", "offset=1 limit=2"],
    ["limit path", "limit=n"],
    ["a nested path", "limit=cfg.page.size offset=cfg.page.skip"],
    ["an @ path", "limit=@index0"],
  ];
  it.each(good.flatMap(([l, a]) => (["validate", "analyze"] as const).map((k) => ({ k, l, a }))))("fw-args: [$k] $l parses", (c) => {
    check(runStatic(c.k, forT(c.a)).code, `${c.k}: ${c.l} is valid syntax`).toBe("ok");
  });
  it.each(["validate", "analyze"] as const)("fw-args: [%s] the item name of AS stays case-insensitive and takes a window", (k) => {
    check(runStatic(k, "{{FOR xs as x limit=1}}${{x}}{{END_FOR}}").code, `${k}: lower case as with a limit`).toBe("ok");
  });
  it.each(ENTRIES)("fw-args: [%s] a lower case as with a window renders", (entry) => {
    check(run(entry, "{{FOR xs as x limit=1}}${{x}}{{END_FOR}}", { xs: XS }).output, `${entry}: windowed by a lower case as`).toBe("a");
  });
});

// =====================================================================================
// fw-table
// =====================================================================================

describe("fw-table: FOR rows in a TABLE use the same runner", () => {
  const head = "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}";
  const T = (forTag: string, body: string, els?: string) =>
    `${head}{{FOR ${forTag}}}${body}${els === undefined ? "" : "{{ELSE}}" + els}{{END_FOR}}{{END_TABLE}}`;
  const ROW = "{{ROW}}${{x}}|${{@total}}{{END_ROW}}";
  const NONE = "{{ROW}}none|0{{END_ROW}}";
  interface TRow {
    name: string;
    tpl: string;
    data: Record<string, any>;
    has?: string[];
    hasNot?: string[];
    entries?: Entry[];
  }
  const rows: TRow[] = [
    { name: "limit and offset pick the rows, @total is the window size", tpl: T("xs AS x limit=2 offset=1", ROW), data: { xs: XS }, has: ["| b | 2 |", "| c | 2 |"], hasNot: ["| a |", "| d |", "| e |"] },
    { name: "limit from a path", tpl: T("xs AS x limit=n", ROW), data: { xs: XS, n: 1 }, has: ["| a | 1 |"], hasNot: ["| b |"] },
    { name: "no window keeps every row", tpl: T("xs AS x", ROW), data: { xs: ["a", "b"] }, has: ["| a | 2 |", "| b | 2 |"] },
    { name: "an empty array renders the ELSE rows", tpl: T("xs AS x", ROW, NONE), data: { xs: [] }, has: ["none", "0"] },
    { name: "offset past the end renders the ELSE rows", tpl: T("xs AS x offset=9", ROW, NONE), data: { xs: XS }, has: ["none"], hasNot: ["| a |"] },
    { name: "limit=0 renders the ELSE rows", tpl: T("xs AS x limit=0", ROW, NONE), data: { xs: XS }, has: ["none"], hasNot: ["| a |"] },
    { name: "rendered rows do not render the ELSE rows", tpl: T("xs AS x limit=1", ROW, NONE), data: { xs: XS }, has: ["| a | 1 |"], hasNot: ["none"] },
    { name: "a null iterable renders the ELSE rows without an error, even in strict", tpl: T("xs AS x", ROW, NONE), data: { xs: null }, has: ["none"] },
    { name: "a non-iterable object renders the ELSE rows without an error, even in strict", tpl: T("xs AS x", ROW, NONE), data: { xs: { a: 1 } }, has: ["none"] },
    { name: "a non-iterable renders no rows when there is no ELSE (legacy)", tpl: T("xs AS x", ROW), data: { xs: { a: 1 } }, has: ["| A | B |"], hasNot: ["| 1 |"] },
    { name: "a missing iterable renders the ELSE rows in lenient mode", tpl: T("xs AS x", ROW, NONE), data: {}, has: ["none"], entries: LENIENT },
    { name: "a FOR body that is not a ROW is rendered and split on a pipe, windowed", tpl: T("xs AS x limit=2", "${{x}}|${{@index0}}"), data: { xs: XS }, has: ["| a | 0 |", "| b | 1 |"], hasNot: ["| c |"] },
    { name: "an ELSE body that is not a ROW is rendered and split on a pipe", tpl: T("xs AS x", "${{x}}|1", "empty|0"), data: { xs: [] }, has: ["| empty | 0 |"] },
    { name: "the loop name is not bound in the ELSE rows", tpl: T("xs AS x", ROW, "{{ROW}}[${{x}}]|0{{END_ROW}}"), data: { xs: [], x: "D" }, has: ["[D]"] },
  ];
  const cases = rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
  it.each(cases)("fw-table: [$entry] $name", ({ entry, r }) => {
    const o = run(entry, r.tpl, r.data);
    check(o.code, `${entry}: ${r.name} renders without an error`).toBe("ok");
    for (const s of r.has ?? []) check(o.output ?? "", `${entry}: ${r.name}: output holds ${JSON.stringify(s)}`).toContain(s);
    for (const s of r.hasNot ?? []) check((o.output ?? "").includes(s), `${entry}: ${r.name}: output lacks ${JSON.stringify(s)}`).toBe(false);
  });

  const errs: Array<{ name: string; tpl: string; data: Record<string, any>; code: string; entries?: Entry[] }> = [
    { name: "a negative limit", tpl: T("xs AS x limit=n", ROW), data: { xs: XS, n: -1 }, code: "type-error" },
    { name: "a fractional offset", tpl: T("xs AS x offset=n", ROW), data: { xs: XS, n: 1.5 }, code: "type-error" },
    { name: "a bad window with a non-iterable (legacy rule) is not hidden", tpl: T("xs AS x limit=n", ROW), data: { xs: { a: 1 }, n: -1 }, code: "type-error" },
    { name: "a bad window with an empty array", tpl: T("xs AS x limit=n", ROW, NONE), data: { xs: [], n: "abc" }, code: "type-error" },
    { name: "a missing limit path", tpl: T("xs AS x limit=n", ROW), data: { xs: XS }, code: "missing-variable", entries: STRICT },
    { name: "a second ELSE in a TABLE FOR", tpl: T("xs AS x", ROW, NONE + "{{ELSE}}" + NONE), data: { xs: XS }, code: "syntax-error" },
    { name: "an unknown FOR argument in a TABLE FOR", tpl: T("xs AS x max=1", ROW), data: { xs: XS }, code: "syntax-error" },
  ];
  const errCases = errs.flatMap((e) => (e.entries ?? ENTRIES).map((entry) => ({ entry, ...e })));
  it.each(errCases)("fw-table: [$entry] $name is a $code located at the FOR tag", (c) => {
    const o = run(c.entry, c.tpl, c.data);
    check(o.code, `${c.entry}: ${c.name}`).toBe(c.code);
    if (c.code !== "syntax-error" || !c.name.includes("second ELSE")) {
      check({ line: o.line, column: o.column }, `${c.entry}: located at the FOR tag`).toEqual({ line: 1, column: head.length + 1 });
    }
  });

  it.each(["validate", "analyze"] as const)("fw-table: [%s] a TABLE FOR with a window and ELSE rows is valid", (kind) => {
    check(runStatic(kind, T("xs AS x limit=2", ROW, NONE)).code, `${kind}: ok`).toBe("ok");
  });

  it("fw-table: maxIterations counts the rows built by a windowed FOR, not the skipped ones", () => {
    const tpl = T("xs AS x offset=3", ROW);
    check(run("render-strict", tpl, { xs: XS }, { maxIterations: 2 }).code, "2 rows fit in 2").toBe("ok");
    const o = run("render-strict", tpl, { xs: XS }, { maxIterations: 1 });
    check(o.code, "2 rows cross 1").toBe("limit-iterations");
    check({ line: o.line, column: o.column }, "located at the FOR").toEqual({ line: 1, column: head.length + 1 });
  });
});

// =====================================================================================
// fw-limits
// =====================================================================================

describe("fw-limits: iterations and output are bounded", () => {
  const rows: Array<{ name: string; tpl: string; data: Record<string, any>; limits: Partial<Limits>; want: Want; entries?: Entry[] }> = [
    { name: "5 items fit exactly in maxIterations 5", tpl: forT(""), data: { xs: XS }, limits: { maxIterations: 5 }, want: O("a,b,c,d,e,") },
    { name: "5 items cross maxIterations 4 at the FOR", tpl: forT(""), data: { xs: XS }, limits: { maxIterations: 4 }, want: AT("limit-iterations") },
    { name: "skipped offset items do not count: 2 rendered fit in 2", tpl: forT("offset=3"), data: { xs: XS }, limits: { maxIterations: 2 }, want: O("d,e,") },
    { name: "2 rendered cross maxIterations 1 at the FOR", tpl: forT("offset=3"), data: { xs: XS }, limits: { maxIterations: 1 }, want: AT("limit-iterations") },
    { name: "items cut by limit do not count: 2 rendered fit in 2", tpl: forT("limit=2"), data: { xs: XS }, limits: { maxIterations: 2 }, want: O("a,b,") },
    { name: "limit=2 crosses maxIterations 1", tpl: forT("limit=2"), data: { xs: XS }, limits: { maxIterations: 1 }, want: AT("limit-iterations") },
    { name: "limit and offset together: 2 rendered fit in 2", tpl: forT("limit=2 offset=2"), data: { xs: XS }, limits: { maxIterations: 2 }, want: O("c,d,") },
    { name: "zero rendered items fit in maxIterations 0", tpl: forT("limit=0", "${{x}},", "none"), data: { xs: XS }, limits: { maxIterations: 0 }, want: O("none") },
    { name: "an offset past the end fits in maxIterations 0", tpl: forT("offset=9"), data: { xs: XS }, limits: { maxIterations: 0 }, want: O("") },
    { name: "an array of 5 with maxIterations 0 and no window is still limit-iterations", tpl: forT(""), data: { xs: XS }, limits: { maxIterations: 0 }, want: AT("limit-iterations") },
    {
      name: "the error is located at a FOR on a later line",
      tpl: "a\nb\n   {{FOR xs AS x offset=1}}${{x}}{{END_FOR}}",
      data: { xs: XS },
      limits: { maxIterations: 3 },
      want: ERR("limit-iterations", 3, 4),
    },
    // output
    { name: "output inside the loop body: 5 items of 5 chars cross 12", tpl: "{{FOR xs AS x}}${{x}}bcd,{{END_FOR}}", data: { xs: XS }, limits: { maxOutputChars: 12 }, want: ERR("limit-output", 1, 1) },
    { name: "output inside the loop body: a window of 2 items (10 chars) fits in 12", tpl: "{{FOR xs AS x limit=2}}${{x}}bcd,{{END_FOR}}", data: { xs: XS }, limits: { maxOutputChars: 12 }, want: OUT("abcd,bbcd,") },
    { name: "output inside the loop body: skipped items add no output", tpl: "{{FOR xs AS x offset=4}}${{x}}bcd,{{END_FOR}}", data: { xs: XS }, limits: { maxOutputChars: 6 }, want: OUT("ebcd,") },
    { name: "output inside the ELSE body crosses the limit", tpl: "{{FOR xs AS x}}{{ELSE}}0123456789{{END_FOR}}", data: { xs: [] }, limits: { maxOutputChars: 5 }, want: ERR("limit-output", 1, 1) },
    { name: "an ELSE body that fits", tpl: "{{FOR xs AS x}}{{ELSE}}0123456789{{END_FOR}}", data: { xs: [] }, limits: { maxOutputChars: 20 }, want: OUT("0123456789") },
    { name: "an ELSE body is not counted when items render", tpl: "{{FOR xs AS x limit=1}}${{x}}{{ELSE}}0123456789{{END_FOR}}", data: { xs: XS }, limits: { maxOutputChars: 5 }, want: OUT("a") },
    { name: "an ELSE body after earlier output counts the running total", tpl: "0123{{FOR xs AS x}}{{ELSE}}456789{{END_FOR}}", data: { xs: [] }, limits: { maxOutputChars: 8 }, want: ERR("limit-output", 1, 1) },
  ];
  const cases = rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
  it.each(cases)("fw-limits: [$entry] $name", ({ entry, r }) => {
    const o = run(entry, r.tpl, r.data, r.limits);
    const want = r.want;
    if ("err" in want) {
      check(o.code, `${entry}: ${r.name}: expects ${want.err}`).toBe(want.err);
      if (want.err === "limit-iterations") {
        check({ line: o.line, column: o.column }, `${entry}: ${r.name}: located at the FOR tag ${want.line}:${want.col}`).toEqual({ line: want.line, column: want.col });
      }
    } else {
      check(o.code, `${entry}: ${r.name}: renders without an error`).toBe("ok");
      check(o.output, `${entry}: ${r.name}: output`).toBe(want.out);
    }
  });

  const stats: Array<{ name: string; tpl: string; data: Record<string, any>; n: number }> = [
    { name: "no window counts every item", tpl: forT(""), data: { xs: XS }, n: 5 },
    { name: "limit=2 counts 2", tpl: forT("limit=2"), data: { xs: XS }, n: 2 },
    { name: "offset=3 counts 2", tpl: forT("offset=3"), data: { xs: XS }, n: 2 },
    { name: "limit=2 offset=1 counts 2", tpl: forT("limit=2 offset=1"), data: { xs: XS }, n: 2 },
    { name: "offset past the end counts 0", tpl: forT("offset=9"), data: { xs: XS }, n: 0 },
    { name: "limit=0 counts 0", tpl: forT("limit=0"), data: { xs: XS }, n: 0 },
    { name: "an ELSE body does not count as an iteration", tpl: forT("limit=0", "${{x}}", "none"), data: { xs: XS }, n: 0 },
    { name: "an empty array with an ELSE counts 0", tpl: forT("", "${{x}}", "none"), data: { xs: [] }, n: 0 },
    { name: "two sequential windowed loops add up", tpl: "{{FOR xs AS x limit=2}}${{x}}{{END_FOR}}{{FOR xs AS y offset=4}}${{y}}{{END_FOR}}", data: { xs: XS }, n: 3 },
    { name: "an astral windowed loop counts its items", tpl: forT("limit=2"), data: { xs: ["😀", "𝒳", "z"] }, n: 2 },
  ];
  it.each(stats)("fw-limits: stats.iterations $name", (c) => {
    const r = render(c.tpl, c.data, { strictMode: true });
    check(r.ok, "render is ok").toBe(true);
    check(r.stats.iterations, `stats.iterations is ${c.n}`).toBe(c.n);
  });

  it("fw-limits: a cyclic or BigInt item that offset skips is never printed so cannot fail", () => {
    for (const [label, bad] of [["cyclic", cyc], ["BigInt", big]] as Array<[string, any]>) {
      for (const entry of ENTRIES) {
        const skipped = run(entry, forT("offset=1"), { xs: [bad, "b"] });
        check(skipped.code, `${entry}: a skipped ${label} item is fine`).toBe("ok");
        check(skipped.output, `${entry}: only the rendered item prints`).toBe(PRE + "b,");
        const cut = run(entry, forT("limit=1"), { xs: ["a", bad] });
        check(cut.output, `${entry}: a ${label} item cut by the limit is fine`).toBe(PRE + "a,");
        const printed = run(entry, forT("limit=2"), { xs: ["a", bad] });
        check(printed.code, `${entry}: a printed ${label} item is a coded type-error`).toBe("type-error");
      }
    }
  });

  it.each(ENTRIES)("fw-limits: [%s] astral characters survive a windowed loop and an ELSE body", (entry) => {
    check(run(entry, forT("limit=2 offset=1", "${{x}}😀,"), { xs: ["a😀", "𝒳", "z"] }).output, `${entry}: items`).toBe(PRE + "𝒳😀,z😀,");
    check(run(entry, forT("offset=9", "${{x}}", "∅😀"), { xs: ["a"] }).output, `${entry}: ELSE`).toBe(PRE + "∅😀");
  });
});

// =====================================================================================
// fw-scope
// =====================================================================================

describe("fw-scope: loop names and metadata live on a frame", () => {
  const rows: Row[] = [
    { name: "the loop name is gone after END_FOR", tpl: "{{FOR xs AS x limit=1}}${{x}}{{END_FOR}}[${{x}}]", data: { xs: XS }, want: SL(ERR("missing-variable", 1, 42, "x"), OUT("a[]")) },
    { name: "the loop name is gone after END_FOR and a data name of it returns", tpl: "{{FOR xs AS x limit=1}}${{x}}{{END_FOR}}[${{x}}]", data: { xs: XS, x: "D" }, want: OUT("a[D]") },
    { name: "an inner name shadows a data name only inside", tpl: "{{FOR xs AS x limit=1}}${{x}}{{END_FOR}}${{x}}", data: { xs: XS, x: "D" }, want: OUT("aD") },
    { name: "an inner name shadows an outer name only inside", tpl: "{{FOR outer AS o}}{{FOR xs AS o limit=1}}${{o}}{{END_FOR}}${{o}};{{END_FOR}}", data: { xs: XS, outer: [1, 2] }, want: OUT("a1;a2;") },
    { name: "an outer loop's name is visible again after a windowed inner loop", tpl: "{{FOR outer AS o}}{{FOR xs AS x offset=3}}${{x}}{{END_FOR}}${{o}};{{END_FOR}}", data: { xs: XS, outer: [1, 2] }, want: OUT("de1;de2;") },
    { name: "an outer loop's name is visible again after an inner loop that renders nothing", tpl: "{{FOR outer AS o}}{{FOR xs AS x limit=0}}${{x}}{{END_FOR}}${{o}}${{@index1}};{{END_FOR}}", data: { xs: XS, outer: [1, 2] }, want: OUT("11;22;") },
    { name: "an outer loop's name is visible again after an inner ELSE", tpl: "{{FOR outer AS o}}{{FOR xs AS x limit=0}}{{ELSE}}-{{END_FOR}}${{o}}${{@first}};{{END_FOR}}", data: { xs: XS, outer: [1, 2] }, want: OUT("-1true;-2false;") },
    { name: "the same loop name in two sequential loops", tpl: "{{FOR xs AS x limit=1}}${{x}}{{END_FOR}}{{FOR xs AS x offset=4}}${{x}}{{END_FOR}}", data: { xs: XS }, want: OUT("ae") },
    { name: "the same item name in nested loops: the inner wins inside, the outer after", tpl: "{{FOR outer AS x}}${{x}}{{FOR xs AS x limit=2}}${{x}}{{END_FOR}}${{x}};{{END_FOR}}", data: { xs: XS, outer: [1, 2] }, want: OUT("1ab1;2ab2;") },
    { name: "three levels with a window each", tpl: "{{FOR a AS p limit=2}}{{FOR b AS q limit=2}}{{FOR c AS r limit=1}}${{p}}${{q}}${{r}}{{END_FOR}}{{END_FOR}}{{END_FOR}}", data: { a: [1, 2, 3], b: [4, 5, 6], c: [7, 8] }, want: OUT("147157247257") },
    { name: "the window path of an inner loop reads the outer loop's item", tpl: "{{FOR outer AS o}}{{FOR xs AS x offset=o}}${{x}}{{END_FOR}}/{{END_FOR}}", data: { xs: ["a", "b", "c"], outer: [0, 2] }, want: OUT("abc/c/") },
    // prototype names as loop names
    { name: "__proto__ as a loop item name", tpl: "{{FOR xs AS __proto__ limit=1}}${{__proto__}}{{END_FOR}}", data: { xs: XS }, want: OUT("a") },
    { name: "constructor as a loop item name", tpl: "{{FOR xs AS constructor limit=1}}${{constructor}}{{END_FOR}}", data: { xs: XS }, want: OUT("a") },
    { name: "toString as a loop item name with a path into the item", tpl: "{{FOR us AS toString limit=1}}${{toString.name}}{{END_FOR}}", data: { us: [{ name: "N" }] }, want: OUT("N") },
    { name: "constructor as a loop name is gone after END_FOR", tpl: "{{FOR xs AS constructor limit=1}}{{END_FOR}}[${{constructor}}]", data: { xs: XS }, want: SL(ERR("missing-variable", 1, 46, "constructor"), OUT("[]")) },
    { name: "toString is not a data variable", tpl: "${{toString}}", data: {}, want: SL(ERR("missing-variable", 1, 1, "toString"), OUT("")) },
    { name: "__proto__ is not a data variable", tpl: "${{__proto__}}", data: {}, want: SL(ERR("missing-variable", 1, 1, "__proto__"), OUT("")) },
  ];
  it.each(expand(rows))("fw-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "fw-scope"));

});

// =====================================================================================
// fw-no-copy
// =====================================================================================

describe("fw-no-copy: variable reads do not copy the data map", () => {
  class CountingMap extends Map<string, any> {
    counts = { iterator: 0, entries: 0, keys: 0, forEach: 0 };
    [Symbol.iterator](): any {
      this.counts.iterator++;
      return super[Symbol.iterator]();
    }
    entries(): any {
      this.counts.entries++;
      return super.entries();
    }
    keys(): any {
      this.counts.keys++;
      return super.keys();
    }
    forEach(cb: any, thisArg?: any): void {
      this.counts.forEach++;
      super.forEach(cb, thisArg);
    }
  }
  const make = (data: Record<string, any>) => {
    const m = new CountingMap();
    for (const [k, v] of Object.entries(data)) m.set(k, v);
    m.counts = { iterator: 0, entries: 0, keys: 0, forEach: 0 };
    return m;
  };

  const rows: Array<{ name: string; tpl: string; out: string }> = [
    { name: "an IF condition", tpl: '{{FOR xs AS x}}{{IF x == "a"}}A{{ELSE}}B{{END_IF}}{{END_FOR}}', out: "AB" },
    { name: "an ELSEIF condition", tpl: '{{FOR xs AS x}}{{IF x == "z"}}Z{{ELSEIF x == "b"}}B{{ELSE}}-{{END_IF}}{{END_FOR}}', out: "-B" },
    { name: "a math expression", tpl: "{{FOR xs AS x}}${{n * 2}}{{END_FOR}}", out: "44" },
    { name: "a filter", tpl: "{{FOR xs AS x}}${{x | trim}}{{END_FOR}}", out: "ab" },
    { name: "a LIST_ITEM condition", tpl: '{{FOR xs AS x}}{{LIST}}{{LIST_ITEM x == "a"}}hit{{END_LIST_ITEM}}{{END_LIST}}{{END_FOR}}', out: "" },
    { name: "a windowed loop with an IF and a window path", tpl: '{{FOR xs AS x limit=n}}{{IF @first}}F{{END_IF}}{{IF x == "b"}}B{{END_IF}}{{END_FOR}}', out: "FB" },
    { name: "an ELSE body with an IF", tpl: "{{FOR none AS x}}{{ELSE}}{{IF n}}N{{END_IF}}{{END_FOR}}", out: "N" },
    { name: "a nested loop with an IF on the outer name", tpl: "{{FOR xs AS x}}{{FOR xs AS y limit=1}}{{IF x == y}}S{{ELSE}}D{{END_IF}}{{END_FOR}}{{END_FOR}}", out: "SD" },
  ];
  it.each(rows)("fw-no-copy: $name makes zero copies of the data map", (c) => {
    const m = make({ xs: ["a", "b"], none: [], n: 2 });
    let out = "";
    let thrown = "";
    try {
      out = resolveTemplate(c.tpl, m, { strictMode: true });
    } catch (e) {
      thrown = String((e as Error)?.message);
    }
    check(thrown, `${c.name}: the template resolves without an error`).toBe("");
    if (c.out !== "") check(out, `${c.name}: the template still renders its output`).toBe(c.out);
    else check(out, `${c.name}: the LIST_ITEM renders its item`).toContain("hit");
    check(m.counts.iterator, `${c.name}: Symbol.iterator is never called on the data map`).toBe(0);
    check(m.counts.entries, `${c.name}: entries is never called on the data map`).toBe(0);
    check(m.counts.keys, `${c.name}: keys is never called on the data map`).toBe(0);
    check(m.counts.forEach, `${c.name}: forEach is never called on the data map`).toBe(0);
  });

  it("fw-no-copy: a ternary inside a loop makes zero copies of the data map", () => {
    // The ternary form has no template syntax, so the interpreter is given the AST a parser would build for it.
    const at = { line: 1, column: 1 };
    const ast: any = {
      type: "Program",
      ...at,
      body: [
        {
          type: "For",
          ...at,
          iterable: ["xs"],
          itemName: "x",
          body: [{ type: "Ternary", ...at, condition: 'x == "a"', trueValue: "yes", falseValue: "no" }],
        },
      ],
    };
    const m = make({ xs: ["a", "b"] });
    check(new Interpreter(m, { strictMode: true }).interpret(ast), "the ternary picks per item").toBe("yesno");
    check(m.counts.iterator, "Symbol.iterator is never called").toBe(0);
    check(m.counts.entries, "entries is never called").toBe(0);
    check(m.counts.keys, "keys is never called").toBe(0);
    check(m.counts.forEach, "forEach is never called").toBe(0);
  });

  it("fw-no-copy: a loop that errors out still makes no copy", () => {
    const m = make({ xs: ["a"] });
    expect(() => resolveTemplate('{{FOR xs AS x}}{{IF x == "a"}}${{nope}}{{END_IF}}{{END_FOR}}', m, { strictMode: true })).toThrow();
    check(m.counts.iterator + m.counts.entries + m.counts.keys + m.counts.forEach, "no call on the data map").toBe(0);
  });
});

// =====================================================================================
// fw-own
// =====================================================================================

describe("fw-own: non-root path segments read own properties only", () => {
  const rows: Row[] = [];
  const objData = { x: { a: { b: 1 } }, xs: ["p"], s: "abc", us: [{ a: 1 }] };
  for (const seg of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"]) {
    rows.push({ name: `output: x.${seg} is missing`, tpl: `[\${{x.${seg}}}]`, data: objData, want: SL(ERR("missing-variable", 1, 2, `x.${seg}`), OUT("[]")) });
    rows.push({ name: `output: a deeper x.a.${seg} is missing`, tpl: `[\${{x.a.${seg}}}]`, data: objData, want: SL(ERR("missing-variable", 1, 2), OUT("[]")) });
    rows.push({ name: `condition: x.${seg} is missing, not truthy`, tpl: `{{IF x.${seg}}}Y{{ELSE}}N{{END_IF}}`, data: objData, want: SL(ERR("missing-variable", 1, 1), OUT("N")) });
    rows.push({ name: `a loop item: u.${seg} is missing`, tpl: `{{FOR us AS u}}[\${{u.${seg}}}]{{END_FOR}}`, data: objData, want: SL(ERR("missing-variable", 1, 17), OUT("[]")) });
    rows.push({ name: `math: x.${seg} + 1 is missing`, tpl: `\${{x.${seg} + 1}}`, data: objData, want: SL(ERR("missing-variable", 1, 1), OUT("1")), entries: STRICT });
  }
  rows.push(
    { name: "an array's constructor is missing", tpl: "[${{xs.constructor}}]", data: objData, want: SL(ERR("missing-variable", 1, 2), OUT("[]")) },
    { name: "a string's toString is missing", tpl: "[${{s.toString}}]", data: objData, want: SL(ERR("missing-variable", 1, 2), OUT("[]")) },
    { name: "an array's length is its own property and still works", tpl: "${{xs.length}}", data: objData, want: OUT("1") },
    { name: "the root segment constructor is not read from the engine", tpl: "[${{constructor}}]", data: objData, want: SL(ERR("missing-variable", 1, 2), OUT("[]")) },
    { name: "a window path through an inherited key is missing", tpl: forT("limit=x.constructor"), data: { ...objData, xs: XS }, want: SL(AT("missing-variable"), O("a,b,c,d,e,")) },
    { name: "a window path through toString is missing", tpl: forT("offset=x.toString"), data: { ...objData, xs: XS }, want: SL(AT("missing-variable"), O("a,b,c,d,e,")) }
  );
  it.each(expand(rows))("fw-own: [$entry] $name", ({ entry, r }) => verify(entry, r, "fw-own"));

  // an own key with those names still works
  const own = JSON.parse('{"x": {"__proto__": "P", "constructor": "C", "toString": "T", "n": {"__proto__": 2}}, "items": [{"constructor": "I1"}, {"constructor": "I2"}], "xs": ["a","b","c"]}');
  const ownRows: Row[] = [
    { name: "output: an own __proto__ key", tpl: "${{x.__proto__}}", data: own, want: OUT("P") },
    { name: "output: an own constructor key", tpl: "${{x.constructor}}", data: own, want: OUT("C") },
    { name: "output: an own toString key", tpl: "${{x.toString}}", data: own, want: OUT("T") },
    { name: "condition: an own constructor key", tpl: '{{IF x.constructor == "C"}}Y{{ELSE}}N{{END_IF}}', data: own, want: OUT("Y") },
    { name: "condition: an own __proto__ key", tpl: '{{IF x.__proto__ == "P"}}Y{{ELSE}}N{{END_IF}}', data: own, want: OUT("Y") },
    { name: "math: an own __proto__ number", tpl: "${{x.n.__proto__ + 1}}", data: own, want: OUT("3") },
    { name: "a window path through an own __proto__ key", tpl: "{{FOR xs AS e limit=x.n.__proto__}}${{e}}{{END_FOR}}", data: own, want: OUT("ab") },
    { name: "a loop item with an own constructor key", tpl: "{{FOR items AS it}}${{it.constructor}};{{END_FOR}}", data: own, want: OUT("I1;I2;") },
    { name: "a data object defined with defineProperty", tpl: "${{y.constructor}}", data: (() => { const y = {}; Object.defineProperty(y, "constructor", { value: "OWN", enumerable: true }); return { y }; })(), want: OUT("OWN") },
    { name: "a Map root with an own __proto__ key", tpl: "${{__proto__.k}}", data: JSON.parse('{"__proto__": {"k": "ROOT"}}'), want: OUT("ROOT") },
  ];
  it.each(expand(ownRows))("fw-own: [$entry] $name", ({ entry, r }) => verify(entry, r, "fw-own"));
});

// =====================================================================================
// analyze and spec agree with render
// =====================================================================================

describe("fw-window: analyze and spec", () => {
  // A template analyze cannot parse yet reads as an analysis with no variables, so the checks below fail by assertion.
  const tryAnalyze = (tpl: string) => {
    try {
      return analyze(tpl);
    } catch (e) {
      return { variables: [], filters: [], blocks: {} as Record<string, number>, diagnostics: [{ code: (e as any)?.code ?? "threw", message: String((e as Error)?.message) }] } as any;
    }
  };
  const find = (tpl: string, name: string) => tryAnalyze(tpl).variables.find((v: any) => v.name === name);
  const names = (tpl: string): string[] => tryAnalyze(tpl).variables.map((v: any) => v.name as string).sort();

  it("fw-window: the limit and offset path roots are inputs with usage kind for", () => {
    const tpl = "{{FOR xs AS x limit=n offset=cfg.page.skip}}${{x}}{{END_FOR}}";
    const a = tryAnalyze(tpl);
    check(a.diagnostics, "no diagnostics").toEqual([]);
    check(names(tpl), "the inputs are xs, n and cfg only").toEqual(["cfg", "n", "xs"]);
    check(find(tpl, "n")?.usedIn, "n is used in for").toEqual(["for"]);
    check(find(tpl, "n")?.paths, "n paths").toEqual(["n"]);
    check(find(tpl, "cfg")?.usedIn, "cfg is used in for").toEqual(["for"]);
    check(find(tpl, "cfg")?.paths, "cfg paths").toEqual(["cfg.page.skip"]);
  });

  it("fw-window: a literal window adds no input", () => {
    check(names("{{FOR xs AS x limit=3 offset=1}}${{x}}{{END_FOR}}"), "only xs").toEqual(["xs"]);
  });

  it("fw-window: the window path reads outside the loop, so the loop name there is an input", () => {
    const tpl = "{{FOR xs AS x limit=x}}${{x}}{{END_FOR}}";
    check(names(tpl), "xs and the outer x").toEqual(["x", "xs"]);
    check(find(tpl, "x")?.usedIn, "x is read by the FOR").toEqual(["for"]);
  });

  it("fw-window: an outer loop name or @ name in a window path is not an input", () => {
    const tpl = "{{FOR outer AS o}}{{FOR xs AS x limit=@index1 offset=o}}${{x}}{{END_FOR}}{{END_FOR}}";
    check(names(tpl), "only outer and xs").toEqual(["outer", "xs"]);
  });

  it("fw-meta: @ names, including @total, are never inputs", () => {
    const tpl = "{{FOR xs AS x}}${{@index0}}${{@index1}}${{@first}}${{@last}}${{@notFirst}}${{@notLast}}${{@total}}{{ELSE}}n{{END_FOR}}";
    check(names(tpl), "only xs").toEqual(["xs"]);
  });


  it("fw-else: a variable read only in the ELSE body is an input, once", () => {
    const tpl = "{{FOR xs AS x}}${{x}}{{ELSE}}${{only}}{{END_FOR}}";
    check(tryAnalyze(tpl).diagnostics, "the template parses without a diagnostic").toEqual([]);
    check(names(tpl), "xs and only").toEqual(["only", "xs"]);
    check(find(tpl, "only")?.paths, "paths are listed once").toEqual(["only"]);
    check(find(tpl, "only")?.usedIn, "usage is listed once").toEqual(["output"]);
  });

  it("fw-else: a read of the loop name in the ELSE body is an input named like the loop", () => {
    const tpl = "{{FOR xs AS x}}${{x}}{{ELSE}}[${{x}}]{{END_FOR}}";
    check(tryAnalyze(tpl).diagnostics, "the template parses without a diagnostic").toEqual([]);
    check(names(tpl), "xs and the unbound x").toEqual(["x", "xs"]);
    check(find(tpl, "x")?.usedIn, "x is used in output").toEqual(["output"]);
  });

  it("fw-else: an @ name in the ELSE body is not an input", () => {
    check(names("{{FOR xs AS x}}{{ELSE}}${{@index0}}${{@total}}{{END_FOR}}"), "only xs").toEqual(["xs"]);
  });

  it("fw-else: an outer loop name read in an inner ELSE body is not an input", () => {
    check(names("{{FOR outer AS o}}{{FOR xs AS x}}{{ELSE}}${{o}}{{END_FOR}}{{END_FOR}}"), "outer and xs").toEqual(["outer", "xs"]);
  });

  it("fw-else: a condition in the ELSE body is walked", () => {
    const tpl = "{{FOR xs AS x}}{{ELSE}}{{IF flag}}Y{{END_IF}}{{END_FOR}}";
    check(tryAnalyze(tpl).diagnostics, "the template parses without a diagnostic").toEqual([]);
    check(find(tpl, "flag")?.usedIn, "flag is used in if").toEqual(["if"]);
  });

  it("fw-else: blocks count one FOR with an ELSE", () => {
    const a = tryAnalyze("{{FOR xs AS x}}a{{ELSE}}b{{END_FOR}}");
    check(a.diagnostics, "no diagnostics").toEqual([]);
    check(a.blocks.FOR, "one FOR block").toBe(1);
  });

  it("fw-window: analyze and strict render agree on the unknown window path", () => {
    const tpl = "{{FOR xs AS x limit=n}}${{x}}{{END_FOR}}";
    const missing = names(tpl).filter((n) => n !== "xs");
    check(missing, "analyze names n").toEqual(["n"]);
    const o = run("render-strict", tpl, { xs: XS });
    check(o.code, "strict render reports the same input missing").toBe("missing-variable");
    check(o.message ?? "", "the message names n").toContain("n");
  });

  it("fw-window: spec lists limit and offset in the FOR args and the window in its description", () => {
    const f = spec().blocks.find((b) => b.name === "FOR")!;
    check(f.args, "the FOR args show limit").toContain("limit=N");
    check(f.args, "the FOR args show offset").toContain("offset=N");
    check(f.args, "the FOR args keep array AS item").toContain("array AS item");
    const d = f.description;
    check(d, "the description names limit").toContain("limit");
    check(d, "the description names offset").toContain("offset");
    check(d, "the description names ELSE").toContain("ELSE");
    check(d, "the description names @total").toContain("@total");
  });

  it("fw-else: the ELSE row says it also ends a FOR body and keeps empty args", () => {
    const blocks = spec().blocks.filter((b) => b.name === "ELSE");
    check(blocks.length, "ELSE is listed once").toBe(1);
    check(blocks[0].args, "ELSE has no args").toBe("");
    check(blocks[0].description, "the ELSE description names FOR").toContain("FOR");
    check(blocks[0].closes, "ELSE has no closing keyword").toBeUndefined();
  });
});
