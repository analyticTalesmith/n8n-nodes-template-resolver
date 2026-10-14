/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";
import { check, start, stop, call, postJson, Running, Reply } from "./http-helpers";
import { routes } from "../../api/routes";

let running: Running | undefined;
afterEach(async () => {
  await stop(running);
  running = undefined;
});

async function up(options?: Parameters<typeof start>[0]): Promise<Running> {
  running = await start(options);
  return running;
}

function expectJson(r: Reply, label: string): void {
  check(String(r.headers["content-type"] ?? ""), `${label}: content-type is application/json`).toMatch(
    /^application\/json/
  );
  check(r.json, `${label}: body parses as JSON`).toBeDefined();
}

function expectError(r: Reply, status: number, code: string, label: string): void {
  check(r.status, `${label}: status ${status}`).toBe(status);
  expectJson(r, label);
  check(Object.keys(r.json ?? {}), `${label}: body has only an error key`).toEqual(["error"]);
  check(r.json.error.code, `${label}: error code ${code}`).toBe(code);
  check(typeof r.json.error.message, `${label}: error message is a string`).toBe("string");
  check(r.json.error.message.length, `${label}: error message is not empty`).toBeGreaterThan(0);
}

function expectLocated(diagnostics: any[], label: string): void {
  check(Array.isArray(diagnostics), `${label}: diagnostics is an array`).toBe(true);
  check(diagnostics.length, `${label}: at least one diagnostic`).toBeGreaterThan(0);
  for (const d of diagnostics) {
    check(typeof d.code, `${label}: diagnostic code is a string`).toBe("string");
    check(d.line, `${label}: diagnostic line is 1-based`).toBeGreaterThan(0);
    check(d.column, `${label}: diagnostic column is 1-based`).toBeGreaterThan(0);
  }
}

describe("ap-routes: documented 200 bodies", () => {
  it("ap-routes: POST /v1/render returns the full render result", async () => {
    const r = await postJson(await up(), "/v1/render", {
      template: "Hello ${{name}}!",
      data: { name: "World" },
    });
    check(r.status, "render: 200").toBe(200);
    expectJson(r, "render");
    check(r.json.ok, "render: ok true").toBe(true);
    check(r.json.output, "render: output").toBe("Hello World!");
    check(r.json.messages, "render: messages is an empty array").toEqual([]);
    check(r.json.diagnostics, "render: no diagnostics").toEqual([]);
    check(r.json.stats, "render: stats shape").toEqual({
      chars: 12,
      estTokens: 3,
      sectionsOmitted: 0,
      iterations: 0,
    });
  });

  it("ap-routes: POST /v1/render accepts a missing data and a charset in the content type", async () => {
    const r = await call(await up(), "POST", "/v1/render", JSON.stringify({ template: "plain" }), {
      "content-type": "application/json; charset=utf-8",
    });
    check(r.status, "render without data: 200").toBe(200);
    check(r.json?.ok, "render without data: ok").toBe(true);
    check(r.json?.output, "render without data: output").toBe("plain");
  });

  it("ap-routes: POST /v1/render honours options.strictMode and options.limits", async () => {
    const r = await postJson(await up(), "/v1/render", {
      template: "x",
      data: {},
      options: { strictMode: false, limits: { maxOutputChars: 1000 } },
    });
    check(r.status, "render options: 200").toBe(200);
    check(r.json?.ok, "render options: ok").toBe(true);
  });

  it("ap-routes: a template error is a 200 with ok false and located diagnostics", async () => {
    const r = await postJson(await up(), "/v1/render", {
      template: "line one\n${{nope}}",
      data: {},
    });
    check(r.status, "template error: 200 not an HTTP error").toBe(200);
    expectJson(r, "template error");
    check(r.json.ok, "template error: ok false").toBe(false);
    check(r.json.output, "template error: output is empty").toBe("");
    expectLocated(r.json.diagnostics, "template error");
    check(r.json.diagnostics[0].code, "template error: first diagnostic is the stopping error").toBe(
      "missing-variable"
    );
    check(r.json.diagnostics[0].severity, "template error: severity").toBe("error");
    check(r.json.diagnostics[0].line, "template error: points at the second line").toBe(2);
  });

  it("ap-routes: POST /v1/validate returns ok and diagnostics", async () => {
    const s = await up();
    const good = await postJson(s, "/v1/validate", { template: "Hi ${{name}}" });
    check(good.status, "validate valid: 200").toBe(200);
    expectJson(good, "validate valid");
    check(good.json.ok, "validate valid: ok true").toBe(true);
    check(good.json.diagnostics, "validate valid: no diagnostics").toEqual([]);

    const bad = await postJson(s, "/v1/validate", { template: "{{FOR items AS i}}never closed" });
    check(bad.status, "validate invalid: 200").toBe(200);
    check(bad.json?.ok, "validate invalid: ok false").toBe(false);
    expectLocated(bad.json?.diagnostics, "validate invalid");
  });

  it("ap-routes: POST /v1/analyze returns variables with required, blocks and filters", async () => {
    const r = await postJson(await up(), "/v1/analyze", {
      template: '{{FOR items AS i}}${{i | trim}}{{END_FOR}} ${{title ?? "none"}}',
    });
    check(r.status, "analyze: 200").toBe(200);
    expectJson(r, "analyze");
    const byName = (n: string) => r.json.variables.find((v: any) => v.name === n);
    check(byName("items"), "analyze: items detected").toBeDefined();
    check(byName("items").required, "analyze: a plain variable is required").toBe(true);
    check(byName("title"), "analyze: title detected").toBeDefined();
    check(byName("title").required, "analyze: a variable with a default is not required").toBe(false);
    check(r.json.blocks.FOR, "analyze: one FOR block counted").toBe(1);
    check(
      r.json.filters.map((f: any) => f.name),
      "analyze: trim filter listed"
    ).toContain("trim");
  });

  it("ap-routes: GET /v1/spec returns version, blocks, filters, operators and limits", async () => {
    const r = await call(await up(), "GET", "/v1/spec");
    check(r.status, "spec: 200").toBe(200);
    expectJson(r, "spec");
    check(typeof r.json.version, "spec: version is a string").toBe("string");
    check(
      r.json.blocks.map((b: any) => b.name),
      "spec: FOR block listed"
    ).toContain("FOR");
    check(
      r.json.filters.map((f: any) => f.name),
      "spec: trim filter listed"
    ).toContain("trim");
    check(Array.isArray(r.json.operators), "spec: operators is an array").toBe(true);
    check(r.json.operators.length, "spec: operators not empty").toBeGreaterThan(0);
    check(r.json.limits, "spec: default limits").toEqual({
      maxIterations: 10000,
      maxOutputChars: 1000000,
      maxDepth: 32,
    });
  });
});

