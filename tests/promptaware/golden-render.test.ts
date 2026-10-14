/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import { render } from "../../core/src";
import { runGoldenCases } from "../golden/harness";

const casesDir = path.join(__dirname, "..", "golden", "render-cases");

// The render adapter: the string the golden harness compares is render's output; a failed render throws.
function renderOutput(template: string, data: any, options: any): string {
  const result = render(template, data, options);
  if (!result.ok) {
    throw new Error(
      `render failed: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`
    );
  }
  return result.output;
}

const results = runGoldenCases(casesDir, renderOutput, { update: false });

describe("sf-golden: prompt-aware golden cases rendered through render", () => {
  it.each(results.map((r) => [r.name, r] as [string, (typeof results)[number]]))(
    "sf-golden: case %s renders to its expected file",
    (_name, r) => {
      expect(r.message ?? "").toBe("");
    }
  );
});
