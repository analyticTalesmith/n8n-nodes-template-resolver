# Restore jest and make it the default test command

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A clean clone must pass `npm ci && npm test` with the existing 446-test jest suite. jest, ts-jest and @types/jest are in package-lock.json but missing from package.json, so the declared test script cannot run from the manifest. Restore them at the versions the lock resolves, keep the existing suite as the default test command, and add a small jest reporter that prints node:test-style TAP so Aperture's red-first evidence can read jest failures (Aperture reads only node:test TAP).


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `tr-01` package.json lists jest, ts-jest and @types/jest in devDependencies, the lockfile root agrees, and the test script runs jest
- `contract` `tr-02` the jest TAP reporter prints TAP where a failing assertion is a not ok test carrying code ERR_ASSERTION and a passing test is ok
- `contract` `tr-03` with dependencies installed the existing suite runs through the jest binary with no failures and at least 446 passing tests


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any source under nodes/ or any existing test
- add a runtime dependency
- change the jest roots or the module mapper for n8n-workflow


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

none: no public interface changes.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tools/jest-tap-reporter.cjs` | add | build-tooling |
| `package.json` | edit | build-tooling |

Files scope: `package.json`, `tools/jest-tap-reporter.cjs`
<!-- end generated scope -->
