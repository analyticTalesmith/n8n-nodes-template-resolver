# Spec

## Acceptance criteria

- sf-api: POST /v1/render accepts options.standaloneLines (boolean, a non-boolean is 400 invalid-request), the OpenAPI document describes it, and the served document still equals the committed file
- sf-cli: render accepts --no-standalone-lines and --standalone-lines, giving both together is a usage error exit 2, and the usage text lists them
- sf-node: the node has a boolean option for standalone lines that defaults to true and reaches render
- sf-golden: golden cases rendered through render cover a prompt template using sections, fences, offset headings, escaped values, RAW and trim markers, with standalone lines on and off
- sf-docs: the README documents the whitespace rule and trim markers, RAW and brace escaping, SECTION, FENCE, heading_offset and the escape modes with examples, and names the standalone option on every surface
- sf-living: the cycle deltas turn the prompt-aware contract and the module documents into built documents after the merge
