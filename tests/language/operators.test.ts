/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render } from "../../core/src/render";
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

/** A readable form of the row data for the test name; never throws on cyclic values or BigInt. */
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

// ---- where the condition sits: never line 1, never column 1, so a 1:1 default fails ----

type Form = "if" | "elseif" | "list";
const ALL_FORMS: Form[] = ["if", "elseif", "list"];

function wrap(form: Form, cond: string): string {
  if (form === "if") return `a\nb\n  {{IF ${cond}}}Y{{ELSE}}N{{END_IF}}`;
  if (form === "elseif") return `a\nb\n  {{IF false}}Z{{ELSEIF ${cond}}}Y{{ELSE}}N{{END_IF}}`;
  return `a\nb\n  {{LIST}}\n    {{LIST_ITEM ${cond}}}Y{{END_LIST_ITEM}}{{END_LIST}}`;
}
const LOC: Record<Form, { line: number; column: number }> = {
  if: { line: 3, column: 3 },
  elseif: { line: 3, column: 16 },
  list: { line: 4, column: 5 },
};

/** "true" or "false" for a condition that evaluated, otherwise the error code. */
function verdict(form: Form, o: Outcome): string {
  if (o.code !== "ok") return o.code;
  const text = o.output ?? "";
  if (form === "list") return text.includes("Y") ? "true" : "false";
  if (text.endsWith("Y")) return "true";
  if (text.endsWith("N")) return "false";
  return `odd:${text}`;
}

function expectLocatedTypeError(entry: Entry, form: Form, o: Outcome, what: string): void {
  check(o.code, `${entry}/${form}: ${what} is a type-error`).toBe("type-error");
  check(o.severity, `${entry}/${form}: ${what} has severity error`).toBe("error");
  check({ line: o.line, column: o.column }, `${entry}/${form}: ${what} is located at its ${form} node`).toEqual(LOC[form]);
}

interface Row {
  cond: string;
  data: Record<string, any>;
  want: "true" | "false" | "type-error";
  /** a type-error about the operand itself, not the "Unrecognized condition" error for text the engine cannot read */
  typed?: boolean;
}
const T = (cond: string, data: Record<string, any>, want: Row["want"], typed = false): Row => ({ cond, data, want, typed });

function expand(rows: Row[], forms: Form[] = ["if"]) {
  return ENTRIES.flatMap((entry) =>
    forms.flatMap((form) => rows.map((r) => ({ entry, form, cond: r.cond, data: r.data, want: r.want, typed: !!r.typed, dj: show(r.data) })))
  );
}

function verifyRow(c: { entry: Entry; form: Form; cond: string; data: Record<string, any>; want: Row["want"]; typed?: boolean }, extraError?: string): void {
  const o = run(c.entry, wrap(c.form, c.cond), c.data);
  if (c.want === "type-error") {
    expectLocatedTypeError(c.entry, c.form, o, c.cond);
    if (c.typed) check((o.message ?? "").includes("Unrecognized condition"), `${c.entry}/${c.form}: ${c.cond} is rejected for its operand, not as an Unrecognized condition`).toBe(false);
    if (extraError) check(o.message ?? "", `${c.entry}/${c.form}: ${c.cond} reports "${extraError}"`).toContain(extraError);
    return;
  }
  check(verdict(c.form, o), `${c.entry}/${c.form}: ${c.cond} with ${show(c.data)} is ${c.want}`).toBe(c.want);
}

const cyc: any = {};
cyc.self = cyc;
const cycArr: any[] = [];
cycArr.push(cycArr);

// =====================================================================================
// op-in
// =====================================================================================

