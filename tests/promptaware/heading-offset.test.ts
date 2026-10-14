import { render } from "../../core/src";

// No block tags appear in the heading cases, so the standalone option has no
// effect; {standaloneLines:false} is passed only to be explicit (the option is
// not on RenderOptions in this branch, hence `as any`). Cases that use FOR
// assume it off, since their templates have no tag-only lines anyway.
const OFF = { standaloneLines: false } as any;

function ho(draft: string, offset: number | string) {
  return render(`\${{ draft | heading_offset=${offset} }}`, { draft }, OFF);
}

interface Case {
  name: string;
  draft: string;
  offset: number;
  expected: string;
}

const T = "`";
const F3 = T.repeat(3);
const F4 = T.repeat(4);
const ALL = "# a\n## b\n### c\n#### d\n##### e\n###### f";

const cases: Case[] = [
  { name: "# to ###### shift by 2 and clamp at 6", draft: ALL, offset: 2, expected: "### a\n#### b\n##### c\n###### d\n###### e\n###### f" },
  { name: "offset 1 on every level", draft: ALL, offset: 1, expected: "## a\n### b\n#### c\n##### d\n###### e\n###### f" },
  { name: "offset 0 changes nothing", draft: "# a\n## b\n###### f", offset: 0, expected: "# a\n## b\n###### f" },
  { name: "large offset clamps everything to 6", draft: "# a\n### c", offset: 10, expected: "###### a\n###### c" },
  { name: "negative offset -1 shifts up and clamps at 1", draft: "# a\n## b\n### c\n###### f", offset: -1, expected: "# a\n# b\n## c\n##### f" },
  { name: "negative offset -2", draft: "# a\n### c\n#### d\n###### f", offset: -2, expected: "# a\n# c\n## d\n#### f" },
  { name: "large negative offset clamps everything to 1", draft: "## b\n###### f", offset: -10, expected: "# b\n# f" },
  { name: "text lines between headings are untouched", draft: "intro\n# a\ntext line\n\n## b\nmore", offset: 1, expected: "intro\n## a\ntext line\n\n### b\nmore" },
  { name: "a trailing line break is kept", draft: "# a\n", offset: 1, expected: "## a\n" },
  { name: "a heading on the last line without a break", draft: "x\n# a", offset: 1, expected: "x\n## a" },
  { name: "empty value stays empty", draft: "", offset: 2, expected: "" },
  { name: "no headings stays the same", draft: "just text\nand more", offset: 2, expected: "just text\nand more" },
  { name: "#hashtag without a space is not a heading", draft: "#hashtag\n# real", offset: 1, expected: "#hashtag\n## real" },
  { name: "hashes without a space and seven hashes are not headings", draft: "##tag\n###### real\n####### seven", offset: 1, expected: "##tag\n###### real\n####### seven" },
  { name: "seven hashes with a space is not a heading", draft: "####### seven\n## b", offset: -1, expected: "####### seven\n# b" },
  { name: "a # in the middle of a line is untouched", draft: "a # b\nissue #12 here\n# real", offset: 1, expected: "a # b\nissue #12 here\n## real" },
  { name: "a heading keeps its text and inner hashes", draft: "# C# language # 2", offset: 1, expected: "## C# language # 2" },
  // The closing hash sequence is heading text as far as the contract goes: only the leading run shifts.
  { name: "trailing hashes stay (only the leading run shifts)", draft: "## Title ##\n# Two #", offset: 1, expected: "### Title ##\n## Two #" },
  { name: "CRLF line breaks are kept and CRLF headings shift", draft: "# A\r\ntext\r\n## B\r\n", offset: 1, expected: "## A\r\ntext\r\n### B\r\n" },
  // fenced code stays untouched
  { name: "headings inside a backtick fence are untouched", draft: `# out\n${F3}\n# in\n## in2\n${F3}\n## after`, offset: 1, expected: `## out\n${F3}\n# in\n## in2\n${F3}\n### after` },
  { name: "a fence with a language is a fence", draft: `${F3}md\n# in\n${F3}\n# out`, offset: 2, expected: `${F3}md\n# in\n${F3}\n### out` },
  { name: "headings inside a tilde fence are untouched", draft: "# out\n~~~\n# in\n~~~\n# out2", offset: 1, expected: "## out\n~~~\n# in\n~~~\n## out2" },
  { name: "a longer fence is closed only by a fence at least as long", draft: `${F4}\n${F3}\n# in\n${F3}\n# still in\n${F4}\n# out`, offset: 1, expected: `${F4}\n${F3}\n# in\n${F3}\n# still in\n${F4}\n## out` },
  { name: "a backtick fence is not closed by a tilde fence", draft: `${F3}\n~~~\n# in\n~~~\n# still in\n${F3}\n# out`, offset: 1, expected: `${F3}\n~~~\n# in\n~~~\n# still in\n${F3}\n## out` },
  { name: "a tilde fence is not closed by a backtick fence", draft: `~~~\n${F3}\n# in\n${F3}\n~~~\n# out`, offset: 1, expected: `~~~\n${F3}\n# in\n${F3}\n~~~\n## out` },
  { name: "an unclosed backtick fence protects everything after it", draft: `# before\n${F3}\n# in\n## also in`, offset: 1, expected: `## before\n${F3}\n# in\n## also in` },
  { name: "an unclosed tilde fence protects everything after it", draft: "# before\n~~~\n# in", offset: 1, expected: "## before\n~~~\n# in" },
  { name: "headings between two fenced blocks shift, headings inside do not", draft: `${F3}\n# a\n${F3}\n# mid\n${F3}\n# b\n${F3}`, offset: 1, expected: `${F3}\n# a\n${F3}\n## mid\n${F3}\n# b\n${F3}` },
  { name: "negative offset also spares fenced headings", draft: `### out\n${F3}\n### in\n${F3}`, offset: -1, expected: `## out\n${F3}\n### in\n${F3}` },
  { name: "a backtick line whose info text holds a backtick is not a fence opener", draft: `${F3}x${F3}\n# a`, offset: 1, expected: `${F3}x${F3}\n## a` },
  { name: "a backtick line with a code span in its info text is not a fence opener", draft: `# a\n${F3}js \`y\`\n## b`, offset: 1, expected: `## a\n${F3}js \`y\`\n### b` },
  { name: "a tilde fence's info text may hold a backtick", draft: "~~~x`y\n# in\n~~~\n# out", offset: 1, expected: "~~~x`y\n# in\n~~~\n## out" },
  { name: "CRLF fenced block is spared",draft: `# a\r\n${F3}\r\n# in\r\n${F3}\r\n# b`, offset: 1, expected: `## a\r\n${F3}\r\n# in\r\n${F3}\r\n## b` },
];

