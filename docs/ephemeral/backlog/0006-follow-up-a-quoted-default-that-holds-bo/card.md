# Follow-up: A quoted default that holds both an escaped quote and a pipe still splits at the pipe (unchanged from base)

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0004-default-text-may-contain-a-pipe
Finding: f2 (drift)
Serves: card-goal: `${{x ?? "a\"|b"}}` with x missing: the backslash-escaped quote closes the quoted run, the pipe splits, and `b"` is treated as a filter name, so the default does not render whole. Base behaved the same way, so this is not a regression or a new error type, and the spec does not define escapes; noted for the lead only.
Reproduction: Call splitOutsideQuotes on `x ?? "a\"|b"` with separator `|`: it returns 2 parts (`x ?? "a\"` and `b"`), the same as base `expr.split('|')`. Rendering with x missing should give the same Unknown filter error at base and at head.
Evidence: code:nodes/TemplateResolver/parser.ts:184
Evidence: diff:nodes/TemplateResolver/parser.ts

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
