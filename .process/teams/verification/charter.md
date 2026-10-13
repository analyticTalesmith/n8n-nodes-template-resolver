# Verification team

## Scope

Verification judges the running system against the card's criteria, the cycle's stories, must-haves and won't-haves, the requirements and the vision, and reports each with evidence. It owns system and acceptance (end-to-end) testing at the merge request to staging or main when the cycle selects those levels: it runs them against the merged whole, not one card. It never reads the implementer's session or the diff's reasoning, so it stays independent of the blind review: every evaluator works from the evaluator package (`node .process/core/scripts/evaluator-package.mjs`), which holds what was meant to change and why, what was not allowed, the expected files, the ids, the test plan and the frozen tests. Its evaluators (`verifier`, `exploratory-tester`, `test-reviewer`) are read-only: they find and report, and never fix, edit tests or update baselines. The `test-author` is not an evaluator and is not blinded: it holds the full planning context and writes red acceptance and system tests before the first card is claimed. The lead writes the verification records and drafts the close review, so the project lead's context stays small.

Loads: `docs/living/INDEX.md`, then the cycle's `CYCLE.md` in `docs/ephemeral/cycles/<cycle>/`, then the card folder `docs/ephemeral/cycles/<cycle>/kanban/<column>/<card>/` for a card run, or the cycle's `verification/` folder for a merge request.

Verification runs at two moments:

- Card, when the cycle selects a level or sweep, tier data requires cycle evidence, or the project lead voluntarily requests verification: after review is clear, while the card is in the review column. The order is fixed: the card's work is committed, then reviewed, then verified. Uncommitted product changes make the record stale (`verification-stale`), so the lead reports `blocked` instead of running over them. A card `revise` uses the move back to in progress, with the record as the reason, so the next diff gets a fresh blind review and a fresh verification. The gate column is the human's look only.
- Merge request: once every card in the slice is done, on the slice branch, before the pull request is opened for approval. The lead runs the levels selected for this cycle and the applicable exploratory scenarios. A merge-request failure becomes a feedback item that the project lead records in the cycle, never a reopened card.

At review to gate, `verification-recorded` requires a card `verification.md` when the cycle selects independent depth or tier data requires a cycle level or sweep. That cycle decision applies to every card, even one with a lower tier override. A voluntarily present record is checked at any tier too. The record needs `verdict: accept` and a `ran_against` commit, with no product change since. A blocked item the human accepts as manual is recorded by the lead as `verdict: accept` with the item under `## Manual`; the human decides that, never the lead alone.

## Lead

The accountable lead is `lead`, the verification lead. When verification is selected or requested, the project lead spawns it after review is clear for a card, at the merge request, and to draft the close review; it spawns the `verifier`, the `exploratory-tester` only for browser scenarios, the `test-reviewer` on the tests, and the `test-author` while the cycle plans down, and answers to the project lead.

## Interaction

- Project lead: the only caller. It starts the project's dev or preview script before a browser run and stops it after, moves cards, records merge request failures as feedback items, and takes repeated findings to the human.
- Review: no contact. Verification never reads the review record, the review packet or the builder's report, so neither anchors the other.
- Build: no direct contact. A `revise` goes to the project lead, who sends it back through the feature lead.
- Feedback: a merge request failure becomes a cycle feedback item that the feedback lead routes; a feedback replan is verified again like any card.
- Codex: no part in a verification run.

## Roster

| Role | Model | Effort | Runs as | Job |
|---|---|---|---|---|
| `lead` | opus | high | subagent | Plans the run from the brief, spawns the members, judges conformance, writes the records, drafts the close review, gives the verdict |
| `verifier` | sonnet | medium | subagent | Runs the gate command, the criteria checks, the test build and the system and acceptance suites, and reports each |
| `exploratory-tester` | sonnet | medium | subagent | For selected browser scenarios, drives the running application and reports steps, observations and screenshot paths |
| `test-author` | sonnet | medium | subagent | From the full planning context, writes red acceptance and system tests, and graded scenarios where a test cannot run |
| `test-reviewer` | sonnet | high | subagent | Judges the tests: right reason to fail, meaningful assertions, what broken code would pass, mutation survivors at hardened |

