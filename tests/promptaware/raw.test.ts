/* eslint-disable @typescript-eslint/no-explicit-any */
import { analyze, render, resolveTemplate, spec, validate } from "../../core/src";

type Data = Record<string, unknown>;

/** render with the standaloneLines option off, so line removal never interferes */
function renderOff(template: string, data: Data) {
  return render(template, data, { standaloneLines: false } as any);
}

/** a thrown template error comes back as its message, so a mismatch fails by assertion */
function resolve(template: string, data: Data): string {
  try {
    return resolveTemplate(template, new Map(Object.entries(data)) as any);
  } catch (e) {
    return `THROWN: ${(e as Error).message}`;
  }
}

type Raw = { name: string; template: string; data: Data; out: string };

// Ported from the earlier RAW block tests: same intent, now through render and resolveTemplate.
const RAW: Raw[] = [
  {
    name: "content is literal: tags, variables, comments and single braces",
    template: "{{RAW}}{{IF x}} ${{name}} {{# c #}} { }{{END_RAW}}",
    data: {},
    out: "{{IF x}} ${{name}} {{# c #}} { }",
  },
  {
    name: "an empty RAW outputs nothing",
    template: "a{{RAW}}{{END_RAW}}b",
    data: {},
    out: "ab",
  },
  {
    name: "text and variables around RAW still render",
    template: "a{{RAW}}${{n}}{{END_RAW}}b ${{n}}",
    data: { n: "X" },
    out: "a${{n}}b X",
  },
  {
    name: "in a FOR body the raw text appears once per iteration",
    template: "{{FOR a AS x}}[{{RAW}}${{x}}{{END_RAW}}${{x}}]{{END_FOR}}",
    data: { a: [1, 2] },
    out: "[${{x}}1][${{x}}2]",
  },
  {
    name: "in an untaken IF branch it does not appear",
    template: "{{IF f}}{{RAW}}{{IF}}{{END_RAW}}{{END_IF}}z",
    data: { f: false },
    out: "z",
  },
  {
    name: "in a taken IF branch it appears",
    template: "{{IF f}}{{RAW}}{{IF}}{{END_RAW}}{{END_IF}}z",
    data: { f: true },
    out: "{{IF}}z",
  },
  {
    name: "leading and trailing spaces are kept and CRLF becomes LF",
    template: "{{RAW}}  a\r\n b  {{END_RAW}}",
    data: {},
    out: "  a\n b  ",
  },
  {
    name: "blank lines and spaces are kept inside an IF",
    template: "{{IF t}}{{RAW}}\n\n  a\n\n\n  b  \n{{END_RAW}}{{END_IF}}|",
    data: { t: true },
    out: "\n\n  a\n\n\n  b  \n|",
  },
  {
    name: "spaces inside the braces of RAW and END_RAW are allowed",
    template: "{{ RAW }}${{name}}{{ END_RAW }}",
    data: {},
    out: "${{name}}",
  },
  {
    name: "a tab inside the closing braces is allowed",
    template: "{{RAW}}${{a}}{{\tEND_RAW }} ${{b}}",
    data: { b: "B" },
    out: "${{a}} B",
  },
  {
    name: "closing tags and unknown tags inside RAW are content",
    template: "{{RAW}}{{END_IF}}{{BOGUS}}{{END_FOR}}{{END_RAW}}",
    data: {},
    out: "{{END_IF}}{{BOGUS}}{{END_FOR}}",
  },
  {
    name: "a backslash before braces inside RAW is content, not an escape",
    template: "{{RAW}}\\{{x}}{{END_RAW}}",
    data: {},
    out: "\\{{x}}",
  },
  {
    name: "two RAW blocks in one template",
    template: "{{RAW}}${{a}}{{END_RAW}}-{{RAW}}${{b}}{{END_RAW}}",
    data: { a: 1, b: 2 },
    out: "${{a}}-${{b}}",
  },
  {
    name: "a template without RAW renders unchanged",
    template: "a ${{n}} b \\{{",
    data: { n: "X" },
    out: "a X b {{",
  },
];

