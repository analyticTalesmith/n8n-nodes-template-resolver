import { render } from "../../core/src";

// Placeholders only, no block tags: the standalone option has no effect here.
// {standaloneLines:false} is passed to be explicit (`as any`: the option is not
// on RenderOptions in this branch).
const OFF = { standaloneLines: false } as any;

const esc = (mode: string | null, v: string) =>
  render(mode === null ? "${{ v | escape_md }}" : `\${{ v | escape_md=${mode} }}`, { v }, OFF);

// Inline escaping today: a backslash before each of  \ * _ [ ] ( ) # ` > ~ |
// Hand-derived from the character list; "-", "+", "." and "=" are NOT escaped inline.
const INLINE: [string, string][] = [
  ["plain text", "plain text"],
  ["a*b_c", "a\\*b\\_c"],
  ["[x](y)", "\\[x\\]\\(y\\)"],
  ["# h", "\\# h"],
  ["> q", "\\> q"],
  ["a|b", "a\\|b"],
  ["`c` ~d~", "\\`c\\` \\~d\\~"],
  ["back\\slash", "back\\\\slash"],
  ["- item\n+ plus\n1. one\n---", "- item\n+ plus\n1. one\n---"],
];

describe("em-modes: plain escape_md and escape_md=inline keep today's escaping; block differs", () => {
  it.each(INLINE)("em-modes: inline %j", (input, expected) => {
    const plain = esc(null, input);
    expect(plain.output).toBe(expected);
    expect(plain.ok).toBe(true);
    const inline = esc("inline", input);
    expect(inline.output).toBe(expected);
    expect(inline.ok).toBe(true);
    // mode names are validated (so "inline" is a real mode, not an ignored argument)
    const bad = esc("nosuchmode", input);
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics[0]).toMatchObject({ code: "type-error" });
  });

  it("em-modes: a quoted mode name is the same as a bare one", () => {
    const res = render('${{ v | escape_md="block" }}', { v: "- x" }, OFF);
    expect(res.output).toBe("\\- x");
    expect(res.ok).toBe(true);
  });
});

// One line each, where block must add a backslash that inline does not.
const BLOCK_SINGLE: [string, string][] = [
  ["- item", "\\- item"],
  ["+ item", "\\+ item"],
  ["---", "\\---"],
  ["-----", "\\-----"],
  ["===", "\\==="],
  ["=====", "\\====="],
];