describe("ap-errors: malformed requests", () => {
  const badBodies: [string, string, unknown][] = [
    ["missing template", "/v1/render", { data: {} }],
    ["non-string template", "/v1/render", { template: 5 }],
    ["array data", "/v1/render", { template: "x", data: [] }],
    ["string data", "/v1/render", { template: "x", data: "text" }],
    ["strictMode as a string", "/v1/render", { template: "x", options: { strictMode: "yes" } }],
    ["limits as a string", "/v1/render", { template: "x", options: { limits: "many" } }],
    ["null data", "/v1/render", { template: "x", data: null }],
    ["null options", "/v1/render", { template: "x", options: null }],
    ["validate without template", "/v1/validate", {}],
    ["validate with non-string template", "/v1/validate", { template: ["x"] }],
    ["analyze without template", "/v1/analyze", { data: {} }],
    ["analyze with non-string template", "/v1/analyze", { template: null }],
  ];

  it.each(badBodies)("ap-errors: 400 invalid-request for %s", async (label, route, payload) => {
    expectError(await postJson(await up(), route, payload), 400, "invalid-request", label);
  });

  it.each([["/v1/render"], ["/v1/validate"], ["/v1/analyze"]])(
    "ap-errors: 400 invalid-request for bad JSON on %s",
    async (route) => {
      const r = await call(await up(), "POST", route, "{not json", {
        "content-type": "application/json",
      });
      expectError(r, 400, "invalid-request", `bad JSON ${route}`);
    }
  );

  it.each([
    ["GET", "/nope"],
    ["POST", "/v1/unknown"],
    ["GET", "/v1"],
    ["GET", "/"],
  ])("ap-errors: 404 not-found for %s %s", async (method, route) => {
    const r = await call(await up(), method, route);
    expectError(r, 404, "not-found", `${method} ${route}`);
  });

  it.each([
    ["GET", "/v1/render", "POST"],
    ["GET", "/v1/validate", "POST"],
    ["GET", "/v1/analyze", "POST"],
    ["POST", "/v1/spec", "GET"],
    ["POST", "/v1/openapi.json", "GET"],
    ["DELETE", "/v1/render", "POST"],
  ])("ap-errors: 405 method-not-allowed for %s %s with Allow", async (method, route, allow) => {
    const r = await call(await up(), method, route, method === "POST" ? "{}" : undefined, {
      "content-type": "application/json",
    });
    expectError(r, 405, "method-not-allowed", `${method} ${route}`);
    check(String(r.headers["allow"] ?? ""), `${method} ${route}: Allow header names ${allow}`).toContain(allow);
  });

  it("ap-errors: 413 payload-too-large when the body exceeds maxBodyBytes", async () => {
    const r = await postJson(await up({ maxBodyBytes: 64 }), "/v1/render", {
      template: "x".repeat(500),
    });
    expectError(r, 413, "payload-too-large", "oversized body");
  });

  it("ap-errors: a body within maxBodyBytes is accepted", async () => {
    const r = await postJson(await up({ maxBodyBytes: 4096 }), "/v1/render", { template: "ok" });
    check(r.status, "small body: 200").toBe(200);
  });

  it.each([["/v1/render"], ["/v1/validate"], ["/v1/analyze"]])(
    "ap-errors: 415 unsupported-media-type for a text/plain POST to %s",
    async (route) => {
      const r = await call(await up(), "POST", route, JSON.stringify({ template: "x" }), {
        "content-type": "text/plain",
      });
      expectError(r, 415, "unsupported-media-type", `text/plain ${route}`);
    }
  );
});

