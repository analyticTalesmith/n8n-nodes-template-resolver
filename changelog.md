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
- Filter registry: one table feeds `render`, `validate`, `analyze` and `spec`; a filter is written `name`, `name=value` or `name:key=value,key=value`, quotes keep `=`, `,` and `:` inside a value, and an undeclared parameter is a located error in every mode
- Text filters: `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` (half away from zero, on the digits) and `default`
- Collection filters: `join`, `length`, `first`, `last`, `sort`, `unique`, `slice`, `lines` and `json`; a list prints as compact JSON and passes to the next filter as a list
- Math and output errors: a malformed math expression and a value with no text form are located `type-error`s in `render` and in `resolveTemplate` (which throws). A division or remainder by zero is a located `type-error`, and results print with at most 15 significant digits (`0.1 + 0.2` prints `0.3`), in `render` only; `resolveTemplate` keeps its old output for these two
- A malformed math expression is a located `type-error` even with strict mode off; a hyphen between two letters is part of a name (`first-name`) and subtraction needs spaces (`a - b`)
- Condition operators `in`, `not in`, `between` and `.length`; `==` compares as text when a side is a quoted literal (`z == "01234"` is false for 1234); an unrecognized word in a condition is an error in every mode
- `{{WHEN}}` takes a list of values (`{{WHEN "a", "b"}}`), a variable (`{{WHEN other}}`) or a comparison (`{{WHEN >= 10}}`); a malformed `{{WHEN}}` is a located syntax error
- Limit `maxNodes` (default 20000) bounds the size of a template, with the `limit-nodes` diagnostic, the `--max-nodes` flag and `options.limits.maxNodes` in the HTTP API; `spec` reports it
- README documents every filter, operator, limit option and `{{WHEN}}` form with examples that render as shown

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