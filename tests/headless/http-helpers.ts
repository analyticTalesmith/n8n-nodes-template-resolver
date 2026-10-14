/* eslint-disable @typescript-eslint/no-explicit-any */
import * as http from "http";
import { createServer, listen } from "../../api";

export type ServerOptions = NonNullable<Parameters<typeof createServer>[0]>;

export interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  raw: Buffer;
  /** Parsed JSON body, or undefined when the body is not JSON. */
  json: any;
}

export interface Running {
  server: http.Server;
  port: number;
  host: string;
}

export async function start(options?: ServerOptions): Promise<Running> {
  const server = createServer(options);
  const { port, host } = await listen(server, 0, "127.0.0.1");
  return { server, port, host };
}

export function stop(running: Running | undefined): Promise<void> {
  if (!running) return Promise.resolve();
  return new Promise((resolve) => running.server.close(() => resolve()));
}

/** One request over real HTTP with node's client; the connection is never kept alive. */
export function call(
  running: Running,
  method: string,
  path: string,
  body?: string | Buffer,
  headers: Record<string, string> = {}
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: running.host, port: running.port, method, path, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks);
          let json: any;
          try {
            json = JSON.parse(raw.toString("utf8"));
          } catch {
            json = undefined;
          }
          resolve({ status: res.statusCode ?? 0, headers: res.headers, raw, json });
        });
      }
    );
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

export function postJson(running: Running, path: string, payload: unknown): Promise<Reply> {
  return call(running, "POST", path, JSON.stringify(payload), {
    "content-type": "application/json",
  });
}

/** jest's expect without a message argument: prefixes the failure with the behavior the assertion expects. */
export function check(actual: unknown, message: string): jest.Matchers<void> {
  const matchers = expect(actual) as any;
  return new Proxy(matchers, {
    get(target, key) {
      const value = target[key];
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        try {
          return value.apply(target, args);
        } catch (e) {
          (e as Error).message = `${message}\n${(e as Error).message}`;
          throw e;
        }
      };
    },
  }) as jest.Matchers<void>;
}