describe("em-modes: escape_md=block escapes line starts so a value cannot fake structure", () => {
  it.each(BLOCK_SINGLE)("em-modes: block on a single line %j", (input, expected) => {
    const res = esc("block", input);
    expect(res.output).toBe(expected);
    expect(res.ok).toBe(true);
    // the same value in the default mode is NOT escaped at the line start
    expect(esc("inline", input).output).toBe(input);
  });

  // Where inline already puts a backslash on the first character (hash, greater-than, star, pipe,
  // backticks, tildes) block must not add a second one.
  const ALREADY: [string, string][] = [
    ["# h", "\\# h"],
    ["## h", "\\#\\# h"],
    ["> q", "\\> q"],
    ["* b", "\\* b"],
    ["| a | b |", "\\| a \\| b \\|"],
    ["```", "\\`\\`\\`"],
    ["~~~", "\\~\\~\\~"],
  ];

  it("em-modes: block on a value whose first char inline already escapes adds no second backslash", () => {
    const outs = ALREADY.map(([input]) => esc("block", input).output);
    expect(outs).toEqual(ALREADY.map(([, expected]) => expected));
    // reaches here only once the block mode is accepted: it must also change a line inline leaves alone
    expect(esc("block", "- x").output).toBe("\\- x");
  });

  it("em-modes: a digit run followed by a dot or a parenthesis is escaped at the line start", () => {
    // The contract puts the backslash "before ... a digit run followed by . or )": either the
    // backslash before the digits or the conventional "1\." form is accepted here; plain text is not.
    const dot = esc("block", "1. one").output;
    expect(["1\\. one", "\\1. one"]).toContain(dot);
    const paren = esc("block", "2) two").output;
    expect(["2\\) two", "\\2\\) two"]).toContain(paren);
    const multi = esc("block", "10. ten").output;
    expect(["10\\. ten", "\\10. ten"]).toContain(multi);
  });

  it("em-modes: a digit run in the middle of a line is not escaped", () => {
    const res = esc("block", "- x\nversion 1. beta and 2) gamma");
    expect(res.output).toBe("\\- x\nversion 1. beta and 2\\) gamma");
  });

  it("em-modes: block escaping is applied to every line of a multi-line value", () => {
    const input = ["plain text", "- bullet", "+ plus", "---", "===", "```", "~~~", "# head", "> quote", "* star", "| pipe"].join("\n");
    const expected = [
      "plain text",
      "\\- bullet",
      "\\+ plus",
      "\\---",
      "\\===",
      "\\`\\`\\`",
      "\\~\\~\\~",
      "\\# head",
      "\\> quote",
      "\\* star",
      "\\| pipe",
    ].join("\n");
    const res = esc("block", input);
    expect(res.output).toBe(expected);
    expect(res.ok).toBe(true);
  });

  it("em-modes: block only changes line starts, ordinary lines get inline escaping and nothing more", () => {
    const res = esc("block", "plain text\nsecond a*b line\n- x\nmid - dash and + plus and --- three");
    expect(res.output).toBe("plain text\nsecond a\\*b line\n\\- x\nmid - dash and + plus and --- three");
  });

  it("em-modes: a dash or equals run that is only two long is not a rule line", () => {
    const res = esc("block", "- x\n==\n= y");
    // "- x" is a list marker; "==" and "= y" are not structure
    expect(res.output).toBe("\\- x\n==\n= y");
  });

  it("em-modes: a line break inside the value keeps the lines separate (CRLF stays CRLF)", () => {
    const res = esc("block", "a\r\n- b\r\n---");
    expect(res.output).toBe("a\r\n\\- b\r\n\\---");
  });

  it("em-modes: an empty value stays empty and plain text is unchanged in block mode", () => {
    expect(esc("block", "").output).toBe("");
    // a value that needs no escaping is the same in both modes; the second assertion makes this a red check
    expect(esc("block", "just words, 3.5 and 1-2").output).toBe("just words, 3.5 and 1-2");
    expect(esc("block", "- x").output).not.toBe("- x");
  });

  it("em-modes: block mode works per FOR item and after another filter", () => {
    const res = render("{{FOR xs AS i}}${{ i | trim | escape_md=block }}|{{END_FOR}}", { xs: ["  - a ", "b"] }, OFF);
    expect(res.output).toBe("\\- a|b|");
    expect(res.ok).toBe(true);
  });
});

describe("em-modes: any other mode is a type-error located at the variable", () => {
  interface ErrCase {
    name: string;
    template: string;
    line: number;
    column: number;
  }
  const errors: ErrCase[] = [
    { name: "unknown mode name", template: "a\n  ${{ v | escape_md=bogus }}", line: 2, column: 3 },
    { name: "empty mode", template: "${{ v | escape_md= }}", line: 1, column: 1 },
    { name: "a mode that is the wrong case", template: "x\ny\n  ${{ v | escape_md=BLOCK }}", line: 3, column: 3 },
    { name: "a numeric mode", template: "${{ v | escape_md=1 }}", line: 1, column: 1 },
    { name: "an unknown mode inside a FOR is located at the variable in the body", template: "a\n{{FOR xs AS i}}\n x${{ i | escape_md=html }}\n{{END_FOR}}", line: 3, column: 3 },
  ];
  it.each(errors)("em-modes: $name", (c) => {
    const res = render(c.template, { v: "x", xs: ["x"] }, OFF);
    expect(res.diagnostics[0]).toMatchObject({ code: "type-error", line: c.line, column: c.column });
    expect(res.ok).toBe(false);
    expect(res.output).toBe("");
  });
});
