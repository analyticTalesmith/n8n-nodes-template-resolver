/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, resolveTemplate } from "../../core/src";

type Data = Record<string, unknown>;

/** render with the standaloneLines option set explicitly (cast: the option is new) */
function renderWith(template: string, data: Data, standaloneLines: boolean) {
  return render(template, data, { standaloneLines } as any);
}

/** a thrown template error comes back as its message, so a mismatch fails by assertion */
function resolveWith(template: string, data: Data, standaloneLines?: boolean): string {
  try {
    return resolveTemplate(
      template,
      new Map(Object.entries(data)) as any,
      standaloneLines === undefined ? undefined : ({ standaloneLines } as any)
    );
  } catch (e) {
    return `THROWN: ${(e as Error).message}`;
  }
}

const XS = ["a", "b"];

type Standalone = {
  name: string;
  template: string;
  data: Data;
  /** output with the option on, written by hand from the contract */
  on: string;
  /** output with the option off (the old spacing), when the case needs it checked */
  off?: string;
};

const STANDALONE: Standalone[] = [
  {
    name: "IF and END_IF each on their own line around text lines",
    template: "intro\n{{IF x}}\nyes\n{{END_IF}}\noutro\n",
    data: { x: true },
    on: "intro\nyes\noutro\n",
    off: "intro\n\nyes\n\noutro\n",
  },
  {
    name: "an untaken IF leaves no blank line behind",
    template: "intro\n{{IF x}}\nyes\n{{END_IF}}\noutro\n",
    data: { x: false },
    on: "intro\noutro\n",
    off: "intro\n\noutro\n",
  },
  {
    name: "ELSEIF and ELSE lines vanish (ELSEIF branch)",
    template: "{{IF a}}\nA\n{{ELSEIF b}}\nB\n{{ELSE}}\nC\n{{END_IF}}\nend",
    data: { a: false, b: true },
    on: "B\nend",
  },
  {
    name: "ELSEIF and ELSE lines vanish (ELSE branch)",
    template: "{{IF a}}\nA\n{{ELSEIF b}}\nB\n{{ELSE}}\nC\n{{END_IF}}\nend",
    data: { a: false, b: false },
    on: "C\nend",
  },
  {
    name: "ELSEIF and ELSE lines vanish (IF branch)",
    template: "{{IF a}}\nA\n{{ELSEIF b}}\nB\n{{ELSE}}\nC\n{{END_IF}}\nend",
    data: { a: true, b: true },
    on: "A\nend",
  },
  {
    name: "FOR with body lines",
    template: "{{FOR xs AS x}}\n- ${{x}}\n{{END_FOR}}\ndone",
    data: { xs: XS },
    on: "- a\n- b\ndone",
  },
  {
    name: "FOR over an empty array leaves only the text around it",
    template: "head\n{{FOR xs AS x}}\n- ${{x}}\n{{END_FOR}}\ndone",
    data: { xs: [] },
    on: "head\ndone",
  },
  {
    name: "indented tags nested in FOR and IF, body keeps its own indentation",
    template:
      "list:\n{{FOR xs AS x}}\n  {{IF @first}}\n  first ${{x}}\n  {{ELSE}}\n  other ${{x}}\n  {{END_IF}}\n{{END_FOR}}\nend",
    data: { xs: XS },
    on: "list:\n  first a\n  other b\nend",
  },
  {
    name: "CASE WHEN DEFAULT (WHEN branch)",
    template:
      '{{CASE s}}\n{{WHEN "a"}}\nA\n{{END_WHEN}}\n{{WHEN "b"}}\nB\n{{END_WHEN}}\n{{DEFAULT}}\nD\n{{END_DEFAULT}}\n{{END_CASE}}\nend',
    data: { s: "b" },
    on: "B\nend",
  },
  {
    name: "CASE WHEN DEFAULT (DEFAULT branch)",
    template:
      '{{CASE s}}\n{{WHEN "a"}}\nA\n{{END_WHEN}}\n{{DEFAULT}}\nD\n{{END_DEFAULT}}\n{{END_CASE}}\nend',
    data: { s: "zzz" },
    on: "D\nend",
  },
  {
    name: "a comment on its own line",
    template: "a\n{{# note #}}\nb",
    data: {},
    on: "a\nb",
    off: "a\n\nb",
  },
  {
    name: "an indented comment with trailing spaces",
    template: "a\n    {{# note #}}   \nb",
    data: {},
    on: "a\nb",
  },
  {
    name: "a comment on a line with text stays in place",
    template: "a {{# n #}} b\nc\n{{# gone #}}\n",
    data: {},
    on: "a  b\nc\n",
  },
  {
    name: "a tag line with trailing spaces and tabs",
    template: "{{IF x}}  \t\nyes\n{{END_IF}} \nend",
    data: { x: true },
    on: "yes\nend",
  },
  {
    name: "blank lines around tag lines are kept",
    template: "a\n\n{{IF x}}\nb\n{{END_IF}}\n\nc",
    data: { x: true },
    on: "a\n\nb\n\nc",
  },
  {
    name: "CRLF input: tag lines vanish with their CRLF",
    template: "a\r\n{{IF x}}\r\nb\r\n{{END_IF}}\r\nc\r\n",
    data: { x: true },
    on: "a\nb\nc\n",
  },
  {
    name: "first line is a tag line",
    template: "{{IF x}}\nb\n{{END_IF}}\n",
    data: { x: true },
    on: "b\n",
  },
  {
    name: "last line is a tag line without a trailing newline",
    template: "a\n{{IF x}}\nb\n{{END_IF}}",
    data: { x: true },
    on: "a\nb\n",
  },
  {
    name: "a template made only of comment lines",
    template: "{{# a #}}\n{{# b #}}\n",
    data: {},
    on: "",
  },
  {
    name: "a template made only of tag lines yields an empty output",
    template: "{{IF x}}\n{{END_IF}}",
    data: { x: true },
    on: "",
  },
  {
    name: "adjacent standalone tag lines all vanish",
    template: "a\n{{IF x}}\n{{FOR xs AS i}}\n${{i}}\n{{END_FOR}}\n{{END_IF}}\nz",
    data: { x: true, xs: XS },
    on: "a\na\nb\nz",
  },
  {
    name: "two tags on one line (no text) vanish together",
    template: "{{IF x}}{{FOR xs AS i}}\n${{i}}\n{{END_FOR}}{{END_IF}}\nz",
    data: { x: true, xs: XS },
    on: "a\nb\nz",
  },
  {
    name: "a tag and a comment on one line vanish together",
    template: "{{IF x}} {{# c #}}\nq\n{{END_IF}}\n",
    data: { x: true },
    on: "q\n",
  },
  {
    name: "a tag on a line with text stays (inline IF)",
    template: "{{IF x}}yes{{END_IF}}\nz\n{{# gone #}}\n",
    data: { x: true },
    on: "yes\nz\n",
  },
  {
    name: "an opening tag line then a closing tag that shares a text line",
    template: "{{IF x}}\nyes{{END_IF}}\nz",
    data: { x: true },
    on: "yes\nz",
  },
  {
    name: "a line with a variable and a tag is untouched",
    template: "${{v}} {{IF x}}\nb\n{{END_IF}}\n",
    data: { v: "V", x: true },
    on: "V \nb\n",
  },
  {
    name: "a line with text before a tag is untouched",
    template: "text {{FOR xs AS i}}\n${{i}}\n{{END_FOR}}\nz",
    data: { xs: XS },
    on: "text \na\n\nb\nz",
  },
  {
    name: "LIST and LIST_ITEM tags keep their old spacing inside a standalone IF",
    template:
      "x\n{{IF t}}\n{{LIST}}\n{{LIST_ITEM}}A{{END_LIST_ITEM}}\n{{LIST_ITEM}}B{{END_LIST_ITEM}}\n{{END_LIST}}\n{{END_IF}}\ny",
    data: { t: true },
    on: "x\n1. A\n2. B\ny",
    off: "x\n\n1. A\n2. B\n\ny",
  },
  {
    name: "an indented LIST tag line is not a standalone line",
    template:
      "{{IF t}}\n  {{LIST}}\n  {{LIST_ITEM}}A{{END_LIST_ITEM}}\n  {{END_LIST}}\n{{END_IF}}\ny",
    data: { t: true },
    on: "  1. A\ny",
    off: "\n  1. A\n\ny",
  },
  {
    name: "TABLE, HEADER and ROW tags keep their old spacing inside a standalone IF",
    template:
      "x\n{{IF t}}\n{{TABLE}}\n{{HEADER}}N|A{{END_HEADER}}\n{{ROW}}p|1{{END_ROW}}\n{{ROW}}q|2{{END_ROW}}\n{{END_TABLE}}\n{{END_IF}}\ny",
    data: { t: true },
    on: "x\n| N | A |\n|:-----|:-----|\n| p | 1 |\n| q | 2 |\ny",
    off: "x\n\n| N | A |\n|:-----|:-----|\n| p | 1 |\n| q | 2 |\n\ny",
  },
  {
    name: "whitespace-only RAW content inline is kept",
    template: "x{{RAW}} \t {{END_RAW}}y",
    data: {},
    on: "x \t y",
    off: "x \t y",
  },
  {
    name: "whitespace-only RAW content alone on a line is kept",
    template: "a\n{{RAW}}   {{END_RAW}}\nb",
    data: {},
    on: "a\n   \nb",
    off: "a\n   \nb",
  },
  {
    name: "whitespace-only multi-line RAW content is kept, RAW tag lines vanish",
    template: "a\n{{RAW}}\n  \n\t\n{{END_RAW}}\nb",
    data: {},
    on: "a\n  \n\t\nb",
    off: "a\n\n  \n\t\n\nb",
  },
  {
    name: "RAW tag lines vanish around literal content lines",
    template: "x\n{{RAW}}\n{{ y }}\n{{END_RAW}}\nz",
    data: {},
    on: "x\n{{ y }}\nz",
    off: "x\n\n{{ y }}\n\nz",
  },
];

