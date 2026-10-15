/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  DEFAULT_LIMITS,
  TemplateError,
  analyze,
  render,
  resolveTemplate,
  spec,
  validate,
  withDefaultLimits,
} from "../../core/src";
import { Limits, TemplateValue } from "../../core/src/types";
import { main } from "../../cli/main";
import { call, check, postJson, Running, start, stop } from "../headless/http-helpers";

// Every template that must render ok gets the data it needs, so strict mode never fails on a missing variable.
const DATA: Record<string, TemplateValue> = { a: "v", t: "x", xs: ["a"], v: "none" };

type Mode = "render-lenient" | "render-strict" | "validate" | "analyze" | "resolve";
const MODES: Mode[] = ["render-lenient", "render-strict", "validate", "analyze", "resolve"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for any uncoded exception such as a RangeError */
  code: string;
  line?: number;
  column?: number;
  severity?: string;
  message?: string;
  suggestion?: string;
  output?: string;
  blocks?: Record<string, number | undefined>;
}

function fromError(e: unknown): Outcome {
  if (e instanceof TemplateError) {
    return {
      code: e.code,
      line: e.line,
      column: e.column,
      severity: "error",
      message: e.detail,
      suggestion: e.suggestion,
    };
  }
  return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
}

function outcome(
  mode: Mode,
  template: string,
  limits?: Partial<Limits>,
  data: Record<string, TemplateValue> = DATA
): Outcome {
  try {
    if (mode === "render-lenient" || mode === "render-strict") {
      const r = render(template, data, { strictMode: mode === "render-strict", limits });
      if (r.ok) return { code: "ok", output: r.output };
      const d = r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, message: d.message, suggestion: d.suggestion, output: r.output };
    }
    if (mode === "validate") {
      const r = validate(template, { limits });
      if (r.ok) return { code: "ok" };
      const d = r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, message: d.message, suggestion: d.suggestion };
    }
    if (mode === "analyze") {
      const a = analyze(template, { limits });
      return { code: "ok", blocks: a.blocks };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode: true, limits });
    return { code: "ok", output: out };
  } catch (e) {
    return fromError(e);
  }
}

const vars = (n: number) => "${{a}}".repeat(n);
const nest = (n: number) => "{{IF t}}".repeat(n) + "x" + "{{END_IF}}".repeat(n);

