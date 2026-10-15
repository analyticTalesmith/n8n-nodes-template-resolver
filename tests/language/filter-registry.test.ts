import {
  FILTERS,
  FILTER_REGISTRY,
  Lexer,
  Parser,
  analyze,
  parseFilter,
  render,
  resolveTemplate,
  spec,
  validate,
} from "../../core/src";
import { FilterCall, FilterDefinition, VariableNode } from "../../core/src/types";
import { TEXT_FILTERS } from "../../core/src/filters-text";
import { COLLECTION_FILTERS } from "../../core/src/filters-collection";

// Jest has no assertion-message argument; each test name states the behavior expected,
// and the red reason is read from the matcher's expected/received pair.
const RAW = { standaloneLines: false };
const SIX = ["head", "tail", "trim", "escape_md", "fence", "heading_offset"];

// Definitions a test pushes into the shared registry; afterEach takes them out again.
const pushed: FilterDefinition[] = [];

function register(def: FilterDefinition): FilterDefinition {
  FILTER_REGISTRY.push(def);
  pushed.push(def);
  return def;
}

afterEach(() => {
  for (const def of pushed.splice(0)) {
    const at = FILTER_REGISTRY.indexOf(def);
    if (at >= 0) FILTER_REGISTRY.splice(at, 1);
  }
});

function shout(): FilterDefinition {
  return {
    name: "shout",
    params: "shout",
    description: "d",
    paramNames: [],
    apply: (v) => String(v).toUpperCase(),
  };
}

/** A probe filter that records every input and parameter set it receives; returns the input unless told otherwise. */
function probe(paramNames: string[], returns?: unknown) {
  const inputs: unknown[] = [];
  const paramSets: Record<string, string>[] = [];
  register({
    name: "probe",
    params: "probe",
    description: "records what it receives",
    paramNames,
    apply: (input, params) => {
      inputs.push(input);
      paramSets.push(params);
      return returns === undefined ? input : returns;
    },
  });
  return { inputs, paramSets };
}

function variableNode(source: string): VariableNode {
  const ast = new Parser(new Lexer(source).tokenize()).parse();
  return ast.body.find((n) => n.type === "Variable") as VariableNode;
}

describe("fr-registry: one table feeds render, spec and analyze", () => {
  const TEMPLATE = "${{ a | shout }}";

  it("fr-registry: before a definition is pushed the filter is unknown everywhere", () => {
    const r = render(TEMPLATE, { a: "x" });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("unknown-filter");
    expect(validate(TEMPLATE).ok).toBe(false);
    expect(analyze(TEMPLATE).diagnostics.map((d) => d.code)).toContain("unknown-filter");
    expect(spec().filters.map((f) => f.name)).not.toContain("shout");
  });

  it("fr-registry: a pushed definition is rendered with no other change", () => {
    register(shout());
    const r = render(TEMPLATE, { a: "x" });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("X");
  });

  it("fr-registry: a pushed definition is listed by spec with exactly name, params and description", () => {
    register(shout());
    const entry = spec().filters.find((f) => f.name === "shout");
    expect(entry).toBeDefined();
    expect(Object.keys(entry!).sort()).toEqual(["description", "name", "params"]);
    expect(JSON.parse(JSON.stringify(entry))).toEqual({
      name: "shout",
      params: "shout",
      description: "d",
    });
  });

  it("fr-registry: a pushed definition is accepted and counted by analyze and validate", () => {
    register(shout());
    const a = analyze(TEMPLATE);
    expect(a.diagnostics.map((d) => d.code)).not.toContain("unknown-filter");
    expect(a.filters).toContainEqual({ name: "shout", count: 1 });
    expect(validate(TEMPLATE).ok).toBe(true);
    expect(analyze("${{ a | shout }} ${{ b | shout }}").filters).toContainEqual({
      name: "shout",
      count: 2,
    });
  });

  it("fr-registry: after removal the filter is unknown again, nothing is cached at load", () => {
    const def = register(shout());
    expect(render(TEMPLATE, { a: "x" }).ok).toBe(true);
    FILTER_REGISTRY.splice(FILTER_REGISTRY.indexOf(def), 1);
    expect(render(TEMPLATE, { a: "x" }).ok).toBe(false);
    expect(validate(TEMPLATE).ok).toBe(false);
    expect(spec().filters.map((f) => f.name)).not.toContain("shout");
  });

  it("fr-registry: spec filter names equal the registry names in order", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    expect(spec().filters.map((f) => f.name)).toEqual(FILTER_REGISTRY.map((f) => f.name));
  });

  it("fr-registry: FILTERS names equal the registry names in order", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    expect(FILTERS.map((f) => f.name)).toEqual(FILTER_REGISTRY.map((f) => f.name));
  });
});

