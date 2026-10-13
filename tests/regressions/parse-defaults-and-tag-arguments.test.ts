import { resolveTemplate } from "../../core/src/resolve";
import { VariableMap, TemplateValue } from "../../core/src/types";

function vars(entries: [string, TemplateValue][] = []): VariableMap {
  return new Map(entries);
}

type Outcome = { output: string | null; error: string | null; name: string | null };

// Captures either the rendered output or the thrown error so that every
// failure surfaces as a failed expectation, never as an escaped exception.
function run(
  template: string,
  entries: [string, TemplateValue][] = [],
  strictMode = false
): Outcome {
  try {
    return {
      output: resolveTemplate(template, vars(entries), { strictMode }),
      error: null,
      name: null,
    };
  } catch (e) {
    const err = e as Error;
    return { output: null, error: String(err.message), name: String(err.name) };
  }
}

describe("parse pipe defaults, ELSE IF and tag arguments", () => {
  it("pd-01: a ?? default holding a pipe in double quotes renders literally when the value is missing", () => {
    expect(run('${{x ?? "a|b"}}', [], false)).toEqual({
      output: "a|b",
      error: null,
      name: null,
    });
  });

  it("pd-01: the pipe-bearing default also renders when the variable is present but empty", () => {
    expect(run('${{x ?? "a|b"}}', [["x", ""]], true)).toEqual({
      output: "a|b",
      error: null,
      name: null,
    });
  });

  it("pd-01: a pipe-bearing default is used in strict mode for a missing variable", () => {
    expect(run('${{x ?? "left|mid|right"}}', [], true)).toEqual({
      output: "left|mid|right",
      error: null,
      name: null,
    });
  });

  it("pd-01: a pipe in a single-quoted default renders literally", () => {
    expect(run("${{x ?? 'a|b'}}", [], false)).toEqual({
      output: "a|b",
      error: null,
      name: null,
    });
  });

  it("pd-01: a present value wins over a pipe-bearing default", () => {
    expect(run('${{x ?? "a|b"}}', [["x", "real"]], true)).toEqual({
      output: "real",
      error: null,
      name: null,
    });
  });

  it("pd-02: a real filter after a pipe-bearing default applies to the default", () => {
    expect(run('${{x ?? "a|b" | head=2}}', [], false)).toEqual({
      output: "a|",
      error: null,
      name: null,
    });
  });

  it("pd-02: trim after a pipe-bearing default trims the default and keeps its pipe", () => {
    expect(run('${{x ?? "  a|b  " | trim}}', [], false)).toEqual({
      output: "a|b",
      error: null,
      name: null,
    });
  });

  it("pd-02: a filter chain after a pipe-bearing default applies in order", () => {
    expect(run('${{x ?? "  a|bcd  " | trim | tail=3}}', [], false)).toEqual({
      output: "bcd",
      error: null,
      name: null,
    });
  });

  it("pd-03: ELSE IF with a condition is a syntax error that names ELSEIF", () => {
    const r = run("{{IF a}}A{{ELSE IF b}}B{{END_IF}}", [
      ["a", "false"],
      ["b", "false"],
    ]);
    expect(r.output).toBeNull();
    expect(r.error).toMatch(/ELSEIF/);
    expect(r.name).toBe("SyntaxError");
  });

  it("pd-03: ELSE IF is rejected whatever the condition values are", () => {
    const r = run("{{IF a}}A{{ELSE IF b}}B{{END_IF}}", [
      ["a", "true"],
      ["b", "true"],
    ]);
    expect(r.output).toBeNull();
    expect(r.error).toMatch(/ELSEIF/);
  });

  it("pd-03: ELSE IF in a template with a final ELSE is rejected", () => {
    const r = run("{{IF a}}A{{ELSE IF b}}B{{ELSE}}C{{END_IF}}", [
      ["a", "false"],
      ["b", "true"],
    ]);
    expect(r.output).toBeNull();
    expect(r.error).toMatch(/ELSEIF/);
  });

  it("pd-04: END_IF with a trailing argument is a syntax error", () => {
    const r = run("{{IF a}}A{{END_IF garbage}}", [["a", "true"]]);
    expect(r.output).toBeNull();
    expect(r.name).toBe("SyntaxError");
  });

  it("pd-04: ELSE with a trailing argument is a syntax error", () => {
    const r = run("{{IF a}}A{{ELSE garbage}}B{{END_IF}}", [["a", "true"]]);
    expect(r.output).toBeNull();
    expect(r.name).toBe("SyntaxError");
  });

  it("pd-04: END_FOR with a trailing argument is a syntax error", () => {
    const r = run("{{FOR i AS x}}${{x}}{{END_FOR junk}}", [["i", "[1,2]"]]);
    expect(r.output).toBeNull();
    expect(r.name).toBe("SyntaxError");
  });

  it("pd-04: END_IF with a trailing argument is rejected when the condition is false", () => {
    const r = run("{{IF a}}A{{END_IF garbage}}", [["a", "false"]]);
    expect(r.output).toBeNull();
    expect(r.name).toBe("SyntaxError");
  });

  it("guard-defaults: a default without a pipe and a plain filter still work", () => {
    expect(run('${{x ?? "dflt"}}', [], false).output).toBe("dflt");
    expect(run("${{x | trim}}", [["x", "  hi  "]], true).output).toBe("hi");
    expect(run('${{x ?? "dflt" | trim}}', [], false).output).toBe("dflt");
  });

  it("guard-tags: ELSEIF, plain ELSE, plain END_IF and plain END_FOR still render", () => {
    expect(
      run("{{IF a}}A{{ELSEIF b}}B{{ELSE}}C{{END_IF}}", [
        ["a", "false"],
        ["b", "true"],
      ]).output
    ).toBe("B");
    expect(
      run("{{IF a}}A{{ELSE}}C{{END_IF}}", [["a", "false"]]).output
    ).toBe("C");
    expect(
      run("{{FOR i AS x}}${{x}},{{END_FOR}}", [["i", "[1,2]"]]).output
    ).toBe("1,2,");
  });
});