describe("ws-standalone: standalone block-tag lines vanish with their line break", () => {
  it.each(STANDALONE)("ws-standalone: $name (render, option on)", ({ template, data, on }) => {
    const r = renderWith(template, data, true);
    expect(r.output).toBe(on);
    expect(r.ok).toBe(true);
  });

  it.each(STANDALONE)(
    "ws-standalone: $name (resolveTemplate, option on)",
    ({ template, data, on }) => {
      expect(resolveWith(template, data, true)).toBe(on);
    }
  );

  it.each(STANDALONE.filter((c) => c.off !== undefined))(
    "ws-standalone: $name (option off keeps the old output)",
    ({ template, data, on, off }) => {
      // the on-side check keeps this test red until the option exists
      expect(renderWith(template, data, true).output).toBe(on);
      expect(renderWith(template, data, false).output).toBe(off);
      expect(resolveWith(template, data, false)).toBe(off);
    }
  );

  it("ws-standalone: diagnostics keep line numbers of the template as written after tag lines vanish", () => {
    expect(renderWith("{{IF x}}\n{{END_IF}}\nv", { x: true }, true).output).toBe("v");
    const r = render("{{IF x}}\n{{END_IF}}\n${{missing}}", { x: true }, {
      strictMode: true,
      standaloneLines: true,
    } as any);
    expect(r.diagnostics[0]).toMatchObject({ code: "missing-variable", line: 3 });
    expect(r.ok).toBe(false);
  });

  it("ws-standalone: stats.chars counts the output after tag lines vanish", () => {
    const r = renderWith("{{IF x}}\nab\n{{END_IF}}\n", { x: true }, true);
    expect(r.output).toBe("ab\n");
    expect(r.stats.chars).toBe(3);
  });
});

