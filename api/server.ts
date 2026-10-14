import * as http from "http";
import { Limits, withDefaultLimits } from "../core/src";
import { isObject, RequestError, Route, RouteContext, routes } from "./routes";

export interface ServerOptions {
  limits?: Partial<Limits>;
  tokenEstimator?: (text: string) => number;
  maxBodyBytes?: number;
}

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

/**
 * A stateless JSON API over the template engine. The server's limits are a
 * ceiling that a request can only lower.
 */
export function createServer(options: ServerOptions = {}): http.Server {
  const context: RouteContext = {
    limits: withDefaultLimits(options.limits),
    tokenEstimator: options.tokenEstimator,
  };
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  return http.createServer((req, res) => {
    handle(req, context, maxBodyBytes).then(
      (body) => send(res, 200, body),
      (error) => sendError(req, res, error)
    );
  });
}

async function handle(
  req: http.IncomingMessage,
  context: RouteContext,
  maxBodyBytes: number
): Promise<unknown> {
  const route = findRoute(req);
  if (route.method === "GET") return route.handle({}, context);

  if (!isJson(req.headers["content-type"])) {
    throw new RequestError(415, "unsupported-media-type", "Content-Type must be application/json");
  }
  const text = await readBody(req, maxBodyBytes);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new RequestError(400, "invalid-request", "Body is not valid JSON");
  }
  if (!isObject(body)) {
    throw new RequestError(400, "invalid-request", "Body must be a JSON object");
  }
  return route.handle(body, context);
}

function findRoute(req: http.IncomingMessage): Route {
  const path = (req.url ?? "/").split("?")[0];
  const matching = routes.filter((r) => r.path === path);
  if (matching.length === 0) {
    throw new RequestError(404, "not-found", `No route for ${path}`);
  }
  const route = matching.find((r) => r.method === req.method);
  if (!route) {
    throw new MethodNotAllowed(matching.map((r) => r.method));
  }
  return route;
}

class MethodNotAllowed extends RequestError {
  constructor(public readonly allow: string[]) {
    super(405, "method-not-allowed", `Allowed methods: ${allow.join(", ")}`);
  }
}

function isJson(contentType: string | undefined): boolean {
  return (contentType ?? "").split(";")[0].trim().toLowerCase() === "application/json";
}

function readBody(req: http.IncomingMessage, maxBodyBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tooLarge = () =>
      new RequestError(413, "payload-too-large", `Body exceeds ${maxBodyBytes} bytes`);
    if (Number(req.headers["content-length"]) > maxBodyBytes) {
      reject(tooLarge());
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        req.off("data", onData);
        reject(tooLarge());
        return;
      }
      chunks.push(chunk);
    };
    req.on("data", onData);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendError(req: http.IncomingMessage, res: http.ServerResponse, error: unknown): void {
  if (!(error instanceof RequestError)) {
    send(res, 500, { error: { code: "internal-error", message: "Internal server error" } });
    return;
  }
  if (error instanceof MethodNotAllowed) res.setHeader("Allow", error.allow.join(", "));
  if (!req.complete) {
    // The unread body is discarded and the connection closed once the reply is out.
    res.setHeader("Connection", "close");
    req.resume();
  }
  send(res, error.status, { error: { code: error.code, message: error.message } });
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body), "utf8");
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", payload.length);
  res.end(payload);
}
