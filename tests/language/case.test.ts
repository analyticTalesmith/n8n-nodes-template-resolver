/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render, validate } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { spec } from "../../core/src/spec";
import { check } from "../headless/http-helpers";

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  severity?: string;
  message?: string;
  output?: string;
}

function run(entry: Entry, template: string, data: Record<string, any>): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode });
      if (r.ok) return { code: "ok", output: r.output };
      const d = r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, message: d.message, output: r.output };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) {
      return { code: e.code, line: e.line, column: e.column, severity: "error", message: e.message };
    }
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

/** validate and analyze reported as one outcome; a TemplateError thrown by analyze counts as its diagnostic. */
function runStatic(kind: "validate" | "analyze", template: string): Outcome {
  try {
    if (kind === "validate") {
      const r = validate(template);
      if (r.ok) return { code: "ok" };
      const d = r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity };
    }
    const a = analyze(template);
    const d = a.diagnostics[0];
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, severity: "error" };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, severity: "error" };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

function show(data: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(data, (_k, v) => {
      if (typeof v === "bigint") return `${v}n`;
      if (v && typeof v === "object") {
        if (seen.has(v)) return "[cycle]";
        seen.add(v);
      }
      return v;
    });
  } catch {
    return "[unprintable]";
  }
}

// ---- template shape: CASE at 3:3, WHEN number k (1-based) at line 3+k, column 5 ----

function caseTemplate(subject: string, whens: string[], withDefault = true): string {
  const body = whens.map((w, i) => `    {{WHEN ${w}}}${i + 1}\n`).join("");
  return `a\nb\n  {{CASE ${subject}}}\n${body}${withDefault ? "    {{DEFAULT}}D\n" : ""}  {{END_CASE}}`;
}

type Want = { out: string } | { err: string; at: number | "case" };
type Wants = Want | { strict: Want; lenient: Want };
const O = (out: string): Want => ({ out });
const E = (err: string, at: number | "case"): Want => ({ err, at });
const S = (strict: Want, lenient: Want): Wants => ({ strict, lenient });
const NONE = O("");

interface Row {
  subject: string;
  whens: string[];
  data: Record<string, any>;
  want: Wants;
  def: boolean;
}
const C = (subject: string, whens: string[], data: Record<string, any>, want: Wants, def = true): Row => ({ subject, whens, data, want, def });

function pick(w: Wants, entry: Entry): Want {
  return "strict" in w ? (entry.endsWith("strict") ? w.strict : w.lenient) : w;
}

function expectLocated(entry: Entry, o: Outcome, code: string, line: number, column: number, what: string): void {
  check(o.code, `${entry}: ${what} is a ${code}`).toBe(code);
  check(o.severity, `${entry}: ${what} has severity error`).toBe("error");
  check({ line: o.line, column: o.column }, `${entry}: ${what} is located at ${line}:${column}`).toEqual({ line, column });
}

function verify(entry: Entry, r: Row): void {
  const tpl = caseTemplate(r.subject, r.whens, r.def);
  const o = run(entry, tpl, r.data);
  const want = pick(r.want, entry);
  const what = `CASE ${r.subject} / ${r.whens.join(" ; ")} with ${show(r.data)}`;
  if ("err" in want) {
    const [line, column] = want.at === "case" ? [3, 3] : [3 + want.at, 5];
    expectLocated(entry, o, want.err, line, column, what);
    return;
  }
  check(o.code, `${entry}: ${what} renders without error`).toBe("ok");
  check((o.output ?? "").replace(/\s+/g, ""), `${entry}: ${what} renders ${JSON.stringify(want.out)}`).toBe("ab" + want.out);
}

function table(rows: Row[]) {
  return ENTRIES.flatMap((entry) => rows.map((r) => ({ entry, r, name: `${r.subject} | ${r.whens.join(" ; ")}${r.def ? "" : " (no DEFAULT)"} | ${show(r.data)}` })));
}

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(10);

// =====================================================================================
// cs-values
// =====================================================================================

