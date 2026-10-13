# Follow-up: Variable detection strips RAW blocks at text level, so a {{RAW}} spelling inside a comment or a variable tag

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0007-raw-block-outputs-its-text-literally
Finding: f6 (drift)
Serves: project-goal: In the n8n node, the strip regex in extractAllVariables is not aware of comments or of the '${{' variable prefix, unlike the lexer. For '{{# wrap samples in {{RAW}} #}} ${{b}} {{RAW}}x{{END_RAW}}' the lexer renders b as a variable, but detection removes everything from the '{{RAW}}' inside the comment to the real END_RAW, so b is never detected and Strict Mode does not flag it when unmapped. The same happens for a variable literally named RAW followed later by a real block: '${{RAW}} ${{b}} {{RAW}}x{{END_RAW}}' detects neither RAW nor b. The failure is silent under-detection (an empty string instead of a missing-variable error), never a wrong render, and the triggers are uncommon.
Reproduction: Call extractAllVariables('{{# use {{RAW}} #}} ${{b}} {{RAW}}x{{END_RAW}}'): expected ['b'], the regex at utils.ts:18 yields []. Call extractAllVariables('${{RAW}} ${{b}} {{RAW}}x{{END_RAW}}'): expected ['RAW','b'], yields []. This is the 'lesser side effect' already named in f5 and left unaddressed by its fix, plus the '${{RAW}}' variant; noted for the lead (for example as an addition to follow-up 0008), not a fix request. A possible narrow change is to strip comments before stripping RAW blocks and to add a '(?<!\$)' lookbehind on the opening tag.
Evidence: code:nodes/TemplateResolver/utils.ts:18
Evidence: code:nodes/TemplateResolver/lexer.ts:237
Evidence: diff:nodes/TemplateResolver/utils.ts
Evidence: test:rb-01 variable detection ignores everything inside a RAW block

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
