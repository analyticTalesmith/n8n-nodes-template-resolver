import { FILTER_REGISTRY, analyze, render, validate } from "../../core/src";
import { COLLECTION_FILTERS } from "../../core/src/filters-collection";

// Jest has no assertion-message argument; each test name states the behavior expected,
// and the red reason is read from the matcher's expected/received pair.
const RAW = { standaloneLines: false };
const NAMES = ["join", "length", "first", "last", "sort", "unique", "slice", "lines", "json"];

function def(name: string) {
  const d = COLLECTION_FILTERS.find((f) => f.name === name);
  if (!d) throw new Error("no collection filter " + name);
  return d;
}

function out(template: string, v: unknown, strictMode = false) {
  return render(template, { v }, { ...RAW, strictMode });
}

describe("fc-collection: registry shape", () => {
  it("fc-collection: the nine rows are in order and feed the registry", () => {
    expect(COLLECTION_FILTERS.map((f) => f.name)).toEqual(NAMES);
    expect(FILTER_REGISTRY.slice(-NAMES.length).map((f) => f.name)).toEqual(NAMES);
  });

  it.each<[string, string, string[]]>([
    ["join", "join=SEP", ["value"]],
    ["length", "", []],
    ["first", "", []],
    ["last", "", []],
    ["sort", "sort[=key]", ["value"]],
    ["unique", "", []],
    ["slice", "slice[:start=N,end=N]", ["start", "end"]],
    ["lines", "", []],
    ["json", "", []],
  ])("fc-collection: %s declares its params text and names", (name, params, paramNames) => {
    expect(def(name).params).toBe(params);
    expect(def(name).paramNames).toEqual(paramNames);
    expect(def(name).description.length).toBeGreaterThan(0);
  });
});