describe("cs-values: WHEN lists of values", () => {
  const rows: Row[] = [
    C("x", ['"a", "b"'], { x: "a" }, O("1")),
    C("x", ['"a", "b"'], { x: "b" }, O("1")),
    C("x", ['"a", "b"'], { x: "c" }, O("D")),
    C("x", ['"a", "b", "c"'], { x: "c" }, O("1")),
    C("x", ['"a", "b", "c"'], { x: "b" }, O("1")),
    C("x", ['"a", "b"'], { x: "c" }, NONE, false),
    C("x", ['"a","b"'], { x: "b" }, O("1")),
    C("x", ['"a" , "b"'], { x: "b" }, O("1")),
    C("x", ["'a', 'b'"], { x: "b" }, O("1")),
    C("x", ["'a', \"b\""], { x: "b" }, O("1")),
    C("x", ['"a", "b"', '"b", "c"'], { x: "b" }, O("1")),
    C("x", ['"a"', '"b", "c"'], { x: "c" }, O("2")),
    C("x", ['"x", "y"', '"a", "b"'], { x: "b" }, O("2")),
    // a comma inside quotes belongs to the text
    C("x", ['"a, b"'], { x: "a, b" }, O("1")),
    C("x", ['"a, b"'], { x: "a" }, O("D")),
    C("x", ['"a, b"'], { x: "b" }, O("D")),
    C("x", ['"a, b", "c"'], { x: "c" }, O("1")),
    C("x", ['"a, b", "c"'], { x: "a" }, O("D")),
    C("x", ["'a, b', 'c'"], { x: "a, b" }, O("1")),
    // duplicates
    C("x", ['"a", "a"'], { x: "a" }, O("1")),
    // numbers
    C("n", ["1, 2"], { n: 2 }, O("1")),
    C("n", ["1, 2"], { n: 1 }, O("1")),
    C("n", ["1, 2"], { n: 3 }, O("D")),
    C("n", ["1, 2"], { n: "1.0" }, O("1")),
    C("n", ["1, 2"], { n: "01" }, O("1")),
    C("n", ["1.50, 2"], { n: "1.5" }, O("1")),
    C("n", ["-2, 5"], { n: -2 }, O("1")),
    C("n", ['"1", "2"'], { n: "1.0" }, O("D")),
    C("n", ['"1", "2"'], { n: "01" }, O("D")),
    C("n", ['"1"'], { n: "1.0" }, O("D")),
    C("n", ['"1"'], { n: 1 }, O("1")),
    C("n", ['"01", 2'], { n: 1 }, O("D")),
    C("n", ['"a", 2'], { n: 2 }, O("1")),
    // true, false, null
    C("x", ["true, false"], { x: true }, O("1")),
    C("x", ["true, false"], { x: false }, O("1")),
    C("x", ["true"], { x: "true" }, O("1")),
    C("x", ["true"], { x: "false" }, O("D")),
    C("x", ["false, 0"], { x: 0 }, O("1")),
    C("x", ['"a", null'], { x: null }, O("1")),
    C("x", ['"a", null'], { x: "" }, O("1")),
    C("x", ['"a", null'], { x: "a" }, O("1")),
    C("x", ['"a", null'], { x: "b" }, O("D")),
    C("x", ["null"], { x: "b" }, O("D")),
    C("x", ["null"], { x: 0 }, O("D")),
    C("x", ["null"], {}, S(E("missing-variable", "case"), O("1"))),
    // an empty quoted text still matches a missing or null subject and an empty text
    C("x", ['""'], { x: "" }, O("1")),
    C("x", ['""'], { x: null }, O("1")),
    C("x", ['"", "a"'], { x: null }, O("1")),
    C("x", ['"a", ""'], { x: "" }, O("1")),
    C("x", ['"a", ""'], { x: "a" }, O("1")),
    C("x", ['"", "a"'], { x: "b" }, O("D")),
    C("x", ['"a", ""'], {}, S(E("missing-variable", "case"), O("1"))),
    // the old single form is unchanged
    C("x", ['"a"'], { x: "a" }, O("1")),
    C("x", ['"a"'], { x: "b" }, O("D")),
    C("x", ["'a'"], { x: "a" }, O("1")),
    C("x", ['"a b"'], { x: "a b" }, O("1")),
    C("x", ['"[1,2]"'], { x: [1, 2] }, O("1")),
    C("x", ['"[1,2]", "z"'], { x: [1, 2] }, O("1")),
    C("x", ['"z", "[1,2]"'], { x: [1, 2] }, O("1")),
    C("x", ['"z", "[1,2]"'], { x: [1, 3] }, O("D")),
    // paths and length
    C("user.role", ['"admin", "owner"'], { user: { role: "owner" } }, O("1")),
    C("user.role", ['"admin", "owner"'], { user: { role: "guest" } }, O("D")),
    C("items.length", ["2, 3"], { items: [1, 2] }, O("1")),
    C("items.length", ["2, 3"], { items: [1, 2, 3] }, O("1")),
    C("items.length", ["2, 3"], { items: [1] }, O("D")),
    C("items.length", ['"2", "3"'], { items: [1, 2] }, O("1")),
    // unprintable subject is the existing located error at the CASE
    C("x", ['"a", "b"'], { x: cyc }, E("type-error", "case")),
    C("x", ['"a", "b"'], { x: big }, E("type-error", "case")),
    // strict missing subject raises before any WHEN
    C("x", ['"a", "b"'], {}, S(E("missing-variable", "case"), O("D"))),
  ];
  const cases = table(rows);
  it.each(cases.map((c) => [c.entry, c.name, c] as const))("cs-values: [%s] %s", (_e, _n, c) => verify(c.entry, c.r));

  const spacing: Array<[string, string, string]> = [
    ["trim markers", '{{- WHEN "a", "b" -}}', "b"],
    ["extra spaces", '{{WHEN   "a" ,   "b"   }}', "b"],
  ];
  it.each(ENTRIES.flatMap((e) => spacing.map(([n, tag, v]) => [e, n, tag, v] as const)))(
    "cs-values: [%s] %s still matches the second value",
    (entry, _n, tag, v) => {
      const o = run(entry, `{{CASE x}}${tag}Y{{DEFAULT}}N{{END_CASE}}`, { x: v });
      check(o.code, `${entry}: ${tag} parses`).toBe("ok");
      check(o.output, `${entry}: ${tag} matches the second value`).toBe("Y");
    }
  );

  it.each(ENTRIES)("cs-values: [%s] a WHEN list inside a FOR matches by the loop item", (entry) => {
    const tpl2 = `{{FOR items AS it}}{{CASE it}}{{WHEN "a", "b"}}M{{WHEN "c"}}C{{DEFAULT}}-{{END_CASE}}{{END_FOR}}`;
    const o = run(entry, tpl2, { items: ["a", "b", "c", "d"] });
    check(o.code, `${entry}: ok`).toBe("ok");
    check(o.output, `${entry}: each loop item takes its own branch`).toBe("MMC-");
  });

  it.each(ENTRIES)("cs-values: [%s] a nested CASE matches its own WHEN list", (entry) => {
    const tpl = `{{CASE x}}{{WHEN "a", "b"}}[{{CASE y}}{{WHEN 1, 2}}in{{DEFAULT}}out{{END_CASE}}]{{DEFAULT}}no{{END_CASE}}`;
    check(run(entry, tpl, { x: "b", y: 2 }).output, `${entry}: inner list matches`).toBe("[in]");
    check(run(entry, tpl, { x: "b", y: 3 }).output, `${entry}: inner default`).toBe("[out]");
    check(run(entry, tpl, { x: "z", y: 2 }).output, `${entry}: outer default`).toBe("no");
  });
});

