# Planning and audit team

## Scope

The planning team turns a settled design into a spec, a plan and a frozen reviewer brief for one card, then audits them. It also lists the cards a plan needs, the test levels each card needs, and the documents the plan adds or changes. It does not decide the design, build anything, or move cards.

Loads: `docs/living/INDEX.md`, then the cycle's `CYCLE.md` in `docs/ephemeral/cycles/<cycle>/`, then the card folder `docs/ephemeral/cycles/<cycle>/kanban/<column>/<card>/` and `docs/ephemeral/work/<card>/`.

## Lead

The lead is `lead`. Spawn it as `planning:lead`. It runs the planner and the audits, writes the reviewer brief, and freezes it.

## Interaction

- Collaborating with Architecture and Product in design: it reads their documents, asks the project lead for the decisions it lacks, and gives the red team's threat findings back to Architecture.
- Provides a service to Build and Review: the spec, the plan and the frozen reviewer brief are what they work and judge from.

## Roster

| Role | Model | Effort | Runs as | Job |
|---|---|---|---|---|
| `lead` | opus | high | subagent | Directs the planner, writes and freezes the reviewer brief, runs the audits |
| `planner` | sonnet | medium | subagent | Writes the spec and the plan |
| `gap-auditor` | opus | medium | subagent | Audits the spec and plan for gaps with fresh context |
| `red-team` | opus | medium | codex-ask, else subagent | Audits assumptions, failure modes and threats; gives an independent opinion on a low-risk choice |

## Rights

- Everyone reads the whole project.
- The planner and the lead write only under the write surface below. The one exception is the reviewer brief, which the lead writes as `reviewer-brief.md` in the card's own folder in the cycle's kanban, where freeze reads it; the spec and plan stay under `docs/ephemeral/work/<card>/`.
- The gap auditor and the red team are read-only. They write nothing and return their report as the final message; the lead saves it.
- Only the lead freezes a reviewer brief, and only while the card is in shaping.
- Nobody moves cards, writes `docs/ephemeral/todo.md` or a handoff. The lead lists the cards a plan needs and the project lead creates them.
- A change to another team's write surface needs a row from the project lead in the card's Scope exceptions log.

## Write surfaces

```text
docs/ephemeral/work/
```

## Exit gate

Planning is done when the spec has no open clarification markers, every criterion has a verify type, every card names its test levels, the reviewer brief is frozen, and every audit finding has an answer (fixed, or declined with a reason).

## Tiers

- spike: a short grill of the design with the human through the project lead; the red team is off and the opinion step is skipped.
- prototype: a grill and a gap audit.
- product: the grill, the gap audit and the red team.
- hardened: everything in product, plus a human sign-off on the spec and the reviewer brief before the freeze.

## Acceptance checklist

- durability: the spec and plan are files under `docs/ephemeral/work/<card>/` and the reviewer brief is `reviewer-brief.md` in the card's folder, not chat.
- handoff: the lead returns the paths, the card list and a status (done, done with concerns, needs context, or blocked) to the project lead.
- scoped authority: writes stay under the write surface; the auditors write nothing.
- approval: open questions go back as numbered questions with a recommended answer; the human signs off at hardened.
- loops: one gap audit and one red team pass per version of the plan; a second pass only after a real change.
- review: the reviewer brief is frozen before the card moves to in progress, so the reviewer judges against what was agreed.