describe("fc-collection: apply tables", () => {
  const V = (value: string) => ({ value });
  const rows: [string, string, unknown, Record<string, string>, unknown][] = [
    // join
    ["join", "array", ["a", "b", "c"], V(", "), "a, b, c"],
    ["join", "comma string", "a,b,c", V("-"), "a-b-c"],
    ["join", "JSON array string", '["x","y"]', V("+"), "x+y"],
    ["join", "element text forms", [1, null, { a: 1 }, [2]], V("|"), '1||{"a":1}|[2]'],
    ["join", "empty separator", ["a", "b"], V(""), "ab"],
    ["join", "empty list", [], V(","), ""],
    ["join", "null", null, V(","), ""],
    ["join", "undefined", undefined, V(","), ""],
    ["join", "number", 5, V(","), "5"],
    ["join", "boolean", true, V(","), "true"],
    ["join", "nested array", [[1, 2], [3]], V(";"), "[1,2];[3]"],
    // length
    ["length", "array", ["a", "b"], {}, 2],
    ["length", "comma string counts characters", "a,b,c", {}, 5],
    ["length", "object counts keys", { a: 1, b: 2, c: 3 }, {}, 3],
    ["length", "number text form", 12345, {}, 5],
    ["length", "boolean text form", true, {}, 4],
    ["length", "null", null, {}, 0],
    ["length", "undefined", undefined, {}, 0],
    ["length", "empty list", [], {}, 0],
    ["length", "empty string", "", {}, 0],
    ["length", "nested array counts top items", [[1, 2], [3]], {}, 2],
    // first
    ["first", "array", ["a", "b"], {}, "a"],
    ["first", "comma string", "a,b,c", {}, "a"],
    ["first", "JSON array string", '["x","y"]', {}, "x"],
    ["first", "empty list", [], {}, null],
    ["first", "null", null, {}, null],
    ["first", "undefined", undefined, {}, null],
    ["first", "number", 7, {}, 7],
    ["first", "boolean", true, {}, true],
    ["first", "nested array", [[1, 2], [3]], {}, [1, 2]],
    // last
    ["last", "array", ["a", "b"], {}, "b"],
    ["last", "comma string", "a,b,c", {}, "c"],
    ["last", "JSON array string", '["x","y"]', {}, "y"],
    ["last", "empty list", [], {}, null],
    ["last", "null", null, {}, null],
    ["last", "undefined", undefined, {}, null],
    ["last", "number", 7, {}, 7],
    ["last", "nested array", [[1, 2], [3, 4]], {}, [3, 4]],
    // slice
    ["slice", "start and end", ["a", "b", "c", "d"], { start: "1", end: "3" }, ["b", "c"]],
    ["slice", "no parameters copies the list", ["a", "b"], {}, ["a", "b"]],
    ["slice", "negative start", ["a", "b", "c", "d"], { start: "-2" }, ["c", "d"]],
    ["slice", "negative end", ["a", "b", "c", "d"], { end: "-1" }, ["a", "b", "c"]],
    ["slice", "start only", ["a", "b", "c"], { start: "2" }, ["c"]],
    ["slice", "end only", ["a", "b", "c"], { end: "2" }, ["a", "b"]],
    ["slice", "plus sign accepted", ["a", "b", "c"], { start: "+1" }, ["b", "c"]],
    ["slice", "past the end", ["a"], { start: "5" }, []],
    ["slice", "comma string", "a,b,c", { start: "1" }, ["b", "c"]],
    ["slice", "JSON array string", '["x","y","z"]', { end: "1" }, ["x"]],
    ["slice", "null", null, { start: "1" }, []],
    ["slice", "number is a one-item list", 5, {}, [5]],
    ["slice", "empty list", [], { start: "0", end: "2" }, []],
    // lines
    ["lines", "LF", "a\nb", {}, ["a", "b"]],
    ["lines", "CRLF", "a\r\nb", {}, ["a", "b"]],
    ["lines", "CR", "a\rb", {}, ["a", "b"]],
    ["lines", "one trailing break adds nothing", "a\nb\n", {}, ["a", "b"]],
    ["lines", "two trailing breaks add one empty", "a\n\n", {}, ["a", ""]],
    ["lines", "blank line between", "a\n\nb", {}, ["a", "", "b"]],
    ["lines", "empty string", "", {}, []],
    ["lines", "null", null, {}, []],
    ["lines", "undefined", undefined, {}, []],
    ["lines", "lone break", "\n", {}, [""]],
    ["lines", "number text form", 12, {}, ["12"]],
    ["lines", "object text form", { a: 1 }, {}, ['{"a":1}']],
    ["lines", "no break", "abc", {}, ["abc"]],
    // unique (list behavior; order rows are under fc-order)
    ["unique", "comma string", "a,b,a", {}, ["a", "b"]],
    ["unique", "empty list", [], {}, []],
    ["unique", "null", null, {}, []],
    ["unique", "undefined", undefined, {}, []],
  ];

  it.each(rows)("fc-collection: %s over %s", (name, _label, input, params, expected) => {
    expect(def(name).apply(input, params)).toEqual(expected);
  });

  it("fc-collection: slice returns a new list, not the input", () => {
    const input = ["a", "b"];
    expect(def("slice").apply(input, {})).not.toBe(input);
    expect(input).toEqual(["a", "b"]);
  });

  it.each(["join", "first", "last", "sort", "unique", "slice"])(
    "fc-collection: %s rejects an object input as a type-error saying a list is needed",
    (name) => {
      const params: Record<string, string> = name === "join" ? { value: "," } : {};
      expect(() => def(name).apply({ a: 1 }, params)).toThrow(/list/i);
    }
  );

  it("fc-collection: join with no separator throws", () => {
    expect(() => def("join").apply(["a"], {})).toThrow(/separator|join/i);
  });

  it.each<[string, Record<string, string>, RegExp]>([
    ["start a", { start: "a" }, /start/],
    ["start empty", { start: "" }, /start/],
    ["start 1.5", { start: "1.5" }, /start/],
    ["start 1e2", { start: "1e2" }, /start/],
    ["end 1.5", { end: "1.5" }, /end/],
    ["end x", { end: "x" }, /end/],
  ])("fc-collection: slice with a bad integer (%s) names the parameter", (_n, params, re) => {
    expect(() => def("slice").apply(["a", "b", "c"], params)).toThrow(re);
  });
});

