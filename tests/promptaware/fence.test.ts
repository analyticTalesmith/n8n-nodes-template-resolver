import { render, spec, analyze, validate } from "../../core/src";

// The whitespace card (standalone-line removal) is not in this branch. Every
// expected output below assumes {standaloneLines:false}: tag lines are NOT
// removed, so the text around a tag stays exactly as written. Only the cases
// marked "standalone on" assume the contract default (tag-only lines vanish
// with their line break). `as any` because the option does not exist on
// RenderOptions in this branch.
const OFF = { standaloneLines: false } as any;
const ON = { standaloneLines: true } as any;
const T = "`";
const run = (n: number) => T.repeat(n);

function r(template: string, data: Record<string, unknown> = {}, options: any = OFF) {
  return render(template, data, options);
}

interface Case {
  name: string;
  template: string;
  data?: Record<string, unknown>;
  expected: string;
  options?: any;
}

function runCases(id: string, cases: Case[]) {
  it.each(cases)(`${id}: $name`, (c) => {
    const res = r(c.template, c.data ?? {}, c.options ?? OFF);
    expect(res.output).toBe(c.expected);
    expect(res.ok).toBe(true);
    expect(res.diagnostics).toEqual([]);
  });
}

// analyze throws on a template that does not parse today; turn the throw into undefined so the
// failure is an assertion on the result.
function tryAnalyze(t: string) {
  try {
    return analyze(t);
  } catch {
    return undefined;
  }
}

const FB ="{{FENCE}}${{b}}{{END_FENCE}}";

