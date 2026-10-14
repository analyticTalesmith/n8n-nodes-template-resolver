# Spec

## Acceptance criteria

- dc-coverage: the README names every API route, every CLI subcommand, every diagnostic code and the limits with their defaults, and the OpenAPI document paths are all mentioned
- dc-examples: each curl and CLI example block in the README runs against the built code and produces the output the README shows
- dc-living: the cycle's deltas add living module documents for the api and the cli and modify the core module document, applied by delta apply after the merge
