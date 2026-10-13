/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";

/** Load the core entry lazily so a missing module is an assertion failure, not a load error. */
function load(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../core/src");
  } catch {
    return null;
  }
}

/** Load the n8n node lazily for the same reason. */
function loadNode(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../n8n/TemplateResolver.node");
  } catch {
    return null;
  }
}

type Usage = {
  name: string;
  paths: string[];
  usedIn: string[];
  optional: boolean;
};

function analyzeOf(template: string): {
  variables: Usage[];
  filters: { name: string; count: number }[];
  diagnostics: { code?: string; message: string }[];
} {
  const core = load();
  expect(core).not.toBeNull();
  expect(typeof core.analyze).toBe("function");
  return core.analyze(template);
}

function names(template: string): string[] {
  return analyzeOf(template)
    .variables.map((v) => v.name)
    .sort();
}

function find(template: string, name: string): Usage | undefined {
  return analyzeOf(template).variables.find((v) => v.name === name);
}

/** Run the node's execute path for one item with the given mappings and strict mode. */
async function runNode(
  template: string,
  mappings: { variableName: string; value: string }[],
  strictMode: boolean
): Promise<{ output?: string; error?: string }> {
  const mod = loadNode();
  expect(mod).not.toBeNull();
  const node = new mod.TemplateResolver();
  const params: Record<string, any> = {
    template,
    variableMappings: { mappings },
    strictMode,
    showDetectedVariables: false,
    outputField: "out",
  };
  const ctx = {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (name: string, _i: number, dflt?: any) =>
      name in params ? params[name] : dflt,
    continueOnFail: () => false,
    getNode: () => ({ name: "TemplateResolver" }),
  };
  try {
    const result = await node.execute.call(ctx);
    return { output: result[0][0].json.out };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

describe("analyze: variable and filter usage", () => {
  test("an-01: output tags report the root name, full path and the output construct", () => {
    const u = find("Hi ${{user.name}} and ${{user.email}}", "user");
    expect(u).toBeDefined();
    expect(u!.paths.slice().sort()).toEqual(["user.email", "user.name"]);
    expect(u!.usedIn).toEqual(["output"]);
    expect(u!.optional).toBe(false);
  });

  test("an-01: IF, ELSEIF and CASE subjects are reported with their construct", () => {
    const t =
      "{{IF a}}A{{ELSEIF b}}B{{END_IF}}" +
      '{{CASE c}}{{WHEN "x"}}X{{END_WHEN}}{{END_CASE}}';
    expect(names(t)).toEqual(["a", "b", "c"]);
    expect(find(t, "a")!.usedIn).toEqual(["if"]);
    expect(find(t, "b")!.usedIn).toEqual(["elseif"]);
    expect(find(t, "c")!.usedIn).toEqual(["case"]);
  });

  test("an-01: a FOR source is reported as for", () => {
    const t = "{{FOR items AS item}}x{{END_FOR}}";
    expect(names(t)).toEqual(["items"]);
    expect(find(t, "items")!.usedIn).toEqual(["for"]);
  });

  test("an-01: a LIST_ITEM condition is reported as list_item", () => {
    const t =
      '{{LIST}}{{LIST_ITEM show | fallback="none"}}A{{END_LIST_ITEM}}{{END_LIST}}';
    expect(names(t)).toEqual(["show"]);
    expect(find(t, "show")!.usedIn).toEqual(["list_item"]);
  });

  test("an-01: table cells are reported as table", () => {
    const t =
      "{{TABLE}}{{HEADER}}Name|Age{{END_HEADER}}{{ROW}}${{name}}|${{age}}{{END_ROW}}{{END_TABLE}}";
    expect(names(t)).toEqual(["age", "name"]);
    expect(find(t, "name")!.usedIn).toEqual(["table"]);
    expect(find(t, "age")!.usedIn).toEqual(["table"]);
  });

  test("an-01: the same variable used in two constructs lists both, distinct", () => {
    const t = "{{IF a}}${{a}} ${{a}}{{END_IF}}";
    const u = find(t, "a");
    expect(u).toBeDefined();
    expect(u!.usedIn.slice().sort()).toEqual(["if", "output"]);
    expect(u!.paths).toEqual(["a"]);
  });

  test("an-02: both operands of AND and OR are reported", () => {
    expect(names("{{IF a AND b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(names("{{IF a OR b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(names("{{IF a && b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(names("{{IF a || b}}x{{END_IF}}")).toEqual(["a", "b"]);
  });

  test("an-02: both sides of a comparison are reported", () => {
    expect(names("{{IF a == b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(find("{{IF a == b}}x{{END_IF}}", "b")!.usedIn).toEqual(["if"]);
  });

  test("an-02: the right side of contains is reported", () => {
    expect(names("{{IF s contains t}}x{{END_IF}}")).toEqual(["s", "t"]);
  });

  test("an-02: a literal right-hand side is not a variable", () => {
    expect(names('{{IF s contains "t"}}x{{END_IF}}')).toEqual(["s"]);
    expect(names("{{IF n == 5}}x{{END_IF}}")).toEqual(["n"]);
  });

  test("an-03: FOR item variables are not inputs, in the body or with a path", () => {
    const t = "{{FOR xs AS x}}${{x}} ${{x.name}}{{END_FOR}}";
    expect(names(t)).toEqual(["xs"]);
  });

  test("an-03: @-metadata is not an input", () => {
    const t =
      "{{FOR xs AS x}}${{@index}} ${{@index0}} {{IF @first}}F{{END_IF}} {{IF @last}}L{{END_IF}}{{END_FOR}}";
    expect(names(t)).toEqual(["xs"]);
  });

  test("an-03: the word NOT is never a variable", () => {
    expect(names("{{IF NOT(a)}}x{{END_IF}}")).toEqual(["a"]);
    expect(names("{{IF NOT a}}x{{END_IF}}")).toEqual(["a"]);
  });

  test("an-03: a FOR item name used only outside its loop is still an input", () => {
    const t = "{{FOR xs AS x}}${{x}}{{END_FOR}}${{x}}";
    expect(names(t)).toEqual(["x", "xs"]);
  });

  test("an-04: a variable with a ?? default is optional", () => {
    const u = find('${{x ?? "d"}}', "x");
    expect(u).toBeDefined();
    expect(u!.optional).toBe(true);
  });

  test("an-04: a variable with one guarded and one unguarded use is not optional", () => {
    const u = find('${{x ?? "d"}} ${{x}}', "x");
    expect(u).toBeDefined();
    expect(u!.optional).toBe(false);
  });

  test("an-04: a variable without a default is not optional", () => {
    const u = find("${{x}}", "x");
    expect(u).toBeDefined();
    expect(u!.optional).toBe(false);
  });

  test("an-04: strict mode accepts an unmapped variable that has a ?? default", async () => {
    const r = await runNode('${{x ?? "d"}}', [], true);
    expect(r.error).toBeUndefined();
    expect(r.output).toBe("d");
  });

  test("an-04: strict mode still rejects an unmapped variable without a default", async () => {
    const r = await runNode("${{x}}", [], true);
    expect(r.error).toBeDefined();
    expect(r.error).toMatch(/unmapped variables: x/);
  });

  test("an-05: every filter used is listed with its name", () => {
    const a = analyzeOf("${{x | trim | head=3}}");
    const filterNames = a.filters.map((f) => f.name).sort();
    expect(filterNames).toEqual(["head", "trim"]);
    expect(a.diagnostics).toEqual([]);
  });

  test("an-05: a filter used twice has count 2", () => {
    const a = analyzeOf("${{x | trim}} ${{y | trim}}");
    expect(a.filters.find((f) => f.name === "trim")?.count).toBe(2);
  });

  test("an-05: an unknown filter is reported as a diagnostic naming it", () => {
    const a = analyzeOf("${{x | nosuchfilter}}");
    expect(a.diagnostics.length).toBeGreaterThan(0);
    expect(a.diagnostics.some((d) => d.message.includes("nosuchfilter"))).toBe(
      true
    );
  });

  test("an-06: strict mode does not reject a template whose only unmapped name is a FOR item", async () => {
    const r = await runNode(
      "{{FOR xs AS x}}${{x}}{{END_FOR}}",
      [{ variableName: "xs", value: '["a","b"]' }],
      true
    );
    expect(r.error).toBeUndefined();
    expect(r.output).toBe("ab");
  });

  test("an-06: strict mode still names a genuinely unmapped loop source", async () => {
    const r = await runNode("{{FOR xs AS x}}${{x}}{{END_FOR}}", [], true);
    expect(r.error).toBeDefined();
    expect(r.error).toMatch(/unmapped variables: xs/);
  });

  test("an-07: core/src contains no extractAllVariables", () => {
    const dir = path.join(__dirname, "..", "core", "src");
    expect(fs.existsSync(dir)).toBe(true);
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (fs.readFileSync(p, "utf8").includes("extractAllVariables"))
          offenders.push(path.relative(dir, p));
      }
    };
    if (fs.existsSync(dir)) walk(dir);
    expect(offenders).toEqual([]);
  });

  test("an-07: core does not export extractAllVariables", () => {
    const core = load();
    expect(core).not.toBeNull();
    expect(core.extractAllVariables).toBeUndefined();
  });
});
