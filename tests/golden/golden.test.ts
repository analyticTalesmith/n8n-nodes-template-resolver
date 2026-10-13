import * as path from "path";
import { resolveTemplate } from "../../core/src";
import { runGoldenCases } from "./harness";

describe("golden cases", () => {
  test("every case renders to its expected file", () => {
    const results = runGoldenCases(
      path.join(__dirname, "cases"),
      (template, data, options) =>
        resolveTemplate(template, new Map(Object.entries(data)), options),
    );
    const failures = results.filter((r) => !r.passed).map((r) => r.message);
    expect(failures.join("\n\n")).toBe("");
  });
});
