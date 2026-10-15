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