// =====================================================================================
// cs-var
// =====================================================================================

describe("cs-var: WHEN variable", () => {
  const rows: Row[] = [
    C("x", ["other"], { x: "a", other: "a" }, O("1")),
    C("x", ["other"], { x: "a", other: "b" }, O("D")),
    C("x", ["other"], { x: "other", other: "b" }, O("D")),
    C("x", ["other"], { x: 5, other: 5 }, O("1")),
    C("x", ["other"], { x: 5, other: "5.0" }, O("1")),
    C("x", ["other"], { x: "5.0", other: 5 }, O("1")),
    C("x", ["other"], { x: "01", other: 1 }, O("1")),
    C("x", ["other"], { x: 1, other: "01" }, O("1")),
    C("x", ["other"], { x: "a", other: "A" }, O("D")),
    C("x", ["user.plan"], { x: "pro", user: { plan: "pro" } }, O("1")),
    C("x", ["user.plan"], { x: "pro", user: { plan: "free" } }, O("D")),
    C("x", ["first-name"], { x: "Ann", "first-name": "Ann" }, O("1")),
    C("x", ["first-name"], { x: "Ann", "first-name": "Bob" }, O("D")),
    C("x", ["other"], { x: [1, 2], other: [1, 2] }, O("1")),
    C("x", ["other"], { x: [1, 2], other: [1, 3] }, O("D")),
    C("x", ["other"], { x: "[1,2]", other: [1, 2] }, O("1")),
    // mixed with literals
    C("x", ['"a", other, 3'], { x: "a", other: "z" }, O("1")),
    C("x", ['"a", other, 3'], { x: "z", other: "z" }, O("1")),
    C("x", ['"a", other, 3'], { x: 3, other: "z" }, O("1")),
    C("x", ['"a", other, 3'], { x: "q", other: "z" }, O("D")),
    C("x", ['other, "a"'], { x: "a", other: "z" }, O("1")),
    C("x", ["other, third"], { x: "t", other: "z", third: "t" }, O("1")),
    C("x", ["other", "third"], { x: "t", other: "z", third: "t" }, O("2")),
    // a variable matcher counts as unquoted
    C("x", ["other"], { x: "1.0", other: "1" }, O("1")),
    C("x", ['"1", other'], { x: "01", other: 1 }, O("1")),
    C("x", ['"1"'], { x: "01" }, O("D")),
    // null value reads as empty text
    C("x", ["other"], { x: "", other: null }, O("1")),
    C("x", ["other"], { x: null, other: null }, O("1")),
    C("x", ["other"], { x: "a", other: null }, O("D")),
    // missing variable follows strict mode
    C("x", ["other"], { x: "a" }, S(E("missing-variable", 1), O("D"))),
    C("x", ["other"], { x: "" }, S(E("missing-variable", 1), O("1"))),
    C("x", ["other"], { x: null }, S(E("missing-variable", 1), O("1"))),
    C("x", ['"a"', "other"], { x: "b" }, S(E("missing-variable", 2), O("D"))),
    C("x", ['"a"', "other"], { x: "a" }, O("1")),
    C("x", ["user.plan"], { x: "pro" }, S(E("missing-variable", 1), O("D"))),
    C("x", ['"a", other'], { x: "q" }, S(E("missing-variable", 1), O("D"))),
    // unprintable variable values
    C("x", ["other"], { x: "a", other: cyc }, E("type-error", 1)),
    C("x", ["other"], { x: "a", other: big }, E("type-error", 1)),
    C("x", ['"b"', "other"], { x: "a", other: cyc }, E("type-error", 2)),
    C("x", ["other"], { x: cyc, other: "a" }, E("type-error", "case")),
  ];
  const cases = table(rows);
  it.each(cases.map((c) => [c.entry, c.name, c] as const))("cs-var: [%s] %s", (_e, _n, c) => verify(c.entry, c.r));

  it.each(ENTRIES)("cs-var: [%s] a loop variable matcher reads like the CASE subject", (entry) => {
    const tpl = `{{FOR items AS it}}{{CASE it}}{{WHEN target}}T{{DEFAULT}}-{{END_CASE}}{{END_FOR}}`;
    const o = run(entry, tpl, { items: ["a", "b", "a"], target: "a" });
    check(o.output, `${entry}: items equal to target match`).toBe("T-T");
    const tpl2 = `{{FOR items AS it}}{{CASE other}}{{WHEN it}}T{{DEFAULT}}-{{END_CASE}}{{END_FOR}}`;
    const o2 = run(entry, tpl2, { items: ["a", "b", "a"], other: "b" });
    check(o2.output, `${entry}: the loop item as a WHEN variable`).toBe("-T-");
  });

  it.each(ENTRIES)("cs-var: [%s] an @-name as a WHEN variable reads the loop metadata", (entry) => {
    const tpl = `{{FOR items AS it}}{{CASE @index0}}{{WHEN 0}}F{{DEFAULT}}-{{END_CASE}}{{END_FOR}}`;
    check(run(entry, tpl, { items: ["a", "b"] }).output, `${entry}: the CASE subject @index0`).toBe("F-");
    const tpl2 = `{{FOR items AS it}}{{CASE n}}{{WHEN @index0}}M{{DEFAULT}}-{{END_CASE}}{{END_FOR}}`;
    check(run(entry, tpl2, { items: ["a", "b", "c"], n: 1 }).output, `${entry}: @index0 as a WHEN variable`).toBe("-M-");
  });
});

