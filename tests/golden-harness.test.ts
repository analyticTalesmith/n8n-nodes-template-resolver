/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// jest's expect() takes no message argument, so the message travels inside the
// compared value and shows in the matcher diff.
function eq(message: string, actual: unknown, expected: unknown): void {
  expect({ message, actual }).toEqual({ message, actual: expected });
}

function has(text: unknown, part: string): boolean {
  return typeof text === "string" && text.includes(part);
}

type Result = { name: string; passed: boolean; message?: string };
type Render = (template: string, data: any, options: any) => string;

function loadHarness(): any {
  try {
    return require("./golden/harness");
  } catch {
    return null;
  }
}

function loadResolver(): any {
  const coreDir = path.join(__dirname, "..", "core", "src");
  try {
    if (fs.existsSync(coreDir)) {
      return require("../core/src").resolveTemplate;
    }
    return require("../nodes/TemplateResolver/TemplateResolver.node")
      .resolveTemplate;
  } catch {
    return null;
  }
}

function run(
  casesDir: string,
  render: Render,
  options?: { update?: boolean },
): Result[] {
  const mod = loadHarness();
  eq("the golden harness module loads from tests/golden/harness", mod !== null, true);
  eq(
    "the harness exports runGoldenCases as a function",
    mod !== null && typeof mod.runGoldenCases,
    "function",
  );
  return options === undefined
    ? mod.runGoldenCases(casesDir, render)
    : mod.runGoldenCases(casesDir, render, options);
}

function makeCase(
  root: string,
  name: string,
  files: Record<string, string>,
): void {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const all: Record<string, string> = {
    "template.md": "T",
    "data.json": "{}",
    ...files,
  };
  for (const [f, content] of Object.entries(all)) {
    fs.writeFileSync(path.join(dir, f), content);
  }
}

const upper: Render = (t) => t.toUpperCase();