describe("fc-collection: render", () => {
  const rows: [string, string, unknown, string][] = [
    ["join with a quoted separator", '${{ v | join=", " }}', ["a", "b", "c"], "a, b, c"],
    ["join an empty separator", '${{ v | join="" }}', ["a", "b"], "ab"],
    ["join a comma string", '${{ v | join=" - " }}', "a,b,c", "a - b - c"],
    ["join an empty list", '${{ v | join="," }}', [], ""],
    ["length of a list", "${{ v | length }}", ["a", "b", "c"], "3"],
    ["length of a text", "${{ v | length }}", "a,b,c", "5"],
    ["length of an object", "${{ v | length }}", { a: 1, b: 2 }, "2"],
    ["first", "${{ v | first }}", "a,b,c", "a"],
    ["first of an empty list prints nothing", "${{ v | first }}", [], ""],
    ["last", "${{ v | last }}", ["a", "b", "c"], "c"],
    ["last of an empty list prints nothing", "${{ v | last }}", [], ""],
    ["slice prints as JSON", "${{ v | slice:start=1,end=3 }}", ["a", "b", "c", "d"], '["b","c"]'],
    ["slice with no parameters", "${{ v | slice }}", ["a", "b"], '["a","b"]'],
    ["lines then length", "${{ v | lines | length }}", "a\r\nb\r\nc\r\n", "3"],
    ["lines prints as JSON", "${{ v | lines }}", "a\nb", '["a","b"]'],
    ["unique then length gives a number", "${{ v | unique | length }}", ["a", "b", "a"], "2"],
    ["slice then join", '${{ v | slice:start=1 | join="+" }}', ["a", "b", "c"], "b+c"],
    ["join of a missing variable in lenient mode", '${{ v | join="," }}', undefined, ""],
    ["length of a missing variable in lenient mode", "${{ v | length }}", undefined, "0"],
    ["length of a null", "${{ v | length }}", null, "0"],
  ];

  it.each(rows)("fc-collection: %s", (_n, template, value, expected) => {
    const r = out(template, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("fc-collection: a missing variable renders the same as an empty list in lenient mode", () => {
    const r = render('${{ v | join="," }}|${{ v | length }}', {}, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe("|0");
  });

  const errorRows: [string, string, unknown][] = [
    ["join with no separator", "intro\n  ${{ v | join }}", ["a"]],
    ["join over an object", 'intro\n  ${{ v | join="," }}', { a: 1 }],
    ["first over an object", "intro\n  ${{ v | first }}", { a: 1 }],
    ["slice with start=a", "intro\n  ${{ v | slice:start=a }}", ["a"]],
    ["slice with end=1.5", "intro\n  ${{ v | slice:end=1.5 }}", ["a"]],
  ];

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each(errorRows)("fc-collection: a type-error at the variable, %s", (_n, template, value) => {
      const r = out(template, value, strictMode);
      expect(r.ok).toBe(false);
      expect(r.diagnostics[0]?.code).toBe("type-error");
      expect(r.diagnostics[0]?.message).not.toMatch(/not implemented/);
      expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
        line: 2,
        column: 3,
      });
    });
  });
});

