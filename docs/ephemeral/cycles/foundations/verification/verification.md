---
summary: Independent verification of the foundations cycle from a fresh clone: every must-have passes, six minor defects noted.
level: system
---
# Verification

A fresh verifier (no part in building) cloned the branch and ran `npm ci`, `npm run build` and `npm test` (12 suites, 563 tests, all passing), probed each fixed Tier 0 behavior with its own inputs, checked that core imports no n8n or I/O module, that `analyze()` exists with no regex detection, that strict mode accepts FOR item names and variables with defaults, that the golden harness names a corrupted case and rewrites it under `UPDATE_GOLDEN=1`, and that the six decision records exist. `validate.mjs` reports no findings; `evidence.mjs` reports only stale line citations in the two recovered documents (expected after the restructure).

Verdict per must-have: fd-clean-install pass, fd-ci pass (workflow not run on GitHub), fd-tier0 pass, fd-no-behavior-change pass, fd-core-pure pass with one note, fd-analyze pass, fd-golden pass, fd-decisions pass.

Defects noted, none contradicting a must-have:

- D1: `console.log` of an invalid-math error in `core/src/interpreter.ts` (carried over from the original code; core is meant to do no I/O).
- D2: the error prefix in `core/src/errors.ts` is mojibake; `UPDATE_GOLDEN=1` turns the substring in `expected-error.txt` into the full message.
- D3: only the exact uppercase `ELSE IF` gets the ELSEIF hint; other misspelled tags give poor messages.
- D4: `==` coercion is loose for hex, exponent and padded numeric strings.
- D5: a literal backslash before a pipe in a table cell cannot be told apart from an escaped pipe.
- D6: a filter written before `??` is rejected as an unknown filter.
- D7: the decision records carry `state: planned` until the delta is applied after merge.
