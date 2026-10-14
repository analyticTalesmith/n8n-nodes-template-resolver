# Spec

## Acceptance criteria

- rr-result: render returns ok, output, messages, stats (chars, estTokens, sectionsOmitted, iterations) and diagnostics; on a template or data error it does not throw, returns ok false, an empty output and the located error first in diagnostics
- rr-validate: validate returns ok and diagnostics for syntax errors and unknown filters without needing data
- rr-analyze: analyze variables carry required (the opposite of optional) and the result carries blocks, a count per block kind
- rr-spec: spec lists blocks, filters, operators, limits and a version, and every filter the engine accepts appears in it
- rr-estimator: estTokens is ceil(chars/4) by default and a tokenEstimator option replaces it
- rr-compat: resolveTemplate still returns a string and throws, and limits in render options bound the render with their diagnostics
- nd-output: the n8n node writes the render output to the configured field, and a failed render throws a node error whose message carries the first diagnostic with line and column
- nd-nodeps: package.json declares no runtime dependencies, tsconfig builds api and cli folders, and package.json exposes the template-resolver bin