describe("fc-order: sort", () => {
  const V = (value: string) => ({ value });
  const rows: [string, unknown, Record<string, string>, unknown][] = [
    ["numbers ascending", [3, 1, 2], {}, [1, 2, 3]],
    ["numbers numerically, not as text", [10, 9, 1], {}, [1, 9, 10]],
    ["negative numbers", [-1, -10, 5], {}, [-10, -1, 5]],
    ["strings by code unit, capitals first", ["b", "a", "B"], {}, ["B", "a", "b"]],
    ["numeric-looking strings by code unit", ["9", "10"], {}, ["10", "9"]],
    ["numbers before strings", [2, "b", 1, "a"], {}, [1, 2, "a", "b"]],
    [
      "others after, in original order",
      [true, "b", null, 2, { x: 1 }, "a", [1]],
      {},
      [2, "a", "b", true, null, { x: 1 }, [1]],
    ],
    ["objects without a key keep their order", [{ a: 2 }, { a: 1 }], {}, [{ a: 2 }, { a: 1 }]],
    ["comma string", "b,a,c", {}, ["a", "b", "c"]],
    ["JSON array string", "[3,1,2]", {}, [1, 2, 3]],
    ["empty list", [], {}, []],
    ["null", null, {}, []],
    ["undefined", undefined, {}, []],
    ["number is a one-item list", 4, {}, [4]],
    [
      "sort=key orders objects by that key",
      [{ k: 2, n: "a" }, { k: 1, n: "b" }],
      V("k"),
      [{ k: 1, n: "b" }, { k: 2, n: "a" }],
    ],
    [
      "sort=key with mixed key types: numbers then strings",
      [{ k: "b" }, { k: 1 }, { k: "a" }],
      V("k"),
      [{ k: 1 }, { k: "a" }, { k: "b" }],
    ],
    [
      "sort=key puts non-objects and missing keys last, in order",
      [{ k: 2 }, 5, { z: 1 }, { k: 1 }],
      V("k"),
      [{ k: 1 }, { k: 2 }, 5, { z: 1 }],
    ],
    [
      "sort=key is stable for equal keys",
      [
        { k: 1, n: "a" },
        { k: 0, n: "b" },
        { k: 1, n: "c" },
        { k: 0, n: "d" },
      ],
      V("k"),
      [
        { k: 0, n: "b" },
        { k: 0, n: "d" },
        { k: 1, n: "a" },
        { k: 1, n: "c" },
      ],
    ],
    ["sort=key on an empty list", [], V("k"), []],
  ];

  it.each(rows)("fc-order: sort, %s", (_n, input, params, expected) => {
    expect(def("sort").apply(input, params)).toEqual(expected);
  });

  it.each(rows.filter((r) => Array.isArray(r[1]) && (r[1] as unknown[]).length > 0))(
    "fc-order: sort is deterministic and does not mutate its input, %s",
    (_n, input, params, expected) => {
      const before = JSON.stringify(input);
      const a = def("sort").apply(input, params);
      const b = def("sort").apply(input, params);
      expect(JSON.stringify(input)).toBe(before);
      expect(a).not.toBe(input);
      expect(a).toEqual(b);
      expect(a).toEqual(expected);
    }
  );

  it.each<[string, string, unknown, string]>([
    ["sort then first gives the smallest", "${{ v | sort | first }}", [3, 1, 2], "1"],
    ["sort then last", "${{ v | sort | last }}", [3, 1, 2], "3"],
    ["sort prints as JSON", "${{ v | sort }}", [3, 1, 2], "[1,2,3]"],
    ["sort=key then first then json", "${{ v | sort=k | first | json }}", [{ k: 2 }, { k: 1 }], '{"k":1}'],
    ["sort then join", '${{ v | sort | join="," }}', ["b", "a"], "a,b"],
  ])("fc-order: render, %s", (_n, template, value, expected) => {
    const r = out(template, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.output).toBe(expected);
  });
});

