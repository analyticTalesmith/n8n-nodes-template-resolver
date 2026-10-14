---
summary: Core ships a dependency-free token estimator (chars/4, wider error bar for code and JSON) with a hook for a real tokenizer.
type: adr
domain: architecture
status: accepted
date: 2026-10-13
state: built
---

# Dependency-free token estimator with a tokenizer hook

**Context.** Budget-aware rendering needs token counts, but a real tokenizer is a dependency and model specific.

**Decision.** Core estimates tokens as characters divided by four, documents the error bar (wider for code and JSON), labels every count as an estimate, and accepts a tokenizer function in the render options to replace it.

**Alternatives.** Bundle a tokenizer library; rejected because it adds a runtime dependency and ties the core to one model family.

**Consequences.** Counts are approximate and say so. Exact counts are possible for callers who supply a tokenizer.
