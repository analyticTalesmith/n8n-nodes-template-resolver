# Spec

## Acceptance criteria

- ap-routes: POST /v1/render, /v1/validate, /v1/analyze and GET /v1/spec return the documented 200 bodies, and a template error is a 200 with ok false and located diagnostics
- ap-errors: bad JSON, a missing or non-string template, a non-object data and bad option types return 400 invalid-request; unknown paths 404 not-found; wrong methods 405 method-not-allowed with Allow; bodies over maxBodyBytes 413 payload-too-large; a non-JSON POST content type 415 unsupported-media-type; every response is JSON
- ap-limits: request limits can only lower the server limits and a request cannot raise them
- oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte, it is OpenAPI 3.1, and its paths and methods equal the router table
- e2-server: the end-to-end test listens on port 0 on 127.0.0.1, exercises every route over real HTTP with node's http client, and closes the server
