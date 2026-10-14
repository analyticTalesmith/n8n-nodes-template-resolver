---
summary: Close review of the first prompt-aware cycle: standalone lines, trim markers, RAW, SECTION, FENCE, heading offset and escape modes.
approved_by: Jon (front approval)
validates: []
---
# Close review: prompt-aware-1

## What shipped

- Whitespace: lines that hold only a block tag vanish with their line break by default in `render` (API, CLI and node included); `{{- TAG -}}` markers trim adjacent whitespace; the `standaloneLines` option turns the default off. The legacy `resolveTemplate` keeps its old spacing by default so all earlier tests are unchanged.
- `{{RAW}}...{{END_RAW}}` and an escaped brace pair output literal braces (rebuilt cleanly; the cases of the old RAW branch were ported).
- `{{SECTION "Title" level=N skip_empty}}` writes a heading and body and drops itself, heading included, when its body is empty, counting omissions in `stats.sectionsOmitted`.
- Filters `heading_offset=N` and `fence[=lang]`, the `{{FENCE lang=...}}` block with a fence longer than any backtick run, and `escape_md=inline|block`.
- API option `options.standaloneLines`, CLI flags `--standalone-lines` and `--no-standalone-lines`, a node option "Remove Standalone Tag Lines", the OpenAPI document (including a corrected analyze blocks schema), README, changelog and living documents; golden cases rendered through `render` with the option on and off.

## Evidence

- 1284 jest tests in 31 suites and 19 tooling tests pass; build clean. Every card passed blind review; frozen tests were corrected only through logged amendments (a miscounted expectation in the fence, surfaces and diagnostics tests, and table rows added after review).
- Independent verification from a fresh clone exercised every must-have against the built CLI and API and ran about 60 adversarial inputs (huge values, deep nesting, odd tag combinations) with no hang or crash.
- The contract's trim-marker sentence was reworded in the last card to match the frozen tests (trim applies first, then standalone removal on what remains).

## Loop summary

No goal loop ran.

## Known issues

- Ruled drift and ticketed: an omitted SECTION leaves the template's own blank lines; headings indented by spaces are not shifted by heading_offset; filter parameters containing `=` are truncated by the existing parser; odd backslash runs before the brace pair; titles from data with line breaks; duplicate SECTION arguments are not rejected.
- The tooling tests (`node --test tools/tests`) remove part of `dist` as a side effect; rebuild before running the CLI after them.

## Expected streams

None declared in the cycle brief.

## Untriaged feedback

none

## Decision

Accept with the follow-ups above.
