/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from "../../core/src";

function cyclic(): any {
  const a: any = { x: "v" };
  a.self = a;
  return a;
}

function run(template: string, data: any, options?: any): any {
  let r: any;
  expect(() => {
    r = render(template, data, options);
  }).not.toThrow();
  return r;
}

describe("rr-robust: render never throws on bad input", () => {
  it.each([
    ["null", null],
    ["an array", [1, 2]],
    ["a string", "text"],
    ["a number", 42],
  ] as [string, any][])(
    "rr-robust: data that is %s gives ok false with invalid-input at 1:1",
    (_n, data) => {
      const r = run("hello ${{a}}", data);
      expect(r).toBeDefined();
      expect(r.ok).toBe(false);
      expect(r.output).toBe("");
      expect(r.diagnostics.length).toBe(1);
      expect(r.diagnostics[0].code).toBe("invalid-input");
      expect(r.diagnostics[0].line).toBe(1);
      expect(r.diagnostics[0].column).toBe(1);
    }
  );

  it.each([
    ["the cyclic value itself", "${{a}}"],
    ["a deep path through the cycle", "${{a.self.self.x}}"],
  ] as [string, string][])(
    "rr-robust: strict %s does not throw",
    (_n, template) => {
      const r = run(template, { a: cyclic() }, { strictMode: true });
      expect(r).toBeDefined();
      expect(typeof r.ok).toBe("boolean");
      if (!r.ok) {
        expect(r.diagnostics.length).toBeGreaterThan(0);
        expect(typeof r.diagnostics[0].line).toBe("number");
        expect(typeof r.diagnostics[0].column).toBe("number");
      }
    }
  );

  it("rr-robust: a strict FOR over a cyclic non-array value does not throw and is located", () => {
    const r = run("{{FOR a AS x}}${{x}}{{END_FOR}}", { a: cyclic() });
    expect(r).toBeDefined();
    expect(typeof r.ok).toBe("boolean");
    if (!r.ok) {
      expect(r.diagnostics.length).toBeGreaterThan(0);
      expect(r.diagnostics[0].code).toBe("type-error");
      expect(typeof r.diagnostics[0].line).toBe("number");
      expect(typeof r.diagnostics[0].column).toBe("number");
    }
  });
});
