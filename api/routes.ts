import {
  analyze,
  Limits,
  render,
  spec,
  TemplateAnalysis,
  TemplateError,
  validate,
} from "../core/src";
import openapi from "./openapi.json";

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export interface RouteContext {
  limits: Limits;
  tokenEstimator?: (text: string) => number;
}

export interface Route {
  method: "GET" | "POST";
  path: string;
  /** A Buffer is sent as is; anything else is sent as JSON. */
  handle(body: Record<string, unknown>, context: RouteContext): unknown;
}

// The committed file is kept in this exact serialization, so the bytes served
// match it whether the document is loaded from source or from the build.
const openapiDocument = Buffer.from(JSON.stringify(openapi, null, 2) + "\n", "utf8");

export const routes: ReadonlyArray<Route> = [
  { method: "POST", path: "/v1/render", handle: renderRoute },
  { method: "POST", path: "/v1/validate", handle: validateRoute },
  { method: "POST", path: "/v1/analyze", handle: analyzeRoute },
  { method: "GET", path: "/v1/spec", handle: () => spec() },
  { method: "GET", path: "/v1/openapi.json", handle: () => openapiDocument },
];

function renderRoute(body: Record<string, unknown>, context: RouteContext): unknown {
  const template = requireTemplate(body);
  const data = body.data === undefined ? {} : body.data;
  if (!isObject(data)) invalid("data must be an object");
  const options = body.options === undefined ? {} : body.options;
  if (!isObject(options)) invalid("options must be an object");
  if (options.strictMode !== undefined && typeof options.strictMode !== "boolean") {
    invalid("options.strictMode must be a boolean");
  }
  return render(template, data, {
    strictMode: options.strictMode,
    limits: lowerLimits(context.limits, options.limits),
    tokenEstimator: context.tokenEstimator,
  });
}

function validateRoute(body: Record<string, unknown>, context: RouteContext): unknown {
  return validate(requireTemplate(body), { limits: { maxDepth: context.limits.maxDepth } });
}

function analyzeRoute(body: Record<string, unknown>, context: RouteContext): TemplateAnalysis {
  const template = requireTemplate(body);
  try {
    return analyze(template, { limits: { maxDepth: context.limits.maxDepth } });
  } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    return {
      variables: [],
      filters: [],
      blocks: {},
      diagnostics: [
        { code: error.code, message: error.detail, line: error.line, column: error.column },
      ],
    };
  }
}

function lowerLimits(server: Limits, requested: unknown): Limits {
  if (requested === undefined) return server;
  if (!isObject(requested)) invalid("options.limits must be an object");
  const limits = { ...server };
  for (const key of Object.keys(server) as (keyof Limits)[]) {
    const value = requested[key];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      invalid(`options.limits.${key} must be a non-negative integer`);
    }
    limits[key] = Math.min(value, server[key]);
  }
  return limits;
}

function requireTemplate(body: Record<string, unknown>): string {
  const template = body.template;
  if (typeof template !== "string") invalid("template must be a string");
  return template;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new RequestError(400, "invalid-request", message);
}
