/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { check } from "../headless/http-helpers";

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];
const RENDERS: Entry[] = ["render-strict", "render-lenient"];
const RESOLVES: Entry[] = ["resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  severity?: string;
  suggestion?: string;
  output?: string;
}

function run(entry: Entry, template: string, data: Record<string, any>): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode });
      if (r.ok) return { code: "ok", output: r.output };
      const d = r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, suggestion: d.suggestion, output: r.output };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) {
      return { code: e.code, line: e.line, column: e.column, severity: "error", suggestion: e.suggestion };
    }
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

/** The variable sits on line 2, column 3, so a default location of 1:1 fails the row. */
const at = (tag: string) => `first line\n  ${tag}`;
const LOCATION = { line: 2, column: 3 };

function expectLocatedTypeError(entry: Entry, o: Outcome, what: string): void {
  check(o.code, `${entry}: ${what} is a type-error`).toBe("type-error");
  check(o.severity, `${entry}: ${what} has severity error`).toBe("error");
  check({ line: o.line, column: o.column }, `${entry}: ${what} is located at the variable`).toEqual(LOCATION);
}

describe("mt-zero: division and modulo by zero are located errors in render only", () => {
  const data = { x: 5, a: 2, zero: 0 };
  const errorRows = [
    { expr: "x / 0", old: "Infinity" },
    { expr: "x % 0", old: "NaN" },
    { expr: "x / zero", old: "Infinity" },
    { expr: "0 / 0", old: "NaN" },
    { expr: "x / (a - a)", old: "Infinity" },
    { expr: "10 % 0", old: "NaN" },
  ];
  it.each(RENDERS.flatMap((entry) => errorRows.map((r) => ({ entry, ...r }))))("mt-zero: [$entry] ${{$expr}} is a type-error at the variable", (c) => {
    expectLocatedTypeError(c.entry, run(c.entry, at("${{" + c.expr + "}}"), data), c.expr);
  });

  it.each(RESOLVES.flatMap((entry) => errorRows.map((r) => ({ entry, ...r }))))("mt-zero: [$entry] resolveTemplate keeps printing $old for ${{$expr}}", (c) => {
    const o = run(c.entry, at("${{" + c.expr + "}}"), data);
    check(o.code, `${c.entry}: resolveTemplate does not fail`).toBe("ok");
    check(o.output, `${c.entry}: the old output ${c.old} is kept`).toContain(c.old);
  });

  const okRows = [
    { expr: "x / 4", out: "1.25" },
    { expr: "x % 3", out: "2" },
    { expr: "x / a", out: "2.5" },
  ];
  it.each(RENDERS.flatMap((entry) => okRows.map((r) => ({ entry, ...r }))))("mt-zero: [$entry] a nonzero divisor still computes ${{$expr}}", (c) => {
    const o = run(c.entry, "${{" + c.expr + "}}", data);
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: the computed value`).toBe(c.out);
  });

  it("mt-zero: a zero error stops the render with ok false and a diagnostic, never an exception", () => {
    const r = render(at("${{x / 0}}"), data, { strictMode: false });
    check(r.ok, "render is not ok").toBe(false);
    check(r.diagnostics.length > 0, "a diagnostic is reported").toBe(true);
  });
});

describe("mt-float: arithmetic prints with at most 15 significant digits in render only", () => {
  const rows = [
    { expr: "0.1 + 0.2", data: {}, out: "0.3" },
    { expr: "x * 3", data: { x: 1.1 }, out: "3.3" },
    { expr: "1 / 3", data: {}, out: "0.333333333333333" },
    { expr: "2 / 3", data: {}, out: "0.666666666666667" },
    { expr: "10 / 4", data: {}, out: "2.5" },
    { expr: "7 - 10", data: {}, out: "-3" },
    { expr: "0.1 * 3", data: {}, out: "0.3" },
    { expr: "1000000 * 1000000", data: {}, out: "1000000000000" },
    { expr: "-0.5 * 2", data: {}, out: "-1" },
    { expr: "x + y", data: { x: 0.7, y: 0.1 }, out: "0.8" },
  ];
  it.each(RENDERS.flatMap((entry) => rows.map((r) => ({ entry, ...r }))))("mt-float: [$entry] ${{$expr}} prints $out", (c) => {
    const o = run(c.entry, "${{" + c.expr + "}}", c.data);
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: no binary float noise`).toBe(c.out);
  });

  const bigRows = [
    { expr: "1234567890123456 + 0", data: {}, out: "1234567890123456" },
    { expr: "x * 1", data: { x: 9007199254740991 }, out: "9007199254740991" },
    { expr: "x * 1", data: { x: -9007199254740991 }, out: "-9007199254740991" },
    { expr: "0.1 + 0.2", data: {}, out: "0.3" },
  ];
  it.each(RENDERS.flatMap((entry) => bigRows.map((r) => ({ entry, ...r }))))("mt-float: [$entry] large integer ${{$expr}} prints $out unchanged", (c) => {
    const o = run(c.entry, "${{" + c.expr + "}}", c.data);
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: integers print unchanged`).toBe(c.out);
  });

  const keep = [
    { expr: "0.1 + 0.2", data: {}, out: String(0.1 + 0.2) },
    { expr: "x * 3", data: { x: 1.1 }, out: String(1.1 * 3) },
    { expr: "1 / 3", data: {}, out: String(1 / 3) },
  ];
  it.each(RESOLVES.flatMap((entry) => keep.map((r) => ({ entry, ...r }))))("mt-float: [$entry] resolveTemplate keeps the unrounded $out for ${{$expr}}", (c) => {
    const o = run(c.entry, "${{" + c.expr + "}}", c.data);
    check(o.output, `${c.entry}: resolveTemplate keeps String(result)`).toBe(c.out);
  });
});

describe("mt-hyphen: a hyphen between two ASCII letters is part of the name", () => {
  const data = { "first-name": "Ada", user: { "first-name": "Bo" }, "a-b": 3, a: 10, b: 4, n: 7, x1: 9, y: 1 };
  const rows = [
    { tpl: "${{first-name}}", out: "Ada", why: "a plain hyphenated key" },
    { tpl: "${{user.first-name}}", out: "Bo", why: "a nested hyphenated key" },
    { tpl: "${{a-b + 1}}", out: "4", why: "the hyphenated key a-b in math, not a minus b" },
    { tpl: "${{a - b}}", out: "6", why: "spaces keep a minus" },
    { tpl: "${{a -b}}", out: "6", why: "a hyphen with a space before stays a minus" },
    { tpl: "${{n-1}}", out: "6", why: "a digit after stays a minus" },
    { tpl: "${{x1-y}}", out: "8", why: "a digit before stays a minus" },
    { tpl: "${{a-1}}", out: "9", why: "a letter then a digit stays a minus" },
    { tpl: "${{1-a}}", out: "-9", why: "a digit then a letter stays a minus" },
  ];
  it.each(ENTRIES.flatMap((entry) => rows.map((r) => ({ entry, ...r }))))("mt-hyphen: [$entry] $tpl gives $out ($why)", (c) => {
    const o = run(c.entry, c.tpl, data);
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: ${c.why}`).toBe(c.out);
  });

  it.each(["render-strict", "resolve-strict"] as Entry[])("mt-hyphen: [%s] a missing hyphenated name is missing-variable with the spaced form in the suggestion", (entry) => {
    const o = run(entry, "${{first-name}}", {});
    check(o.code, `${entry}: missing-variable`).toBe("missing-variable");
    check(o.suggestion ?? "", `${entry}: the suggestion names the spaced form`).toContain("first - name");
  });

  it.each(["render-lenient", "resolve-lenient"] as Entry[])("mt-hyphen: [%s] a missing hyphenated name prints empty in lenient mode", (entry) => {
    const o = run(entry, "${{first-name}}", {});
    check(o.code, `${entry}: ok`).toBe("ok");
    check(o.output, `${entry}: empty text`).toBe("");
  });

  it("mt-hyphen: analyze lists ${{a-b}} as one variable a-b", () => {
    check(analyze("${{a-b}}").variables.map((v) => v.name), "one variable named a-b").toEqual(["a-b"]);
  });

  it("mt-hyphen: analyze lists ${{a - b}} as the two variables a and b", () => {
    check(analyze("${{a - b}}").variables.map((v) => v.name).sort(), "variables a and b").toEqual(["a", "b"]);
  });

  it("mt-hyphen: analyze lists ${{n-1}} as the one variable n", () => {
    check(analyze("${{n-1}}").variables.map((v) => v.name), "variable n").toEqual(["n"]);
  });
});

