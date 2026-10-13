# Spec

## Acceptance criteria

- sc-01: a JSON object string value containing doubled, trailing or bracket-adjacent commas inside a string is preserved exactly
- sc-02: a JSON array string whose elements contain commas inside strings is preserved exactly
- sc-03: tags.0 and tags.1 index into a comma-separated string
- sc-04: tags.0 and tags.1 index into a JSON array string, in output and in IF conditions
