/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { main } from "../../cli/main";

interface Run {
  code: number;
  out: string;
  err: string;
  stdinReads: number;
}

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-cli-"));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function file(name: string, content: string): string {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

async function run(argv: string[], stdin = "", signal?: AbortSignal): Promise<Run> {
  const r: Run = { code: -1, out: "", err: "", stdinReads: 0 };
  r.code = await main(argv, {
    readStdin: async () => {
      r.stdinReads += 1;
      return stdin;
    },
    stdout: (t) => {
      r.out += t;
    },
    stderr: (t) => {
      r.err += t;
    },
    signal,
  });
  return r;
}

// Assumption: render prints result.output exactly, with no newline or other text added.
const renderCases: { name: string; template: string; data: object; expected: string }[] = [
  { name: "plain", template: "Hello world", data: {}, expected: "Hello world" },
  { name: "variable", template: "Hi ${{name}}!", data: { name: "Ada" }, expected: "Hi Ada!" },
  {
    name: "IF",
    template: "{{IF on}}yes{{ELSE}}no{{END_IF}}",
    data: { on: true },
    expected: "yes",
  },
  {
    name: "FOR",
    template: "{{FOR xs AS x}}[${{x}}]{{END_FOR}}",
    data: { xs: ["a", "b", "c"] },
    expected: "[a][b][c]",
  },
  { name: "trailing newline kept as is", template: "line\n", data: {}, expected: "line\n" },
];

describe("cl-render", () => {
  it.each(renderCases)(
    "cl-render: $name template file plus data file prints exactly the output and exits 0",
    async ({ template, data, expected }) => {
      const t = file("t.txt", template);
      const d = file("d.json", JSON.stringify(data));
      const r = await run(["render", t, "--data", d]);
      expect({ code: r.code, out: r.out, err: r.err }).toEqual({
        code: 0,
        out: expected,
        err: "",
      });
    },
  );

  it("cl-render: data from stdin ('-') with a template file", async () => {
    const t = file("t2.txt", "Hi ${{name}}!");
    const r = await run(["render", t, "--data", "-"], JSON.stringify({ name: "Bo" }));
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "Hi Bo!" });
  });

  it("cl-render: template from stdin ('-') with a data file", async () => {
    const d = file("d2.json", JSON.stringify({ name: "Cy" }));
    const r = await run(["render", "-", "--data", d], "Hi ${{name}}!");
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "Hi Cy!" });
  });

  it("cl-render: no --data renders with empty data", async () => {
    const t = file("t3.txt", "static");
    const r = await run(["render", t]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "static" });
  });

  it("cl-render: --json prints the full RenderResult and keeps the exit code", async () => {
    const t = file("t4.txt", "Hi ${{name}}!");
    const d = file("d4.json", JSON.stringify({ name: "Di" }));
    const r = await run(["render", t, "--data", d, "--json"]);
    expect(r.code).toBe(0);
    const result = JSON.parse(r.out);
    expect(result).toMatchObject({ ok: true, output: "Hi Di!", diagnostics: [], messages: [] });
    expect(result.stats).toEqual(
      expect.objectContaining({ chars: 6, iterations: 0, sectionsOmitted: 0 }),
    );
    expect(typeof result.stats.estTokens).toBe("number");
  });

  it("cl-render: a template error exits 1, prints file:line:col: error code: message on stderr, stdout empty", async () => {
    const t = file("bad.txt", "line one\n  ${{missing}}\n");
    const r = await run(["render", t, "--strict"]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    const lines = r.err.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const m = /^(.+):(\d+):(\d+): error ([a-z-]+): (.+)$/.exec(lines[0] ?? "");
    expect(m).not.toBeNull();
    expect(m![1]).toBe(t);
    expect(Number(m![2])).toBe(2);
    expect(m![4]).toBe("missing-variable");
  });

  it("cl-render: a syntax error exits 1 with a located error line on stderr", async () => {
    const t = file("syn.txt", "{{IF a}}never closed");
    const r = await run(["render", t]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    expect(r.err).toMatch(/:\d+:\d+: error [a-z-]+: /);
  });

  it("cl-render: --json with a template error prints the failed result and still exits 1", async () => {
    const t = file("bad2.txt", "${{missing}}");
    const r = await run(["render", t, "--strict", "--json"]);
    expect(r.code).toBe(1);
    const result = r.out ? JSON.parse(r.out) : { diagnostics: [{}] };
    expect(result.ok).toBe(false);
    expect(result.output).toBe("");
    expect(result.diagnostics[0].code).toBe("missing-variable");
  });
});

