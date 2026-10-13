---
summary: Every new block uses the {{KEYWORD}}...{{END_KEYWORD}} house style; no attribute-style tags are added.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: planned
---

# Keep the house style for every block

**Context.** The language already uses {{KEYWORD ...}} to {{END_KEYWORD}} for IF, FOR, CASE, LIST and TABLE. The feature spec asks whether new blocks may use a second, attribute-style tag form.

**Decision.** Every new block keeps the paired {{KEYWORD}}...{{END_KEYWORD}} form, with attributes inside the opening tag. No second tag style is introduced.

**Alternatives.** Allow a few attribute-style or self-closing tags for compactness; rejected because two styles double the parser and the learning cost.

**Consequences.** Existing templates keep working. The grammar stays small and the spec lists one block shape. Compact one-line constructs are written as paired tags.