describe("fc-order: unique", () => {
  const rows: [string, unknown, unknown][] = [
    ["keeps the first occurrence, order kept", [1, 2, 1, 3, 2], [1, 2, 3]],
    ["strings", ["b", "a", "b"], ["b", "a"]],
    ["1 and the string 1 differ", [1, "1", 1, "1"], [1, "1"]],
    ["true and the string true differ", [true, "true", true], [true, "true"]],
    ["0 and false differ", [0, false, 0], [0, false]],
    ["deep-equal objects collapse", [{ a: 1 }, { a: 1 }, { a: 2 }], [{ a: 1 }, { a: 2 }]],
    ["objects equal across key order", [{ a: 1, b: 2 }, { b: 2, a: 1 }], [{ a: 1, b: 2 }]],
    ["deep-equal arrays collapse", [[1, 2], [1, 2], [2, 1]], [[1, 2], [2, 1]]],
    ["all equal", [1, 1, 1], [1]],
    ["already unique", ["x", "y"], ["x", "y"]],
    ["JSON array string", '["x","y","x"]', ["x", "y"]],
  ];

  it.each(rows)("fc-order: unique, %s", (_n, input, expected) => {
    expect(def("unique").apply(input, {})).toEqual(expected);
  });

  it("fc-order: unique does not mutate its input and returns a new list", () => {
    const input = [1, 1, 2];
    const result = def("unique").apply(input, {});
    expect(input).toEqual([1, 1, 2]);
    expect(result).not.toBe(input);
    expect(result).toEqual([1, 2]);
  });

  it("fc-order: unique renders as JSON in first-occurrence order", () => {
    const r = out("${{ v | unique }}", ["b", "a", "b", "c", "a"]);
    expect(r.output).toBe('["b","a","c"]');
  });
});

describe("fc-json: json", () => {
  const cyclicObject: Record<string, unknown> = { a: 1 };
  cyclicObject.self = cyclicObject;
  const cyclicArray: unknown[] = [1];
  cyclicArray.push(cyclicArray);
  const innerList: unknown[] = [];
  const nestedCycle: Record<string, unknown> = { x: { y: innerList } };
  innerList.push(nestedCycle);
  const shared = { a: 1 };

  const rows: [string, unknown, string][] = [
    ["keys sorted at every depth", { b: 1, a: { d: 1, c: 2 } }, '{"a":{"c":2,"d":1},"b":1}'],
    ["keys sorted by code unit", { a: 1, B: 2 }, '{"B":2,"a":1}'],
    ["arrays keep their order", [3, 1, 2], "[3,1,2]"],
    ["objects inside arrays are sorted", [{ b: 1, a: 2 }], '[{"a":2,"b":1}]'],
    ["compact, no spaces", { a: [1, 2], b: "x y" }, '{"a":[1,2],"b":"x y"}'],
    ["a string is quoted", "a", '"a"'],
    ["a string with quotes is escaped", 'a"b', '"a\\"b"'],
    ["a number", 1.5, "1.5"],
    ["a boolean", false, "false"],
    ["null", null, "null"],
    ["undefined", undefined, "null"],
    ["empty object", {}, "{}"],
    ["empty array", [], "[]"],
    ["a shared, non-cyclic reference is not an error", [shared, shared], '[{"a":1},{"a":1}]'],
  ];

  it.each(rows)("fc-json: json, %s", (_n, input, expected) => {
    expect(def("json").apply(input, {})).toBe(expected);
  });

  it.each<[string, unknown]>([
    ["an object holding itself", cyclicObject],
    ["an array holding itself", cyclicArray],
    ["a deep cycle", nestedCycle],
  ])("fc-json: json of %s throws and says cyclic", (_n, input) => {
    expect(() => def("json").apply(input, {})).toThrow(/cyclic/i);
  });

  it.each<[string, string, unknown, string]>([
    ["an object", "${{ v | json }}", { b: 1, a: { d: 1, c: 2 } }, '{"a":{"c":2,"d":1},"b":1}'],
    ["a string", "${{ v | json }}", "hi", '"hi"'],
    ["a list", "${{ v | json }}", [2, 1], "[2,1]"],
    ["a missing variable in lenient mode", "${{ v | json }}", undefined, "null"],
    ["a null", "${{ v | json }}", null, "null"],
  ])("fc-json: render, %s", (_n, template, value, expected) => {
    const r = out(template, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.output).toBe(expected);
  });

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each<[string, unknown]>([
      ["an object holding itself", cyclicObject],
      ["an array holding itself", cyclicArray],
    ])("fc-json: a cyclic value is a type-error at the variable, %s", (_n, value) => {
      const r = out("intro\n  ${{ v | json }}", value, strictMode);
      expect(r.ok).toBe(false);
      expect(r.output).toBe("");
      expect(r.diagnostics[0]?.code).toBe("type-error");
      expect(r.diagnostics[0]?.message).toMatch(/cyclic/i);
      expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
        line: 2,
        column: 3,
      });
    });
  });
});