describe("ln-limit: maxNodes is counted at parse and the crossing node is located", () => {
  interface Row {
    name: string;
    template: string;
    maxNodes: number;
    code: "ok" | "limit-nodes";
    line?: number;
    column?: number;
  }
  const rows: Row[] = [];
  for (const n of [1, 5, 20]) {
    rows.push({ name: `${n} adjacent variables fit exactly in ${n}`, template: vars(n), maxNodes: n, code: "ok" });
    rows.push({ name: `${n + 1} adjacent variables cross ${n} at column ${6 * n + 1}`, template: vars(n + 1), maxNodes: n, code: "limit-nodes", line: 1, column: 6 * n + 1 });
  }
  rows.push(
    { name: "a text run plus 3 variables fit in 4", template: "ab\n" + vars(3), maxNodes: 4, code: "ok" },
    { name: "the crossing variable on the second line is located on line 2 column 19", template: "ab\n" + vars(4), maxNodes: 4, code: "limit-nodes", line: 2, column: 19 },
    { name: "IF with one text child is two nodes and fits in 2", template: "{{IF t}}x{{END_IF}}", maxNodes: 2, code: "ok" },
    { name: "IF with one text child crosses 1 at the text (column 9)", template: "{{IF t}}x{{END_IF}}", maxNodes: 1, code: "limit-nodes", line: 1, column: 9 },
    { name: "IF with ELSEIF is four nodes and fits in 4", template: "{{IF t}}a{{ELSEIF t}}b{{END_IF}}", maxNodes: 4, code: "ok" },
    { name: "IF with ELSEIF crosses 3 at the ELSEIF body (column 22)", template: "{{IF t}}a{{ELSEIF t}}b{{END_IF}}", maxNodes: 3, code: "limit-nodes", line: 1, column: 22 },
    { name: "an ELSE adds no node: IF, text, text fit in 3", template: "{{IF t}}a{{ELSE}}b{{END_IF}}", maxNodes: 3, code: "ok" },
    { name: "a FOR body counts its children and fits in 3", template: "{{FOR xs AS i}}${{i}}${{i}}{{END_FOR}}", maxNodes: 3, code: "ok" },
    { name: "a FOR body counts its children: the second body variable crosses 2 (column 22)", template: "{{FOR xs AS i}}${{i}}${{i}}{{END_FOR}}", maxNodes: 2, code: "limit-nodes", line: 1, column: 22 },
    { name: "a TABLE row counts its cell content and fits in 3", template: "{{TABLE}}{{ROW}}${{a}}{{END_ROW}}{{END_TABLE}}", maxNodes: 3, code: "ok" },
    { name: "a TABLE row counts its cell content: the cell variable crosses 2 (column 17)", template: "{{TABLE}}{{ROW}}${{a}}{{END_ROW}}{{END_TABLE}}", maxNodes: 2, code: "limit-nodes", line: 1, column: 17 },
    { name: "maxNodes 0 accepts the empty template", template: "", maxNodes: 0, code: "ok" },
    { name: "maxNodes 0 rejects any text at 1:1", template: "x", maxNodes: 0, code: "limit-nodes", line: 1, column: 1 },
    { name: "the parse error wins over a later missing variable when the count crossed first", template: "${{missing}}${{a}}${{a}}", maxNodes: 2, code: "limit-nodes", line: 1, column: 19 }
  );
  const cases = MODES.flatMap((mode) => rows.map((row) => ({ mode, ...row })));

  it.each(cases)("ln-limit: [$mode] $name", (c) => {
    const o = outcome(c.mode, c.template, { maxNodes: c.maxNodes });
    check(o.code, `${c.mode}: code is ${c.code}`).toBe(c.code);
    if (c.code === "limit-nodes") {
      check({ line: o.line, column: o.column }, `${c.mode}: located at the crossing node`).toEqual({ line: c.line, column: c.column });
    }
  });

  it.each(MODES)("ln-limit: [%s] an absent limit means 20000: 20000 variables render, 20001 cross at column 120001", (mode) => {
    check(outcome(mode, vars(20000)).code, `${mode}: 20000 nodes are fine by default`).toBe("ok");
    const o = outcome(mode, vars(20001));
    check(o.code, `${mode}: node 20001 crosses the default limit`).toBe("limit-nodes");
    check({ line: o.line, column: o.column }, `${mode}: located at node 20001`).toEqual({ line: 1, column: 120001 });
  });

  it.each(MODES)("ln-limit: [%s] the diagnostic is an error with a message and a suggestion naming limits.maxNodes", (mode) => {
    const o = outcome(mode, vars(3), { maxNodes: 2 });
    check(o.code, `${mode}: limit-nodes`).toBe("limit-nodes");
    check(o.severity, `${mode}: severity error`).toBe("error");
    check((o.message ?? "").length, `${mode}: has a message`).toBeGreaterThan(0);
    check(o.suggestion ?? "", `${mode}: suggestion names the option`).toContain("limits.maxNodes");
  });

  it.each(["render-lenient", "render-strict"] as Mode[])("ln-limit: [%s] render returns ok false and an empty output and never throws", (mode) => {
    let result: ReturnType<typeof render> | undefined;
    expect(() => {
      result = render(vars(3), DATA, { strictMode: mode === "render-strict", limits: { maxNodes: 2 } });
    }).not.toThrow();
    check(result?.ok, "ok is false").toBe(false);
    check(result?.output, "output is empty").toBe("");
    check(result?.diagnostics[0]?.code, "first diagnostic is limit-nodes").toBe("limit-nodes");
  });

  it("ln-limit: validate reports ok false with the limit-nodes error diagnostic", () => {
    const r = validate(vars(3), { limits: { maxNodes: 2 } });
    check(r.ok, "validate is not ok").toBe(false);
    check(r.diagnostics.map((d) => `${d.severity}:${d.code}`), "validate lists the error").toContain("error:limit-nodes");
  });

  it.each([vars(7), "ab\n" + vars(6), "{{IF t}}a{{ELSEIF t}}b{{ELSEIF t}}c{{END_IF}}"])(
    "ln-limit: code and location are identical across render, validate and analyze for %#",
    (template) => {
      const all = MODES.map((m) => outcome(m, template, { maxNodes: 3 }));
      const first = { code: all[0].code, line: all[0].line, column: all[0].column };
      check(first.code, "render crosses the limit").toBe("limit-nodes");
      for (let i = 1; i < all.length; i++) {
        check({ code: all[i].code, line: all[i].line, column: all[i].column }, `${MODES[i]} equals render`).toEqual(first);
      }
    }
  );

  const existing = [
    { name: "maxDepth keeps limit-depth", template: "{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}", limits: { maxDepth: 1, maxNodes: 100 }, code: "limit-depth", modes: MODES },
    { name: "maxIterations keeps limit-iterations", template: "{{FOR xs AS i}}${{i}}{{END_FOR}}", limits: { maxIterations: 0, maxNodes: 100 }, code: "limit-iterations", modes: ["render-lenient", "render-strict", "resolve"] as Mode[] },
    { name: "maxOutputChars keeps limit-output", template: "abcdefghij", limits: { maxOutputChars: 5, maxNodes: 100 }, code: "limit-output", modes: ["render-lenient", "render-strict", "resolve"] as Mode[] },
  ].flatMap((r) => r.modes.map((mode) => ({ ...r, mode })));
  it.each(existing)("ln-limit: [$mode] $name next to maxNodes", (c) => {
    check(outcome(c.mode, c.template, c.limits).code, `${c.mode}: ${c.code}`).toBe(c.code);
  });
});