type Trim = {
  name: string;
  template: string;
  data: Data;
  out: string;
};

const TRIM: Trim[] = [
  {
    name: "minus after the opening braces trims whitespace and newlines before an IF",
    template: "a  \n\t {{- IF x }}b{{END_IF}}",
    data: { x: true },
    out: "ab",
  },
  {
    name: "minus before the closing braces trims whitespace and newlines after an IF",
    template: "{{IF x -}}  \n\t b{{END_IF}}",
    data: { x: true },
    out: "b",
  },
  {
    name: "both markers on IF and END_IF (taken)",
    template: "a \n{{- IF x -}}\n b {{- END_IF -}}\n c",
    data: { x: true },
    out: "abc",
  },
  {
    name: "both markers on IF and END_IF (untaken)",
    template: "a \n{{- IF x -}}\n b {{- END_IF -}}\n c",
    data: { x: false },
    out: "ac",
  },
  {
    name: "no whitespace to trim is fine",
    template: "a{{- IF x -}}b{{END_IF}}",
    data: { x: true },
    out: "ab",
  },
  {
    name: "markers on ELSE (ELSE branch)",
    template: "{{IF f}}a {{- ELSE -}} b{{END_IF}}",
    data: { f: false },
    out: "b",
  },
  {
    name: "markers on ELSE (IF branch)",
    template: "{{IF f}}a {{- ELSE -}} b{{END_IF}}",
    data: { f: true },
    out: "a",
  },
  {
    name: "markers on ELSEIF",
    template: "{{IF f}}a {{- ELSEIF t -}} b {{- ELSE -}} c{{END_IF}}",
    data: { f: false, t: true },
    out: "b",
  },
  {
    name: "markers on FOR and END_FOR",
    template: "[ {{- FOR xs AS x -}} ${{x}} {{- END_FOR -}} ]",
    data: { xs: XS },
    out: "[ab]",
  },
  {
    name: "a marker only on the opening side of FOR leaves the body end alone",
    template: "[{{FOR xs AS x -}}  ${{x}} {{END_FOR}}]",
    data: { xs: XS },
    out: "[a b ]",
  },
  {
    name: "markers on CASE, WHEN, DEFAULT and their closers (WHEN branch)",
    template:
      '{{CASE s -}}\n  {{- WHEN "a" -}} A {{- END_WHEN -}}\n {{- WHEN "b" -}} B {{- END_WHEN -}}\n{{- DEFAULT -}} D {{- END_DEFAULT -}} \n{{- END_CASE}}!',
    data: { s: "b" },
    out: "B!",
  },
  {
    name: "markers on CASE, WHEN, DEFAULT and their closers (DEFAULT branch)",
    template:
      '{{CASE s -}}\n  {{- WHEN "a" -}} A {{- END_WHEN -}}\n{{- DEFAULT -}} D {{- END_DEFAULT -}} \n{{- END_CASE}}!',
    data: { s: "q" },
    out: "D!",
  },
  {
    name: "markers on a comment trim both sides",
    template: "a  {{-# c #-}}  b",
    data: {},
    out: "ab",
  },
  {
    name: "a comment marker before trims before only",
    template: "a \n{{-# c #}}\nb",
    data: {},
    out: "a\nb",
  },
  {
    name: "a comment marker after trims after only",
    template: "a\n{{# c #-}}\n b",
    data: {},
    out: "a\nb",
  },
  {
    name: "the minus is not part of the condition expression",
    template: "{{IF n -}} yes{{END_IF}}",
    data: { n: 5 },
    out: "yes",
  },
  {
    name: "trim before END_IF trims only the end of the taken branch body",
    template: "x{{IF f}} y {{- END_IF}} z",
    data: { f: true },
    out: "x y z",
  },
  {
    name: "trim before END_IF leaves the text after an untaken IF alone",
    template: "x{{IF f}} y {{- END_IF}} z",
    data: { f: false },
    out: "x z",
  },
];