describe("fe-autosize: FENCE sizes its fence from the longest backtick run in its body", () => {
  runCases("fe-autosize", [
    { name: "no backticks gets three", template: FB, data: { b: "hello" }, expected: "```\nhello\n```\n" },
    { name: "a run of 1 gets three", template: FB, data: { b: "a`b" }, expected: "```\na`b\n```\n" },
    { name: "a run of 2 gets three", template: FB, data: { b: "a``b" }, expected: "```\na``b\n```\n" },
    {
      name: "a run of 3 gets four",
      template: FB,
      data: { b: "a```b" },
      expected: `${run(4)}\na${run(3)}b\n${run(4)}\n`,
    },
    {
      name: "a run of 4 gets five",
      template: FB,
      data: { b: `x ${run(4)}y` },
      expected: `${run(5)}\nx ${run(4)}y\n${run(5)}\n`,
    },
    {
      name: "a run of 7 gets eight",
      template: FB,
      data: { b: `a${run(7)}b` },
      expected: `${run(8)}\na${run(7)}b\n${run(8)}\n`,
    },
    {
      name: "the longest of several runs wins (1, 2 and 3 gives four)",
      template: FB,
      data: { b: "`a``b```c" },
      expected: `${run(4)}\n\`a\`\`b\`\`\`c\n${run(4)}\n`,
    },
    {
      name: "the longest run wins even when it comes first",
      template: FB,
      data: { b: `${run(5)} then ${run(2)}` },
      expected: `${run(6)}\n${run(5)} then ${run(2)}\n${run(6)}\n`,
    },
    {
      name: "a body that is only a run of 3 gets four",
      template: FB,
      data: { b: "```" },
      expected: `${run(4)}\n${run(3)}\n${run(4)}\n`,
    },
    {
      name: "tildes do not count, the fence stays backticks",
      template: FB,
      data: { b: "~~~\nx\n~~~" },
      expected: "```\n~~~\nx\n~~~\n```\n",
    },
    { name: "multi-line body", template: FB, data: { b: "a\nb\nc" }, expected: "```\na\nb\nc\n```\n" },
    { name: "leading and trailing spaces are kept", template: FB, data: { b: " x " }, expected: "```\n x \n```\n" },
    { name: "one leading line break is removed", template: FB, data: { b: "\nhello" }, expected: "```\nhello\n```\n" },
    { name: "one trailing line break is removed", template: FB, data: { b: "hello\n" }, expected: "```\nhello\n```\n" },
    {
      name: "one leading and one trailing line break are removed",
      template: FB,
      data: { b: "\nhello\n" },
      expected: "```\nhello\n```\n",
    },
    {
      name: "only ONE line break is removed at each end (two leave a blank line at each end)",
      template: FB,
      data: { b: "\n\nhello\n\n" },
      expected: "```\n\nhello\n\n```\n",
    },
    // Contract: fence, lang, line break, body, line break, fence, line break. Empty body: two line breaks.
    { name: "empty body", template: FB, data: { b: "" }, expected: "```\n\n```\n" },
    {
      name: "template body text between the tags is the body",
      template: "{{FENCE}}\nplain text\n{{END_FENCE}}",
      expected: "```\nplain text\n```\n",
    },
    {
      name: "backticks written literally in the template body are counted",
      template: "{{FENCE}}a````b{{END_FENCE}}",
      expected: `${run(5)}\na${run(4)}b\n${run(5)}\n`,
    },
    {
      name: "the body is rendered first, the fence is sized from the rendered text",
      template: "{{FENCE}}{{IF t}}${{b}}{{ELSE}}none{{END_IF}}{{END_FENCE}}",
      data: { t: true, b: "x```y" },
      expected: `${run(4)}\nx${run(3)}y\n${run(4)}\n`,
    },
    {
      name: "text before and after the block is untouched",
      template: "before\n{{FENCE}}x{{END_FENCE}}after",
      expected: "before\n```\nx\n```\nafter",
    },
    {
      name: "FENCE inside FOR sizes each iteration on its own",
      template: '{{FOR xs AS it}}{{FENCE lang="x"}}${{it}}{{END_FENCE}}{{END_FOR}}',
      data: { xs: ["a", "b```c", "d"] },
      expected: "```x\na\n```\n" + `${run(4)}x\nb${run(3)}c\n${run(4)}\n` + "```x\nd\n```\n",
    },
    {
      name: "FENCE inside IF",
      template: "{{IF t}}{{FENCE}}x{{END_FENCE}}{{END_IF}}",
      data: { t: true },
      expected: "```\nx\n```\n",
    },
    {
      name: "FENCE in a false IF renders nothing",
      template: "{{IF t}}{{FENCE}}x{{END_FENCE}}{{END_IF}}",
      data: { t: false },
      expected: "",
    },
    {
      name: "nested FENCE: the outer fence is longer than the inner one it contains",
      template: '{{FENCE lang="md"}}\n{{FENCE lang="js"}}x{{END_FENCE}}\n{{END_FENCE}}',
      // inner renders "```js\nx\n```\n"; outer body "\n```js\nx\n```\n\n" loses one break at each end
      expected: "````md\n```js\nx\n```\n\n````\n",
    },
    {
      name: "three levels of nesting grow by one each",
      template: "{{FENCE}}{{FENCE}}{{FENCE}}x{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}",
      // L3 = "```\nx\n```\n". L2 body = L3 minus its last break = "```\nx\n```", longest run 3,
      //   so L2 = "````\n```\nx\n```\n````\n". L1 body = L2 minus last break, longest run 4,
      //   so L1 = "`````\n````\n```\nx\n```\n````\n`````\n".
      expected: "`````\n````\n```\nx\n```\n````\n`````\n",
    },
    {
      name: "a large body with 300000 backtick runs is sized without failing",
      template: FB,
      data: { b: "`a".repeat(300000) + run(10) },
      expected: `${run(11)}\n${"`a".repeat(300000)}${run(10)}\n${run(11)}\n`,
    },
    {
      name: "the fence filter sizes a large value with 300000 backtick runs",
      template: "${{ b | fence=md }}",
      data: { b: run(5) + "x``".repeat(300000) },
      expected: `${run(6)}md\n${run(5)}${"x``".repeat(300000)}\n${run(6)}\n`,
    },
  ]);
});

