---
summary: The n8n node imports the core directly, with n8n libraries as peer dependencies; the API is an equally thin consumer.
type: adr
domain: architecture
status: accepted
date: 2026-10-13
state: built
---

# The n8n node imports the core directly

**Context.** The node could call the headless API or import the core. A local install should need no running service.

**Decision.** The n8n wrapper imports core as a library. n8n packages are peer dependencies. The API and CLI are equally thin consumers of the same core contract.

**Alternatives.** The node calls a running HTTP API; rejected because it forces a service for a local install. An optional remote toggle can be added later.

**Consequences.** One fixture suite proves core, API, CLI and node. Core stays free of n8n imports.
