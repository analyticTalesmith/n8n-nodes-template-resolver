import { resolveTemplate, DEFAULT_LIMITS } from "../../core/src";
import { Limits, TemplateValue } from "../../core/src/types";

type Entries = [string, TemplateValue][];

interface Outcome {
  threw: boolean;
  output: string;
  code: unknown;
  line: unknown;
  column: unknown;
}

function run(template: string, entries: Entries = [], limits?: Partial<Limits>): Outcome {
  try {
    const output = resolveTemplate(template, new Map(entries), { strictMode: true, limits });
    return { threw: false, output, code: undefined, line: undefined, column: undefined };
  } catch (e) {
    const x = e as any;
    return { threw: true, output: "", code: x.code, line: x.line, column: x.column };
  }
}

const items = (n: number, v: TemplateValue = "x"): TemplateValue[] => Array.from({ length: n }, () => v);
const nestIf = (n: number) => "{{IF t}}\n".repeat(n) + "x" + "{{END_IF}}".repeat(n);
const T: Entries = [["t", "yes"]];

describe("lm-iterations: total FOR iterations are bounded and the throw is located at the loop", () => {
  const over = [
    {
      name: "a single loop of 6 with limit 5 throws limit-iterations at the loop tag",
      template: "a\n  {{FOR xs AS i}}${{i}}{{END_FOR}}",
      entries: [["xs", items(6)]] as Entries,
      limits: { maxIterations: 5 },
      line: 2,
      column: 3,
    },
    {
      name: "iterations are summed across sequential loops and located at the loop that crosses the limit",
      template: "a\n{{FOR xs AS i}}${{i}}{{END_FOR}}\n b{{FOR xs AS j}}${{j}}{{END_FOR}}",
      entries: [["xs", items(3)]] as Entries,
      limits: { maxIterations: 5 },
      line: 3,
      column: 3,
    },
    {
      name: "nested loops count their inner iterations (2 x 3 exceeds 5)",
      template: "a\n{{FOR xs AS i}}{{FOR ys AS j}}${{j}}{{END_FOR}}{{END_FOR}}",
      entries: [["xs", items(2)], ["ys", items(3)]] as Entries,
      limits: { maxIterations: 5 },
      line: 0,
      column: 0,
    },
    {
      name: "a limit of 0 forbids any iteration",
      template: "{{FOR xs AS i}}${{i}}{{END_FOR}}",
      entries: [["xs", items(1)]] as Entries,
      limits: { maxIterations: 0 },
      line: 1,
      column: 1,
    },
  ];
  it.each(over)("lm-iterations: $name", (c) => {
    const r = run(c.template, c.entries, c.limits);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-iterations");
    if (c.line > 0) {
      expect({ line: r.line, column: r.column }).toEqual({ line: c.line, column: c.column });
    } else {
      expect(typeof r.line).toBe("number");
      expect((r.line as number) >= 2).toBe(true);
    }
  });

  const within = [
    { name: "a loop of exactly the limit renders", t: "{{FOR xs AS i}}${{i}}{{END_FOR}}", e: [["xs", items(5, "z")]] as Entries, l: { maxIterations: 5 }, tight: { maxIterations: 4 }, out: "zzzzz" },
    { name: "nested loops within the limit render", t: "{{FOR xs AS i}}{{FOR ys AS j}}${{j}}{{END_FOR}}{{END_FOR}}", e: [["xs", items(2)], ["ys", items(2, "k")]] as Entries, l: { maxIterations: 100 }, tight: { maxIterations: 3 }, out: "kkkk" },
  ];
  it.each(within)("lm-iterations: $name", (c) => {
    const r = run(c.t, c.e, c.l);
    expect(r.threw).toBe(false);
    expect(r.output).toBe(c.out);
    const tight = run(c.t, c.e, c.tight);
    expect(tight.code).toBe("limit-iterations");
  });
});

