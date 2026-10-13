# Research team

## Scope

The research team answers questions with sources. It takes a question and returns findings, each with its evidence, a stated confidence and a list of what is still unknown. For an archaeology card, it describes what the code does now in one recovered document: every claim has a citation or becomes an open question. It never proposes the solution a question is meant to support.

Loads: `docs/living/INDEX.md`, then the cycle's `CYCLE.md` in `docs/ephemeral/cycles/<cycle>/`, then the card folder `docs/ephemeral/cycles/<cycle>/kanban/<column>/<card>/` and `docs/ephemeral/work/<card>/`.

## Lead

The lead is `lead`. Spawn it as `research:lead`. It splits the question, runs the members, and writes the one research note.

## Interaction

- Provides a service to every team, through the project lead. A team that needs an answer asks the project lead, who briefs this team.
- Collaborating with Architecture and Product in design rounds: the lead answers the open questions those teams raise, and hands the note back through the project lead.

## Roster

| Role | Model | Effort | Runs as | Job |
|---|---|---|---|---|
| `lead` | opus | high | subagent | Splits the question, runs the members, writes the research note |
| `codebase-explorer` | sonnet | low | subagent | Answers one codebase question with path and line evidence |
| `claim-checker` | sonnet | high | subagent, or codex-ask when the project turns it on | Checks the tier-selected claims against pinned citations |
| `web-researcher` | sonnet | medium | subagent | Answers one external question with dated sources |

## Rights

- Research reads the project as each role allows; the claim checker judges only the prepared citation evidence.
- Only the lead writes a research note under the write surface below. For archaeology, the lead may create only a new file at the living path named by the brief, only when that file does not exist yet, with `provenance: recovered`, and only until its recover delta is applied. Then the document belongs to the team that owns its folder; later edits use that team and a `modify` delta.
- Claim the archaeology card for the lead of the owning team, or `research:lead` when that team is not installed.
- The codebase explorer is read-only. The web researcher holds no write tool and reads the web; it returns its report as its final message.
- The claim checker is read-only. It returns a cold report for the claim units selected by tier as its final message and writes nothing. The project lead saves `claim-check.md` in the current card folder at `cardPath(projectDir, card, { dataRoot }).dir`.
- The project lead uses `recovered_at` to prepare pinned-commit cited excerpts for selected claims, with values redacted and identifiers, paths and line numbers intact. A current checkout is not evidence for a pinned claim; missing pinned material leaves the card in review.
- Use a fresh subagent that did not write the recovered document by default. Only when `review.claim_check_codex` is `true` in `.process/aperture.json` may the project lead run `codex-ask.mjs --purpose claim-check`; put the document and pinned-commit cited excerpts in a brief in the operating system's temporary directory. A checker that cannot run leaves the card in review.
- No research role runs code, `git` or tests. The full commit hash comes in the brief; a repository without git gets no recovered document. The project lead runs `evidence.mjs` and gives its findings to the checker when a prototype needs the script.
- A credential seen while reading is never written down; report its path and line to the project lead.
- Nobody moves cards, writes `docs/ephemeral/todo.md`, or writes a handoff. Those belong to the project lead.
- Nobody edits code, tests, existing living documents or the process files.

## Write surfaces

```text
docs/ephemeral/research/
```

## Exit gate

Research is done when every sub-question is answered or listed as open, each finding names its source, and the confidence is stated. A note that guesses where it does not know has not passed.

## Tiers

- spike: no archaeology; put findings in the research note.
- prototype: recover the surface map and changed areas; check every open question and one claim in five. The project lead runs the evidence script and gives its findings to the checker.
- product: recover the surface map and changed areas; the checker reads every claim, and the evidence check is gated.
- hardened: as product, plus the data model when touched; check every claim and pin changed behavior with characterization tests.

The brief chooses the smallest useful depth within these tier rules.

## Acceptance checklist

- durability: the note lives in `docs/ephemeral/research/<topic>/index.md` and is readable by someone who was not there.
- handoff: the lead returns the note path and a status (done, done with concerns, needs context, or blocked) to the project lead.
- scoped authority: only the lead writes, and only under the write surface; members return reports and write nothing.
- approval: the team decides nothing. Anything that needs a human choice goes back as a numbered question with a recommended answer.
- loops: at most four members run at once, each on its own sub-question; the lead stops and reports when a sub-question stays open after one more try.
- review: every finding can be checked against the source it names; for archaeology, a fresh claim checker reads the tier-selected claims cold.
