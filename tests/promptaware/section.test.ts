/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, analyze as coreAnalyze, spec } from "../../core/src";

// analyze throws on a tag it does not know; turn that into an empty analysis so a missing feature fails by assertion.
function analyze(template: string): ReturnType<typeof coreAnalyze> {
  try {
    return coreAnalyze(template);
  } catch (e) {
    return { variables: [], filters: [], blocks: {}, diagnostics: [{ code: "threw", message: String(e), line: 1, column: 1 }] };
  }
}

// `standaloneLines` belongs to a sibling card, so the option goes through `any`.
function run(template: string, data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return render(template, data, extra as any);
}
const ON = { standaloneLines: true };
const OFF = { standaloneLines: false };

type OutCase = {
  name: string;
  template: string;
  data?: Record<string, unknown>;
  options?: Record<string, unknown>;
  output: string;
  omitted?: number;
};

function runOutCases(id: string, cases: OutCase[]) {
  it.each(cases)(`${id}: $name`, ({ template, data, options, output, omitted }) => {
    const r = run(template, data ?? {}, options ?? {});
    expect(r.output).toBe(output);
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.stats.sectionsOmitted).toBe(omitted ?? 0);
  });
}

describe("sc-heading: heading, body trimming and spacing between sections", () => {
  runOutCases("sc-heading", [
    {
      name: "quoted title, default level 2",
      template: '{{SECTION "Intro"}}hello{{END_SECTION}}',
      output: "## Intro\n\nhello\n",
    },
    {
      name: "title with punctuation and hash is kept verbatim",
      template: '{{SECTION "My: Title #1"}}b{{END_SECTION}}',
      output: "## My: Title #1\n\nb\n",
    },
    {
      name: "variable title",
      template: "{{SECTION t}}body{{END_SECTION}}",
      data: { t: "From Data" },
      output: "## From Data\n\nbody\n",
    },
    {
      name: "dotted variable path title",
      template: "{{SECTION doc.title}}body{{END_SECTION}}",
      data: { doc: { title: "Nested" } },
      output: "## Nested\n\nbody\n",
    },
    {
      name: "variables in the body",
      template: '{{SECTION "A"}}${{x}} and ${{y}}{{END_SECTION}}',
      data: { x: "one", y: "two" },
      output: "## A\n\none and two\n",
    },
    {
      name: "leading and trailing blank lines of the body are trimmed",
      template: '{{SECTION "A"}}\n\n\nx\n\n\n{{END_SECTION}}',
      output: "## A\n\nx\n",
      options: OFF,
    },
    {
      name: "blank lines inside the body are kept",
      template: '{{SECTION "A"}}\na\n\nb\n{{END_SECTION}}',
      output: "## A\n\na\n\nb\n",
      options: OFF,
    },
    {
      name: "a multi-line body ends with exactly one line break",
      template: '{{SECTION "A"}}a\nb\nc\n\n{{END_SECTION}}',
      output: "## A\n\na\nb\nc\n",
    },
    {
      name: "text before and after an inline section",
      template: 'before\n{{SECTION "A"}}x{{END_SECTION}}after',
      output: "before\n## A\n\nx\nafter",
    },
    {
      name: "tag lines on their own lines, standaloneLines true: tag lines vanish",
      template: '{{SECTION "A"}}\nx\n{{END_SECTION}}\n',
      options: ON,
      output: "## A\n\nx\n",
    },
    {
      name: "tag lines on their own lines, standaloneLines false: tag line breaks stay in the body and after",
      template: '{{SECTION "A"}}\nx\n{{END_SECTION}}\n',
      options: OFF,
      output: "## A\n\nx\n\n",
    },
    {
      name: "text before and after own-line tags, standaloneLines true",
      template: 'before\n{{SECTION "A"}}\nx\n{{END_SECTION}}\nafter\n',
      options: ON,
      output: "before\n## A\n\nx\nafter\n",
    },
    {
      name: "text before and after own-line tags, standaloneLines false",
      template: 'before\n{{SECTION "A"}}\nx\n{{END_SECTION}}\nafter\n',
      options: OFF,
      output: "before\n## A\n\nx\n\nafter\n",
    },
    {
      name: "two sections with one blank line between them in the template, standaloneLines true",
      template: '{{SECTION "A"}}\na\n{{END_SECTION}}\n\n{{SECTION "B"}}\nb\n{{END_SECTION}}\n',
      options: ON,
      output: "## A\n\na\n\n## B\n\nb\n",
    },
    {
      name: "two sections with one blank line between them in the template, standaloneLines false",
      template: '{{SECTION "A"}}\na\n{{END_SECTION}}\n\n{{SECTION "B"}}\nb\n{{END_SECTION}}\n',
      options: OFF,
      output: "## A\n\na\n\n\n## B\n\nb\n\n",
    },
    {
      name: "FOR producing one section per item, titles from the loop variable",
      template: "{{FOR items AS it}}{{SECTION it.name}}${{it.body}}{{END_SECTION}}{{END_FOR}}",
      data: { items: [{ name: "A", body: "a" }, { name: "B", body: "b" }] },
      output: "## A\n\na\n## B\n\nb\n",
    },
    {
      name: "FOR producing sections on own lines, standaloneLines true",
      template: "{{FOR xs AS x}}\n{{SECTION x}}\n${{x}}\n{{END_SECTION}}\n{{END_FOR}}\n",
      data: { xs: ["a", "b"] },
      options: ON,
      output: "## a\n\na\n## b\n\nb\n",
    },
    {
      name: "FOR producing sections on own lines, standaloneLines false",
      template: "{{FOR xs AS x}}\n{{SECTION x}}\n${{x}}\n{{END_SECTION}}\n{{END_FOR}}\n",
      data: { xs: ["a", "b"] },
      options: OFF,
      output: "\n## a\n\na\n\n\n## b\n\nb\n\n\n",
    },
    {
      name: "FOR inside a section",
      template: '{{SECTION "List"}}{{FOR xs AS x}}- ${{x}}\n{{END_FOR}}{{END_SECTION}}',
      data: { xs: ["a", "b"] },
      output: "## List\n\n- a\n- b\n",
    },
    {
      name: "nested sections",
      template: '{{SECTION "O" level=1}}intro\n{{SECTION "I" level=2}}in{{END_SECTION}}{{END_SECTION}}',
      output: "# O\n\nintro\n## I\n\nin\n",
    },
    {
      name: "adjacent sections get no blank line added",
      template: '{{SECTION "A"}}a{{END_SECTION}}{{SECTION "B"}}b{{END_SECTION}}',
      output: "## A\n\na\n## B\n\nb\n",
    },
    {
      name: "adjacent sections on own lines, standaloneLines true: still no blank line",
      template: '{{SECTION "A"}}\na\n{{END_SECTION}}\n{{SECTION "B"}}\nb\n{{END_SECTION}}\n',
      options: ON,
      output: "## A\n\na\n## B\n\nb\n",
    },
    {
      name: "CRLF line breaks in the body become LF",
      template: '{{SECTION "A"}}a\r\nb\r\n{{END_SECTION}}',
      output: "## A\n\na\nb\n",
    },
    {
      name: "CRLF template with own-line tags, standaloneLines true",
      template: '{{SECTION "A"}}\r\nx\r\n{{END_SECTION}}\r\n',
      options: ON,
      output: "## A\n\nx\n",
    },
    {
      name: "IF inside a section",
      template: '{{SECTION "A"}}{{IF f}}yes{{ELSE}}no{{END_IF}}{{END_SECTION}}',
      data: { f: true },
      output: "## A\n\nyes\n",
    },
  ]);
});

