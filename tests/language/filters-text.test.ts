import { FILTER_REGISTRY, analyze, render, spec, validate } from "../../core/src";
import { TEXT_FILTERS } from "../../core/src/filters-text";

// Jest has no assertion-message argument; each test name states the behavior expected,
// and the red reason is read from the matcher's expected/received pair.
const RAW = { standaloneLines: false };
const LENIENT = { ...RAW, strictMode: false };
const STRICT = { ...RAW, strictMode: true };

const SIX = ["head", "tail", "trim", "escape_md", "fence", "heading_offset"];
const EIGHT = ["upper", "lower", "title", "replace", "indent", "quote", "round", "default"];

/** Marks a variable that is absent from the data. */
const MISSING = Symbol("missing");

/** Renders `${{ v | <call> }}` in lenient mode; the data holds `v` unless the row says it is missing. */
function run(call: string, value: unknown) {
  const data = value === MISSING ? {} : { v: value };
  return render("${{ v | " + call + " }}", data, LENIENT);
}

type Row = [label: string, value: unknown, expected: string];

const ARR = [1, 2, 3];
const OBJ = { a: 1, b: "x" };

function tableTests(name: string, call: string, rows: Row[]) {
  it.each(rows)("ft-text: " + name + " (" + call + "), %s", (_label, value, expected) => {
    const r = run(call, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });
}

describe("ft-text: the registry holds the eight text filters after the six", () => {
  it("ft-text: the registry names are the six existing filters then the eight new ones in order", () => {
    expect(FILTER_REGISTRY.slice(0, 6).map((f) => f.name)).toEqual(SIX);
    expect(FILTER_REGISTRY.slice(6, 14).map((f) => f.name)).toEqual(EIGHT);
  });

  it("ft-text: TEXT_FILTERS holds the eight names in order", () => {
    expect(TEXT_FILTERS.map((f) => f.name)).toEqual(EIGHT);
  });

  it("ft-text: declared parameter names are none, none, none, find and with, value, none, value, value", () => {
    const byName = Object.fromEntries(TEXT_FILTERS.map((f) => [f.name, f.paramNames]));
    expect(byName).toEqual({
      upper: [],
      lower: [],
      title: [],
      replace: ["find", "with"],
      indent: ["value"],
      quote: [],
      round: ["value"],
      default: ["value"],
    });
  });

  it("ft-text: spec lists the eight with a non-empty params text and description", () => {
    const listed = spec().filters.filter((f) => EIGHT.includes(f.name));
    expect(listed.map((f) => f.name)).toEqual(EIGHT);
    for (const f of listed) {
      expect(f.params.startsWith(f.name)).toBe(true);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });
});

describe("ft-text: upper", () => {
  tableTests("upper", "upper", [
    ["text", "abc Def", "ABC DEF"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 3.14159", 3.14159, "3.14159"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["boolean true", true, "TRUE"],
    ["boolean false", false, "FALSE"],
    ["array printed form", ARR, "[1,2,3]"],
    ["object printed form", OBJ, '{"A":1,"B":"X"}'],
    ["multi-line", "a\nb", "A\nB"],
    ["CRLF", "a\r\nb", "A\r\nB"],
    ["unicode", "éclair ñ", "ÉCLAIR Ñ"],
  ]);
});

describe("ft-text: lower", () => {
  tableTests("lower", "lower", [
    ["text", "ABC Def", "abc def"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 3.14159", 3.14159, "3.14159"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["boolean true", true, "true"],
    ["array printed form", ARR, "[1,2,3]"],
    ["object printed form", { A: 1, B: "X" }, '{"a":1,"b":"x"}'],
    ["multi-line", "A\nB", "a\nb"],
    ["CRLF", "A\r\nB", "a\r\nb"],
    ["unicode", "ÉCLAIR Ñ", "éclair ñ"],
  ]);
});

describe("ft-text: title", () => {
  tableTests("title", "title", [
    ["rest of each word lower-cased", "hello WORLD", "Hello World"],
    ["all caps", "HELLO", "Hello"],
    ["already titled", "Hello World", "Hello World"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 3.14159", 3.14159, "3.14159"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["boolean true", true, "True"],
    ["boolean false", false, "False"],
    ["array printed form", ARR, "[1,2,3]"],
    ["whitespace kept as is", "  hello   wORLD  ", "  Hello   World  "],
    ["line break separates words", "ab\ncD", "Ab\nCd"],
    ["CRLF separates words", "ab\r\ncD", "Ab\r\nCd"],
    ["apostrophe is not a word break", "o'NEIL", "O'neil"],
    ["hyphen is not a word break", "hello-WORLD", "Hello-world"],
    ["unicode", "éCLAIR ñANDÚ", "Éclair Ñandú"],
  ]);
});

describe("ft-text: replace", () => {
  tableTests("replace", 'replace:find="a",with="b"', [
    ["every occurrence", "banana", "bbnbnb"],
    ["adjacent occurrences", "aaa", "bbb"],
    ["no occurrence", "xyz", "xyz"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["matching is case sensitive", "Aa", "Ab"],
    ["boolean false coerced to text", false, "fblse"],
    ["array printed form", [1, "a"], '[1,"b"]'],
    ["object printed form", OBJ, '{"b":1,"b":"x"}'],
    ["CRLF kept", "a\r\nb", "b\r\nb"],
    ["multi-line", "a\na", "b\nb"],
    ["unicode", "ààb", "ààb"],
  ]);

  tableTests("replace", 'replace:find="1",with="7"', [
    ["number 3.14159 coerced to text", 3.14159, "3.74759"],
    ["number 1000000", 1000000, "7000000"],
  ]);

  tableTests("replace", 'replace:find="é",with="e"', [["unicode find", "éé x", "ee x"]]);
  tableTests("replace", 'replace:find="r",with="R"', [["boolean true coerced to text", true, "tRue"]]);

  tableTests("replace", 'replace:find="aa",with="b"', [
    ["non-overlapping, four a", "aaaa", "bb"],
    ["non-overlapping, three a", "aaa", "ba"],
  ]);

  tableTests("replace", 'replace:find="a"', [
    ["with omitted deletes", "banana", "bnn"],
    ["with omitted on empty text", "", ""],
  ]);

  tableTests("replace", 'replace:find="a",with=""', [["with empty deletes", "banana", "bnn"]]);

  tableTests("replace", 'replace:find=".",with="!"', [
    ["find is literal text, dots only", "a.b.c", "a!b!c"],
    ["a dot does not match any character", "abc", "abc"],
  ]);

  tableTests("replace", 'replace:find="(x)",with="y"', [
    ["find with pattern characters is literal", "a(x)b x", "ayb x"],
  ]);

  tableTests("replace", 'replace:find="a",with="$&$&"', [
    ["with is literal, no special replacement patterns", "banana", "b$&$&n$&$&n$&$&"],
  ]);

  tableTests("replace", 'replace:find="*",with="-"', [["find with a star is literal", "a*b**", "a-b--"]]);

  it("ft-text: replace chained after upper replaces in the upper-cased text", () => {
    const r = run('upper | replace:find="A",with="b"', "banana");
    expect(r.ok).toBe(true);
    expect(r.output).toBe("BbNbNb");
  });
});

describe("ft-text: indent", () => {
  tableTests("indent", "indent", [
    ["default is two spaces on every line", "a\nb", "  a\n  b"],
    ["single line", "a", "  a"],
    ["empty lines are left empty", "a\n\nb", "  a\n\n  b"],
    ["final line break does not gain spaces", "a\n", "  a\n"],
    ["only a line break", "\n", "\n"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 42", 42, "  42"],
    ["number 0", 0, "  0"],
    ["boolean true", true, "  true"],
    ["array printed form", ARR, "  [1,2,3]"],
    ["object printed form", OBJ, '  {"a":1,"b":"x"}'],
    ["CRLF lines kept and empty line left empty", "a\r\n\r\nb", "  a\r\n\r\n  b"],
    ["final CRLF does not gain spaces", "a\r\n", "  a\r\n"],
    ["a line of only a space is not empty", "a\n \nb", "  a\n   \n  b"],
    ["unicode", "é\nñ", "  é\n  ñ"],
  ]);

  tableTests("indent", "indent=4", [
    ["four spaces", "a\nb", "    a\n    b"],
    ["empty lines still empty", "a\n\nb\n", "    a\n\n    b\n"],
  ]);

  tableTests("indent", "indent=0", [["zero spaces leaves text unchanged", "a\n\nb", "a\n\nb"]]);

  tableTests("indent", 'indent="3"', [["a quoted count behaves like an unquoted one", "a", "   a"]]);

  tableTests("indent", "indent=100", [["the upper bound is allowed", "a", " ".repeat(100) + "a"]]);

  tableTests("indent", "indent=1", [["number input coerced to text", 3.14159, " 3.14159"]]);
});

describe("ft-text: quote", () => {
  const rows: Row[] = [
    ["text", "abc", '"abc"'],
    ["empty text", "", '""'],
    ["missing variable", MISSING, '""'],
    ["null", null, '""'],
    ["number 3.14159", 3.14159, '"3.14159"'],
    ["number 0", 0, '"0"'],
    ["number 1000000", 1000000, '"1000000"'],
    ["boolean true", true, '"true"'],
    ["boolean false", false, '"false"'],
    ["array printed form", ARR, JSON.stringify("[1,2,3]")],
    ["object printed form", OBJ, JSON.stringify('{"a":1,"b":"x"}')],
    ["double quotes escaped", 'say "hi"', JSON.stringify('say "hi"')],
    ["backslash escaped", "a\\b", JSON.stringify("a\\b")],
    ["line break escaped", "a\nb", JSON.stringify("a\nb")],
    ["CRLF escaped", "a\r\nb", JSON.stringify("a\r\nb")],
    ["tab escaped", "a\tb", JSON.stringify("a\tb")],
    ["control character escaped", "a\u0001b", JSON.stringify("a\u0001b")],
    ["unicode kept", "éclair ñ", JSON.stringify("éclair ñ")],
  ];
  tableTests("quote", "quote", rows);

  it("ft-text: quote output parses back to the coerced text", () => {
    const r = run("quote", 'x "y" \\ \n\t');
    expect(r.ok).toBe(true);
    expect(JSON.parse(r.output)).toBe('x "y" \\ \n\t');
  });
});

describe("ft-text: round", () => {
  tableTests("round", "round", [
    ["default zero places", 3.14159, "3"],
    ["half rounds up", 2.5, "3"],
    ["negative half rounds away from zero", -2.5, "-3"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["string number", "3.7", "4"],
    ["text half", "0.5", "1"],
    ["negative text half", "-0.5", "-1"],
    ["1.5", "1.5", "2"],
    ["-1.5", "-1.5", "-2"],
    ["negative zero prints 0", -0.4, "0"],
    ["negative zero text prints 0", "-0", "0"],
    ["not a number passes through", "abc", "abc"],
    ["empty text passes through", "", ""],
    ["missing variable gives empty text", MISSING, ""],
    ["null gives empty text", null, ""],
    ["boolean true is not a number", true, "true"],
    ["boolean false is not a number", false, "false"],
    ["array is not a number", ARR, "[1,2,3]"],
    ["object is not a number", OBJ, '{"a":1,"b":"x"}'],
    ["Infinity is not finite", "Infinity", "Infinity"],
    ["NaN is not finite", "NaN", "NaN"],
    ["1e400 overflows and passes through", "1e400", "1e400"],
    ["-1e400 overflows and passes through", "-1e400", "-1e400"],
    ["1e300000000 passes through", "1e300000000", "1e300000000"],
    ["1e-999999999 passes through", "1e-999999999", "1e-999999999"],
    ["finite exponent still rounds", "1.5e2", "150"],
  ]);

  tableTests("round", "round=2", [
    ["number 3.14159", 3.14159, "3.14"],
    ["1.005 rounds in decimal arithmetic", 1.005, "1.01"],
    ["1.005 as text", "1.005", "1.01"],
    ["2.675 rounds in decimal arithmetic", "2.675", "2.68"],
    ["-1.005 rounds away from zero", "-1.005", "-1.01"],
    ["pads to exactly two decimals", 3.1, "3.10"],
    ["integer padded", "10", "10.00"],
    ["zero padded", 0, "0.00"],
    ["empty text passes through", "", ""],
    ["not a number passes through", "abc", "abc"],
  ]);

  tableTests("round", "round=1", [
    ["0.05 rounds up", "0.05", "0.1"],
    ["large value", "1234567.891", "1234567.9"],
    ["1000000", 1000000, "1000000.0"],
  ]);

  tableTests("round", "round=0", [["explicit zero", "2.5", "3"]]);
  tableTests("round", 'round="2"', [["quoted places", "3.14159", "3.14"]]);
  tableTests("round", "round=20", [["twenty places is allowed", "0.1", "0.10000000000000000000"]]);

  it("ft-text: round then quote chains", () => {
    const r = run("round=1 | quote", 3.14159);
    expect(r.ok).toBe(true);
    expect(r.output).toBe('"3.1"');
  });

  it("ft-text: round passes text through to quote unchanged", () => {
    const r = run("round=1 | quote", "abc");
    expect(r.ok).toBe(true);
    expect(r.output).toBe('"abc"');
  });
});

describe("ft-text: existing filters keep their output", () => {
  const rows: [string, string, unknown, string][] = [
    ["trim", "trim", "  a  ", "a"],
    ["head=2", "head=2", "abc", "ab"],
    ["tail=2", "tail=2", "abc", "bc"],
    ["escape_md", "escape_md", "*a*", "\\*a\\*"],
    ["fence", "fence=js", "x", "```js\nx\n```\n"],
    ["heading_offset=1", "heading_offset=1", "# T", "## T"],
    ["trim then upper", "trim | upper", "  ab ", "AB"],
    ["upper then head", "upper | head=2", "abc", "AB"],
  ];
  it.each(rows)("ft-text: %s", (_n, call, value, expected) => {
    const r = run(call, value);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });
});

// Located at the variable: line 2, column 3 proves the location is not a default 1:1.
const TEXT_ERROR_CALLS: [string, string][] = [
  ["replace without find", "replace"],
  ["replace with only with", 'replace:with="b"'],
  ["replace with an empty find", 'replace:find=""'],
  ["replace with an undeclared name", 'replace:find="a",x=1'],
  ["replace with find, with and an undeclared name", 'replace:find="a",with="b",x=1'],
  ["replace with the shorthand value", "replace=a"],
  ["indent=x", "indent=x"],
  ["indent=1.5", "indent=1.5"],
  ["indent=-1", "indent=-1"],
  ["indent=101", "indent=101"],
  ["indent with an empty value", 'indent=""'],
  ["indent:x=1", "indent:x=1"],
  ["round=x", "round=x"],
  ["round=1.5", "round=1.5"],
  ["round=-1", "round=-1"],
  ["round=21", "round=21"],
  ["round with an empty value", 'round=""'],
  ["round:x=1", "round:x=1"],
  ["default without a value", "default"],
  ["default:x=1", 'default:x="1"'],
  ["upper=1", "upper=1"],
  ["upper:x=1", "upper:x=1"],
  ["lower=1", "lower=1"],
  ["lower:x=1", "lower:x=1"],
  ["title=1", "title=1"],
  ["title:x=1", "title:x=1"],
  ["quote=1", "quote=1"],
  ["quote:x=1", "quote:x=1"],
];

// A static check has no data, so it can only know a parameter name the filter does not declare;
// a missing or malformed parameter value is found when the filter runs.
const UNDECLARED_CALLS = TEXT_ERROR_CALLS.filter(([n]) =>
  [
    "replace with an undeclared name",
    "replace with find, with and an undeclared name",
    "replace with the shorthand value",
    "indent:x=1",
    "round:x=1",
    "default:x=1",
    "upper=1",
    "upper:x=1",
    "lower=1",
    "lower:x=1",
    "title=1",
    "title:x=1",
    "quote=1",
    "quote:x=1",
  ].includes(n)
);

describe.each([
  ["lenient", LENIENT],
  ["strict", STRICT],
])("ft-params: %s mode", (_mode, options) => {
  it.each(TEXT_ERROR_CALLS)("ft-params: a bad or missing parameter is a type-error at the variable, %s", (_n, call) => {
    const template = "intro\n  ${{ v | " + call + " }}";
    const r = render(template, { v: "x" }, options);
    expect(r.ok).toBe(false);
    expect(r.output).toBe("");
    expect(r.diagnostics[0]?.code).toBe("type-error");
    expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({ line: 2, column: 3 });
  });

  it.each(UNDECLARED_CALLS)("ft-params: validate and analyze agree with render on an undeclared parameter, %s", (_n, call) => {
    const template = "intro\n  ${{ v | " + call + " }}";
    const v = validate(template);
    expect(v.ok).toBe(false);
    expect(v.diagnostics[0]).toMatchObject({ severity: "error", code: "type-error", line: 2, column: 3 });
    const a = analyze(template).diagnostics[0];
    expect(a).toMatchObject({ code: "type-error", line: 2, column: 3 });
    const r = render(template, { v: "x" }, options);
    expect(a?.message).toBe(r.diagnostics[0]?.message);
  });
});

describe("ft-params: valid calls give no diagnostic", () => {
  const valid = [
    "upper",
    "lower",
    "title",
    "quote",
    'replace:find="a"',
    'replace:find="a",with="b"',
    'replace:find="a",with=""',
    "indent",
    "indent=0",
    "indent=100",
    "round",
    "round=0",
    "round=20",
    'default="x"',
    "default=x",
  ];
  it.each(valid)("ft-params: %s is accepted by validate and analyze", (call) => {
    const template = "intro\n  ${{ v | " + call + " }}";
    expect(validate(template).ok).toBe(true);
    expect(analyze(template).diagnostics).toEqual([]);
  });
});

describe("ft-default: default replaces a value that is not truthy", () => {
  const rows: Row[] = [
    ["missing variable in lenient mode", MISSING, "X"],
    ["null", null, "X"],
    ["empty text", "", "X"],
    ["number 0", 0, "X"],
    ["boolean false", false, "X"],
    ["empty list", [], "X"],
    ["empty object", {}, "X"],
    ["the text 0 (as ?? treats it today)", "0", "X"],
    ["the text false (as ?? treats it today)", "false", "X"],
    ["non-empty text", "hi", "hi"],
    ["number 1", 1, "1"],
    ["number 3.14159", 3.14159, "3.14159"],
    ["boolean true", true, "true"],
    ["non-empty list", [1], "[1]"],
    ["non-empty object", { a: 1 }, '{"a":1}'],
  ];
  tableTests("default", 'default="X"', rows);
  tableTests("default", "default=X", rows.slice(0, 2).concat(rows.slice(9, 10)));
  tableTests("default", 'default:value="X"', rows.slice(0, 2).concat(rows.slice(9, 10)));

  tableTests("default", 'default="n/a" | upper', [
    ["default then upper, falsy", null, "N/A"],
    ["default then upper, truthy", "hi", "HI"],
  ]);
  tableTests("default", 'upper | default="x"', [["falsy after upper", MISSING, "x"]]);
  tableTests("default", 'trim | default="x"', [["a blank value trimmed to empty text", "   ", "x"]]);

  it("ft-default: the replacement is printed as given, not as the input", () => {
    const r = run('default="a b"', 0);
    expect(r.ok).toBe(true);
    expect(r.output).toBe("a b");
  });
});

describe("ft-default: ?? keeps its current behaviour", () => {
  const rows: Row[] = [
    ["missing variable", MISSING, "X"],
    ["null", null, "X"],
    ["empty text", "", "X"],
    ["number 0", 0, "X"],
    ["boolean false", false, "X"],
    ["empty list", [], "X"],
    ["empty object", {}, "X"],
    ["the text 0", "0", "X"],
    ["the text false", "false", "X"],
    ["blank text", "  ", "X"],
    ["non-empty text", "hi", "hi"],
    ["number 1", 1, "1"],
    ["boolean true", true, "true"],
    ["non-empty list", [1], "[1]"],
    ["non-empty object", { a: 1 }, '{"a":1}'],
  ];

  it.each(rows)("ft-default: v ?? \"X\", %s", (_label, value, expected) => {
    const data = value === MISSING ? {} : { v: value };
    const r = render('${{ v ?? "X" }}', data, LENIENT);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("ft-default: in strict mode ?? covers a missing variable", () => {
    const r = render('${{ m ?? "X" }}', {}, STRICT);
    expect(r.ok).toBe(true);
    expect(r.output).toBe("X");
  });

  it("ft-default: in strict mode the default filter reports the missing variable first", () => {
    const r = render('${{ m | default="X" }}', {}, STRICT);
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("missing-variable");
  });

  it("ft-default: the default filter and ?? agree on every shared lenient row", () => {
    for (const [label, value] of rows) {
      const data = value === MISSING ? {} : { v: value };
      const viaFilter = render('${{ v | default="X" }}', data, LENIENT);
      const viaOperator = render('${{ v ?? "X" }}', data, LENIENT);
      if (label === "blank text") continue;
      expect(viaFilter.output).toBe(viaOperator.output);
    }
  });
});
