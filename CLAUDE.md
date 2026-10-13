<!-- aperture:begin -->
# Project guide

This repo is memory for AI agent teams. Read before you act.

- Process, tiers and team rules live in `.process/`. Start with `.process/aperture.json`.
- Run `node .process/core/scripts/location.mjs .` to find the docs store; start with its `living/INDEX.md`.
- Temporary work lives in `docs/ephemeral/`: the cycles (each with its brief, kanban, deltas and feedback), the global backlog, research, handoffs.
- A closed cycle moves whole to `docs/archive/cycles/`.
- The human just chats: there are no commands to learn, and the project lead runs the scripts.

@.process/core/templates/routing.md

Rules:

- When a change alters a durable fact, record it as a delta in the cycle: a new document starts `planned`, a changed one keeps its state, and `apply` sets `built` when the cycle's work merges; a recovery applies by slug when its archaeology card is done.
- In an area with code and no living document, when the cycle includes archaeology, describe it as it is in a recovered document before changing it.
- Keep ephemeral notes out of the living docs.
- Do not edit `.process/core/`; upgrade replaces it (to keep a changed file, list it in `ejected` in `.process/aperture.json`). `.process/local/` is only a place for project-owned files that Aperture never overwrites; nothing reads it as an override.
<!-- aperture:end -->
