import { resolveTemplate } from "../../core/src";
import { TemplateValue } from "../../core/src/types";

type Entries = [string, TemplateValue][];
interface Caught {
  threw: boolean;
  code: unknown;
  line: unknown;
  column: unknown;
  isTemplateError: boolean;
}

// Render in strict mode and capture the located diagnostic fields of the throw.
function caught(template: string, entries: Entries = []): Caught {
  try {
    resolveTemplate(template, new Map(entries), { strictMode: true });
  } catch (e) {
    const x = e as any;
    return {
      threw: true,
      code: x.code,
      line: x.line,
      column: x.column,
      isTemplateError: typeof x?.line === "number" && typeof x?.column === "number",
    };
  }
  return { threw: false, code: undefined, line: undefined, column: undefined, isTemplateError: false };
}

interface Case {
  name: string;
  template: string;
  entries?: Entries;
  code?: string;
  line: number;
  column: number;
}

function runCases(id: string, cases: Case[]) {
  it.each(cases)(`${id}: $name`, (c) => {
    const r = caught(c.template, c.entries);
    expect(r.threw).toBe(true);
    expect(r.isTemplateError).toBe(
      true,
    );
    if (c.code !== undefined) {
      expect(r.code).toBe(c.code);
    }
    expect({ line: r.line, column: r.column }).toEqual({ line: c.line, column: c.column });
  });
}

describe("dg-syntax: syntax, missing-variable and unknown-filter errors are coded and located", () => {
  const syntax: Case[] = [
    {
      name: "unknown tag is a syntax-error at the tag, not at 1:1",
      template: "intro\n  {{BOGUS}}x",
      code: "syntax-error",
      line: 2,
      column: 3,
    },
    {
      name: "unclosed IF is a syntax-error at the opening tag",
      template: "a\n\n  {{IF t}}x",
      entries: [["t", "x"]],
      code: "syntax-error",
      line: 3,
      column: 3,
    },
    {
      name: "unmatched END_IF inside a FOR is a syntax-error at the stray tag",
      template: "a\n  {{FOR xs AS i}}\n   {{END_IF}}",
      entries: [["xs", ["a"]]],
      code: "syntax-error",
      line: 3,
      column: 4,
    },
    {
      name: "unclosed variable substitution is a syntax-error at its start",
      template: "a\nb\n   ${{t",
      entries: [["t", "x"]],
      code: "syntax-error",
      line: 3,
      column: 4,
    },
  ];
  runCases("dg-syntax", syntax);

  const missing: Case[] = [
    {
      name: "missing variable on line 2 is missing-variable at the variable",
      template: "first line\nb ${{missing}}",
      code: "missing-variable",
      line: 2,
      column: 3,
    },
    {
      name: "missing variable after text on a later line is located at its column",
      template: "a\nb\n   x ${{ghost}} y",
      code: "missing-variable",
      line: 3,
      column: 6,
    },
    {
      name: "missing variable inside a FOR body is located at the variable",
      template: "a\n{{FOR xs AS i}}\n  ${{i}} ${{nope}}\n{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "missing-variable",
      line: 3,
      column: 8,
    },
    {
      name: "missing variable inside an IF body is located at the variable",
      template: "a\n{{IF t}}\n\n   ${{nope}}{{END_IF}}",
      entries: [["t", "x"]],
      code: "missing-variable",
      line: 4,
      column: 4,
    },
  ];
  runCases("dg-syntax", missing);

  const unknownFilter: Case[] = [
    {
      name: "unknown filter is unknown-filter at the variable",
      template: "a\n\n  ${{t | nofilter}}",
      entries: [["t", "x"]],
      code: "unknown-filter",
      line: 3,
      column: 3,
    },
    {
      name: "unknown filter inside a FOR is unknown-filter at the variable",
      template: "a\n{{FOR xs AS i}}\n x${{i | bogus=1}}\n{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "unknown-filter",
      line: 3,
      column: 3,
    },
  ];
  runCases("dg-syntax", unknownFilter);
});

describe("dg-runtime: math, filter-parameter and type errors are located at the evaluating node", () => {
  const filterParams: Case[] = [
    {
      name: "head without a parameter is a type-error at the variable",
      template: "a\n  ${{t | head}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "head with a non-numeric parameter is a type-error at the variable",
      template: "a\nb\n  ${{t | head=abc}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 3,
      column: 3,
    },
    {
      name: "tail without a parameter is a type-error at the variable",
      template: "a\n\n\n    ${{t | tail}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 4,
      column: 5,
    },
    {
      name: "filter parameter error inside a FOR is located at the variable in the loop body",
      template: "a\n  {{FOR xs AS i}}\n   ${{i | head}}{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "type-error",
      line: 3,
      column: 4,
    },
    {
      name: "filter parameter error inside a nested IF is located at the variable",
      template: "a\n{{IF t}}\n{{IF t}}\nxx ${{t | head}}{{END_IF}}{{END_IF}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 4,
      column: 4,
    },
  ];
  runCases("dg-runtime", filterParams);

  const typeErrors: Case[] = [
    {
      name: "numeric comparison on a non-numeric value is a type-error at the IF tag",
      template: "a\n  {{IF t > 3}}x{{END_IF}}",
      entries: [["t", "x"]],
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "type-error in an IF inside a FOR is located at the IF tag",
      template: "a\nb\n{{FOR xs AS i}}\n  {{IF i > 3}}x{{END_IF}}\n{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "type-error",
      line: 4,
      column: 3,
    },
  ];
  runCases("dg-runtime", typeErrors);

  // Math failures currently surface through the variable path. The card fixes
  // their location; the code is one of the two diagnostics such a node may map to.
  const math: Case[] = [
    {
      name: "math with an unmatched parenthesis is located at the math node",
      template: "a\nb\n  ${{a * (b + 1}}",
      entries: [["a", "1"], ["b", "2"]],
      line: 3,
      column: 3,
    },
    {
      name: "math error inside a FOR body is located at the math node",
      template: "a\n{{FOR xs AS i}}\n  ${{i + (1}}\n{{END_FOR}}",
      entries: [["xs", ["1"]]],
      line: 3,
      column: 3,
    },
  ];
  it.each(math)("dg-runtime: $name", (c) => {
    const r = caught(c.template, c.entries);
    expect(r.threw).toBe(true);
    expect({ line: r.line, column: r.column }).toEqual({ line: c.line, column: c.column });
    expect(["type-error", "missing-variable"]).toContain(r.code);
  });

  it("dg-runtime: no runtime failure is reported at the placeholder 1:1 when the node is elsewhere", () => {
    const templates: [string, Entries][] = [
      ["x\n ${{t | head}}", [["t", "a"]]],
      ["x\n {{IF t > 1}}y{{END_IF}}", [["t", "a"]]],
      ["x\n ${{a * (b}}", [["a", "1"], ["b", "2"]]],
    ];
    for (const [t, e] of templates) {
      const r = caught(t, e);
      expect(r.threw).toBe(true);
      expect({ line: r.line, column: r.column }).toEqual({ line: 2, column: 2 });
    }
  });
});