// =====================================================================================
// cs-compare
// =====================================================================================

describe("cs-compare: WHEN comparison", () => {
  const rows: Row[] = [
    // boundaries
    C("n", [">= 10"], { n: 10 }, O("1")),
    C("n", [">= 10"], { n: 9 }, O("D")),
    C("n", [">= 10"], { n: 11 }, O("1")),
    C("n", ["> 10"], { n: 10 }, O("D")),
    C("n", ["> 10"], { n: 11 }, O("1")),
    C("n", ["<= 10"], { n: 10 }, O("1")),
    C("n", ["<= 10"], { n: 11 }, O("D")),
    C("n", ["< 10"], { n: 10 }, O("D")),
    C("n", ["< 10"], { n: 9 }, O("1")),
    C("n", ["== 10"], { n: 10 }, O("1")),
    C("n", ["== 10"], { n: 11 }, O("D")),
    C("n", ["!= 10"], { n: 10 }, O("D")),
    C("n", ["!= 10"], { n: 11 }, O("1")),
    // numeric text, decimals, negatives
    C("n", [">= 10"], { n: "10" }, O("1")),
    C("n", ["> 9.5"], { n: 9.75 }, O("1")),
    C("n", ["< 9.5"], { n: 9.75 }, O("D")),
    C("n", ["< -2"], { n: -3 }, O("1")),
    C("n", ["> -4"], { n: -3 }, O("1")),
    C("n", [">= -3"], { n: -3 }, O("1")),
    C("n", ["> 9"], { n: "10.5" }, O("1")),
    C("n", ["> 9"], { n: "9" }, O("D")),
    // spacing
    C("n", [">=10"], { n: 10 }, O("1")),
    C("n", [">=   10"], { n: 10 }, O("1")),
    C("n", ["<10"], { n: 9 }, O("1")),
    C("n", ["==10"], { n: 10 }, O("1")),
    C("n", ["!=10"], { n: 10 }, O("D")),
    // equality rules: quoted is text, unquoted is numeric when both numeric
    C("n", ["== 1"], { n: "1.0" }, O("1")),
    C("n", ['== "1"'], { n: "1.0" }, O("D")),
    C("n", ['== "1"'], { n: 1 }, O("1")),
    C("n", ['!= "1"'], { n: "1.0" }, O("1")),
    C("n", ["!= 1"], { n: "1.0" }, O("D")),
    C("n", ["== 1"], { n: "01" }, O("1")),
    C("x", ['== "a"'], { x: "a" }, O("1")),
    C("x", ['== "a"'], { x: "b" }, O("D")),
    C("x", ['!= "a"'], { x: "a" }, O("D")),
    C("x", ['!= "a"'], { x: "b" }, O("1")),
    C("x", ['!= "a"'], { x: null }, O("1")),
    C("x", ['!= "a"'], {}, S(E("missing-variable", "case"), O("1"))),
    C("x", ['!= ""'], { x: null }, O("D")),
    C("x", ['!= ""'], { x: "a" }, O("1")),
    C("x", ["!= null"], { x: "a" }, O("1")),
    C("x", ["!= null"], { x: null }, O("D")),
    C("x", ["== true"], { x: true }, O("1")),
    C("x", ["!= true"], { x: false }, O("1")),
    // variable operands
    C("n", ["== other"], { n: 5, other: "5.0" }, O("1")),
    C("n", ["== other"], { n: 5, other: 6 }, O("D")),
    C("n", ["!= other"], { n: 5, other: 6 }, O("1")),
    C("n", ["!= other"], { n: 5, other: 5 }, O("D")),
    C("n", ["> limit"], { n: 11, limit: 10 }, O("1")),
    C("n", ["> limit"], { n: 10, limit: 10 }, O("D")),
    C("n", ["<= limit.max"], { n: 10, limit: { max: 10 } }, O("1")),
    C("n", ["< limit.max"], { n: 10, limit: { max: 10 } }, O("D")),
    C("n", [">= limit"], { n: 3, limit: "3" }, O("1")),
    // missing operand follows strict mode
    C("n", ["== other"], { n: 5 }, S(E("missing-variable", 1), O("D"))),
    C("x", ["== other"], { x: "" }, S(E("missing-variable", 1), O("1"))),
    C("n", ["!= other"], { n: 5 }, S(E("missing-variable", 1), O("1"))),
    // a missing operand for an ordering operator is missing data in strict, a type error in lenient
    C("n", ["> limit"], { n: 5 }, S(E("missing-variable", 1), E("type-error", 1))),
    // non-numeric subject or operand
    C("x", ["> 10"], { x: "abc" }, E("type-error", 1)),
    C("x", ["< 10"], { x: "abc" }, E("type-error", 1)),
    C("x", [">= 10"], { x: "abc" }, E("type-error", 1)),
    C("x", ["<= 10"], { x: "abc" }, E("type-error", 1)),
    C("x", ["> 10"], { x: "" }, E("type-error", 1)),
    C("x", ["> 10"], { x: null }, E("type-error", 1)),
    C("x", ["> 10"], {}, S(E("missing-variable", "case"), E("type-error", 1))),
    C("n", ['> "abc"'], { n: 5 }, E("type-error", 1)),
    C("n", ['> "5"'], { n: 10 }, O("1")),
    C("n", [">= other"], { n: 5, other: "abc" }, E("type-error", 1)),
    C("n", [">= other"], { n: 5, other: null }, E("type-error", 1)),
    C("x", ["> 10"], { x: [1, 2] }, E("type-error", 1)),
    C("x", ["> 10"], { x: { a: 1 } }, E("type-error", 1)),
    C("x", ["> 10"], { x: true }, E("type-error", 1)),
    C("x", ["> 10"], { x: cyc }, E("type-error", "case")),
    C("x", ["> 10"], { x: big }, E("type-error", "case")),
    C("n", ["> other"], { n: 5, other: cyc }, E("type-error", 1)),
    C("n", ["== other"], { n: 5, other: big }, E("type-error", 1)),
    // second WHEN after a failed first
    C("n", ['"a"', ">= 10"], { n: 12 }, O("2")),
    C("n", ["< 5", ">= 10"], { n: 12 }, O("2")),
    C("n", ["< 5", ">= 10"], { n: 7 }, O("D")),
    C("n", ["< 5", ">= 10"], { n: 3 }, O("1")),
    C("x", ['"a"', "> 10"], { x: "b" }, E("type-error", 2)),
    C("x", ['"b"', "> 10"], { x: "b" }, O("1")),
    // == is the same as a one-item list
    C("x", ['== "a"', '"a"'], { x: "a" }, O("1")),
    C("n", ["== 1", "1"], { n: "1.0" }, O("1")),
    // comparison with a path subject and length
    C("items.length", [">= 3"], { items: [1, 2, 3] }, O("1")),
    C("items.length", [">= 3"], { items: [1, 2] }, O("D")),
  ];
  const cases = table(rows);
  it.each(cases.map((c) => [c.entry, c.name, c] as const))("cs-compare: [%s] %s", (_e, _n, c) => verify(c.entry, c.r));

  it.each(ENTRIES)("cs-compare: [%s] a comparison tag takes trim markers", (entry) => {
    const o = run(entry, `{{CASE n}}{{- WHEN >= 10 -}}Y{{DEFAULT}}N{{END_CASE}}`, { n: 12 });
    check(o.output, `${entry}: WHEN with trim markers`).toBe("Y");
  });

  it.each(ENTRIES)("cs-compare: [%s] a comparison in a FOR picks by each item", (entry) => {
    const tpl = `{{FOR nums AS v}}{{CASE v}}{{WHEN >= 10}}H{{WHEN < 0}}N{{DEFAULT}}L{{END_CASE}}{{END_FOR}}`;
    check(run(entry, tpl, { nums: [10, 3, -1, 99] }).output, `${entry}: each number takes its branch`).toBe("HLNH");
  });
});

