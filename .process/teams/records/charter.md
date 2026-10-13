# Records team

## Scope

Records keeps the project's memory findable and current. It regenerates the indexes, applies ordinary deltas when the cycle's work merges and recovery deltas when archaeology cards finish, composes the deliverables written for readers outside the session, and archives a closed cycle whole. It writes no product, design, architecture or code content.

Loads: `docs/living/INDEX.md`, then the cycle's `CYCLE.md` in `docs/ephemeral/cycles/<cycle>/`, then its `deltas/` folder and the card folders under its `kanban/`.

## Lead

The accountable lead is `docs-steward`.

## Interaction

- every team: providing a service (the indexes, the applied deltas, the deliverables and the archive).
- project lead: providing a service; the steward archives a cycle only when the project lead asks.

## Roster

| Role | Model | Effort | Runs as | Job |
|---|---|---|---|---|
| `docs-steward` | sonnet | low | subagent | Regenerates indexes, applies ordinary deltas when the cycle's work merges and recovery deltas when archaeology cards finish, composes deliverables, moves the cycle to the archive |
| `archiver` | haiku | low | subagent | Writes the Outcome section of a cycle the steward moved to the archive |

## Rights

- Records owns `docs/archive/` and `docs/living/INDEX.md`. No other team writes there. A deliverable the brief places outside these surfaces needs a Scope exceptions row from the project lead first.
- The steward changes other teams' documents in two ways only, both by script: `index.mjs` rewrites the generated block of each index, and `delta.mjs apply` sets the target of an `add` or `modify` delta to built (a new document from planned, a changed one from its current state) and deletes the target of a `remove` delta. For op `recover`, apply it alone by its slug with `delta.mjs . apply <cycle> <slug>` when the project lead says its archaeology card is done, before the cycle's work merges: existing code is already on main, and the recovered target goes from `planned` to `built`. It never edits their content.
- The steward updates a user-facing document (frontmatter `user_facing: true`) that a done card lists in `user_docs`, composed from built documents with citations, only where the brief names it and, when it sits outside the write surfaces below, a Scope exceptions row from the project lead exists. It never tags a document user facing without the owner's say.
- A document becomes `validated` only through `delta.mjs validate`, after a human fills `approved_by` in the cycle's close review. Records never fills `approved_by`.
- The steward moves a closed cycle whole, `docs/ephemeral/cycles/<cycle>/` to `docs/archive/cycles/<cycle>/`, with the work folders of its cards, only on the project lead's request, only after `delta.mjs validate` has run (or the close review validates nothing), and with `git mv`, so git keeps the history. This is the one move of cycle material outside the project lead.
- Records never moves cards, writes `docs/ephemeral/todo.md` or handoffs, talks to the human, or touches main.
- The archiver writes one section, and moves or deletes nothing.

## Write surfaces

```text
docs/archive/
docs/living/INDEX.md
```

## Exit gate

- Every index is fresh: `index.mjs --check` reports nothing.
- Every delta of a merged cycle is applied, and its documents are built.
- An archived cycle's `CYCLE.md` has an Outcome section that is complete against its done cards.

## Tiers

The documents a tier requires decide what gets planned, applied and indexed.

- spike: a decision note only; the index lists it, and there is usually no delta to apply.
- prototype: the spec; apply its delta when the cycle merges.
- product: the living documents the cycle touches; apply each delta and regenerate the indexes.
- hardened: the same, with decision records included and each document validated after the close review.

## Acceptance checklist

- Durability: the indexes, applied deltas and archived cycles are files in git; `git mv` keeps every moved file's history.
- Handoff: the steward's brief names the cycle; its report lists every path changed and every delta applied.
- Scoped authority: two write surfaces; the index and delta scripts are the only changes to another team's document; the archive move only at the project lead's request.
- Approval: the archive waits for the project lead's request; `validated` waits for a human's `approved_by`; any doubt comes back as a question.
- Loops: a delta that fails to apply is reported, not retried with other documents; the archiver runs once per cycle.
- Review: the project lead and the human read the Outcome section before they accept the cycle as archived.