describe("op-in: in and not in", () => {
  const rows: Row[] = [
    // array literal, text items
    T('x in ["a","b"]', { x: "a" }, "true"),
    T('x in ["a","b"]', { x: "b" }, "true"),
    T('x in ["a","b"]', { x: "c" }, "false"),
    T('x not in ["a","b"]', { x: "c" }, "true"),
    T('x not in ["a","b"]', { x: "a" }, "false"),
    T('x in ["a", "a"]', { x: "a" }, "true"),
    // numbers against text: a quoted item compares as text
    T("x in [1, 2]", { x: 2 }, "true"),
    T("x in [1, 2]", { x: 3 }, "false"),
    T("x in [1, 2]", { x: "2" }, "true"),
    T("x in [1, 2.5]", { x: "2.50" }, "true"),
    T('n in ["1"]', { n: 1 }, "true"),
    T('n in ["01"]', { n: 1 }, "false"),
    T('n in ["1.0"]', { n: 1 }, "false"),
    T("n in [01]", { n: 1 }, "true"),
    T("n in [-1, 2]", { n: -1 }, "true"),
    T('n not in ["01"]', { n: 1 }, "true"),
    // array variable
    T("x in list", { x: "b", list: ["a", "b"] }, "true"),
    T("x in list", { x: "z", list: ["a", "b"] }, "false"),
    T("x in list", { x: 1, list: [1, 2] }, "true"),
    T("x in list", { x: "1", list: [1, 2] }, "true"),
    T("x not in list", { x: "z", list: ["a", "b"] }, "true"),
    T("x not in list", { x: "a", list: ["a", "b"] }, "false"),
    T("x in list", { x: "a", list: [] }, "false"),
    T("x in list", { x: "a", list: [null, "a"] }, "true"),
    T("x in list", { x: "b", list: [null, "a"] }, "false"),
    // object, array and BigInt elements never match
    T("x in list", { x: 1, list: [[1]] }, "false"),
    T("x in list", { x: "[object Object]", list: [{ a: 1 }] }, "false"),
    T("x in list", { x: 10, list: [BigInt(10)] }, "false"),
    T("x in list", { x: "10", list: [BigInt(10), { a: 1 }] }, "false"),
    // empty list
    T("x in []", { x: "a" }, "false"),
    T("x not in []", { x: "a" }, "true"),
    // missing and null left side: data, not an error, in every mode
    T('x in ["a"]', {}, "false"),
    T('x not in ["a"]', {}, "true"),
    T('x in ["a"]', { x: null }, "false"),
    T('x not in ["a"]', { x: null }, "true"),
    T("x in list", { list: ["a"] }, "false"),
    T("x not in list", { list: ["a"] }, "true"),
    T('x in "abc"', {}, "false"),
    T('x not in "abc"', { x: null }, "true"),
    T("x in [null]", {}, "false"),
    // a missing right side is missing data: no error, nothing is in it
    T("x in list", { x: "a" }, "false"),
    T("x not in list", { x: "a" }, "true"),
    // list items that are variables
    T("x in [a, b]", { x: "q", a: "p", b: "q" }, "true"),
    T("x in [a, b]", { x: "z", a: "p", b: "q" }, "false"),
    T("x in [a]", { x: "p" }, "false"),
    T('x in [a, "k"]', { x: "k", a: "p" }, "true"),
    T("x in [a, b]", { x: 3, a: 1, b: 3 }, "true"),
    // quoted items hold commas, brackets and operator words
    T('x in ["a,b", "c"]', { x: "a,b" }, "true"),
    T('x in ["a,b", "c"]', { x: "a" }, "false"),
    T('x in ["a,b", "c"]', { x: "b" }, "false"),
    T('x in ["c]", "d["]', { x: "c]" }, "true"),
    T('x in ["c]", "d["]', { x: "d[" }, "true"),
    T('x in ["[", "]"]', { x: "[" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "c in d" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "a and b" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "e not in f" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "c" }, "false"),
    T('x in ["a OR b"]', { x: "a OR b" }, "true"),
    T('x in ["a between b"]', { x: "a between b" }, "true"),
    T('x in ["a==b", ">"]', { x: "a==b" }, "true"),
    T('x in ["a==b", ">"]', { x: ">" }, "true"),
    T('x in ["a contains b"]', { x: "a contains b" }, "true"),
    // escaped quotes keep the split intact
    T('x in ["a\\"]", "z"]', { x: "z" }, "true"),
    T('x in ["a\\",b", "z"]', { x: "z" }, "true"),
    T('x in ["a\\",b", "z"]', { x: "b" }, "false"),
    // text right side: quoted or variable, a substring test
    T('x in "hello world"', { x: "lo w" }, "true"),
    T('x in "hello world"', { x: "xyz" }, "false"),
    T('x in "hello world"', { x: "LO" }, "false"),
    T('x not in "hello world"', { x: "xyz" }, "true"),
    T('x not in "hello world"', { x: "hello" }, "false"),
    T('x in "hello world"', { x: "" }, "true"),
    T("x in t", { x: "ell", t: "hello" }, "true"),
    T("x in t", { x: "Ell", t: "hello" }, "false"),
    T("x in t", { x: "", t: "hello" }, "true"),
    T("x in t", { x: "", t: "" }, "true"),
    T("x in t", { x: "z", t: "" }, "false"),
    T("x in t", { x: "b", t: "a,b" }, "true"),
    T("x in t", { x: "c", t: "a,b" }, "false"),
    T("x in t", { x: 2, t: "a2b" }, "true"),
    // operator words in any case
    T('x IN ["a"]', { x: "a" }, "true"),
    T('x In ["a"]', { x: "b" }, "false"),
    T('x Not In ["a"]', { x: "a" }, "false"),
    T('x NOT IN ["a"]', { x: "b" }, "true"),
    T('x not IN "abc"', { x: "z" }, "true"),
    // names that merely contain an operator word are variables
    T('intro in ["a"]', { intro: "a" }, "true"),
    T("x in inbox", { x: "b", inbox: "abc" }, "true"),
    T('x in ["a"] AND index == 1', { x: "a", index: 1 }, "true"),
  ];
  it.each(expand(rows))("op-in: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T('x in ["a","b"]', { x: "b" }, "true"),
    T('x in ["a","b"]', { x: "q" }, "false"),
    T('x not in ["a","b"]', { x: "q" }, "true"),
    T('x in "hello"', { x: "ell" }, "true"),
    T("x in list", { x: 2, list: [1, 2] }, "true"),
    T("x not in list", { x: 2, list: [1, 2] }, "false"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-in: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));

  const errorRows: Row[] = [
    // the right side cannot be searched
    T("x in 5", { x: "a" }, "type-error", true),
    T("x in n", { x: 5, n: 5 }, "type-error", true),
    T("x in true", { x: "a" }, "type-error", true),
    T("x in flag", { x: true, flag: true }, "type-error", true),
    T("x in obj", { x: "a", obj: { a: 1 } }, "type-error", true),
    T("x not in 5", { x: "a" }, "type-error", true),
    T("x not in obj", { x: "a", obj: { a: 1 } }, "type-error", true),
    T("x in cyc", { x: "a", cyc }, "type-error", true),
    T("x in big", { x: "a", big: BigInt(10) }, "type-error", true),
    // the left side cannot be tested
    T('a in ["a"]', { a: ["a"] }, "type-error", true),
    T("a in list", { a: [1], list: [[1]] }, "type-error", true),
    T('a in ["a"]', { a: { k: 1 } }, "type-error", true),
    T('a not in ["a"]', { a: { k: 1 } }, "type-error", true),
    T('a in ["a"]', { a: cyc }, "type-error", true),
    T('a not in "abc"', { a: cyc }, "type-error", true),
    T('a in "abc"', { a: cycArr }, "type-error", true),
    T('a in ["a"]', { a: BigInt(10) }, "type-error", true),
    T('a not in ["a"]', { a: BigInt(10) }, "type-error", true),
    T('a in "abc"', { a: BigInt(10) }, "type-error", true),
    // malformed list forms
    T("x in [1,]", { x: 1 }, "type-error"),
    T("x in [,1]", { x: 1 }, "type-error"),
    T("x in [1,,2]", { x: 1 }, "type-error"),
    T("x in [1 2]", { x: 1 }, "type-error"),
    T("x in [[1]]", { x: 1 }, "type-error"),
    T("x in [1", { x: 1 }, "type-error"),
    T('x in ["a"', { x: "a" }, "type-error"),
    T("x in [", { x: 1 }, "type-error"),
    T("x not in [1", { x: 1 }, "type-error"),
    T("x in", { x: 1 }, "type-error"),
  ];
  it.each(expand(errorRows, ALL_FORMS))("op-in: [$entry/$form] $cond with $dj is a located type-error", (c) => verifyRow(c));
});

