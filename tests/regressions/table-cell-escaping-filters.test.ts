import { resolveTemplate } from "../../core/src/resolve";
import { TemplateValue } from "../../core/src/types";

function render(
  template: string,
  entries: [string, TemplateValue][]
): string {
  try {
    return resolveTemplate(template, new Map(entries), { strictMode: false });
  } catch (e) {
    return `THROWN: ${(e as Error).message}`;
  }
}

describe("table cell escaping with filters", () => {
  it("a pipe already escaped by escape_md is not escaped again", () => {
    const out = render(
      "{{TABLE}}{{ROW}}${{a|escape_md}}|z{{END_ROW}}{{END_TABLE}}",
      [["a", "x|y"]]
    );
    expect(out).toBe("| x\\|y | z |");
  });

  it("a plain unescaped pipe is still escaped", () => {
    const out = render("{{TABLE}}{{ROW}}${{a}}|z{{END_ROW}}{{END_TABLE}}", [
      ["a", "x|y"],
    ]);
    expect(out).toBe("| x\\|y | z |");
  });
});
