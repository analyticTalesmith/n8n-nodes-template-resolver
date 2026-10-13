import { resolveTemplate } from "../../core/src/resolve";

type Vars = Map<string, any>;

/** Resolve, capturing a thrown error as text so a failure is a matcher failure. */
function run(template: string, entries: [string, any][]): string {
  const v: Vars = new Map(entries);
  try {
    return resolveTemplate(template, v as any, { strictMode: false });
  } catch (e) {
    return `THROWN: ${(e as Error).message}`;
  }
}

describe("string input coercion", () => {
  it("sc-01: object string values keep doubled commas inside strings", () => {
    const o = '{"name":"a,, b"}';
    expect(run("${{o.name}}", [["o", o]])).toBe("a,, b");
  });

  it("sc-01: object string values keep a comma before a closing brace inside a string", () => {
    const o = '{"name":"x,}"}';
    expect(run("${{o.name}}", [["o", o]])).toBe("x,}");
  });

  it("sc-01: object string values keep commas after an opening brace or bracket inside strings", () => {
    const o = '{"a":"{,x","b":"[,y","c":"z,]"}';
    expect(run("${{o.a}}|${{o.b}}|${{o.c}}", [["o", o]])).toBe("{,x|[,y|z,]");
  });

  it("sc-01: structural trailing commas are still repaired while string commas are kept", () => {
    const o = '{"name":"a,, b",}';
    expect(run("${{o.name}}", [["o", o]])).toBe("a,, b");
  });

  it("sc-02: array string elements keep commas inside strings", () => {
    const a = '["a, b","c,]d"]';
    expect(
      run("{{FOR a AS x}}[${{x}}]{{END_FOR}}", [["a", a]])
    ).toBe("[a, b][c,]d]");
  });

  it("sc-02: array string element with a leading comma after a bracket is preserved", () => {
    const a = '["[,x","y,,z"]';
    expect(
      run("{{FOR a AS x}}[${{x}}]{{END_FOR}}", [["a", a]])
    ).toBe("[[,x][y,,z]");
  });

  it("sc-03: tags.0 and tags.1 index into a comma-separated string", () => {
    expect(run("${{tags.0}}|${{tags.1}}", [["tags", "a,b"]])).toBe("a|b");
  });

  it("sc-03: indexing a comma-separated string works in IF conditions", () => {
    expect(
      run('{{IF tags.0 == "a"}}Y{{ELSE}}N{{END_IF}}', [["tags", "a,b"]])
    ).toBe("Y");
    expect(
      run('{{IF tags.1 == "b"}}Y{{ELSE}}N{{END_IF}}', [["tags", "a,b"]])
    ).toBe("Y");
  });

  it("sc-04: tags.0 and tags.1 index into a JSON array string in output", () => {
    expect(
      run("${{tags.0}}|${{tags.1}}", [["tags", '["a","b"]']])
    ).toBe("a|b");
  });

  it("guard-sc-04-json-array-string-indexing-in-IF-conditions", () => {
    expect(
      run('{{IF tags.0 == "a"}}Y{{ELSE}}N{{END_IF}}', [["tags", '["a","b"]']])
    ).toBe("Y");
    expect(
      run('{{IF tags.1 == "b"}}Y{{ELSE}}N{{END_IF}}', [["tags", '["a","b"]']])
    ).toBe("Y");
  });

  it("guard-object-string-and-native-array-indexing-still-work", () => {
    expect(run("${{o.name}}", [["o", '{"name":"Ann"}']])).toBe("Ann");
    expect(run("${{t.0}}|${{t.1}}", [["t", ["a", "b"]]])).toBe("a|b");
    expect(run("${{o.list.1}}", [["o", '{"list":["p","q"]}']])).toBe("q");
  });

  it("guard-for-over-comma-string-still-iterates", () => {
    expect(
      run("{{FOR tags AS t}}#${{t}} {{END_FOR}}", [["tags", "a,b"]])
    ).toBe("#a #b ");
  });
});