describe("mt-lenient: a malformed math expression is a located error in lenient mode too", () => {
  const bad = ["(1 + 2", "1 + ", "1 + * 2", "2 $ 3", "(1 + 2))"];
  it.each(ENTRIES.flatMap((entry) => bad.map((expr) => ({ entry, expr }))))("mt-lenient: [$entry] ${{$expr}} is a type-error at the variable", (c) => {
    expectLocatedTypeError(c.entry, run(c.entry, at("${{" + c.expr + "}}"), { x: 1 }), c.expr);
  });

  it.each(["render-lenient", "resolve-lenient"] as Entry[])("mt-lenient: [%s] a well-formed math with a missing variable stays empty", (entry) => {
    const o = run(entry, at("${{missing + 1}}"), {});
    check(o.code, `${entry}: ok, still lenient`).toBe("ok");
    check((o.output ?? "").trim(), `${entry}: only the text before it`).toBe("first line");
  });

  it.each(ENTRIES)("mt-lenient: [%s] an unknown filter stays an error", (entry) => {
    const o = run(entry, "${{x | nosuchfilter}}", { x: 1 });
    check(o.code !== "ok", `${entry}: an error code, not ok`).toBe(true);
    check(o.code.startsWith("threw:"), `${entry}: a coded error, not an exception`).toBe(false);
  });
});

