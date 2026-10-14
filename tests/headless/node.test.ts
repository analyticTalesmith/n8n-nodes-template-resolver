/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateResolver } from "../../n8n/TemplateResolver.node";

async function run(
  params: Record<string, any>
): Promise<{ json?: any; error?: Error }> {
  const node = new TemplateResolver();
  const ctx: any = {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (name: string, _i: number, dflt?: any) =>
      name in params ? params[name] : dflt,
    continueOnFail: () => false,
    getNode: () => ({ name: "TemplateResolver" }),
  };
  try {
    const result = await node.execute.call(ctx);
    return { json: result[0][0].json };
  } catch (e) {
    return { error: e as Error };
  }
}

const base = {
  variableMappings: { mappings: [{ variableName: "who", value: "world" }] },
  strictMode: true,
  showDetectedVariables: false,
};

describe("nd-output: node writes the render output", () => {
  it("nd-output: writes to the default resolved_prompt field", async () => {
    const r = await run({
      ...base,
      template: "hello ${{who}}",
      outputField: "resolved_prompt",
    });
    expect(r.error).toBeUndefined();
    expect(r.json.resolved_prompt).toBe("hello world");
  });

  it("nd-output: writes to the configured output field", async () => {
    const r = await run({
      ...base,
      template: "hello ${{who}}",
      outputField: "custom",
    });
    expect(r.error).toBeUndefined();
    expect(r.json.custom).toBe("hello world");
    expect(r.json.resolved_prompt).toBeUndefined();
  });

  it.each([
    ["missing variable on line 3", "a\nb\n${{missing}}", 3, 1],
    ["missing variable mid-line on line 2", "a\nxx ${{missing}}", 2, 4],
  ] as [string, string, number, number][])(
    "nd-output: a failed render (%s) throws a NodeOperationError carrying line and column",
    async (_n, template, line, column) => {
      const r = await run({
        ...base,
        variableMappings: { mappings: [] },
        template,
        outputField: "resolved_prompt",
      });
      expect(r.error).toBeDefined();
      expect(r.error!.name).toBe("NodeOperationError");
      expect(r.error!.message).toContain(`line ${line}, column ${column}`);
      expect(r.error!.message).toContain("missing");
    }
  );

  it("nd-output: a syntax error reports its line and column", async () => {
    const r = await run({
      ...base,
      template: "a\n{{IF who}}x",
      outputField: "resolved_prompt",
    });
    expect(r.error).toBeDefined();
    expect(r.error!.message).toMatch(/\(line 2, column \d+\)/);
  });
});
