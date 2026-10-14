---
summary: Red evidence for 0028-return-a-structured-render-result-from-c: 57 failing tests across 8 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/headless/render.test.ts","tests/headless/spec.test.ts","tests/headless/node.test.ts","tests/headless/nodeps.test.ts","--json"]
exit_status: 1
tests_sha256: 9b77d83a66ec
---

# Red evidence for 0028-return-a-structured-render-result-from-c

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| rr-result: render result shape rr-result: a passing render returns ok, output, empty messages and full stats | rr-result | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-result: render result shape rr-result: iterations counts FOR iterations across the whole render | rr-result | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-result: render result shape rr-result: syntax error (unclosed IF on line 2) does not throw and returns ok false with the located error first | rr-result | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-result: render result shape rr-result: missing variable on line 3 in strict mode does not throw and returns ok false with the located error first | rr-result | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-result: render result shape rr-result: unknown filter on line 2 does not throw and returns ok false with the located error first | rr-result | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-result: render result shape rr-result: iteration limit does not throw and returns ok false with the located error first | rr-result | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-result: render result shape rr-result: output size limit does not throw and returns ok false with the located error first | rr-result | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-result: render result shape rr-result: depth limit does not throw and returns ok false with the located error first | rr-result | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-result: render result shape rr-result: lenient mode turns a missing variable into an ok render | rr-result | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-validate: validate without data rr-validate: a valid template is ok with no diagnostics | rr-validate | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-validate: validate without data rr-validate: syntax error yields ok false and a located diagnostic | rr-validate | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-validate: validate without data rr-validate: unknown filter yields ok false and a located diagnostic | rr-validate | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-validate: validate without data rr-validate: a missing variable is not an error because no data is supplied | rr-validate | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-analyze: required and block counts rr-analyze: required is the opposite of optional on every variable | rr-analyze | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-analyze: required and block counts rr-analyze: blocks counts per block kind for no blocks | rr-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| rr-analyze: required and block counts rr-analyze: blocks counts per block kind for two IF and one FOR | rr-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| rr-analyze: required and block counts rr-analyze: blocks counts per block kind for one CASE | rr-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| rr-estimator: token estimate rr-estimator: default estTokens is ceil(chars/4) for "" | rr-estimator | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-estimator: token estimate rr-estimator: default estTokens is ceil(chars/4) for "abcd" | rr-estimator | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-estimator: token estimate rr-estimator: default estTokens is ceil(chars/4) for "abcde" | rr-estimator | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-estimator: token estimate rr-estimator: default estTokens is ceil(chars/4) for "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | rr-estimator | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-estimator: token estimate rr-estimator: a tokenEstimator option replaces the default and receives the output | rr-estimator | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-compat: resolveTemplate and limits rr-compat: render and resolveTemplate agree on the output of a passing template | rr-compat | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-compat: resolveTemplate and limits rr-compat: limits at the boundary still render ok | rr-compat | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-compat: resolveTemplate and limits rr-compat: default limits stop a render past 10000 iterations | rr-compat | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-compat: resolveTemplate and limits rr-compat: limit options bound the render and report limit-iterations | rr-compat | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-compat: resolveTemplate and limits rr-compat: limit options bound the render and report limit-output | rr-compat | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-compat: resolveTemplate and limits rr-compat: limit options bound the render and report limit-depth | rr-compat | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| rr-spec: the language spec rr-spec: has a non-empty version string | rr-spec | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| rr-spec: the language spec rr-spec: filter head is listed with a description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: filter tail is listed with a description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: filter trim is listed with a description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: filter escape_md is listed with a description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: lists exactly the engine's filters | rr-spec | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| rr-spec: the language spec rr-spec: block IF is listed with args and description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: block FOR is listed with args and description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: block CASE is listed with args and description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: block LIST is listed with args and description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: block TABLE is listed with args and description | rr-spec | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: operator == is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator != is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator contains is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator startsWith is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator endsWith is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator isEmpty is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator isNotEmpty is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator AND is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator OR is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: operator NOT is listed | rr-spec | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| rr-spec: the language spec rr-spec: limits equal the default limits | rr-spec | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| rr-spec: the language spec rr-spec: describes variable and comment syntax | rr-spec | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| nd-output: node writes the render output nd-output: a failed render (missing variable on line 3) throws a NodeOperationError carrying line and column | nd-output | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| nd-output: node writes the render output nd-output: a failed render (missing variable mid-line on line 2) throws a NodeOperationError carrying line and column | nd-output | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| nd-output: node writes the render output nd-output: a syntax error reports its line and column | nd-output | assertion failed: Error: expect(received).toMatch(expected) |
| nd-nodeps: no runtime dependencies, api and cli built, bin exposed nd-nodeps: package.json exposes the template-resolver bin | nd-nodeps | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| nd-nodeps: no runtime dependencies, api and cli built, bin exposed nd-nodeps: tsconfig include covers api/**/* | nd-nodeps | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| nd-nodeps: no runtime dependencies, api and cli built, bin exposed nd-nodeps: tsconfig include covers cli/**/* | nd-nodeps | assertion failed: Error: expect(received).toContain(expected) // indexOf |
