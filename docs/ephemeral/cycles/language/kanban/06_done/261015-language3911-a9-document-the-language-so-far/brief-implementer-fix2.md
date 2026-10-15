# Brief: implementer, review round one fixes (README, changelog, one test)

## Objective and why

Project goal: a deterministic, no-eval template language with a headless core. Card goal: the README and changelog describe the code exactly. The blind review found four statements that contradict the code or are missing, and one gap in the guard test. Fix only these, in `README.md`, `changelog.md` and `tests/language/surfaces.test.ts`. Verified facts below come from running the code; re-run a command if in doubt (a built copy of the code is at C:/Users/jon03/AppData/Local/Temp/claude/C--Users-jon03-Documents-Projects-Personal-n8n-nodes-template-resolver/8bff4d43-c344-44ff-934a-2d97e67ae026/scratchpad/dist; run node from the scratchpad folder and require "./dist/core/src").

## Decisions already made

- f1 (README, changelog): `resolveTemplate` throws a located `TemplateError` with code `type-error` for a malformed math expression (`${{(1 + 2}}`: "Unmatched parentheses in math expression"; `${{total * }}`: "Invalid math expression") and for a cyclic value (`${{loop}}`), in strict and lenient mode alike. Only the zero divisor (`resolveTemplate` prints `Infinity`/`NaN`) and the 15-digit printing (`0.1 + 0.2` prints `0.30000000000000004`) are render-only. Rewrite the README paragraph that starts "**`render` only.**" so it names only those two as render-only, and says that the malformed expression and the unprintable value are errors in both entry points (`resolveTemplate` throws). Replace the `node -e` example under it with this one, whose output was just produced by running it (run it again from the scratchpad folder and print exactly what you get):

```
const { render, resolveTemplate } = require("./dist/core/src");
const data = { a: 1, b: 0 };
console.log(JSON.stringify(resolveTemplate("${{a / b}} ${{a % b}} ${{0.1 + 0.2}}", new Map(Object.entries(data)))));
const r = render("${{a / b}}", data);
console.log(r.ok, r.diagnostics[0].code);
try { resolveTemplate("${{(a + b}}", new Map(Object.entries(data))); } catch (e) { console.log(e.code, e.message.split("\n").filter(Boolean).pop().trim()); }
const loop = {}; loop.self = loop;
try { resolveTemplate("${{loop}}", new Map([["loop", loop]])); } catch (e) { console.log(e.code); }
const c = render("${{loop}}", { loop });
console.log(c.ok, c.diagnostics[0].message);
```
Expected output: `"Infinity NaN 0.30000000000000004"`, `false type-error`, `type-error Unmatched parentheses in math expression`, `type-error`, `false Cannot print a value with no text form (a cyclic structure or a BigInt)`. Fix the changelog bullet that says "Math and output errors in `render`: ..." the same way: the zero divisor and the 15-digit printing are render-only; the other errors apply to `resolveTemplate` too. Also check the sentence in the README Math section "Errors in math" and the intro of the "render only" paragraph for the same mistake.
- f2 (README): in the `.length` bullet add the own-key rule: an object with its own key `length` returns that key's value (null included), and so does a text holding a JSON object with its own key `length`; any other value, or missing data, stays null. Verified: with `{"o": {"length": 7, "a": 1}, "j": "{\"length\":9}", "n": {"length": null}, "s": "abc", "x": 5}` the template `${{o.length}}|${{j.length}}|${{n.length}}|${{s.length}}|${{x.length}}` renders `7|9||3|`. Show it as a short example run through the CLI like the others.
- f4 (README): in the "Analysis diagnostics" table, the row `syntax-error`, `limit-depth` becomes `syntax-error`, `limit-depth`, `limit-nodes` (and the same words in the sentence if the codes are listed elsewhere in that section).
- f3 (test): in `tests/language/surfaces.test.ts` add two guard rows named `ld-readme: ...` proving the README holds `tests/golden/render-cases/lang-filters-showcase/data.json` and `expected.md` verbatim (read the files, normalize line endings, trim trailing newlines as the template row does, `README.includes`). If a row fails because the README block differs from the file (extra or missing blank line, different spacing of the JSON), fix the README so it holds the file's exact text; do not change the golden files. This test change is approved by the project lead and logged by me; it is the only edit to the test file.

## Owned files and scope

`README.md`, `changelog.md`, `tests/language/surfaces.test.ts` in the worktree named in the message that launched you. Nothing else (living documents were fixed by me).

## How the work is judged

`node node_modules/jest/bin/jest.js --runTestsByPath tests/language/surfaces.test.ts` and `node node_modules/jest/bin/jest.js --runTestsByPath tests/golden/golden.test.ts` pass; then the whole suite and `node node_modules/typescript/bin/tsc --noEmit -p .` exit 0; every example you add or touch is run and printed as it ran. Mutation check for the new rows: change one character of the README expected block, see the row fail, restore.

## Model and effort

sonnet, medium: small documentation edits and two test rows.

## Result and status

Commit once: `docs(readme): fix the render-only claims, add the own-key length rule`. Say "done" and list the commands you ran. Never redirect output to nul.
