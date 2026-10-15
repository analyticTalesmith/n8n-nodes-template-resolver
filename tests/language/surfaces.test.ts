/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";
import { FILTER_REGISTRY } from "../../core/src/filters";
import { Lexer } from "../../core/src/lexer";
import { render } from "../../core/src/render";
import { spec } from "../../core/src/spec";

const REPO = path.join(__dirname, "..", "..");
const README = fs.readFileSync(path.join(REPO, "README.md"), "utf8").replace(/\r\n/g, "\n");
const SHOWCASE_DIR = path.join(REPO, "tests", "golden", "render-cases", "lang-filters-showcase");
const SHOWCASE = fs
  .readFileSync(path.join(SHOWCASE_DIR, "template.md"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\n+$/, "");

const REGISTRY_NAMES = FILTER_REGISTRY.map((f) => f.name);

/** The lexer accepts a keyword when its tag is anything but an unknown tag. */
function lexerAccepts(keyword: string): boolean {
  try {
    new Lexer(`{{${keyword}}}`).tokenize();
    return true;
  } catch (e) {
    return !String((e as Error).message).includes("Unknown template tag");
  }
}

// ---- ld-spec: blocks ----

const BLOCK_PAIRS: [string, string | undefined][] = [
  ["IF", "END_IF"],
  ["ELSEIF", undefined],
  ["ELSE", undefined],
  ["CASE", "END_CASE"],
  ["WHEN", "END_WHEN"],
  ["DEFAULT", "END_DEFAULT"],
  ["FOR", "END_FOR"],
  ["LIST", "END_LIST"],
  ["LIST_ITEM", "END_LIST_ITEM"],
  ["TABLE", "END_TABLE"],
  ["HEADER", "END_HEADER"],
  ["ROW", "END_ROW"],
  ["SECTION", "END_SECTION"],
  ["FENCE", "END_FENCE"],
  ["RAW", "END_RAW"],
];

describe("surfaces", () => {
  it("ld-spec lexer probe: a made-up tag is not accepted", () => {
    expect(lexerAccepts("NOPE")).toBe(false);
  });

  it.each(BLOCK_PAIRS)("ld-spec block %s: the lexer accepts it and spec() lists it with closer %s", (open, close) => {
    expect(lexerAccepts(open)).toBe(true);
    const block = spec().blocks.find((b) => b.name === open);
    expect(block).toBeDefined();
    if (close === undefined) {
      expect(block?.closes).toBeUndefined();
    } else {
      expect(lexerAccepts(close)).toBe(true);
      expect(block?.closes).toBe(close);
    }
  });

  it("ld-spec blocks: spec().blocks has no name outside the keyword table", () => {
    const known = BLOCK_PAIRS.map(([open]) => open);
    const extra = spec()
      .blocks.map((b) => b.name)
      .filter((n) => !known.includes(n));
    expect(extra).toEqual([]);
  });

  // ---- ld-spec: filters ----

  it.each(REGISTRY_NAMES)("ld-spec filter %s: spec() lists it with a description and a params form", (name) => {
    const entry = spec().filters.find((f) => f.name === name);
    expect(entry).toBeDefined();
    expect(entry?.description.length).toBeGreaterThan(0);
    const takesParams = (FILTER_REGISTRY.find((f) => f.name === name)?.paramNames.length ?? 0) > 0;
    if (takesParams) expect(entry?.params.length).toBeGreaterThan(0);
  });

  it("ld-spec filters: spec().filters has the registry names in the registry order, none extra", () => {
    expect(spec().filters.map((f) => f.name)).toEqual(REGISTRY_NAMES);
  });

  const FILTER_PROBES: [string, string, Record<string, any>][] = [
    ["head", "${{s | head=3}}", { s: "abcdef" }],
    ["tail", "${{s | tail=3}}", { s: "abcdef" }],
    ["trim", "${{s | trim}}", { s: "  x  " }],
    ["escape_md", "${{s | escape_md}}", { s: "a*b" }],
    ["fence", "${{s | fence=js}}", { s: "x = 1" }],
    ["heading_offset", "${{s | heading_offset=1}}", { s: "# T" }],
    ["upper", "${{s | upper}}", { s: "ab" }],
    ["lower", "${{s | lower}}", { s: "AB" }],
    ["title", "${{s | title}}", { s: "ab cd" }],
    ['replace', '${{s | replace:find="a",with="b"}}', { s: "aa" }],
    ["indent", "${{s | indent=2}}", { s: "a\nb" }],
    ["quote", "${{s | quote}}", { s: "a" }],
    ["round", "${{n | round=1}}", { n: 1.25 }],
    ["default", '${{s | default="x"}}', { s: "" }],
    ["join", '${{xs | join=", "}}', { xs: ["a", "b"] }],
    ["length", "${{xs | length}}", { xs: ["a", "b"] }],
    ["first", "${{xs | first}}", { xs: ["a", "b"] }],
    ["last", "${{xs | last}}", { xs: ["a", "b"] }],
    ["sort", "${{xs | sort}}", { xs: ["b", "a"] }],
    ["unique", "${{xs | unique}}", { xs: ["a", "a"] }],
    ["slice", "${{xs | slice:start=1}}", { xs: ["a", "b"] }],
    ["lines", "${{s | lines}}", { s: "a\nb" }],
    ["json", "${{o | json}}", { o: { b: 1, a: 2 } }],
  ];

  it.each(FILTER_PROBES)("ld-spec filter %s: a sample template renders ok", (_name, template, data) => {
    const r = render(template, data, { strictMode: true });
    expect({ ok: r.ok, diagnostics: r.diagnostics.map((d) => d.message) }).toEqual({ ok: true, diagnostics: [] });
  });

  it("ld-spec filters: the probe table covers exactly the registry names", () => {
    expect(FILTER_PROBES.map(([n]) => n).sort()).toEqual([...REGISTRY_NAMES].sort());
  });

  // ---- ld-spec: operators ----

  type OpRow = [string, string, Record<string, any>, "yes" | "no"];
  const OPERATOR_ROWS: OpRow[] = [
    ["==", 'a == "x"', { a: "x" }, "yes"],
    ["!=", 'a != "x"', { a: "y" }, "yes"],
    [">", "n > 1", { n: 2 }, "yes"],
    ["<", "n < 1", { n: 2 }, "no"],
    [">=", "n >= 2", { n: 2 }, "yes"],
    ["<=", "n <= 1", { n: 2 }, "no"],
    ["contains", 'a contains "b"', { a: "abc" }, "yes"],
    ["startsWith", 'a startsWith "ab"', { a: "abc" }, "yes"],
    ["endsWith", 'a endsWith "bc"', { a: "abc" }, "yes"],
    ["isEmpty", "a isEmpty", { a: "" }, "yes"],
    ["isNotEmpty", "a isNotEmpty", { a: "x" }, "yes"],
    ["isArray", "a isArray", { a: [1] }, "yes"],
    ["isNumber", "a isNumber", { a: 3 }, "yes"],
    ["isObject", "a isObject", { a: { k: 1 } }, "yes"],
    ["isBoolean", "a isBoolean", { a: true }, "yes"],
    ["AND", "a AND b", { a: true, b: false }, "no"],
    ["OR", "a OR b", { a: true, b: false }, "yes"],
    ["NOT", "NOT(a)", { a: false }, "yes"],
    ["in", 'a in ["x", "y"]', { a: "y" }, "yes"],
    ["not in", 'a not in ["x", "y"]', { a: "z" }, "yes"],
    ["between", "n between [1, 5]", { n: 5 }, "yes"],
    [".length", "xs.length > 1", { xs: [1, 2] }, "yes"],
    ["&&", "a && b", { a: true, b: false }, "no"],
    ["||", "a || b", { a: true, b: false }, "yes"],
    ["!", "!a", { a: false }, "yes"],
  ];
  const SPELLING_OF: Record<string, string> = { "&&": "AND", "||": "OR", "!": "NOT" };

  it.each(OPERATOR_ROWS)("ld-spec operator %s: the evaluator accepts %s and picks the right branch", (_op, cond, data, want) => {
    const r = render(`{{IF ${cond}}}yes{{ELSE}}no{{END_IF}}`, data, { strictMode: true });
    expect({ ok: r.ok, output: r.output }).toEqual({ ok: true, output: want });
  });

  it.each(OPERATOR_ROWS.filter(([op]) => !(op in SPELLING_OF)).map(([op]) => [op]))(
    "ld-spec operator %s: spec().operators lists it",
    (op) => {
      expect(spec().operators).toContain(op);
    },
  );

  it.each(Object.entries(SPELLING_OF))("ld-spec operator spelling %s maps to %s which spec() lists", (_s, canonical) => {
    expect(spec().operators).toContain(canonical);
  });

  it("ld-spec operators: every spec().operators entry has a row in the operator table", () => {
    const rows = OPERATOR_ROWS.map(([op]) => SPELLING_OF[op] ?? op);
    const missing = spec().operators.filter((o) => !rows.includes(o));
    expect(missing).toEqual([]);
  });

  it.each([true, false])("ld-spec operators: a made-up operator word is an error (strictMode %s)", (strictMode) => {
    const r = render("{{IF a like b}}yes{{ELSE}}no{{END_IF}}", { a: "x", b: "x" }, { strictMode });
    expect(r.ok).toBe(false);
  });

  // ---- ld-readme (guard) ----

  const LIMIT_KEYS = Object.keys(spec().limits);

  it.each(REGISTRY_NAMES)("ld-readme filter %s: the README mentions it", (name) => {
    expect(README.includes(name)).toBe(true);
  });

  it.each(spec().operators)("ld-readme operator %s: the README mentions it", (op) => {
    expect(README.includes(op)).toBe(true);
  });

  it.each(LIMIT_KEYS)("ld-readme limit %s: the README mentions the limit key", (key) => {
    expect(README.includes(key)).toBe(true);
  });

  it("ld-readme limits: spec().limits includes maxNodes", () => {
    expect(LIMIT_KEYS).toContain("maxNodes");
  });

  it("ld-readme: the README mentions the --max-nodes flag", () => {
    expect(README.includes("--max-nodes")).toBe(true);
  });

  it("ld-readme: the README mentions the limit-nodes code", () => {
    expect(README.includes("limit-nodes")).toBe(true);
  });

  it("ld-readme: the README holds the filters showcase template verbatim", () => {
    expect(SHOWCASE.length).toBeGreaterThan(0);
    expect(README.includes(SHOWCASE)).toBe(true);
  });

  it.each(REGISTRY_NAMES)("ld-readme filter %s: the showcase template calls it as a filter", (name) => {
    const calls = new RegExp(`\\|\\s*${name}\\s*(?:[=:}|]|$)`, "m");
    expect(calls.test(SHOWCASE)).toBe(true);
  });
});