describe("golden-file harness", () => {
  let root: string;
  let savedEnv: string | undefined;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "golden-"));
    savedEnv = process.env.UPDATE_GOLDEN;
    delete process.env.UPDATE_GOLDEN;
  });
  afterEach(() => {
    if (savedEnv === undefined) delete process.env.UPDATE_GOLDEN;
    else process.env.UPDATE_GOLDEN = savedEnv;
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("gf-01: discovers every case folder in sorted order and passes on an exact match", () => {
    makeCase(root, "c-beta", { "template.md": "b\n", "expected.md": "B\n" });
    makeCase(root, "a-alpha", { "template.md": "a\n", "expected.md": "A\n" });
    makeCase(root, "d-gamma", { "template.md": "g\n", "expected.md": "G\n" });
    const results = run(root, upper);
    eq(
      "case names are returned in sorted order",
      results.map((r) => r.name),
      ["a-alpha", "c-beta", "d-gamma"],
    );
    eq(
      "every exactly matching case passes",
      results.map((r) => r.passed),
      [true, true, true],
    );
  });

  test("gf-01: passes data and options from the case files to render", () => {
    makeCase(root, "with-inputs", {
      "template.md": "tpl",
      "data.json": '{"x":1}',
      "options.json": '{"strictMode":false}',
      "expected.md": 'tpl|{"x":1}|{"strictMode":false}',
    });
    const results = run(
      root,
      (t, d, o) => `${t}|${JSON.stringify(d)}|${JSON.stringify(o)}`,
    );
    eq("one result for the one case", results.length, 1);
    eq(
      "render receives the template text, parsed data and parsed options",
      results[0].passed,
      true,
    );
  });

  test("gf-01: the comparison is byte exact, so a missing trailing newline fails", () => {
    makeCase(root, "newline", { "template.md": "a", "expected.md": "A\n" });
    const results = run(root, upper);
    eq("one result for the one case", results.length, 1);
    eq(
      "output without the trailing newline does not equal expected with one",
      results[0].passed,
      false,
    );
  });

  test("gf-02: a mismatch fails with the case name, the 1-based line number and both lines", () => {
    makeCase(root, "mismatch-case", {
      "template.md": "one\ntwo\nthree\n",
      "expected.md": "ONE\nTWO\nXXXXX\n",
    });
    const results = run(root, upper);
    eq("one result for the one case", results.length, 1);
    const r = results[0];
    eq("a mismatch is not passed", r.passed, false);
    eq("a failure carries a message", typeof r.message, "string");
    eq("message names the case", has(r.message, "mismatch-case"), true);
    eq("message gives the 1-based number of the first differing line", has(r.message, "3"), true);
    eq("message shows the actual line", has(r.message, "THREE"), true);
    eq("message shows the expected line", has(r.message, "XXXXX"), true);
  });

  test("gf-02: the reported line is the first difference, not a later one", () => {
    makeCase(root, "first-diff", {
      "template.md": "a\nb\nc\n",
      "expected.md": "A\nBAD\nCBAD\n",
    });
    const results = run(root, upper);
    eq("one result for the one case", results.length, 1);
    const r = results[0];
    eq("mismatch fails", r.passed, false);
    eq("message shows the first differing expected line", has(r.message, "BAD"), true);
    eq("message does not report the later differing line", has(r.message, "CBAD"), false);
  });

  test("gf-03: expected-error.txt passes when render throws a message containing the trimmed text", () => {
    makeCase(root, "err-ok", { "expected-error.txt": "  unclosed IF  \n" });
    const results = run(root, () => {
      throw new Error("Parse error: unclosed IF at line 1");
    });
    eq("one result for the one case", results.length, 1);
    eq(
      "a thrown message containing the trimmed file text passes",
      results[0].passed,
      true,
    );
  });

  test("gf-03: an error case fails when render does not throw", () => {
    makeCase(root, "err-nothrow", { "expected-error.txt": "boom" });
    const results = run(root, () => "fine");
    eq("one result for the one case", results.length, 1);
    eq("no throw fails an error case", results[0].passed, false);
    eq("message names the case", has(results[0].message, "err-nothrow"), true);
  });

  test("gf-03: an error case fails when the thrown message differs", () => {
    makeCase(root, "err-differs", { "expected-error.txt": "boom" });
    const results = run(root, () => {
      throw new Error("something else");
    });
    eq("one result for the one case", results.length, 1);
    eq("a different message fails", results[0].passed, false);
    eq("message names the case", has(results[0].message, "err-differs"), true);
  });

  test("gf-04: options.update rewrites expected.md with the render output and passes", () => {
    makeCase(root, "stale", { "template.md": "new", "expected.md": "old" });
    makeCase(root, "absent", { "template.md": "fresh" });
    const results = run(root, upper, { update: true });
    eq("updated cases pass", results.map((r) => r.passed), [true, true]);
    eq(
      "the stale expected file is rewritten with the output",
      fs.readFileSync(path.join(root, "stale", "expected.md"), "utf8"),
      "NEW",
    );
    const absent = path.join(root, "absent", "expected.md");
    eq(
      "a case with no expected file gets one written",
      fs.existsSync(absent) ? fs.readFileSync(absent, "utf8") : null,
      "FRESH",
    );
  });

  test("gf-04: UPDATE_GOLDEN=1 updates when options.update is undefined", () => {
    makeCase(root, "env", { "template.md": "abc", "expected.md": "old" });
    process.env.UPDATE_GOLDEN = "1";
    const results = run(root, upper, {});
    eq("the case passes in update mode", results.map((r) => r.passed), [true]);
    eq(
      "expected.md is rewritten from the environment switch",
      fs.readFileSync(path.join(root, "env", "expected.md"), "utf8"),
      "ABC",
    );
  });

  test("gf-04: without update a stale expected file is left untouched and fails", () => {
    makeCase(root, "noupdate", { "template.md": "abc", "expected.md": "old" });
    const results = run(root, upper, { update: false });
    eq("one result for the one case", results.length, 1);
    eq("mismatch fails when not updating", results[0].passed, false);
    eq(
      "the expected file is not rewritten",
      fs.readFileSync(path.join(root, "noupdate", "expected.md"), "utf8"),
      "old",
    );
  });

  test("gf-04: update mode rewrites expected-error.txt with the thrown message", () => {
    makeCase(root, "err-update", { "expected-error.txt": "stale text" });
    const results = run(
      root,
      () => {
        throw new Error("the real message");
      },
      { update: true },
    );
    eq("the error case passes in update mode", results.map((r) => r.passed), [true]);
    eq(
      "expected-error.txt holds the thrown message",
      fs.readFileSync(path.join(root, "err-update", "expected-error.txt"), "utf8").trim(),
      "the real message",
    );
  });

  test("gf-05: the shipped suite holds at least eight cases covering the required topics", () => {
    const casesDir = path.join(__dirname, "golden", "cases");
    eq("tests/golden/cases exists", fs.existsSync(casesDir), true);
    const names = fs
      .readdirSync(casesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    eq("at least eight case folders", names.length >= 8, true);
    for (const n of names) {
      const dir = path.join(casesDir, n);
      eq(`${n} has template.md`, fs.existsSync(path.join(dir, "template.md")), true);
      eq(`${n} has data.json`, fs.existsSync(path.join(dir, "data.json")), true);
      const expectedCount = ["expected.md", "expected-error.txt"].filter((f) =>
        fs.existsSync(path.join(dir, f)),
      ).length;
      eq(`${n} has exactly one expected file`, expectedCount, 1);
    }
    for (const topic of ["if", "case", "for", "list", "table", "filter", "default", "error"]) {
      eq(
        `a case directory name contains "${topic}"`,
        names.some((n) => n.toLowerCase().includes(topic)),
        true,
      );
    }
  });

  test("gf-05: every shipped case passes against the real resolver", () => {
    const casesDir = path.join(__dirname, "golden", "cases");
    eq("tests/golden/cases exists", fs.existsSync(casesDir), true);
    const resolveTemplate = loadResolver();
    eq("the real resolveTemplate loads", typeof resolveTemplate, "function");
    const render: Render = (template, data, options) =>
      resolveTemplate(template, new Map(Object.entries(data ?? {})), options);
    const results = run(casesDir, render);
    eq("at least eight cases ran", results.length >= 8, true);
    const failed = results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.message}`);
    eq("no case failed", failed, []);
  });
});
