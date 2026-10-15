---
summary: "ADR: SET, INPUT and CALL are single tags without an END, like ELSE"
type: adr
domain: language
status: accepted
date: 2026-10-14
state: built
---

# 0007 statement tags without a body

**Context.** [ADR 0001](0001-house-style-for-every-block.md) gives every block the paired form `{{KEYWORD}}...{{END_KEYWORD}}`. Three constructs planned for the language do not wrap anything: `SET` names a value, `INPUT` declares a typed input and `CALL` outputs the text of a macro. A paired form for them would be an empty block (`{{SET x ...}}{{END_SET}}`). The language already has single tags: `ELSE` and `ELSEIF` mark a part inside an `IF` block, and neither has an END keyword. The tags themselves are not built yet; this decision settles their shape before they are.

**Options considered.**

1. Paired empty blocks: `{{SET name = value}}{{END_SET}}`. Keeps ADR 0001 literally, but every statement needs a closer that holds nothing, the lexer tracks a closer for no reason, and a forgotten closer becomes a new error class.
2. Single tags without an END, like `ELSE`: `{{SET name = value}}`, `{{INPUT name type}}`, `{{CALL macro args}}`. One tag per statement, nothing to close, nothing to forget. The argument forms shown here only illustrate; each tag settles its own when it is built.
3. Self-closing or attribute-style tags (`{{SET name value /}}`). Rejected by ADR 0001: a second tag style doubles the parser and the learning cost.

**Decision.** Option 2. A construct that wraps text is a paired block with the `{{KEYWORD}}...{{END_KEYWORD}}` house style; a construct that only acts or outputs on its own, with all its arguments inside the tag, is a single tag with no END. `SET`, `INPUT` and `CALL` are single tags. ADR 0001 still holds for every block: a construct with a body, such as a macro definition, stays paired, and no second tag style is introduced. The human approved this on 2026-10-14.

**Consequences.**

- The grammar keeps two tag shapes, both already present: a paired block and a single tag. The spec lists a single tag without a `closes` entry, as it does for `ELSE` and `ELSEIF`.
- The lexer and the parser need no closer tracking for these tags; an `END_SET`, `END_INPUT` or `END_CALL` is an unknown tag, an error in every mode ([ADR 0003](0003-unknown-names-are-always-errors.md)).
- Nothing in the language changes with this decision: `SET`, `INPUT` and `CALL` are not available yet and the README, the changelog and the [language contract](../../architecture/language-contract.md) do not describe them. The next cycle that builds them records their behavior there.
- A future construct is paired or single by the rule above, without a new decision.