describe("ln-elseif: long chains and deep nesting never overflow the stack", () => {
  const chain = (n: number, body: (i: number) => string, tail = "") =>
    Array.from({ length: n }, (_, i) => `{{${i === 0 ? "IF" : "ELSEIF"} v == "${i}"}}${body(i)}`).join("") + tail + "{{END_IF}}";

  it.each(MODES)("ln-elseif: [%s] an ELSEIF chain of 20000 branches gives limit-nodes, no RangeError, no thrown render", (mode) => {
    const o = outcome(mode, "{{IF t}}a" + "{{ELSEIF t}}b".repeat(20000) + "{{END_IF}}");
    check(o.code, `${mode}: limit-nodes`).toBe("limit-nodes");
  });

  it.each(MODES)("ln-elseif: [%s] 30000 variables give limit-nodes", (mode) => {
    check(outcome(mode, vars(30000)).code, `${mode}: limit-nodes`).toBe("limit-nodes");
  });

  it.each(MODES)("ln-elseif: [%s] an empty-body chain of 19000 branches is under the limit and is ok without a RangeError", (mode) => {
    const o = outcome(mode, "{{IF t}}" + "{{ELSEIF t}}".repeat(19000) + "{{END_IF}}");
    check(o.code, `${mode}: ok`).toBe("ok");
  });

  const sizes = [5000, 8000];
  const matches = sizes.flatMap((n) => MODES.map((mode) => ({ n, mode, hit: Math.floor(n / 2) })));
  it.each(matches)("ln-elseif: [$mode] a chain of $n branches renders the one true branch ($hit) and analyzes ok", (c) => {
    const t = chain(c.n, (i) => `b${i}`);
    const o = outcome(c.mode, t, undefined, { ...DATA, v: String(c.hit) });
    check(o.code, `${c.mode}: ok`).toBe("ok");
    if (c.mode !== "analyze" && c.mode !== "validate") {
      check(o.output, `${c.mode}: the first true branch body`).toBe(`b${c.hit}`);
    }
    if (c.mode === "analyze") check(o.blocks?.IF, "analyze counts one IF block").toBe(1);
  });

  it.each(["render-lenient", "render-strict", "resolve"] as Mode[])("ln-elseif: [%s] a chain of 3000 branches ending in ELSE renders the else text when none match", (mode) => {
    const t = chain(3000, (i) => `b${i}`, "{{ELSE}}fallback");
    check(outcome(mode, t).output, `${mode}: else text`).toBe("fallback");
  });

  it.each(["render-lenient", "render-strict", "resolve"] as Mode[])("ln-elseif: [%s] 40 nested IF blocks give limit-depth by default at the 33rd tag", (mode) => {
    const o = outcome(mode, nest(40));
    check(o.code, `${mode}: limit-depth, not a RangeError`).toBe("limit-depth");
    check({ line: o.line, column: o.column }, `${mode}: the 33rd opening tag`).toEqual({ line: 1, column: 8 * 32 + 1 });
  });

  it.each(MODES)("ln-elseif: [%s] 5000 nested IF blocks give a coded limit-depth", (mode) => {
    const o = outcome(mode, nest(5000));
    check(o.code, `${mode}: coded limit-depth`).toBe("limit-depth");
  });
});

