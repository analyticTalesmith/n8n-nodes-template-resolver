Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0029-serve-render-validate-analyze-and-spec-o

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:40:29.839Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2, f3

Restatement: Add a stateless HTTP API over the headless core using only node's http module: POST /v1/render, /v1/validate, /v1/analyze, GET /v1/spec and GET /v1/openapi.json. Template problems come back as 200 with ok false and located diagnostics; malformed requests get JSON errors (400 invalid-request, 404, 405 with Allow, 413, 415). Server limits are a ceiling a request can only lower. A committed OpenAPI 3.1 document is served byte for byte and matches the router table, and an end-to-end test drives every route over real HTTP on 127.0.0.1 port 0 and closes the server. No runtime dependency, no non-loopback default host, no leaked servers or sockets.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:42:39.528Z
- Stalled: no
- Brief mismatch: none
- Raised: f4

Restatement: Expose the headless template core over a dependency-free node http server: POST /v1/render, /v1/validate, /v1/analyze and GET /v1/spec return the documented result bodies (template problems are 200 with ok false and located diagnostics), GET /v1/openapi.json serves the committed OpenAPI 3.1 document byte for byte and that document matches the router table, malformed or hostile requests get JSON 400/404/405/413/415 errors without crashing, request limits can only lower the server's limits, and an end-to-end test drives every route on an ephemeral 127.0.0.1 port and closes it.

- Response to f1: withdraw (evidence: diff:api/.gitattributes, code:api/.gitattributes:1, test:oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte)
- Response to f2: withdraw (evidence: code:api/routes.ts:1464, code:api/routes.ts:1466, test:ap-errors: 400 invalid-request for null data, test:ap-errors: 400 invalid-request for null options)

## Findings

### f1: Served OpenAPI bytes are a re-serialization, so byte equality breaks on a CRLF checkout

- Class: goal-risk
- Status: withdrawn
- Serves: c4: routes.ts serves JSON.stringify(import, null, 2) + "\n" (always LF, canonical key order) rather than the file's bytes. The repo has no .gitattributes; on a Windows clone with core.autocrlf=true (git-for-windows default) api/openapi.json is checked out with CRLF, so GET /v1/openapi.json no longer equals the committed file byte for byte and both oa-doc and e2-server tests fail. The same happens if anyone hand-edits the file with different indentation or key order.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: git clone with core.autocrlf=true (or convert api/openapi.json to CRLF); run node node_modules/jest/bin/jest.js --runTestsByPath tests/headless/api.test.ts; 'oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte' fails because the response has LF line endings and the file has CRLF.
- Evidence: diff:api/routes.ts, code:api/routes.ts:36, test:oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte, test:e2-server: one flow on an ephemeral 127.0.0.1 port exercises all five routes, then the port is closed
- Review lead ruling after round 1: sustain: a CRLF checkout breaks the byte-equality promise; pin the file's line endings with an api-local gitattributes

### f2: data: null and options: null are accepted as empty objects instead of 400 invalid-request

- Class: defect
- Status: withdrawn
- Serves: c2: renderRoute uses body.data ?? {} and body.options ?? {}, so an explicit null (a non-object data) renders as if data were omitted and returns 200, while options.limits: null is correctly rejected with 400. c2 and the design say a non-object data is a 400.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Start createServer(); POST /v1/render with content-type application/json and body {"template":"x","data":null}; observe 200 ok true instead of 400 invalid-request. Same for {"template":"x","options":null}. Smallest fix: treat only undefined as absent (body.data === undefined ? {} : body.data, likewise for options).
- Evidence: code:api/routes.ts:53, code:api/routes.ts:55, doc:docs/living/architecture/headless-contract.md
- Review lead ruling after round 1: sustain: null data or options is a non-object and must be 400

### f3: An oversized body is still read to the end before the 413 is sent

- Class: drift
- Status: filed (0037-follow-up-an-oversized-body-is-still-rea)
- Serves: card-goal: On 413 (and 415/405 for POST) sendError resumes the request and waits for 'end' before replying, so a client that declares or streams a multi-gigabyte body keeps the socket and the server's bandwidth busy until it finishes (memory stays bounded, no crash). Bounded only by node's default requestTimeout. Noted for the lead; replying with Connection: close after a bounded drain would cap it.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Start the server with maxBodyBytes 64; send Content-Length 10000000000 and stream slowly; the 413 is not sent until the full body arrives or the request times out.
- Evidence: code:api/server.ts:122, code:api/server.ts:123
- Review lead ruling after round 1: drift: bounded by the request timeout; no criterion requires early close

### f4: After a 413 or 415 the server reads and discards the whole remaining body before replying, with no cap

- Class: drift
- Status: filed (0038-follow-up-after-a-413-or-415-the-server)
- Serves: card-goal: A client that declares or streams a body far over maxBodyBytes (or an endless chunked body, or a huge text/plain body) keeps the connection and the server's read loop busy until it stops sending or node's requestTimeout fires; the process does not crash and memory is not retained, so the goal-critical question is still answered adequately, but request limits do not bound the work spent on a rejected request.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Start createServer({maxBodyBytes: 64}); send POST /v1/render with content-type application/json, Transfer-Encoding chunked, and keep writing chunks; no 413 arrives until the client ends the body (sendError waits for req 'end' after req.resume()).
- Evidence: code:api/server.ts:1643, diff:api/server.ts
- Review lead ruling after round 2: drift: same as the ticketed drain behavior; loopback-only server