// =====================================================================================
// op-between
// =====================================================================================

describe("op-between: between [lo, hi]", () => {
  const rows: Row[] = [
    T("x between [1, 10]", { x: 5 }, "true"),
    T("x between [1, 10]", { x: 1 }, "true"),
    T("x between [1, 10]", { x: 10 }, "true"),
    T("x between [1, 10]", { x: 0 }, "false"),
    T("x between [1, 10]", { x: 11 }, "false"),
    T("x between [1, 10]", { x: 0.99 }, "false"),
    T("x between [1, 10]", { x: 10.01 }, "false"),
    T("x between [1,10]", { x: 7 }, "true"),
    T("x between [1, 10]", { x: "5" }, "true"),
    T("x between [1, 10]", { x: "10" }, "true"),
    T("x between [1, 10]", { x: "11" }, "false"),
    T("x between [-5, -1]", { x: -3 }, "true"),
    T("x between [-5, -1]", { x: -5 }, "true"),
    T("x between [-5, -1]", { x: -6 }, "false"),
    T("x between [-5, -1]", { x: 0 }, "false"),
    T("x between [0.5, 1.5]", { x: 1.5 }, "true"),
    T("x between [0.5, 1.5]", { x: 1.51 }, "false"),
    T("x between [0.5, 1.5]", { x: "0.5" }, "true"),
    T("x between [lo, hi]", { x: 3, lo: 2, hi: 4 }, "true"),
    T("x between [lo, hi]", { x: 5, lo: 2, hi: 4 }, "false"),
    T("x between [lo, hi]", { x: 2, lo: "2", hi: "4" }, "true"),
    T("x between [lo, 4]", { x: 1, lo: 2 }, "false"),
    T("x between [2, hi]", { x: 4, hi: 4 }, "true"),
    T("x between [10, 1]", { x: 5 }, "false"),
    T("x between [10, 1]", { x: 1 }, "false"),
    T("x between [10, 1]", { x: 10 }, "false"),
    T("x between [5, 5]", { x: 5 }, "true"),
    T("x between [5, 5]", { x: 6 }, "false"),
    T("x BETWEEN [1, 10]", { x: 5 }, "true"),
    T("x Between [1, 10]", { x: 11 }, "false"),
    T("a.b between [1, 10]", { a: { b: 4 } }, "true"),
    T("items.length between [1, 3]", { items: [1, 2] }, "true"),
    T("items.length between [3, 5]", { items: [1, 2] }, "false"),
    T("NOT x between [1, 5]", { x: 3 }, "false"),
    T("NOT x between [1, 5]", { x: 9 }, "true"),
  ];
  it.each(expand(rows))("op-between: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T("x between [1, 10]", { x: 10 }, "true"),
    T("x between [1, 10]", { x: 11 }, "false"),
    T("x between [lo, hi]", { x: 3, lo: 2, hi: 4 }, "true"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-between: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));

  const errorRows: Row[] = [
    T("x between [1]", { x: 1 }, "type-error"),
    T("x between [1, 2, 3]", { x: 1 }, "type-error"),
    T("x between []", { x: 1 }, "type-error"),
    T("x between [, 2]", { x: 1 }, "type-error"),
    T("x between [1, ]", { x: 1 }, "type-error"),
    T("x between [1, 10", { x: 1 }, "type-error"),
    T("x between 5", { x: 1 }, "type-error"),
    T("x between lo", { x: 5, lo: [1, 10] }, "type-error"),
    T('x between "1,10"', { x: 5 }, "type-error"),
    T("x between [[1], 10]", { x: 5 }, "type-error"),
    T("x between [1 2, 10]", { x: 5 }, "type-error"),
    T("x between [1, 10]", { x: "abc" }, "type-error", true),
    T("x between [1, 10]", {}, "type-error", true),
    T("x between [1, 10]", { x: null }, "type-error", true),
    T("x between [1, 10]", { x: [5] }, "type-error", true),
    T("x between [1, 10]", { x: { a: 5 } }, "type-error", true),
    T("x between [1, 10]", { x: cyc }, "type-error", true),
    T("x between [1, 10]", { x: cycArr }, "type-error", true),
    T("x between [1, 10]", { x: BigInt(5) }, "type-error", true),
    T('x between ["a", 10]', { x: 5 }, "type-error", true),
    T('x between [1, "b"]', { x: 5 }, "type-error", true),
    T("x between [lo, 10]", { x: 5 }, "type-error", true),
    T("x between [lo, 10]", { x: 5, lo: "abc" }, "type-error", true),
    T("x between [lo, 10]", { x: 5, lo: cyc }, "type-error", true),
    T("x between [1, hi]", { x: 5, hi: BigInt(10) }, "type-error", true),
    T("x between [1, hi]", { x: 5, hi: null }, "type-error", true),
    // not between is not an operator
    T("x not between [1, 10]", { x: 5 }, "type-error"),
    T("x NOT BETWEEN [1, 10]", { x: 5 }, "type-error"),
  ];
  it.each(expand(errorRows, ALL_FORMS))("op-between: [$entry/$form] $cond with $dj is a located type-error", (c) => verifyRow(c));

  it.each(ENTRIES)("op-between: [%s] not between names the Unrecognized condition error", (entry) => {
    const o = run(entry, wrap("if", "x not between [1, 10]"), { x: 5 });
    check(o.code, `${entry}: not between is a type-error`).toBe("type-error");
    check(o.message ?? "", `${entry}: the message says Unrecognized condition`).toContain("Unrecognized condition");
  });
});