describe("ln-analyze: analyze applies the caller limits, else the defaults", () => {
  it.each([40, 200])("ln-analyze: %i nested IF blocks return an analysis with that many IF blocks", (n) => {
    const o = outcome("analyze", nest(n));
    check(o.code, "analysis returned, no limit-depth").toBe("ok");
    check(o.blocks?.IF, "IF block count equals the nesting").toBe(n);
  });

  it("ln-analyze: 1000 nested IF blocks throw a TemplateError limit-depth, not a RangeError", () => {
    const o = outcome("analyze", nest(1000));
    check(o.code, "coded limit-depth").toBe("limit-depth");
  });

  it("ln-analyze: a caller maxDepth of 5 passes 5 nested blocks and fails the 6th at its opening tag", () => {
    check(outcome("analyze", nest(5), { maxDepth: 5 }).code, "5 nested pass").toBe("ok");
    const o = outcome("analyze", nest(6), { maxDepth: 5 });
    check(o.code, "6 nested fail").toBe("limit-depth");
    check({ line: o.line, column: o.column }, "located at the 6th tag").toEqual({ line: 1, column: 8 * 5 + 1 });
  });

  it("ln-analyze: a caller maxNodes of 3 applies to analyze", () => {
    const o = outcome("analyze", nest(40), { maxNodes: 3 });
    check(o.code, "limit-nodes").toBe("limit-nodes");
    check({ line: o.line, column: o.column }, "the fourth node").toEqual({ line: 1, column: 8 * 3 + 1 });
  });

  it("ln-analyze: a caller maxNodes leaves maxDepth unset, so 40 nested blocks still pass with a large maxNodes", () => {
    check(outcome("analyze", nest(40), { maxNodes: 100 }).code, "no depth failure").toBe("ok");
  });

  it("ln-analyze: validate of 40 nested blocks is ok", () => {
    check(outcome("validate", nest(40)).code, "validate ok").toBe("ok");
  });

  it("ln-analyze: render keeps the default depth 32 and fails 40 nested blocks at the 33rd tag", () => {
    const o = outcome("render-strict", nest(40));
    check(o.code, "limit-depth").toBe("limit-depth");
    check({ line: o.line, column: o.column }, "33rd tag").toEqual({ line: 1, column: 8 * 32 + 1 });
  });
});

