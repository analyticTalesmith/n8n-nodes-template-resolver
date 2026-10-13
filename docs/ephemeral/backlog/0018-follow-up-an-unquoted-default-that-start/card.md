# Follow-up: An unquoted default that starts with an apostrophe still opens a quote that never closes, so the filters afte

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0006-parse-pipe-defaults-else-if-and-tag-argu
Finding: f2 (drift)
Serves: m1: This is the same class of failure as sustained f1. The revision opens a quote only when the quote character directly follows ^, ?? or =. An unquoted default whose first character is an apostrophe ('90s hits, 'tis, 'em) still opens a quote and never closes it. At base, '${{x ?? '90s hits | head=3}}' rendered "'90": the default is "'90s hits" and then head=3 applies. At head, the whole tail "'90s hits | head=3" becomes the default (only one outer quote, so nothing is stripped), the filter is dropped, and the filter text leaks into the prompt. The lead ruled that an apostrophe in an unquoted default must not swallow later filters.
Reproduction: resolveTemplate("${{x ?? '90s hits | head=3}}", new Map(), { strictMode: false }). At base e7069db: expr.split('|') gives ["x ?? '90s hits", 'head=3'], and the output is "'90". At head 1c62228: in splitOutsideQuotes, text.slice(0, i) is 'x ?? ', which matches /(^|\?\?|=)\s*$/, so quote is set to "'". No closing "'" follows, so parts = ["x ?? '90s hits | head=3"] and the output is "'90s hits | head=3". An unclosed double quote does the same: '${{x ?? "abc | trim}}'. Smallest fix: if splitOutsideQuotes reaches the end of the string with a quote still open, rescan from the position where that quote opened and treat the quote character as plain text there, so an unterminated quote never hides a separator.
Evidence: diff:nodes/TemplateResolver/parser.ts
Evidence: code:nodes/TemplateResolver/parser.ts:580-601
Evidence: doc:docs/living/architecture/modules/template-resolver.md

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