// =====================================================================================
// op-length
// =====================================================================================

describe("op-length: .length on arrays and strings", () => {
  const outRows: { tpl: string; data: Record<string, any>; out: string }[] = [
    { tpl: "${{items.length}}", data: { items: [1, 2, 3] }, out: "3" },
    { tpl: "${{items.length}}", data: { items: [] }, out: "0" },
    { tpl: "${{items.length}}", data: { items: [null] }, out: "1" },
    { tpl: "${{s.length}}", data: { s: "hello" }, out: "5" },
    { tpl: "${{s.length}}", data: { s: "" }, out: "0" },
    { tpl: "${{s.length}}", data: { s: "😀" }, out: "2" },
    { tpl: "${{s.length}}", data: { s: "a😀" }, out: "3" },
    { tpl: "${{user.tags.length}}", data: { user: { tags: ["a", "b"] } }, out: "2" },
    { tpl: "${{user.name.length}}", data: { user: { name: "Ann" } }, out: "3" },
    { tpl: "${{items.0.length}}", data: { items: ["ab", "c"] }, out: "2" },
    { tpl: "${{items.0.length}}", data: { items: [[1, 2, 3]] }, out: "3" },
    { tpl: "${{items.length + 1}}", data: { items: [1, 2, 3] }, out: "4" },
    { tpl: "${{items.length | upper}}", data: { items: [1, 2, 3] }, out: "3" },
    { tpl: "n=${{items.length}};m=${{s.length}}", data: { items: [1], s: "ab" }, out: "n=1;m=2" },
    { tpl: "${{c.length}}", data: { c: cycArr }, out: "1" },
    // an own key named length wins over the built-in
    { tpl: "${{o.length}}", data: { o: { length: 7 } }, out: "7" },
    { tpl: "${{o.length}}", data: { o: { length: 0 } }, out: "0" },
    { tpl: "${{o.length}}", data: { o: { length: null } }, out: "" },
    { tpl: "${{s.length}}", data: { s: '{"length": 5}' }, out: "5" },
    { tpl: "${{s.length}}", data: { s: '{"a":1}' }, out: "7" },
    // anything else keeps today's null
    { tpl: "${{o.length}}", data: { o: { a: 1 } }, out: "" },
    { tpl: "${{n.length}}", data: { n: 12345 }, out: "" },
    { tpl: "${{b.length}}", data: { b: true }, out: "" },
    { tpl: "${{b.length}}", data: { b: BigInt(10) }, out: "" },
    // a root variable named length is an ordinary variable
    { tpl: "${{length}}", data: { length: 5 }, out: "5" },
    { tpl: "${{length.length}}", data: { length: "abc" }, out: "3" },
    // loops
    { tpl: "{{FOR names AS n}}${{n.length}},{{END_FOR}}", data: { names: ["ab", "cde"] }, out: "2,3," },
    { tpl: "{{FOR rows AS r}}${{r.length}};{{END_FOR}}", data: { rows: [[1], [1, 2]] }, out: "1;2;" },
    { tpl: "{{FOR names AS n}}{{IF n.length > 2}}${{n}}{{END_IF}}{{END_FOR}}", data: { names: ["ab", "cde"] }, out: "cde" },
    // CASE subject
    { tpl: '{{CASE items.length}}{{WHEN "3"}}three{{END_WHEN}}{{DEFAULT}}d{{END_DEFAULT}}{{END_CASE}}', data: { items: [1, 2, 3] }, out: "three" },
    { tpl: '{{CASE items.length}}{{WHEN "3"}}three{{END_WHEN}}{{DEFAULT}}d{{END_DEFAULT}}{{END_CASE}}', data: { items: [1, 2] }, out: "d" },
    { tpl: '{{CASE s.length}}{{WHEN "2"}}two{{END_WHEN}}{{DEFAULT}}d{{END_DEFAULT}}{{END_CASE}}', data: { s: "😀" }, out: "two" },
  ];
  it.each(ENTRIES.flatMap((entry) => outRows.map((r) => ({ entry, ...r, dj: show(r.data) }))))("op-length: [$entry] $tpl with $dj prints $out", (c) => {
    const o = run(c.entry, c.tpl, c.data);
    check(o.code, `${c.entry}: ${c.tpl} renders`).toBe("ok");
    check(o.output, `${c.entry}: ${c.tpl} with ${c.dj} prints ${c.out}`).toBe(c.out);
  });

  it.each(ENTRIES)("op-length: [%s] a missing array stays empty, and strict mode reports the missing variable as before", (entry) => {
    const o = run(entry, "${{items.length}}", {});
    if (entry.endsWith("strict")) {
      check(o.code, `${entry}: strict reports the missing variable`).toBe("missing-variable");
    } else {
      check(o.code, `${entry}: lenient renders`).toBe("ok");
      check(o.output, `${entry}: a missing array gives empty output, not 0`).toBe("");
    }
  });

  const condRows: Row[] = [
    T("items.length > 2", { items: [1, 2, 3] }, "true"),
    T("items.length > 2", { items: [1, 2] }, "false"),
    T("items.length == 3", { items: [1, 2, 3] }, "true"),
    T("items.length >= 3", { items: [1, 2, 3] }, "true"),
    T("items.length < 3", { items: [1, 2, 3] }, "false"),
    T("items.length != 3", { items: [1, 2, 3] }, "false"),
    T("items.length == 0", { items: [] }, "true"),
    T("items.length > 0", { items: [] }, "false"),
    T("items.length between [1, 3]", { items: [1, 2, 3] }, "true"),
    T("items.length between [4, 5]", { items: [1, 2, 3] }, "false"),
    T("s.length > 1", { s: "😀" }, "true"),
    T("s.length == 2", { s: "😀" }, "true"),
    T("s.length == 1", { s: "😀" }, "false"),
    T("s.length == 3", { s: "a😀" }, "true"),
    T("s.length == 0", { s: "" }, "true"),
    T("s.length >= 5", { s: "hello" }, "true"),
    T("user.tags.length > 1", { user: { tags: ["a", "b"] } }, "true"),
    T("items.0.length == 2", { items: ["ab"] }, "true"),
    T("items.0.length == 2", { items: ["abc"] }, "false"),
    T('items.length > 0 AND items.0 == "a"', { items: ["a"] }, "true"),
    T("NOT items.length > 2", { items: [1, 2, 3] }, "false"),
    T("o.length > 5", { o: { length: 7 } }, "true"),
    T("o.length > 5", { o: { length: 0 } }, "false"),
    T("c.length == 1", { c: cycArr }, "true"),
    T("length > 3", { length: 5 }, "true"),
    // a missing array follows the ordering-operator rule: null is non-numeric
    T("items.length > 0", {}, "type-error"),
    T("o.length > 0", { o: { a: 1 } }, "type-error"),
    T("n.length > 0", { n: 5 }, "type-error"),
  ];
  it.each(expand(condRows))("op-length: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T("items.length > 2", { items: [1, 2, 3] }, "true"),
    T("items.length > 2", { items: [1] }, "false"),
    T("s.length == 2", { s: "😀" }, "true"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-length: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));
});