describe("fe-autosize: standalone rule applies to FENCE tag lines", () => {
  runCases("fe-autosize", [
    {
      name: "standalone on: tag lines are removed, the output is the tight form",
      template: 'before\n{{FENCE lang="md"}}\nhello\n{{END_FENCE}}\nafter',
      options: ON,
      expected: "before\n```md\nhello\n```\nafter",
    },
    {
      name: "standalone off: the break after END_FENCE stays, giving a blank line",
      template: "before\n{{FENCE}}\nhello\n{{END_FENCE}}\nafter",
      options: OFF,
      expected: "before\n```\nhello\n```\n\nafter",
    },
    {
      name: "standalone on: indented tag lines inside FOR vanish too",
      template: "{{FOR xs AS i}}\n  {{FENCE}}\n${{i}}\n  {{END_FENCE}}\n{{END_FOR}}",
      data: { xs: ["a", "b"] },
      options: ON,
      expected: "```\na\n```\n```\nb\n```\n",
    },
    {
      name: "standalone on: a FENCE tag sharing its line with text is not removed",
      template: "a {{FENCE}}x{{END_FENCE}} b\n",
      options: ON,
      expected: "a ```\nx\n```\n b\n",
    },
  ]);
});

describe("fe-lang: lang is a quoted string or a variable path; the fence filter takes an optional lang", () => {
  runCases("fe-lang", [
    {
      name: "quoted literal lang",
      template: '{{FENCE lang="markdown"}}x{{END_FENCE}}',
      expected: "```markdown\nx\n```\n",
    },
    {
      name: "variable path lang",
      template: "{{FENCE lang=meta.lang}}x{{END_FENCE}}",
      data: { meta: { lang: "python" } },
      expected: "```python\nx\n```\n",
    },
    {
      name: "empty literal lang writes a bare fence",
      template: '{{FENCE lang=""}}x{{END_FENCE}}',
      expected: "```\nx\n```\n",
    },
    {
      name: "missing lang attribute writes a bare fence",
      template: "{{FENCE}}x{{END_FENCE}}",
      expected: "```\nx\n```\n",
    },
    {
      name: "lang variable that is missing writes a bare fence",
      template: "{{FENCE lang=nope}}x{{END_FENCE}}",
      expected: "```\nx\n```\n",
    },
    {
      name: "lang variable that is an empty string writes a bare fence",
      template: "{{FENCE lang=l}}x{{END_FENCE}}",
      data: { l: "" },
      expected: "```\nx\n```\n",
    },
    {
      name: "lang is written after a longer fence too",
      template: '{{FENCE lang="js"}}${{b}}{{END_FENCE}}',
      data: { b: "```" },
      expected: `${run(4)}js\n${run(3)}\n${run(4)}\n`,
    },
    {
      name: "filter form with a lang parameter",
      template: "${{ b | fence=md }}",
      data: { b: "x" },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form without lang writes a bare fence",
      template: "${{ b | fence }}",
      data: { b: "x" },
      expected: "```\nx\n```\n",
    },
    {
      name: "filter form with a quoted lang parameter",
      template: '${{ b | fence="md" }}',
      data: { b: "x" },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form sizes the fence like the block",
      template: "${{ b | fence=md }}",
      data: { b: `${run(3)}\ncode\n${run(3)}` },
      expected: `${run(4)}md\n${run(3)}\ncode\n${run(3)}\n${run(4)}\n`,
    },
    {
      name: "filter form removes one leading and one trailing line break",
      template: "${{ b | fence=md }}",
      data: { b: "\nx\n" },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form on an empty value",
      template: "${{ b | fence=md }}",
      data: { b: "" },
      expected: "```md\n\n```\n",
    },
    {
      name: "filter form after another filter",
      template: "${{ b | trim | fence=md }}",
      data: { b: "  x  " },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form inside text and FOR",
      template: "a\n{{FOR xs AS i}}${{ i | fence=txt }}{{END_FOR}}z",
      data: { xs: ["p", "q"] },
      expected: "a\n```txt\np\n```\n```txt\nq\n```\nz",
    },
  ]);
});