// =====================================================================================
// cs-errors
// =====================================================================================

describe("cs-errors: bad WHEN tags are syntax errors at the tag", () => {
  const bad: string[] = [
    "",
    " ",
    '"a",',
    ',"a"',
    '"a",,"b"',
    '"a, "b"',
    '"a',
    "a b",
    '"a" "b"',
    "1abc",
    ">=",
    ">",
    "== ",
    ">= 1, 2",
    "> 1 > 2",
    '"a", > 5',
    '> 5, "a"',
    "a == b",
    "x==1",
  ];
  const tag = (w: string) => (w === "" ? "{{WHEN}}" : `{{WHEN ${w}}}`);

  const placements: Array<[string, (t: string) => string, number, number]> = [
    ["plain", (t) => `a\nb\n  {{CASE x}}\n    ${t}Y{{DEFAULT}}D{{END_CASE}}`, 4, 5],
    ["second WHEN", (t) => `a\nb\n  {{CASE x}}\n    {{WHEN "z"}}Z\n    ${t}Y{{DEFAULT}}D{{END_CASE}}`, 5, 5],
    ["in an IF never rendered", (t) => `a\n{{IF false}}\n  {{CASE x}}\n    ${t}Y{{END_CASE}}\n{{END_IF}}`, 4, 5],
    ["in a FOR with no items", (t) => `a\n{{FOR items AS it}}\n  {{CASE it}}\n  ${t}Y{{END_CASE}}\n{{END_FOR}}`, 4, 3],
    ["after a matching WHEN", (t) => `a\nb\n  {{CASE x}}\n    {{WHEN "a"}}Y\n    ${t}Z{{END_CASE}}`, 5, 5],
  ];
  const data = { x: "a", items: [] as any[] };

  const cases = placements.flatMap(([pn, build, line, col]) => bad.map((w) => ({ pn, w, template: build(tag(w)), line, col })));

  it.each(cases.flatMap((c) => ENTRIES.map((e) => [e, c.pn, c.w, c] as const)))(
    "cs-errors: [%s] %s: WHEN %j is a syntax-error at the tag",
    (entry, _pn, w, c) => {
      const o = run(entry, c.template, data);
      expectLocated(entry, o, "syntax-error", c.line, c.col, `WHEN ${JSON.stringify(w)}`);
      check((o.message ?? "").length, `${entry}: the message names the problem`).toBeGreaterThan(0);
    }
  );

  it.each(cases.flatMap((c) => (["validate", "analyze"] as const).map((k) => [k, c.pn, c.w, c] as const)))(
    "cs-errors: [%s] %s: WHEN %j is reported as a syntax-error at the tag",
    (kind, _pn, w, c) => {
      const o = runStatic(kind, c.template);
      check(o.code, `${kind}: WHEN ${JSON.stringify(w)} is a syntax-error`).toBe("syntax-error");
      check({ line: o.line, column: o.column }, `${kind}: located at the WHEN tag`).toEqual({ line: c.line, column: c.col });
    }
  );

  it.each(ENTRIES)("cs-errors: [%s] a bad WHEN is an error even when an earlier WHEN matches", (entry) => {
    const tpl = `a\n{{CASE x}}\n{{WHEN "a"}}Y\n  {{WHEN >= 1, 2}}Z{{END_CASE}}`;
    const o = run(entry, tpl, { x: "a" });
    expectLocated(entry, o, "syntax-error", 4, 3, "the bad second WHEN");
  });

  const good: Array<[string, string]> = [
    ['""', ""],
    ['"a"', ""],
    ['"a", "b"', ""],
    ["other", ""],
    [">= 1", ""],
    ["== other", ""],
    ["user.plan, 3", ""],
  ];
  it.each(ENTRIES.flatMap((e) => good.map(([w]) => [e, w] as const)))("cs-errors: [%s] WHEN %s is valid syntax", (entry, w) => {
    const o = run(entry, `a\n{{CASE x}}\n{{WHEN ${w}}}Y{{DEFAULT}}D{{END_CASE}}`, { x: "5", other: "5", user: { plan: "5" } });
    check(o.code, `${entry}: WHEN ${w} parses and renders`).toBe("ok");
  });
});

