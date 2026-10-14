/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  render,
  validate,
  analyze,
  resolveTemplate,
  VariableMap,
} from "../../core/src";

type Case = {
  name: string;
  template: string;
  data: Record<string, unknown>;
  options?: Parameters<typeof render>[2];
  code: string;
  line: number;
};

const FAILING: Case[] = [
  {
    name: "syntax error (unclosed IF on line 2)",
    template: "intro\n{{IF a}}x",
    data: { a: true },
    code: "syntax-error",
    line: 2,
  },
  {
    name: "missing variable on line 3 in strict mode",
    template: "a\nb\n${{missing}}",
    data: {},
    code: "missing-variable",
    line: 3,
  },
  {
    name: "unknown filter on line 2",
    template: "a\n${{x | nosuchfilter}}",
    data: { x: "v" },
    code: "unknown-filter",
    line: 2,
  },
  {
    name: "iteration limit",
    template: "{{FOR xs AS x}}${{x}}{{END_FOR}}",
    data: { xs: [1, 2, 3, 4] },
    options: { limits: { maxIterations: 2 } },
    code: "limit-iterations",
    line: 1,
  },
  {
    name: "output size limit",
    template: "${{x}}",
    data: { x: "0123456789" },
    options: { limits: { maxOutputChars: 5 } },
    code: "limit-output",
    line: 1,
  },
  {
    name: "depth limit",
    template: "{{IF a}}{{IF a}}x{{END_IF}}{{END_IF}}",
    data: { a: true },
    options: { limits: { maxDepth: 1 } },
    code: "limit-depth",
    line: 1,
  },
];

describe("rr-result: render result shape", () => {
  it("rr-result: a passing render returns ok, output, empty messages and full stats", () => {
    const r = render("# ${{title}}\n{{FOR xs AS x}}-${{x}}{{END_FOR}}", {
      title: "Hi",
      xs: ["a", "b", "c"],
    });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("# Hi\n-a-b-c");
    expect(r.messages).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    expect(r.stats).toEqual({
      chars: r.output.length,
      estTokens: Math.ceil(r.output.length / 4),
      sectionsOmitted: 0,
      iterations: 3,
    });
  });

  it("rr-result: iterations counts FOR iterations across the whole render", () => {
    const r = render("{{FOR a AS i}}{{FOR b AS j}}x{{END_FOR}}{{END_FOR}}", {
      a: [1, 2],
      b: [1, 2, 3],
    });
    expect(r.ok).toBe(true);
    expect(r.stats.iterations).toBe(2 + 2 * 3);
  });

  it.each(FAILING)(
    "rr-result: $name does not throw and returns ok false with the located error first",
    ({ template, data, options, code, line }) => {
      let r: ReturnType<typeof render> | undefined;
      expect(() => {
        r = render(template, data, options);
      }).not.toThrow();
      expect(r!.ok).toBe(false);
      expect(r!.output).toBe("");
      expect(r!.diagnostics.length).toBeGreaterThan(0);
      const d = r!.diagnostics[0];
      expect(d.severity).toBe("error");
      expect(d.code).toBe(code);
      expect(d.line).toBe(line);
      expect(d.column).toBeGreaterThanOrEqual(1);
      expect(typeof d.message).toBe("string");
      expect(d.message.length).toBeGreaterThan(0);
    }
  );

  it("rr-result: lenient mode turns a missing variable into an ok render", () => {
    const r = render("a${{missing}}b", {}, { strictMode: false });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("ab");
  });
});

describe("rr-validate: validate without data", () => {
  it("rr-validate: a valid template is ok with no diagnostics", () => {
    const v = validate("${{a}} {{IF b}}x{{END_IF}}");
    expect(v.ok).toBe(true);
    expect(v.diagnostics).toEqual([]);
  });

  it.each([
    ["syntax error", "x\n{{IF a}}y", "syntax-error", 2],
    ["unknown filter", "x\n${{a | nosuchfilter}}", "unknown-filter", 2],
  ] as [string, string, string, number][])(
    "rr-validate: %s yields ok false and a located diagnostic",
    (_n, template, code, line) => {
      const v = validate(template);
      expect(v.ok).toBe(false);
      expect(v.diagnostics.length).toBeGreaterThan(0);
      expect(v.diagnostics[0].code).toBe(code);
      expect(v.diagnostics[0].line).toBe(line);
      expect(v.diagnostics[0].column).toBeGreaterThanOrEqual(1);
    }
  );

  it("rr-validate: a missing variable is not an error because no data is supplied", () => {
    expect(validate("${{never_supplied}}").ok).toBe(true);
  });
});