describe("cl-others", () => {
  it("cl-others: validate prints JSON {ok:true} and exits 0 for a good template", async () => {
    const t = file("v1.txt", "Hi ${{name}}");
    const r = await run(["validate", t]);
    expect(r.code).toBe(0);
    expect(r.out ? JSON.parse(r.out) : null).toEqual({ ok: true, diagnostics: [] });
  });

  it("cl-others: validate exits 1 and prints the diagnostics when not ok", async () => {
    const t = file("v2.txt", "{{IF a}}open");
    const r = await run(["validate", t]);
    expect(r.code).toBe(1);
    const result = r.out ? JSON.parse(r.out) : { ok: true, diagnostics: [] };
    expect(result.ok).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("cl-others: validate reads the template from stdin", async () => {
    const r = await run(["validate", "-"], "plain");
    expect(r.code).toBe(0);
    expect(r.out ? JSON.parse(r.out).ok : undefined).toBe(true);
  });

  it("cl-others: analyze prints the analysis JSON with required and blocks", async () => {
    const t = file("a1.txt", '${{a}} ${{b ?? "x"}}{{IF c}}y{{END_IF}}');
    const r = await run(["analyze", t]);
    expect(r.code).toBe(0);
    const result = r.out ? JSON.parse(r.out) : {};
    expect(result.blocks).toEqual(expect.objectContaining({ IF: 1 }));
    expect(JSON.stringify(result)).toContain('"required"');
  });

  it("cl-others: spec prints the spec JSON", async () => {
    const r = await run(["spec"]);
    expect(r.code).toBe(0);
    const spec = r.out ? JSON.parse(r.out) : {};
    expect(Object.keys(spec)).toEqual(
      expect.arrayContaining(["version", "blocks", "filters", "operators", "limits", "syntax"]),
    );
  });
});

describe("cl-usage", () => {
  const usageErrors: { name: string; argv: string[]; stdin?: string }[] = [
    { name: "no arguments", argv: [] },
    { name: "unknown subcommand", argv: ["frobnicate"] },
    { name: "unknown option", argv: ["render", "x.txt", "--bogus"] },
    { name: "missing template file", argv: ["render", "does-not-exist-12345.txt"] },
    {
      name: "missing data file",
      argv: ["render", "-", "--data", "does-not-exist-12345.json"],
      stdin: "x",
    },
    { name: "render without a template argument", argv: ["render"] },
    { name: "both template and data from stdin", argv: ["render", "-", "--data", "-"], stdin: "x" },
    { name: "non-numeric limit", argv: ["render", "-", "--max-depth", "abc"], stdin: "x" },
  ];

  it.each(usageErrors)(
    "cl-usage: $name exits 2 with a message on stderr and nothing on stdout",
    async ({ argv, stdin }) => {
      const r = await run(argv, stdin ?? "");
      expect({ code: r.code, out: r.out }).toEqual({ code: 2, out: "" });
      expect(r.err.trim().length).toBeGreaterThan(0);
    },
  );

  it("cl-usage: invalid data JSON exits 2 with a message on stderr", async () => {
    const t = file("u1.txt", "x");
    const d = file("u1.json", "{not json");
    const r = await run(["render", t, "--data", d]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 2, out: "" });
    expect(r.err.trim().length).toBeGreaterThan(0);
  });

  it("cl-usage: data that is not a JSON object exits 2", async () => {
    const t = file("u2.txt", "x");
    const d = file("u2.json", "[1,2]");
    const r = await run(["render", t, "--data", d]);
    expect(r.code).toBe(2);
    expect(r.err.trim().length).toBeGreaterThan(0);
  });

  it("cl-usage: no arguments prints usage naming the subcommands on stderr", async () => {
    const r = await run([]);
    for (const w of ["render", "validate", "analyze", "spec", "serve"]) {
      expect(r.err).toContain(w);
    }
  });

  it("cl-usage: --help exits 0 and prints usage on stdout", async () => {
    const r = await run(["--help"]);
    expect({ code: r.code, err: r.err }).toEqual({ code: 0, err: "" });
    for (const w of ["render", "validate", "analyze", "spec", "serve"]) {
      expect(r.out).toContain(w);
    }
  });
});

describe("cl-limits", () => {
  it("cl-limits: --no-strict renders a missing variable as empty", async () => {
    const t = file("l1.txt", "a${{missing}}b");
    const r = await run(["render", t, "--no-strict"]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "ab" });
  });

  it("cl-limits: --strict reports a missing variable as an error", async () => {
    const t = file("l2.txt", "a${{missing}}b");
    const r = await run(["render", t, "--strict"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("missing-variable");
  });

  const limitCases: {
    name: string;
    template: string;
    data: object;
    flags: string[];
    code: string;
  }[] = [
    {
      name: "--max-iterations 2 fails a 3-item FOR",
      template: "{{FOR xs AS x}}${{x}}{{END_FOR}}",
      data: { xs: [1, 2, 3] },
      flags: ["--max-iterations", "2"],
      code: "limit-iterations",
    },
    {
      name: "--max-output-chars 5 fails a longer output",
      template: "abcdefghij",
      data: {},
      flags: ["--max-output-chars", "5"],
      code: "limit-output",
    },
    {
      name: "--max-depth 1 fails nested blocks",
      template: "{{IF a}}{{IF b}}x{{END_IF}}{{END_IF}}",
      data: { a: true, b: true },
      flags: ["--max-depth", "1"],
      code: "limit-depth",
    },
  ];

  it.each(limitCases)("cl-limits: $name", async ({ template, data, flags, code }) => {
    const t = file("lim.txt", template);
    const d = file("lim.json", JSON.stringify(data));
    const r = await run(["render", t, "--data", d, ...flags]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    expect(r.err).toContain(`error ${code}:`);
  });

  it("cl-limits: the same FOR passes within the limit", async () => {
    const t = file("lim2.txt", "{{FOR xs AS x}}${{x}}{{END_FOR}}");
    const d = file("lim2.json", JSON.stringify({ xs: [1, 2, 3] }));
    const r = await run(["render", t, "--data", d, "--max-iterations", "3"]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "123" });
  });
});

function request(port: number, body: object): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/v1/render",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, json: JSON.parse(text) });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.end(payload);
  });
}