describe("fr-values: filters receive and return values", () => {
  const ARR = [1, 2, 3];
  const OBJ = { a: 1, b: "x" };

  const inputRows: [string, unknown][] = [
    ["array keeps identity", ARR],
    ["object keeps identity", OBJ],
    ["number stays a number", 42],
    ["string stays a string", "text"],
    ["boolean stays a boolean", true],
  ];

  it.each(inputRows)("fr-values: probe input, %s", (_n, value) => {
    const p = probe([]);
    render("${{ x | probe }}", { x: value }, RAW);
    expect(p.inputs).toHaveLength(1);
    expect(typeof p.inputs[0]).toBe(typeof value);
    expect(p.inputs[0] === value).toBe(true);
  });

  it.each(inputRows)("fr-values: a returned value prints as it would unfiltered, %s", (_n, value) => {
    probe([]);
    const filtered = render("${{ x | probe }}", { x: value }, RAW);
    const plain = render("${{ x }}", { x: value }, RAW);
    expect(filtered.ok).toBe(true);
    expect(filtered.output).toBe(plain.output);
  });

  it.each<[string, unknown]>([
    ["array", [1, 2]],
    ["object", { k: "v" }],
    ["number", 5],
  ])("fr-values: a returned %s is printed without being flattened to a string first", (_n, returned) => {
    probe([], returned);
    const filtered = render("${{ x | probe }}", { x: "ignored" }, RAW);
    const plain = render("${{ y }}", { y: returned }, RAW);
    expect(filtered.ok).toBe(true);
    expect(filtered.output).toBe(plain.output);
  });

  // Expected values were observed from today's output, row by row.
  const DATA: Record<string, unknown> = {
    number: 12345,
    array: [1, 2, 3],
    object: { a: 1, b: "x" },
    boolean: true,
    nul: null,
    text: "  - Hello *w*  ",
  };
  const EXPECTED: Record<string, Record<string, string>> = {
    "head=3": {
      number: "123",
      array: "[1,",
      object: '{"a',
      boolean: "tru",
      nul: "",
      text: "  -",
    },
    "tail=3": {
      number: "345",
      array: ",3]",
      object: 'x"}',
      boolean: "rue",
      nul: "",
      text: "*  ",
    },
    trim: {
      number: "12345",
      array: "[1,2,3]",
      object: '{"a":1,"b":"x"}',
      boolean: "true",
      nul: "",
      text: "- Hello *w*",
    },
    escape_md: {
      number: "12345",
      array: "\\[1,2,3\\]",
      object: '{"a":1,"b":"x"}',
      boolean: "true",
      nul: "",
      text: "  - Hello \\*w\\*  ",
    },
    fence: {
      number: "```\n12345\n```\n",
      array: "```\n[1,2,3]\n```\n",
      object: '```\n{"a":1,"b":"x"}\n```\n',
      boolean: "```\ntrue\n```\n",
      nul: "```\n\n```\n",
      text: "```\n  - Hello *w*  \n```\n",
    },
    "heading_offset=1": {
      number: "12345",
      array: "[1,2,3]",
      object: '{"a":1,"b":"x"}',
      boolean: "true",
      nul: "",
      text: "  - Hello *w*  ",
    },
  };
  const rows: [string, string, string][] = [];
  for (const [filter, byKind] of Object.entries(EXPECTED)) {
    for (const [kind, out] of Object.entries(byKind)) rows.push([filter, kind, out]);
  }

  it.each(rows)("fr-values: %s on %s data prints what it printed before", (filter, kind, expected) => {
    const r = render("${{ v | " + filter + " }}", { v: DATA[kind] }, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  const chainRows: [string, string, unknown, string][] = [
    ["trim then head", "${{ v | trim | head=4 }}", "  - Hello *w*  ", "- He"],
    ["head then trim on an array", "${{ v | head=3 | trim }}", [1, 2, 3], "[1,"],
    ["heading_offset then head", "${{ v | heading_offset=1 | head=6 }}", "# T\n## U", "## T\n#"],
    ["heading_offset on headings", "${{ v | heading_offset=1 }}", "# T\n## U", "## T\n### U"],
  ];
  it.each(chainRows)("fr-values: chained filters, %s", (_n, template, value, expected) => {
    const r = render(template, { v: value }, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("fr-values: a quoted head count behaves like an unquoted one", () => {
    expect(render('${{ v | head="3" }}', { v: "abcdef" }, RAW).output).toBe("abc");
    expect(render("${{ v | head=3 }}", { v: "abcdef" }, RAW).output).toBe("abc");
  });
});

describe("fr-args: filter calls are parsed once, quote-aware", () => {
  const parseRows: [string, string, FilterCall[]][] = [
    ['fence="a=b"', '${{ v | fence="a=b" }}', [{ name: "fence", params: { value: "a=b" } }]],
    ['fence="a:b"', '${{ v | fence="a:b" }}', [{ name: "fence", params: { value: "a:b" } }]],
    ["fence='c++'", "${{ v | fence='c++' }}", [{ name: "fence", params: { value: "c++" } }]],
    ["fence=js", "${{ v | fence=js }}", [{ name: "fence", params: { value: "js" } }]],
    ["head=3", "${{ v | head=3 }}", [{ name: "head", params: { value: "3" } }]],
    ['head="3"', '${{ v | head="3" }}', [{ name: "head", params: { value: "3" } }]],
    ["trim", "${{ v | trim }}", [{ name: "trim", params: {} }]],
    ['fence="a|b"', '${{ v | fence="a|b" }}', [{ name: "fence", params: { value: "a|b" } }]],
    [
      "a pipe inside quotes then more filters",
      '${{ v | fence="a|b" | head=3 | trim }}',
      [
        { name: "fence", params: { value: "a|b" } },
        { name: "head", params: { value: "3" } },
        { name: "trim", params: {} },
      ],
    ],
    [
      "named params with a comma and an equals sign inside quotes",
      '${{ v | probe:find="a, b",with="c=d" }}',
      [{ name: "probe", params: { find: "a, b", with: "c=d" } }],
    ],
  ];

  it.each(parseRows)("fr-args: parsed once, %s", (_n, source, expected) => {
    expect(variableNode(source).filters).toEqual(expected);
  });

  const renderRows: [string, string, string][] = [
    ['fence="a=b"', '${{ v | fence="a=b" }}', "```a=b\nx\n```\n"],
    ['fence="a:b"', '${{ v | fence="a:b" }}', "```a:b\nx\n```\n"],
    ["fence='c++'", "${{ v | fence='c++' }}", "```c++\nx\n```\n"],
    ["fence=js", "${{ v | fence=js }}", "```js\nx\n```\n"],
    ['fence="a|b"', '${{ v | fence="a|b" }}', "```a|b\nx\n```\n"],
  ];

  it.each(renderRows)("fr-args: rendered fence language, %s", (_n, template, expected) => {
    const r = render(template, { v: "x" }, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("fr-args: a probe with declared names receives exactly its parsed parameters", () => {
    const p = probe(["find", "with"]);
    const r = render('${{ v | probe:find="a, b",with="c=d" }}', { v: "x" }, RAW);
    expect(r.ok).toBe(true);
    expect(p.paramSets).toEqual([{ find: "a, b", with: "c=d" }]);
  });

  it("fr-args: parseFilter keeps the shapes it always returned", () => {
    expect(parseFilter("trim")).toEqual({ name: "trim", params: {} });
    expect(parseFilter("  head = 100  ")).toEqual({ name: "head", params: { value: "100" } });
    expect(parseFilter('head="100"')).toEqual({ name: "head", params: { value: "100" } });
    expect(parseFilter('replace:find="a=b",with="c, d"')).toEqual({
      name: "replace",
      params: { find: "a=b", with: "c, d" },
    });
  });

  it("fr-args: plain escape_md modes still work", () => {
    const src = "- x *y*\n# h";
    expect(render("${{ v | escape_md=block }}", { v: src }, RAW).output).toBe("\\- x \\*y\\*\n\\# h");
    expect(render("${{ v | escape_md=inline }}", { v: src }, RAW).output).toBe("- x \\*y\\*\n\\# h");
  });

  // Located at the variable; a variable on line 2 column 3 proves the location is not a default 1:1.
  const noParams = (): FilterDefinition => ({
    name: "probe",
    params: "probe",
    description: "d",
    paramNames: [],
    apply: (v) => v,
  });
  const errorRows: [string, string, number, number, (() => FilterDefinition) | null][] = [
    ["escape_md:mode=block", "${{ v | escape_md:mode=block }}", 1, 1, null],
    ["escape_md:mode=block on line 2", "intro\n  ${{ v | escape_md:mode=block }}", 2, 3, null],
    ["head:count=2", "intro\n  ${{ v | head:count=2 }}", 2, 3, null],
    ["head with value plus an undeclared name", "intro\n  ${{ v | head:value=3,count=2 }}", 2, 3, null],
    ["fence:lang=js", "intro\n  ${{ v | fence:lang=js }}", 2, 3, null],
    ["trim:x=1", "intro\n  ${{ v | trim:x=1 }}", 2, 3, null],
    ["probe with no declared names, probe:x=1", "intro\n  ${{ v | probe:x=1 }}", 2, 3, noParams],
  ];

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each(errorRows)(
      "fr-args: an undeclared parameter is a type-error at the variable, %s",
      (_n, template, line, column, make) => {
        if (make) register(make());
        const r = render(template, { v: "x" }, { ...RAW, strictMode });
        expect(r.ok).toBe(false);
        expect(r.output).toBe("");
        expect(r.diagnostics[0]?.code).toBe("type-error");
        expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
          line,
          column,
        });
      }
    );
  });
});

describe("fr-default-quote: an unterminated quote in a default does not swallow the filters", () => {
  const rows: [string, string, string][] = [
    ["an apostrophe that never closes", "${{x ?? '90s hits | head=3}}", "'90"],
    ["a double quote that never closes", '${{x ?? "abc | trim}}', '"abc'],
    ["a closed quoted default keeps its pipe", '${{x ?? "a | b" | head=3}}', "a |"],
    ["a closed single-quoted default", "${{x ?? 'it' | head=1}}", "i"],
  ];

  it.each(rows)("fr-default-quote: render, %s", (_n, template, expected) => {
    const r = render(template, {}, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it.each(rows)("fr-default-quote: resolveTemplate lenient, %s", (_n, template, expected) => {
    expect(resolveTemplate(template, new Map(), { strictMode: false })).toBe(expected);
  });
});

describe("fr-groups: filter groups feed the registry", () => {
  it("fr-groups: both groups are arrays", () => {
    expect(Array.isArray(TEXT_FILTERS)).toBe(true);
    expect(Array.isArray(COLLECTION_FILTERS)).toBe(true);
  });

  it("fr-groups: the first six registry entries are the existing filters in order", () => {
    expect(FILTER_REGISTRY.slice(0, 6).map((f) => f.name)).toEqual(SIX);
  });

  it("fr-groups: the registry is the six plus both groups", () => {
    expect(FILTER_REGISTRY.length).toBe(6 + TEXT_FILTERS.length + COLLECTION_FILTERS.length);
    expect(FILTER_REGISTRY.slice(6)).toEqual([...TEXT_FILTERS, ...COLLECTION_FILTERS]);
  });

  it("fr-groups: every definition has name, params, description, paramNames and apply", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    const shapes = FILTER_REGISTRY.map((d) => [
      typeof d.name,
      typeof d.params,
      typeof d.description,
      Array.isArray(d.paramNames),
      typeof d.apply,
    ]);
    expect(shapes).toEqual(
      FILTER_REGISTRY.map(() => ["string", "string", "string", true, "function"])
    );
  });

  it("fr-groups: names are unique", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    const names = FILTER_REGISTRY.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("fr-groups: declared parameter names of the six existing filters", () => {
    const byName = Object.fromEntries(FILTER_REGISTRY.map((f) => [f.name, f.paramNames]));
    expect(byName).toMatchObject({
      head: ["value"],
      tail: ["value"],
      trim: [],
      escape_md: ["value"],
      fence: ["value"],
      heading_offset: ["value"],
    });
  });
});
