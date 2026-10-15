# Build team

## Scope

Build turns a frozen, claimed card into working code inside the card's file scope and change manifest. It writes tests where the verification plan calls for them, builds, tidies, passes the gate check, and then answers the review's findings until review is clear. It does not shape work, design, review its own output or move cards.

Loads: `docs/living/INDEX.md`, then the cycle's `CYCLE.md` in `docs/ephemeral/cycles/<cycle>/`, then the card folder `docs/ephemeral/cycles/<cycle>/kanban/<column>/<card>/` and `docs/ephemeral/work/<card>/`.

## Lead

The accountable lead is `lead`, the feature lead for each card. It directs the other roles and answers to the project lead.

## Interaction

- Planning: consuming a service. Build takes Planning's spec, plan and frozen reviewer brief as given. The one exception is the card's own `docs/ephemeral/work/<card>/spec.md` when the card lists it in its manifest or file scope: Build may then edit it to match what was built, and no other file of Planning's work folder.
- Architecture: collaborating when a contract is unclear. Build asks a question through the project lead and never edits Architecture's documents.
- Review: consuming a service through the project lead. Build receives findings from the project lead and answers them in rounds.
- Spawned members: `node .process/core/scripts/spawn.mjs <projectDir> build:<role> --brief <file> --cwd <worktree> --card <card>` starts a member with its role's tools and, for a role with Bash, only `Bash(git status *)`, `Bash(git diff *)`, `Bash(git add *)`, `Bash(git commit *)`, `Bash(git log *)`, `Bash(node *)`, `Bash(npm test *)` and the card's gate; never git push or a network command. `--print` shows the allowlist and runs nothing. A member that reports blocked on approval is run again through this launcher; the lead never commits for it without saying so in the handoff.
- Project lead: the only caller. It claims and moves the card; Build reports and says which move comes next.

## Roster

| Role | Model | Effort | Runs as | Job |
|---|---|---|---|---|
| `lead` | opus | high | subagent | Briefs the members, runs the gate before review, drives the review rounds |
| `test-writer` | sonnet | medium | subagent | At shaping, writes failing tests from the full planning context, before any code exists |
| `implementer` | sonnet | medium | subagent | Builds the change in the card's worktree to the scope and manifest |
| `cleanup` | sonnet | low | subagent | Removes dead code and needless complexity after the tests pass |

## Rights

- Only `implementer` and `cleanup` edit code; `test-writer` adds new test files and commits them; `lead` edits no code.
- Every member works inside the card's file scope and change manifest, in one worktree on the card's branch, which the lead creates once. The gate runs with that path as the project directory.
- Tests are append-mostly: an existing test changes only with a logged reason the lead approved.
- Build writes unit tests with every task and integration tests when the change crosses module boundaries, never for an isolated module. System and acceptance (end-to-end) tests belong to the verification team at the merge request.
- Only the project lead moves cards, claims them, and writes the to-do list and handoffs.
- No member talks to the human, touches main, or merges. Questions go up to the project lead.

## Write surfaces

```text
```

## Exit gate

The card's gate check runs clean for the move to review, review is clear for the tier, and the feature lead's report is saved in the card folder.

## Tiers

- spike: no separate test-writer. The implementer writes one probe, and the gate runs what the card lists.
- prototype: the implementer writes happy-path tests. Review is blind without contract-first, and the rounds are short.
- product: verification covers happy, unhappy and adversarial cases. A separate test-writer runs first when the work is contract-shaped. Review is contract-first with rebuttal rounds.
- hardened: as product, always with a separate test-writer, plus migration and rollback checks. The second reviewer is not built yet, so the human gate covers it.

## Acceptance checklist

- durability: briefs, the report and the review rounds are files in the card folder, so a fresh session resumes from them.
- handoff: the feature lead's report names the gate result, the rounds state and the next move for the project lead.
- scoped authority: code changes stay inside the file scope and manifest, in the card's one worktree, and by the implementer and cleanup only.
- approval: Build never moves a card or merges. Stalled loops and design disputes go to the project lead.
- loops: each review round must add new evidence. A stalled loop, or a finding sustained twice with failing fixes, returns to the project lead.
- review: every fix request traces to a failing criterion, and each rebuttal is ruled on by the Review lead, not the Build lead, with a note restating how a kept fix serves the objective.
