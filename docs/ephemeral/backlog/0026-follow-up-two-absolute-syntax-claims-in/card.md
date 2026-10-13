# Follow-up: Two absolute syntax claims in the module document are false for some inputs at the pinned commit

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0002-describe-the-template-resolver-as-it-is
Finding: f6 (drift)
Serves: c2: A fresh claim checker reading the Tokenizing and Parsing claims against 712fcfd finds two absolute statements that the cited code contradicts, so the criterion 'no unsupported claim' fails. (1) The document says a tag keyword 'must be one of the 22 listed names ... or a SyntaxError "Unknown template tag" is thrown' and that 'a plain {{name}} without $ reaches this error'. But getTokenType does `mapping[keyword] || null` on a plain object literal, and extractKeyword returns the whole content when there is no leading [A-Z_] run. So {{constructor}}, {{toString}} or {{hasOwnProperty}} get an inherited Object.prototype member as the token type, skip the unknown-tag error, and fail later in the parser with 'Unexpected token: function ...'. (2) The document says a top-level ROW that is 'not closed ... raises "Unclosed {{ROW}} block"'. But parseTableRow also breaks, without error, on a following ROW or END_TABLE token, so {{ROW}}a{{ROW}}b{{END_ROW}} leaves the first ROW unclosed and does not raise.
Reproduction: 1. git -C C:/n8n-run show 712fcfd:nodes/TemplateResolver/lexer.ts and read lines 359-362 (extractKeyword returns the whole content when there is no uppercase match) and 367-394 (`return mapping[keyword] || null` on an object literal). With the template '{{constructor}}', keyword = 'constructor', mapping['constructor'] === Object (truthy), so tokenType !== null and the error at lines 237-244 is not thrown. parser.ts:83-89 then throws 'Unexpected token: function Object() ...' instead. 2. git show 712fcfd:nodes/TemplateResolver/parser.ts, lines 773-790: the while loop breaks on check(ROW) or check(END_TABLE) before the isAtEnd check, so a ROW followed by another ROW returns a node without END_ROW and without the 'Unclosed {{ROW}} block' error. Smallest fix: qualify the two sentences in docs/living/architecture/modules/template-resolver.md, for example 'unless the content matches an inherited Object.prototype member name, which instead fails in the parser with "Unexpected token"' and 'when the file ends before END_ROW', citing lexer.ts:359-394, parser.ts:83-89 and parser.ts:778-787. Or move the edge cases to an open question.
Evidence: doc:docs/living/architecture/modules/template-resolver.md (Tokenizing, keyword bullet citing lexer.ts:359-394 and lexer.ts:237-244)
Evidence: doc:docs/living/architecture/modules/template-resolver.md (Parsing, top-level HEADER/ROW bullet citing parser.ts:747-754 and parser.ts:780-787)
Evidence: code:nodes/TemplateResolver/lexer.ts:359-362
Evidence: code:nodes/TemplateResolver/lexer.ts:367-394
Evidence: code:nodes/TemplateResolver/parser.ts:83-89
Evidence: code:nodes/TemplateResolver/parser.ts:778-787

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
