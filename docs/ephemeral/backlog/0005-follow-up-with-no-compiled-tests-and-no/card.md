# Follow-up: With no compiled tests and no arguments, the runner calls `node --test` with no files, which falls back to de

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0002-working-test-runner
Finding: f4 (drift)
Serves: card-goal: If test-node/ compiles to zero *.test.js files, `files` is empty and `node --test --test-reporter=tap` runs its default discovery from the repo root. That matches scripts/run-node-tests.test.mjs, which spawns the runner three times, recursively. It cannot happen while smoke.test.ts exists, so it is noted for the lead only; a guard exiting nonzero on an empty list would close it.
Reproduction: Remove every *.test.ts under test-node/ but keep a non-test .ts file there so the directory still compiles, then run `node scripts/run-node-tests.mjs`. The runner executes scripts/run-node-tests.test.mjs instead of reporting zero tests.
Evidence: code:scripts/run-node-tests.mjs:31
Evidence: code:scripts/run-node-tests.mjs:35
Evidence: test:scripts/run-node-tests.test.mjs

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->

## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

## Scope

<!-- One row per file you may change. Everything not listed is read-only. Blast radius names module documents under docs/living/architecture/modules/ (without .md), comma-separated, or `none`. Keep those names equal to card.json blast_radius when set. Write `read-only` on its own line when this ticket changes no file. -->

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
