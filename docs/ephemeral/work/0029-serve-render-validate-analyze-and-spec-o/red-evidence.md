---
summary: Red evidence for 0029-serve-render-validate-analyze-and-spec-o: 43 failing tests across 5 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/headless/api.test.ts","tests/headless/e2e-api.test.ts","--json"]
exit_status: 1
tests_sha256: 79ad601f5779
---

# Red evidence for 0029-serve-render-validate-analyze-and-spec-o

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| ap-routes: documented 200 bodies ap-routes: POST /v1/render returns the full render result | ap-routes | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-routes: documented 200 bodies ap-routes: POST /v1/render accepts a missing data and a charset in the content type | ap-routes | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-routes: documented 200 bodies ap-routes: POST /v1/render honours options.strictMode and options.limits | ap-routes | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-routes: documented 200 bodies ap-routes: a template error is a 200 with ok false and located diagnostics | ap-routes | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-routes: documented 200 bodies ap-routes: POST /v1/validate returns ok and diagnostics | ap-routes | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-routes: documented 200 bodies ap-routes: POST /v1/analyze returns variables with required, blocks and filters | ap-routes | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-routes: documented 200 bodies ap-routes: GET /v1/spec returns version, blocks, filters, operators and limits | ap-routes | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for missing template | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for non-string template | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for array data | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for string data | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for strictMode as a string | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for limits as a string | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for validate without template | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for validate with non-string template | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for analyze without template | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for analyze with non-string template | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for bad JSON on /v1/render | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for bad JSON on /v1/validate | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 400 invalid-request for bad JSON on /v1/analyze | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 404 not-found for GET /nope | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 404 not-found for POST /v1/unknown | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 404 not-found for GET /v1 | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 404 not-found for GET / | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 405 method-not-allowed for GET /v1/render with Allow | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 405 method-not-allowed for GET /v1/validate with Allow | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 405 method-not-allowed for GET /v1/analyze with Allow | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 405 method-not-allowed for POST /v1/spec with Allow | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 405 method-not-allowed for POST /v1/openapi.json with Allow | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 405 method-not-allowed for DELETE /v1/render with Allow | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 413 payload-too-large when the body exceeds maxBodyBytes | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: a body within maxBodyBytes is accepted | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 415 unsupported-media-type for a text/plain POST to /v1/render | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 415 unsupported-media-type for a text/plain POST to /v1/validate | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-errors: malformed requests ap-errors: 415 unsupported-media-type for a text/plain POST to /v1/analyze | ap-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-limits: request limits can only lower the server limits ap-limits: the server limit applies when the request sets none | ap-limits | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-limits: request limits can only lower the server limits ap-limits: a request asking for more cannot raise the server limit | ap-limits | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ap-limits: request limits can only lower the server limits ap-limits: a request asking for less lowers the server limit | ap-limits | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| oa-doc: the OpenAPI document oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte | oa-doc | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| oa-doc: the OpenAPI document oa-doc: the document is OpenAPI 3.1 | oa-doc | assertion failed: Error: expect(received).toMatch(expected) |
| oa-doc: the OpenAPI document oa-doc: the router table holds exactly the five documented routes | oa-doc | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| oa-doc: the OpenAPI document oa-doc: document paths and methods equal the router table | oa-doc | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| e2-server: every route over real HTTP e2-server: one flow on an ephemeral 127.0.0.1 port exercises all five routes, then the port is closed | e2-server | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