// =====================================================================================
// cs-analyze
// =====================================================================================

describe("cs-analyze: WHEN variables are case usage", () => {
  const find = (tpl: string, name: string) => analyze(tpl).variables.find((v) => v.name === name);

  interface ARow {
    tpl: string;
    vars: Array<{ name: string; paths: string[]; usedIn: string[] }>;
    absent?: string[];
  }
  const rows: ARow[] = [
    { tpl: "{{CASE x}}{{WHEN other}}A{{END_CASE}}", vars: [{ name: "x", paths: ["x"], usedIn: ["case"] }, { name: "other", paths: ["other"], usedIn: ["case"] }] },
    { tpl: "{{CASE x}}{{WHEN > limit}}A{{END_CASE}}", vars: [{ name: "limit", paths: ["limit"], usedIn: ["case"] }] },
    { tpl: "{{CASE x}}{{WHEN == other}}A{{END_CASE}}", vars: [{ name: "other", paths: ["other"], usedIn: ["case"] }] },
    { tpl: "{{CASE x}}{{WHEN != other}}A{{END_CASE}}", vars: [{ name: "other", paths: ["other"], usedIn: ["case"] }] },
    { tpl: "{{CASE x}}{{WHEN <= limit.max}}A{{END_CASE}}", vars: [{ name: "limit", paths: ["limit.max"], usedIn: ["case"] }] },
    { tpl: "{{CASE x}}{{WHEN user.plan}}A{{END_CASE}}", vars: [{ name: "user", paths: ["user.plan"], usedIn: ["case"] }] },
    { tpl: '{{CASE x}}{{WHEN "a", other, 3, true, null}}A{{END_CASE}}', vars: [{ name: "other", paths: ["other"], usedIn: ["case"] }], absent: ["a", "3", "true", "null"] },
    { tpl: '{{CASE x}}{{WHEN other, "a"}}A{{WHEN third}}B{{END_CASE}}', vars: [{ name: "other", paths: ["other"], usedIn: ["case"] }, { name: "third", paths: ["third"], usedIn: ["case"] }] },
    { tpl: "{{CASE x}}{{WHEN a, b}}A{{END_CASE}}", vars: [{ name: "a", paths: ["a"], usedIn: ["case"] }, { name: "b", paths: ["b"], usedIn: ["case"] }] },
    { tpl: '{{CASE x}}{{WHEN "a", "b"}}A{{END_CASE}}', vars: [{ name: "x", paths: ["x"], usedIn: ["case"] }], absent: ["a", "b"] },
    { tpl: "{{CASE x}}{{WHEN >= 10}}A{{END_CASE}}", vars: [{ name: "x", paths: ["x"], usedIn: ["case"] }], absent: ["10"] },
    { tpl: "{{CASE x}}{{WHEN x}}A{{END_CASE}}", vars: [{ name: "x", paths: ["x"], usedIn: ["case"] }] },
    { tpl: "{{CASE x}}{{WHEN first-name}}A{{END_CASE}}", vars: [{ name: "first-name", paths: ["first-name"], usedIn: ["case"] }] },
    { tpl: "${{other}}{{CASE x}}{{WHEN other}}A{{END_CASE}}", vars: [{ name: "other", paths: ["other"], usedIn: ["output", "case"] }] },
    { tpl: "{{IF other}}{{CASE x}}{{WHEN other}}A{{END_CASE}}{{END_IF}}", vars: [{ name: "other", paths: ["other"], usedIn: ["if", "case"] }] },
    { tpl: "{{FOR items AS it}}{{CASE it}}{{WHEN it, other}}A{{END_CASE}}{{END_FOR}}", vars: [{ name: "other", paths: ["other"], usedIn: ["case"] }], absent: ["it"] },
    { tpl: "{{FOR items AS it}}{{CASE x}}{{WHEN @index0}}A{{END_CASE}}{{END_FOR}}", vars: [{ name: "x", paths: ["x"], usedIn: ["case"] }], absent: ["@index0", "index0"] },
    { tpl: "{{FOR items AS it}}{{CASE x}}{{WHEN > @index0}}A{{END_CASE}}{{END_FOR}}", vars: [{ name: "x", paths: ["x"], usedIn: ["case"] }], absent: ["@index0", "index0"] },
    { tpl: "{{CASE x}}{{WHEN it}}A{{END_CASE}}{{FOR items AS it}}{{END_FOR}}", vars: [{ name: "it", paths: ["it"], usedIn: ["case"] }] },
  ];
  it.each(rows.map((r) => [r.tpl, r] as const))("cs-analyze: %s", (_t, r) => {
    const a = analyze(r.tpl);
    check(a.diagnostics, "no diagnostics for a valid template").toEqual([]);
    for (const v of r.vars) {
      const got = a.variables.find((x) => x.name === v.name);
      check(got, `analyze lists ${v.name}`).toBeDefined();
      check(got!.paths, `${v.name} paths`).toEqual(v.paths);
      check(got!.usedIn, `${v.name} usage kinds`).toEqual(v.usedIn);
      check(got!.optional, `${v.name} is not optional`).toBe(false);
      check(got!.required, `${v.name} is required`).toBe(true);
    }
    for (const n of r.absent ?? []) check(a.variables.find((x) => x.name === n), `${n} is not a variable`).toBeUndefined();
    const subjectAndIterable = new Set(["x", "items"]);
    check(
      a.variables.map((x) => x.name).filter((n) => !subjectAndIterable.has(n)).sort(),
      "exactly the expected variables"
    ).toEqual([...new Set(r.vars.map((v) => v.name))].filter((n) => !subjectAndIterable.has(n)).sort());
  });

  it.each([1, 2, 5])("cs-analyze: blocks.CASE stays 1 with %i WHEN tags", (n) => {
    const whens = Array.from({ length: n }, (_, i) => `{{WHEN other${i}, "q"}}A`).join("");
    const a = analyze(`{{CASE x}}${whens}{{END_CASE}}`);
    check(a.blocks.CASE, "one CASE block however many WHEN tags").toBe(1);
    check(a.variables.length, "the subject plus one variable per WHEN").toBe(n + 1);
  });

  it("cs-analyze: a bad WHEN gives the syntax diagnostic located at the tag", () => {
    const o = runStatic("analyze", "a\nb\n  {{CASE x}}\n    {{WHEN >= 1, 2}}Y{{END_CASE}}");
    check(o.code, "syntax-error").toBe("syntax-error");
    check({ line: o.line, column: o.column }, "located at the tag").toEqual({ line: 4, column: 5 });
  });

  // agreement: a variable analyze reports is the one render reports missing in strict mode
  const agree = [
    "{{CASE x}}{{WHEN other}}A{{END_CASE}}",
    "{{CASE x}}{{WHEN > limit}}A{{END_CASE}}",
    '{{CASE x}}{{WHEN "a", other}}A{{END_CASE}}',
    "{{CASE x}}{{WHEN == user.plan}}A{{END_CASE}}",
  ];
  it.each(agree.flatMap((t) => ["render", "resolve"].map((m) => [m, t] as const)))("cs-analyze: [%s] %s agrees with strict rendering", (mode, tpl) => {
    const a = analyze(tpl);
    const when = a.variables.filter((v) => v.name !== "x");
    check(when.length, "analyze names the WHEN variable").toBe(1);
    const o = run(mode === "render" ? "render-strict" : "resolve-strict", tpl, { x: "q" });
    check(o.code, "strict rendering with the variable missing").toBe("missing-variable");
    check(o.message ?? "", "the error names the variable analyze reported").toContain(`'${when[0].name}'`);
    const used = find(tpl, when[0].name);
    check(used?.usedIn, "case usage").toEqual(["case"]);
  });
});