describe("ln-surfaces: API, CLI and OpenAPI carry maxNodes", () => {
  let running: Running | undefined;
  afterEach(async () => {
    await stop(running);
    running = undefined;
  });
  async function up(limits?: Partial<Limits>): Promise<Running> {
    running = await start(limits ? { limits } : undefined);
    return running;
  }
  const codes = (r: { json: any }): string[] => (r.json?.diagnostics ?? []).map((d: any) => d.code);

  it("ln-surfaces: a request maxNodes of 5 lowers the server's 10 and 6 variables fail", async () => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/render", { template: vars(6), data: DATA, options: { limits: { maxNodes: 5 } } });
    check(r.status, "200").toBe(200);
    check(r.json?.ok, "ok false").toBe(false);
    check(codes(r), "limit-nodes reported").toContain("limit-nodes");
  });

  it.each([
    { name: "a request value of 50 is capped at the server's 10: 11 fail", n: 11, options: { limits: { maxNodes: 50 } }, ok: false },
    { name: "a request value of 50 is capped at the server's 10: 10 pass", n: 10, options: { limits: { maxNodes: 50 } }, ok: true },
    { name: "a request without it uses the server's 10: 11 fail", n: 11, options: undefined, ok: false },
    { name: "a request without it uses the server's 10: 10 pass", n: 10, options: undefined, ok: true },
  ])("ln-surfaces: $name", async (c) => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/render", { template: vars(c.n), data: DATA, options: c.options });
    check(r.status, "200").toBe(200);
    check(r.json?.ok, `ok is ${c.ok}`).toBe(c.ok);
    if (!c.ok) check(codes(r), "limit-nodes reported").toContain("limit-nodes");
  });

  it.each([-1, 1.5, "3"])("ln-surfaces: options.limits.maxNodes of %p is a 400 invalid-request naming maxNodes", async (value) => {
    const r = await postJson(await up(), "/v1/render", { template: "x", options: { limits: { maxNodes: value } } });
    check(r.status, "400").toBe(400);
    check(r.json?.error?.code, "invalid-request").toBe("invalid-request");
    check(String(r.json?.error?.message), "message names maxNodes").toContain("maxNodes");
  });

  it("ln-surfaces: POST /v1/validate applies the server maxNodes", async () => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/validate", { template: vars(11) });
    check(r.json?.ok, "ok false").toBe(false);
    check(
      (r.json?.diagnostics ?? []).map((d: any) => `${d.severity}:${d.code}`),
      "limit-nodes error diagnostic"
    ).toContain("error:limit-nodes");
  });

  it("ln-surfaces: POST /v1/analyze applies the server maxNodes and answers with the analysis diagnostic shape", async () => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/analyze", { template: vars(11) });
    check(r.status, "200").toBe(200);
    check(r.json?.variables, "no variables").toEqual([]);
    check(r.json?.filters, "no filters").toEqual([]);
    check(r.json?.blocks, "no blocks").toEqual({});
    check(r.json?.diagnostics?.length, "one diagnostic").toBe(1);
    const d = r.json.diagnostics[0];
    check({ code: d.code, line: d.line, column: d.column, hasMessage: typeof d.message === "string" }, "diagnostic shape").toEqual({
      code: "limit-nodes",
      line: 1,
      column: 61,
      hasMessage: true,
    });
  });

  describe("cli", () => {
    let dir: string;
    beforeAll(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-nodes-"));
    });
    afterAll(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });
    const file = (name: string, content: string) => {
      const p = path.join(dir, name);
      fs.writeFileSync(p, content);
      return p;
    };
    async function run(argv: string[]) {
      const r = { code: -1, out: "", err: "" };
      r.code = await main(argv, {
        readStdin: async () => "",
        stdout: (t) => {
          r.out += t;
        },
        stderr: (t) => {
          r.err += t;
        },
      });
      return r;
    }

    it("ln-surfaces: render --max-nodes 3 with 4 variables exits 1 with a located limit-nodes line on stderr", async () => {
      const t = file("n4.txt", vars(4));
      const d = file("n4.json", JSON.stringify({ a: "v" }));
      const r = await run(["render", t, "--data", d, "--max-nodes", "3"]);
      check(r.code, "exit 1").toBe(1);
      check(r.err, "stderr names code, line and column").toMatch(/:1:19: error limit-nodes:/);
    });

    it("ln-surfaces: render --max-nodes 4 with 4 variables exits 0", async () => {
      const t = file("n4b.txt", vars(4));
      const d = file("n4b.json", JSON.stringify({ a: "v" }));
      const r = await run(["render", t, "--data", d, "--max-nodes", "4"]);
      check({ code: r.code, out: r.out }, "exit 0 and the output").toEqual({ code: 0, out: "vvvv" });
    });

    it.each(["abc", "-1", "1.5"])("ln-surfaces: --max-nodes %s exits 2 with the non-negative integer message naming the flag", async (value) => {
      const t = file("n4c.txt", "x");
      const r = await run(["render", t, "--max-nodes", value]);
      check(r.code, "exit 2").toBe(2);
      check(r.err, "message names the flag and the rule").toContain("--max-nodes must be a non-negative integer");
    });

    it("ln-surfaces: --json carries the limit-nodes diagnostic", async () => {
      const t = file("n4d.txt", vars(4));
      const d = file("n4d.json", JSON.stringify({ a: "v" }));
      const r = await run(["render", t, "--data", d, "--max-nodes", "3", "--json"]);
      const result = r.out ? JSON.parse(r.out) : { diagnostics: [{}] };
      check(result.ok, "ok false").toBe(false);
      check(result.diagnostics[0].code, "limit-nodes").toBe("limit-nodes");
    });

    it("ln-surfaces: the usage text printed for --help names --max-nodes", async () => {
      const r = await run(["--help"]);
      check(r.out, "usage lists --max-nodes").toContain("--max-nodes");
    });

    it("ln-surfaces: analyze of a 40-deep nested template exits 0", async () => {
      const r = await run(["analyze", file("deep.txt", nest(40))]);
      check(r.code, "exit 0").toBe(0);
    });
  });

  describe("openapi and spec", () => {
    const doc = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "api", "openapi.json"), "utf8"));

    it("ln-surfaces: Limits lists maxNodes as a required integer with minimum 0", () => {
      const limits = doc().components.schemas.Limits;
      check(limits.properties.maxNodes?.type, "type integer").toBe("integer");
      check(limits.properties.maxNodes?.minimum, "minimum 0").toBe(0);
      check(limits.required, "required").toContain("maxNodes");
    });

    it("ln-surfaces: RequestLimits lists maxNodes", () => {
      check(doc().components.schemas.RequestLimits.properties.maxNodes, "present").toBeDefined();
    });

    const expected = { maxIterations: 10000, maxOutputChars: 1000000, maxDepth: 32, maxNodes: 20000 };
    it("ln-surfaces: spec().limits and GET /v1/spec equal the defaults with maxNodes 20000", async () => {
      check(spec().limits, "spec().limits").toEqual(expected);
      const r = await call(await up(), "GET", "/v1/spec");
      check(r.json?.limits, "GET /v1/spec limits").toEqual(expected);
    });

    it("ln-surfaces: DEFAULT_LIMITS.maxNodes is 20000 and withDefaultLimits fills or keeps it", () => {
      check(DEFAULT_LIMITS.maxNodes, "default").toBe(20000);
      check(withDefaultLimits({}).maxNodes, "filled").toBe(20000);
      check(withDefaultLimits({ maxNodes: 7 }).maxNodes, "kept").toBe(7);
    });
  });
});