describe("ho-offset: heading_offset shifts ATX headings, clamped to 1 through 6, sparing fenced code", () => {
  it.each(cases)("ho-offset: $name", (c) => {
    const res = ho(c.draft, c.offset);
    expect(res.output).toBe(c.expected);
    expect(res.ok).toBe(true);
    expect(res.diagnostics).toEqual([]);
  });

  it("ho-offset: applies per FOR iteration and after another filter", () => {
    const res = render("{{FOR xs AS d}}${{ d | trim | heading_offset=1 }}|{{END_FOR}}", { xs: ["  # a  ", "# b\n"] }, OFF);
    expect(res.output).toBe("## a|## b|");
    expect(res.ok).toBe(true);
  });

  it("ho-offset: chained before escape_md the heading shifts first", () => {
    // shifts to "## a", then escape_md puts a backslash before each #
    const res = render("${{ d | heading_offset=1 | escape_md }}", { d: "# a" }, OFF);
    expect(res.output).toBe("\\#\\# a");
    expect(res.ok).toBe(true);
  });

  it("ho-offset: only values piped through the filter shift", () => {
    const res = render("${{ d }}|${{ d | heading_offset=1 }}", { d: "# a" }, OFF);
    expect(res.output).toBe("# a|## a");
    expect(res.ok).toBe(true);
  });

  describe("errors", () => {
    interface ErrCase {
      name: string;
      template: string;
      line: number;
      column: number;
    }
    const errors: ErrCase[] = [
      { name: "missing parameter", template: "a\n  ${{ draft | heading_offset }}", line: 2, column: 3 },
      { name: "empty parameter", template: "a\n  ${{ draft | heading_offset= }}", line: 2, column: 3 },
      { name: "non-numeric parameter", template: "a\nb\n  ${{ draft | heading_offset=abc }}", line: 3, column: 3 },
      { name: "decimal parameter", template: "${{ draft | heading_offset=1.5 }}", line: 1, column: 1 },
      { name: "parameter with trailing junk", template: "${{ draft | heading_offset=2x }}", line: 1, column: 1 },
      { name: "missing parameter inside a FOR is located at the variable in the body", template: "a\n{{FOR xs AS i}}\n x${{ i | heading_offset }}\n{{END_FOR}}", line: 3, column: 3 },
    ];
    it.each(errors)("ho-offset: $name is a type-error at the variable", (c) => {
      const res = render(c.template, { draft: "# a", xs: ["# a"] }, OFF);
      expect(res.diagnostics[0]).toMatchObject({ code: "type-error", line: c.line, column: c.column });
      expect(res.ok).toBe(false);
      expect(res.output).toBe("");
    });
  });
});