describe("rw-raw: RAW blocks output their content literally", () => {
  it.each(RAW)("rw-raw: $name (render)", ({ template, data, out }) => {
    const r = renderOff(template, data);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(RAW)("rw-raw: $name (resolveTemplate)", ({ template, data, out }) => {
    expect(resolve(template, data)).toBe(out);
  });

  it("rw-raw: with standalone lines on, RAW and END_RAW lines vanish and the content lines stay", () => {
    const r = render("x\n{{RAW}}\n{{ y }}\n{{END_RAW}}\nz", {});
    expect(r.output).toBe("x\n{{ y }}\nz");
    expect(r.ok).toBe(true);
  });

  it("rw-raw: with standalone lines off, the RAW tag lines keep their line breaks", () => {
    // paired with the on-side check so the test is red until the option exists
    expect(render("x\n{{RAW}}\n{{ y }}\n{{END_RAW}}\nz", {}).output).toBe("x\n{{ y }}\nz");
    expect(renderOff("x\n{{RAW}}\n{{ y }}\n{{END_RAW}}\nz", {}).output).toBe(
      "x\n\n{{ y }}\n\nz"
    );
  });
});

type Unclosed = { name: string; template: string; line: number; column: number };

const UNCLOSED: Unclosed[] = [
  { name: "after one character of text", template: "a{{RAW}}b", line: 1, column: 2 },
  { name: "at the start of the template", template: "{{RAW}}x", line: 1, column: 1 },
  {
    name: "after a closed multi-line RAW block",
    template: "{{RAW}}\nx\r\ny\n{{END_RAW}}\n{{RAW}}z",
    line: 5,
    column: 1,
  },
  { name: "inside a FOR body", template: "{{FOR a AS x}}{{RAW}}", line: 1, column: 15 },
];

describe("rw-raw: an unclosed RAW is a located syntax error", () => {
  it.each(UNCLOSED)("rw-raw: unclosed RAW $name (render)", ({ template, line, column }) => {
    const r = renderOff(template, { a: [1] });
    expect(r.diagnostics[0]).toMatchObject({ code: "syntax-error", line, column });
    expect(r.diagnostics[0].message).toMatch(/Unclosed RAW/);
    expect(r.ok).toBe(false);
  });

  it.each(UNCLOSED)(
    "rw-raw: unclosed RAW $name (resolveTemplate throws a located error)",
    ({ template, line, column }) => {
      let caught: any;
      try {
        resolveTemplate(template, new Map([["a", [1]]]) as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      expect(caught.message).toMatch(/Unclosed RAW/);
      expect(caught).toMatchObject({ code: "syntax-error", line, column });
    }
  );

  it("rw-raw: a tag after a RAW block reports its own position", () => {
    const r = renderOff("{{RAW}}\n\n{{END_RAW}}{{BOGUS}}", {});
    expect(r.diagnostics[0]).toMatchObject({ code: "syntax-error", line: 3, column: 12 });
    expect(r.diagnostics[0].message).toMatch(/Unknown/);
    expect(r.ok).toBe(false);
  });

  it("rw-raw: validate reports an unclosed RAW as an error", () => {
    const v = validate("a{{RAW}}b");
    expect(v.diagnostics[0]?.message).toMatch(/Unclosed RAW/);
    expect(v.diagnostics[0]).toMatchObject({ code: "syntax-error", line: 1, column: 2 });
    expect(v.ok).toBe(false);
  });
});

describe("rw-raw: analyze ignores everything inside a RAW block", () => {
  const names = (t: string) => {
    try {
      return analyze(t).variables.map((v) => v.name);
    } catch (e) {
      return [`THROWN: ${(e as Error).message}`];
    }
  };

  it.each([
    ["names inside a RAW block are not variables", "{{RAW}}${{name}} {{IF zz}}{{END_RAW}}", []],
    ["only the variable outside the block is found", "{{RAW}}${{a}}{{END_RAW}} ${{b}}", ["b"]],
    ["a RAW block with spaces inside the braces", "{{ RAW }}${{name}}{{ END_RAW }}", []],
    ["a RAW block closed with a tab inside the braces", "{{RAW}}${{a}}{{\tEND_RAW }} ${{b}}", ["b"]],
  ])("rw-raw: %s", (_n, template, expected) => {
    expect(names(template as string)).toEqual(expected);
  });

  it("rw-raw: validate accepts a closed RAW block holding tag-like text", () => {
    const v = validate("{{RAW}}{{IF}}{{BOGUS}}${{x{{END_RAW}}");
    expect(v.diagnostics).toEqual([]);
    expect(v.ok).toBe(true);
  });
});

type Escape = { name: string; template: string; data: Data; out: string };

// JS strings: "\\{{" is a backslash followed by the opening brace pair.
const ESCAPE: Escape[] = [
  {
    name: "a backslash before the pair outputs the pair and consumes the backslash",
    template: "a\\{{b}}",
    data: {},
    out: "a{{b}}",
  },
  {
    name: "an escaped pair at the end of the template",
    template: "a\\{{",
    data: {},
    out: "a{{",
  },
  {
    name: "an escaped tag name stays literal text",
    template: "\\{{IF x}}hi\\{{END_IF}}",
    data: { x: true },
    out: "{{IF x}}hi{{END_IF}}",
  },
  {
    name: "an escaped comment opener stays literal text",
    template: "\\{{# c #}}",
    data: {},
    out: "{{# c #}}",
  },
  {
    name: "an escaped RAW opener does not start a RAW block",
    template: "\\{{RAW}}",
    data: {},
    out: "{{RAW}}",
  },
  {
    name: "an escaped pair inside a FOR body, then a variable",
    template: "{{FOR xs AS x}}\\{{${{x}}}}{{END_FOR}}",
    data: { xs: ["a", "b"] },
    out: "{{a}}{{b}}",
  },
  {
    name: "an escaped pair in an untaken IF branch outputs nothing",
    template: "{{IF f}}\\{{x}}{{END_IF}}z",
    data: { f: false },
    out: "z",
  },
  {
    name: "a backslash before a dollar sign is text and the variable stays active",
    template: "\\${{x}} \\{{",
    data: { x: "V" },
    out: "\\V {{",
  },
  {
    name: "a backslash before ordinary characters is text",
    template: "C:\\dir\\new a\\b \\{{",
    data: {},
    out: "C:\\dir\\new a\\b {{",
  },
  {
    name: "a backslash before a single brace is text",
    template: "\\{x} and \\{ \\{{",
    data: {},
    out: "\\{x} and \\{ {{",
  },
  {
    name: "a trailing backslash is text",
    template: "\\{{ a\\",
    data: {},
    out: "{{ a\\",
  },
  {
    name: "a backslash then a space then the pair is text and an active tag",
    template: "\\{{ \\ {{IF x}}y{{END_IF}}",
    data: { x: true },
    out: "{{ \\ y",
  },
  {
    name: "two backslashes before the pair give a literal backslash and an active tag",
    template: "\\\\{{IF x}}y{{END_IF}}",
    data: { x: true },
    out: "\\y",
  },
  {
    name: "two backslashes before an active variable",
    template: "\\\\${{x}}|\\\\{{IF x}}y{{END_IF}}",
    data: { x: "V" },
    out: "\\\\V|\\y",
  },
];

describe("rw-escape: a backslash directly before the brace pair escapes it", () => {
  it.each(ESCAPE)("rw-escape: $name (render)", ({ template, data, out }) => {
    const r = renderOff(template, data);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(ESCAPE)("rw-escape: $name (resolveTemplate)", ({ template, data, out }) => {
    expect(resolve(template, data)).toBe(out);
  });

  it("rw-escape: with standalone lines on, an escaped tag line is text and stays", () => {
    const r = render("\\{{IF x}}\nhi\n", { x: true });
    expect(r.output).toBe("{{IF x}}\nhi\n");
    expect(r.ok).toBe(true);
  });

  it("rw-escape: with standalone lines on, an escaped pair does not hide a real tag line", () => {
    const r = render("\\{{a}}\n{{IF x}}\nhi\n{{END_IF}}\n", { x: true });
    expect(r.output).toBe("{{a}}\nhi\n");
    expect(r.ok).toBe(true);
  });

  it("rw-escape: analyze finds no variables and no error in escaped text", () => {
    let a: ReturnType<typeof analyze> | undefined;
    let thrown = "";
    try {
      a = analyze("\\{{IF zz}}x \\${{y}}");
    } catch (e) {
      thrown = (e as Error).message;
    }
    expect(thrown).toBe("");
    expect(a?.variables.map((v) => v.name)).toEqual(["y"]);
    expect(a?.diagnostics).toEqual([]);
  });

  it("rw-escape: validate accepts escaped tag names that would otherwise be unclosed or unknown", () => {
    const v = validate("\\{{IF x}} \\{{BOGUS}}");
    expect(v.diagnostics).toEqual([]);
    expect(v.ok).toBe(true);
  });
});

describe("rw-spec: spec lists RAW and the standaloneLines option", () => {
  it("rw-spec: the spec mentions RAW and its closer", () => {
    const text = JSON.stringify(spec());
    expect(text).toContain("RAW");
    expect(text).toContain("END_RAW");
  });

  it("rw-spec: the spec mentions the standaloneLines option", () => {
    expect(JSON.stringify(spec())).toContain("standaloneLines");
  });
});
