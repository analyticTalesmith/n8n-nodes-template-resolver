import { resolveTemplate } from "../../core/src/resolve";
import { TemplateValue } from "../../core/src/types";

// Render, capturing a thrown error as text so a defect shows as a failed
// expectation rather than an escaping exception.
function render(
  template: string,
  entries: [string, TemplateValue][],
  strictMode = false,
): string {
  try {
    return resolveTemplate(template, new Map(entries), { strictMode });
  } catch (e) {
    return `THROWN: ${(e as Error).message}`;
  }
}

const OUTER: [string, TemplateValue][] = [
  ["outer", [1, 2]],
  ["inner", ["a", "b"]],
];

describe("nested FOR keeps outer loop variables", () => {
  it("nf-01: the outer item variable still resolves after an inner FOR ends", () => {
    const t =
      "{{FOR outer AS o}}${{o}}:{{FOR inner AS i}}${{i}}{{END_FOR}}:${{o}}|{{END_FOR}}";
    expect(render(t, OUTER)).toBe("1:ab:1|2:ab:2|");
  });

  it("nf-01: the outer item still resolves after two sequential inner FORs", () => {
    const t =
      "{{FOR outer AS o}}{{FOR inner AS i}}${{i}}{{END_FOR}}{{FOR inner AS j}}${{j}}{{END_FOR}}${{o}};{{END_FOR}}";
    expect(render(t, OUTER)).toBe("abab1;abab2;");
  });

  it("nf-01: three levels deep, every enclosing item still resolves", () => {
    const t =
      "{{FOR outer AS o}}{{FOR inner AS i}}{{FOR outer AS k}}${{k}}{{END_FOR}}${{i}}{{END_FOR}}${{o}};{{END_FOR}}";
    expect(render(t, OUTER)).toBe("12a12b1;12a12b2;");
  });

  it("nf-02: outer @index0, @index1, @first and @last are the outer values after an inner FOR", () => {
    const t =
      "{{FOR outer AS o}}{{FOR inner AS i}}{{END_FOR}}${{@index0}}/${{@index1}}/${{@first}}/${{@last}};{{END_FOR}}";
    expect(render(t, OUTER)).toBe("0/1/true/false;1/2/false/true;");
  });

  it("nf-02: IF @last takes the outer branch after an inner FOR", () => {
    const t =
      "{{FOR outer AS o}}{{FOR inner AS i}}${{i}}{{END_FOR}}{{IF @last}}END{{ELSE}}more{{END_IF}};{{END_FOR}}";
    expect(render(t, OUTER)).toBe("abmore;abEND;");
  });

  it("nf-02: @notFirst and @notLast are also the outer values after an inner FOR", () => {
    const t =
      "{{FOR outer AS o}}{{FOR inner AS i}}{{END_FOR}}${{@notFirst}}/${{@notLast}};{{END_FOR}}";
    expect(render(t, OUTER)).toBe("false/true;true/false;");
  });

  it("nf-03: inside the inner FOR the metadata describes the inner loop and the outer index follows it", () => {
    const t =
      "{{FOR outer AS o}}{{FOR inner AS i}}${{@index0}}${{@first}}${{@last}},{{END_FOR}}|${{@index0}}{{END_FOR}}";
    expect(render(t, OUTER)).toBe(
      "0truefalse,1falsetrue,|00truefalse,1falsetrue,|1",
    );
  });

  it("nf-03: the outer metadata is restored when the inner FOR ends", () => {
    const t =
      "{{FOR outer AS o}}${{@index0}}{{FOR inner AS i}}${{@index0}}{{END_FOR}}${{@index0}};{{END_FOR}}";
    expect(render(t, OUTER)).toBe("0010;1011;");
  });

  it("nf-03: an inner loop of a different length does not leak its @last or @notLast", () => {
    const t =
      "{{FOR outer AS o}}{{FOR one AS x}}${{@last}}{{END_FOR}}${{@last}}${{@notLast}};{{END_FOR}}";
    expect(
      render(t, [
        ["outer", [1, 2]],
        ["one", ["z"]],
      ]),
    ).toBe("truefalsetrue;truetruefalse;");
  });

  it("nf-04: a FOR inside a TABLE does not clear the enclosing loop variables", () => {
    const t =
      "{{FOR outer AS o}}${{o}}:{{TABLE}}{{HEADER}}H{{END_HEADER}}{{FOR inner AS i}}{{ROW}}${{i}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}\n${{o}}@${{@index0}}${{@last}};{{END_FOR}}";
    const out = render(t, OUTER);
    expect(out).toMatch(
      /^1:[\s\S]*\| a \|[\s\S]*\| b \|[\s\S]*\n1@0false;2:[\s\S]*\| a \|[\s\S]*\| b \|[\s\S]*\n2@1true;$/,
    );
  });

  it("guard-single-loop: a lone FOR renders unchanged and loop metadata is gone after it", () => {
    const t =
      "{{FOR inner AS i}}${{i}}${{@index0}}{{IF @last}}.{{ELSE}},{{END_IF}}{{END_FOR}}${{i}}${{@index0}}";
    expect(render(t, OUTER)).toBe("a0,b1.");
  });

  it("guard-sequential-loops: two sibling FORs each get their own metadata", () => {
    const t =
      "{{FOR inner AS i}}${{@index1}}{{END_FOR}}{{FOR outer AS o}}${{o}}${{@first}}{{END_FOR}}";
    expect(render(t, OUTER)).toBe("121true2false");
  });
});