// =====================================================================================
// op-equality
// =====================================================================================

describe("op-equality: a quoted side compares as text, an unquoted number keeps its written text", () => {
  const rows: Row[] = [
    T('z == "01234"', { z: 1234 }, "false"),
    T('z == "01234"', { z: "01234" }, "true"),
    T('z == "01234"', { z: "1234" }, "false"),
    T('z == "1234"', { z: 1234 }, "true"),
    T('z == "1234"', { z: "1234" }, "true"),
    T('"01234" == z', { z: 1234 }, "false"),
    T('"1" == 1', {}, "true"),
    T('"1.0" == 1', {}, "false"),
    T('1 == "1.0"', {}, "false"),
    T('z == "1.0"', { z: 1 }, "false"),
    T('z == "1.0"', { z: "1.0" }, "true"),
    T('z != "01234"', { z: 1234 }, "true"),
    T('z != "01234"', { z: "01234" }, "false"),
    T('z != "1234"', { z: 1234 }, "false"),
    T('"1.0" != 1', {}, "true"),
    // unquoted numeric equality is unchanged
    T("z == 01234", { z: 1234 }, "true"),
    T("1234 == 01234", {}, "true"),
    T("a == b", { a: "1.0", b: "1" }, "true"),
    T("a == b", { a: "01234", b: 1234 }, "true"),
    T("a != b", { a: "1.0", b: "1" }, "false"),
    T("z != 01234", { z: 1234 }, "false"),
    T("z == 1.0", { z: 1 }, "true"),
    // contains, startsWith and endsWith keep the written number
    T("x contains 1.50", { x: "v1.50" }, "true"),
    T("x contains 1.50", { x: "v1.5" }, "false"),
    T("x contains 007", { x: "a007" }, "true"),
    T("x contains 007", { x: "a7" }, "false"),
    T("x startsWith 007", { x: "007z" }, "true"),
    T("x startsWith 007", { x: "7z" }, "false"),
    T("x endsWith 1.50", { x: "a1.50" }, "true"),
    T("x endsWith 1.50", { x: "a1.5" }, "false"),
    T('x contains "007"', { x: "a007" }, "true"),
    T('x contains "007"', { x: "a7" }, "false"),
    T("x contains y", { x: "a7", y: 7 }, "true"),
    T("x contains y", { x: "a007", y: "007" }, "true"),
    T("x contains 7", { x: "a7" }, "true"),
    T("x contains 7", { x: "a8" }, "false"),
  ];
  it.each(expand(rows))("op-equality: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T('z == "01234"', { z: 1234 }, "false"),
    T('z == "1234"', { z: 1234 }, "true"),
    T("x contains 007", { x: "a7" }, "false"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-equality: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));

  const noThrow = [
    { cond: 'x == "a"', data: { x: cyc } },
    { cond: 'x != "a"', data: { x: cyc } },
    { cond: 'x == "a"', data: { x: BigInt(10) } },
    { cond: "x == 10", data: { x: BigInt(10) } },
    { cond: "x == y", data: { x: cyc, y: cyc } },
    { cond: 'x contains "a"', data: { x: cyc } },
    { cond: "x contains y", data: { x: "a", y: BigInt(10) } },
    { cond: "x.length > 0", data: { x: cyc } },
    { cond: "x.length > 0", data: { x: BigInt(10) } },
  ];
  it.each(ENTRIES.flatMap((entry) => noThrow.map((r) => ({ entry, ...r, dj: show(r.data) }))))(
    "op-equality: [$entry] $cond with $dj never throws a raw exception",
    (c) => {
      const o = run(c.entry, wrap("if", c.cond), c.data);
      check(o.code.startsWith("threw:"), `${c.entry}: ${c.cond} ends in a result or a located type-error, got ${o.code}`).toBe(false);
      if (o.code !== "ok") expectLocatedTypeError(c.entry, "if", o, c.cond);
    }
  );
});

