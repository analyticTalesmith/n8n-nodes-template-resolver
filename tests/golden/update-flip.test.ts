import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runGoldenCases } from "./harness";

describe("golden update mode when the outcome flips", () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "golden-flip-"));
    fs.mkdirSync(path.join(root, "c"));
    fs.writeFileSync(path.join(root, "c", "template.md"), "t");
    fs.writeFileSync(path.join(root, "c", "data.json"), "{}");
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const files = () => fs.readdirSync(path.join(root, "c")).sort();

  test("a case that now renders replaces its expected-error.txt with expected.md", () => {
    fs.writeFileSync(path.join(root, "c", "expected-error.txt"), "old");
    const results = runGoldenCases(root, () => "out", { update: true });
    expect(results.map((r) => r.passed)).toEqual([true]);
    expect(files()).toEqual(["data.json", "expected.md", "template.md"]);
    expect(fs.readFileSync(path.join(root, "c", "expected.md"), "utf8")).toBe("out");
  });

  test("a case that now throws replaces its expected.md with expected-error.txt", () => {
    fs.writeFileSync(path.join(root, "c", "expected.md"), "old");
    const results = runGoldenCases(
      root,
      () => {
        throw new Error("boom");
      },
      { update: true },
    );
    expect(results.map((r) => r.passed)).toEqual([true]);
    expect(files()).toEqual(["data.json", "expected-error.txt", "template.md"]);
    expect(fs.readFileSync(path.join(root, "c", "expected-error.txt"), "utf8")).toBe("boom");
  });
});
