# Follow-up: A cyclic data value used as output renders ok true with empty text instead of ok false with a diagnostic, and

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0028-return-a-structured-render-result-from-c
Finding: f4 (drift)
Serves: c9: c9 requires that render returns ok false with a diagnostic for cyclic data values. For render('${{a}}', {a: cyclic}, {strictMode: true}), render instead returns ok true, output '' and no diagnostics: a data problem passes silently as an empty substitution. The new rr-robust test only asserts typeof r.ok === 'boolean' and checks diagnostics only when ok is false, so it passes either way and does not verify the criterion.
Reproduction: Compile core/src with tsc and run: const a={x:'v'}; a.self=a; render('a\n${{a}}', {a}, {strictMode:true}). The result is {ok:true, output:'a\n', diagnostics:[]}. render('${{a.self.self.x}}', {a}) behaves the same way. The cause is Interpreter.valueToString (core/src/interpreter.ts ~608): it calls tryCoerceToString, which swallows the JSON.stringify failure and returns null, and valueToString then turns null into ''. Smallest fix: make render report this case. One way is an interpreter option set only by render that throws a located type-error when an object value cannot be stringified. Then tighten the rr-robust cases to expect ok false. Keeping the change behind a render-only option leaves resolveTemplate's output unchanged (m1).
Evidence: code:core/src/interpreter.ts:608
Evidence: code:core/src/coercion.ts:305
Evidence: diff:tests/headless/render-robust.test.ts
Evidence: test:rr-robust: strict the cyclic value itself does not throw

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |

Files scope: none
<!-- end generated scope -->
