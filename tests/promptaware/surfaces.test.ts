/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { main } from "../../cli/main";
import { TemplateResolver } from "../../n8n/TemplateResolver.node";
import { check, start, stop, call, postJson, Running } from "../headless/http-helpers";

// One template whose block-tag lines sit alone: with standalone lines on they vanish, off they leave blank lines.
const IF_TEMPLATE = "a\n{{IF on}}\nb\n{{END_IF}}\nc\n";
const IF_ON = "a\nb\nc\n";
const IF_OFF = "a\n\nb\n\nc\n";
const FOR_TEMPLATE = "{{FOR xs AS x}}\n- ${{x}}\n{{END_FOR}}\nend\n";
const FOR_ON = "- 1\n- 2\nend\n";
const FOR_OFF = "
- 1

- 2

end
";

let running: Running | undefined;
afterEach(async () => {
  await stop(running);
  running = undefined;
});

describe("sf-api: options.standaloneLines on POST /v1/render", () => {
  const cases: [string, string, any, any, string][] = [
    ["IF lines, option omitted (default on)", IF_TEMPLATE, { on: true }, undefined, IF_ON],
    ["IF lines, true", IF_TEMPLATE, { on: true }, true, IF_ON],
    ["IF lines, false", IF_TEMPLATE, { on: true }, false, IF_OFF],
    ["FOR lines, true", FOR_TEMPLATE, { xs: [1, 2] }, true, FOR_ON],
    ["FOR lines, false", FOR_TEMPLATE, { xs: [1, 2] }, false, FOR_OFF],
  ];
  it.each(cases)("sf-api: %s", async (label, template, data, flag, expected) => {
    running = await start();
    const options = flag === undefined ? {} : { standaloneLines: flag };
    const r = await postJson(running, "/v1/render", { template, data, options });
    check(r.status, `${label}: 200`).toBe(200);
    check(r.json?.output, `${label}: output spacing follows the option`).toBe(expected);
    if (flag === false) {
      const on = await postJson(running, "/v1/render", { template, data, options: { standaloneLines: true } });
      check(on.json?.output === expected, `${label}: the same template with true differs from false`).toBe(false);
    }
  });

  it.each([
    ["string false", "false"],
    ["number 0", 0],
    ["number 1", 1],
    ["string yes", "yes"],
    ["array", []],
    ["object", {}],
  ])("sf-api: a non-boolean standaloneLines (%s) is 400 invalid-request", async (label, value) => {
    running = await start();
    const r = await postJson(running, "/v1/render", {
      template: "x",
      data: {},
      options: { standaloneLines: value },
    });
    check(r.status, `${label}: status 400`).toBe(400);
    check(r.json?.error?.code, `${label}: code invalid-request`).toBe("invalid-request");
  });

  it("sf-api: the OpenAPI document describes options.standaloneLines as a boolean and is still served byte for byte", async () => {
    const file = path.join(__dirname, "..", "..", "api", "openapi.json");
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    const found: any[] = [];
    const walk = (node: any): void => {
      if (node && typeof node === "object") {
        if (node.properties?.options?.properties?.standaloneLines) {
          found.push(node.properties.options.properties.standaloneLines);
        }
        Object.values(node).forEach(walk);
      }
    };
    walk(doc);
    check(found.length, "a render options schema lists standaloneLines").toBeGreaterThan(0);
    check(found[0].type, "standaloneLines is a boolean").toBe("boolean");
    check(typeof found[0].description, "standaloneLines has a description").toBe("string");
    running = await start();
    const r = await call(running, "GET", "/v1/openapi.json");
    check(r.raw.equals(fs.readFileSync(file)), "served document equals the committed file").toBe(true);
  });
});

describe("sf-cli: --standalone-lines and --no-standalone-lines", () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-sf-cli-"));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
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

  function files(): { t: string; d: string } {
    const t = path.join(dir, "t.txt");
    const d = path.join(dir, "d.json");
    fs.writeFileSync(t, IF_TEMPLATE);
    fs.writeFileSync(d, JSON.stringify({ on: true }));
    return { t, d };
  }

  it.each([
    ["no flag (default on)", [], IF_ON],
    ["--standalone-lines", ["--standalone-lines"], IF_ON],
    ["--no-standalone-lines", ["--no-standalone-lines"], IF_OFF],
  ] as [string, string[], string][])("sf-cli: %s", async (_n, flags, expected) => {
    const { t, d } = files();
    const r = await run(["render", t, "--data", d, ...flags]);
    expect({ code: r.code, out: r.out, err: r.err }).toEqual({ code: 0, out: expected, err: "" });
  });

  it.each([
    ["on then off", ["--standalone-lines", "--no-standalone-lines"]],
    ["off then on", ["--no-standalone-lines", "--standalone-lines"]],
  ] as [string, string[]][])("sf-cli: both flags together (%s) is a usage error, exit 2", async (_n, flags) => {
    const { t, d } = files();
    for (const single of flags) {
      const ok = await run(["render", t, "--data", d, single]);
      expect({ flag: single, code: ok.code }).toEqual({ flag: single, code: 0 });
    }
    const r = await run(["render", t, "--data", d, ...flags]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 2, out: "" });
    expect(r.err.trim().length).toBeGreaterThan(0);
  });

  it("sf-cli: the usage text lists both flags", async () => {
    const r = await run(["--help"]);
    expect(r.out).toContain("--standalone-lines");
    expect(r.out).toContain("--no-standalone-lines");
  });
});

describe("sf-node: the standalone lines option", () => {
  async function runNode(params: Record<string, any>): Promise<{ json?: any; error?: Error }> {
    const node = new TemplateResolver();
    const ctx: any = {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string, _i: number, dflt?: any) =>
        name in params ? params[name] : dflt,
      continueOnFail: () => false,
      getNode: () => ({ name: "TemplateResolver" }),
    };
    try {
      const result = await node.execute.call(ctx);
      return { json: result[0][0].json };
    } catch (e) {
      return { error: e as Error };
    }
  }

  const base = {
    variableMappings: { mappings: [{ variableName: "on", value: "yes" }] },
    strictMode: true,
    showDetectedVariables: false,
    outputField: "resolved_prompt",
    template: IF_TEMPLATE,
  };

  it("sf-node: the node lists a boolean standaloneLines option that defaults to true", () => {
    const prop = (new TemplateResolver().description.properties as any[]).find(
      (p) => p.name === "standaloneLines"
    );
    expect(prop).toBeDefined();
    expect(prop.type).toBe("boolean");
    expect(prop.default).toBe(true);
    expect(prop.displayName).toBe("Remove Standalone Tag Lines");
  });

  it.each([
    ["true removes the tag lines", { standaloneLines: true }, IF_ON],
    ["parameter absent defaults to removing them", {}, IF_ON],
    ["false keeps the blank lines", { standaloneLines: false }, IF_OFF],
  ] as [string, Record<string, any>, string][])("sf-node: %s", async (_n, extra, expected) => {
    const on = await runNode({ ...base, standaloneLines: true });
    expect(on.json?.resolved_prompt).toBe(IF_ON);
    const r = await runNode({ ...base, ...extra });
    expect(r.error).toBeUndefined();
    expect(r.json.resolved_prompt).toBe(expected);
  });
});
