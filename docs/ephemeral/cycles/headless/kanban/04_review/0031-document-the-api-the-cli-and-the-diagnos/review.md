Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0031-document-the-api-the-cli-and-the-diagnos

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:57:04.976Z
- Stalled: no
- Brief mismatch: none
- Raised: f1

Restatement: Document the headless cycle's surfaces (the template-resolver CLI, the HTTP API, the structured render result, the diagnostics and the limits) in the README so a reader can use the CLI and API from the docs alone, with every documented route, subcommand and code really existing and every example reproducing against the built code; record the cycle in the changelog and bring the living module documents for api, cli and core up to date, without touching source code and without documenting behavior the code does not have.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:59:43.669Z
- Stalled: no
- Brief mismatch: c3 says the living module documents are added by the cycle's deltas 'applied by delta apply after the merge', but the manifest amendment has this card edit docs/living/architecture/* directly. The diff follows the amendment; the criterion text was not updated to match.
- Raised: f2

Restatement: Document the headless cycle's surfaces (the template-resolver CLI, the HTTP API, the structured render result, diagnostics and limits) in the README and changelog, and update the living module documents for the api, the cli and the core, so a reader can use the CLI and API from the docs alone. Every documented route, subcommand and code must exist, every example must reproduce against the built code, nothing undocumented-by-code may be claimed, and no source code may change.

- Response to f1: withdraw (evidence: doc:README.md (Diagnostics now scopes the full shape to render/validate and adds an 'Analysis diagnostics' subsection with shape {code, message, line, column} and codes unknown-filter, unrecognized-condition, syntax-error/limit-depth), test:node dist/cli/index.js analyze check.tpl returned {code: unrecognized-condition, message, line 1, column 1} with no severity, matching the README, test:POST /v1/analyze {template: '{{IF a}}'} returned 200 with empty variables/filters/blocks and one {code: syntax-error,...} diagnostic, matching the README)

## Findings

### f1: README diagnostics section says every diagnostic has a severity and one of nine codes, but analyze returns diagnostics with no severity and the undocumented code unrecognized-condition

- Class: defect
- Status: withdrawn
- Serves: m1: A reader calls `template-resolver analyze` or `POST /v1/analyze` on a template with a condition the engine cannot read and, trusting the README's 'A diagnostic is { severity, code, message, line, column, suggestion? }' and its code table, branches on `severity` or on a listed code; the response instead carries `{"code":"unrecognized-condition",...}` with no `severity`, a code that appears nowhere in the README, so the README documents a shape and code set the code does not produce for analyze.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. printf '{{IF status is active}}Active{{END_IF}}\n' > check.tpl. 2. node dist/cli/index.js analyze check.tpl. 3. Observe diagnostics[0] = {"code":"unrecognized-condition","message":"Unrecognized condition: status is active","line":1,"column":1}: no severity, code not in the README table. Same for an unparseable template via POST /v1/analyze {"template":"{{IF a}}"}: diagnostics[0] has code syntax-error but no severity. Smallest fix: one README sentence (in Diagnostics or beside the analyze command/route) saying analyze's diagnostics are raw analysis findings without `severity`, with code `unrecognized-condition` for an unreadable condition (validate maps them to `analysis-warning`).
- Evidence: diff:README.md, code:core/src/analyze.ts:66, code:core/src/analyze.ts:167, code:core/src/analyze.ts:221, doc:README.md#diagnostics
- Reply after round 1 (fixed): restate: README overclaimed one diagnostic shape; verify: README now separates analysis diagnostics and lists unrecognized-condition; evidence: doc:README.md
- Review lead ruling after round 1: sustain: analyze diagnostics differ in shape from render diagnostics; the README must say so

### f2: Living module documents keep frontmatter state: planned although they now describe built behavior

- Class: drift
- Status: withdrawn
- Serves: c3: docs/living/architecture/modules/api.md, cli.md and headless-contract.md still say state: planned while their bodies describe implemented, verified behavior; a reader or tool filtering on state may treat them as unbuilt.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: head -4 docs/living/architecture/modules/api.md shows 'state: planned' while the body documents routes that answer as described.
- Evidence: doc:docs/living/architecture/modules/api.md, doc:docs/living/architecture/modules/cli.md, doc:docs/living/architecture/headless-contract.md
- Review lead ruling after round 2: withdraw: planned is correct until delta apply turns the documents built after the merge