describe("sc-level: level default, clamping and non-integer", () => {
  runOutCases(
    "sc-level",
    [
      ["level omitted is 2", "", "##"],
      ["level=1", " level=1", "#"],
      ["level=2", " level=2", "##"],
      ["level=3", " level=3", "###"],
      ["level=4", " level=4", "####"],
      ["level=5", " level=5", "#####"],
      ["level=6", " level=6", "######"],
      ["level=7 clamps to 6", " level=7", "######"],
      ["level=99 clamps to 6", " level=99", "######"],
      ["level=0 clamps to 1", " level=0", "#"],
      ["level=-3 clamps to 1", " level=-3", "#"],
    ].map(([name, param, hashes]) => ({
      name,
      template: `{{SECTION "T"${param}}}b{{END_SECTION}}`,
      output: `${hashes} T\n\nb\n`,
    }))
  );

  it("sc-level: level can be given before skip_empty", () => {
    const r = run('{{SECTION "T" level=3 skip_empty=true}}b{{END_SECTION}}');
    expect(r.output).toBe("### T\n\nb\n");
    expect(r.ok).toBe(true);
  });

  it.each([
    ["decimal 2.5", '{{SECTION "T" level=2.5}}x{{END_SECTION}}'],
    ["string", '{{SECTION "T" level="high"}}x{{END_SECTION}}'],
  ])("sc-level: non-integer level (%s) is a type-error located at the SECTION tag", (_n, tag) => {
    const r = run(`ab\n  ${tag}`, {});
    expect(r.diagnostics[0]).toMatchObject({ code: "type-error", line: 2, column: 3 });
    expect(r.ok).toBe(false);
    expect(r.output).toBe("");
  });
});