describe("fc-json: parameter errors on every collection filter", () => {
  const rows: [string, string][] = [
    ["join:sep=\",\"", 'intro\n  ${{ v | join:sep="," }}'],
    ["length:x=1", "intro\n  ${{ v | length:x=1 }}"],
    ["first:x=1", "intro\n  ${{ v | first:x=1 }}"],
    ["last:x=1", "intro\n  ${{ v | last:x=1 }}"],
    ["sort:by=k", "intro\n  ${{ v | sort:by=k }}"],
    ["unique:x=1", "intro\n  ${{ v | unique:x=1 }}"],
    ["slice:count=2", "intro\n  ${{ v | slice:count=2 }}"],
    ["slice:start=1,count=2", "intro\n  ${{ v | slice:start=1,count=2 }}"],
    ["lines:x=1", "intro\n  ${{ v | lines:x=1 }}"],
    ["json:pretty=1", "intro\n  ${{ v | json:pretty=1 }}"],
  ];

  it("fc-json: every collection filter is covered by a parameter-error row", () => {
    const covered = new Set(rows.map(([, t]) => /\| (\w+)/.exec(t)![1]));
    expect([...covered].sort()).toEqual([...NAMES].sort());
  });

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each(rows)(
      "fc-json: render reports an undeclared parameter as a type-error at the variable, %s",
      (_n, template) => {
        const r = out(template, ["a", "b"], strictMode);
        expect(r.ok).toBe(false);
        expect(r.output).toBe("");
        expect(r.diagnostics[0]?.code).toBe("type-error");
        expect(r.diagnostics[0]?.message).not.toMatch(/not implemented/);
        expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
          line: 2,
          column: 3,
        });
      }
    );

    it.each(rows)("fc-json: validate and analyze report the same error, %s", (_n, template) => {
      const v = validate(template);
      expect(v.ok).toBe(false);
      expect(v.diagnostics[0]).toMatchObject({ severity: "error", code: "type-error", line: 2, column: 3 });
      const a = analyze(template).diagnostics[0];
      expect(a).toMatchObject({ code: "type-error", line: 2, column: 3 });
      expect(a?.message).toBe(out(template, ["a", "b"], strictMode).diagnostics[0]?.message);
    });
  });

  it.each([
    ["join", '${{ v | join="," }}'],
    ["length", "${{ v | length }}"],
    ["first", "${{ v | first }}"],
    ["last", "${{ v | last }}"],
    ["sort", "${{ v | sort }}"],
    ["sort=key", "${{ v | sort=k }}"],
    ["unique", "${{ v | unique }}"],
    ["slice", "${{ v | slice:start=1,end=2 }}"],
    ["lines", "${{ v | lines }}"],
    ["json", "${{ v | json }}"],
  ])("fc-json: declared parameters give no diagnostic in validate or analyze, %s", (_n, template) => {
    expect(validate(template).ok).toBe(true);
    expect(analyze(template).diagnostics).toEqual([]);
  });
});
