import { resolveTemplate } from "../../core/src/resolve";
import { VariableMap } from "../../core/src/types";

function render(template: string): string {
  return resolveTemplate(template, new Map() as VariableMap, {
    strictMode: false,
  });
}

describe("parse defaults guards", () => {
  it("an apostrophe in an unquoted default keeps the filter that follows", () => {
    expect(render("${{x ?? it's | head=2}}")).toBe("it");
  });

  it("an apostrophe in a multi-word unquoted default keeps the filter that follows", () => {
    expect(render("${{x ?? don't know | trim}}")).toBe("don't know");
  });

  it("a double-quoted default with an apostrophe and a pipe stays whole", () => {
    expect(render('${{x ?? "it\'s a|b"}}')).toBe("it's a|b");
  });
});