describe("sc-empty: an empty section disappears and is counted", () => {
  runOutCases("sc-empty", [
    {
      name: "no body at all",
      template: 'a\n{{SECTION "A"}}{{END_SECTION}}b',
      output: "a\nb",
      omitted: 1,
    },
    {
      name: "body of only spaces, tabs and line breaks",
      template: 'a{{SECTION "A"}}  \n\t\n {{END_SECTION}}b',
      output: "ab",
      omitted: 1,
    },
    {
      name: "body whose variable renders an empty string",
      template: '{{SECTION "A"}}${{e}}{{END_SECTION}}',
      data: { e: "" },
      output: "",
      omitted: 1,
    },
    {
      name: "body that is only an IF that renders nothing",
      template: '{{SECTION "A"}}{{IF f}}x{{END_IF}}{{END_SECTION}}',
      data: { f: false },
      output: "",
      omitted: 1,
    },
    {
      name: "the same section with the IF true is kept",
      template: '{{SECTION "A"}}{{IF f}}x{{END_IF}}{{END_SECTION}}',
      data: { f: true },
      output: "## A\n\nx\n",
      omitted: 0,
    },
    {
      name: "body that is a FOR over an empty array",
      template: '{{SECTION "A"}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_SECTION}}',
      data: { xs: [] },
      output: "",
      omitted: 1,
    },
    {
      name: "explicit skip_empty=true behaves like the default",
      template: '{{SECTION "A" skip_empty=true}}{{END_SECTION}}',
      output: "",
      omitted: 1,
    },
    {
      name: "own-line tags around an empty body, standaloneLines true",
      template: '{{SECTION "A"}}\n{{END_SECTION}}\nafter\n',
      options: ON,
      output: "after\n",
      omitted: 1,
    },
    {
      name: "own-line tags around an empty body, standaloneLines false",
      template: '{{SECTION "A"}}\n{{END_SECTION}}\nafter\n',
      options: OFF,
      output: "\nafter\n",
      omitted: 1,
    },
    {
      name: "an empty section before a kept one leaves no heading or spacing of its own",
      template: '{{SECTION "A"}}{{END_SECTION}}\n{{SECTION "B"}}b{{END_SECTION}}',
      options: OFF,
      output: "\n## B\n\nb\n",
      omitted: 1,
    },
    {
      name: "FOR where one iteration yields an empty section",
      template: "{{FOR items AS it}}{{SECTION it.name}}${{it.body}}{{END_SECTION}}{{END_FOR}}",
      data: {
        items: [
          { name: "A", body: "a" },
          { name: "B", body: "" },
          { name: "C", body: "c" },
        ],
      },
      output: "## A\n\na\n## C\n\nc\n",
      omitted: 1,
    },
    {
      name: "FOR where every iteration yields an empty section counts each",
      template: "{{FOR xs AS x}}{{SECTION x}}{{END_SECTION}}{{END_FOR}}",
      data: { xs: ["a", "b", "c"] },
      output: "",
      omitted: 3,
    },
    {
      name: "FOR inside a section with every item empty omits the section",
      template: '{{SECTION "S"}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_SECTION}}',
      data: { xs: ["", ""] },
      output: "",
      omitted: 1,
    },
    {
      name: "an empty inner section is omitted and the outer section keeps its text",
      template: '{{SECTION "O"}}text{{SECTION "I"}}{{END_SECTION}}{{END_SECTION}}',
      output: "## O\n\ntext\n",
      omitted: 1,
    },
    {
      name: "an outer section whose only content is an empty inner section is omitted too",
      template: '{{SECTION "O"}}{{SECTION "I"}}{{END_SECTION}}{{END_SECTION}}',
      output: "",
      omitted: 2,
    },
    {
      name: "a non-empty inner section keeps the outer section",
      template: '{{SECTION "O"}}{{SECTION "I"}}in{{END_SECTION}}{{END_SECTION}}',
      output: "## O\n\n## I\n\nin\n",
      omitted: 0,
    },
    {
      name: "two omitted sections in a row are counted separately",
      template: 'x{{SECTION "A"}}{{END_SECTION}}{{SECTION "B"}}{{END_SECTION}}y',
      output: "xy",
      omitted: 2,
    },
  ]);
});

