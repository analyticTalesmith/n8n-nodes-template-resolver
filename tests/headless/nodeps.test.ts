import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "..", "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tsconfig = JSON.parse(
  fs.readFileSync(path.join(root, "tsconfig.json"), "utf8")
);

describe("nd-nodeps: no runtime dependencies, api and cli built, bin exposed", () => {
  it("nd-nodeps: package.json declares no runtime dependencies", () => {
    // Passes today by design; guards the must-not "add a runtime dependency".
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
  });

  it("nd-nodeps: package.json exposes the template-resolver bin", () => {
    expect(pkg.bin).toEqual({ "template-resolver": "dist/cli/index.js" });
  });

  it.each(["api/**/*", "cli/**/*"])(
    "nd-nodeps: tsconfig include covers %s",
    (pattern) => {
      expect(tsconfig.include).toContain(pattern);
    }
  );
});
