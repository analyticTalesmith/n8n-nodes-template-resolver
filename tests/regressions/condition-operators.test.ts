import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
import { VariableMap, TemplateValue } from "../../nodes/TemplateResolver/types";

function vars(entries: [string, TemplateValue][]): VariableMap {
  return new Map(entries);
}

/** Render `{{IF cond}}Y{{ELSE}}N{{END_IF}}`; a thrown error is captured, not escaped. */
function run(
  cond: string,
  entries: [string, TemplateValue][]
): { out: string | null; error: string | null } {
  try {
    return {
      out: resolveTemplate(
        `{{IF ${cond}}}Y{{ELSE}}N{{END_IF}}`,
        vars(entries),
        undefined
      ),
      error: null,
    };
  } catch (e) {
    return { out: null, error: e instanceof Error ? e.message : String(e) };
  }
}

function expectRender(
  cond: string,
  entries: [string, TemplateValue][],
  expected: "Y" | "N"
): void {
  expect(run(cond, entries)).toEqual({ out: expected, error: null });
}

describe("condition operators", () => {
  it("co-01: NOT a negates the variable", () => {
    expectRender("NOT a", [["a", false]], "Y");
    expectRender("NOT a", [["a", "false"]], "Y");
    expectRender("NOT a", [["a", true]], "N");
    expectRender("NOT a", [["a", "true"]], "N");
  });

  it("co-01: !a negates the variable", () => {
    expectRender("!a", [["a", false]], "Y");
    expectRender("!a", [["a", "false"]], "Y");
    expectRender("!a", [["a", true]], "N");
    expectRender("!a", [["a", "true"]], "N");
  });

  it("co-01: NOT (a) negates the variable", () => {
    expectRender("NOT (a)", [["a", false]], "Y");
    expectRender("NOT (a)", [["a", "false"]], "Y");
    expectRender("NOT (a)", [["a", true]], "N");
  });

  it("co-02: && and 'and' (any case) evaluate as AND", () => {
    for (const op of ["&&", "and", "AND", "And"]) {
      expectRender(`a ${op} b`, [["a", true], ["b", true]], "Y");
      expectRender(`a ${op} b`, [["a", true], ["b", false]], "N");
      expectRender(`a ${op} b`, [["a", false], ["b", true]], "N");
      expectRender(`a ${op} b`, [["a", false], ["b", false]], "N");
    }
  });

  it("co-02: || and 'or' (any case) evaluate as OR", () => {
    for (const op of ["||", "or", "OR", "Or"]) {
      expectRender(`a ${op} b`, [["a", true], ["b", true]], "Y");
      expectRender(`a ${op} b`, [["a", true], ["b", false]], "Y");
      expectRender(`a ${op} b`, [["a", false], ["b", true]], "Y");
      expectRender(`a ${op} b`, [["a", false], ["b", false]], "N");
    }
  });

  it("co-02: lowercase not, and, or combine with AND binding tighter than OR", () => {
    const e: [string, TemplateValue][] = [
      ["a", true],
      ["b", false],
      ["c", true],
    ];
    expectRender("not b and c", e, "Y");
    expectRender("a and not c", e, "N");
    expectRender("b and c or a", e, "Y");
    expectRender("b && c || b", e, "N");
  });

  it("co-03: AND inside a quoted string does not split the condition", () => {
    expectRender('a == "x AND y"', [["a", "x AND y"]], "Y");
    expectRender('a == "x AND y"', [["a", "x"]], "N");
    expectRender("a == 'x AND y'", [["a", "x AND y"]], "Y");
  });

  it("co-03: OR inside a quoted string does not split the condition", () => {
    expectRender('a == "x OR y"', [["a", "x OR y"]], "Y");
    expectRender('a == "x OR y"', [["a", "y"]], "N");
    expectRender('a contains "x OR y"', [["a", "say x OR y now"]], "Y");
  });

  it("co-03: a real AND outside the quotes still splits", () => {
    expectRender(
      'a == "x AND y" AND b',
      [["a", "x AND y"], ["b", true]],
      "Y"
    );
    expectRender(
      'a == "x AND y" AND b',
      [["a", "x AND y"], ["b", false]],
      "N"
    );
  });

  it("co-04: unquoted contains right-hand side is a variable", () => {
    expectRender("s contains t", [["s", "hello world"], ["t", "world"]], "Y");
    expectRender("s contains t", [["s", "hello world"], ["t", "xyz"]], "N");
  });

  it("co-04: unquoted startsWith right-hand side is a variable", () => {
    expectRender("s startsWith t", [["s", "hello world"], ["t", "hello"]], "Y");
    expectRender("s startsWith t", [["s", "hello world"], ["t", "world"]], "N");
  });

  it("co-04: unquoted endsWith right-hand side is a variable", () => {
    expectRender("s endsWith t", [["s", "hello world"], ["t", "world"]], "Y");
    expectRender("s endsWith t", [["s", "hello world"], ["t", "hello"]], "N");
  });

  it("co-05: == compares numerically when both sides are numeric", () => {
    expectRender("n == 5", [["n", "5.0"]], "Y");
    expectRender("n == 5", [["n", 5]], "Y");
    expectRender("n == 5.0", [["n", "5"]], "Y");
    expectRender("n == 6", [["n", "5.0"]], "N");
  });

  it("co-05: != compares numerically when both sides are numeric", () => {
    expectRender("n != 5", [["n", "5.0"]], "N");
    expectRender("n != 5", [["n", 5]], "N");
    expectRender("n != 6", [["n", "5.0"]], "Y");
  });

  it("co-05: a missing variable equals null", () => {
    expectRender("missing == null", [["other", "x"]], "Y");
    expectRender("missing != null", [["other", "x"]], "N");
    expectRender("other == null", [["other", "x"]], "N");
    expectRender("other != null", [["other", "x"]], "Y");
  });

  it("co-06: an unknown word between operands is an error, not false", () => {
    const r = run("a xor b", [["a", true], ["b", false]]);
    expect(r.out).toBeNull();
    expect(r.error).not.toBeNull();
  });

  it("co-06: a misspelled operator is an error, not false", () => {
    const r = run("a contain b", [["a", "hello"], ["b", "ell"]]);
    expect(r.out).toBeNull();
    expect(r.error).not.toBeNull();
  });

  it("guard-existing-forms: NOT(a), AND, OR and quoted contains keep working", () => {
    expectRender("NOT(a)", [["a", false]], "Y");
    expectRender("a AND b", [["a", true], ["b", true]], "Y");
    expectRender("a OR b", [["a", false], ["b", true]], "Y");
    expectRender('s contains "world"', [["s", "hello world"]], "Y");
    expectRender("s startsWith 'hello'", [["s", "hello world"]], "Y");
  });

  it("guard-comparisons: string equality, != and ordering are unchanged", () => {
    expectRender('s == "abc"', [["s", "abc"]], "Y");
    expectRender('s == "abd"', [["s", "abc"]], "N");
    expectRender('s != "abd"', [["s", "abc"]], "Y");
    expectRender("n > 3", [["n", "5"]], "Y");
    expectRender("a != b", [["a", "x"], ["b", "y"]], "Y");
  });
});