describe("sc-keep: skip_empty=false keeps the heading", () => {
  it("sc-keep: an empty section keeps its heading and is not counted", () => {
    const r = run('{{SECTION "A" skip_empty=false}}{{END_SECTION}}');
    expect(r.output).toBe("## A\n");
    expect(r.ok).toBe(true);
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: a whitespace-only body keeps the heading, the whitespace is dropped", () => {
    const r = run('{{SECTION "A" skip_empty=false}}  \n \n{{END_SECTION}}');
    expect(r.output).toBe("## A\n");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: level and skip_empty combine in either order", () => {
    const a = run('{{SECTION "A" level=4 skip_empty=false}}{{END_SECTION}}');
    const b = run('{{SECTION "A" skip_empty=false level=4}}{{END_SECTION}}');
    expect(a.output).toBe("#### A\n");
    expect(b.output).toBe("#### A\n");
    expect(a.stats.sectionsOmitted + b.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: text around a kept empty section stays where it was", () => {
    const r = run('a\n{{SECTION "A" skip_empty=false}}{{END_SECTION}}b');
    expect(r.output).toBe("a\n## A\nb");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: an inner empty section kept by skip_empty=false keeps the outer one non-empty", () => {
    const r = run('{{SECTION "O"}}{{SECTION "I" skip_empty=false}}{{END_SECTION}}{{END_SECTION}}');
    expect(r.output).toBe("## O\n\n## I\n");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: skip_empty=false on a non-empty section changes nothing", () => {
    const r = run('{{SECTION "A" skip_empty=false}}x{{END_SECTION}}');
    expect(r.output).toBe("## A\n\nx\n");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: inside FOR, kept empty sections are not counted and omitted ones still are", () => {
    const r = run(
      '{{FOR xs AS x}}{{SECTION x skip_empty=false}}{{END_SECTION}}{{END_FOR}}{{SECTION "Z"}}{{END_SECTION}}',
      { xs: ["a", "b"] }
    );
    expect(r.output).toBe("## a\n## b\n");
    expect(r.stats.sectionsOmitted).toBe(1);
  });
});

describe("sc-errors: invalid sections and depth", () => {
  const cases: {
    name: string;
    template: string;
    data?: Record<string, unknown>;
    code: string;
    line: number;
    column: number;
  }[] = [
    { name: "empty quoted title", template: 'a\n  {{SECTION ""}}x{{END_SECTION}}', code: "type-error", line: 2, column: 3 },
    { name: "missing title", template: "{{SECTION}}x{{END_SECTION}}", code: "type-error", line: 1, column: 1 },
    {
      name: "missing title with only a level",
      template: "ab {{SECTION level=2}}x{{END_SECTION}}",
      code: "type-error",
      line: 1,
      column: 4,
    },
    {
      name: "variable title that is an empty string",
      template: "{{SECTION t}}x{{END_SECTION}}",
      data: { t: "" },
      code: "type-error",
      line: 1,
      column: 1,
    },
    {
      name: "variable title that is a number",
      template: "\n{{SECTION t}}x{{END_SECTION}}",
      data: { t: 5 },
      code: "type-error",
      line: 2,
      column: 1,
    },
    {
      name: "variable title that is an array",
      template: "{{SECTION t}}x{{END_SECTION}}",
      data: { t: ["a"] },
      code: "type-error",
      line: 1,
      column: 1,
    },
    { name: "stray END_SECTION", template: "a\n  {{END_SECTION}}", code: "syntax-error", line: 2, column: 3 },
    {
      name: "non-boolean skip_empty (string)",
      template: 'a\n  {{SECTION "T" skip_empty="no"}}x{{END_SECTION}}',
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "non-boolean skip_empty (number)",
      template: '{{SECTION "T" skip_empty=2}}x{{END_SECTION}}',
      code: "type-error",
      line: 1,
      column: 1,
    },
    { name: "unclosed SECTION is located at its tag", template: 'a\n  {{SECTION "T"}}x', code: "syntax-error", line: 2, column: 3 },
    {
      name: "unclosed inner SECTION is located at the inner tag",
      template: '{{SECTION "O"}}\n {{SECTION "I"}}x\n{{END_SECTION}}',
      code: "syntax-error",
      line: 2,
      column: 2,
    },
    {
      name: "unclosed SECTION inside an IF",
      template: '{{IF t}}{{SECTION "A"}}x{{END_IF}}',
      data: { t: true },
      code: "syntax-error",
      line: 1,
      column: 9,
    },
  ];

  it.each(cases)("sc-errors: $name", ({ template, data, code, line, column }) => {
    const r = run(template, data ?? {});
    expect(r.diagnostics[0]).toMatchObject({ code, line, column });
    expect(r.diagnostics[0].message).not.toMatch(/unknown template tag/i);
    expect(r.ok).toBe(false);
    expect(r.output).toBe("");
  });

  it.each([
    ["standaloneLines true", ON],
    ["standaloneLines false", OFF],
  ])("sc-errors: error locations are source locations (%s)", (_n, options) => {
    const r = run('x\n{{SECTION "A"}}\n  {{SECTION ""}}\ny\n{{END_SECTION}}\n{{END_SECTION}}', {}, options);
    expect(r.diagnostics[0]).toMatchObject({ code: "type-error", line: 3, column: 3 });
  });

  it("sc-errors: an error is raised even when the section would be empty", () => {
    const r = run('{{SECTION ""}}{{END_SECTION}}');
    expect(r.diagnostics[0]).toMatchObject({ code: "type-error", line: 1, column: 1 });
    expect(r.ok).toBe(false);
  });

  it.each([
    ["two nested sections", '{{SECTION "A"}}\n  {{SECTION "B"}}x{{END_SECTION}}\n{{END_SECTION}}', 1, 2, 3],
    ["a section inside an IF", '{{IF t}}{{SECTION "A"}}x{{END_SECTION}}{{END_IF}}', 1, 1, 9],
    ["an IF inside a section", '{{SECTION "A"}}\n{{IF t}}x{{END_IF}}\n{{END_SECTION}}', 1, 2, 1],
    ["a section inside a FOR", "{{FOR xs AS x}}{{SECTION x}}${{x}}{{END_SECTION}}{{END_FOR}}", 1, 1, 16],
  ])("sc-errors: %s counts toward maxDepth", (_n, template, maxDepth, line, column) => {
    const data = { t: true, xs: ["a"] };
    const tooDeep = run(template, data, { limits: { maxDepth } });
    expect(tooDeep.diagnostics[0]).toMatchObject({ code: "limit-depth", line, column });
    expect(tooDeep.ok).toBe(false);
    const fine = run(template, data, { limits: { maxDepth: maxDepth + 1 } });
    expect(fine.diagnostics).toEqual([]);
    expect(fine.ok).toBe(true);
  });

  it("sc-errors: a single top-level section is within maxDepth 1", () => {
    const r = run('{{SECTION "A"}}x{{END_SECTION}}', {}, { limits: { maxDepth: 1 } });
    expect(r.output).toBe("## A\n\nx\n");
    expect(r.ok).toBe(true);
  });
});

describe("sc-analyze: analyze and spec know SECTION", () => {
  const names = (a: ReturnType<typeof analyze>) => a.variables.map((v) => v.name).sort();

  it("sc-analyze: blocks.SECTION counts every section, nested ones included", () => {
    const a = analyze('{{SECTION "A"}}x{{END_SECTION}}{{SECTION "B"}}{{SECTION "C"}}y{{END_SECTION}}{{END_SECTION}}');
    expect((a.blocks as any).SECTION).toBe(3);
    expect(a.diagnostics).toEqual([]);
  });

  it("sc-analyze: sections are counted next to other blocks", () => {
    const a = analyze('{{FOR xs AS x}}{{SECTION "A"}}{{IF t}}${{x}}{{END_IF}}{{END_SECTION}}{{END_FOR}}');
    expect(a.blocks).toMatchObject({ FOR: 1, SECTION: 1, IF: 1 });
  });

  it("sc-analyze: a variable title is read as a required variable", () => {
    const a = analyze("{{SECTION title}}x{{END_SECTION}}");
    expect(names(a)).toEqual(["title"]);
    expect(a.variables[0]).toMatchObject({ name: "title", paths: ["title"], required: true });
  });

  it("sc-analyze: a dotted title path is recorded under its root name", () => {
    const a = analyze("{{SECTION doc.title}}x{{END_SECTION}}");
    expect(a.variables[0]).toMatchObject({ name: "doc", paths: ["doc.title"], required: true });
  });

  it("sc-analyze: variables in a title or body have usedIn output", () => {
    const a = analyze("{{SECTION t}}${{b}}{{END_SECTION}}");
    const used = Object.fromEntries(a.variables.map((v) => [v.name, v.usedIn]));
    expect(used).toEqual({ t: ["output"], b: ["output"] });
  });

  it("sc-analyze: variables in the body are read", () => {
    const a = analyze('{{SECTION "A"}}${{p}} ${{q}}{{END_SECTION}}');
    expect(names(a)).toEqual(["p", "q"]);
  });

  it("sc-analyze: title and body variables are both read", () => {
    const a = analyze("{{SECTION t}}${{b}}{{END_SECTION}}");
    expect(names(a)).toEqual(["b", "t"]);
  });

  it("sc-analyze: a loop variable used as title is not an input", () => {
    const a = analyze("{{FOR xs AS x}}{{SECTION x}}${{x}}{{END_SECTION}}{{END_FOR}}");
    expect(names(a)).toEqual(["xs"]);
  });

  it("sc-analyze: a quoted title reads no variable", () => {
    const a = analyze('{{SECTION "t"}}x{{END_SECTION}}');
    expect(names(a)).toEqual([]);
    expect((a.blocks as any).SECTION).toBe(1);
  });

  it("sc-analyze: spec lists SECTION closed by END_SECTION", () => {
    const blocks = spec().blocks;
    const section = blocks.find((b) => b.name === "SECTION");
    expect(section).toBeDefined();
    expect(section?.closes).toBe("END_SECTION");
    expect(typeof section?.description).toBe("string");
    expect(section?.description.length).toBeGreaterThan(0);
  });

  it("sc-analyze: spec text mentions SECTION and END_SECTION", () => {
    const text = JSON.stringify(spec());
    expect(text).toContain("SECTION");
    expect(text).toContain("END_SECTION");
  });
});
