---
type: review-packet
card: 261015-language2c13-a2-build-list-items-and-table-rows-with-for
tier: product
built_at: 2026-10-15T14:28:11.775Z
base: fa60d52418cc6f548d16224e48977851f998a1b6
head: b2e3fb423d8b0a8f8640786bb433a806e7b1a3a7
read_at: b2e3fb423d8b0a8f8640786bb433a806e7b1a3a7
frozen: true
brief_sha256: d8f241740e535b78261402e11e163f56581a3d3a5a9e5b3569c477b41bd0c6a8
manifest_sha256: cecee4ec2f6e9bea0dc21b8cd130470904ad81c9f6e8c1a58230ceda6b5928b4
criteria_sha256: dbf6b581274021a00477a78f085c83446aefcadb68b9aefaa9f490a34c4f9083
scope_sha256: 2ca27d4f2adc38ce5894c651961d76f53fa5475d14215a647d17052e21bc8a77
diff_sha256: 2e1535f1174cffb555449b401891f1b09ec77d0e5113c7f68cc052de635bfd6b
omitted_paths: 9
criteria_count: 9
must_not_count: 4
---

# Review packet: 261015-language2c13-a2-build-list-items-and-table-rows-with-for

Manifest amended after the freeze at 2026-10-15T14:27:08.585Z by build-lead: test writer committed the test and golden files before the base; two approved test corrections edit the test file (edit +tests/language/list-table-children.test.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: FOR and IF (with ELSEIF and ELSE) inside LIST build numbered items and inside TABLE build rows, on the same loop runner as any FOR, with every old template keeping its output; a table-cell pipe after an even run of backslashes is now escaped.

### Criteria

- c1 (verify: test): lc-list: FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- c2 (verify: test): lc-table: IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- c3 (verify: test): lc-close: a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- c4 (verify: test): lc-errors: any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes (question 4).
- c5 (verify: test): lc-limits: FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- c6 (verify: test): lc-ws: the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- c7 (verify: test): lc-analyze: analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- c8 (verify: test): lc-pipes: in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This changes the output of a previously valid template (a cell holding two backslashes and a pipe): named in question 5 and the changelog.
- c9 (verify: tool): lc-compat: the full suite passes; no existing test file changes.

### Must not

- m1: change any existing test expectation or existing test file
- m2: add a runtime dependency
- m3: evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- m4: change the output or the error of any template that was valid before, except the approved pipe escaping (a cell holding two backslashes and a pipe) and the loosened parse (comment, FOR and IF directly in a LIST or TABLE, an IF holding a ROW inside a TABLE FOR now builds rows)

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: FOR and IF (with ELSEIF and ELSE) inside LIST build numbered items and inside TABLE build rows, on the same loop runner as any FOR, with every old template keeping its output; a table-cell pipe after an even run of backslashes is now escaped.
Must not:
- change any existing test expectation or existing test file
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- change the output or the error of any template that was valid before, except the approved pipe escaping (a cell holding two backslashes and a pipe) and the loosened parse (comment, FOR and IF directly in a LIST or TABLE, an IF holding a ROW inside a TABLE FOR now builds rows)

## Questions

- goal-critical: does every template the base commit accepted (TABLE FOR with ROW or text bodies and several nodes, IF blocks inside bodies, iterables or headers with spaces, a non-iterable in a TABLE, unclosed ROW and LIST_ITEM, nested LIST, FOR and IF inside item content) render the same output? Probe the base commit with such templates.
- goal-critical: does numbering stay gap-free across static, FOR-made and IF-made items, with condition-skipped items numbered by today's rule?
- goal-critical: is any other tag or text inside a FOR or IF that builds items or rows a located `syntax-error` in every mode, at parse time (also in a branch that never renders)?
- goal-critical: does an unclosed LIST_ITEM or ROW end at END_FOR, ELSE, ELSEIF and END_IF, and is a LIST_ITEM inside an unclosed item's FOR or IF a `syntax-error` that says to close with END_LIST_ITEM?
- goal-critical: do FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations and the output limit (run), including ELSE bodies and nested depth?
- goal-critical: does analyze agree with render (loop names scoped, kinds list_item, table, if, elseif, for) and spec stay derived from the lexer table?
- polish: the standalone rule and trim markers around FOR, IF, ELSE and END tags in LIST and TABLE; LIST, TABLE and their parts keep their own spacing; CRLF.
- polish: strict versus lenient, render versus resolveTemplate, missing, null and present values, cyclic and BigInt item values, astral characters, prototype names (`__proto__`, `constructor`) as loop names and data keys.
- polish: pipes in cells: even, odd and zero backslash runs, values with newlines.

## Rubric

- The criteria in `card.json` hold, each with a test named by its id in `tests/language/list-table-children.test.ts`.
- One loop runner serves FOR in LIST, in TABLE and elsewhere; no copy of the iteration code.
- LIST and TABLE parse their children through one rule each, shared by the FOR and IF inside them.
- Strict versus lenient differs only for missing data (ADR 0003); syntax errors are the same in every mode.
- `resolveTemplate` and `render` agree on the language.
- No file outside the card's scope changed.

## Design context

- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- core/src/interpreter.ts
- core/src/parser.ts
- core/src/analyze.ts
- core/src/types.ts
- core/src/spec.ts
```

### spec.md as of base fa60d52418cc, read at b2e3fb423d8b

```
# Spec: FOR and IF build LIST items and TABLE rows

Source: `docs/ephemeral/research/language-2-plan.md` section L2 (criteria are frozen in `card.json`). Approved behaviour change (plan question 5b): a table-cell pipe after an even run of backslashes is escaped. The legacy TABLE-FOR rules stay (question 4).

## Acceptance criteria

The criteria below are verbatim from card.json and are the contract (lc-compat is a tool criterion, the full suite).

- lc-list: FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- lc-table: IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- lc-close: a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- lc-errors: any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes (question 4).
- lc-limits: FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- lc-ws: the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- lc-analyze: analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- lc-pipes: in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This changes the output of a previously valid template (a cell holding two backslashes and a pipe): named in question 5 and the changelog.
- lc-compat: the full suite passes; no existing test file changes.

## Syntax settled

Children of a LIST are, in any order, `{{LIST_ITEM}}` blocks, `{{FOR}}` blocks and `{{IF}}` blocks, plus comments and whitespace-only text. The body of such a FOR (and its `{{ELSE}}` body) and every branch of such an IF (`IF`, `ELSEIF`, `ELSE`) hold the same kinds of child, to any depth the parse limits allow. A TABLE holds `{{HEADER}}` (directly in the TABLE only), `{{ROW}}`, `{{FOR}}`, `{{IF}}`, comments and whitespace; an IF that builds rows (directly in the TABLE, or in a FOR or IF that builds rows) and every FOR inside it hold `{{ROW}}`, FOR, IF, comments and whitespace only. Any other tag or non-whitespace text is a `syntax-error` located at that tag or text, in every mode, found at parse time (so `render`, `validate` and `analyze` report it even in a branch that never runs). Existing messages keep their start (`Unexpected token in LIST: X`, `Unexpected text in LIST: "..."`, the TABLE ones); only suggestions may name FOR and IF too.

Comments are accepted among the children of a LIST or a TABLE too (today a comment directly in a LIST or TABLE is a `syntax-error`; accepting it breaks no valid template).

## Two kinds of FOR in a TABLE (legacy kept)

- A FOR written directly in a TABLE keeps today's parse and run: its body is parsed as in any FOR (any node), its non-iterable is silent in every mode, and body nodes that are not a ROW are rendered and split on `|` (the run rule of `tableRowsFrom`: a run of several neighbouring inline nodes is one text whose non-blank lines are rows; a run of one node and every block node is one row each). No existing table template changes.
- A FOR inside an IF that builds rows (or inside such a FOR) is new syntax: its body and ELSE body are strict (ROW, FOR, IF, comments, whitespace). It uses the same runner; a non-iterable value renders no rows without error, in strict mode too (a TABLE never errors on a FOR's iterable), and its ELSE rows render.
- Rows from an IF or FOR that sits in the body of a legacy FOR: a body node that is an IF or FOR holding a ROW (found directly in any of its branches or bodies, through nested IF and FOR) is run in row mode, so its ROWs become rows; any other IF or FOR node is rendered and split exactly as today. (Today an IF holding a ROW inside a TABLE FOR renders no row at all.)

## Unclosed items and rows

- `{{LIST_ITEM}}` without `{{END_LIST_ITEM}}` ends at the next LIST_ITEM, at END_LIST, and now at END_FOR, ELSE, ELSEIF and END_IF (the closer or branch word of the enclosing child block; it is not consumed by the item). Same for `{{ROW}}` without `{{END_ROW}}` (today it ends at the next ROW and END_TABLE; add the same four). HEADER keeps its rule.
- An unclosed item or row followed by a FOR or IF: the FOR or IF is that item's (row's) content, parsed as in any content, as today.
- A `{{LIST_ITEM}}` met while parsing the content of an item (so inside a FOR or IF that is item content) is a `syntax-error` at that LIST_ITEM whose suggestion says to close the item with `{{END_LIST_ITEM}}`. A LIST nested in item content parses its own items as before.

## Numbering and rendering

- LIST: one running counter per LIST (nested LISTs have their own); an item that renders (condition true, or no condition, even with empty content) takes the next number; an item skipped by its condition without a fallback takes none; one with a fallback is numbered with the fallback text, as today. Items from any FOR iteration or IF branch share the counter with static items, in source order. Lines are joined by `\n` as today.
- TABLE: rows come in source order from ROWs, FORs and IFs; padding to the widest row and the header rule (the first row is the header only when a HEADER is written) are unchanged.
- An IF evaluates its conditions exactly as an IF elsewhere (errors located at the IF); a FOR runs on the one loop runner (`runLoop`) with window arguments, ELSE and `@total`; FOR names are bound on the scope frame so conditions and cells of the items and rows inside read them.
- Pipe escaping in a table cell (`lc-pipes`): in the rendered text of a cell, a `|` preceded by an even number (0, 2, ...) of backslashes is written `\|` (the backslashes stay); a `|` preceded by an odd number of backslashes is left as written. Example: the value `a\\|b` (two backslashes, pipe) renders `a\\\|b`; `a\\\|b` (three) is unchanged; `a|b` becomes `a\|b` as today. The base renders the two-backslash value unchanged.

## Limits and errors

- Every FOR and IF in a LIST or TABLE is a node counted against `maxNodes`, and a block counted against `maxDepth`, at parse time, as everywhere. Iterations count per rendered item (`maxIterations`, `limit-iterations` located at the FOR, `stats.iterations`). The running output check applies inside FOR bodies and ELSE bodies, as the runner does today.
- Diagnostics are located at the failing node, never 1:1.

## Analyze, spec

- analyze visits a ListNode's and TableNode's children: ListItem (its condition has kind `list_item`), IF (condition kinds `if`, `elseif`), FOR (iterable and window paths kind `for`; the loop name is scoped over the body and not the ELSE body), TableRow (reads inside cells have kind `table`). Block counts: a FOR or IF in a LIST or TABLE counts as FOR or IF.
- `spec()`: the descriptions of LIST, LIST_ITEM, TABLE, ROW (and FOR/IF if useful) say FOR and IF build items and rows and how an unclosed item ends. No keyword is added. The test that derives blocks from the lexer table must still pass.

## Interface

- `core/src/types.ts`: `ListNode.items` becomes `ListChild[]` (a `ListItemNode`, or a `ForNode` or `IfNode` whose bodies hold list children) and `TableNode.rows` becomes `TableChild[]` (a `TableRowNode`, `ForNode` or `IfNode`); the `TableRow{cells:[[ForNode]]}` wrapper goes away (the AST tests in `tests/TemplateResolver.node.test.ts` pin only `items`/`rows` length and `items[0].content`; they must still pass untouched). Export the two union types.
- `core/src/parser.ts`: `parseFor` and `parseIf` take an optional child parser used for their bodies (default: `parseNode`); a list child parser and a row child parser enforce the child rules above and are used by LIST, TABLE, and the FOR and IF inside them; FOR and IF there go through `nested(...)` and `open(...)` so depth and node limits count them. Keep the extra node count the TABLE-FOR branch has today for a FOR directly in a TABLE (do not change limits of old templates); an IF or FOR newly allowed is counted once.
- `core/src/interpreter.ts`: one collector for LIST children and one for TABLE rows (the existing `tableRowsFrom` extended), both recursive over FOR (through `runLoop`) and IF; no second copy of the loop code; `visitTable`'s direct-FOR detection goes away with the wrapper.
- `core/src/analyze.ts`, `core/src/spec.ts` as above. `core/src/expressions.ts` is not in scope and needs no change.

## Compatibility (probe the base before changing anything)

The previous card's reviewer found compatibility breaks by running templates the old code accepted. The recorded base outputs are in `compat-probe-base.json` next to this file (strict and lenient, render and resolve). These must not change: TABLE-FOR with ROW and with text bodies, several nodes, nested FOR, an IF with text in a TABLE-FOR body, two FORs in a TABLE, a non-iterable in a TABLE (silent), an iterable with a space, an unclosed ROW before the next ROW, a plain LIST with conditions and fallbacks, an unclosed LIST_ITEM before the next, a nested LIST, FOR and IF inside an item's content (closed and unclosed), a LIST in a FOR. Text directly in a LIST stays a `syntax-error`. Changed on purpose: a comment, FOR and IF directly in a LIST; a comment and IF directly in a TABLE; an IF holding a ROW inside a TABLE FOR (rendered nothing before). In `compat-probe-base.json` the `tablePipes` rows used data with one backslash by mistake; ignore them (the pipe examples are in the spec above).

## Non-goals

SET, `@parent`, `AS k, v`, macros, partials. No living document edits; no deltas (docs_impact none).
```

### card.md as of base fa60d52418cc, read at b2e3fb423d8b

```
# Build LIST items and TABLE rows with FOR and IF

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Build LIST items and TABLE rows with FOR and IF.

## Must-haves

- `contract` `lc-list` FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- `contract` `lc-table` IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- `contract` `lc-close` a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- `contract` `lc-errors` any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes (question 4).
- `contract` `lc-limits` FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- `contract` `lc-ws` the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- `contract` `lc-analyze` analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- `contract` `lc-pipes` in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This changes the output of a previously valid template (a cell holding two backslashes and a pipe): named in question 5 and the changelog.
- `contract` `lc-compat` the full suite passes; no existing test file changes.

## Acceptance criteria

- lc-list: FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- lc-table: IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- lc-close: a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- lc-errors: any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes (question 4).
- lc-limits: FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- lc-ws: the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- lc-analyze: analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- lc-pipes: in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This changes the output of a previously valid template (a cell holding two backslashes and a pipe): named in question 5 and the changelog.
- lc-compat: the full suite passes; no existing test file changes.

## Must-nots

- change any existing test expectation other than the one named amendment (if any)
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown name or bad argument pass in lenient mode (ADR 0003)

## Context links

- [Language contract](../../../../../../living/architecture/language-contract.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

See the plan section for this card in docs/ephemeral/research/language-2-plan.md (syntax settled here, files, risks); the criteria above are the contract.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |
| `tests/language/list-table-children.test.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/golden/render-cases/lang-list-for/data.json`, `tests/golden/render-cases/lang-list-for/expected.md`, `tests/golden/render-cases/lang-list-for/options.json`, `tests/golden/render-cases/lang-list-for/template.md`, `tests/golden/render-cases/lang-table-if/data.json`, `tests/golden/render-cases/lang-table-if/expected.md`, `tests/golden/render-cases/lang-table-if/options.json`, `tests/golden/render-cases/lang-table-if/template.md`, `tests/language/list-table-children.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/language/list-table-children.test.ts`
- files_scope: `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/golden/render-cases/lang-list-for/data.json`, `tests/golden/render-cases/lang-list-for/expected.md`, `tests/golden/render-cases/lang-list-for/options.json`, `tests/golden/render-cases/lang-list-for/template.md`, `tests/golden/render-cases/lang-table-if/data.json`, `tests/golden/render-cases/lang-table-if/expected.md`, `tests/golden/render-cases/lang-table-if/options.json`, `tests/golden/render-cases/lang-table-if/template.md`, `tests/language/list-table-children.test.ts`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/language-contract.md

```
---
summary: "Template language contract: 23 filters, math errors, condition operators, CASE matchers, the node limit and the surfaces that must agree"
state: built
---

# Language contract

<!-- Fill the summary with one sentence a reader can use to decide whether to open this document. State starts as planned; it becomes built when the work ships and validated only after a close review. -->

## Purpose

<!-- What this document is for and who reads it. Link to related documents, never copy them. Add the sections this kind of document needs below. -->

The contract for the template language beyond the prompt-aware constructs: the filter registry and its filters, math and output errors, condition operators, CASE matchers and the node limit. SET, INPUT, CALL, macros and partials are not built yet; [ADR 0007](../decisions/adr/0007-statement-tags-without-a-body.md) records that SET, INPUT and CALL will be single tags. Settled decisions apply: [ADR 0001](../decisions/adr/0001-house-style-for-every-block.md) (paired blocks), [ADR 0003](../decisions/adr/0003-unknown-names-are-always-errors.md) (unknown names are errors in every mode). Companion: [prompt-aware-contract.md](prompt-aware-contract.md).

## Filters

- **One registry.** Every filter is one definition in one table: `name`, `params` (the signature text spec() shows), `description`, `paramNames` (the named parameters it accepts; the shorthand `name=value` is the parameter `value`) and `apply(input, params)`. render, `spec()`, `analyze` and `validate` read this table and nothing else; a filter added to it is accepted by all four. `spec()` shows only `name`, `params` and `description`.
- **Groups.** The six core filters (`head`, `tail`, `trim`, `escape_md`, `fence`, `heading_offset`) live in `filters.ts`; the eight text filters are in `filters-text.ts` and the nine collection filters in `filters-collection.ts`, which the registry includes: 23 filters in all.
- **Values.** A filter receives the resolved value and returns a value; the text printed is the output step's text form of the final value. The existing filters coerce their input to text exactly as the output step does, so no existing output changes.
- **Arguments.** A filter call is written `name`, `name=value` or `name:key=value,key=value`. It is parsed once at parse time, respecting quotes: `fence="a=b"` and `fence="a:b"` keep the whole value. A parameter name the filter does not declare (`escape_md:mode=block`) is a `type-error` located at the variable (ADR 0003), in every mode.
- **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
- **Static checks.** `validate` and `analyze` report an undeclared parameter as a `type-error` at the variable, the same code, position and wording as `render`.
- **Known gap.** `FILTERS` (exported for compatibility) is a snapshot of the registry names taken at load; code that needs the live list reads `FILTER_REGISTRY` or `spec()`.

### Text filters

Group in `filters-text.ts`. Each coerces its input to text as the output step prints it, except `default`. A missing or invalid parameter value is a `type-error` at the variable in every mode; `validate` and `analyze` run without data, so they check names and undeclared parameters, and a bad value shows at render. The shorthand `name=value` is the parameter `value`.

| Filter | Result |
|---|---|
| `upper`, `lower` | the text in upper or lower case; no parameter |
| `title` | the first letter of each whitespace-separated word in upper case, the rest in lower case; no parameter |
| `replace:find="a",with="b"` | every non-overlapping occurrence of the literal `find` (required, non-empty) replaced by `with` (default empty text); never read as a pattern |
| `indent[=N]` | N spaces (whole number 0 to 100, default 2) before every line that has characters; line breaks are kept |
| `quote` | the text as a JSON double-quoted string; no parameter |
| `round[=N]` | a number rounded half away from zero to exactly N decimals (whole number 0 to 20, default 0), computed on its digits so `1.005` with `round=2` gives `1.01`; text that is not a finite number, or has an exponent beyond 400 (`1e400`), is left as it is |
| `default="x"` | `x` (required) when the raw value is not truthy by the language rule: missing, null, empty or whitespace-only text, the texts `0`, `false` and `no` in any letter case, the number 0, false, an empty list or an empty object; else the value. `??` keeps its own rule |

In strict mode a missing variable is reported before `default` runs, so `default` replaces missing data in lenient mode only.

### Collection filters

Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines`, `json`.

- **Input.** `join first last sort unique slice` coerce their input as FOR does: an array passes through, a text such as `"a,b,c"` or `'["x","y"]'` becomes a list, a number or boolean a one-item list, null or a missing value the empty list. An object given to one of them is a `type-error`. No filter changes its input.
- **Output.** A filter returns a value: `join`, `json` a text; `length` a number; `first`, `last` an item (null when the list is empty); `sort`, `unique`, `slice`, `lines` a list, which the output step prints as compact JSON and the next filter receives as a list.
- **join.** `join=SEP` needs its separator (`join=""` is allowed); items print as the output step prints them.
- **length.** Items of a list, UTF-16 code units of a text (not split into items, so one emoji counts 2), keys of an object, characters of a number or boolean's text form; 0 for null or missing.
- **slice.** `Array.prototype.slice` semantics (negative counts from the end); each given bound is an integer, else a `type-error`.
- **lines.** The text form split on `\r\n`, `\r` or `\n`; one trailing line break adds no empty item.
- **sort.** Stable and deterministic: numbers numeric, then strings by code unit (so `"10"` before `"9"`), then every other value in its original order. `sort=key` orders object items by that property with the same rule; items without it come last.
- **unique.** Keeps the first occurrence; two values are equal when they have the same type and value (`1` and `"1"` differ), objects and arrays by their `json` text.
- **json.** Compact JSON with object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a `type-error`, a shared non-cyclic reference is not.
- **Errors.** A parameter a collection filter does not declare is a located `type-error` in every mode, as for every filter.

## Math and output errors

- **Zero.** In `render`, `/` or `%` with a zero divisor (also `0 / 0` and a divisor computed to zero) is a `type-error` located at the variable, in every mode. `resolveTemplate` keeps its old output (`Infinity`, `NaN`): this is a render-only divergence, as `standaloneLines` is.
- **Float printing.** In `render`, an arithmetic result prints with at most 15 significant digits (`0.1 + 0.2` prints `0.3`; `1 / 3` prints `0.333333333333333`; integers of any size and negative numbers print unchanged). `resolveTemplate` prints the plain number, so `0.1 + 0.2` stays `0.30000000000000004` there.
- **Hyphens in names.** A hyphen with an ASCII letter on both sides is part of one name (`first-name`, `user.first-name`, `a-b + 1` reads the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y` and `1-a` are arithmetic. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form. `analyze` lists a hyphenated name as one variable. Applies in `render` and `resolveTemplate`.
- **Malformed math.** A malformed expression, whatever the data holds (so `total * ` errors whether or not `total` exists) (`(1 + 2`, `1 +`, `1 + * 2`, `2 $ 3`) is a located `type-error` in lenient mode too, instead of empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty in lenient mode. The error never replaces an existing key, and a missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math. Applies in both entry points.
- **Unprintable output.** A value with no text form (a cyclic object or array, a BigInt) used as output, as a CASE subject or before a filter that turns its input into text (every filter except `default` and the collection filters that keep a value: `length first last sort unique slice json`, so `xs | length` still counts, while `lines` and `join` check) is a `type-error` located at the variable or CASE node, in every mode; `null` and missing still print as empty. Applies in both entry points.

## Condition operators

Conditions are the same in `render` and `resolveTemplate`. Strict mode governs missing data only, and a condition never raises a missing-variable error (a missing name reads as null). Every error is a `type-error` located at the IF, ELSEIF or LIST_ITEM; a cyclic value or a BigInt as an operand is a located error or a normal result, never a raw exception.

- **in, not in.** `x in ["a", y, 3]`, `x in list_var`, `x in "text"`; the words are case-insensitive. A list literal holds operands (literals or variable paths) separated by commas outside quotes; `[]` is empty, while an empty item, a nested `[` or a missing `]` is an error. Against an array, true when an element equals x by the equality rule below (array, object and BigInt elements never match); against a text (quoted or from a variable), a case-sensitive substring test, so an empty x is contained and a text holding JSON is still only a text. A left side that is an array, an object (cyclic or not) or a BigInt is a `type-error` first, whatever the right side holds, a missing one included. Then a missing or null x, or a missing or null right side, gives false (`not in`: true). A right side that is a number, a boolean or an object is a `type-error`. `not in` is exactly the negation of `in`.
- **between.** `x between [lo, hi]`: exactly two operands, each a number or numeric text (a boolean, `true` or `false`, is not numeric here, though `>` still reads it as 1 or 0); inclusive at both ends; `lo` above `hi` is false. A non-numeric or missing operand, a list that is not two items and a right side that is not a list literal are a `type-error`. There is no `not between`.
- **Logic.** `AND`, `OR` and `NOT` are read in any letter case; `&&`, `||` and `!` are spellings of the same three (`NOT x`, `NOT (x)` and `!x` negate), and parentheses group. `spec().operators` lists `AND`, `OR` and `NOT` only.
- **Precedence.** `in`, `not in` and `between` split at the tier of `contains`: after AND, OR, NOT and the comparison operators, before type checks, outside quotes, brackets and parentheses, so `NOT x in [..]`, `a in [..] AND b` and `(a) OR (b between [1, 2])` need no extra rule. Chaining two operators (`a in b == c`) is an error. An operator word inside quotes never splits.
- **.length.** A path segment `length` after any value: an array gives its element count; a text gives its UTF-16 code units (as the `length` filter does, so one emoji is 2) unless it is a JSON object text with its own key `length`; an object with its own key `length` returns that key's value, null included. Any other value, and any missing data, stays null (no zero). Works in conditions, output, math, CASE subjects and after other segments (`user.tags.length`, `items.0.length`); a root variable named `length` is an ordinary variable.
- **Equality.** `==` and `!=`: when either side is a quoted literal both sides compare as text (`z == "01234"` is false for 1234, `"1.0" == 1` is false); otherwise numbers compare numerically and anything else as text, as before. `in` list items follow the same rule. For `contains`, `startsWith` and `endsWith` an unquoted number on the right keeps its written text (`x contains 1.50`, `007`).
- **Unknown words.** An operand that is not a literal, not a variable key and holds whitespace outside quotes (`a == b c`, `a like b`, `a matches /x/`) is an "Unrecognized condition" error in every mode, also in a branch that AND or OR would skip; `matches` is not an operator and no pattern in a template is ever compiled.
- **spec and analyze.** `spec().operators` lists `in`, `not in`, `between` and `.length` after the existing operators. `analyze` records the variables in the left side, the list items or right side, the bounds and the root of a `.length` path (path text as written); a malformed condition is an `unrecognized-condition` diagnostic.

## CASE matchers

`{{CASE subject}}` renders the first `{{WHEN ...}}` that matches, else `{{DEFAULT}}`. The text after `WHEN` is one of two forms, the same in `render` and `resolveTemplate`; tag words are upper case.

- **List.** One or more matchers separated by commas outside quotes (`{{WHEN "a", "b"}}`, `{{WHEN "a", other, 3}}`; spaces around commas are free). A matcher is a quoted text (`"a"` or `'a'`, a comma inside quotes belongs to the text, no unescaping; a quote followed by a comma or the end closes the text even after a backslash, so `'C:'` is the text `C:`), a number (`5`, `-2`, `1.50`), `true`, `false`, `null` (empty text) or a variable path (`other`, `user.plan`, `first-name`, `café`; segments separated by dots, a name starts with a letter, `_` or `@`, and a hyphen joins a name only between two ASCII letters, so `limit-1`, `a-` and `a--b` are not names). The WHEN matches when any matcher matches.
- **Comparison.** An operator `==`, `!=`, `>`, `<`, `>=` or `<=` and exactly one matcher (`{{WHEN >= 10}}`, `{{WHEN != other}}`).
- **Matching.** The subject and every matcher become text the way the subject always did (missing and null are empty text, lists and objects are JSON, a cyclic value or a BigInt is the located `type-error`). A variable matcher is read with the subject's own lookup: a missing name is a located `missing-variable` error in strict mode and empty text in lenient mode. Equality is the one rule of the operators above: when either side is a quoted text both compare as text (`WHEN "1"` does not match `1.0`), otherwise numeric texts compare as numbers (`WHEN 1` matches `1.0` and `"01"`) and anything else as text; a variable counts as unquoted. `!=` negates `==`. `>`, `<`, `>=` and `<=` compare numbers like the same operators in conditions; a side that is not numeric, empty text for a missing or null value included, is a `type-error`, never false. A runtime error in a matcher is located at its WHEN; the old single form `{{WHEN "x"}}` matches as before, `{{WHEN ""}}` matching a missing or null subject.
- **Errors.** At parse, in every mode and entry point: nothing after `WHEN`, an empty list item (`"a",`), an unterminated quote, a matcher that is neither a literal nor a variable path (`a b`, `"a" "b"`, `1abc`, `limit-1`, `a@b`), and a comparison with no matcher, with several (`>= 1, 2`) or after a list item (`"a", > 5`) are a `syntax-error` located at the WHEN tag, even in a branch that never renders.
- **spec and analyze.** `spec()` lists the WHEN arguments as `value[, value...] | variable | operator value`. `analyze` records every variable path of a WHEN (list or comparison) as `case` usage, not optional, with the subject's own rules (loop names and `@` names excluded, literals never recorded).

## Node limit

- **maxNodes.** `Limits.maxNodes` (default 20000, `DEFAULT_LIMITS`) bounds the size of a template, partials excluded because none exist yet. The parser counts every node it builds except the program root, parent before children, at the node's opening token; node `maxNodes + 1` is a `limit-nodes` error located at that token, with the suggestion "Shorten the template or raise limits.maxNodes". It is raised in `render`, `validate`, `analyze` and `resolveTemplate`, in every mode, before any output is produced.
- **Long chains.** An ELSEIF chain is parsed, run and analyzed in loops, so a very long chain ends in a result or in `limit-nodes`, never in a stack overflow.
- **Surfaces.** The CLI takes `--max-nodes n` (it can raise as well as lower), the HTTP API takes `options.limits.maxNodes` (it can only lower the server's value; `validate` and `analyze` use the server's), the OpenAPI document lists it in its Limits schema, and `spec().limits` reports it. `analyze` applies the caller's limits, else the defaults.

## Surfaces that agree

- **One source each.** `spec().blocks` lists every opening keyword the lexer accepts with its `END_` keyword as `closes` (`ELSEIF` and `ELSE` have none); `spec().filters` is the registry; `spec().operators` lists the operators of the conditions: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean`, `AND`, `OR`, `NOT`, `in`, `not in`, `between` and `.length`.
- **A test keeps them in step.** `tests/language/surfaces.test.ts` fails when a lexer keyword, a registry filter or an evaluator operator is not in `spec()`, when `spec()` lists a block or filter the lexer or registry lacks, or when the README lacks a filter, an operator, a limit key, `--max-nodes`, `limit-nodes` or the showcase template of the golden case `tests/golden/render-cases/lang-filters-showcase/`.
- **The README.** It documents each filter, operator, limit option and WHEN form with examples that were run; the showcase example is the golden case's template, so it renders as shown.
```

### docs/living/decisions/adr/0003-unknown-names-are-always-errors.md

```
---
summary: Unknown filters and unknown identifiers are always errors; strict mode only governs missing data.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: built
---

# Unknown names are always errors, strict mode governs missing data

**Context.** Unknown filters throw today but unknown identifiers followed by operators silently evaluate false, and strict mode mixes missing data with misspelled names.

**Decision.** A filter, operator or identifier that the language does not define is a syntax-level error in every mode. Strict mode decides only what happens when a defined variable has no value in the data.

**Alternatives.** Report unknown names as errors in strict mode only; rejected because a typo then passes silently in the default mode.

**Consequences.** Typos are caught before a run by validate and analyze. Missing data stays tolerant by default.
```

### core/src/interpreter.ts

```
import {
  ProgramNode,
  ASTNode,
  TextNode,
  VariableNode,
  IfNode,
  CaseNode,
  ForNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableRowNode,
  TernaryNode,
  SectionNode,
  FenceNode,
  VariableLookup,
  ForWindowArg,
  TemplateValue,
  Limits,
  withDefaultLimits,
} from "./types";
import {
  TypeError,
  MissingVariableError,
  MathSyntaxError,
  LimitError,
  locateError,
} from "./errors";
import {
  tryCoerceToArray,
  tryCoerceToString,
  tryCoerceStringForPathSegment,
} from "./coercion";
import {
  builtInLength,
  DivisionByZeroError,
  evaluateCondition,
  evaluateMathExpression,
  evaluateWhen,
  formatNumber,
  hasStrayCharacter,
  isMathExpression,
  isTruthy,
  subtractionHint,
} from "./expressions";
import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
import { COLLECTION_FILTERS } from "./filters-collection";
import { Frame, RootScope, readOwn } from "./scope";

/** Filters that take any value as it is, so they run before the unprintable check */
const KEEPS_RAW_INPUT = new Set([
  ...COLLECTION_FILTERS.map((filter) => filter.name).filter(
    (name) => name !== "lines" && name !== "join"
  ),
  "default",
]);

/**
 * Interpreter: Walks AST and produces output string
 *
 * Features:
 * - Variable substitution with safe nested access
 * - Math expressions in variables
 * - Conditional rendering (IF/ELSE/ELSEIF)
 * - CASE/WHEN/DEFAULT blocks
 * - FOR loops with special variables (@index0, @first, @last, etc.)
 * - Lists (numbered, nested)
 * - Tables (with/without headers, alignment)
 * - Code fences sized to their content (FENCE)
 * - Filters (head, tail, trim, escape_md, fence, heading_offset)
 * - Default operator (??)
 * - Ternary with variable references
 */
export class Interpreter {
  private strictMode: boolean;
  private limits: Limits;
  private render: boolean;
  private iterations = 0;
  private omittedSections = 0;
  private readonly root: RootScope;
  /** The innermost scope: a loop frame while a loop renders, else the root */
  private scope: VariableLookup;

  constructor(
    variables: VariableLookup,
    options?: { strictMode?: boolean; limits?: Partial<Limits>; render?: boolean }
  ) {
    this.strictMode = options?.strictMode ?? true;
    this.render = options?.render ?? false;
    this.limits = withDefaultLimits(options?.limits);
    this.root = new RootScope(variables);
    this.scope = this.root;
  }

  /**
   * FOR iterations run by the latest interpret call
   */
  get iterationCount(): number {
    return this.iterations;
  }

  /**
   * Sections dropped for an empty body by the latest interpret call
   */
  get sectionsOmitted(): number {
    return this.omittedSections;
  }

  /**
   * Main interpretation entry point
   */
  interpret(ast: ProgramNode): string {
    this.iterations = 0;
    this.omittedSections = 0;
    this.scope = this.root;
    return this.visitProgram(ast);
  }

  /**
   * Visit program node (root)
   */
  private visitProgram(node: ProgramNode): string {
    const parts: string[] = [];
    let length = 0;
    for (const child of node.body) {
      const output = this.visit(child);
      length += output.length;
      this.checkOutputLength(length, child);
      parts.push(output);
    }
    return parts.join("");
  }

  /**
   * Run a node's own evaluation, locating any error it throws at the node
   */
  private at<T>(node: ASTNode, evaluate: () => T): T {
    try {
      return evaluate();
    } catch (error) {
      throw locateError(error, node.line, node.column);
    }
  }

  private countIteration(node: ForNode): void {
    this.iterations++;
    if (this.iterations > this.limits.maxIterations) {
      throw new LimitError(
        "limit-iterations",
        `Loops ran more than ${this.limits.maxIterations} iterations in total`,
        node.line,
        node.column,
        "Iterate over less data or raise limits.maxIterations"
      );
    }
  }

  private checkOutputLength(length: number, node: ASTNode): void {
    if (length > this.limits.maxOutputChars) {
      throw new LimitError(
        "limit-output",
        `Output is longer than ${this.limits.maxOutputChars} characters`,
        node.line,
        node.column,
        "Render less content or raise limits.maxOutputChars"
      );
    }
  }

  /**
   * Visit dispatcher
   */
  private visit(node: ASTNode): string {
    switch (node.type) {
      case "Text":
        return this.visitText(node as TextNode);
      case "Variable":
        return this.at(node, () => this.visitVariable(node as VariableNode));
      case "If":
        return this.visitIf(node as IfNode);
      case "Case":
        return this.visitCase(node as CaseNode);
      case "For":
        return this.visitFor(node as ForNode);
      case "List":
        return this.visitList(node as ListNode);
      case "Table":
        return this.visitTable(node as TableNode);
      case "Section":
        return this.visitSection(node as SectionNode);
      case "Fence":
        return this.visitFence(node as FenceNode);
      case "Ternary":
        return this.at(node, () => this.visitTernary(node as TernaryNode));
      case "Comment":
        return ""; // Comments excluded from output
      default:
        return "";
    }
  }

  /**
   * Visit text node (pass through)
   */
  private visitText(node: TextNode): string {
    return node.content;
  }

  /**
   * Visit variable node: ${{name}}, ${{user.name | filter}}, ${{a + b}}
   */
  private visitVariable(node: VariableNode): string {
    // Check if this is a math expression (contains operators)
    const pathStr = node.path.join(".");
    let mathError: unknown = null;
    if (isMathExpression(pathStr) || hasStrayCharacter(pathStr)) {
      try {
        const result = evaluateMathExpression(pathStr, this.scope, {
          zeroIsError: this.render,
        });
        return this.render ? formatNumber(result) : String(result);
      } catch (error) {
        if (error instanceof DivisionByZeroError) throw error;
        // Not a valid math expression, continue with normal resolution
        mathError = error;
      }
    }

    const allowUndefined = node.defaultValue !== undefined;
    let value: TemplateValue = null;
    let lookupError: unknown = null;
    try {
      value = this.resolveNestedPath(node.path, allowUndefined);
    } catch (error) {
      lookupError = error;
    }
    // A malformed math text is an error only when no variable has that name
    if (mathError instanceof MathSyntaxError && !this.hasRootKey(node.path[0])) {
      throw mathError;
    }
    if (lookupError !== null) throw lookupError;

    // Apply default operator if value is falsy
    if (node.defaultValue !== undefined && !isTruthy(value)) {
      value = node.defaultValue;
    }

    // Apply filters
    if (node.filters && node.filters.length > 0) {
      for (const filter of node.filters) {
        // text filters would turn an unprintable value into ""
        if (!KEEPS_RAW_INPUT.has(filter.name)) this.valueToString(value);
        value = applyFilters(value, [filter]) as TemplateValue;
      }
    }

    return this.valueToString(value);
  }

  /**
   * Visit IF node
   */
  private visitIf(node: IfNode): string {
    let branch = node;
    for (;;) {
      const current = branch;
      const result = this.at(current, () =>
        evaluateCondition(current.condition, this.scope)
      );
      if (result) return this.visitBody(current.consequent);

      const { alternate } = current;
      if (!alternate) return "";
      if (Array.isArray(alternate)) return this.visitBody(alternate);
      branch = alternate;
    }
  }

  private visitBody(nodes: ASTNode[]): string {
    return nodes.map((child) => this.visit(child)).join("");
  }

  /**
   * Visit CASE node
   */
  private visitCase(node: CaseNode): string {
    const valueStr = this.at(node, () =>
      this.valueToString(this.resolveNestedPath(node.expression.split(".")))
    );

    // Check WHEN clauses
    for (const whenNode of node.cases) {
      const matches = this.at(whenNode, () =>
        evaluateWhen(whenNode.match, valueStr, (path) =>
          this.valueToString(this.resolveNestedPath(path))
        )
      );
      if (matches) {
        return whenNode.body.map((child) => this.visit(child)).join("");
      }
    }

    // Fall to DEFAULT
    if (node.default) {
      return node.default.body.map((child) => this.visit(child)).join("");
    }

    return "";
  }

  /**
   * Visit FOR loop
   */
  private visitFor(node: ForNode): string {
    const results: string[] = [];
    this.runLoop(node, false, (nodes) => {
      const output = this.visitBody(nodes);
      results.push(output);
      return output.length;
    });
    return results.join("");
  }

  /**
   * The one loop runner behind FOR and the rows a TABLE builds with FOR.
   * renderBranch renders a body (the loop body per item, then the ELSE body
   * when no item rendered) and returns the characters it added.
   * A TABLE keeps its legacy rule: a non-iterable value is no rows, no error.
   */
  private runLoop(
    node: ForNode,
    silentNonIterable: boolean,
    renderBranch: (nodes: ASTNode[]) => number
  ): void {
    const iterable = this.at(node, () => this.resolveNestedPath(node.iterable));
    const array = tryCoerceToArray(iterable);
    if (array === null && this.strictMode && !silentNonIterable) {
      throw new TypeError(
        `Cannot iterate over non-array value: ${describeValue(iterable)}`,
        node.line,
        node.column,
        "Ensure the value is an array or can be coerced to one"
      );
    }

    const limit = this.at(node, () => this.readWindow(node.limit, "limit"));
    const offset = this.at(node, () => this.readWindow(node.offset, "offset"));
    const start = offset ?? 0;
    const items = array
      ? array.slice(start, limit === undefined ? undefined : start + limit)
      : [];

    let length = 0;
    if (items.length > 0) {
      const outer = this.scope;
      const frame = new Frame(outer);
      this.scope = frame;
      try {
        for (let i = 0; i < items.length; i++) {
          this.countIteration(node);
          frame.set(node.itemName, items[i]);
          frame.set("@index0", i);
          frame.set("@index1", i + 1);
          frame.set("@first", i === 0);
          frame.set("@last", i === items.length - 1);
          frame.set("@notFirst", i !== 0);
          frame.set("@notLast", i !== items.length - 1);
          frame.set("@total", items.length);

          length += renderBranch(node.body);
          this.checkOutputLength(length, node);
        }
      } finally {
        this.scope = outer;
      }
    } else if (node.elseBody) {
      length += renderBranch(node.elseBody);
      this.checkOutputLength(length, node);
    }
  }

  /**
   * Read a limit or offset: a number or a variable path read in the scope
   * outside the loop. A missing value is an error in strict mode and an
   * ignored argument in lenient mode; undefined means no such argument.
   */
  private readWindow(
    arg: ForWindowArg | undefined,
    name: "limit" | "offset"
  ): number | undefined {
    if (!arg) return undefined;
    let value: TemplateValue;
    if (arg.kind === "literal") {
      value = arg.value;
    } else {
      value = this.resolveNestedPath(arg.path, true);
      if (value == null) {
        if (!this.strictMode) return undefined;
        throw new MissingVariableError(
          arg.path.join("."),
          1,
          1,
          this.root.names(),
          subtractionHint(arg.path[0])
        );
      }
    }

    const number = windowNumber(value);
    if (number === null) {
      throw new TypeError(
        `${name} must be a whole number of 0 or more, got ${describeValue(value)}`,
        1,
        1,
        `Give ${name}= a whole number or a variable that holds one`
      );
    }
    return number;
  }

  /**
   * Visit SECTION: the heading, a blank line and the body without its
   * leading and trailing blank lines; nothing when the body is blank and
   * skipEmpty is set
   */
  private visitSection(node: SectionNode): string {
    const title = this.at(node, () => this.sectionTitle(node));
    const heading = `${"#".repeat(node.level)} ${title}\n`;
    const body = node.body
      .map((child) => this.visit(child))
      .join("")
      .replace(/\r\n/g, "\n");

    if (body.trim() === "") {
      if (!node.skipEmpty) return heading;
      this.omittedSections++;
      return "";
    }
    const trimmed = body
      .replace(/^([ \t]*\n)+/, "")
      .replace(/(\n[ \t]*)+$/, "");
    return `${heading}\n${trimmed}\n`;
  }

  private sectionTitle(node: SectionNode): string {
    if (node.title.kind === "literal") return node.title.text;
    const value = this.resolveNestedPath(node.title.path);
    if (typeof value !== "string" || value === "") {
      throw new TypeError(
        `SECTION title must be a non-empty string, got ${describeValue(value)}`,
        node.line,
        node.column,
        "Map the title variable to a non-empty string"
      );
    }
    return value;
  }

  /**
   * Visit FENCE: the rendered body in a code fence sized to it
   */
  private visitFence(node: FenceNode): string {
    const lang = this.at(node, () => {
      const value = this.fenceLang(node);
      checkFenceLang(value);
      return value;
    });
    const body = node.body.map((child) => this.visit(child)).join("");
    return fenced(body, lang);
  }

  /**
   * The FENCE language; a missing, null or empty value gives a bare fence
   */
  private fenceLang(node: FenceNode): string {
    if (node.lang === null) return "";
    if (node.lang.kind === "literal") return node.lang.text;
    const value = this.resolveNestedPath(node.lang.path, true);
    if (value == null) return "";
    if (typeof value !== "string") {
      throw new TypeError(
        `FENCE lang must be a string, got ${describeValue(value)}`,
        node.line,
        node.column,
        "Map the lang variable to a string"
      );
    }
    return value;
  }

  /**
   * Visit LIST node
   */
  private visitList(node: ListNode, depth = 0): string {
    const indent = "   ".repeat(depth); // 3 spaces per level
    let counter = 1;
    const results: string[] = [];

    for (const item of node.items) {
      const output = this.visitListItem(item, counter, depth);
      if (output !== null) {
        results.push(`${indent}${counter}. ${output}`);
        counter++;
      }
    }

    return results.join("\n");
  }

  /**
   * Visit LIST_ITEM node
   */
  private visitListItem(
    node: ListItemNode,
    counter: number,
    depth: number
  ): string | null {
    // Check condition
    if (node.condition) {
      const condition = node.condition;
      const result = this.at(node, () =>
        evaluateCondition(condition, this.scope)
      );
      if (!result) {
        // Show fallback if provided
        return node.fallback || null;
      }
    }

    // Render content
    let content = "";
    for (const child of node.content) {
      if (child.type === "List") {
        // Nested list
        content += "\n" + this.visitList(child as ListNode, depth + 1);
      } else {
        content += this.visit(child);
      }
    }

    return content.trim();
  }

  /**
   * Visit TABLE node
   */
  private visitTable(node: TableNode): string {
    const rows: string[][] = [];

    // Process header
    if (node.header) {
      const headerCells = this.processCellsArray(node.header.cells);
      rows.push(headerCells);
    }

    // Process rows (may include FOR loops)
    for (const rowNode of node.rows) {
      // Check if this row contains a FOR loop
      if (
        rowNode.cells.length === 1 &&
        rowNode.cells[0].length === 1 &&
        rowNode.cells[0][0].type === "For"
      ) {
        const forNode = rowNode.cells[0][0] as ForNode;

        // Generate rows with the loop runner
        this.runLoop(forNode, true, (nodes) => this.tableRowsFrom(nodes, rows));
      } else {
        // Regular row - process all cells
        const cells = this.processCellsArray(rowNode.cells);
        rows.push(cells);
      }
    }

    // Auto-pad rows to match header length
    const maxCols = Math.max(...rows.map((r) => r.length));
    rows.forEach((row) => {
      while (row.length < maxCols) {
        row.push("");
      }
    });

    // Build markdown table
    const lines: string[] = [];

    // Header row
    if (node.hasHeader && rows.length > 0) {
      const headerRow = rows[0];
      lines.push(`| ${headerRow.join(" | ")} |`);

      // Separator row with alignment
      const separators = headerRow.map((cell, idx) => {
        const align = node.alignment?.[idx] || "left";
        // choose width at least 5 or cell length + 2 padding
        const width = Math.max(5, String(cell).length);
        const hyphens = "-".repeat(width);
        switch (align) {
          case "center":
            return `:${hyphens}:`;
          case "right":
            return `${hyphens}:`;
          default:
            return `:${hyphens}`;
        }
      });
      lines.push(`|${separators.join("|")}|`);

      // Data rows
      for (let i = 1; i < rows.length; i++) {
        lines.push(`| ${rows[i].join(" | ")} |`);
      }
    } else {
      // No header - just rows
      for (const row of rows) {
        lines.push(`| ${row.join(" | ")} |`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Render the nodes of a FOR body in a TABLE into rows: a ROW node gives its
   * cells, and a run of other nodes is rendered together and split on a pipe.
   * Returns the characters the rows hold.
   */
  private tableRowsFrom(nodes: ASTNode[], rows: string[][]): number {
    let length = 0;
    const add = (cells: string[]): void => {
      rows.push(cells);
      length += cells.reduce((sum, cell) => sum + cell.length, 0);
    };

    const addText = (text: string): void => {
      if (text.trim()) {
        add(text.split("|").map((cell) => cell.trim()));
      }
    };
    const inline = ["Text", "Variable", "Ternary", "Comment"];
    let run: ASTNode[] = [];
    const flush = (): void => {
      if (run.length === 1) {
        addText(this.visit(run[0]));
      } else if (run.length > 1) {
        const text = run.map((node) => this.visit(node)).join("");
        for (const line of text.split(/\r?\n/)) addText(line);
      }
      run = [];
    };
    for (const bodyNode of nodes) {
      if (bodyNode.type === "TableRow") {
        flush();
        add(this.processCellsArray((bodyNode as TableRowNode).cells));
      } else if (inline.includes(bodyNode.type)) {
        run.push(bodyNode);
      } else {
        flush();
        addText(this.visit(bodyNode));
      }
    }
    flush();
    return length;
  }

  /**
   * Process cells array where each cell is an array of AST nodes
   * Returns an array of strings, one per cell
   */
  private processCellsArray(cells: ASTNode[][]): string[] {
    return cells.map((cellNodes) => {
      const content = cellNodes.map((node) => this.visit(node)).join("");
      return content.replace(/\r?\n/g, " ").replace(/(?<!\\)\|/g, "\\|").trim();
    });
  }

  /**
   * Visit TERNARY node
   */
  private visitTernary(node: TernaryNode): string {
    const result = evaluateCondition(node.condition, this.scope);

    if (result) {
      return this.resolveTernaryValue(node.trueValue);
    } else {
      return this.resolveTernaryValue(node.falseValue);
    }
  }

  /**
   * Resolve ternary value (can be string literal or variable reference)
   */
  private resolveTernaryValue(value: string | TernaryNode): string {
    if (typeof value !== "string") {
      // Nested ternary
      return this.visitTernary(value);
    }

    // Check if it's a variable reference: ${{varName}}
    const varMatch = value.match(/^\$\{\{(.+?)\}\}$/);
    if (varMatch) {
      const path = varMatch[1].split(".");
      const resolved = this.resolveNestedPath(path);
      return this.valueToString(resolved);
    }

    // Static string
    return value;
  }

  /**
   * Resolve nested property path with safe access
   *
   * Features:
   * - Dot notation: user.profile.name
   * - Array index: items.0
   * - JSON string auto-parsing
   * - Null safety (returns null on missing properties)
   */
  private resolveNestedPath(
    path: string[],
    allowUndefined = false
  ): TemplateValue {
    const rootKey = path[0];

    const hasKey = this.hasRootKey(rootKey);
    let current: TemplateValue = hasKey ? this.scope.get(rootKey) : undefined;

    // Missing variable (not existing key)
    if (!hasKey) {
      if (!allowUndefined && this.strictMode) {
        throw new MissingVariableError(
          rootKey,
          1,
          1,
          this.root.names(),
          subtractionHint(rootKey)
        );
      }
      return null;
    }

    // Key exists â€” even if value === undefined
    // That is allowed and should not throw.
    // Continue resolving nested keys.
    for (let i = 1; i < path.length; i++) {
      if (current == null) return null;

      if (path[i] === "length") {
        const built = builtInLength(current);
        if (built) {
          current = built.value;
          continue;
        }
      }

      // Try JSON parsing if string
      if (typeof current === "string") {
        const parsed = tryCoerceStringForPathSegment(current, path[i]);
        if (parsed) {
          current = parsed;
        } else {
          return null;
        }
      }

      // Access property
      if (typeof current === "object" && !Array.isArray(current)) {
        current = readOwn(current, path[i]);
      } else if (Array.isArray(current)) {
        const index = parseInt(path[i]);
        current = current[index];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * True when a variable or loop value holds this name, whatever its value
   */
  private hasRootKey(rootKey: string): boolean {
    return this.scope.has(rootKey);
  }

  /**
   * Convert value to string for output
   */
  private valueToString(value: TemplateValue): string {
    if (value == null) return "";
    if (tryCoerceToString(value) === null) {
      throw new TypeError(
        "Cannot print a value with no text form (a cyclic structure or a BigInt)",
        1,
        1,
        "Map the variable to text, a number or plain data without cycles"
      );
    }
    return valueToText(value);
  }
}

/**
 * The value as JSON, or its plain string form when JSON cannot hold it
 * (a cycle, a BigInt)
 */
function describeValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * A FOR window value as a number: a number, or a text holding a plain decimal
 * number, that is a whole number from 0 up to the largest safe integer; null
 * for anything else
 */
function windowNumber(value: TemplateValue): number | null {
  let number: number;
  if (typeof value === "number") {
    number = value;
  } else if (
    typeof value === "string" &&
    /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/.test(value)
  ) {
    number = Number(value);
  } else {
    return null;
  }
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
```

### core/src/parser.ts

```
import {
  Token,
  TokenType,
  ProgramNode,
  ASTNode,
  TextNode,
  VariableNode,
  IfNode,
  CaseNode,
  WhenNode,
  DefaultNode,
  ForNode,
  ForWindowArg,
  ListNode,
  ListItemNode,
  TableNode,
  TableHeaderNode,
  TableRowNode,
  CommentNode,
  SectionNode,
  SectionTitle,
  FenceNode,
  FenceLang,
  FilterCall,
  DEFAULT_LIMITS,
} from "./types";
import { SyntaxError, TypeError, LimitError } from "./errors";
import { parseFilter } from "./filters";
import { parseWhenMatch } from "./expressions";

const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;

/**
 * Parser: Builds Abstract Syntax Tree from tokens
 *
 * Uses recursive descent parsing for clean nesting support.
 */
export class Parser {
  private pos = 0;
  private depth = 0;
  private nodes = 0;
  private readonly maxDepth: number;
  private readonly maxNodes: number;

  constructor(
    private tokens: Token[],
    options?: { maxDepth?: number; maxNodes?: number }
  ) {
    this.maxDepth = options?.maxDepth ?? DEFAULT_LIMITS.maxDepth;
    this.maxNodes = options?.maxNodes ?? DEFAULT_LIMITS.maxNodes;
  }

  /**
   * Main parsing entry point
   */
  parse(): ProgramNode {
    const body: ASTNode[] = [];

    while (!this.isAtEnd()) {
      const node = this.parseNode();
      if (node) {
        body.push(node);
      }
    }

    return {
      type: "Program",
      body,
      line: 1,
      column: 1,
    };
  }

  /**
   * Parse single node
   */
  private parseNode(): ASTNode | null {
    const token = this.current();

    switch (token.type) {
      case TokenType.TEXT:
        return this.parseText();
      case TokenType.VARIABLE:
        return this.parseVariable();
      case TokenType.IF:
        return this.nested(() => this.parseIf());
      case TokenType.CASE:
        return this.nested(() => this.parseCase());
      case TokenType.FOR:
        return this.nested(() => this.parseFor());
      case TokenType.LIST:
        return this.nested(() => this.parseList());
      case TokenType.TABLE:
        return this.nested(() => this.parseTable());
      case TokenType.SECTION:
        return this.nested(() => this.parseSection());
      case TokenType.FENCE:
        return this.nested(() => this.parseFence());
      case TokenType.HEADER:
        return this.parseTableHeader();
      case TokenType.ROW:
        return this.parseTableRow();
      case TokenType.COMMENT:
        return this.parseComment();
      case TokenType.EOF:
        return null;
      default:
        throw new SyntaxError(
          `Unexpected token: ${token.type}`,
          token.line,
          token.column,
          "Check template syntax"
        );
    }
  }

  /**
   * Parse a block one level deeper, rejecting it at its opening tag when the
   * nesting would exceed maxDepth
   */
  private nested<T>(parseBlock: () => T): T {
    if (this.depth >= this.maxDepth) {
      const token = this.current();
      throw new LimitError(
        "limit-depth",
        `Block nesting exceeds the maximum depth of ${this.maxDepth}`,
        token.line,
        token.column,
        "Flatten nested blocks or raise limits.maxDepth"
      );
    }
    this.depth++;
    const node = parseBlock();
    this.depth--;
    return node;
  }

  /**
   * Parse text node
   */
  private parseText(): TextNode {
    const token = this.open(TokenType.TEXT);
    return {
      type: "Text",
      content: token.value,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse variable: ${{name}}, ${{user.name | filter}}
   */
  private parseVariable(): VariableNode {
    const token = this.open(TokenType.VARIABLE);
    const parts = this.parseVariableExpression(token.value);

    return {
      type: "Variable",
      path: parts.path,
      defaultValue: parts.defaultValue,
      filters: parts.filters,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse variable expression with filters and default operator
   * Examples:
   * - "name" â†’ { path: ["name"] }
   * - "user.name" â†’ { path: ["user", "name"] }
   * - 'name ?? "default"' â†’ { path: ["name"], defaultValue: "default" }
   * - "text | trim | head=10" â†’ { path: ["text"], filters: [...] }
   */
  private parseVariableExpression(expr: string): {
    path: string[];
    defaultValue?: string;
    filters?: FilterCall[];
  } {
    // --- 1. Split filters FIRST (pipes inside quotes belong to the default) ---
    const parts = this.splitOutsideQuotes(expr, "|").map((p) => p.trim());
    const core = parts[0];
    const filterExprs = parts.slice(1);

    // --- 2. Extract default operator (??) ---
    let pathExpr = core;
    let defaultValue: string | undefined = undefined;

    const defaultIdx = core.indexOf("??");
    if (defaultIdx !== -1) {
      pathExpr = core.slice(0, defaultIdx).trim();
      defaultValue = core
        .slice(defaultIdx + 2)
        .trim()
        .replace(/^(["'])(.*)\1$/s, "$2");
    }

    // --- 3. Parse path ---
    const path = pathExpr.split(".").map((p) => p.trim());

    // --- 4. Parse filters ---
    const filters: FilterCall[] =
      filterExprs.length > 0
        ? filterExprs.map(parseFilter)
        : [];

    return {
      path,
      defaultValue,
      filters: filters.length > 0 ? filters : undefined,
    };
  }

  /**
   * Split on a separator character, ignoring separators inside quotes.
   * A quote only opens at the start of a value, so an apostrophe inside a
   * word is plain text, and so is a quote that never closes: the split is
   * redone with that quote left out.
   */
  private splitOutsideQuotes(
    text: string,
    separator: string,
    plainQuotes: ReadonlySet<number> = new Set()
  ): string[] {
    const parts: string[] = [];
    let quote: string | null = null;
    let quoteAt = -1;
    let start = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (
        (ch === '"' || ch === "'") &&
        !plainQuotes.has(i) &&
        /(^|\?\?|=)\s*$/.test(text.slice(start, i))
      ) {
        quote = ch;
        quoteAt = i;
      } else if (ch === separator) {
        parts.push(text.slice(start, i));
        start = i + 1;
      }
    }
    if (quote) {
      return this.splitOutsideQuotes(
        text,
        separator,
        new Set(plainQuotes).add(quoteAt)
      );
    }
    parts.push(text.slice(start));
    return parts;
  }

  /**
   * Parse IF block: {{IF condition}}...{{ELSEIF}}...{{ELSE}}...{{END_IF}}
   * ELSEIF branches nest in the alternate of the branch before them and are
   * parsed in a loop, so a long chain does not deepen the call stack.
   */
  private parseIf(): IfNode {
    const root = this.parseIfBranch(TokenType.IF);
    let last = root;
    while (this.check(TokenType.ELSEIF)) {
      const branch = this.parseIfBranch(TokenType.ELSEIF);
      last.alternate = branch;
      last = branch;
    }
    if (this.check(TokenType.ELSE)) last.alternate = this.parseElse(last);

    this.consume(TokenType.END_IF);
    return root;
  }

  /**
   * Parse the head and body of an IF or ELSEIF branch, up to the next
   * ELSEIF, ELSE or END_IF
   */
  private parseIfBranch(type: TokenType.IF | TokenType.ELSEIF): IfNode {
    const token = this.open(type);
    const consequent: ASTNode[] = [];

    while (
      !this.check(TokenType.ELSEIF) &&
      !this.check(TokenType.ELSE) &&
      !this.check(TokenType.END_IF)
    ) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          type === TokenType.IF
            ? `Unclosed {{IF}} block starting at line ${token.line}`
            : "Unclosed {{ELSEIF}} block",
          token.line,
          token.column,
          "Add {{END_IF}}"
        );
      }
      const node = this.parseNode();
      if (node) consequent.push(node);
    }

    return {
      type: "If",
      condition: this.extractCondition(token.value),
      consequent,
      alternate: null,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the ELSE body of a branch, up to END_IF
   */
  private parseElse(branch: IfNode): ASTNode[] {
    this.consume(TokenType.ELSE);
    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_IF)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{ELSE}} block",
          branch.line,
          branch.column,
          "Add {{END_IF}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }
    return body;
  }

  /**
   * Parse CASE block: {{CASE var}}{{WHEN "val"}}...{{END_WHEN}}{{DEFAULT}}...{{END_CASE}}
   */
  private parseCase(): CaseNode {
    const token = this.open(TokenType.CASE);
    const expression = this.extractExpression(token.value);

    const cases: WhenNode[] = [];
    let defaultNode: DefaultNode | null = null;

    while (!this.check(TokenType.END_CASE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{CASE}} block",
          token.line,
          token.column,
          "Add {{END_CASE}}"
        );
      }

      if (this.check(TokenType.WHEN)) {
        cases.push(this.parseWhen());
      } else if (this.check(TokenType.DEFAULT)) {
        defaultNode = this.parseDefault();
      } else if (this.check(TokenType.TEXT)) {
        // Skip whitespace text between WHEN/DEFAULT blocks
        const textToken = this.current();
        if (textToken.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in CASE: "${textToken.value.trim()}"`,
            textToken.line,
            textToken.column,
            "CASE blocks should only contain {{WHEN}} and {{DEFAULT}}"
          );
        }
        this.advance(); // Skip whitespace
      } else {
        const unexpected = this.current();
        throw new SyntaxError(
          `Unexpected token in CASE: ${unexpected.type}`,
          unexpected.line,
          unexpected.column,
          "Expected {{WHEN}} or {{DEFAULT}}"
        );
      }
    }

    this.consume(TokenType.END_CASE);

    return {
      type: "Case",
      expression,
      cases,
      default: defaultNode,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse WHEN clause
   */
  private parseWhen(): WhenNode {
    const token = this.open(TokenType.WHEN);
    const match = parseWhenMatch(
      token.value.replace(/^WHEN/i, ""),
      token.line,
      token.column
    );
    const first = match.kind === "list" ? match.items[0] : null;
    const value = first?.kind === "literal" && first.quoted ? first.text : "";

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_WHEN)) {
      if (
        this.check(TokenType.WHEN) ||
        this.check(TokenType.DEFAULT) ||
        this.check(TokenType.END_CASE)
      ) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{WHEN}} block",
          token.line,
          token.column,
          "Add {{END_WHEN}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    if (this.check(TokenType.END_WHEN)) {
      this.consume(TokenType.END_WHEN);
    }

    return {
      type: "When",
      value,
      match,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse DEFAULT clause
   */
  private parseDefault(): DefaultNode {
    const token = this.open(TokenType.DEFAULT);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_DEFAULT)) {
      if (this.check(TokenType.END_CASE)) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{DEFAULT}} block",
          token.line,
          token.column,
          "Add {{END_DEFAULT}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    if (this.check(TokenType.END_DEFAULT)) {
      this.consume(TokenType.END_DEFAULT);
    }

    return {
      type: "Default",
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse FOR loop: {{FOR items AS item [limit=N] [offset=N]}}...{{ELSE}}...{{END_FOR}}
   * An {{ELSE}} directly in the body starts the branch that renders when no
   * item does; an IF inside the body parses its own ELSE.
   */
  private parseFor(): ForNode {
    const token = this.open(TokenType.FOR);
    const header = this.parseForHeader(token);

    const body: ASTNode[] = [];
    let elseBody: ASTNode[] | undefined;
    while (!this.check(TokenType.END_FOR)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{FOR}} block",
          token.line,
          token.column,
          "Add {{END_FOR}}"
        );
      }
      if (this.check(TokenType.ELSE)) {
        const elseToken = this.advance();
        if (elseBody !== undefined) {
          throw new SyntaxError(
            "A {{FOR}} block takes one {{ELSE}}",
            elseToken.line,
            elseToken.column,
            "Remove the second {{ELSE}}"
          );
        }
        elseBody = [];
        continue;
      }
      const node = this.parseNode();
      if (node) (elseBody ?? body).push(node);
    }

    this.consume(TokenType.END_FOR);

    const node: ForNode = {
      type: "For",
      iterable: header.iterable,
      itemName: header.itemName,
      body,
      line: token.line,
      column: token.column,
    };
    if (header.limit) node.limit = header.limit;
    if (header.offset) node.offset = header.offset;
    if (elseBody) node.elseBody = elseBody;
    return node;
  }

  /**
   * Parse the FOR tag word by word: "FOR items AS item limit=2 offset=n".
   * Every problem is a syntax error at the tag.
   */
  private parseForHeader(token: Token): {
    iterable: string[];
    itemName: string;
    limit?: ForWindowArg;
    offset?: ForWindowArg;
  } {
    const fail = (why: string): never => {
      throw new SyntaxError(
        `Invalid FOR syntax: ${why}`,
        token.line,
        token.column,
        "Expected: {{FOR items AS item}} with optional limit=N and offset=N"
      );
    };

    const match = /^FOR\s+(.+?)\s+AS(?:\s+(.*))?$/is.exec(token.value.trim());
    const rest = match?.[2]?.trim();
    if (!match || !rest) return fail(token.value);
    const words = rest.split(/\s+/);
    const itemName = words[0];
    if (!/^\w+$/.test(itemName)) fail(`bad item name "${itemName}"`);

    const iterable = match[1].split(".").map((p) => p.trim());
    const result: {
      iterable: string[];
      itemName: string;
      limit?: ForWindowArg;
      offset?: ForWindowArg;
    } = { iterable, itemName };

    for (const word of words.slice(1)) {
      const argument = /^(limit|offset)=(.+)$/.exec(word);
      if (!argument) fail(`unexpected "${word}"`);
      const [, key, written] = argument as RegExpExecArray;
      const name = key as "limit" | "offset";
      if (result[name]) fail(`${name} is given twice`);
      if (/^[+-]?\d+(\.\d+)?$/.test(written)) {
        result[name] = { kind: "literal", value: Number(written) };
      } else if (VARIABLE_PATH.test(written)) {
        result[name] = { kind: "path", path: written.split(".") };
      } else {
        fail(`bad ${name} value "${written}"`);
      }
    }
    return result;
  }

  /**
   * Parse SECTION: {{SECTION "Title" level=2 skip_empty=false}}...{{END_SECTION}}
   */
  private parseSection(): SectionNode {
    const token = this.open(TokenType.SECTION);
    const { title, level, skipEmpty } = this.parseSectionArguments(token);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_SECTION)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{SECTION}} block",
          token.line,
          token.column,
          "Add {{END_SECTION}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    this.consume(TokenType.END_SECTION);

    return {
      type: "Section",
      title,
      level,
      skipEmpty,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the SECTION title (quoted string or variable path) and its
   * level and skip_empty options
   */
  private parseSectionArguments(token: Token): {
    title: SectionTitle;
    level: number;
    skipEmpty: boolean;
  } {
    const typeError = (message: string, suggestion: string) =>
      new TypeError(message, token.line, token.column, suggestion);
    const syntaxError = (message: string) =>
      new SyntaxError(
        message,
        token.line,
        token.column,
        'Expected: {{SECTION "Title" level=2 skip_empty=true}}'
      );

    let title: SectionTitle | null = null;
    let level = 2;
    let skipEmpty = true;
    const args = token.value.slice("SECTION".length);

    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
      if (key === "level") {
        if (!/^[+-]?\d+$/.test(value)) {
          throw typeError(
            `SECTION level must be an integer, got ${value}`,
            "Use level=1 through level=6"
          );
        }
        level = Math.min(6, Math.max(1, Number(value)));
      } else if (key === "skip_empty") {
        if (value !== "true" && value !== "false") {
          throw typeError(
            `SECTION skip_empty must be true or false, got ${value}`,
            "Use skip_empty=true or skip_empty=false"
          );
        }
        skipEmpty = value === "true";
      } else if (key !== undefined) {
        throw syntaxError(`Unknown SECTION option: ${key}`);
      } else if (title !== null) {
        throw syntaxError(`Unexpected SECTION argument: ${argument}`);
      } else if (/^(["']).*\1$/.test(argument)) {
        title = { kind: "literal", text: argument.slice(1, -1) };
      } else if (VARIABLE_PATH.test(argument)) {
        title = { kind: "path", path: argument.split(".") };
      } else {
        throw syntaxError(`Invalid SECTION title: ${argument}`);
      }
    }

    if (title === null || (title.kind === "literal" && title.text === "")) {
      throw typeError(
        "SECTION needs a non-empty title",
        'Give a quoted title or a variable path: {{SECTION "Title"}}'
      );
    }
    return { title, level, skipEmpty };
  }

  /**
   * Parse FENCE: {{FENCE lang="md"}}...{{END_FENCE}}
   */
  private parseFence(): FenceNode {
    const token = this.open(TokenType.FENCE);
    const lang = this.parseFenceLang(token);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_FENCE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{FENCE}} block",
          token.line,
          token.column,
          "Add {{END_FENCE}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    this.consume(TokenType.END_FENCE);

    return {
      type: "Fence",
      lang,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the optional FENCE lang option: a quoted string or a variable path
   */
  private parseFenceLang(token: Token): FenceLang | null {
    const syntaxError = (message: string) =>
      new SyntaxError(
        message,
        token.line,
        token.column,
        'Expected: {{FENCE lang="markdown"}} or {{FENCE lang=path.to.lang}}'
      );

    let lang: FenceLang | null = null;
    const args = token.value.slice("FENCE".length);

    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
      if (key !== "lang") {
        throw syntaxError(
          key === undefined
            ? `Unexpected FENCE argument: ${argument}`
            : `Unknown FENCE option: ${key}`
        );
      }
      if (/^(["']).*\1$/.test(value)) {
        lang = { kind: "literal", text: value.slice(1, -1) };
      } else if (VARIABLE_PATH.test(value)) {
        lang = { kind: "path", path: value.split(".") };
      } else {
        throw syntaxError(`Invalid FENCE lang: ${value}`);
      }
    }
    return lang;
  }

  /**
   * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
   */
  private parseList(): ListNode {
    const token = this.open(TokenType.LIST);
    const items: ListItemNode[] = [];

    while (!this.check(TokenType.END_LIST)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{LIST}} block",
          token.line,
          token.column,
          "Add {{END_LIST}}"
        );
      }

      if (this.check(TokenType.LIST_ITEM)) {
        items.push(this.parseListItem());
      } else if (this.check(TokenType.TEXT)) {
        // Skip whitespace text between list items
        const textToken = this.current();
        if (textToken.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in LIST: "${textToken.value.trim()}"`,
            textToken.line,
            textToken.column,
            "LIST should only contain {{LIST_ITEM}}"
          );
        }
        this.advance(); // Skip whitespace
      } else {
        const unexpected = this.current();
        throw new SyntaxError(
          `Unexpected token in LIST: ${unexpected.type}`,
          unexpected.line,
          unexpected.column,
          "Expected {{LIST_ITEM}}"
        );
      }
    }

    this.consume(TokenType.END_LIST);

    return {
      type: "List",
      items,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse LIST_ITEM
   */
  private parseListItem(): ListItemNode {
    const token = this.open(TokenType.LIST_ITEM);

    // Parse optional condition and fallback
    const { condition, fallback } = this.parseListItemAttributes(token.value);

    const content: ASTNode[] = [];
    while (!this.check(TokenType.END_LIST_ITEM)) {
      if (this.check(TokenType.LIST_ITEM) || this.check(TokenType.END_LIST)) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{LIST_ITEM}} block",
          token.line,
          token.column,
          "Add {{END_LIST_ITEM}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_LIST_ITEM)) {
      this.consume(TokenType.END_LIST_ITEM);
    }

    return {
      type: "ListItem",
      content,
      condition,
      fallback,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse LIST_ITEM attributes: {{LIST_ITEM condition | fallback="text"}}
   */
  private parseListItemAttributes(expr: string): {
    condition?: string;
    fallback?: string;
  } {
    const afterKeyword = expr.replace(/^LIST_ITEM\s*/, "").trim();
    if (!afterKeyword) return {};

    const parts = afterKeyword.split("|");
    const condition = parts[0]?.trim();
    const fallbackMatch = parts[1]?.match(/fallback\s*=\s*["'](.+?)["']/);
    const fallback = fallbackMatch?.[1];

    return { condition: condition || undefined, fallback };
  }

  /**
   * Parse TABLE: {{TABLE}}{{HEADER}}...{{ROW}}...{{END_TABLE}}
   */
  private parseTable(): TableNode {
    const token = this.open(TokenType.TABLE);
    const alignment = this.parseTableAlignment(token.value);

    let header: TableHeaderNode | null = null;
    const rows: TableRowNode[] = [];

    while (!this.check(TokenType.END_TABLE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{TABLE}} block",
          token.line,
          token.column,
          "Add {{END_TABLE}}"
        );
      }

      if (this.check(TokenType.HEADER)) {
        header = this.parseTableHeader();
      } else if (this.check(TokenType.ROW)) {
        rows.push(this.parseTableRow());
      } else if (this.check(TokenType.FOR)) {
        // Allow FOR loops to generate rows
        this.count(this.current());
        const forNode = this.nested(() => this.parseFor());

        // Wrap in a special TableRowNode
        rows.push({
          type: "TableRow",
          cells: [[forNode]],
          line: forNode.line,
          column: forNode.column,
        });
      } else if (this.check(TokenType.TEXT)) {
        // Skip whitespace text between rows
        const textToken = this.current();
        if (textToken.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in TABLE: "${textToken.value.trim()}"`,
            textToken.line,
            textToken.column,
            "TABLE should only contain {{HEADER}}, {{ROW}}, or {{FOR}}"
          );
        }
        this.advance(); // Skip whitespace
      } else {
        const unexpected = this.current();
        throw new SyntaxError(
          `Unexpected token in TABLE: ${unexpected.type}`,
          unexpected.line,
          unexpected.column,
          "Expected {{HEADER}}, {{ROW}}, or {{FOR}}"
        );
      }
    }

    this.consume(TokenType.END_TABLE);

    return {
      type: "Table",
      header,
      rows,
      hasHeader: header !== null,
      alignment,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse table alignment: {{TABLE align="left|center|right"}}
   */
  private parseTableAlignment(expr: string): string[] | undefined {
    const match = expr.match(/align\s*=\s*["'](.+?)["']/);
    if (!match) return undefined;

    return match[1].split("|").map((a) => a.trim());
  }

  /**
   * Parse table header
   */
  private parseTableHeader(): TableHeaderNode {
    const token = this.open(TokenType.HEADER);

    const content: ASTNode[] = [];

    while (!this.check(TokenType.END_HEADER)) {
      if (this.check(TokenType.END_TABLE)) break;
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{HEADER}} block",
          token.line,
          token.column,
          "Add {{END_HEADER}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_HEADER)) this.consume(TokenType.END_HEADER);
    const cells = this.splitCells(content);

    return {
      type: "Header",
      cells,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse table row
   */
  private parseTableRow(): TableRowNode {
    const token = this.open(TokenType.ROW);

    const content: ASTNode[] = [];

    while (!this.check(TokenType.END_ROW)) {
      if (this.check(TokenType.ROW) || this.check(TokenType.END_TABLE)) break;
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{ROW}} block",
          token.line,
          token.column,
          "Add {{END_ROW}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_ROW)) this.consume(TokenType.END_ROW);

    // --- NEW: split at "|" ---
    const cells = this.splitCells(content);

    return {
      type: "TableRow",
      cells,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Split AST nodes into cells by pipe character
   * Handles text nodes containing pipes by splitting them
   */
  private splitCells(nodes: ASTNode[]): ASTNode[][] {
    const cells: ASTNode[][] = [[]];

    for (const node of nodes) {
      if (node.type === "Text") {
        const textNode = node as TextNode;
        const content = textNode.content;

        // Check if this text node contains pipe(s)
        if (content.includes("|")) {
          const parts = content.split("|");

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Add text content to current cell if non-empty
            if (part !== "") {
              cells[cells.length - 1].push({
                type: "Text",
                content: part,
                line: textNode.line,
                column: textNode.column,
              } as TextNode);
            }

            // Start new cell after each pipe (except after last part)
            if (i < parts.length - 1) {
              cells.push([]);
            }
          }
        } else {
          // No pipe - add entire text node to current cell
          cells[cells.length - 1].push(node);
        }
      } else {
        // Non-text node - add to current cell
        cells[cells.length - 1].push(node);
      }
    }

    return cells;
  }

  /**
   * Parse comment (excluded from output)
   */
  private parseComment(): CommentNode {
    const token = this.open(TokenType.COMMENT);
    return {
      type: "Comment",
      content: token.value,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Extract condition from IF or ELSEIF token: "IF show" -> "show", "ELSEIF b" -> "b"
   */
  private extractCondition(expr: string): string {
    return expr.replace(/^(ELSE)?IF\s+/i, "").trim();
  }

  /**
   * Extract expression from CASE token: "CASE status" â†’ "status"
   */
  private extractExpression(expr: string): string {
    return expr.replace(/^CASE\s+/i, "").trim();
  }

  // ==================== Token Stream Helpers ====================

  /**
   * Get current token without advancing
   */
  private current(): Token {
    return this.tokens[this.pos];
  }

  /**
   * Check if current token matches type
   */
  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.current().type === type;
  }

  /**
   * Advance to next token and return previous
   */
  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  }

  /**
   * Consume the opening token of a node, counting the node against maxNodes
   */
  private open(type: TokenType): Token {
    const token = this.consume(type);
    this.count(token);
    return token;
  }

  /**
   * Count one node, failing at its opening token once maxNodes is crossed
   */
  private count(token: Token): void {
    if (++this.nodes <= this.maxNodes) return;
    throw new LimitError(
      "limit-nodes",
      `Template exceeds the maximum of ${this.maxNodes} nodes`,
      token.line,
      token.column,
      "Shorten the template or raise limits.maxNodes"
    );
  }

  /**
   * Consume expected token type or throw error
   */
  private consume(type: TokenType): Token {
    if (this.check(type)) return this.advance();

    const token = this.current();
    throw new SyntaxError(
      `Expected ${type}, got ${token.type}`,
      token.line,
      token.column,
      `Check template syntax near line ${token.line}`
    );
  }

  /**
   * Check if we've reached EOF
   */
  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }
}
```

### core/src/analyze.ts

```
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { FILTER_REGISTRY, undeclaredParameterMessages } from "./filters";
import {
  conditionOperands,
  hasBareWhitespace,
  isMathExpression,
  mathVariableNames,
  parseLiteral,
} from "./expressions";
import {
  ASTNode,
  CaseNode,
  FenceNode,
  ForNode,
  IfNode,
  Limits,
  ListItemNode,
  ListNode,
  SectionNode,
  TableHeaderNode,
  TableNode,
  TableRowNode,
  VariableNode,
} from "./types";

export type UsageKind =
  | "output"
  | "if"
  | "elseif"
  | "case"
  | "for"
  | "list_item"
  | "table";

export interface VariableUsage {
  /** Root name, the part before the first dot */
  name: string;
  /** Distinct full paths read, in source order */
  paths: string[];
  /** Distinct constructs that read it, in source order */
  usedIn: UsageKind[];
  /** True when every read supplies a ?? default */
  optional: boolean;
  /** True when some read has no ?? default; always !optional */
  required: boolean;
}

export interface FilterUsage {
  name: string;
  count: number;
}

export interface AnalysisDiagnostic {
  code: string;
  message: string;
  line: number;
  column: number;
}

export type BlockKind =
  | "IF"
  | "CASE"
  | "FOR"
  | "LIST"
  | "TABLE"
  | "SECTION"
  | "FENCE";

export interface TemplateAnalysis {
  variables: VariableUsage[];
  filters: FilterUsage[];
  /** Count per block kind present in the template */
  blocks: Partial<Record<BlockKind, number>>;
  diagnostics: AnalysisDiagnostic[];
}

/** Nesting bound for analyze when the caller sets no maxDepth */
const ANALYZE_MAX_DEPTH = 256;

/**
 * Report the variables a template reads and the filters it applies, derived
 * from the parsed template. Loop item names (inside their loop) and
 * @-metadata are not inputs.
 */
export function analyze(
  template: string,
  options?: { limits?: Partial<Limits> }
): TemplateAnalysis {
  const ast = new Parser(new Lexer(template).tokenize(), {
    maxDepth: options?.limits?.maxDepth ?? ANALYZE_MAX_DEPTH,
    maxNodes: options?.limits?.maxNodes,
  }).parse();
  const walker = new Walker();
  walker.visitAll(ast.body);
  return walker.result();
}

interface Entry {
  paths: Set<string>;
  usedIn: Set<UsageKind>;
  allOptional: boolean;
}

class Walker {
  private entries = new Map<string, Entry>();
  private filterCounts = new Map<string, number>();
  private blocks: Partial<Record<BlockKind, number>> = {};
  private diagnostics: AnalysisDiagnostic[] = [];
  private scopes: string[] = [];
  private tableDepth = 0;

  result(): TemplateAnalysis {
    return {
      variables: Array.from(this.entries, ([name, entry]) => ({
        name,
        paths: Array.from(entry.paths),
        usedIn: Array.from(entry.usedIn),
        optional: entry.allOptional,
        required: !entry.allOptional,
      })),
      filters: Array.from(this.filterCounts, ([name, count]) => ({
        name,
        count,
      })),
      blocks: this.blocks,
      diagnostics: this.diagnostics,
    };
  }

  visitAll(nodes: ASTNode[]): void {
    for (const node of nodes) this.visit(node);
  }

  private visit(node: ASTNode): void {
    switch (node.type) {
      case "Variable":
        return this.visitVariable(node as VariableNode);
      case "If":
        this.countBlock("IF");
        return this.visitIf(node as IfNode, "if");
      case "Case":
        this.countBlock("CASE");
        return this.visitCase(node as CaseNode);
      case "For":
        this.countBlock("FOR");
        return this.visitFor(node as ForNode);
      case "List":
        this.countBlock("LIST");
        return (node as ListNode).items.forEach((i) => this.visitListItem(i));
      case "Table":
        this.countBlock("TABLE");
        return this.visitTable(node as TableNode);
      case "Section":
        this.countBlock("SECTION");
        return this.visitSection(node as SectionNode);
      case "Fence":
        this.countBlock("FENCE");
        return this.visitFence(node as FenceNode);
      case "Header":
      case "TableRow":
        return this.visitCells(node as TableHeaderNode | TableRowNode);
    }
  }

  private countBlock(kind: BlockKind): void {
    this.blocks[kind] = (this.blocks[kind] ?? 0) + 1;
  }

  private visitVariable(node: VariableNode): void {
    const kind: UsageKind = this.tableDepth > 0 ? "table" : "output";
    const text = node.path.join(".");

    if (isMathExpression(text)) {
      for (const name of mathVariableNames(text)) this.record(name, kind, false);
    } else {
      this.record(text, kind, node.defaultValue !== undefined);
    }

    for (const filter of node.filters ?? []) {
      const { name } = filter;
      this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
      const definition = FILTER_REGISTRY.find((f) => f.name === name);
      if (!definition) {
        this.diagnostics.push({
          code: "unknown-filter",
          message: `Unknown filter: ${name}`,
          line: node.line,
          column: node.column,
        });
        continue;
      }
      for (const message of undeclaredParameterMessages(definition, filter)) {
        this.diagnostics.push({
          code: "type-error",
          message,
          line: node.line,
          column: node.column,
        });
      }
    }
  }

  private visitIf(node: IfNode, kind: "if" | "elseif"): void {
    let branch = node;
    let branchKind = kind;
    for (;;) {
      this.visitCondition(branch.condition, branchKind, branch);
      this.visitAll(branch.consequent);
      const { alternate } = branch;
      if (Array.isArray(alternate)) return this.visitAll(alternate);
      if (!alternate) return;
      branch = alternate;
      branchKind = "elseif";
    }
  }

  private visitCase(node: CaseNode): void {
    this.record(node.expression, "case", false);
    for (const when of node.cases) {
      const { match } = when;
      const items = match.kind === "list" ? match.items : [match.item];
      for (const item of items) {
        if (item.kind === "path") this.record(item.path.join("."), "case", false);
      }
      this.visitAll(when.body);
    }
    if (node.default) this.visitAll(node.default.body);
  }

  private visitFor(node: ForNode): void {
    this.record(node.iterable.join("."), "for", false);
    for (const arg of [node.limit, node.offset]) {
      if (arg?.kind === "path") this.record(arg.path.join("."), "for", false);
    }
    this.scopes.push(node.itemName);
    this.visitAll(node.body);
    this.scopes.pop();
    if (node.elseBody) this.visitAll(node.elseBody);
  }

  private visitSection(node: SectionNode): void {
    if (node.title.kind === "path") {
      this.record(node.title.path.join("."), "output", false);
    }
    this.visitAll(node.body);
  }

  private visitFence(node: FenceNode): void {
    if (node.lang?.kind === "path") {
      this.record(node.lang.path.join("."), "output", true);
    }
    this.visitAll(node.body);
  }

  private visitListItem(node: ListItemNode): void {
    if (node.condition) this.visitCondition(node.condition, "list_item", node);
    this.visitAll(node.content);
  }

  private visitTable(node: TableNode): void {
    if (node.header) this.visitCells(node.header);
    for (const row of node.rows) this.visitCells(row);
  }

  private visitCells(node: TableHeaderNode | TableRowNode): void {
    this.tableDepth++;
    for (const cell of node.cells) this.visitAll(cell);
    this.tableDepth--;
  }

  private visitCondition(
    condition: string,
    kind: UsageKind,
    at: ASTNode
  ): void {
    for (const operand of conditionOperands(condition)) {
      if (operand === "" || parseLiteral(operand) !== null) continue;
      if (hasBareWhitespace(operand)) {
        this.diagnostics.push({
          code: "unrecognized-condition",
          message: `Unrecognized condition: ${operand}`,
          line: at.line,
          column: at.column,
        });
        continue;
      }
      this.record(operand, kind, false);
    }
  }

  private record(path: string, kind: UsageKind, optional: boolean): void {
    const root = path.split(".")[0];
    if (root.startsWith("@") || this.scopes.includes(root)) return;

    let entry = this.entries.get(root);
    if (!entry) {
      entry = { paths: new Set(), usedIn: new Set(), allOptional: true };
      this.entries.set(root, entry);
    }
    entry.paths.add(path);
    entry.usedIn.add(kind);
    if (!optional) entry.allOptional = false;
  }
}
```

### core/src/types.ts

```
/**
 * Template value type - supports primitives, arrays, objects, and nested structures
 * Matches JSON structure for LLM output compatibility
 */
export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TemplateValue[]
  | { [key: string]: TemplateValue };

/**
 * Map of variable names to their values
 */
export type VariableMap = Map<string, TemplateValue>;

/**
 * Read-only variable lookup; a Map satisfies it, and so does a loop frame
 * over a parent lookup
 */
export interface VariableLookup {
  has(name: string): boolean;
  get(name: string): TemplateValue | undefined;
}

/**
 * Filter call structure
 */
export interface FilterCall {
  name: string;
  params: Record<string, string>;
}

/**
 * Token types for lexer
 */
export enum TokenType {
  TEXT = "TEXT",
  VARIABLE = "VARIABLE",
  IF = "IF",
  ELSEIF = "ELSEIF",
  ELSE = "ELSE",
  END_IF = "END_IF",
  CASE = "CASE",
  WHEN = "WHEN",
  END_WHEN = "END_WHEN",
  DEFAULT = "DEFAULT",
  END_DEFAULT = "END_DEFAULT",
  END_CASE = "END_CASE",
  FOR = "FOR",
  END_FOR = "END_FOR",
  LIST = "LIST",
  LIST_ITEM = "LIST_ITEM",
  END_LIST_ITEM = "END_LIST_ITEM",
  END_LIST = "END_LIST",
  TABLE = "TABLE",
  HEADER = "HEADER",
  END_HEADER = "END_HEADER",
  ROW = "ROW",
  END_ROW = "END_ROW",
  END_TABLE = "END_TABLE",
  RAW = "RAW",
  END_RAW = "END_RAW",
  SECTION = "SECTION",
  END_SECTION = "END_SECTION",
  FENCE = "FENCE",
  END_FENCE = "END_FENCE",
  COMMENT = "COMMENT",
  EOF = "EOF",
}

/**
 * Token with position tracking
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  /** A minus marker after the opening braces: trim all whitespace before the tag */
  trimBefore?: boolean;
  /** A minus marker before the closing braces: trim all whitespace after the tag */
  trimAfter?: boolean;
}

/**
 * Whitespace handling. With standaloneLines on, a line holding only block
 * tags and whitespace is removed together with its line break.
 */
export interface WhitespaceOptions {
  standaloneLines?: boolean;
}

/**
 * Base AST node with position tracking
 */
export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

/**
 * Root program node
 */
export interface ProgramNode extends ASTNode {
  type: "Program";
  body: ASTNode[];
}

/**
 * Plain text node
 */
export interface TextNode extends ASTNode {
  type: "Text";
  content: string;
}

/**
 * Variable substitution node
 */
export interface VariableNode extends ASTNode {
  type: "Variable";
  path: string[];
  defaultValue?: string;
  filters?: FilterCall[];
}

/**
 * Ternary operator node
 */
export interface TernaryNode extends ASTNode {
  type: "Ternary";
  condition: string;
  trueValue: string | TernaryNode;
  falseValue: string | TernaryNode;
}

/**
 * Conditional node (IF/ELSEIF/ELSE)
 */
export interface IfNode extends ASTNode {
  type: "If";
  condition: string;
  consequent: ASTNode[];
  alternate: ASTNode[] | IfNode | null;
}

/**
 * CASE statement node
 */
export interface CaseNode extends ASTNode {
  type: "Case";
  expression: string;
  cases: WhenNode[];
  default: DefaultNode | null;
}

/**
 * WHEN clause in CASE
 */
export interface WhenNode extends ASTNode {
  type: "When";
  /** The text of the first matcher when it is a quoted text, otherwise "" */
  value: string;
  /** What the clause matches: a list of matchers or one comparison */
  match: WhenMatch;
  body: ASTNode[];
}

/**
 * One matcher of a WHEN: a literal (its text and whether it was written in
 * quotes) or a variable path
 */
export type WhenItem =
  | { kind: "literal"; text: string; quoted: boolean }
  | { kind: "path"; path: string[] };

/** The comparison operators a WHEN accepts */
export type WhenOperator = "==" | "!=" | ">" | "<" | ">=" | "<=";

/**
 * What a WHEN matches: any item of a list, or the CASE value compared with
 * one item
 */
export type WhenMatch =
  | { kind: "list"; items: WhenItem[] }
  | { kind: "comparison"; operator: WhenOperator; item: WhenItem };

/**
 * DEFAULT clause in CASE
 */
export interface DefaultNode extends ASTNode {
  type: "Default";
  body: ASTNode[];
}

/**
 * FOR loop node
 */
export interface ForNode extends ASTNode {
  type: "For";
  iterable: string[];
  itemName: string;
  body: ASTNode[];
  /** limit= argument, set only when written */
  limit?: ForWindowArg;
  /** offset= argument, set only when written */
  offset?: ForWindowArg;
  /** Body of the {{ELSE}} branch, set only when written */
  elseBody?: ASTNode[];
}

/**
 * A FOR window argument: a number written in the tag or a variable path
 */
export type ForWindowArg =
  | { kind: "literal"; value: number }
  | { kind: "path"; path: string[] };

/**
 * SECTION title: a quoted string or a variable path
 */
export type SectionTitle =
  | { kind: "literal"; text: string }
  | { kind: "path"; path: string[] };

/**
 * SECTION block: a markdown heading over its body, dropped when the body
 * renders empty
 */
export interface SectionNode extends ASTNode {
  type: "Section";
  title: SectionTitle;
  level: number;
  skipEmpty: boolean;
  body: ASTNode[];
}

/**
 * FENCE language: a quoted string or a variable path
 */
export type FenceLang =
  | { kind: "literal"; text: string }
  | { kind: "path"; path: string[] };

/**
 * FENCE block: its rendered body in a code fence longer than any backtick
 * run inside it
 */
export interface FenceNode extends ASTNode {
  type: "Fence";
  lang: FenceLang | null;
  body: ASTNode[];
}

/**
 * List container node
 */
export interface ListNode extends ASTNode {
  type: "List";
  items: ListItemNode[];
}

/**
 * List item node
 */
export interface ListItemNode extends ASTNode {
  type: "ListItem";
  content: ASTNode[];
  condition?: string;
  fallback?: string;
}

/**
 * Table node
 */
export interface TableNode extends ASTNode {
  type: "Table";
  header: TableHeaderNode | null;
  rows: TableRowNode[];
  hasHeader: boolean;
  alignment?: string[];
}

/**
 * Table header node
 */
export interface TableHeaderNode extends ASTNode {
  type: "Header";
  cells: ASTNode[][];
}

/**
 * Table row node
 */
export interface TableRowNode extends ASTNode {
  type: "TableRow";
  cells: ASTNode[][];
}

/**
 * Comment node (removed from output)
 */
export interface CommentNode extends ASTNode {
  type: "Comment";
  content: string;
}

/**
 * Template metadata for debugging
 */
export interface TemplateMetadata {
  detected_variables: string[];
  mapped_variables: string[];
  missing_variables: string[];
  variable_count: number;
}

/**
 * Variable mappings from n8n node config
 */
export interface VariableMappingsCollection {
  mappings?: Array<{
    variableName: string;
    value: string;
  }>;
}

/**
 * Work limits for one render
 */
export interface Limits {
  maxIterations: number;
  maxOutputChars: number;
  maxDepth: number;
  maxNodes: number;
}

/**
 * Default limits: total FOR iterations across the render, output length,
 * and nesting of blocks
 */
export const DEFAULT_LIMITS: Limits = {
  maxIterations: 10000,
  maxOutputChars: 1000000,
  maxDepth: 32,
  maxNodes: 20000,
};

/**
 * The given limits, with every limit left out taking its default
 */
export function withDefaultLimits(limits?: Partial<Limits>): Limits {
  return {
    maxIterations: limits?.maxIterations ?? DEFAULT_LIMITS.maxIterations,
    maxOutputChars: limits?.maxOutputChars ?? DEFAULT_LIMITS.maxOutputChars,
    maxDepth: limits?.maxDepth ?? DEFAULT_LIMITS.maxDepth,
    maxNodes: limits?.maxNodes ?? DEFAULT_LIMITS.maxNodes,
  };
}

/**
 * One filter in the registry that render, spec and analyze all read.
 */
export interface FilterDefinition {
  name: string;
  params: string;
  description: string;
  paramNames: string[];
  apply(input: unknown, params: Record<string, string>): unknown;
}
```

### core/src/spec.ts

```
import { DEFAULT_LIMITS, Limits } from "./types";
import { listFilters } from "./filters";

export interface Spec {
  version: string;
  blocks: { name: string; closes?: string; args: string; description: string }[];
  filters: { name: string; params: string; description: string }[];
  operators: string[];
  limits: Limits;
  options: { name: string; default: string; description: string }[];
  syntax: { variable: string; comment: string; trim: string; escape: string };
}

const LANGUAGE_VERSION = "1.0";

const BLOCKS: Spec["blocks"] = [
  {
    name: "IF",
    closes: "END_IF",
    args: "condition",
    description: "Renders its body when the condition is true",
  },
  {
    name: "ELSEIF",
    args: "condition",
    description: "Inside IF: renders when earlier conditions were false and this one is true",
  },
  {
    name: "ELSE",
    args: "",
    description:
      "Inside IF: renders when every condition was false. Directly inside FOR: starts the empty branch, which renders when the loop renders no item",
  },
  {
    name: "CASE",
    closes: "END_CASE",
    args: "variable",
    description: "Renders the first WHEN that matches the variable, else DEFAULT",
  },
  {
    name: "WHEN",
    closes: "END_WHEN",
    args: 'value[, value...] | variable | operator value',
    description:
      'Inside CASE: renders when the CASE variable equals any value in a list ("a", "b"), equals another variable, or passes a comparison (== != > < >= <=) such as >= 10',
  },
  {
    name: "DEFAULT",
    closes: "END_DEFAULT",
    args: "",
    description: "Inside CASE: renders when no WHEN matched",
  },
  {
    name: "FOR",
    closes: "END_FOR",
    args: "array AS item [limit=N] [offset=N]",
    description:
      "Renders its body once per array element, with @index0, @index1, @first, @last, @notFirst, @notLast and @total (the number of items rendered). limit=N renders at most N items and offset=N skips the first N; each is a whole number or a variable path. {{ELSE}} inside the loop starts a branch that renders when no item does",
  },
  {
    name: "LIST",
    closes: "END_LIST",
    args: "",
    description: "A numbered list of LIST_ITEM entries; lists nest",
  },
  {
    name: "LIST_ITEM",
    closes: "END_LIST_ITEM",
    args: '[condition] [| fallback="text"]',
    description:
      "Inside LIST: one numbered item, skipped or replaced by its fallback when the condition is false",
  },
  {
    name: "TABLE",
    closes: "END_TABLE",
    args: '[align="left|center|right"]',
    description: "A markdown table of an optional HEADER and ROW or FOR-generated rows; align takes one alignment per column",
  },
  {
    name: "HEADER",
    closes: "END_HEADER",
    args: "",
    description: "Inside TABLE: header cells separated by |",
  },
  {
    name: "ROW",
    closes: "END_ROW",
    args: "",
    description: "Inside TABLE: row cells separated by |",
  },
  {
    name: "SECTION",
    closes: "END_SECTION",
    args: '"Title" | path [level=1-6] [skip_empty=true|false]',
    description:
      "A markdown heading at level (default 2, clamped to 1-6), a blank line and the body with its leading and trailing blank lines trimmed; omitted entirely when the body renders empty, unless skip_empty=false keeps the heading",
  },
  {
    name: "FENCE",
    closes: "END_FENCE",
    args: '[lang="language" | lang=path]',
    description:
      "A code fence of at least three backticks, longer than any backtick run in the rendered body, with the optional language; one leading and one trailing line break of the body are removed",
  },
  {
    name: "RAW",
    closes: "END_RAW",
    args: "",
    description:
      "Outputs its content literally: tags, variables and comments inside are not interpreted",
  },
];

const OPTIONS: Spec["options"] = [
  {
    name: "standaloneLines",
    default: "true for render, false for resolveTemplate",
    description:
      "Removes a line holding only block tags and whitespace, with its line break; LIST, TABLE and their parts keep their own spacing",
  },
];

const OPERATORS = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "contains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
  "isArray",
  "isNumber",
  "isObject",
  "isBoolean",
  "AND",
  "OR",
  "NOT",
  "in",
  "not in",
  "between",
  ".length",
];

/**
 * The template language: blocks, filters, condition operators, default
 * limits and syntax
 */
export function spec(): Spec {
  return {
    version: LANGUAGE_VERSION,
    blocks: BLOCKS.map((b) => ({ ...b })),
    filters: listFilters(),
    operators: [...OPERATORS],
    limits: { ...DEFAULT_LIMITS },
    options: OPTIONS.map((o) => ({ ...o })),
    syntax: {
      variable: "${{path.to.value ?? \"default\" | filter=arg}}",
      comment: "{{# comment #}}",
      trim: "{{- TAG}} trims whitespace before a tag and {{TAG -}} after it; comments take {{-# comment #-}}",
      escape: "\\{{ outputs {{ literally",
    },
  };
}
```

## Frozen tests (read-only)

These test files are shown as committed at b2e3fb423d8b, the commit the contract is read at; the diff starts at base fa60d52418cc, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/list-table-children.test.ts (frozen, truncated)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render, validate } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { spec } from "../../core/src/spec";
import { Limits } from "../../core/src/types";
import { runGoldenCases } from "../golden/harness";
import { check } from "../headless/http-helpers";

// FOR and IF build LIST items and TABLE rows. Every row below runs in all four entries (render and resolve, strict
// and lenient) unless it names its own. Expected outputs of the new syntax are the outputs of the same list or table
// written out by hand with LIST_ITEM and ROW tags only. Ids: lc-list lc-table lc-close lc-errors lc-limits lc-ws
// lc-analyze lc-pipes lc-compat.

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  message?: string;
  suggestion?: string;
  output?: string;
  iterations?: number;
}

type RunOptions = Record<string, any>;

function run(entry: Entry, template: string, data: Record<string, any>, limits?: Partial<Limits>, opts?: RunOptions): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode, limits, ...opts });
      if (r.ok) return { code: "ok", output: r.output, iterations: r.stats.iterations };
      const d = r.diagnostics[0] as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message, suggestion: d.suggestion, output: r.output, iterations: r.stats.iterations };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode, limits, ...opts });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
  }
}

/** validate and analyze reported as one outcome; a TemplateError thrown by analyze counts as its diagnostic. */
function runStatic(kind: "validate" | "analyze", template: string): Outcome {
  try {
    if (kind === "validate") {
      const r = validate(template);
      if (r.ok) return { code: "ok" };
      const d = (r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0]) as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message, suggestion: d.suggestion };
    }
    const a = analyze(template);
    const d = a.diagnostics[0] as any;
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, message: d.message, suggestion: d.suggestion };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

type Want =
  | { out: string }
  | { err: string; line: number; col: number; has?: string; sug?: string }
  | { code: string }
  | { loc: string };
type Wants = Want | { strict: Want; lenient: Want };
const OUT = (out: string): Want => ({ out });
const ERR = (err: string, line: number, col: number, has?: string, sug?: string): Want => ({ err, line, col, has, sug });
/** only the code is pinned */
const CODE = (code: string): Want => ({ code });
/** the code is pinned and the position must be a real position, never 1:1 */
const LOC = (loc: string): Want => ({ loc });
const SL = (strict: Want, lenient: Want): Wants => ({ strict, lenient });
const pick = (w: Wants, entry: Entry): Want => ("strict" in w ? (entry.endsWith("strict") ? w.strict : w.lenient) : w);

interface Row {
  name: string;
  tpl: string;
  data: Record<string, any>;
  want: Wants;
  entries?: Entry[];
  limits?: Partial<Limits>;
  opts?: RunOptions;
}

function verifyOutcome(o: Outcome, want: Want, label: string): void {
  if ("err" in want) {
    check(o.code, `${label}: expects the error ${want.err}`).toBe(want.err);
    check({ line: o.line, column: o.column }, `${label}: located at ${want.line}:${want.col}`).toEqual({ line: want.line, column: want.col });
    if (want.has) check(o.message ?? "", `${label}: the message holds ${JSON.stringify(want.has)}`).toContain(want.has);
    if (want.sug) check(`${o.suggestion ?? ""} ${o.message ?? ""}`, `${label}: the suggestion tells ${JSON.stringify(want.sug)}`).toContain(want.sug);
    return;
  }
  if ("code" in want) {
    check(o.code, `${label}: expects the error ${want.code}`).toBe(want.code);
    return;
  }
  if ("loc" in want) {
    check(o.code, `${label}: expects the error ${want.loc}`).toBe(want.loc);
    check(o.line !== undefined && o.column !== undefined && !(o.line === 1 && o.column === 1), `${label}: located at the offending token, never 1:1 (got ${o.line}:${o.column})`).toBe(true);
    return;
  }
  check(o.code, `${label}: renders without an error (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
  check(o.output, `${label}: renders ${JSON.stringify(want.out)}`).toBe(want.out);
}

function verify(entry: Entry, r: Row, id: string): void {
  const o = run(entry, r.tpl, r.data, r.limits, r.opts);
  verifyOutcome(o, pick(r.want, entry), `${id} [${entry}] ${r.name}`);
}

function expand(rows: Row[]) {
  return rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
}

/** A hand-written row with a § in the template at the place where the error is located. */
function marked(tplMarked: string): { tpl: string; line: number; col: number } {
  const i = tplMarked.indexOf("§");
  const before = tplMarked.slice(0, i);
  return { tpl: tplMarked.replace("§", ""), line: before.split("\n").length, col: before.length - (before.lastIndexOf("\n") + 1) + 1 };
}

interface SynRow {
  name: string;
  tpl: string;
  line: number;
  col: number;
  has?: string;
}
interface AnalyzeRow {
  name: string;
  tpl: string;
  usedIn: Record<string, string[]>;
  blocks: Record<string, number>;
}

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(10);
const BS = String.fromCharCode(92);

const D: Record<string, any> = {"xs":["a","b","c"],"ys":["p","q"],"empty":[],"t":true,"f":false,"nul":null,"obj":{"k":1},"sel":2,"cfg":{"a":1},"people":[{"name":"Ann","on":true},{"name":"Bo","on":false},{"name":"Cy","on":true}]};

const LIST_ROWS: Row[] = [
  { name: "a FOR yields one item per element", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "static items before and after a FOR share one counter", tpl: "{{LIST}}{{LIST_ITEM}}s1{{END_LIST_ITEM}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}s2{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s1\n2. a\n3. b\n4. c\n5. s2") },
  { name: "two FORs and static items between them number without gaps", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}mid{{END_LIST_ITEM}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q\n3. mid\n4. a") },
  { name: "an item written after a FOR with no items takes the next number", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s\n2. e") },
  { name: "an IF true yields its items and not the ELSE items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. Y") },
  { name: "an IF false yields the ELSE items", tpl: "{{LIST}}{{IF f}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "an IF false without ELSE yields no item and the next item is 1", tpl: "{{LIST}}{{IF f}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}z{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. z") },
  { name: "an IF true holds several items", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF t}}{{LIST_ITEM}}Y1{{END_LIST_ITEM}}{{LIST_ITEM}}Y2{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s\n2. Y1\n3. Y2\n4. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=1", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":1} }, want: OUT("1. s\n2. one\n3. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=2", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":2} }, want: OUT("1. s\n2. two\n3. two2\n4. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=3", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":3} }, want: OUT("1. s\n2. three\n3. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=4", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":4} }, want: OUT("1. s\n2. other\n3. e") },
  { name: "limit and offset pick the items and @index0, @total are read in them", tpl: "{{LIST}}{{FOR xs AS x limit=2 offset=1}}{{LIST_ITEM}}${{@index0}}/${{@total}} ${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. 0/2 b\n2. 1/2 c") },
  { name: "a FOR over an empty array renders its ELSE items", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "the ELSE items follow static items in one counter", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s\n2. none\n3. e") },
  { name: "a FOR that renders items does not render its ELSE items", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a") },
  { name: "an offset past the end renders the ELSE items", tpl: "{{LIST}}{{FOR xs AS x offset=9}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "the loop name is not bound in the ELSE items", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}[${{x}}]{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"x":"D"} }, want: OUT("1. [D]") },
  { name: "a FOR inside a FOR inside a LIST", tpl: "{{LIST}}{{FOR ys AS y}}{{FOR xs AS x}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pa\n2. pb\n3. pc\n4. qa\n5. qb\n6. qc") },
  { name: "a FOR inside a FOR with an ELSE at each level", tpl: "{{LIST}}{{FOR ys AS y}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}in-${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{ELSE}}{{LIST_ITEM}}out{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. in-p\n2. in-q") },
  { name: "an IF inside a FOR numbers the kept items without gaps", tpl: "{{LIST}}{{FOR xs AS x}}{{IF x != \"b\"}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. c") },
  { name: "an IF/ELSE inside a FOR picks per element", tpl: "{{LIST}}{{FOR people AS p}}{{IF p.on}}{{LIST_ITEM}}${{p.name}} on{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{p.name}} off{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. Ann on\n2. Bo off\n3. Cy on") },
  { name: "an IF/ELSEIF/ELSE inside a FOR", tpl: "{{LIST}}{{FOR xs AS x}}{{IF x == \"a\"}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{ELSEIF x == \"b\"}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. A\n2. B\n3. other") },
  { name: "a FOR inside an IF branch", tpl: "{{LIST}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "a FOR inside an IF ELSE branch", tpl: "{{LIST}}{{IF f}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q") },
  { name: "an IF inside an IF", tpl: "{{LIST}}{{IF t}}{{IF f}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}C{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. B\n2. C") },
  { name: "six levels: FOR, IF, FOR, IF, FOR, IF", tpl: "{{LIST}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x limit=2}}{{IF t}}{{FOR empty AS z}}{{LIST_ITEM}}no{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pa\n2. pb\n3. qa\n4. qb") },
  { name: "an item skipped by its own condition inside a FOR takes no number", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM x != \"b\"}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. c") },
  { name: "an item with a fallback inside a FOR is numbered with the fallback text", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM x != \"b\" | fallback=\"fb\"}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. fb\n3. c") },
  { name: "an item with an empty content is numbered inside a FOR", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. s\n2. \n3. ") },
  { name: "an item condition reads the loop name and the metadata", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM @index0 > 0}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. b\n2. c") },
  { name: "an item with a missing condition name is skipped, not an error, in strict mode", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM nope}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. e") },
  { name: "an item with a missing condition name takes its fallback", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM nope | fallback=\"fb\"}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. fb\n2. fb") },
  { name: "a nested LIST inside a generated item has its own counter", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. s\n2. p\n   1. a\n   2. b\n   3. c\n3. q\n   1. a\n   2. b\n   3. c") },
  { name: "generated items in a nested LIST", tpl: "{{LIST}}{{LIST_ITEM}}top{{END_LIST_ITEM}}{{LIST_ITEM}}p{{LIST}}{{LIST_ITEM}}n0{{END_LIST_ITEM}}{{FOR xs AS x}}{{IF x != \"b\"}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{LIST_ITEM}}n9{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}{{LIST_ITEM}}z{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. top\n2. p\n   1. n0\n   2. a\n   3. c\n   4. n9\n3. z") },
  { name: "an IF in a FOR in a LIST in an item's nested LIST", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{LIST}}{{FOR xs AS x}}{{IF x == \"a\"}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}-{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. pa\n   2. -\n   3. -\n2. q\n   1. qa\n   2. -\n   3. -") },
  { name: "an item's own spacing is kept in a generated item", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}  ${{x}} and  more  {{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a and  more") },
  { name: "a multi-line generated item keeps its lines", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}\nline2{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\nline2\n2. b\nline2") },
  { name: "the same name in a FOR inside a FOR is the inner item inside", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{FOR ys AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q\n3. p\n4. q") },
  { name: "the outer name is back after an inner loop of the same name", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{FOR ys AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. p\n3. a\n4. b\n5. p\n6. b") },
  { name: "a missing iterable: strict error at the FOR, lenient renders the ELSE items", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR nope AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("missing-variable", 2, 42, "nope"), OUT("a\n  1. s\n2. none")) },
  { name: "a non-iterable object: strict type-error at the FOR, lenient renders the ELSE items", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR obj AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 42), OUT("a\n  1. s\n2. none")) },
  { name: "a null iterable: strict type-error at the FOR, lenient renders the ELSE items", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR nul AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 42), OUT("a\n  1. s\n2. none")) },
  { name: "a non-iterable without ELSE renders zero items in lenient mode", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR obj AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 42), OUT("a\n  1. s")) },
  { name: "a non-iterable in a FOR inside an IF inside a LIST: strict error at the FOR", tpl: "a\n{{LIST}}{{IF t}}  {{FOR obj AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 19), OUT("a\n1. e")) },
  { name: "a missing iterable in an inner FOR is located at the inner FOR", tpl: "{{LIST}}{{FOR ys AS y}}\n    {{FOR nope AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("missing-variable", 2, 5, "nope"), OUT("")) },
  { name: "a bad window value in a LIST FOR is a type-error at the FOR", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR xs AS x limit=n}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"n":-1} }, want: ERR("type-error", 2, 42) },
  { name: "a missing condition name in an IF is false and not an error", tpl: "{{LIST}}{{IF nope}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "a null condition in an IF is false", tpl: "{{LIST}}{{IF nul}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "a present condition in an IF is true", tpl: "{{LIST}}{{IF cfg.a}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. Y") },
  { name: "a missing nested path in an ELSEIF is false", tpl: "{{LIST}}{{IF cfg.zz}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{END_IF}}{{IF f}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{ELSEIF cfg.zz.deep}}{{LIST_ITEM}}C{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}D{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. D") },
  { name: "emoji in generated item text", tpl: "{{LIST}}{{FOR es AS e}}{{LIST_ITEM}}${{e}} ok 😀{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"es":["🚀","𝒳"]} }, want: OUT("1. 🚀 ok 😀\n2. 𝒳 ok 😀") },
  { name: "__proto__ as the loop item name", tpl: "{{LIST}}{{FOR xs AS __proto__ limit=2}}{{LIST_ITEM}}${{__proto__}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "constructor as the loop item name with a path", tpl: "{{LIST}}{{FOR people AS constructor limit=2}}{{LIST_ITEM}}${{constructor.name}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. Ann\n2. Bo") },
  { name: "constructor as a data key is an ordinary iterable", tpl: "{{LIST}}{{FOR constructor AS c}}{{LIST_ITEM}}${{c}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"constructor":["c1","c2"]} }, want: OUT("1. c1\n2. c2") },
  { name: "a prototype path segment in a condition is false", tpl: "{{LIST}}{{IF cfg.constructor}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{IF cfg.__proto__}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N\n2. N") },
  { name: "the loop name is gone after the FOR", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}[${{x}}]{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"x":"D"} }, want: OUT("1. a\n2. [D]") },
  { name: "a LIST generated inside a FOR keeps one counter per LIST", tpl: "{{FOR ys AS y}}{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}{{END_FOR}}", data: D, want: OUT("1. pa\n2. pb1. qa\n2. qb") },
];

const TABLE_ROWS: Row[] = [
  { name: "an IF true yields its rows and not the ELSE rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "an IF false yields the ELSE rows", tpl: "{{TABLE}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 2 |") },
  { name: "an IF false without ELSE yields no row", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |") },
  { name: "an IF with no HEADER makes no header: the first row is a plain row", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |") },
  { name: "an IF holding several rows between static rows keeps source order", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |\n| a | 1 |\n| b | 2 |\n| e | 9 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=1", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":1} }, want: OUT("| s | 0 |\n| one | 1 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=2", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":2} }, want: OUT("| s | 0 |\n| two | 2 |\n| two2 | 2 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=3", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":3} }, want: OUT("| s | 0 |\n| three | 3 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=4", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":4} }, want: OUT("| s | 0 |\n| other | 4 |") },
  { name: "a header followed by IF rows keeps the header rule", tpl: "{{TABLE}}{{HEADER}}N|T{{END_HEADER}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{ROW}}z|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| N | T |\n|:-----|:-----|\n| a | 1 |\n| z | 9 |") },
  { name: "a header and an IF that yields no row render the header alone", tpl: "{{TABLE}}{{HEADER}}N|T{{END_HEADER}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| N | T |\n|:-----|:-----|") },
  { name: "rows from different branches are padded to the widest row", tpl: "{{TABLE}}{{IF t}}{{ROW}}a{{END_ROW}}{{END_IF}}{{IF f}}{{ROW}}x{{END_ROW}}{{ELSE}}{{ROW}}b|c|d{{END_ROW}}{{END_IF}}{{ROW}}e|f{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| a |  |  |\n| b | c | d |\n| e | f |  |") },
  { name: "rows from an IF are padded to the header width", tpl: "{{TABLE}}{{HEADER}}A|B|C{{END_HEADER}}{{IF t}}{{ROW}}1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | B | C |\n|:-----|:-----|:-----|\n| 1 |  |  |") },
  { name: "a FOR inside an IF yields rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|${{@index0}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "a FOR inside an IF with a header", tpl: "{{TABLE}}{{HEADER}}L|I{{END_HEADER}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|${{@index0}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| L | I |\n|:-----|:-----|\n| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "a FOR inside an ELSE branch", tpl: "{{TABLE}}{{IF f}}{{ROW}}no|0{{END_ROW}}{{ELSE}}{{FOR ys AS y}}{{ROW}}${{y}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | 1 |\n| q | 1 |") },
  { name: "limit, offset, @total and @index1 in rows from a FOR in an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=2 offset=1}}{{ROW}}${{x}}|${{@index1}}/${{@total}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 1/2 |\n| c | 2/2 |") },
  { name: "a FOR in an IF renders its ELSE rows for an empty array", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "a FOR in an IF does not render its ELSE rows when rows render", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a FOR in an IF with an offset past the end renders the ELSE rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x offset=9}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "the loop name is not bound in the ELSE rows of a FOR in an IF", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}[${{x}}]|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"x":"D"} }, want: OUT("| [D] | 0 |") },
  { name: "an IF inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{IF x != \"b\"}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}skipped|0{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| skipped | 0 |\n| c | 1 |") },
  { name: "an IF/ELSEIF/ELSE inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{IF x == \"a\"}}{{ROW}}A|1{{END_ROW}}{{ELSEIF x == \"b\"}}{{ROW}}B|2{{END_ROW}}{{ELSE}}{{ROW}}other|3{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | 1 |\n| B | 2 |\n| other | 3 |") },
  { name: "a FOR inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR xs AS x limit=2}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| q | a |\n| q | b |") },
  { name: "an IF inside an IF", tpl: "{{TABLE}}{{IF t}}{{IF f}}{{ROW}}A|1{{END_ROW}}{{ELSE}}{{ROW}}B|2{{END_ROW}}{{END_IF}}{{ROW}}C|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| B | 2 |\n| C | 3 |") },
  { name: "conditions in the rows read the loop name", tpl: "{{TABLE}}{{HEADER}}Name|On{{END_HEADER}}{{IF t}}{{FOR people AS p}}{{IF p.on}}{{ROW}}${{p.name}}|yes{{END_ROW}}{{ELSE}}{{ROW}}${{p.name}}|no{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| Name | On |\n|:-----|:-----|\n| Ann | yes |\n| Bo | no |\n| Cy | yes |") },
  { name: "a FOR directly in the TABLE holding an IF with a ROW yields rows", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x != \"b\"}}{{ROW}}${{x}}|1{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| c | 1 |") },
  { name: "a FOR directly in the TABLE holding an IF/ELSE with ROWs yields rows", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x != \"b\"}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}skipped|0{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| skipped | 0 |\n| c | 1 |") },
  { name: "a FOR directly in the TABLE holding a FOR inside an IF with ROWs yields rows", tpl: "{{TABLE}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x limit=2}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| q | a |\n| q | b |") },
  { name: "a header, a direct FOR with an IF row and a static row", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{FOR xs AS x limit=2}}{{IF t}}{{ROW}}${{x}}|1{{END_ROW}}{{END_IF}}{{END_FOR}}{{ROW}}z|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| a | 1 |\n| b | 1 |\n| z | 9 |") },
  { name: "a missing condition name in an IF is false and not an error", tpl: "{{TABLE}}{{IF nope}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 2 |") },
  { name: "a null condition in an IF is false", tpl: "{{TABLE}}{{IF nul}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 2 |") },
  { name: "a present condition in an IF is true", tpl: "{{TABLE}}{{IF cfg.a}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a non-iterable object in a FOR inside an IF is silent in every mode and the ELSE rows render", tpl: "{{TABLE}}{{IF t}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "a null iterable in a FOR inside an IF is silent in every mode", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF t}}{{FOR nul AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |\n| none | 0 |") },
  { name: "a non-iterable without ELSE in a FOR inside an IF renders no row", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF t}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|") },
  { name: "a non-iterable object in a FOR inside a FOR inside an IF is silent", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|${{y}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | p |\n| none | q |") },
  { name: "a missing iterable in a FOR inside an IF: strict error at the FOR, lenient renders the ELSE rows", tpl: "a\n{{TABLE}}{{IF t}}  {{FOR nope AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: SL(ERR("missing-variable", 2, 20, "nope"), OUT("a\n| none | 0 |")) },
  { name: "a bad window value in a FOR inside an IF is a type-error at the FOR", tpl: "a\n{{TABLE}}{{IF t}}  {{FOR xs AS x limit=n}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"n":"abc"} }, want: ERR("type-error", 2, 20) },
  { name: "emoji in generated cells", tpl: "{{TABLE}}{{IF t}}{{FOR es AS e}}{{ROW}}${{e}}|ok 😀{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"es":["🚀","𝒳"]} }, want: OUT("| 🚀 | ok 😀 |\n| 𝒳 | ok 😀 |") },
  { name: "__proto__ as the loop item name in a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS __proto__ limit=2}}{{ROW}}${{__proto__}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "constructor as the loop item name with a path", tpl: "{{TABLE}}{{IF t}}{{FOR people AS constructor limit=2}}{{ROW}}${{constructor.name}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| Ann | 1 |\n| Bo | 1 |") },
  { name: "constructor as a data key is an ordinary iterable", tpl: "{{TABLE}}{{IF t}}{{FOR constructor AS c}}{{ROW}}${{c}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"constructor":["c1","c2"]} }, want: OUT("| c1 | 1 |\n| c2 | 1 |") },
  { name: "a prototype path segment in an IF condition is false", tpl: "{{TABLE}}{{IF cfg.constructor}}{{ROW}}Y|1{{END_ROW}}{{ELSE}}{{ROW}}N|0{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| N | 0 |") },
  { name: "a TABLE with only an IF that yields no row renders nothing", tpl: "{{TABLE}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("") },
  { name: "two IFs and a FOR in source order", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{FOR ys AS y}}{{ROW}}${{y}}|2{{END_ROW}}{{END_FOR}}{{IF f}}{{ROW}}x|0{{END_ROW}}{{ELSE}}{{ROW}}b|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| p | 2 |\n| q | 2 |\n| b | 3 |") },
  { name: "cells with spaces and several nodes in a generated row", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}  ${{x}} is first | ${{@total}}  {{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a is first | 1 |") },
];

const CLOSE_ROWS: Row[] = [
  { name: "an unclosed item ends at END_FOR", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "an unclosed item ends at END_FOR with a static item after the FOR", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. e") },
  { name: "an unclosed item ends at the ELSE of its FOR", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{ELSE}}{{LIST_ITEM}}none{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "the ELSE of a FOR that renders items is not rendered", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{ELSE}}{{LIST_ITEM}}none{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a") },
  { name: "an unclosed item ends at ELSEIF, ELSE and END_IF, sel=1", tpl: "{{LIST}}{{IF sel == 1}}{{LIST_ITEM}}one{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{ELSE}}{{LIST_ITEM}}other{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":1} }, want: OUT("1. one\n2. e") },
  { name: "an unclosed item ends at ELSEIF, ELSE and END_IF, sel=2", tpl: "{{LIST}}{{IF sel == 1}}{{LIST_ITEM}}one{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{ELSE}}{{LIST_ITEM}}other{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":2} }, want: OUT("1. two\n2. e") },
  { name: "an unclosed item ends at ELSEIF, ELSE and END_IF, sel=3", tpl: "{{LIST}}{{IF sel == 1}}{{LIST_ITEM}}one{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{ELSE}}{{LIST_ITEM}}other{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":3} }, want: OUT("1. other\n2. e") },
  { name: "several unclosed items in a branch end at END_IF", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{LIST_ITEM}}b{{LIST_ITEM}}c{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c\n4. e") },
  { name: "the last unclosed item before END_IF in a branch", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM}}b{{END_IF}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "an unclosed item before END_LIST still ends there", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM}}b{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "an unclosed item before the next item still ends there", tpl: "{{LIST}}{{LIST_ITEM}}a{{LIST_ITEM}}b{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "an unclosed item with a condition and a fallback in a FOR", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM x != \"b\" | fallback=\"fb\"}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. fb\n3. c") },
  { name: "an unclosed item followed by a FOR is that item's content", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. aabc") },
  { name: "an unclosed item followed by an IF is that item's content", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}Y{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. aY") },
  { name: "an unclosed item in a FOR whose content is a FOR", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pabc\n2. qabc") },
  { name: "an unclosed item in a FOR whose content is an IF", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{IF t}}!{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p!\n2. q!") },
  { name: "an ELSE inside the IF that is item content belongs to that IF", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{IF f}}!{{ELSE}}?{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p?\n2. q?") },
  { name: "an unclosed item whose content is an IF with ELSEIF, in an IF branch", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{IF f}}1{{ELSEIF t}}2{{ELSE}}3{{END_IF}}{{LIST_ITEM}}b{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a2\n2. b") },
  { name: "an unclosed item whose content is a nested LIST", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{LIST}}{{LIST_ITEM}}c1{{LIST_ITEM}}c2{{END_LIST}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. c1\n   2. c2\n2. q\n   1. c1\n   2. c2") },
  { name: "a ROW without END_ROW ends at END_FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |") },
  { name: "a ROW without END_ROW ends at the ELSE of its FOR", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}{{ROW}}${{x}}|1{{ELSE}}{{ROW}}none|0{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "a ROW without END_ROW ends at ELSEIF, ELSE and END_IF, sel=1", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF sel == 1}}{{ROW}}one|1{{ELSEIF sel == 2}}{{ROW}}two|2{{ELSE}}{{ROW}}other|3{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"sel":1} }, want: OUT("| A | B |\n|:-----|:-----|\n| one | 1 |\n| e | 9 |") },
  { name: "a ROW without END_ROW ends at ELSEIF, ELSE and END_IF, sel=2", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF sel == 1}}{{ROW}}one|1{{ELSEIF sel == 2}}{{ROW}}two|2{{ELSE}}{{ROW}}other|3{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"sel":2} }, want: OUT("| A | B |\n|:-----|:-----|\n| two | 2 |\n| e | 9 |") },
  { name: "a ROW without END_ROW ends at ELSEIF, ELSE and END_IF, sel=3", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF sel == 1}}{{ROW}}one|1{{ELSEIF sel == 2}}{{ROW}}two|2{{ELSE}}{{ROW}}other|3{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"sel":3} }, want: OUT("| A | B |\n|:-----|:-----|\n| other | 3 |\n| e | 9 |") },
  { name: "several unclosed rows in an IF branch", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{ROW}}b|2{{ROW}}c|3{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |\n| c | 3 |") },
  { name: "an unclosed row before END_TABLE and before the next ROW still end there", tpl: "{{TABLE}}{{ROW}}a|1{{ROW}}b|2{{ROW}}c|3{{END_ROW}}{{ROW}}d|4{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |\n| c | 3 |\n| d | 4 |") },
  { name: "an unclosed row before END_FOR in a FOR inside an IF in a TABLE, after static rows", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF t}}{{FOR ys AS y}}{{ROW}}${{y}}|1{{END_FOR}}{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |\n| p | 1 |\n| q | 1 |\n| e | 9 |") },
  { name: "an unclosed row whose content is an IF, in a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{ROW}}${{y}}|{{IF t}}!{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | ! |\n| q | ! |") },
  { name: "an unclosed row in a FOR inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR xs AS x limit=2}}{{ROW}}${{y}}|${{x}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| q | a |\n| q | b |") },
  { name: "a LIST_ITEM inside a FOR that is the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}{{LIST_ITEM}}b{{END_FOR}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 38, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside an IF that is the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}{{LIST_ITEM}}b{{END_IF}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 31, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside a FOR that is the content of a closed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 38, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside an IF ELSE that is the content of a closed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF f}}x{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 40, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside the content of an unclosed item that sits in a generated FOR", tpl: "a\n{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{IF t}}\n  {{LIST_ITEM}}b{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("syntax-error", 3, 3, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside a FOR inside an IF that is the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}b{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 46, undefined, "END_LIST_ITEM") },
];

const COMMENT_ROWS: Row[] = [
  { name: "a comment directly in a LIST is allowed", tpl: "{{LIST}}{{# note #}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{# more #}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{# end #}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "a comment directly in a TABLE is allowed", tpl: "{{TABLE}}{{# note #}}{{ROW}}a|1{{END_ROW}}{{# more #}}{{ROW}}b|2{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |") },
  { name: "a comment among the children of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{# one #}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{# two #}}{{ELSE}}{{# else #}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "a comment in the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{# else #}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{# after #}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "a comment among the branches of an IF that builds items", tpl: "{{LIST}}{{IF f}}{{# a #}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{ELSEIF f}}{{# b #}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{ELSE}}{{# c #}}{{LIST_ITEM}}C{{END_LIST_ITEM}}{{# d #}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. C") },
  { name: "a comment among the children of an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{# a #}}{{ROW}}a|1{{END_ROW}}{{# b #}}{{ELSE}}{{# c #}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a comment in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=2}}{{# one #}}{{ROW}}${{x}}|1{{END_ROW}}{{# two #}}{{ELSE}}{{# e #}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "a comment next to a HEADER in a TABLE", tpl: "{{TABLE}}{{# a #}}{{HEADER}}A|B{{END_HEADER}}{{# b #}}{{IF t}}{{ROW}}1|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "whitespace and line breaks among the children of a FOR that builds items", tpl: "{{LIST}}\n  {{FOR xs AS x limit=2}}\n    {{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n  \n  {{END_FOR}}\n  {{LIST_ITEM}}e{{END_LIST_ITEM}}\n{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. e") },
  { name: "whitespace and line breaks among the children of an IF that builds rows", tpl: "{{TABLE}}\n  {{IF t}}\n    {{ROW}}a|1{{END_ROW}}\n\t\n  {{ELSE}}\n    {{ROW}}b|2{{END_ROW}}\n  {{END_IF}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a FOR directly in a TABLE keeps the text-row fallback", tpl: "{{TABLE}}{{FOR xs AS x}}${{x}}|${{@index0}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "an IF of text in a direct TABLE FOR body keeps working", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x == \"b\"}}B|y{{ELSE}}${{x}}|o{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | o |\n| B | y |\n| c | o |") },
  { name: "an IF with text in a direct FOR body is rendered and split, not an error", tpl: "{{TABLE}}{{FOR ys AS y}}{{IF t}}text ${{y}}|1{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| text p | 1 |\n| text q | 1 |") },
];

const LIMIT_ROWS: Row[] = [
  { name: "a FOR in a LIST: 4 nodes fit", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. a\n3. a"), limits: {"maxNodes":4} },
  { name: "a FOR in a LIST: 3 nodes cross at the last node", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 37), limits: {"maxNodes":3} },
  { name: "an IF in a LIST: 4 nodes fit", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a"), limits: {"maxNodes":4} },
  { name: "an IF in a LIST: 3 nodes cross at the last node", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 30), limits: {"maxNodes":3} },
  { name: "an IF with ELSE in a LIST: 6 nodes fit", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a"), limits: {"maxNodes":6} },
  { name: "an IF with ELSE in a LIST: 5 nodes cross at the last node", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 69), limits: {"maxNodes":5} },
  { name: "two FORs in a LIST: 7 nodes fit", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{FOR ys AS y}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. a\n3. a\n4. b\n5. b"), limits: {"maxNodes":7} },
  { name: "two FORs in a LIST: 6 nodes cross at the last node", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{FOR ys AS y}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 94), limits: {"maxNodes":6} },
  { name: "a FOR in an IF in a LIST: 5 nodes fit", tpl: "{{LIST}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. a\n3. a"), limits: {"maxNodes":5} },
  { name: "a FOR in an IF in a LIST: 4 nodes cross at the last node", tpl: "{{LIST}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 45), limits: {"maxNodes":4} },
  { name: "an IF in a TABLE: 4 nodes fit", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |"), limits: {"maxNodes":4} },
  { name: "an IF in a TABLE: 3 nodes cross at the last node", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 25), limits: {"maxNodes":3} },
  { name: "a FOR in an IF in a TABLE: 5 nodes fit", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxNodes":5} },
  { name: "a FOR in an IF in a TABLE: 4 nodes cross at the last node", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 40), limits: {"maxNodes":4} },
  { name: "an IF with ELSE in a TABLE: 6 nodes fit", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{ELSE}}{{ROW}}c|d{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |"), limits: {"maxNodes":6} },
  { name: "an IF with ELSE in a TABLE: 5 nodes cross at the last node", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{ELSE}}{{ROW}}c|d{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 54), limits: {"maxNodes":5} },
  { name: "a FOR directly in a TABLE keeps its count: 5 nodes fit", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxNodes":5} },
  { name: "a FOR directly in a TABLE keeps its count: 4 nodes cross at the last node", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 32), limits: {"maxNodes":4} },
  { name: "a text FOR directly in a TABLE keeps its count: 4 nodes fit", tpl: "{{TABLE}}{{FOR xs AS x}}a|b{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxNodes":4} },
  { name: "a text FOR directly in a TABLE keeps its count: 3 nodes cross at the last node", tpl: "{{TABLE}}{{FOR xs AS x}}a|b{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 25), limits: {"maxNodes":3} },
  { name: "a FOR in a LIST: depth 2 is within the limit", tpl: "a\n  {{LIST}}\n    {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("a\n  1. a\n2. b\n3. c"), limits: {"maxDepth":2} },
  { name: "a FOR in a LIST: depth 1 crosses at the opening tag", tpl: "a\n  {{LIST}}\n    {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-depth", 3, 5), limits: {"maxDepth":1} },
  { name: "an IF in a LIST: depth 2 is within the limit", tpl: "a\n  {{LIST}}\n    {{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("a\n  1. a"), limits: {"maxDepth":2} },
  { name: "an IF in a LIST: depth 1 crosses at the opening tag", tpl: "a\n  {{LIST}}\n    {{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-depth", 3, 5), limits: {"maxDepth":1} },
  { name: "a FOR in an IF in a LIST: depth 3 is within the limit", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), limits: {"maxDepth":3} },
  { name: "a FOR in an IF in a LIST: depth 2 crosses at the opening tag", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":2} },
  { name: "a FOR in the ELSE of an IF in a LIST: depth 3 is within the limit", tpl: "{{LIST}}{{IF f}}{{ELSE}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), limits: {"maxDepth":3} },
  { name: "a FOR in the ELSE of an IF in a LIST: depth 2 crosses at the opening tag", tpl: "{{LIST}}{{IF f}}{{ELSE}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":2} },
  { name: "an IF in a FOR in an IF in a FOR in a LIST: depth 5 is within the limit", tpl: "{{LIST}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c\n4. a\n5. b\n6. c"), limits: {"maxDepth":5} },
  { name: "an IF in a FOR in an IF in a FOR in a LIST: depth 4 crosses at the opening tag", tpl: "{{LIST}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":4} },
  { name: "an IF in a TABLE: depth 2 is within the limit", tpl: "a\n  {{TABLE}}\n    {{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("a\n  | a | b |"), limits: {"maxDepth":2} },
  { name: "an IF in a TABLE: depth 1 crosses at the opening tag", tpl: "a\n  {{TABLE}}\n    {{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 3, 5), limits: {"maxDepth":1} },
  { name: "a FOR in an IF in a TABLE: depth 3 is within the limit", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| b | b |\n| c | b |"), limits: {"maxDepth":3} },
  { name: "a FOR in an IF in a TABLE: depth 2 crosses at the opening tag", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":2} },
  { name: "an IF in a FOR in an IF in a TABLE: depth 4 is within the limit", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{ROW}}${{x}}|b{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| b | b |\n| c | b |"), limits: {"maxDepth":4} },
  { name: "an IF in a FOR in an IF in a TABLE: depth 3 crosses at the opening tag", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{ROW}}${{x}}|b{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":3} },
  { name: "a FOR directly in a TABLE keeps its depth: depth 2 is within the limit", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxDepth":2} },
  { name: "a FOR directly in a TABLE keeps its depth: depth 1 crosses at the opening tag", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 1, 10), limits: {"maxDepth":1} },
  { name: "a LIST FOR over three items: 3 iterations fit", tpl: "a\n  {{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("a\n  1. a\n2. b\n3. c"), limits: {"maxIterations":3} },
  { name: "a LIST FOR over three items: 2 iterations cross at the FOR", tpl: "a\n  {{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 11), limits: {"maxIterations":2} },
  { name: "a LIST FOR with a window: 2 iterations fit", tpl: "a\n  {{LIST}}{{FOR xs AS x limit=2 offset=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("a\n  1. b\n2. c"), limits: {"maxIterations":2} },
  { name: "a LIST FOR with a window: 1 iterations cross at the FOR", tpl: "a\n  {{LIST}}{{FOR xs AS x limit=2 offset=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 11), limits: {"maxIterations":1} },
  { name: "a LIST FOR whose items are skipped by their own condition still iterates: 3 iterations fit", tpl: "{{LIST}}\n{{FOR xs AS x}}{{LIST_ITEM nope}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT(""), limits: {"maxIterations":3} },
  { name: "a LIST FOR whose items are skipped by their own condition still iterates: 2 iterations cross at the FOR", tpl: "{{LIST}}\n{{FOR xs AS x}}{{LIST_ITEM nope}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 1), limits: {"maxIterations":2} },
  { name: "a FOR in an IF in a LIST: 3 iterations fit", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), limits: {"maxIterations":3} },
  { name: "a FOR in an IF in a LIST: 2 iterations cross at the FOR", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":2} },
  { name: "an inner FOR in a FOR in a LIST (outer 2 plus inner 3 twice): 8 iterations fit", tpl: "{{LIST}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pa\n2. pb\n3. pc\n4. qa\n5. qb\n6. qc"), limits: {"maxIterations":8} },
  { name: "an inner FOR in a FOR in a LIST (outer 2 plus inner 3 twice): 7 iterations cross at the FOR", tpl: "{{LIST}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":7} },
  { name: "a FOR in an IF in a TABLE: 3 iterations fit", tpl: "a\n{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("a\n| a | 1 |\n| b | 1 |\n| c | 1 |"), limits: {"maxIterations":3} },
  { name: "a FOR in an IF in a TABLE: 2 iterations cross at the FOR", tpl: "a\n{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 3, 3), limits: {"maxIterations":2} },
  { name: "a FOR in an IF in a TABLE with a window: 2 iterations fit", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x offset=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 1 |\n| c | 1 |"), limits: {"maxIterations":2} },
  { name: "a FOR in an IF in a TABLE with a window: 1 iterations cross at the FOR", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x offset=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":1} },
  { name: "an inner FOR in a FOR in an IF in a TABLE: 8 iterations fit", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| p | c |\n| q | a |\n| q | b |\n| q | c |"), limits: {"maxIterations":8} },
  { name: "an inner FOR in a FOR in an IF in a TABLE: 7 iterations cross at the FOR", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":7} },
  { name: "a FOR directly in a TABLE keeps counting: 3 iterations fit", tpl: "a\n{{TABLE}}  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("a\n| a | 1 |\n| b | 1 |\n| c | 1 |"), limits: {"maxIterations":3} },
  { name: "a FOR directly in a TABLE keeps counting: 2 iterations cross at the FOR", tpl: "a\n{{TABLE}}  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 2, 12), limits: {"maxIterations":2} },
];

const WS_ROWS: Row[] = [
  { name: "FOR and END_FOR tags on their own lines in a LIST (standalone)", tpl: "head\n{{LIST}}\n{{FOR xs AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. a\n2. b\n3. c\ntail"), opts: {"standaloneLines":true} },
  { name: "IF, ELSEIF, ELSE and END_IF tags on their own lines in a LIST (standalone)", tpl: "head\n{{LIST}}\n{{IF sel == 1}}\n{{LIST_ITEM}}one{{END_LIST_ITEM}}\n{{ELSEIF sel == 2}}\n{{LIST_ITEM}}two{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}other{{END_LIST_ITEM}}\n{{END_IF}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. two\ntail"), opts: {"standaloneLines":true} },
  { name: "FOR with an ELSE on its own lines in a LIST (standalone)", tpl: "{{LIST}}\n{{FOR empty AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}none{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\n", data: D, want: OUT("1. none\n"), opts: {"standaloneLines":true} },
  { name: "unclosed items on their own lines in a FOR in a LIST (standalone)", tpl: "{{LIST}}\n{{FOR xs AS x}}\n{{LIST_ITEM}}${{x}}\n{{END_FOR}}\n{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), opts: {"standaloneLines":true} },
  { name: "tags on their own lines in a TABLE (standalone)", tpl: "{{TABLE}}\n{{HEADER}}A|B{{END_HEADER}}\n{{IF t}}\n{{ROW}}1|2{{END_ROW}}\n{{ELSE}}\n{{ROW}}3|4{{END_ROW}}\n{{END_IF}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|z{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}\n", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |\n| a | z |\n| b | z |\n| c | z |\n"), opts: {"standaloneLines":true} },
  { name: "a FOR inside an IF on their own lines in a TABLE (standalone)", tpl: "x\n{{TABLE}}\n{{IF t}}\n  {{FOR ys AS y}}\n  {{ROW}}${{y}}|1{{END_ROW}}\n  {{END_FOR}}\n{{END_IF}}\n{{END_TABLE}}\ny", data: D, want: OUT("x\n| p | 1 |\n| q | 1 |\ny"), opts: {"standaloneLines":true} },
  { name: "a FOR in an IF with ROW lines in a direct TABLE FOR (standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{IF x != \"b\"}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_IF}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| c | 1 |"), opts: {"standaloneLines":true} },
  { name: "the legacy direct TABLE FOR with a ROW body on its own lines (standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |"), opts: {"standaloneLines":true} },
  { name: "unclosed rows on their own lines in an IF in a TABLE (standalone)", tpl: "{{TABLE}}\n{{IF t}}\n{{ROW}}a|1\n{{ROW}}b|2\n{{END_IF}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |"), opts: {"standaloneLines":true} },
  { name: "FOR and END_FOR tags on their own lines in a LIST (no standalone)", tpl: "head\n{{LIST}}\n{{FOR xs AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. a\n2. b\n3. c\ntail"), opts: {"standaloneLines":false} },
  { name: "IF, ELSEIF, ELSE and END_IF tags on their own lines in a LIST (no standalone)", tpl: "head\n{{LIST}}\n{{IF sel == 1}}\n{{LIST_ITEM}}one{{END_LIST_ITEM}}\n{{ELSEIF sel == 2}}\n{{LIST_ITEM}}two{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}other{{END_LIST_ITEM}}\n{{END_IF}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. two\ntail"), opts: {"standaloneLines":false} },
  { name: "FOR with an ELSE on its own lines in a LIST (no standalone)", tpl: "{{LIST}}\n{{FOR empty AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}none{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\n", data: D, want: OUT("1. none\n"), opts: {"standaloneLines":false} },
  { name: "tags on their own lines in a TABLE (no standalone)", tpl: "{{TABLE}}\n{{HEADER}}A|B{{END_HEADER}}\n{{IF t}}\n{{ROW}}1|2{{END_ROW}}\n{{ELSE}}\n{{ROW}}3|4{{END_ROW}}\n{{END_IF}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|z{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}\n", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |\n| a | z |\n| b | z |\n| c | z |\n"), opts: {"standaloneLines":false} },
  { name: "a FOR inside an IF on their own lines in a TABLE (no standalone)", tpl: "x\n{{TABLE}}\n{{IF t}}\n  {{FOR ys AS y}}\n  {{ROW}}${{y}}|1{{END_ROW}}\n  {{END_FOR}}\n{{END_IF}}\n{{END_TABLE}}\ny", data: D, want: OUT("x\n| p | 1 |\n| q | 1 |\ny"), opts: {"standaloneLines":false} },
  { name: "a FOR in an IF with ROW lines in a direct TABLE FOR (no standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{IF x != \"b\"}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_IF}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| c | 1 |"), opts: {"standaloneLines":false} },
  { name: "the legacy direct TABLE FOR with a ROW body on its own lines (no standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |"), opts: {"standaloneLines":false} },
  { name: "trim markers on FOR and END_FOR beside items in a LIST", tpl: "{{LIST}}  {{- FOR xs AS x -}}  {{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}  {{- END_FOR -}}  {{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "trim markers on IF, ELSE and END_IF beside items in a LIST", tpl: "{{LIST}}\n  {{- IF f -}}\n  {{LIST_ITEM}}Y{{END_LIST_ITEM}}\n  {{- ELSE -}}\n  {{LIST_ITEM}}N{{END_LIST_ITEM}}\n  {{- END_IF -}}\n{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "a trim marker on END_FOR trims the end of an unclosed item", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}  \n  {{- END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "without a trim marker the trailing spaces and break of an unclosed item are trimmed as in a closed item", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}  \n  {{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b"), opts: {"standaloneLines":false} },
  { name: "a trim marker on END_IF trims the end of an unclosed item", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a  \n  {{- END_IF}}{{END_LIST}}", data: D, want: OUT("1. a") },
  { name: "a trim marker after a FOR tag trims the start of an unclosed row", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=2 -}}\n  {{ROW}}${{x}}|1  \n  {{- END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "a trim marker before a FOR in the content of an unclosed item trims the text before it", tpl: "{{LIST}}{{LIST_ITEM}}a  {{- FOR ys AS y}}${{y}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. apq") },
  { name: "without a trim marker the text before a FOR in an item keeps its spaces", tpl: "{{LIST}}{{LIST_ITEM}}a  {{FOR ys AS y}}${{y}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a  pq") },
  { name: "a trim marker after END_FOR beside the next item", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{END_FOR -}}  \n{{LIST_ITEM}}z{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q\n3. z") },
  { name: "trim markers on IF and END_IF around rows in a TABLE", tpl: "{{TABLE}}\n  {{- IF t -}}\n  {{ROW}}a|1{{END_ROW}}\n  {{- ELSE -}}\n  {{ROW}}b|2{{END_ROW}}\n  {{- END_IF -}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "trim markers on a FOR inside an IF in a TABLE", tpl: "{{TABLE}}{{IF t}}  {{- FOR xs AS x limit=2 -}}  {{ROW}}${{x}}|1{{END_ROW}}  {{- END_FOR -}}  {{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "CRLF line breaks around FOR and END_FOR in a LIST", tpl: "head\r\n{{LIST}}\r\n{{FOR xs AS x}}\r\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\r\n{{END_FOR}}\r\n{{END_LIST}}\r\ntail", data: D, want: OUT("head\n1. a\n2. b\n3. c\ntail"), opts: {"standaloneLines":true} },
  { name: "CRLF line breaks around IF and ELSE in a TABLE", tpl: "{{TABLE}}\r\n{{IF f}}\r\n{{ROW}}1|2{{END_ROW}}\r\n{{ELSE}}\r\n{{ROW}}3|4{{END_ROW}}\r\n{{END_IF}}\r\n{{END_TABLE}}\r\n", data: D, want: OUT("| 3 | 4 |\n"), opts: {"standaloneLines":true} },
  { name: "an item's own spacing and lines are kept in a generated item", tpl: "{{LIST}}\n{{FOR xs AS x limit=2}}\n{{LIST_ITEM}}\n  ${{x}} text\n{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}", data: D, want: OUT("1. a text\n2. b text"), opts: {"standaloneLines":true} },
  { name: "an IF line inside an item's content in a generated LIST keeps the standalone rule", tpl: "{{LIST}}\n{{FOR xs AS x limit=2}}\n{{LIST_ITEM}}${{x}}\n{{IF t}}\nyes\n{{END_IF}}\n{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}", data: D, want: OUT("1. a\nyes\n2. b\nyes"), opts: {"standaloneLines":true} },
  { name: "the standalone rule applies to a FOR line around a generated LIST", tpl: "x\n{{FOR ys AS y}}\n{{LIST}}\n{{LIST_ITEM}}${{y}}{{END_LIST_ITEM}}\n{{END_LIST}}\n{{END_FOR}}\ny", data: D, want: OUT("x\n1. p\n1. q\ny"), opts: {"standaloneLines":true} },
];

const COMPAT_ROWS: Row[] = [
  { name: "TABLE FOR with a ROW body and a header", tpl: "{{TABLE}}{{HEADER}}N|T{{END_HEADER}}{{FOR ps AS p}}{{ROW}}${{p}}|${{@index0}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"ps":["Ann","Bo"]} }, want: OUT("| N | T |\n|:-----|:-----|\n| Ann | 0 |\n| Bo | 1 |") },
  { name: "TABLE FOR with a text body", tpl: "{{TABLE}}{{FOR xs AS x}}${{x}}|${{@index0}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "TABLE FOR with a text body of several lines", tpl: "{{TABLE}}{{FOR xs AS x}}${{x}}|1\n${{x}}|2\n{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| a | 2 |\n| b | 1 |\n| b | 2 |\n| c | 1 |\n| c | 2 |") },
  { name: "TABLE FOR with an IF of text in its body", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x == \"y\"}}Y|y{{ELSE}}${{x}}|o{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"xs":["x","y","z"]} }, want: OUT("| x | o |\n| Y | y |\n| z | o |") },
  { name: "TABLE FOR with an IF of text and an ELSEIF", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x == \"x\"}}X|1{{ELSEIF x == \"y\"}}Y|2{{ELSE}}${{x}}|3{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"xs":["x","y","z"]} }, want: OUT("| X | 1 |\n| Y | 2 |\n| z | 3 |") },
  { name: "TABLE with two FORs", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|a{{END_ROW}}{{END_FOR}}{{FOR ps AS p}}{{ROW}}${{p}}|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"ps":["Ann","Bo"]} }, want: OUT("| a | a |\n| b | a |\n| c | a |\n| Ann | b |\n| Bo | b |") },
  { name: "TABLE FOR with several ROWs in the body", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ROW}}${{x}}|2{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| a | 2 |\n| b | 1 |\n| b | 2 |\n| c | 1 |\n| c | 2 |") },
  { name: "TABLE FOR with a ROW and text in the body", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}${{x}}|2{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| a | 2 |\n| b | 1 |\n| b | 2 |\n| c | 1 |\n| c | 2 |") },
  { name: "TABLE FOR over a non-iterable object is silent in every mode", tpl: "{{TABLE}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("") },
  { name: "TABLE FOR over null is silent in every mode", tpl: "{{TABLE}}{{FOR nul AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("") },
  { name: "TABLE FOR over a missing name: strict error, lenient nothing", tpl: "{{TABLE}}{{FOR nope AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: SL(ERR("missing-variable", 1, 10, "Variable 'nope' not found"), OUT("")) },
  { name: "TABLE FOR over an iterable with extra spaces in the tag", tpl: "{{TABLE}}{{FOR  xs  AS  m }}{{ROW}}${{m}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a |\n| b |\n| c |") },
  { name: "TABLE with spaces in header and row cells", tpl: "{{TABLE}}{{HEADER}} A | B {{END_HEADER}}{{ROW}} 1 | 2 {{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "TABLE FOR nested FOR in a text body", tpl: "{{TABLE}}{{FOR ps AS p}}${{p}}|{{FOR ys AS y}}a${{p}}{{END_FOR}}|b{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"ps":["Ann"]} }, want: OUT("| Ann |  |\n| aAnnaAnn |  |\n|  | b |") },
  { name: "TABLE with an unclosed ROW before the next ROW", tpl: "{{TABLE}}{{ROW}}a|b{{ROW}}c|d{{END_TABLE}}", data: D, want: OUT("| a | b |\n| c | d |") },
  { name: "TABLE with unclosed rows and a header and different widths", tpl: "{{TABLE}}{{HEADER}}H1|H2{{END_HEADER}}{{ROW}}a{{ROW}}c|d|e{{END_TABLE}}", data: D, want: OUT("| H1 | H2 |  |\n|:-----|:-----|:-----|\n| a |  |  |\n| c | d | e |") },
  { name: "TABLE with a header only", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|") },
  { name: "TABLE FOR with an unclosed ROW ends the ROW at END_FOR", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |") },
  { name: "a LIST with conditions and fallbacks", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM t}}b{{END_LIST_ITEM}}{{LIST_ITEM f}}c{{END_LIST_ITEM}}{{LIST_ITEM f | fallback=\"fb\"}}d{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. fb") },
  { name: "a LIST with a missing condition name", tpl: "{{LIST}}{{LIST_ITEM nope}}a{{END_LIST_ITEM}}{{LIST_ITEM nope | fallback=\"fb\"}}b{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. fb") },
  { name: "a LIST with an unclosed item before the next item", tpl: "{{LIST}}{{LIST_ITEM}}a{{LIST_ITEM}}b{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "a LIST with three unclosed items", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM}}b{{LIST_ITEM}}c{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "a nested LIST", tpl: "{{LIST}}{{LIST_ITEM}}p{{LIST}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. c") },
  { name: "a nested LIST in an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}p{{LIST}}{{LIST_ITEM}}c1{{LIST_ITEM}}c2{{END_LIST}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. c1\n   2. c2") },
  { name: "a LIST with empty and multi-line items", tpl: "{{LIST}}{{LIST_ITEM}}{{END_LIST_ITEM}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{LIST_ITEM}}\nline1\nline2{{END_LIST_ITEM}}{{LIST_ITEM}}  a b  {{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. \n2. b\n3. line1\nline2\n4. a b") },
  { name: "a LIST item whose content is a FOR", tpl: "{{LIST}}{{LIST_ITEM}}{{FOR xs AS x}}${{x}},{{END_FOR}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a,b,c,") },
  { name: "a LIST item whose content is an IF", tpl: "{{LIST}}{{LIST_ITEM}}{{IF t}}Y{{ELSE}}N{{END_IF}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. Y") },
  { name: "an unclosed LIST item whose content is a FOR", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. aabc") },
  { name: "an unclosed LIST item whose content is an IF", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}Y{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. aY") },
  { name: "an unclosed LIST item with a FOR content followed by an item", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}${{x}}{{END_FOR}}{{LIST_ITEM}}b{{END_LIST}}", data: D, want: OUT("1. aabc\n2. b") },
  { name: "a LIST inside a FOR", tpl: "{{FOR xs AS x}}{{LIST}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_LIST}}{{END_FOR}}", data: D, want: OUT("1. a1. b1. c") },
  { name: "a LIST inside an IF", tpl: "{{IF t}}{{LIST}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{END_LIST}}{{END_IF}}", data: D, want: OUT("1. Y") },
  { name: "text directly in a LIST is a syntax error at the text", tpl: "{{LIST}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 9, "Unexpected text in LIST: \"hi\"") },
  { name: "a SECTION directly in a LIST is a syntax error", tpl: "{{LIST}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 9, "Unexpected token in LIST: SECTION") },
  { name: "a ROW directly in a LIST is a syntax error", tpl: "{{LIST}}{{ROW}}a|1{{END_ROW}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 9, "Unexpected token in LIST: ROW") },
  { name: "a LIST_ITEM directly in a TABLE is a syntax error", tpl: "{{TABLE}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_TABLE}}", data: D, want: ERR("syntax-error", 1, 10, "Unexpected token in TABLE: LIST_ITEM") },
  { name: "an IF holding a ROW in a FOR outside any TABLE is unchanged", tpl: "{{FOR xs AS x}}{{IF t}}{{ROW}}${{x}}|1{{END_ROW}}{{END_IF}}{{END_FOR}}", data: D, want: OUT("") },
  { name: "a FOR with rows in a LIST_ITEM content", tpl: "{{LIST}}{{LIST_ITEM}}{{FOR xs AS x}}{{TABLE}}{{ROW}}${{x}}|1{{END_ROW}}{{END_TABLE}}{{END_FOR}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. | a | 1 || b | 1 || c | 1 |") },
  { name: "a TABLE inside a LIST item", tpl: "{{LIST}}{{LIST_ITEM}}t{{TABLE}}{{ROW}}a|1{{END_ROW}}{{END_TABLE}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. t| a | 1 |") },
  { name: "a FOR with an ELSE and a window outside lists", tpl: "{{FOR xs AS x limit=2}}${{x}},{{ELSE}}none{{END_FOR}}", data: D, want: OUT("a,b,") },
];

const PIPE_ROWS: Row[] = [
  { name: "0 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|b"} }, want: OUT("| a\\|b | x |") },
  { name: "1 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\|b"} }, want: OUT("| a\\|b | x |") },
  { name: "2 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "3 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "4 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\\\|b"} }, want: OUT("| a\\\\\\\\\\|b | x |") },
  { name: "5 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\\\\\|b"} }, want: OUT("| a\\\\\\\\\\|b | x |") },
  { name: "6 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\\\\\\\|b"} }, want: OUT("| a\\\\\\\\\\\\\\|b | x |") },
  { name: "a pipe at the start of a value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"|a"} }, want: OUT("| \\|a | x |") },
  { name: "a pipe at the end of a value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|"} }, want: OUT("| a\\| | x |") },
  { name: "two backslashes then a pipe at the end of a value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"ab\\\\|"} }, want: OUT("| ab\\\\\\| | x |") },
  { name: "a pipe after two backslashes at the start of a cell value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a \\\\|"} }, want: OUT("| a \\\\\\| | x |") },
  { name: "several pipes with mixed runs", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|b\\\\|c\\|d\\\\\\\\|e"} }, want: OUT("| a\\|b\\\\\\|c\\|d\\\\\\\\\\|e | x |") },
  { name: "a value with a newline before the pipe", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\nb\\\\|c"} }, want: OUT("| a b\\\\\\|c | x |") },
  { name: "a run of backslashes split across two values", tpl: "{{TABLE}}{{ROW}}${{v}}${{w}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\","w":"|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "an odd run split across two values", tpl: "{{TABLE}}{{ROW}}${{v}}${{w}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\","w":"|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "two backslashes before a pipe in the second cell", tpl: "{{TABLE}}{{ROW}}k|${{v}}{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| k | a\\\\\\|b |") },
  { name: "two backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:------|:-----|\n| 1 | 2 |") },
  { name: "three backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:------|:-----|\n| 1 | 2 |") },
  { name: "no backslash before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|b"} }, want: OUT("| a\\|b | h |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "a pipe after two backslashes in a generated row of an IF", tpl: "{{TABLE}}{{IF t}}{{FOR vs AS v}}{{ROW}}${{v}}|x{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"vs":["a\\\\|b","a\\\\\\|b","a|b","a\\|b","a\\\\\\\\|b"]} }, want: OUT("| a\\\\\\|b | x |\n| a\\\\\\|b | x |\n| a\\|b | x |\n| a\\|b | x |\n| a\\\\\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a row of a direct TABLE FOR", tpl: "{{TABLE}}{{FOR vs AS v}}{{ROW}}${{v}}|x{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"vs":["a\\\\|b","a\\\\\\|b"]} }, want: OUT("| a\\\\\\|b | x |\n| a\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a row from an IF branch", tpl: "{{TABLE}}{{IF f}}{{ROW}}n|n{{END_ROW}}{{ELSE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a row from a FOR with a window", tpl: "{{TABLE}}{{IF t}}{{FOR vs AS v limit=1 offset=1}}{{ROW}}${{v}}|${{@total}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"vs":["z","a\\\\|b","y"]} }, want: OUT("| a\\\\\\|b | 1 |") },
  { name: "a pipe after two backslashes in a cell that holds an IF", tpl: "{{TABLE}}{{ROW}}{{IF t}}${{v}}{{END_IF}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a header cell of a table with generated rows", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:------|:-----|\n| a | 1 |") },
  { name: "a pipe after two backslashes in a list item is left as written (not a table cell)", tpl: "{{LIST}}{{LIST_ITEM}}${{v}}{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("1. a\\\\|b") },
  { name: "a pipe after two backslashes in plain text is left as written", tpl: "${{v}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("a\\\\|b") },
];

const SYNTAX_ROWS: SynRow[] = [
  { name: "text in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "text after an item in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}tail{{END_FOR}}{{END_LIST}}", line: 1, col: 55, has: "Unexpected" },
  { name: "an output tag in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}${{x}}{{END_FOR}}{{END_LIST}}", line: 1, col: 55, has: "Unexpected" },
  { name: "a SECTION in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{SECTION \"S\"}}x{{END_SECTION}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a ROW in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a HEADER in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{HEADER}}a{{END_HEADER}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a nested LIST in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a stray END_LIST_ITEM in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 55, has: "Unexpected" },
  { name: "text in the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}none{{END_FOR}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "a tag in the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}${{y}}{{END_FOR}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "text in an IF branch that builds items", tpl: "{{LIST}}{{IF t}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 17, has: "Unexpected" },
  { name: "text in an ELSEIF branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSEIF f}}hi{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 60, has: "Unexpected" },
  { name: "text in an ELSE branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}hi{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 56, has: "Unexpected" },
  { name: "an output tag in an IF branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}${{x}}{{END_IF}}{{END_LIST}}", line: 1, col: 48, has: "Unexpected" },
  { name: "a ROW in an ELSE branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_LIST}}", line: 1, col: 56, has: "Unexpected" },
  { name: "a SECTION in an ELSEIF branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSEIF f}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_IF}}{{END_LIST}}", line: 1, col: 60, has: "Unexpected" },
  { name: "text in an IF inside a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}oops{{END_IF}}{{END_FOR}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "text in a FOR inside an IF inside a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{IF t}}{{FOR ys AS y}}oops{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", line: 1, col: 47, has: "Unexpected" },
  { name: "text in a branch that never renders", tpl: "{{LIST}}{{IF f}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}hi{{END_FOR}}{{END_IF}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "a ROW in a FOR with no items", tpl: "{{LIST}}{{FOR empty AS x}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_LIST}}", line: 1, col: 27, has: "Unexpected" },
  { name: "text in a LIST FOR inside an item's content of a nested list is still reported", tpl: "{{LIST}}{{LIST_ITEM}}p{{LIST}}{{FOR xs AS x}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}", line: 1, col: 46, has: "Unexpected" },
  { name: "text in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}hi{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "text after a row in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}tail{{END_IF}}{{END_TABLE}}", line: 1, col: 39, has: "Unexpected" },
  { name: "an output tag in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}${{x}}{{END_IF}}{{END_TABLE}}", line: 1, col: 39, has: "Unexpected" },
  { name: "a LIST_ITEM in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "a HEADER in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{HEADER}}A|B{{END_HEADER}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "a HEADER in an ELSE that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{HEADER}}A|B{{END_HEADER}}{{END_IF}}{{END_TABLE}}", line: 1, col: 47, has: "Unexpected" },
  { name: "a HEADER in a FOR in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{HEADER}}A|B{{END_HEADER}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 33, has: "Unexpected" },
  { name: "a SECTION in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "text in an ELSEIF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSEIF f}}hi{{END_IF}}{{END_TABLE}}", line: 1, col: 51, has: "Unexpected" },
  { name: "text in an ELSE that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}hi{{END_IF}}{{END_TABLE}}", line: 1, col: 47, has: "Unexpected" },
  { name: "text in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}hi{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 33, has: "Unexpected" },
  { name: "an output tag in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}${{x}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 54, has: "Unexpected" },
  { name: "text in the ELSE of a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{ELSE}}none{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 62, has: "Unexpected" },
  { name: "a LIST_ITEM in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 33, has: "Unexpected" },
  { name: "text in an IF inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{IF t}}{{ROW}}a|1{{END_ROW}}oops{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 62, has: "Unexpected" },
  { name: "text in an IF that builds rows that never renders", tpl: "{{TABLE}}{{IF f}}hi{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "text in a FOR inside an IF that builds rows with no items", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}hi{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 36, has: "Unexpected" },
  { name: "a second ELSE in an IF that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 87 },
  { name: "a second ELSE in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{ELSE}}{{ROW}}c|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 68 },
  { name: "a second ELSE in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 94 },
  { name: "a second ELSE in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{ELSE}}{{ROW}}c|3{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 83 },
  { name: "an ELSEIF after the ELSE of an IF that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSEIF f}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 87 },
  { name: "an ELSEIF after the ELSE of an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{ELSEIF f}}{{ROW}}c|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 68 },
  { name: "an ELSEIF directly in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSEIF f}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 55 },
  { name: "an ELSEIF after the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSEIF f}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 94 },
  { name: "an END_FOR that closes an IF that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 48 },
  { name: "an END_IF that closes a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 55 },
  { name: "an END_FOR that closes an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", line: 1, col: 39 },
  { name: "an END_IF that closes a FOR in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_IF}}{{END_TABLE}}", line: 1, col: 54 },
  { name: "an END_IF with no IF in a LIST", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 40 },
  { name: "an END_FOR with no FOR in a TABLE", tpl: "{{TABLE}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", line: 1, col: 31 },
  { name: "text directly in a LIST keeps its message", tpl: "{{LIST}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", line: 1, col: 9, has: "Unexpected text in LIST" },
  { name: "a SECTION directly in a LIST keeps its message", tpl: "{{LIST}}{{SECTION \"S\"}}x{{END_SECTION}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", line: 1, col: 9, has: "Unexpected token in LIST" },
  { name: "a ROW directly in a LIST keeps its message", tpl: "{{LIST}}{{ROW}}a|1{{END_ROW}}{{END_LIST}}", line: 1, col: 9, has: "Unexpected token in LIST" },
  { name: "a LIST_ITEM directly in a TABLE keeps its message", tpl: "{{TABLE}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_TABLE}}", line: 1, col: 10, has: "Unexpected token in TABLE" },
  { name: "a SECTION directly in a TABLE keeps its message", tpl: "{{TABLE}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_TABLE}}", line: 1, col: 10, has: "Unexpected token in TABLE" },
];

const ANALYZE_ROWS: AnalyzeRow[] = [
  { name: "a FOR in a LIST: the loop name is scoped over the item and its condition", tpl: "{{LIST}}{{FOR xs AS x limit=n}}{{LIST_ITEM x.ok | fallback=\"f\"}}${{x.name}} ${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", usedIn: {"xs":["for"],"n":["for"],"y":["output"]}, blocks: {"LIST":1,"FOR":1} },
  { name: "an IF in a LIST: conditions and items", tpl: "{{LIST}}{{IF a}}{{LIST_ITEM}}${{p}}{{END_LIST_ITEM}}{{ELSEIF b}}{{LIST_ITEM c}}${{q}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{r}}{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", usedIn: {"a":["if"],"b":["elseif"],"c":["list_item"],"p":["output"],"q":["output"],"r":["output"]}, blocks: {"LIST":1,"IF":1} },
  { name: "an IF in a TABLE: conditions and cells", tpl: "{{TABLE}}{{IF a}}{{ROW}}${{p}}|${{q}}{{END_ROW}}{{ELSE}}{{ROW}}${{r}}{{END_ROW}}{{END_IF}}{{END_TABLE}}", usedIn: {"a":["if"],"p":["table"],"q":["table"],"r":["table"]}, blocks: {"TABLE":1,"IF":1} },
  { name: "a FOR in an IF in a TABLE: iterable, window and cells", tpl: "{{TABLE}}{{HEADER}}${{h}}|B{{END_HEADER}}{{IF a}}{{FOR ps AS p limit=n offset=m}}{{ROW}}${{p.name}}|${{k}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", usedIn: {"h":["table"],"a":["if"],"ps":["for"],"n":["for"],"m":["for"],"k":["table"]}, blocks: {"TABLE":1,"IF":1,"FOR":1} },
  { name: "the loop name is not scoped in the ELSE items of a FOR in a LIST", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", usedIn: {"xs":["for"],"x":["output"]}, blocks: {"LIST":1,"FOR":1} },
  { name: "the loop name is not scoped in the ELSE rows of a FOR in an IF in a TABLE", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}${{x}}|2{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", usedIn: {"t":["if"],"xs":["for"],"x":["table"]}, blocks: {"TABLE":1,"IF":1,"FOR":1} },
  { name: "a nested FOR reads the outer loop name in its iterable", tpl: "{{LIST}}{{FOR ys AS y}}{{FOR y.items AS i}}{{LIST_ITEM}}${{y.name}}${{i}}${{z}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", usedIn: {"ys":["for"],"z":["output"]}, blocks: {"LIST":1,"FOR":2} },
  { name: "an inner loop name is scoped in an IF inside a FOR inside a LIST", tpl: "{{LIST}}{{FOR xs AS x}}{{IF x.on}}{{LIST_ITEM x.show}}${{x.name}}${{w}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", usedIn: {"xs":["for"],"w":["output"]}, blocks: {"LIST":1,"FOR":1,"IF":1} },
  { name: "a variable read only in a generated item is an input", tpl: "{{LIST}}{{IF a}}{{FOR xs AS x}}{{LIST_ITEM}}${{only_here}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", usedIn: {"a":["if"],"xs":["for"],"only_here":["output"]}, blocks: {"LIST":1,"IF":1,"FOR":1} },
  { name: "the same name used as condition and item output lists both kinds", tpl: "{{LIST}}{{IF a}}{{LIST_ITEM}}${{a}}{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM a}}z{{END_LIST_ITEM}}{{END_LIST}}", usedIn: {"a":["if","list_item","output"]}, blocks: {"LIST":1,"IF":1} },
  { name: "the same name used as an IF condition and cell in a TABLE lists both kinds", tpl: "{{TABLE}}{{IF a}}{{ROW}}${{a}}|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", usedIn: {"a":["if","table"]}, blocks: {"TABLE":1,"IF":1} },
  { name: "a FOR directly in a TABLE with a text body keeps its kinds", tpl: "{{TABLE}}{{FOR ps AS p limit=n}}${{p}}|${{q}}{{END_FOR}}{{END_TABLE}}", usedIn: {"ps":["for"],"n":["for"],"q":["table"]}, blocks: {"TABLE":1,"FOR":1} },
  { name: "a FOR directly in a TABLE with a ROW body keeps its kinds", tpl: "{{TABLE}}{{FOR ps AS p}}{{ROW}}${{p}}|${{q}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", usedIn: {"ps":["for"],"q":["table"]}, blocks: {"TABLE":1,"FOR":1} },
```

Truncated: showing the first 98074 of 119288 bytes (section cap 98304 bytes).

## 4. Diff

9 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index effcb96..c56a91c 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -147,7 +147,9 @@ class Walker {
         return this.visitFor(node as ForNode);
       case "List":
         this.countBlock("LIST");
-        return (node as ListNode).items.forEach((i) => this.visitListItem(i));
+        return this.visitAll((node as ListNode).items);
+      case "ListItem":
+        return this.visitListItem(node as ListItemNode);
       case "Table":
         this.countBlock("TABLE");
         return this.visitTable(node as TableNode);
@@ -260,7 +262,12 @@ class Walker {
 
   private visitTable(node: TableNode): void {
     if (node.header) this.visitCells(node.header);
-    for (const row of node.rows) this.visitCells(row);
+    for (const row of node.rows) {
+      // a FOR written directly in a TABLE reads its body as table cells
+      this.tableDepth++;
+      this.visit(row);
+      this.tableDepth--;
+    }
   }
 
   private visitCells(node: TableHeaderNode | TableRowNode): void {
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 6d1614d..1c7a04d 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -9,6 +9,7 @@ import {
   ListNode,
   ListItemNode,
   TableNode,
+  TableChild,
   TableRowNode,
   TernaryNode,
   SectionNode,
@@ -261,17 +262,25 @@ export class Interpreter {
    * Visit IF node
    */
   private visitIf(node: IfNode): string {
+    return this.visitBody(this.selectBranch(node));
+  }
+
+  /**
+   * The body an IF chain runs: the first branch whose condition holds, else
+   * the ELSE body, else nothing
+   */
+  private selectBranch(node: IfNode): ASTNode[] {
     let branch = node;
     for (;;) {
       const current = branch;
       const result = this.at(current, () =>
         evaluateCondition(current.condition, this.scope)
       );
-      if (result) return this.visitBody(current.consequent);
+      if (result) return current.consequent;
 
       const { alternate } = current;
-      if (!alternate) return "";
-      if (Array.isArray(alternate)) return this.visitBody(alternate);
+      if (!alternate) return [];
+      if (Array.isArray(alternate)) return alternate;
       branch = alternate;
     }
   }
@@ -492,29 +501,54 @@ export class Interpreter {
    * Visit LIST node
    */
   private visitList(node: ListNode, depth = 0): string {
-    const indent = "   ".repeat(depth); // 3 spaces per level
-    let counter = 1;
-    const results: string[] = [];
+    const lines: string[] = [];
+    this.collectListItems(node.items, depth, lines);
+    return lines.join("\n");
+  }
 
-    for (const item of node.items) {
-      const output = this.visitListItem(item, counter, depth);
-      if (output !== null) {
-        results.push(`${indent}${counter}. ${output}`);
-        counter++;
+  /**
+   * Add the numbered lines of LIST children: an item gives its line, an IF
+   * the lines of its branch, a FOR the lines of each iteration (or of its
+   * ELSE body). The numbering follows the lines already collected for this
+   * LIST, so items from any source share one counter. Returns the characters
+   * the lines hold.
+   */
+  private collectListItems(
+    children: ASTNode[],
+    depth: number,
+    lines: string[]
+  ): number {
+    const indent = "   ".repeat(depth); // 3 spaces per level
+    let length = 0;
+    for (const child of children) {
+      if (child.type === "ListItem") {
+        const output = this.visitListItem(child as ListItemNode, depth);
+        if (output !== null) {
+          const line = `${indent}${lines.length + 1}. ${output}`;
+          lines.push(line);
+          length += line.length;
+        }
+      } else if (child.type === "If") {
+        length += this.collectListItems(
+          this.selectBranch(child as IfNode),
+          depth,
+          lines
+        );
+      } else if (child.type === "For") {
+        this.runLoop(child as ForNode, false, (nodes) => {
+          const added = this.collectListItems(nodes, depth, lines);
+          length += added;
+          return added;
+        });
       }
     }
-
-    return results.join("\n");
+    return length;
   }
 
   /**
    * Visit LIST_ITEM node
    */
-  private visitListItem(
-    node: ListItemNode,
-    counter: number,
-    depth: number
-  ): string | null {
+  private visitListItem(node: ListItemNode, depth: number): string | null {
     // Check condition
     if (node.condition) {
       const condition = node.condition;
@@ -553,24 +587,8 @@ export class Interpreter {
       rows.push(headerCells);
     }
 
-    // Process rows (may include FOR loops)
-    for (const rowNode of node.rows) {
-      // Check if this row contains a FOR loop
-      if (
-        rowNode.cells.length === 1 &&
-        rowNode.cells[0].length === 1 &&
-        rowNode.cells[0][0].type === "For"
-      ) {
-        const forNode = rowNode.cells[0][0] as ForNode;
-
-        // Generate rows with the loop runner
-        this.runLoop(forNode, true, (nodes) => this.tableRowsFrom(nodes, rows));
-      } else {
-        // Regular row - process all cells
-        const cells = this.processCellsArray(rowNode.cells);
-        rows.push(cells);
-      }
-    }
+    // Process rows (ROW, FOR and IF blocks, in source order)
+    for (const child of node.rows) this.rowsFromChild(child, rows);
 
     // Auto-pad rows to match header length
     const maxCols = Math.max(...rows.map((r) => r.length));
@@ -620,8 +638,33 @@ export class Interpreter {
   }
 
   /**
-   * Render the nodes of a FOR body in a TABLE into rows: a ROW node gives its
-   * cells, and a run of other nodes is rendered together and split on a pipe.
+   * Add the rows a TABLE child builds: a ROW gives its cells, an IF the rows
+   * of its branch, a FOR the rows of each iteration (or of its ELSE body). A
+   * TABLE never errors on the iterable of a FOR that builds rows.
+   * Returns the characters the rows hold.
+   */
+  private rowsFromChild(child: TableChild, rows: string[][]): number {
+    if (child.type === "For") {
+      let length = 0;
+      this.runLoop(child, true, (nodes) => {
+        const added = this.tableRowsFrom(nodes, rows);
+        length += added;
+        return added;
+      });
+      return length;
+    }
+    if (child.type === "If") {
+      return this.tableRowsFrom(this.selectBranch(child), rows);
+    }
+    const cells = this.processCellsArray(child.cells);
+    rows.push(cells);
+    return cells.reduce((sum, cell) => sum + cell.length, 0);
+  }
+
+  /**
+   * Render the nodes of a FOR or IF body in a TABLE into rows: a ROW node gives its
+   * cells, an IF or FOR that holds a ROW builds rows too, and a run of other
+   * nodes is rendered together and split on a pipe.
    * Returns the characters the rows hold.
    */
   private tableRowsFrom(nodes: ASTNode[], rows: string[][]): number {
@@ -651,6 +694,9 @@ export class Interpreter {
       if (bodyNode.type === "TableRow") {
         flush();
         add(this.processCellsArray((bodyNode as TableRowNode).cells));
+      } else if (holdsRow(bodyNode)) {
+        flush();
+        length += this.rowsFromChild(bodyNode as TableChild, rows);
       } else if (inline.includes(bodyNode.type)) {
         run.push(bodyNode);
       } else {
@@ -669,7 +715,12 @@ export class Interpreter {
   private processCellsArray(cells: ASTNode[][]): string[] {
     return cells.map((cellNodes) => {
       const content = cellNodes.map((node) => this.visit(node)).join("");
-      return content.replace(/\r?\n/g, " ").replace(/(?<!\\)\|/g, "\\|").trim();
+      return content
+        .replace(/\r?\n/g, " ")
+        .replace(/(\\*)\|/g, (found, slashes: string) =>
+          slashes.length % 2 === 0 ? `${slashes}\\|` : found
+        )
+        .trim();
     });
   }
 
@@ -801,6 +852,28 @@ export class Interpreter {
   }
 }
 
+/**
+ * True for an IF or FOR that holds a ROW directly in one of its branches or
+ * bodies, through nested IF and FOR: it builds table rows
+ */
+function holdsRow(node: ASTNode): boolean {
+  const holds = (nodes: ASTNode[]): boolean =>
+    nodes.some((child) => child.type === "TableRow" || holdsRow(child));
+  if (node.type === "For") {
+    const { body, elseBody } = node as ForNode;
+    return holds(body) || (elseBody !== undefined && holds(elseBody));
+  }
+  if (node.type !== "If") return false;
+  let branch: IfNode | null = node as IfNode;
+  while (branch) {
+    if (holds(branch.consequent)) return true;
+    const alternate: ASTNode[] | IfNode | null = branch.alternate;
+    if (Array.isArray(alternate)) return holds(alternate);
+    branch = alternate;
+  }
+  return false;
+}
+
 /**
  * The value as JSON, or its plain string form when JSON cannot hold it
  * (a cycle, a BigInt)
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 2b5c9b8..04cfcc3 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -12,8 +12,10 @@ import {
   ForNode,
   ForWindowArg,
   ListNode,
+  ListChild,
   ListItemNode,
   TableNode,
+  TableChild,
   TableHeaderNode,
   TableRowNode,
   CommentNode,
@@ -31,6 +33,9 @@ import { parseWhenMatch } from "./expressions";
 const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
 const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
 
+/** Parses one child of a block body; null for a child that leaves no node */
+type ChildParser = () => ASTNode | null;
+
 /**
  * Parser: Builds Abstract Syntax Tree from tokens
  *
@@ -40,6 +45,8 @@ export class Parser {
   private pos = 0;
   private depth = 0;
   private nodes = 0;
+  /** How many LIST_ITEM contents the parser is inside */
+  private itemDepth = 0;
   private readonly maxDepth: number;
   private readonly maxNodes: number;
 
@@ -105,16 +112,30 @@ export class Parser {
         return this.parseComment();
       case TokenType.EOF:
         return null;
+      case TokenType.LIST_ITEM:
+        if (this.itemDepth > 0) {
+          throw new SyntaxError(
+            "A {{LIST_ITEM}} cannot sit inside the content of another item",
+            token.line,
+            token.column,
+            "Close the item with {{END_LIST_ITEM}} before the FOR or IF that builds items"
+          );
+        }
+        return this.unexpectedToken(token);
       default:
-        throw new SyntaxError(
-          `Unexpected token: ${token.type}`,
-          token.line,
-          token.column,
-          "Check template syntax"
-        );
+        return this.unexpectedToken(token);
     }
   }
 
+  private unexpectedToken(token: Token): never {
+    throw new SyntaxError(
+      `Unexpected token: ${token.type}`,
+      token.line,
+      token.column,
+      "Check template syntax"
+    );
+  }
+
   /**
    * Parse a block one level deeper, rejecting it at its opening tag when the
    * nesting would exceed maxDepth
@@ -261,15 +282,15 @@ export class Parser {
    * ELSEIF branches nest in the alternate of the branch before them and are
    * parsed in a loop, so a long chain does not deepen the call stack.
    */
-  private parseIf(): IfNode {
-    const root = this.parseIfBranch(TokenType.IF);
+  private parseIf(child: ChildParser = () => this.parseNode()): IfNode {
+    const root = this.parseIfBranch(TokenType.IF, child);
     let last = root;
     while (this.check(TokenType.ELSEIF)) {
-      const branch = this.parseIfBranch(TokenType.ELSEIF);
+      const branch = this.parseIfBranch(TokenType.ELSEIF, child);
       last.alternate = branch;
       last = branch;
     }
-    if (this.check(TokenType.ELSE)) last.alternate = this.parseElse(last);
+    if (this.check(TokenType.ELSE)) last.alternate = this.parseElse(last, child);
 
     this.consume(TokenType.END_IF);
     return root;
@@ -279,7 +300,10 @@ export class Parser {
    * Parse the head and body of an IF or ELSEIF branch, up to the next
    * ELSEIF, ELSE or END_IF
    */
-  private parseIfBranch(type: TokenType.IF | TokenType.ELSEIF): IfNode {
+  private parseIfBranch(
+    type: TokenType.IF | TokenType.ELSEIF,
+    child: ChildParser
+  ): IfNode {
     const token = this.open(type);
     const consequent: ASTNode[] = [];
 
@@ -298,7 +322,7 @@ export class Parser {
           "Add {{END_IF}}"
         );
       }
-      const node = this.parseNode();
+      const node = child();
       if (node) consequent.push(node);
     }
 
@@ -315,7 +339,7 @@ export class Parser {
   /**
    * Parse the ELSE body of a branch, up to END_IF
    */
-  private parseElse(branch: IfNode): ASTNode[] {
+  private parseElse(branch: IfNode, child: ChildParser): ASTNode[] {
     this.consume(TokenType.ELSE);
     const body: ASTNode[] = [];
     while (!this.check(TokenType.END_IF)) {
@@ -327,7 +351,7 @@ export class Parser {
           "Add {{END_IF}}"
         );
       }
-      const node = this.parseNode();
+      const node = child();
       if (node) body.push(node);
     }
     return body;
@@ -480,7 +504,7 @@ export class Parser {
    * An {{ELSE}} directly in the body starts the branch that renders when no
    * item does; an IF inside the body parses its own ELSE.
    */
-  private parseFor(): ForNode {
+  private parseFor(child: ChildParser = () => this.parseNode()): ForNode {
     const token = this.open(TokenType.FOR);
     const header = this.parseForHeader(token);
 
@@ -508,7 +532,7 @@ export class Parser {
         elseBody = [];
         continue;
       }
-      const node = this.parseNode();
+      const node = child();
       if (node) (elseBody ?? body).push(node);
     }
 
@@ -744,10 +768,11 @@ export class Parser {
 
   /**
    * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
+   * Its children are items, and FOR and IF blocks that build items.
    */
   private parseList(): ListNode {
     const token = this.open(TokenType.LIST);
-    const items: ListItemNode[] = [];
+    const items: ListChild[] = [];
 
     while (!this.check(TokenType.END_LIST)) {
       if (this.isAtEnd()) {
@@ -758,30 +783,8 @@ export class Parser {
           "Add {{END_LIST}}"
         );
       }
-
-      if (this.check(TokenType.LIST_ITEM)) {
-        items.push(this.parseListItem());
-      } else if (this.check(TokenType.TEXT)) {
-        // Skip whitespace text between list items
-        const textToken = this.current();
-        if (textToken.value.trim() !== "") {
-          throw new SyntaxError(
-            `Unexpected text in LIST: "${textToken.value.trim()}"`,
-            textToken.line,
-            textToken.column,
-            "LIST should only contain {{LIST_ITEM}}"
-          );
-        }
-        this.advance(); // Skip whitespace
-      } else {
-        const unexpected = this.current();
-        throw new SyntaxError(
-          `Unexpected token in LIST: ${unexpected.type}`,
-          unexpected.line,
-          unexpected.column,
-          "Expected {{LIST_ITEM}}"
-        );
-      }
+      const child = this.parseListChild();
+      if (child) items.push(child as ListChild);
     }
 
     this.consume(TokenType.END_LIST);
@@ -795,7 +798,46 @@ export class Parser {
   }
 
   /**
-   * Parse LIST_ITEM
+   * Parse one child of a LIST, or of a FOR or IF that builds items: an item,
+   * a FOR, an IF, a comment or whitespace; anything else is a syntax error at
+   * its own token
+   */
+  private parseListChild(): ASTNode | null {
+    const token = this.current();
+    switch (token.type) {
+      case TokenType.LIST_ITEM:
+        return this.parseListItem();
+      case TokenType.FOR:
+        return this.nested(() => this.parseFor(() => this.parseListChild()));
+      case TokenType.IF:
+        return this.nested(() => this.parseIf(() => this.parseListChild()));
+      case TokenType.COMMENT:
+        this.parseComment();
+        return null;
+      case TokenType.TEXT:
+        if (token.value.trim() !== "") {
+          throw new SyntaxError(
+            `Unexpected text in LIST: "${token.value.trim()}"`,
+            token.line,
+            token.column,
+            "LIST should only contain {{LIST_ITEM}}, {{FOR}} or {{IF}}"
+          );
+        }
+        this.advance(); // Skip whitespace
+        return null;
+      default:
+        throw new SyntaxError(
+          `Unexpected token in LIST: ${token.type}`,
+          token.line,
+          token.column,
+          "Expected {{LIST_ITEM}}, {{FOR}} or {{IF}}"
+        );
+    }
+  }
+
+  /**
+   * Parse LIST_ITEM. Without END_LIST_ITEM the item ends at the next item,
+   * END_LIST, or the closer or branch word of the FOR or IF around it.
    */
   private parseListItem(): ListItemNode {
     const token = this.open(TokenType.LIST_ITEM);
@@ -804,8 +846,16 @@ export class Parser {
     const { condition, fallback } = this.parseListItemAttributes(token.value);
 
     const content: ASTNode[] = [];
+    this.itemDepth++;
     while (!this.check(TokenType.END_LIST_ITEM)) {
-      if (this.check(TokenType.LIST_ITEM) || this.check(TokenType.END_LIST)) {
+      if (
+        this.check(TokenType.LIST_ITEM) ||
+        this.check(TokenType.END_LIST) ||
+        this.check(TokenType.END_FOR) ||
+        this.check(TokenType.ELSE) ||
+        this.check(TokenType.ELSEIF) ||
+        this.check(TokenType.END_IF)
+      ) {
         break;
       }
       if (this.isAtEnd()) {
@@ -819,6 +869,7 @@ export class Parser {
       const node = this.parseNode();
       if (node) content.push(node);
     }
+    this.itemDepth--;
 
     if (this.check(TokenType.END_LIST_ITEM)) {
       this.consume(TokenType.END_LIST_ITEM);
@@ -854,13 +905,16 @@ export class Parser {
 
   /**
    * Parse TABLE: {{TABLE}}{{HEADER}}...{{ROW}}...{{END_TABLE}}
+   * Its rows come from ROW, FOR and IF blocks. A FOR written directly in the
+   * TABLE keeps its generic body (a body that is not a ROW is split on a
+   * pipe when it runs); an IF holds rows only.
    */
   private parseTable(): TableNode {
     const token = this.open(TokenType.TABLE);
     const alignment = this.parseTableAlignment(token.value);
 
     let header: TableHeaderNode | null = null;
-    const rows: TableRowNode[] = [];
+    const rows: TableChild[] = [];
 
     while (!this.check(TokenType.END_TABLE)) {
       if (this.isAtEnd()) {
@@ -874,40 +928,13 @@ export class Parser {
 
       if (this.check(TokenType.HEADER)) {
         header = this.parseTableHeader();
-      } else if (this.check(TokenType.ROW)) {
-        rows.push(this.parseTableRow());
       } else if (this.check(TokenType.FOR)) {
-        // Allow FOR loops to generate rows
+        // A FOR generates rows; its body is parsed as in any FOR
         this.count(this.current());
-        const forNode = this.nested(() => this.parseFor());
-
-        // Wrap in a special TableRowNode
-        rows.push({
-          type: "TableRow",
-          cells: [[forNode]],
-          line: forNode.line,
-          column: forNode.column,
-        });
-      } else if (this.check(TokenType.TEXT)) {
-        // Skip whitespace text between rows
-        const textToken = this.current();
-        if (textToken.value.trim() !== "") {
-          throw new SyntaxError(
-            `Unexpected text in TABLE: "${textToken.value.trim()}"`,
-            textToken.line,
-            textToken.column,
-            "TABLE should only contain {{HEADER}}, {{ROW}}, or {{FOR}}"
-          );
-        }
-        this.advance(); // Skip whitespace
+        rows.push(this.nested(() => this.parseFor()));
       } else {
-        const unexpected = this.current();
-        throw new SyntaxError(
-          `Unexpected token in TABLE: ${unexpected.type}`,
-          unexpected.line,
-          unexpected.column,
-          "Expected {{HEADER}}, {{ROW}}, or {{FOR}}"
-        );
+        const child = this.parseRowChild();
+        if (child) rows.push(child as TableChild);
       }
     }
 
@@ -924,6 +951,44 @@ export class Parser {
     };
   }
 
+  /**
+   * Parse one child of a TABLE, or of an IF or FOR that builds rows: a ROW, a
+   * FOR, an IF, a comment or whitespace; anything else is a syntax error at
+   * its own token. A HEADER is only accepted by the TABLE itself.
+   */
+  private parseRowChild(): ASTNode | null {
+    const token = this.current();
+    switch (token.type) {
+      case TokenType.ROW:
+        return this.parseTableRow();
+      case TokenType.FOR:
+        return this.nested(() => this.parseFor(() => this.parseRowChild()));
+      case TokenType.IF:
+        return this.nested(() => this.parseIf(() => this.parseRowChild()));
+      case TokenType.COMMENT:
+        this.parseComment();
+        return null;
+      case TokenType.TEXT:
+        if (token.value.trim() !== "") {
+          throw new SyntaxError(
+            `Unexpected text in TABLE: "${token.value.trim()}"`,
+            token.line,
+            token.column,
+            "TABLE should only contain {{HEADER}}, {{ROW}}, {{FOR}} or {{IF}}"
+          );
+        }
+        this.advance(); // Skip whitespace
+        return null;
+      default:
+        throw new SyntaxError(
+          `Unexpected token in TABLE: ${token.type}`,
+          token.line,
+          token.column,
+          "Expected {{HEADER}}, {{ROW}}, {{FOR}} or {{IF}}"
+        );
+    }
+  }
+
   /**
    * Parse table alignment: {{TABLE align="left|center|right"}}
    */
@@ -968,7 +1033,8 @@ export class Parser {
   }
 
   /**
-   * Parse table row
+   * Parse table row. Without END_ROW the row ends at the next ROW,
+   * END_TABLE, or the closer or branch word of the FOR or IF around it.
    */
   private parseTableRow(): TableRowNode {
     const token = this.open(TokenType.ROW);
@@ -976,7 +1042,16 @@ export class Parser {
     const content: ASTNode[] = [];
 
     while (!this.check(TokenType.END_ROW)) {
-      if (this.check(TokenType.ROW) || this.check(TokenType.END_TABLE)) break;
+      if (
+        this.check(TokenType.ROW) ||
+        this.check(TokenType.END_TABLE) ||
+        this.check(TokenType.END_FOR) ||
+        this.check(TokenType.ELSE) ||
+        this.check(TokenType.ELSEIF) ||
+        this.check(TokenType.END_IF)
+      ) {
+        break;
+      }
       if (this.isAtEnd()) {
         throw new SyntaxError(
           "Unclosed {{ROW}} block",
diff --git a/core/src/spec.ts b/core/src/spec.ts
index 5566565..351adec 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -61,20 +61,22 @@ const BLOCKS: Spec["blocks"] = [
     name: "LIST",
     closes: "END_LIST",
     args: "",
-    description: "A numbered list of LIST_ITEM entries; lists nest",
+    description:
+      "A numbered list of LIST_ITEM entries; lists nest. FOR and IF (with ELSEIF and ELSE) inside it build items, numbered in one sequence",
   },
   {
     name: "LIST_ITEM",
     closes: "END_LIST_ITEM",
     args: '[condition] [| fallback="text"]',
     description:
-      "Inside LIST: one numbered item, skipped or replaced by its fallback when the condition is false",
+      "Inside LIST: one numbered item, skipped or replaced by its fallback when the condition is false. Without END_LIST_ITEM it ends at the next item, END_LIST, END_FOR, ELSE, ELSEIF or END_IF",
   },
   {
     name: "TABLE",
     closes: "END_TABLE",
     args: '[align="left|center|right"]',
-    description: "A markdown table of an optional HEADER and ROW or FOR-generated rows; align takes one alignment per column",
+    description:
+      "A markdown table of an optional HEADER and rows; ROW, FOR and IF (with ELSEIF and ELSE) build the rows, and align takes one alignment per column",
   },
   {
     name: "HEADER",
@@ -86,7 +88,8 @@ const BLOCKS: Spec["blocks"] = [
     name: "ROW",
     closes: "END_ROW",
     args: "",
-    description: "Inside TABLE: row cells separated by |",
+    description:
+      "Inside TABLE, or a FOR or IF that builds rows: row cells separated by |. Without END_ROW it ends at the next ROW, END_TABLE, END_FOR, ELSE, ELSEIF or END_IF",
   },
   {
     name: "SECTION",
diff --git a/core/src/types.ts b/core/src/types.ts
index e70fc1c..4fe9c3b 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -261,9 +261,15 @@ export interface FenceNode extends ASTNode {
  */
 export interface ListNode extends ASTNode {
   type: "List";
-  items: ListItemNode[];
+  items: ListChild[];
 }
 
+/**
+ * A child of a LIST: an item, or a FOR or IF whose bodies hold more children
+ * of the same kind
+ */
+export type ListChild = ListItemNode | ForNode | IfNode;
+
 /**
  * List item node
  */
@@ -280,11 +286,16 @@ export interface ListItemNode extends ASTNode {
 export interface TableNode extends ASTNode {
   type: "Table";
   header: TableHeaderNode | null;
-  rows: TableRowNode[];
+  rows: TableChild[];
   hasHeader: boolean;
   alignment?: string[];
 }
 
+/**
+ * A child of a TABLE: a row, or a FOR or IF that builds rows
+ */
+export type TableChild = TableRowNode | ForNode | IfNode;
+
 /**
  * Table header node
  */
diff --git a/tests/language/list-table-children.test.ts b/tests/language/list-table-children.test.ts
index 219f4fc..fea52ec 100644
--- a/tests/language/list-table-children.test.ts
+++ b/tests/language/list-table-children.test.ts
@@ -428,7 +428,7 @@ const COMPAT_ROWS: Row[] = [
   { name: "TABLE with an unclosed ROW before the next ROW", tpl: "{{TABLE}}{{ROW}}a|b{{ROW}}c|d{{END_TABLE}}", data: D, want: OUT("| a | b |\n| c | d |") },
   { name: "TABLE with unclosed rows and a header and different widths", tpl: "{{TABLE}}{{HEADER}}H1|H2{{END_HEADER}}{{ROW}}a{{ROW}}c|d|e{{END_TABLE}}", data: D, want: OUT("| H1 | H2 |  |\n|:-----|:-----|:-----|\n| a |  |  |\n| c | d | e |") },
   { name: "TABLE with a header only", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|") },
-  { name: "TABLE FOR with an unclosed ROW is still a syntax error at END_FOR", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("syntax-error", 1, 40, "Unexpected token: END_FOR") },
+  { name: "TABLE FOR with an unclosed ROW ends the ROW at END_FOR", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |") },
   { name: "a LIST with conditions and fallbacks", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM t}}b{{END_LIST_ITEM}}{{LIST_ITEM f}}c{{END_LIST_ITEM}}{{LIST_ITEM f | fallback=\"fb\"}}d{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. fb") },
   { name: "a LIST with a missing condition name", tpl: "{{LIST}}{{LIST_ITEM nope}}a{{END_LIST_ITEM}}{{LIST_ITEM nope | fallback=\"fb\"}}b{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. fb") },
   { name: "a LIST with an unclosed item before the next item", tpl: "{{LIST}}{{LIST_ITEM}}a{{LIST_ITEM}}b{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
@@ -470,15 +470,15 @@ const PIPE_ROWS: Row[] = [
   { name: "a run of backslashes split across two values", tpl: "{{TABLE}}{{ROW}}${{v}}${{w}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\","w":"|b"} }, want: OUT("| a\\\\\\|b | x |") },
   { name: "an odd run split across two values", tpl: "{{TABLE}}{{ROW}}${{v}}${{w}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\","w":"|b"} }, want: OUT("| a\\\\\\|b | x |") },
   { name: "two backslashes before a pipe in the second cell", tpl: "{{TABLE}}{{ROW}}k|${{v}}{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| k | a\\\\\\|b |") },
-  { name: "two backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:-----|:-----|\n| 1 | 2 |") },
-  { name: "three backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:-----|:-----|\n| 1 | 2 |") },
+  { name: "two backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:------|:-----|\n| 1 | 2 |") },
+  { name: "three backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:------|:-----|\n| 1 | 2 |") },
   { name: "no backslash before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|b"} }, want: OUT("| a\\|b | h |\n|:-----|:-----|\n| 1 | 2 |") },
   { name: "a pipe after two backslashes in a generated row of an IF", tpl: "{{TABLE}}{{IF t}}{{FOR vs AS v}}{{ROW}}${{v}}|x{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"vs":["a\\\\|b","a\\\\\\|b","a|b","a\\|b","a\\\\\\\\|b"]} }, want: OUT("| a\\\\\\|b | x |\n| a\\\\\\|b | x |\n| a\\|b | x |\n| a\\|b | x |\n| a\\\\\\\\\\|b | x |") },
   { name: "a pipe after two backslashes in a row of a direct TABLE FOR", tpl: "{{TABLE}}{{FOR vs AS v}}{{ROW}}${{v}}|x{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"vs":["a\\\\|b","a\\\\\\|b"]} }, want: OUT("| a\\\\\\|b | x |\n| a\\\\\\|b | x |") },
   { name: "a pipe after two backslashes in a row from an IF branch", tpl: "{{TABLE}}{{IF f}}{{ROW}}n|n{{END_ROW}}{{ELSE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
   { name: "a pipe after two backslashes in a row from a FOR with a window", tpl: "{{TABLE}}{{IF t}}{{FOR vs AS v limit=1 offset=1}}{{ROW}}${{v}}|${{@total}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"vs":["z","a\\\\|b","y"]} }, want: OUT("| a\\\\\\|b | 1 |") },
   { name: "a pipe after two backslashes in a cell that holds an IF", tpl: "{{TABLE}}{{ROW}}{{IF t}}${{v}}{{END_IF}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
-  { name: "a pipe after two backslashes in a header cell of a table with generated rows", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:-----|:-----|\n| a | 1 |") },
+  { name: "a pipe after two backslashes in a header cell of a table with generated rows", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:------|:-----|\n| a | 1 |") },
   { name: "a pipe after two backslashes in a list item is left as written (not a table cell)", tpl: "{{LIST}}{{LIST_ITEM}}${{v}}{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("1. a\\\\|b") },
   { name: "a pipe after two backslashes in plain text is left as written", tpl: "${{v}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("a\\\\|b") },
 ];
@@ -585,7 +585,7 @@ function goldenCase(name: string): { count: number; message: string } {
       },
       { update: false }
     );
-    return { count: results.length, message: results[0]?.message ?? "no result" };
+    return { count: results.length, message: results[0]?.passed ? "" : (results[0]?.message ?? "no result") };
   } finally {
     fs.rmSync(only, { recursive: true, force: true });
   }
```

## Gate run

Gate command green at commit b2e3fb423d8b (1736 tests).

## Output

Answer with one JSON object and nothing else, in this shape:

```json
{
  "restatement": "the objective in your own words, one short paragraph",
  "brief_mismatch": null,
  "verification_plan": ["each check you will make, written from section 1 alone"],
  "findings": [{
    "title": "one line",
    "class": "defect | goal-risk | drift | simplification",
    "serves": { "target": "c1 | m1 | card-goal | cycle-goal | project-goal", "scenario": "the concrete failure against that target" },
    "rubric": "the rubric item or criterion cited",
    "reproduction": "falsifiable steps that show the failure",
    "evidence": ["doc:<path>", "code:<path>:<line>", "test:<name>", "diff:<path>"],
    "location": "path:line or null"
  }],
  "responses": [{ "finding": "f1", "verdict": "sustain | withdraw", "evidence": ["code:src/a.mjs:12"] }]
}
```

Rules:

- Judge the diff against section 1 and the goals it names, never against how the work was done. Write `restatement` before you read section 3.
- Product tier and up: write `verification_plan` from section 1 alone, before you read section 3.
- `brief_mismatch`: a string when the brief, the criteria and the goals contradict each other; otherwise null.
- Every finding names what it serves in `serves.target`: a criterion (c1, c2, ...), a must-not (m1, m2, ...) or a goal (card-goal, cycle-goal, project-goal). A finding that serves nothing in the objective chain is dropped.
- `defect` and `goal-risk` need a rubric item and falsifiable reproduction steps; `goal-risk` also needs evidence. Every evidence entry is `<kind>:<ref>` with a kind of doc, code, test or diff.
- Answer each question in the reviewer brief. A weak answer to a goal-critical question is a `goal-risk` finding serving that question's goal (a fix request: revise and resubmit). A weak answer to a polish question is a `drift` finding (noted for the lead, never a fix request). Strong and adequate answers need no finding.
- `responses` answers earlier findings by label when you are asked to; otherwise leave it empty.
- The Gate run line is tool output recorded by the gate, not the builder's claim. A criterion verified by tests may rely on it; you do not run, judge or ask for tests. A stale or missing line is a reason to say so, never to assume. Review is for what tests cannot catch: fit to the objective and contract, scope drift, design and readability, security, gaps in the tests themselves and edge cases nobody tested.