describe("fe-errors: unclosed FENCE, depth and standalone", () => {
  interface ErrCase {
    name: string;
    template: string;
    data?: Record<string, unknown>;
    options?: any;
    code: string;
    line: number;
    column: number;
  }
  const cases: ErrCase[] = [
    { name: "unclosed FENCE at the start is located at its tag", template: "{{FENCE}}x", code: "syntax-error", line: 1, column: 1 },
    {
      name: "unclosed FENCE later in the template is located at its tag, not 1:1",
      template: 'ab\n  {{FENCE lang="x"}}\nzzz',
      code: "syntax-error",
      line: 2,
      column: 3,
    },
    {
      name: "outer FENCE unclosed around a closed inner one is located at the outer tag",
      template: "{{FENCE}}\n  {{FENCE}}x{{END_FENCE}}",
      code: "syntax-error",
      line: 1,
      column: 1,
    },
    {
      name: "a second FENCE left unclosed after a closed one is located at the second tag",
      template: "{{FENCE}}x{{END_FENCE}}\n  {{FENCE}}y",
      code: "syntax-error",
      line: 2,
      column: 3,
    },
    {
      name: "FENCE nested beyond maxDepth is limit-depth at the block that is too deep",
      template: "{{FENCE}}\n{{FENCE}}\n{{FENCE}}x{{END_FENCE}}\n{{END_FENCE}}\n{{END_FENCE}}",
      options: { standaloneLines: false, limits: { maxDepth: 2 } },
      code: "limit-depth",
      line: 3,
      column: 1,
    },
    {
      name: "FENCE inside IF counts toward maxDepth 1",
      template: "{{IF t}}{{FENCE}}x{{END_FENCE}}{{END_IF}}",
      data: { t: true },
      options: { standaloneLines: false, limits: { maxDepth: 1 } },
      code: "limit-depth",
      line: 1,
      column: 9,
    },
    {
      name: "IF inside FENCE counts toward maxDepth 1",
      template: "{{FENCE}}{{IF t}}x{{END_IF}}{{END_FENCE}}",
      data: { t: true },
      options: { standaloneLines: false, limits: { maxDepth: 1 } },
      code: "limit-depth",
      line: 1,
      column: 10,
    },
    {
      name: "a lang variable holding a line break is a type-error at the FENCE tag",
      template: "x\n  {{FENCE lang=l}}y{{END_FENCE}}",
      data: { l: "md\n# injected" },
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "a lang variable holding a backtick is a type-error at the FENCE tag",
      template: "{{FENCE lang=l}}y{{END_FENCE}}",
      data: { l: "md`" },
      code: "type-error",
      line: 1,
      column: 1,
    },
    {
      name: "a quoted lang holding a backtick is a type-error at the FENCE tag",
      template: 'a\n{{FENCE lang="a`b"}}y{{END_FENCE}}',
      code: "type-error",
      line: 2,
      column: 1,
    },
    {
      name: "a fence filter lang holding a backtick is a type-error at the variable",
      template: "a\n  ${{ b | fence=a`b }}",
      data: { b: "x" },
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "a fence filter lang holding a line break is a type-error at the variable",
      template: '${{ b | fence="a\nb" }}',
      data: { b: "x" },
      code: "type-error",
      line: 1,
      column: 1,
    },
  ];
  it.each(cases)("fe-errors: $name", (c) => {
    // the closed form of a FENCE is valid (so the error below is about FENCE, not an unknown tag)
    expect(r("{{FENCE}}x{{END_FENCE}}").ok).toBe(true);
    const res = r(c.template, c.data ?? {}, c.options ?? OFF);
    expect(res.diagnostics[0]).toMatchObject({ code: c.code, line: c.line, column: c.column });
    expect(res.ok).toBe(false);
    expect(res.output).toBe("");
  });

  it("fe-errors: a single FENCE is within maxDepth 1 and two siblings are fine", () => {
    const res = r("{{FENCE}}a{{END_FENCE}}{{FENCE}}b{{END_FENCE}}", {}, { standaloneLines: false, limits: { maxDepth: 1 } });
    expect(res.output).toBe("```\na\n```\n```\nb\n```\n");
    expect(res.ok).toBe(true);
  });

  it("fe-errors: two nested FENCEs are within maxDepth 2", () => {
    const res = r("{{FENCE}}{{FENCE}}a{{END_FENCE}}{{END_FENCE}}", {}, { standaloneLines: false, limits: { maxDepth: 2 } });
    expect(res.output).toBe("````\n```\na\n```\n````\n");
    expect(res.ok).toBe(true);
  });

  it("fe-errors: validate reports an unclosed FENCE as a located syntax-error", () => {
    expect(validate("x\n  {{FENCE}}y{{END_FENCE}}").ok).toBe(true);
    const v = validate("x\n  {{FENCE}}y");
    expect(v.diagnostics[0]).toMatchObject({ code: "syntax-error", line: 2, column: 3 });
    expect(v.ok).toBe(false);
  });

  it("fe-errors: standalone on: tag-only lines for FENCE tags are removed with their line break", () => {
    const res = r("{{FENCE}}\nx\n{{END_FENCE}}\n", {}, ON);
    expect(res.output).toBe("```\nx\n```\n");
    expect(res.ok).toBe(true);
  });
});

