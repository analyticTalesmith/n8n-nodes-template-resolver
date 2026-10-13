---
summary: Render returns a structured result (output, messages, stats, diagnostics) everywhere; the n8n node maps output to its old field.
type: adr
domain: api
status: accepted
date: 2026-10-13
state: planned
---

# Render returns a structured result

**Context.** Callers need diagnostics, stats and, later, chat messages alongside the rendered text, and the API, CLI and node should share one contract.

**Decision.** The core render function returns an object with output, messages, stats and diagnostics. The API, CLI and library all expose it. The n8n node maps output to the field it already writes.

**Alternatives.** Return a string and expose diagnostics through a second call; rejected because it renders twice and splits the contract.

**Consequences.** A breaking change to the library surface, absorbed by the node wrapper. One fixture suite proves every surface.