describe("rr-analyze: required and block counts", () => {
  it("rr-analyze: required is the opposite of optional on every variable", () => {
    const a = analyze("${{a}} ${{b ?? 'x'}}") as any;
    expect(a.variables.length).toBe(2);
    for (const v of a.variables) {
      expect(typeof v.required).toBe("boolean");
      expect(v.required).toBe(!v.optional);
    }
    expect(a.variables.find((v: any) => v.name === "a").required).toBe(true);
    expect(a.variables.find((v: any) => v.name === "b").required).toBe(false);
  });

  it.each([
    ["no blocks", "plain ${{a}}", {}],
    [
      "two IF and one FOR",
      "{{IF a}}x{{END_IF}}{{IF b}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_IF}}",
      { IF: 2, FOR: 1 },
    ],
    [
      "one CASE",
      '{{CASE s}}{{WHEN "a"}}x{{END_WHEN}}{{END_CASE}}',
      { CASE: 1 },
    ],
  ] as [string, string, Record<string, number>][])(
    "rr-analyze: blocks counts per block kind for %s",
    (_n, template, expected) => {
      const a = analyze(template) as any;
      expect(a.blocks).toEqual(expected);
    }
  );
});

describe("rr-estimator: token estimate", () => {
  it.each([
    ["", 0],
    ["abcd", 1],
    ["abcde", 2],
    ["x".repeat(401), 101],
  ] as [string, number][])(
    "rr-estimator: default estTokens is ceil(chars/4) for %j",
    (text, tokens) => {
      const r = render("${{t}}", { t: text });
      expect(r.ok).toBe(true);
      expect(r.stats.chars).toBe(text.length);
      expect(r.stats.estTokens).toBe(tokens);
    }
  );

  it("rr-estimator: a tokenEstimator option replaces the default and receives the output", () => {
    const seen: string[] = [];
    const r = render(
      "hello ${{n}}",
      { n: "world" },
      {
        tokenEstimator: (t) => {
          seen.push(t);
          return 42;
        },
      }
    );
    expect(r.ok).toBe(true);
    expect(r.stats.estTokens).toBe(42);
    expect(seen).toContain("hello world");
  });
});

describe("rr-compat: resolveTemplate and limits", () => {
  it("rr-compat: resolveTemplate still returns a string for a passing template", () => {
    const vars: VariableMap = new Map([["a", "v"]]);
    expect(resolveTemplate("x ${{a}}", vars)).toBe("x v");
  });

  it("rr-compat: resolveTemplate still throws for a missing variable", () => {
    expect(() => resolveTemplate("${{nope}}", new Map())).toThrow(/not found/);
    let name = "";
    try {
      resolveTemplate("${{nope}}", new Map());
    } catch (e) {
      name = (e as Error).name;
    }
    expect(name).toBe("MissingVariableError");
  });

  it("rr-compat: render and resolveTemplate agree on the output of a passing template", () => {
    const t = "{{IF a}}yes{{END_IF}} ${{b | trim}}";
    const viaRender = render(t, { a: true, b: "  z " });
    const viaResolve = resolveTemplate(
      t,
      new Map<string, any>([
        ["a", true],
        ["b", "  z "],
      ])
    );
    expect(viaRender.ok).toBe(true);
    expect(viaRender.output).toBe(viaResolve);
  });

  it("rr-compat: limits at the boundary still render ok", () => {
    const r = render(
      "{{FOR xs AS x}}${{x}}{{END_FOR}}",
      { xs: [1, 2] },
      { limits: { maxIterations: 2 } }
    );
    expect(r.ok).toBe(true);
    expect(r.output).toBe("12");
  });

  it("rr-compat: default limits stop a render past 10000 iterations", () => {
    const r = render("{{FOR xs AS x}}{{END_FOR}}", {
      xs: new Array(10001).fill(1),
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("limit-iterations");
  });

  it.each(FAILING.filter((c) => c.code.startsWith("limit-")))(
    "rr-compat: limit options bound the render and report $code",
    ({ template, data, options, code }) => {
      const r = render(template, data, options);
      expect(r.ok).toBe(false);
      expect(r.diagnostics[0]?.code).toBe(code);
    }
  );
});
