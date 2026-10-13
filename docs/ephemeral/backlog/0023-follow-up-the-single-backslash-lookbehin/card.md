# Follow-up: The single-backslash lookbehind leaves a pipe unescaped when an even number of backslashes precedes it, which

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0009-table-cells-escape-pipes-and-newlines
Finding: f2 (drift)
Serves: c1: The new lookbehind (?<!\\)\| skips any pipe that has a backslash directly before it. That is correct for an odd-length backslash run, such as escape_md output or raw '\|'. It is wrong for an even-length run: in raw data like 'x\\|y' (two literal backslashes, then a pipe), GFM reads the two backslashes as one escaped backslash. The pipe then stays a live delimiter, so the row gains a column, which breaks c1. The rule should be: escape a pipe when the backslash run before it has even length, zero included.
Reproduction: resolveTemplate('{{TABLE}}{{ROW}}${{a}}|z{{END_ROW}}{{END_TABLE}}', new Map([['a', 'x\\\\|y']]), {strictMode:false}). The JS value is the characters x, \, \, |, y. The output is '| x\\|y | z |' with the pipe left unescaped, because the character before it is a backslash. Under GFM the cell scanner consumes '\\' as one escaped character, so the '|' that follows ends the cell. The row renders as three cells ('x\', 'y', 'z') instead of two. The smallest fix is to escape based on the parity of the backslash run, for example content.replace(/\r?\n/g, ' ').replace(/(\\*)\|/g, (m, b) => b.length % 2 ? m : b + '\\|').trim(). This keeps escape_md output, which always has an odd run before '|', unchanged and still escapes the case above.
Evidence: diff:nodes/TemplateResolver/interpreter.ts
Evidence: code:nodes/TemplateResolver/interpreter.ts:404
Evidence: test:table cell escaping with filters > a pipe already escaped by escape_md is not escaped again

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

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