describe("cl-serve", () => {
  it("cl-serve: serve prints its address, answers POST /v1/render and resolves 0 after abort", async () => {
    const ac = new AbortController();
    const r: Run = { code: -1, out: "", err: "", stdinReads: 0 };
    const done = main(["serve", "--port", "0", "--host", "127.0.0.1"], {
      readStdin: async () => "",
      stdout: (t) => {
        r.out += t;
      },
      stderr: (t) => {
        r.err += t;
      },
      signal: ac.signal,
    });
    let exit: number | "pending" = "pending";
    void done.then((c) => {
      exit = c;
    });
    let port = 0;
    let served: { status: number; json: any } | undefined;
    let code: number | undefined;
    try {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && exit === "pending") {
        const m = /http:\/\/127\.0\.0\.1:(\d+)/.exec(r.out);
        if (m) {
          port = Number(m[1]);
          break;
        }
        await new Promise((res) => setTimeout(res, 25));
      }
      if (port > 0) {
        served = await request(port, { template: "Hi ${{n}}", data: { n: "Zed" } });
      }
    } finally {
      ac.abort();
      code = await Promise.race([
        done,
        new Promise<number>((res) => setTimeout(() => res(-2), 3000)),
      ]);
    }
    expect(port).toBeGreaterThan(0);
    expect(served?.status).toBe(200);
    expect(served?.json).toMatchObject({ ok: true, output: "Hi Zed" });
    expect(code).toBe(0);
  }, 15000);
});
