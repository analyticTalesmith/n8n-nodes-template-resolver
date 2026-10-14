### Unreleased

- Tests restored: `npm test` runs the jest suite; CI builds and tests on Linux and Windows
- Bug fixes: nested FOR keeps outer variables; a pipe inside a `??` default stays in the default; `ELSE IF` and arguments on END or ELSE tags are rejected; `NOT`, `!`, `&&`, `||` work in conditions and quoted AND or OR no longer split them; `contains`, `startsWith` and `endsWith` read an unquoted right side as a variable; `==` compares numbers numerically; string inputs keep commas inside values; table cells escape pipes and flatten newlines
- The engine moved to `core/src` (pure library) with the n8n node in `n8n/`; `analyze()` derives usage from the parsed template
- Golden-file test harness; design decisions recorded under `docs/living/decisions/adr/`
- Removed a stray console log from the math fallback, a garbled prefix from error messages, and the ELSE IF hint now works for any letter case
- Structured render result: core `render` returns `{ok, output, messages, stats, diagnostics}` and never throws for template or data problems; `validate` checks a template without data; `spec` describes the template language (version `1.0`)
- Diagnostics carry a code (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `invalid-input`, `analysis-warning`) and the line and column of the failing tag or placeholder, runtime errors included
- Render limits with defaults: `maxIterations` 10000, `maxOutputChars` 1000000, `maxDepth` 32
- `analyze` reports `required` per variable and a count per block kind
- The n8n node renders through `render` and reports the first diagnostic with its location
- Command line `template-resolver` with `render`, `validate`, `analyze`, `spec` and `serve`; exit codes 0, 1 and 2
- HTTP API: `POST /v1/render`, `POST /v1/validate`, `POST /v1/analyze`, `GET /v1/spec`, `GET /v1/openapi.json`, on loopback by default, with a committed OpenAPI 3.1 document; request limits can only lower the server's
- README documents the result, the diagnostics, the limits, the command line and the HTTP API; missing variables are now described as an error in strict mode
- Whitespace: a line holding only block tags (IF, CASE, FOR, SECTION, FENCE, RAW, their parts and comments) is removed with its line break; the `standaloneLines` render option turns this off (`options.standaloneLines` in the HTTP API, `--no-standalone-lines` and `--standalone-lines` on the command line, "Remove Standalone Tag Lines" in the n8n node); trim markers `{{-` and `-}}` remove whitespace before or after a tag
- `{{RAW}}...{{END_RAW}}` outputs its content literally and `\{{` outputs a literal `{{`
- `{{SECTION "Title" level=2}}` outputs a markdown heading and its body, and is omitted (counted in `stats.sectionsOmitted`) when the body renders empty unless `skip_empty=false`
- `{{FENCE lang="..."}}` and the `fence` filter wrap content in a code fence longer than any backtick run inside it
- `heading_offset=N` shifts markdown headings; `escape_md=block` also escapes line starts that would read as structure, `escape_md=inline` is the existing behavior
- The OpenAPI document describes `options.standaloneLines`, the render options and trim and escape syntax in the spec, and accepts every block kind in the analysis `blocks` counts

### 1.0.0

- Initial release
- Variable substitution with `${{var}}` syntax
- IF/ELSEIF/ELSE conditional blocks
- CASE/WHEN/DEFAULT switch blocks
- FOR loops with array iteration
- LIST_ITEM auto-numbered lists
- Full comparison operator suite
- AND/OR boolean logic with parentheses
- Nested object access via dot notation
- Auto-parsing of JSON strings for dot notation and FOR loops