describe("ap-limits: request limits can only lower the server limits", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => `v${i}`);
  const template = "{{FOR items AS i}}${{i}}{{END_FOR}}";
  const codes = (r: Reply): string[] => (r.json?.diagnostics ?? []).map((d: any) => d.code);

  it("ap-limits: the server limit applies when the request sets none", async () => {
    const s = await up({ limits: { maxIterations: 5 } });
    const over = await postJson(s, "/v1/render", { template, data: { items: items(6) } });
    check(over.status, "no request limit: 200").toBe(200);
    check(over.json?.ok, "no request limit: 6 items exceed 5").toBe(false);
    check(codes(over), "no request limit: limit-iterations reported").toContain("limit-iterations");
    const under = await postJson(s, "/v1/render", { template, data: { items: items(3) } });
    check(under.json?.ok, "no request limit: 3 items fit in 5").toBe(true);
  });

  it("ap-limits: a request asking for more cannot raise the server limit", async () => {
    const r = await postJson(await up({ limits: { maxIterations: 5 } }), "/v1/render", {
      template,
      data: { items: items(6) },
      options: { limits: { maxIterations: 100 } },
    });
    check(r.status, "raise attempt: 200").toBe(200);
    check(r.json?.ok, "raise attempt: still capped at 5").toBe(false);
    check(codes(r), "raise attempt: limit-iterations reported").toContain("limit-iterations");
  });

  it("ap-limits: a request asking for less lowers the server limit", async () => {
    const r = await postJson(await up({ limits: { maxIterations: 5 } }), "/v1/render", {
      template,
      data: { items: items(3) },
      options: { limits: { maxIterations: 2 } },
    });
    check(r.status, "lower: 200").toBe(200);
    check(r.json?.ok, "lower: 3 items exceed the requested 2").toBe(false);
    check(codes(r), "lower: limit-iterations reported").toContain("limit-iterations");
  });
});

describe("oa-doc: the OpenAPI document", () => {
  const file = path.join(__dirname, "..", "..", "api", "openapi.json");
  const expectedRoutes = [
    "GET /v1/openapi.json",
    "GET /v1/spec",
    "POST /v1/analyze",
    "POST /v1/render",
    "POST /v1/validate",
  ];
  const httpMethods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

  it("oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte", async () => {
    const r = await call(await up(), "GET", "/v1/openapi.json");
    check(r.status, "openapi: 200").toBe(200);
    expectJson(r, "openapi");
    check(r.raw.equals(fs.readFileSync(file)), "openapi: body bytes equal the committed file").toBe(true);
  });

  it("oa-doc: the document is OpenAPI 3.1", () => {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    check(String(doc.openapi ?? ""), "openapi version starts with 3.1").toMatch(/^3\.1/);
  });

  it("oa-doc: the router table holds exactly the five documented routes", () => {
    check(routes.map((r) => `${r.method} ${r.path}`).sort(), "routes table").toEqual(expectedRoutes);
  });

  it("oa-doc: document paths and methods equal the router table", () => {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    const documented: string[] = [];
    for (const [p, item] of Object.entries<any>(doc.paths ?? {})) {
      for (const m of Object.keys(item)) {
        if (httpMethods.includes(m)) documented.push(`${m} ${p}`);
      }
    }
    const table = routes.map((r) => `${r.method.toLowerCase()} ${r.path}`);
    check(documented.length, "document describes at least one route").toBeGreaterThan(0);
    check(documented.sort(), "documented methods and paths equal the router table").toEqual(table.sort());
  });
});