describe("ws-trim: minus markers trim adjacent whitespace", () => {
  it.each(TRIM)("ws-trim: $name (render, option on)", ({ template, data, out }) => {
    const r = renderWith(template, data, true);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(TRIM)("ws-trim: $name (render, option off)", ({ template, data, out }) => {
    const r = renderWith(template, data, false);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(TRIM)("ws-trim: $name (resolveTemplate, default)", ({ template, data, out }) => {
    expect(resolveWith(template, data)).toBe(out);
  });
});

describe("ws-option: standaloneLines defaults and explicit values", () => {
  const T = "{{IF x}}\nb\n{{END_IF}}\n";
  const vars = new Map<string, unknown>([["x", true]]) as any;

  it("ws-option: render defaults standaloneLines to true", () => {
    expect(render(T, { x: true }).output).toBe("b\n");
  });

  it("ws-option: render with other options but no standaloneLines key still defaults to true", () => {
    expect(render(T, { x: true }, { strictMode: true }).output).toBe("b\n");
  });

  it("ws-option: render with standaloneLines undefined still defaults to true", () => {
    expect(render(T, { x: true }, { standaloneLines: undefined } as any).output).toBe("b\n");
  });

  it("ws-option: render with standaloneLines false keeps the old spacing", () => {
    expect(renderWith(T, { x: true }, true).output).toBe("b\n");
    expect(renderWith(T, { x: true }, false).output).toBe("\nb\n\n");
  });

  it("ws-option: render with standaloneLines true removes tag lines", () => {
    expect(renderWith(T, { x: true }, true).output).toBe("b\n");
  });

  it("ws-option: resolveTemplate defaults standaloneLines to false", () => {
    // paired with the explicit-true check so the test is red until the option exists
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
    expect(resolveTemplate(T, vars)).toBe("\nb\n\n");
  });

  it("ws-option: resolveTemplate with other options only still defaults to false", () => {
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
    expect(resolveTemplate(T, vars, { strictMode: true })).toBe("\nb\n\n");
  });

  it("ws-option: resolveTemplate with standaloneLines true removes tag lines", () => {
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
  });

  it("ws-option: resolveTemplate with standaloneLines false keeps the old spacing", () => {
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
    expect(resolveWith(T, { x: true }, false)).toBe("\nb\n\n");
  });

  it("ws-option: an explicit option wins in both entry points for an untaken branch", () => {
    expect(renderWith(T, { x: false }, true).output).toBe("");
    expect(renderWith(T, { x: false }, false).output).toBe("\n");
    expect(resolveWith(T, { x: false }, true)).toBe("");
    expect(resolveWith(T, { x: false }, false)).toBe("\n");
  });
});
