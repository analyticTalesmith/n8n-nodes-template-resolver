import * as fs from "fs";
import * as path from "path";

export type GoldenRender = (
  template: string,
  data: any,
  options: any,
) => string;

export type GoldenResult = { name: string; passed: boolean; message?: string };

function readIfExists(file: string): string | null {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function firstDifference(name: string, actual: string, expected: string): string {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");
  const count = Math.max(actualLines.length, expectedLines.length);
  for (let i = 0; i < count; i++) {
    if (actualLines[i] !== expectedLines[i]) {
      return [
        `${name}: output differs from expected.md at line ${i + 1}`,
        `  actual:   ${JSON.stringify(actualLines[i] ?? "(no line)")}`,
        `  expected: ${JSON.stringify(expectedLines[i] ?? "(no line)")}`,
      ].join("\n");
    }
  }
  return `${name}: output differs from expected.md`;
}

function runCase(
  dir: string,
  name: string,
  render: GoldenRender,
  update: boolean,
): GoldenResult {
  const template = fs.readFileSync(path.join(dir, "template.md"), "utf8");
  const data = JSON.parse(readIfExists(path.join(dir, "data.json")) ?? "{}");
  const optionsText = readIfExists(path.join(dir, "options.json"));
  const options = optionsText === null ? undefined : JSON.parse(optionsText);

  const expectedFile = path.join(dir, "expected.md");
  const errorFile = path.join(dir, "expected-error.txt");
  const wantsError =
    fs.existsSync(errorFile) && !(update && fs.existsSync(expectedFile));

  let output = "";
  let thrown: string | null = null;
  try {
    output = render(template, data, options);
  } catch (error) {
    thrown = error instanceof Error ? error.message : String(error);
  }

  if (wantsError) {
    if (update && thrown !== null) {
      fs.writeFileSync(errorFile, thrown);
      return { name, passed: true };
    }
    const expectedError = fs.readFileSync(errorFile, "utf8").trim();
    if (thrown === null) {
      return {
        name,
        passed: false,
        message: `${name}: expected an error containing ${JSON.stringify(expectedError)} but render succeeded`,
      };
    }
    if (!thrown.includes(expectedError)) {
      return {
        name,
        passed: false,
        message: `${name}: expected an error containing ${JSON.stringify(expectedError)} but got ${JSON.stringify(thrown)}`,
      };
    }
    return { name, passed: true };
  }

  if (thrown !== null) {
    return {
      name,
      passed: false,
      message: `${name}: render threw ${JSON.stringify(thrown)}`,
    };
  }
  if (update) {
    fs.writeFileSync(expectedFile, output);
    return { name, passed: true };
  }
  const expected = readIfExists(expectedFile);
  if (expected === null) {
    return {
      name,
      passed: false,
      message: `${name}: no expected.md or expected-error.txt`,
    };
  }
  if (output === expected) return { name, passed: true };
  return { name, passed: false, message: firstDifference(name, output, expected) };
}

export function runGoldenCases(
  casesDir: string,
  render: GoldenRender,
  options?: { update?: boolean },
): GoldenResult[] {
  const update = options?.update ?? process.env.UPDATE_GOLDEN === "1";
  return fs
    .readdirSync(casesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => runCase(path.join(casesDir, name), name, render, update));
}