describe("lm-output: output length is bounded", () => {
  it("lm-output: output of 11 chars with limit 10 throws limit-output", () => {
    const r = run("${{t}}", [["t", "12345678901"]], { maxOutputChars: 10 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-output: output of exactly the limit renders unchanged", () => {
    const r = run("${{t}}", [["t", "1234567890"]], { maxOutputChars: 10 });
    expect(r.threw).toBe(false);
    expect(r.output).toBe("1234567890");
    expect(run("${{t}}", [["t", "1234567890"]], { maxOutputChars: 9 }).code).toBe("limit-output");
  });

  it("lm-output: output grown by a loop past the limit throws limit-output", () => {
    const r = run("a\n{{FOR xs AS i}}${{i}}ab{{END_FOR}}", [["xs", items(20)]], { maxOutputChars: 10 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
    expect(typeof r.line).toBe("number");
    expect((r.line as number) >= 1).toBe(true);
  });

  it("lm-output: static text longer than the limit throws limit-output", () => {
    const r = run("0123456789\nabc", [], { maxOutputChars: 10 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-output: a lower limit than the default is honoured while a higher one allows long output", () => {
    const long = "y".repeat(2000);
    expect(run("${{t}}", [["t", long]], { maxOutputChars: 1000 }).code).toBe("limit-output");
    const ok = run("${{t}}", [["t", long]], { maxOutputChars: 5000 });
    expect(ok.threw).toBe(false);
    expect(ok.output).toBe(long);
  });
});

describe("lm-depth: block nesting is bounded and the throw is located at the offending block", () => {
  it("lm-depth: nesting within maxDepth renders", () => {
    const r = run(nestIf(3), T, { maxDepth: 3 });
    expect(r.threw).toBe(false);
    expect(r.output.endsWith("x")).toBe(true);
    expect(run(nestIf(3), T, { maxDepth: 2 }).code).toBe("limit-depth");
  });

  it("lm-depth: one level past maxDepth throws limit-depth at the block that is too deep", () => {
    // blocks open on lines 1..4; the 4th (line 4, column 1) is the first beyond depth 3
    const r = run(nestIf(4), T, { maxDepth: 3 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 4, column: 1 });
  });

  it("lm-depth: mixed IF and FOR nesting counts every block kind", () => {
    const t = "a\n{{IF t}}\n {{FOR xs AS i}}\n   {{IF t}}x{{END_IF}}\n {{END_FOR}}\n{{END_IF}}";
    const r = run(t, [...T, ["xs", ["a"]]], { maxDepth: 2 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 4, column: 4 });
  });

  it("lm-depth: a LIST nested in an IF exceeds maxDepth 1 and is located at the LIST", () => {
    const t = "a\n  {{IF t}}\n    {{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}{{END_IF}}";
    const r = run(t, T, { maxDepth: 1 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 3, column: 5 });
  });

  it("lm-depth: a TABLE nested in an IF exceeds maxDepth 1 and is located at the TABLE", () => {
    const t = "a\n  {{IF t}}\n  b {{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}{{END_IF}}";
    const r = run(t, T, { maxDepth: 1 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 3, column: 5 });
  });

  it("lm-depth: a single top-level LIST or TABLE is within maxDepth 1", () => {
    const list = run("{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}", [], { maxDepth: 1 });
    expect(list.threw).toBe(false);
    const table = run("{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", [], { maxDepth: 1 });
    expect(table.threw).toBe(false);
    expect(run("{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}", [], { maxDepth: 0 }).code).toBe("limit-depth");
  });

  it("lm-depth: a very deep template is rejected by the default depth, not by a stack overflow", () => {
    const r = run(nestIf(200), T);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
  });
});

describe("lm-defaults: defaults, partial limits and unchanged rendering", () => {
  it("lm-defaults: DEFAULT_LIMITS is 10000 iterations, 1000000 output chars, depth 32", () => {
    expect(DEFAULT_LIMITS).toEqual({ maxIterations: 10000, maxOutputChars: 1000000, maxDepth: 32, maxNodes: 20000 });
  });

  it("lm-defaults: with no limits option, 10000 iterations render and 10001 throw limit-iterations", () => {
    const t = "{{FOR xs AS i}}{{END_FOR}}";
    expect(run(t, [["xs", items(10000)]]).threw).toBe(false);
    const r = run(t, [["xs", items(10001)]]);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-iterations");
  });

  it("lm-defaults: with no limits option, depth 32 renders and depth 33 throws limit-depth", () => {
    expect(run(nestIf(32), T).threw).toBe(false);
    const r = run(nestIf(33), T);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
  });

  it("lm-defaults: with no limits option, output of 1000000 chars renders and 1000001 throws limit-output", () => {
    expect(run("${{t}}", [["t", "a".repeat(1000000)]]).threw).toBe(false);
    const r = run("${{t}}", [["t", "a".repeat(1000001)]]);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-defaults: a partial limits option keeps the other defaults (maxOutputChars set, iterations default stays)", () => {
    const r = run("{{FOR xs AS i}}{{END_FOR}}", [["xs", items(10001)]], { maxOutputChars: 5000000 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-iterations");
  });

  it("lm-defaults: a partial limits option keeps the other defaults (maxIterations set, depth default stays)", () => {
    expect(run(nestIf(32), T, { maxIterations: 5 }).threw).toBe(false);
    const r = run(nestIf(33), T, { maxIterations: 5 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
  });

  it("lm-defaults: a partial limits option keeps the other defaults (maxDepth set, output default stays)", () => {
    const r = run("${{t}}", [["t", "a".repeat(1000001)]], { maxDepth: 5 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-defaults: a template under every limit renders exactly as before, with and without limits", () => {
    const t = "Hi ${{name}}\n{{FOR xs AS i}}- ${{i}}\n{{END_FOR}}{{IF name}}ok{{END_IF}}";
    const e: Entries = [["name", "Ann"], ["xs", ["a", "b"]]];
    const expected = "Hi Ann\n- a\n- b\nok";
    expect(run(t, e).output).toBe(expected);
    expect(run(t, e, { maxIterations: 10, maxOutputChars: 100, maxDepth: 4 }).output).toBe(expected);
    expect(run(t, e, {}).output).toBe(expected);
    expect(run(t, e, { maxOutputChars: 5 }).code).toBe("limit-output");
  });
});
