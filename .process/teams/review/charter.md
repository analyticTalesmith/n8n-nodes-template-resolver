# Review team

## Scope

Review gets an independent look at a card's diff against its objective and criteria, and runs only the cycle sweeps selected by scope or tier. It records findings for the feature or project lead, judges what scripts cannot, and writes no fixes or fix requests.

Loads: `docs/living/INDEX.md`, then the cycle's `CYCLE.md` in `docs/ephemeral/cycles/<cycle>/`, then the card folder `docs/ephemeral/cycles/<cycle>/kanban/<column>/<card>/` and `docs/ephemeral/work/<card>/`.

## Lead

The accountable lead is `lead`. It runs the card review script or selected cycle sweep, handles the fallback, and reports to the project lead.

## Interaction

- Build: providing a service through the project lead. Findings go to the feature lead, who answers them in rounds.
- Planning: consuming a service. The frozen reviewer brief with its objective chain is the review's only statement of intent.
- Project lead: the only caller. It moves the card to review and acts on the report.

## Roster

| Role | Model | Effort | Runs as | Job |
|---|---|---|---|---|
| `lead` | opus | high | subagent | Runs the review, handles the fallback, records the result, runs the closing check |
| `fallback-reviewer` | opus | medium | subagent | Reviews from one prompt file when Codex cannot or may not run |
| `sweeper` | sonnet | high | subagent | Reads one merged diff through one selected cycle lens |
| `codex-reviewer` | codex | project config | review.mjs | The default blind reviewer, run only through the review script |

## Rights

- Read-only on source. Card records are written through the script; for selected cycle sweeps the lead writes only records under `docs/ephemeral/cycles/<cycle>/verification/` using the verification template, including `ran_against` and `sweep_round`.
- The Codex reviewer sees only what the review packet holds. The fallback reviewer is told to open only its prompt file, but its `Read` tool reaches the whole repository, so its blindness depends on that instruction.
- A reviewer never reads the builder's reasoning, reports or notes.
- The packet and diff go to OpenAI on a Codex run. A repository that must not allow this sets fallback only.
- No one on this team writes fix requests, moves cards, or merges. The feature lead writes fix requests.
- A sweeper reads only its brief, named diff and listed documents; its final message is its only output.

## Write surfaces

The dynamic cycle verification records above are the only manual writes; no static project source surface is granted.

```text
```

## Exit gate

A card review records the current diff, reviewer label and counts, then reports the objective-chain check. A selected cycle sweep records its lens, current commit, round and verdict for the project lead.

## Tiers

- spike: no review runs. The final decision belongs to the human.
- prototype: a blind review without contract-first. The reviewer works from the objective and criteria alone.
- product: contract-first review with rebuttal rounds, the reviewer writing its own verification plan before it reads the diff.
- hardened: as product. A second reviewer to audit the first is not built yet; the human gate covers it.
- Cycle sweeps: the lead spawns only lenses selected by the cycle or required by its tier; an empty requirement spawns none.

## Acceptance checklist

- durability: the review lives in the card folder as files, and the review script refuses a stale or missing record.
- handoff: the lead's report gives the label, counts and each finding's class and `serves`, so the feature lead needs nothing else.
- scoped authority: read-only on source; the one file written outside the repository is the fallback reply in the temporary directory.
- approval: no finding becomes work without the feature lead's fix request, and no card moves without the project lead.
- loops: a finding is raised again only on new evidence from a changed diff, and a round that adds no new evidence is reported as stalled by `rounds.mjs`, the Review lead then rules on the open findings, and a dispute about the design itself goes to the human.
- review: every finding has a class and a `serves`, only defect and goal-risk can ask for a fix, and the closing check names any whose `serves` does not hold.