// =====================================================================================
// spec
// =====================================================================================

describe("cs-analyze: spec lists the new WHEN forms", () => {
  const s = spec();
  it("cs-analyze: spec lists WHEN and CASE once each with args and description", () => {
    for (const name of ["WHEN", "CASE"]) {
      const b = s.blocks.filter((x) => x.name === name);
      check(b.length, `${name} listed once`).toBe(1);
      check(typeof b[0].args, `${name} args is text`).toBe("string");
      check(b[0].description.length, `${name} has a description`).toBeGreaterThan(0);
    }
  });
  it("cs-analyze: the WHEN args and description tell of a list, a variable and a comparison", () => {
    const w = s.blocks.find((x) => x.name === "WHEN")!;
    check(w.args, "args show a list of values").toContain("value[, value...]");
    check(w.args, "args show a variable").toContain("variable");
    check(w.args, "args show an operator and value").toContain("operator value");
    const d = w.description.toLowerCase();
    check(d, "description mentions a list").toContain("list");
    check(d, "description mentions a variable").toContain("variable");
    check(d, "description mentions a comparison").toContain("comparison");
  });
  it("cs-analyze: the operator list is unchanged", () => {
    check(s.operators, "operators").toEqual(["==", "!=", ">", "<", ">=", "<=", "contains", "startsWith", "endsWith", "isEmpty", "isNotEmpty", "isArray", "isNumber", "isObject", "isBoolean", "AND", "OR", "NOT", "in", "not in", "between", ".length"]);
  });
});
