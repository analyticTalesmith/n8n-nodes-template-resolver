import { FILTER_REGISTRY, spec } from "../../core/src";

// The registry is the source of the engine filters; a later filter card adds a row, not an edit here.
// An empty registry yields one blank name so the per-filter test fails by assertion, not by an empty table.
const REGISTRY_NAMES = FILTER_REGISTRY.map((f) => f.name);
const ENGINE_FILTERS = REGISTRY_NAMES.length > 0 ? REGISTRY_NAMES : [""];
const BLOCKS = ["IF", "FOR", "CASE", "LIST", "TABLE"];
const OPERATORS = [
  "==",
  "!=",
  "contains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
  "AND",
  "OR",
  "NOT",
];

describe("rr-spec: the language spec", () => {
  const s = spec();

  it("rr-spec: has a non-empty version string", () => {
    expect(typeof s.version).toBe("string");
    expect(s.version.length).toBeGreaterThan(0);
  });

  it.each(ENGINE_FILTERS)(
    "rr-spec: filter %s is listed with a description",
    (name) => {
      const f = s.filters.find((x) => x.name === name);
      expect(f).toBeDefined();
      expect(f!.description.length).toBeGreaterThan(0);
    }
  );

  it("rr-spec: lists exactly the engine's filters", () => {
    expect(REGISTRY_NAMES.length).toBeGreaterThan(0);
    expect(s.filters.map((f) => f.name).sort()).toEqual(
      [...REGISTRY_NAMES].sort()
    );
  });

  it.each(BLOCKS)(
    "rr-spec: block %s is listed with args and description",
    (name) => {
      const b = s.blocks.find((x) => x.name === name);
      expect(b).toBeDefined();
      expect(typeof b!.args).toBe("string");
      expect(b!.description.length).toBeGreaterThan(0);
    }
  );

  it.each(OPERATORS)("rr-spec: operator %s is listed", (op) => {
    expect(s.operators).toContain(op);
  });

  it("rr-spec: limits equal the default limits", () => {
    expect(s.limits).toEqual({
      maxIterations: 10000,
      maxOutputChars: 1000000,
      maxDepth: 32,
    });
  });

  it("rr-spec: describes variable and comment syntax", () => {
    expect(s.syntax.variable.length).toBeGreaterThan(0);
    expect(s.syntax.comment.length).toBeGreaterThan(0);
  });
});