// =====================================================================================
// op-unknown
// =====================================================================================

describe("op-unknown: an unrecognized word next to an operator is an error in every mode", () => {
  const data = { a: 1, b: 2, c: 3, x: "q" };
  const rows: Row[] = [
    T("a like b", data, "type-error"),
    T("a equals b", data, "type-error"),
    T("a matches /x/", data, "type-error"),
    T("a == b c", data, "type-error"),
    T("a != b c", data, "type-error"),
    T("a > b c", data, "type-error"),
    T("a contains b c", data, "type-error"),
    T("a startsWith b c", data, "type-error"),
    T("a isEmpty b", data, "type-error"),
    T("a in [x y]", data, "type-error"),
    T("a in b in c", data, "type-error"),
    T("a in b == c", data, "type-error"),
    T("a == b in c", data, "type-error"),
    T("a between [1, 2] contains x", data, "type-error"),
    T("a in b contains c", data, "type-error"),
    T("a == b c AND x", data, "type-error"),
    T("x OR a like b", data, "type-error"),
    T("NOT a == b c", data, "type-error"),
    T("(a == b c)", data, "type-error"),
  ];
  it.each(expand(rows, ALL_FORMS))("op-unknown: [$entry/$form] $cond is a located Unrecognized condition error", (c) =>
    verifyRow(c, "Unrecognized condition")
  );

  // a variable key that contains a space, used as a whole condition, keeps today's behavior
  it.each(ENTRIES)("op-unknown: [%s] a present variable key with a space still reads as that variable", (entry) => {
    const o = run(entry, wrap("if", "first name"), { "first name": 1 });
    check(verdict("if", o), `${entry}: the key "first name" is truthy`).toBe("true");
  });
  it.each(ENTRIES)("op-unknown: [%s] an absent key with a space is the Unrecognized condition error", (entry) => {
    const o = run(entry, wrap("if", "first name"), {});
    expectLocatedTypeError(entry, "if", o, "first name");
    check(o.message ?? "", `${entry}: the message says Unrecognized condition`).toContain("Unrecognized condition");
  });

  const analyzeRows = [
    "a == b c",
    "a contains b c",
    "a in [x y]",
    "a in b in c",
    "a in b == c",
    "a between [1, 2] contains x",
    "x in [1",
    "x between [1",
  ];
  it.each(analyzeRows)("op-unknown: analyze reports %s as unrecognized-condition at the condition", (cond) => {
    const r = analyze(wrap("if", cond));
    const d = r.diagnostics.find((x) => x.code === "unrecognized-condition");
    check(d, `analyze reports an unrecognized-condition diagnostic for ${cond}`).toBeDefined();
    check({ line: d?.line, column: d?.column }, `the diagnostic for ${cond} is located at the IF`).toEqual(LOC.if);
  });
});

// =====================================================================================
// precedence: in, not in and between combine with AND, OR, NOT, ! and parentheses
// =====================================================================================

