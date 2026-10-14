Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0031-document-the-api-the-cli-and-the-diagnos

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:57:04.976Z
- Stalled: no
- Brief mismatch: none
- Raised: f1

Restatement: Document the headless cycle's surfaces (the template-resolver CLI, the HTTP API, the structured render result, the diagnostics and the limits) in the README so a reader can use the CLI and API from the docs alone, with every documented route, subcommand and code really existing and every example reproducing against the built code; record the cycle in the changelog and bring the living module documents for api, cli and core up to date, without touching source code and without documenting behavior the code does not have.

## Findings

### f1: README diagnostics section says every diagnostic has a severity and one of nine codes, but analyze returns diagnostics with no severity and the undocumented code unrecognized-condition

- Class: defect
- Status: fixed
- Serves: m1: A reader calls `template-resolver analyze` or `POST /v1/analyze` on a template with a condition the engine cannot read and, trusting the README's 'A diagnostic is { severity, code, message, line, column, suggestion? }' and its code table, branches on `severity` or on a listed code; the response instead carries `{"code":"unrecognized-condition",...}` with no `severity`, a code that appears nowhere in the README, so the README documents a shape and code set the code does not produce for analyze.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. printf '{{IF status is active}}Active{{END_IF}}\n' > check.tpl. 2. node dist/cli/index.js analyze check.tpl. 3. Observe diagnostics[0] = {"code":"unrecognized-condition","message":"Unrecognized condition: status is active","line":1,"column":1}: no severity, code not in the README table. Same for an unparseable template via POST /v1/analyze {"template":"{{IF a}}"}: diagnostics[0] has code syntax-error but no severity. Smallest fix: one README sentence (in Diagnostics or beside the analyze command/route) saying analyze's diagnostics are raw analysis findings without `severity`, with code `unrecognized-condition` for an unreadable condition (validate maps them to `analysis-warning`).
- Evidence: diff:README.md, code:core/src/analyze.ts:66, code:core/src/analyze.ts:167, code:core/src/analyze.ts:221, doc:README.md#diagnostics
- Reply after round 1 (fixed): restate: README overclaimed one diagnostic shape; verify: README now separates analysis diagnostics and lists unrecognized-condition; evidence: doc:README.md
- Review lead ruling after round 1: sustain: analyze diagnostics differ in shape from render diagnostics; the README must say so