describe("fe-spec: spec and analyze know FENCE and the new filters", () => {
  it("fe-spec: spec lists FENCE closing with END_FENCE", () => {
    const b = spec().blocks.find((x) => x.name === "FENCE");
    expect(b).toBeDefined();
    expect(b!.closes).toBe("END_FENCE");
    expect(b!.description.length).toBeGreaterThan(0);
  });

  it.each(["fence", "heading_offset"])("fe-spec: spec lists filter %s with a description", (name) => {
    const f = spec().filters.find((x) => x.name === name);
    expect(f).toBeDefined();
    expect(f!.description.length).toBeGreaterThan(0);
  });

  it.each(["fence", "heading_offset"])("fe-spec: filter %s is a new entry in the spec", (name) => {
    expect(spec().filters.map((f) => f.name)).toContain(name);
  });

  it("fe-spec: the spec text mentions FENCE, END_FENCE, fence, heading_offset and the block mode", () => {
    const json = JSON.stringify(spec());
    for (const word of ["FENCE", "END_FENCE", "fence", "heading_offset", "block"]) {
      expect(json).toContain(word);
    }
  });

  it("fe-spec: escape_md filter entry names the inline and block modes", () => {
    const f = spec().filters.find((x) => x.name === "escape_md")!;
    expect(f.params + " " + f.description).toContain("block");
    expect(f.params + " " + f.description).toContain("inline");
  });

  it("fe-spec: analyze counts FENCE in blocks", () => {
    expect(tryAnalyze('{{FENCE lang="x"}}a{{END_FENCE}}')?.blocks).toEqual({ FENCE: 1 });
    expect(tryAnalyze("{{FENCE}}a{{END_FENCE}}{{FENCE}}{{FENCE}}b{{END_FENCE}}{{END_FENCE}}")?.blocks).toEqual({ FENCE: 3 });
  });

  it("fe-spec: analyze reports FENCE next to other blocks", () => {
    const a = tryAnalyze("{{FOR xs AS i}}{{FENCE}}${{i}}{{END_FENCE}}{{END_FOR}}");
    expect(a?.blocks).toEqual({ FOR: 1, FENCE: 1 });
  });

  it("fe-spec: analyze does not report the new filters as unknown and counts them", () => {
    const a = tryAnalyze("${{a | fence=md}}${{b | heading_offset=1}}${{c | escape_md=block}}${{d | fence}}");
    expect(a?.diagnostics.filter((d) => d.code === "unknown-filter")).toEqual([]);
    const counts = Object.fromEntries((a?.filters ?? []).map((f) => [f.name, f.count]));
    expect(counts).toEqual({ fence: 2, heading_offset: 1, escape_md: 1 });
  });

  it("fe-spec: validate accepts a template using FENCE and the new filters", () => {
    const v = validate('{{FENCE lang="x"}}${{a | heading_offset=1}}{{END_FENCE}}${{b | escape_md=block}}${{c | fence=md}}');
    expect(v.diagnostics).toEqual([]);
    expect(v.ok).toBe(true);
  });
});
