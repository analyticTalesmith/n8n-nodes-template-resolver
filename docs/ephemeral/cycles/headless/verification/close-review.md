---
summary: Close review of the headless cycle: structured render result, located diagnostics, limits, HTTP API with OpenAPI, and CLI.
approved_by: Jon (front approval)
validates: []
---
# Close review: headless

## What shipped

- Every template error carries a code and the line and column of the node that failed, including runtime errors in math, filters and loops; the engine stops runaway work at maxIterations, maxOutputChars and maxDepth (defaults 10000, 1000000, 32).
- `render` returns `{ok, output, messages, stats, diagnostics}` and does not throw for template or data problems (non-object data and cyclic loop values included); `validate`, `spec` and a dependency-free token estimate with a hook exist; `analyze` reports `required` and block counts. The n8n node renders through the result, keeps its output field and reports failures with line and column.
- `api/`: POST /v1/render, /v1/validate, /v1/analyze, GET /v1/spec and GET /v1/openapi.json on node's own http module, JSON errors (400, 404, 405, 413, 415), request limits that can only lower the server's, and a committed OpenAPI 3.1 document served byte for byte.
- `cli/`: `template-resolver render|validate|analyze|spec|serve`, files or stdin, exit codes 0, 1 and 2.
- README, changelog and living module documents describe all of it. No runtime dependency was added.

## Evidence

- Full suite on the merged branch: 759 jest tests in 22 suites, 19 tooling tests, build clean, CI green on ubuntu and windows.
- Every card passed blind review; findings sustained were fixed (cyclic data and non-object data in render, null data and options in the API, an overstated diagnostics claim in the README); drift findings are filed as backlog tickets 0032 to 0041.
- Independent verification from a fresh clone exercised every must-have against the built code: all pass. It found one defect that predates the cycle (see Known issues).

## Loop summary

No goal loop ran.

## Known issues

- A template with arithmetic on a string literal (`${{ 1 + "x" }}`) hangs the math tokenizer; it predates this cycle and is fixed in a separate bug fix after this merge.
- Graceful shutdown of `serve` on a signal is covered by a test through an abort signal, not by a real Windows signal.
- An oversized request body is read to the end before the 413 is sent (ticketed).

## Expected streams

None declared in the cycle brief.

## Untriaged feedback

none

## Decision

Accept with the follow-ups above.