describe("op-in: precedence with logical words, negation, parentheses and quotes", () => {
  const rows: Row[] = [
    T("a in [1] AND b", { a: 1, b: true }, "true"),
    T("a in [1] AND b", { a: 2, b: true }, "false"),
    T("a in [1] AND b", { a: 1, b: false }, "false"),
    T("b AND a in [1]", { a: 1, b: true }, "true"),
    T("b AND a in [1]", { a: 2, b: true }, "false"),
    T("a in [1] OR b", { a: 2, b: true }, "true"),
    T("a in [1] OR b", { a: 2, b: false }, "false"),
    T("b OR a in [1]", { a: 1, b: false }, "true"),
    T("b OR a in [1]", { a: 2, b: false }, "false"),
    T("a not in [1] AND b", { a: 2, b: true }, "true"),
    T("a not in [1] AND b", { a: 1, b: true }, "false"),
    T("b OR a not in [1]", { a: 1, b: false }, "false"),
    T("b OR a not in [1]", { a: 2, b: false }, "true"),
    T("a between [1, 5] AND b", { a: 3, b: true }, "true"),
    T("a between [1, 5] AND b", { a: 9, b: true }, "false"),
    T("b AND a between [1, 5]", { a: 3, b: true }, "true"),
    T("b AND a between [1, 5]", { a: 9, b: true }, "false"),
    T("a between [1, 5] OR b", { a: 9, b: true }, "true"),
    T("a between [1, 5] OR b", { a: 9, b: false }, "false"),
    T("b OR a between [1, 5]", { a: 3, b: false }, "true"),
    T("b OR a between [1, 5]", { a: 9, b: false }, "false"),
    T("NOT x in [1, 2]", { x: 1 }, "false"),
    T("NOT x in [1, 2]", { x: 3 }, "true"),
    T("! x in [1, 2]", { x: 1 }, "false"),
    T("!x in [1, 2]", { x: 3 }, "true"),
    T("NOT x not in [1, 2]", { x: 1 }, "true"),
    T("NOT x not in [1, 2]", { x: 3 }, "false"),
    T("! x between [1, 5]", { x: 3 }, "false"),
    T("! x between [1, 5]", { x: 9 }, "true"),
    T("NOT x in [1, 2] AND y", { x: 3, y: true }, "true"),
    T("NOT x in [1, 2] AND y", { x: 3, y: false }, "false"),
    T("NOT x in [1, 2] AND y", { x: 1, y: false }, "false"),
    T("NOT x in [1, 2] OR y", { x: 1, y: true }, "true"),
    T("NOT x in [1, 2] OR y", { x: 1, y: false }, "false"),
    T("(x in [1, 2])", { x: 1 }, "true"),
    T("((x in [1, 2]) OR y)", { x: 5, y: true }, "true"),
    T("(a in [1]) AND (b between [1, 2])", { a: 1, b: 2 }, "true"),
    T("(a in [1]) AND (b between [1, 2])", { a: 1, b: 3 }, "false"),
    T("(a in [1]) AND (b between [1, 2])", { a: 2, b: 2 }, "false"),
    T("(a in [1] OR b in [1]) AND c", { a: 1, b: 9, c: false }, "false"),
    T("(a in [1] OR b in [1]) AND c", { a: 1, b: 9, c: true }, "true"),
    T("a in [1] OR b in [2] AND c", { a: 1, b: 9, c: false }, "true"),
    T("a in [1] OR b in [2] AND c", { a: 2, b: 2, c: true }, "true"),
    T("a in [1] OR b in [2] AND c", { a: 2, b: 2, c: false }, "false"),
    T("a in [1] OR b in [2] AND c", { a: 2, b: 9, c: true }, "false"),
    T("NOT (x in [1, 2]) AND y between [1, 5]", { x: 3, y: 2 }, "true"),
    T("NOT (x in [1, 2]) AND y between [1, 5]", { x: 1, y: 2 }, "false"),
    T("NOT (x in [1, 2]) AND y between [1, 5]", { x: 3, y: 9 }, "false"),
    T('x == "a" AND y in ["b"]', { x: "a", y: "b" }, "true"),
    T('x == "a" AND y in ["b"]', { x: "a", y: "c" }, "false"),
    T('y in ["b"] AND x == "a"', { x: "z", y: "b" }, "false"),
    T("x isNumber AND x in [1, 2]", { x: 1 }, "true"),
    T("x isNumber AND x in [1, 2]", { x: "a" }, "false"),
    T("x in [1] AND x isNumber", { x: 1 }, "true"),
    // operator words inside quotes never split
    T('title contains "in the end"', { title: "in the end of it" }, "true"),
    T('title contains "in the end"', { title: "the end" }, "false"),
    T('x == "a between b"', { x: "a between b" }, "true"),
    T('x == "a between b"', { x: "a" }, "false"),
    T('x == "a not in b"', { x: "a not in b" }, "true"),
    T('x == "a in b"', { x: "a in b" }, "true"),
    T('x == "a in b"', { x: "a" }, "false"),
    T('x contains "between [1, 2]"', { x: "between [1, 2]" }, "true"),
    T('x in ["a in b", "c"]', { x: "a in b" }, "true"),
    T('x in ["(", ")"]', { x: "(" }, "true"),
    T('x in ["(", ")"]', { x: ")" }, "true"),
    T('(x in ["(a", "b"]) OR false', { x: "b" }, "true"),
    T('(x in ["(a", "b"]) OR false', { x: "c" }, "false"),
    T('x in ["a AND b"] OR y', { x: "a AND b", y: false }, "true"),
    T('inbox contains "a"', { inbox: "cat" }, "true"),
  ];
  it.each(expand(rows))("op-in: [$entry] precedence $cond with $dj is $want", (c) => verifyRow(c));
});

