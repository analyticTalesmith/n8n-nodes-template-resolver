### Unreleased

- Tests restored: `npm test` runs the jest suite; CI builds and tests on Linux and Windows
- Bug fixes: nested FOR keeps outer variables; a pipe inside a `??` default stays in the default; `ELSE IF` and arguments on END or ELSE tags are rejected; `NOT`, `!`, `&&`, `||` work in conditions and quoted AND or OR no longer split them; `contains`, `startsWith` and `endsWith` read an unquoted right side as a variable; `==` compares numbers numerically; string inputs keep commas inside values; table cells escape pipes and flatten newlines
- The engine moved to `core/src` (pure library) with the n8n node in `n8n/`; `analyze()` derives usage from the parsed template
- Golden-file test harness; design decisions recorded under `docs/living/decisions/adr/`
- Removed a stray console log from the math fallback, a garbled prefix from error messages, and the ELSE IF hint now works for any letter case

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