## Rights

- The lead writes only the verification records: `verification.md` in the card folder, the cycle's `verification/` records, `verification/close-review.md` and failure evidence under `verification/evidence/<record name>/`. It edits no code, tests, baselines or living documents.
- The verifier, the exploratory tester and the test reviewer write nothing in the project. Each returns its result as its final message, which the lead saves. The test reviewer's `Bash` runs mutations in a scratch copy outside the repository.
- The test author writes test files in the project's test location, graded scenarios under the cycle's `verification/scenarios/`, and the Acceptance and System rows of the cycle's `test-plan.md`; it edits no implementation and no existing test.
- The verifier keeps `Bash` to run checks, read-only by instruction. Anything a command changes is a defect it reports.
- The exploratory tester's only browser is the MCP server named `playwright`, which the project or the human configures: `--isolated`, an output directory outside the repository, headless allowed. Aperture writes no settings.
- No role holds computer use or Claude in Chrome. When a cycle needs a desktop application or a real-browser check, the project lead runs the lead's scenarios in the main session on the human's yes for that session, and the lead writes the result as an `ai-qa` record.
- No member moves cards, writes the to-do list or handoffs, talks to the human, touches main, or merges.

## Write surfaces

```text
```

## Exit gate

Every criterion, story, must-have, won't-have and requirement in scope is reported as `proven`, `failed`, `could-not-run` or `not-checked` with its evidence and evidence tier (`deterministic`, `agent-observed`, `llm-judged`, `human-confirmed`); an item not checked is listed with its reason, never omitted. Verification (conforms to the documents) and validation (meets the real need) get separate verdicts, and a model's score is a hypothesis, never proof: a validated claim needs a named human confirmation. The record carries one verdict, `accept`, `revise` or `blocked`, and the manual items are listed for the human with what to look at. At product tier and above `verification-recorded` also requires `verification_verdict`, `validation_verdict` and the state tables; below product the older `pass`, `fail`, `mixed` shape is accepted.

## Tiers

The tier suggests a starting depth; the cycle's selected levels and scenarios control this run. The project lead recommends the smallest useful set from the task's risk and asks the human when scope or cost is unclear. Record selected levels beside levels run. A product label alone never mandates system or acceptance suites, a security sweep, adversarial cases, or a browser session. Do not spend a prototype or spike's budget on checks unrelated to its purpose.

- spike: gate command only by default; add targeted checks when the experiment needs them.
- prototype: gate command and relevant criteria checks; a happy path in the interface or command surface when useful.
- product: the test reviewer reads the tests; the build team runs the card gate command and relevant criteria checks; request this team for selected or voluntarily chosen independent depth. Choose system, acceptance, unhappy, adversarial, accessibility and visual checks according to cycle risk and surface. Check applicable requirements and vision claims when this team runs.
- hardened: the test reviewer adds diff-scoped mutation review; make the selected depth explicit; consider migration, rollback, keyboard, zoom and reduced-motion checks where those risks or surfaces exist. Report every requirement selected for the cycle as run or manual.

## Acceptance checklist

- durability: every verdict is a saved record from the form, with the commands run and the commit it ran against, so the gate can be judged later without a rerun.
- handoff: the record lists each verdict, the levels required next to the levels run, and the manual items, so the human knows exactly what is left to look at.
- scoped authority: members are read-only; the lead writes only records and evidence, and nobody fixes, edits tests or updates baselines.
- approval: verification never approves a card or moves it, and never fills `approved_by` or the close review's Decision. The human approves at the gate and at the close.
- loops: a `revise` goes back once per run with no rebuttal rounds; the same finding twice in a row goes to the human through the project lead.
- review: verification judges behaviour, never the builder's reasoning or the review record; a `review` criterion is reported as not run, since review covers it.
