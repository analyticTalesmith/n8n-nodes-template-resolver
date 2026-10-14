import { spawnSync } from "node:child_process";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const TIMEOUT_MS = 3000;

// The child transpiles the TypeScript sources on the fly, so a hang happens
// in a separate process that the parent kills on timeout.
const CHILD = `
const ts = require("typescript");
const fs = require("fs");
require.extensions[".ts"] = (m, f) =>
  m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"),
    { compilerOptions: { module: "commonjs", target: "es2019" } }).outputText, f);
const core = require(process.argv[1] + "/core/src");
const { template, mode, data } = JSON.parse(process.argv[2]);
let out;
if (mode === "resolve") {
  try {
    out = { kind: "ok", output: core.resolveTemplate(template, new Map(Object.entries(data))) };
  } catch (e) {
    out = { kind: "thrown", isTemplateError: e instanceof core.TemplateError, message: String(e.message) };
  }
} else {
  try {
    const r = core.render(template, data);
    out = { kind: "render", ok: r.ok, output: r.output, diagnostics: r.diagnostics.length };
  } catch (e) {
    out = { kind: "thrown", isTemplateError: false, message: String(e.message) };
  }
}
process.stdout.write(JSON.stringify(out));
`;

// Assert with the expected behavior in the failure text (expect takes no message).
function check(msg: string, actual: unknown, expected: unknown): void {
  expect(msg + " => " + String(actual)).toBe(msg + " => " + String(expected));
}

interface Outcome {
  timedOut: boolean;
  result?: any;
  stderr: string;
}

function run(
  mode: "resolve" | "render",
  template: string,
  data: Record<string, unknown> = {},
): Outcome {
  const r = spawnSync(
    process.execPath,
    ["-e", CHILD, ROOT, JSON.stringify({ template, mode, data })],
    { timeout: TIMEOUT_MS, killSignal: "SIGKILL", encoding: "utf8", cwd: ROOT },
  );
  const timedOut = r.error !== undefined || r.signal !== null;
  let result: any;
  if (!timedOut) {
    try {
      result = JSON.parse(r.stdout);
    } catch {
      result = undefined;
    }
  }
  return { timedOut, result, stderr: String(r.stderr ?? "") };
}

const HANG_CASES: [string, string][] = [
  ["quote after plus", '${{ 1 + "x" }}'],
  ["lone double-quoted string", '${{ "x" }}'],
  ["single-quoted string", "${{ 1 + 'x' }}"],
  ["backslash operand", "${{ 2 * \ }}"],
  ["non-ascii letter", "${{ 1 + é }}"],
  ["after literal text and newline", 'a\n${{ 3 + "y" }}'],
];

describe("mh-no-hang: unknown characters in math expressions", () => {
  it.each(HANG_CASES)(
    "mh-no-hang: resolveTemplate terminates and reports an error for %s",
    (_name, template) => {
      const o = run("resolve", template);
      check(
        "mh-no-hang: must finish within the timeout, not loop",
        o.timedOut,
        false,
      );
      check(
        "mh-no-hang: must throw a diagnostic, not succeed",
        o.result?.kind,
        "thrown",
      );
      check(
        "mh-no-hang: the error is a TemplateError",
        o.result?.isTemplateError,
        true,
      );
      expect(o.result?.message).not.toMatch(/success|ok\b/i); // "mh-no-hang: the message must not claim success"
    },
  );

  it.each(HANG_CASES)(
    "mh-no-hang: render returns ok false with a diagnostic for %s",
    (_name, template) => {
      const o = run("render", template);
      check(
        "mh-no-hang: render must finish within the timeout",
        o.timedOut,
        false,
      );
      check(
        "mh-no-hang: render must return, not throw",
        o.result?.kind,
        "render",
      );
      check("mh-no-hang: render reports ok false", o.result?.ok, false);
      check(
        "mh-no-hang: render reports a diagnostic",
        (o.result?.diagnostics ?? 0) > 0,
        true,
      );
    },
  );

  it.each([
    ["sum", "${{ 1 + 2 }}", {}, "3"],
    ["variables", "${{ a * b }}", { a: 2, b: 5 }, "10"],
  ] as [string, string, Record<string, unknown>, string][])(
    "mh-no-hang: valid math still renders for %s",
    (_name, template, data, expected) => {
      const o = run("resolve", template, data);
      check("mh-no-hang: valid math must finish", o.timedOut, false);
      check(
        "mh-no-hang: valid math keeps its value",
        o.result?.output,
        expected,
      );
      const r = run("render", template, data);
      check("mh-no-hang: render of valid math is ok", r.result?.ok, true);
      check("mh-no-hang: render keeps the value", r.result?.output, expected);
    },
  );
});