describe("mt-keys: a key that exists is never a math error, a missing plain name stays a plain name", () => {
  it.each(ENTRIES)("mt-keys: [%s] key a:b with value null prints empty", (entry) => {
    const o = run(entry, "${{a:b}}", { "a:b": null });
    check(o.code, `${entry}: ok`).toBe("ok");
    check(o.output, `${entry}: empty`).toBe("");
  });

  it.each(ENTRIES)("mt-keys: [%s] key a:b with value 7 prints 7", (entry) => {
    const o = run(entry, "${{a:b}}", { "a:b": 7 });
    check(o.code, `${entry}: ok`).toBe("ok");
    check(o.output, `${entry}: the value`).toBe("7");
  });

  it.each(ENTRIES)("mt-keys: [%s] key Order # with value null prints empty", (entry) => {
    const o = run(entry, "${{Order #}}", { "Order #": null });
    check(o.code, `${entry}: ok`).toBe("ok");
    check(o.output, `${entry}: empty`).toBe("");
  });

  const names = ["a:b", "Order #"];
  it.each(["render-strict", "resolve-strict"].flatMap((entry) => names.map((name) => ({ entry: entry as Entry, name }))))("mt-keys: [$entry] a missing $name is missing-variable", (c) => {
    const o = run(c.entry, "${{" + c.name + "}}", {});
    check(o.code, `${c.entry}: missing-variable`).toBe("missing-variable");
  });

  it.each(["render-lenient", "resolve-lenient"].flatMap((entry) => names.map((name) => ({ entry: entry as Entry, name }))))("mt-keys: [$entry] a missing $name prints empty", (c) => {
    const o = run(c.entry, "${{" + c.name + "}}", {});
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: empty`).toBe("");
  });
});

describe("mt-cyclic: a value with no text form is a located error as output", () => {
  const cyclicObject: any = {};
  cyclicObject.self = cyclicObject;
  const cyclicArray: any[] = [];
  cyclicArray.push(cyclicArray);
  const values: Array<{ name: string; value: any }> = [
    { name: "a cyclic object", value: cyclicObject },
    { name: "a cyclic array", value: cyclicArray },
    { name: "a BigInt", value: BigInt(10) },
  ];
  const usages: Array<{ use: string; tpl: string; column?: number }> = [
    { use: "plain output", tpl: "${{c}}", column: 3 },
    { use: "output after a filter that keeps the value (trim)", tpl: "${{c | trim}}", column: 3 },
    { use: "output after the default filter", tpl: '${{c | default="z"}}', column: 3 },
    { use: "a CASE subject", tpl: '{{CASE c}}{{WHEN "x"}}X{{END_WHEN}}{{DEFAULT}}D{{END_DEFAULT}}{{END_CASE}}' },
  ];
  const cases = ENTRIES.flatMap((entry) => values.flatMap((v) => usages.map((u) => ({ entry, ...v, ...u }))));
  it.each(cases)("mt-cyclic: [$entry] $name as $use is a type-error", (c) => {
    const o = run(c.entry, at(c.tpl), { c: c.value });
    check(o.code, `${c.entry}: ${c.name} as ${c.use} is a type-error`).toBe("type-error");
    check(o.severity, `${c.entry}: severity error`).toBe("error");
    check(o.line, `${c.entry}: located on line 2`).toBe(2);
    if (c.column !== undefined) check(o.column, `${c.entry}: located at the variable`).toBe(c.column);
  });

  it.each(ENTRIES)("mt-cyclic: [%s] a cyclic value read inside a FOR body is a type-error", (entry) => {
    const o = run(entry, at("{{FOR xs AS i}}${{i}}{{END_FOR}}"), { xs: [cyclicObject] });
    check(o.code, `${entry}: type-error`).toBe("type-error");
    check(o.line, `${entry}: located on line 2`).toBe(2);
  });

  const printable: Array<{ name: string; value: any; out?: string }> = [
    { name: "null", value: null, out: "" },
    { name: "undefined", value: undefined, out: "" },
    { name: "an empty string", value: "", out: "" },
    { name: "zero", value: 0, out: "0" },
    { name: "false", value: false, out: "false" },
    { name: "a plain object", value: { k: 1 } },
  ];
  it.each(ENTRIES.flatMap((entry) => printable.map((p) => ({ entry, ...p }))))("mt-cyclic: [$entry] $name still prints as before", (c) => {
    const o = run(c.entry, "${{c}}", { c: c.value });
    check(o.code, `${c.entry}: ${c.name} is ok`).toBe("ok");
    if (c.out !== undefined) check(o.output, `${c.entry}: ${c.name} prints ${JSON.stringify(c.out)}`).toBe(c.out);
  });

  const selfList: any[] = [];
  selfList.push(selfList);
  const lengthRows = [
    { name: "a list that contains itself", xs: selfList, out: "1" },
    { name: "a list of BigInts", xs: [BigInt(1), BigInt(2)], out: "2" },
  ];
  it.each(ENTRIES.flatMap((entry) => lengthRows.map((r) => ({ entry, ...r }))))("mt-cyclic: [$entry] length of $name still prints $out", (c) => {
    const o = run(c.entry, "${{xs | length}}", { xs: c.xs });
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: the count prints`).toBe(c.out);
  });

  it.each(ENTRIES)("mt-cyclic: [%s] first of a BigInt list is a type-error because the result is a BigInt", (entry) => {
    expectLocatedTypeError(entry, run(entry, at("${{xs | first}}"), { xs: [BigInt(1)] }), "first of [1n]");
  });

  it.each(ENTRIES)("mt-cyclic: [%s] json of a cyclic object is the json filter's own cyclic type-error", (entry) => {
    const strictMode = entry.endsWith("strict");
    let message = "";
    let code = "";
    let line: number | undefined;
    if (entry.startsWith("render")) {
      const r = render(at("${{c | json}}"), { c: cyclicObject }, { strictMode });
      code = r.diagnostics[0]?.code ?? "ok";
      message = r.diagnostics[0]?.message ?? "";
      line = r.diagnostics[0]?.line;
    } else {
      try {
        resolveTemplate(at("${{c | json}}"), new Map([["c", cyclicObject]]), { strictMode });
        code = "ok";
      } catch (e) {
        code = (e as any).code;
        message = (e as Error).message;
        line = (e as any).line;
      }
    }
    check(code, `${entry}: type-error`).toBe("type-error");
    check(line, `${entry}: located on line 2`).toBe(2);
    check(message.toLowerCase(), `${entry}: the json filter's own error`).toContain("cyclic");
  });

  it("mt-cyclic: a cyclic value in render returns ok false and a diagnostic, not an exception", () => {
    const r = render(at("${{c}}"), { c: cyclicObject }, { strictMode: false });
    check(r.ok, "render is not ok").toBe(false);
    check(r.diagnostics[0]?.code, "the first diagnostic is a type-error").toBe("type-error");
  });
});
