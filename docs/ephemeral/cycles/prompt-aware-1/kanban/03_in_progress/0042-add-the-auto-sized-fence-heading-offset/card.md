# Add the auto-sized FENCE, heading offset and escape modes

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

FENCE and the fence filter wrap content in a code fence longer than any backtick run inside it; heading_offset shifts markdown headings; escape_md gains inline and block modes.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `fe-autosize` FENCE outputs a fence of at least three backticks and longer than the longest backtick run in its body, then the optional lang, the body with one leading and one trailing line break removed, and the closing fence with a trailing line break
- `contract` `fe-lang` lang may be a quoted string or a variable path; an empty or missing lang writes a bare fence; the fence filter does the same for a value, with an optional lang parameter
- `contract` `fe-errors` an unclosed FENCE is a syntax-error at its tag, FENCE counts toward maxDepth and its tags follow the standalone-line rule
- `contract` `ho-offset` heading_offset=N shifts every ATX heading line by N levels, clamped to 1 through 6, leaves headings inside fenced code blocks and non-heading hash text alone, accepts negative N, and a missing or non-integer parameter is a type-error
- `contract` `em-modes` escape_md and escape_md=inline keep today's escaping, escape_md=block adds line-start escaping so a value cannot fake structure (leading hash, greater-than, dash, plus, star, pipe, digits followed by a dot or parenthesis, runs of three or more dashes, equals, backticks or tildes), and any other mode is a type-error
- `contract` `fe-spec` spec lists FENCE and END_FENCE and the fence, heading_offset and escape_md modes in filters, and analyze counts FENCE in blocks and accepts the new filters


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- change what plain escape_md outputs
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the surfaces card documents it.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

FENCE block; filters fence, heading_offset and escape_md modes (see the prompt-aware contract).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | edit | none |
| `core/src/filters.ts` | edit | none |
| `core/src/interpreter.ts` | edit | none |
| `core/src/lexer.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
| `core/src/spec.ts` | edit | none |
| `core/src/types.ts` | edit | none |
| `core/src/whitespace.ts` | edit | none |
| `tests/headless/spec.test.ts` | edit | none |

Files scope: `core/src/`, `tests/headless`
<!-- end generated scope -->