// =====================================================================================
// op-spec
// =====================================================================================

describe("op-spec: spec and analyze list the new operators and the variables they read", () => {
  const OLD = ["==", "!=", ">", "<", ">=", "<=", "contains", "startsWith", "endsWith", "isEmpty", "isNotEmpty", "isArray", "isNumber", "isObject", "isBoolean", "AND", "OR", "NOT"];

  it.each(["in", "not in", "between", ".length"])("op-spec: spec().operators lists %s exactly once", (name) => {
    const count = spec().operators.filter((o) => o === name).length;
    check(count, `${name} appears once in spec().operators`).toBe(1);
  });

  it("op-spec: the existing operators keep their order and spelling", () => {
    const kept = spec().operators.filter((o) => OLD.includes(o));
    check(kept, "the existing entries are unchanged and in order").toEqual(OLD);
    check(spec().operators.length, "exactly four entries are added").toBe(OLD.length + 4);
  });

  const names = (tpl: string) => analyze(tpl).variables.map((v) => v.name).sort();
  const varRows: { tpl: string; names: string[] }[] = [
    { tpl: '{{IF x in ["a", y]}}A{{END_IF}}', names: ["x", "y"] },
    { tpl: "{{IF x in list}}A{{END_IF}}", names: ["list", "x"] },
    { tpl: "{{IF x not in list}}A{{END_IF}}", names: ["list", "x"] },
    { tpl: '{{IF x in "text"}}A{{END_IF}}', names: ["x"] },
    { tpl: "{{IF x between [lo, hi]}}A{{END_IF}}", names: ["hi", "lo", "x"] },
    { tpl: "{{IF x between [1, hi]}}A{{END_IF}}", names: ["hi", "x"] },
    { tpl: "{{IF x between [1, 10]}}A{{END_IF}}", names: ["x"] },
    { tpl: '{{IF x in ["a", 1, true, null]}}A{{END_IF}}', names: ["x"] },
    { tpl: "{{IF items.length > 2}}A{{END_IF}}", names: ["items"] },
    { tpl: "{{IF a in b AND c.length > 1}}A{{END_IF}}", names: ["a", "b", "c"] },
    { tpl: "${{items.length}}", names: ["items"] },
    { tpl: "${{items.length + n}}", names: ["items", "n"] },
    { tpl: "{{LIST}}{{LIST_ITEM x in list}}A{{END_LIST_ITEM}}{{END_LIST}}", names: ["list", "x"] },
    { tpl: "{{IF false}}Z{{ELSEIF x between [lo, 5]}}A{{END_IF}}", names: ["lo", "x"] },
    { tpl: "{{FOR names AS n}}{{IF n in allowed}}${{@index0}}{{END_IF}}{{END_FOR}}", names: ["allowed", "names"] },
    { tpl: "{{FOR names AS n}}{{IF n.length > 1}}A{{END_IF}}{{END_FOR}}", names: ["names"] },
    { tpl: '{{FOR names AS n}}{{IF x in [n, "k"]}}A{{END_IF}}{{END_FOR}}', names: ["names", "x"] },
  ];
  it.each(varRows)("op-spec: analyze reads $names from $tpl", (c) => {
    check(names(c.tpl), `variables read by ${c.tpl}`).toEqual(c.names);
  });

  const pathRows: { tpl: string; name: string; paths: string[] }[] = [
    { tpl: "{{IF items.length > 2}}A{{END_IF}}", name: "items", paths: ["items.length"] },
    { tpl: "{{IF a in b AND c.length > 1}}A{{END_IF}}", name: "c", paths: ["c.length"] },
    { tpl: "${{items.length}}", name: "items", paths: ["items.length"] },
    { tpl: "{{IF user.tags.length > 1}}A{{END_IF}}", name: "user", paths: ["user.tags.length"] },
    { tpl: "{{IF x in list.items}}A{{END_IF}}", name: "list", paths: ["list.items"] },
    { tpl: "{{IF x between [r.lo, r.hi]}}A{{END_IF}}", name: "r", paths: ["r.hi", "r.lo"] },
  ];
  it.each(pathRows)("op-spec: analyze records the path text of $name in $tpl", (c) => {
    const v = analyze(c.tpl).variables.find((x) => x.name === c.name);
    check(v, `${c.name} is a read variable in ${c.tpl}`).toBeDefined();
    check([...(v?.paths ?? [])].sort(), `paths recorded for ${c.name}`).toEqual(c.paths);
  });

  it.each(['{{IF x in ["a", y]}}A{{END_IF}}', "{{IF x between [lo, hi]}}A{{END_IF}}", "{{IF items.length > 2}}A{{END_IF}}"])(
    "op-spec: a well formed condition %s raises no diagnostic",
    (tpl) => {
      check(analyze(tpl).diagnostics, `no diagnostics for ${tpl}`).toEqual([]);
    }
  );

  it.each(["x in [1", "x between [1", "x in [1,]", "x between [1, 2, 3]"])("op-spec: a malformed %s gives unrecognized-condition", (cond) => {
    const codes = analyze(wrap("if", cond)).diagnostics.map((d) => d.code);
    check(codes, `diagnostic codes for ${cond}`).toContain("unrecognized-condition");
  });
});
