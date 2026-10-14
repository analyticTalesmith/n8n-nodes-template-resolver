/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as net from "net";
import * as path from "path";
import { check, start, stop, call, postJson, Running } from "./http-helpers";

function refused(port: number, host: string): Promise<string> {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host });
    sock.once("connect", () => {
      sock.destroy();
      resolve("connected");
    });
    sock.once("error", (e: NodeJS.ErrnoException) => resolve(e.code ?? "error"));
  });
}

describe("e2-server: every route over real HTTP", () => {
  let running: Running | undefined;
  afterEach(async () => {
    await stop(running);
    running = undefined;
  });

  it("e2-server: one flow on an ephemeral 127.0.0.1 port exercises all five routes, then the port is closed", async () => {
    running = await start();
    check(running.host, "e2-server: bound to loopback").toBe("127.0.0.1");
    check(running.port, "e2-server: an ephemeral port was assigned").toBeGreaterThan(0);

    const template = "{{FOR items AS i}}${{i}};{{END_FOR}}";
    const validate = await postJson(running, "/v1/validate", { template });
    check(validate.status, "e2-server: validate 200").toBe(200);
    check(validate.json?.ok, "e2-server: validate ok").toBe(true);

    const analyze = await postJson(running, "/v1/analyze", { template });
    check(analyze.status, "e2-server: analyze 200").toBe(200);
    check(
      analyze.json?.variables?.map((v: any) => v.name),
      "e2-server: analyze finds items"
    ).toContain("items");

    const render = await postJson(running, "/v1/render", { template, data: { items: ["a", "b"] } });
    check(render.status, "e2-server: render 200").toBe(200);
    check(render.json?.ok, "e2-server: render ok").toBe(true);
    check(render.json?.output, "e2-server: render output").toBe("a;b;");
    check(render.json?.stats?.iterations, "e2-server: two iterations counted").toBe(2);

    const broken = await postJson(running, "/v1/render", { template: "${{missing}}", data: {} });
    check(broken.status, "e2-server: template error is 200").toBe(200);
    check(broken.json?.ok, "e2-server: template error ok false").toBe(false);

    const spec = await call(running, "GET", "/v1/spec");
    check(spec.status, "e2-server: spec 200").toBe(200);
    check(typeof spec.json?.version, "e2-server: spec version").toBe("string");

    const openapi = await call(running, "GET", "/v1/openapi.json");
    check(openapi.status, "e2-server: openapi 200").toBe(200);
    check(
      openapi.raw.equals(fs.readFileSync(path.join(__dirname, "..", "..", "api", "openapi.json"))),
      "e2-server: openapi bytes equal the committed file"
    ).toBe(true);

    const { port, host } = running;
    await stop(running);
    running = undefined;
    check(await refused(port, host), "e2-server: the closed port refuses connections").toBe("ECONNREFUSED");
  });
});
