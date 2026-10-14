---
summary: The HTTP API over core: routes, status codes, limits, server options and the OpenAPI document.
state: planned
---

# api module

## Purpose

A stateless JSON-over-HTTP surface over core, so a program in any language can render, validate and analyze templates without n8n. It adds transport only: every answer about a template comes from core.

## Responsibility

- `api/routes.ts`: the route table and one handler per route; checks the request body shape and turns it into a core call; caps request limits at the server's.
- `api/server.ts`: `createServer`, which finds the route, enforces the content type and the body size, parses JSON and writes every response, success or error, as JSON.
- `api/index.ts`: re-exports `createServer`, `ServerOptions` and `routes`, and adds `listen`.
- `api/openapi.json`: the committed OpenAPI 3.1 document describing every route, request and response.

## Interface

```ts
createServer(options?: { limits?: Partial<Limits>; tokenEstimator?: (text: string) => number; maxBodyBytes?: number }): http.Server
listen(server: http.Server, port = 0, host = "127.0.0.1"): Promise<{ port: number; host: string }>
```

Limits left out take core's defaults (`maxIterations` 10000, `maxOutputChars` 1000000, `maxDepth` 32); `maxBodyBytes` defaults to 1 MiB (1048576). `listen` binds loopback unless told otherwise.

| Route | Request body | Response (200) |
|---|---|---|
| POST /v1/render | `{template, data?, options?: {strictMode?, limits?}}` | core `render` result |
| POST /v1/validate | `{template}` | core `validate` result, `{ok, diagnostics}` |
| POST /v1/analyze | `{template}` | core `analyze` result |
| GET /v1/spec | | core `spec()` |
| GET /v1/openapi.json | | the bytes of `api/openapi.json` |

- `data` defaults to `{}`, `options.strictMode` to core's default (strict).
- `options.limits` may only lower the server's limits: each given value must be a non-negative integer and the effective limit is `min(requested, server)`.
- `validate` and `analyze` run with the server's `maxDepth`. An `analyze` of a template that does not parse answers 200 with empty `variables`, `filters` and `blocks` and the parse error (`syntax-error` or `limit-depth`) in `diagnostics`. Analysis diagnostics have the shape `{code, message, line, column}`, without the `severity` and `suggestion` of render and validate diagnostics; besides parse errors their codes are `unknown-filter` and `unrecognized-condition`.
- The query string is ignored when matching a route. The OpenAPI document is served in the committed file's exact serialization.

## Failure handling

Template problems are results, never HTTP errors: 200 with `ok: false` and diagnostics. Request problems answer `{error: {code, message}}`:

| Status | Code | When |
|---|---|---|
| 400 | `invalid-request` | body not JSON or not an object; `template` not a string; `data`, `options` or `options.limits` not an object; `options.strictMode` not a boolean; a limit not a non-negative integer |
| 404 | `not-found` | no route has the path |
| 405 | `method-not-allowed` | the path exists for another method; the `Allow` header lists the methods |
| 413 | `payload-too-large` | the declared or streamed body exceeds `maxBodyBytes` |
| 415 | `unsupported-media-type` | a POST whose `Content-Type` is not `application/json` |
| 500 | `internal-error` | any unexpected exception; the message is generic |

When the server refuses a request before the body has arrived (413, 415, 404 on a POST), it reads and discards the rest of the body before replying, so the client sees the status instead of a reset connection.

## Dependencies

- core (`render`, `validate`, `analyze`, `spec`, `withDefaultLimits`, `TemplateError`), imported from `core/src`.
- node's `http` only; no runtime dependency.
- Consumed by the cli module's `serve`.
