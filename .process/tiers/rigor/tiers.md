# Rigor tiers

The project tier (`tier` in `.process/aperture.json`) is one of `spike`, `prototype`, `product` or `hardened`. It sets how deep each gate goes. This page is the tier matrix for leads: every row, per tier, and which rows the gate enforces by which check ids.

## The matrix

| Row | `spike` | `prototype` | `product` | `hardened` |
|---|---|---|---|---|
| Planning audit | short grill | grill and gap audit | scope and risk decide whether to add red team | plus human sign-off |
| Verification plan | one probe | happy path | selected paths for the cycle's risks | plus migration and rollback |
| Separate test-writer | no | no | yes, if contract-shaped | yes |
| Test levels | unit only for deterministic logic | unit only for deterministic logic | unit for deterministic logic, plus integration for cross-module changes; cycle selects any system and acceptance (end-to-end) at the merge request | all four: unit, integration, system and acceptance (end-to-end) |
| Regression | none | none | per card: that card's tests plus the tests of the cards whose modules depend on what it changed, from the module graph; the full suite when a change maps to no module | the same selection per card, and the full suite at the merge request |
| Verification | no verification team; the gate command only | gate command and criteria checks; exploratory happy path for user-facing criteria at mobile and desktop widths; at the merge request an exploratory pass over the stories | verify the chosen scope and risks; accessibility and visual checks for changed interfaces; run selected cycle suites and sweeps at the merge request | plus migration, rollback, keyboard, zoom and reduced-motion; every requirement in the cycle's scope checked or listed as manual |
| Blind review | none | yes, no contract-first | contract-first, with rebuttal rounds | plus second reviewer |
| Human gate | final decision at the cycle's approval placement | demo review at that placement | full review at that placement | full review and sign-off at that placement |
| Visual verification (front ends) | screenshot loop at two viewports, one axe run | key screens and states at mobile and desktop, axe at AA, a reporting critic | plus Storybook states, token and contrast lint, Prism verification, Lighthouse limits, baselines pinned to CI | plus keyboard, zoom and reduced-motion checks and a calibrated critic |
| Docs | decision note | spec | living docs updated | plus ADRs |

Test levels: the planning lead names the levels each card needs from its blast radius and module boundaries. Unit tests apply to deterministic logic and integration tests to cross-module changes, never to an isolated module. Product does not automatically require an independent verification record, system and acceptance (end-to-end) tests, or a security sweep. Depth resolves from the most specific layer that sets it: the card's `tier`, else its cycle's `tier`, else the project tier. The nearest layer wins whether it raises or lowers, and no reason is required; `node core/scripts/depth.mjs <projectDir> tier <card|cycle> <id|name> <tier|inherit> [--note <text>]` records the change and `instruct` records a dated session instruction in `card.json` or the cycle brief, which `next` prints. A card's `test_levels` adds a unit or integration level the tier does not require. The cycle selects additional depth from scope, risk and cost; the lead asks a person when the right depth is unclear. In tier data, `test_levels.unit` and `test_levels.integration` govern card test planning; `test_levels.system`, `test_levels.acceptance` and `sweeps` set cycle evidence minimums. `signoff_required` sets when required cycle evidence needs human sign-off. A cycle selection adds to those minimums and cannot waive them. Selected or tier-required system and acceptance tests run with the verification team at the merge request to staging or main. A new document the cycle plans starts `planned` with an `add` delta; a document the cycle changes keeps its state under a `modify` delta. Both become `built` when the docs steward applies the cycle's deltas when the cycle's work merges, and `validated` only after a human approves the close review.

The `test_levels` map contains `unit`, `integration`, `system` and `acceptance`. Cycle review lenses in `sweeps` are `red-team`, `security`, `unhappy-path` and `malicious-path`. The installed `tiers.json` can raise, lower or turn off a minimum with `null`; this changes only that project's tier data. [Posture presets](postures.md) propose the human gate placement recorded on each cycle; the human makes the choice.

## What the gate enforces

The gate enforces only the rows a script can decide. The rest are practice the lead and the reviewers follow.

| Row | Enforced by | From tier |
|---|---|---|
| Docs: spec | `spec` (shaping to ready) | `prototype` |
| Human gate: approved front design | `design-approved` (shaping to ready in front cycles) | `spike` |
| Docs: living docs updated | `docs-impact` (in progress to review, gate to done); cycle deltas and document states retain the change record | `product` |
| Blind review | `review-recorded` (a review round is on record) | `prototype` |
| Blind review: rebuttal rounds | `review-clear` (no open fix request, no undecided drift) | `product` |
| Verification | `verification-recorded` (review to gate, when selected, tier-required or voluntarily recorded) | `product` |
| Test levels | `test-levels` (in progress to review) | `product` |
| Planning audit, verification plan, separate test-writer, human gate | not a gate check | |
| Visual verification (front ends): token and contrast lint | `front-end-css`, `front-end-contrast` (in progress to review) | `product` |
| Visual verification (front ends): rendered-page tools (axe, Playwright, Lighthouse, design file linter) | `front-end-tools` (in progress to review; each entry's `min_tier` places it) | `spike` |
| Visual verification (front ends): baseline updates | `baselines` (gate to done) | `prototype` |
| Visual verification (front ends): everything else | not a gate check | |

Checks that are not a matrix row, but run on the same edges:

| Check | Runs from tier | What it guards |
|---|---|---|
| `no-ids` | `spike` | no requirement, ticket or task ids in code or commits |
| `reviewer-brief` | `prototype` | the reviewer brief carries the objective |
| `frozen` | `prototype` | frozen card files are unchanged |
| `manifest` | `prototype` | the change matches the card's manifest |
| `card-contract` | `prototype` | at in progress to review, card.md has a goal, an interface contract (`none` only with a reason) and a scope; its relative links resolve; and its readable Scope matches the manifest and files_scope. A change outside the scope is accepted only when it is in the Scope exceptions log of context.md (that acceptance belongs to the manifest check), and is then reported as a `scope-exception` warning ("approved deviation, needs human review") that never blocks the move |
| `design-approved` | `spike` | only in a front-approved cycle, a card entering ready has a fresh design approval bound to the cycle policy, approved documents and exact card scope; other cycles skip it |
| `test-levels` | `product` | a code-changing card names its blast radius; every selected test level has a matching test criterion; cross-module changes plan integration when the tier data requires it. Read-only and docs-only cards skip it |
| `user-docs-updated` | `product` | at in progress to review, a card with `user_visible: true` changes at least one user-facing document (frontmatter `user_facing: true`) and each document in its `user_docs` is tagged and changed, or the card carries a one-line `user_docs_waiver` with the reason |
| `boundary` | `product` | the architecture boundary checker passes; a canary proves it can fail |
| `secrets` | `product` | no secret-shaped text in the diff or its commits |
| `ownership` | `product` | changes stay inside the owning team's charter |
| `tests-fail-first` | `product` | at shaping to ready (and, for a bug card, at backlog to ready), the card's gate command runs once and fails, and the card's red-evidence log (`red-evidence.md` in its work folder) matches the run: every test criterion has a failing test and every failure is an assertion failure, not a thrown error, timeout or file that would not load (skipped when no criterion is verified by test; a bug card instead needs the failing test, and a root-cause record with hypotheses tested, evidence and cause, from product tier) |
| `card-gate` | `prototype` | at in progress to review, the card's own gate command (planned tests and linters) passes; it runs without a shell |
| `test-amendments` | `prototype` | a modified, deleted or renamed existing test is logged with a reason and the lead's approval in `test_amendments` in `card.json` |
| `front-end-css` | `product` | added style and markup lines hold no raw colour or pixel values outside token files, no `transition: all`, only transform and opacity transitions, and animating style files hold a reduced-motion block |
| `front-end-contrast` | `product` | each declared token pair meets its WCAG 2 AA contrast minimum |
| `front-end-tools` | `spike` | at in progress to review, each tool in `gate.front_end.tools` runs without a shell and exits 0 |
| `baselines` | `prototype` | at gate to done, every changed visual baseline carries the human's approval of its exact bytes |
| `index-fresh` | `product` | at gate to done, every directory index under `docs/living` and the cycles folder matches its documents and each document has a summary; `node .process/core/scripts/index.mjs <projectDir>` regenerates them |
| `living-state` | `product` | at gate to done, every living document's `state` has its evidence: planned (only a new document) an open add delta or a recover delta for a recovered document, built an applied add, modify or recover delta (a modified document keeps its state until the delta is applied), validated a close review whose `approved_by` names a person |
| `living-via-delta` | `spike` | at in progress to review, every added, changed, deleted or renamed Markdown document under `docs/living` (generated `INDEX.md` files aside) is the target of a delta in a current, not archived, cycle; a missing delta is a warning (`living-without-delta-warning`) below product tier and a failure (`living-without-delta`) from product |
| `verification-recorded` | `product` | at review to gate, require a card `verification.md` only when the cycle selects a verification level or review sweep, or the tier data requires a cycle level or sweep. A voluntarily present record is checked too. A required or present record needs `verdict: accept` and a `ran_against` commit with no file outside `docs/ephemeral` changed since. Missing when required is `verification-missing`, any other verdict is `verification-not-accepted`, and a product change since the run is `verification-stale` ("rerun verification") |
| `evidence-cited` | `product` | at in progress to review and gate to done, every recovered document's tags are well formed and every cited file and line exists at its commit; `node .process/core/scripts/evidence.mjs <projectDir>` prints findings |
| `claim-checked` | `product` | at review to gate, an archaeology card (one whose manifest or docs impact names an open recover delta's document) holds a `claim-check.md` that classifies claims as confirmed, wrong, unsupported, inference or prescriptive; it proves the cold read happened, not that it was right |
| `efv-orphans` | `product` | at gate to done, a built or validated object is acted on by an action, an action is shown on a surface, and a surface offers an action that acts on an object; planned atoms are not checked and a project with no atoms is quiet |
| `rule-has-test` | `product` | at gate to done, a built or validated rule has a `verified-by` link to a test or a Waiver section giving the reason |
| `actor-has-action` | `product` | at gate to done, a built or validated actor performs at least one action |
| `interface-has-contract-test` | `product` | at gate to done, a built or validated interface is constrained by a rule that has a test, or carries a Waiver section |
| `boundary-covered` | `product` | at gate to done, a built or validated interface that one boundary provides and something else consumes is threatened by a risk atom, or carries a Waiver section |
| `atom-size` | `product` | at gate to done, an atom file longer than about 60 lines is listed as a warning (`atom-size`) and never blocks the move |
| `deliverable-cites` | `product` | at gate to done, every `##` section of a composed deliverable (frontmatter `composed`) cites atom ids with `[cites: id]`, each cited atom exists and is built or validated, and a section headed `Exempt: <name>` is the one visible exception |
| `deliverable-fresh` | `product` | at gate to done, a composed deliverable records each cited id with the commit it was verified at under `cites`, and a section citing an atom whose file differs from that commit is reported so only it is recomposed; projects with local-only documents are not compared |
| `cycle-shape-recorded` | `product` | at shaping to ready, a card's cycle has a "Why this shape" line, and every down-leg stage the cycle's kind lists is `done` with evidence or `skipped` with a reason (the reason `rule` is accepted only where the stage's own skip rule holds); a cycle with no kind needs only the line. A cycle with a kind also cannot close while any stage is unrecorded. It proves the record is kept, not that each stage was done well |
| `stance-hardened` | `hardened` | at in progress to review, in a project whose architecture overview has a Stance section, a change to the layer map or a stance rule file travels with a decision record under `docs/living/decisions/` in the same diff, and each module in the card's blast radius has a Module contract with its full header block (Layers present, Public entry, Ports owned, Ports required, Used by); the boundary check also refuses `--ignore-known` at hardened, since baselines are not allowed there; it proves the contract is written to the format, not that it still matches the code |

The `verification-recorded` product minimum in tier data makes the check available by default; an unselected card with no record passes. A cycle-selected level or sweep requires the record for every card in that cycle, including one with a lower card tier. A tier-required system or acceptance level or sweep follows the card's own effective tier, so a hardened card in a product cycle needs the record and a prototype card in a hardened cycle does not. A voluntarily present record is checked at any tier. An explicit `null` for the check in tier data turns it off.

`front-end-css` and `front-end-contrast` are skipped while `gate.front_end` is not configured (`gate.front_end is not configured`); the web-app profile sets it to `{}`. `front-end-css` judges only the lines the card added to style and markup files: no raw colour or pixel values outside token files, no `transition: all`, only transform and opacity in transitions, and a `prefers-reduced-motion` block in any changed style file that animates. `front-end-contrast` reads `docs/living/ux/tokens/design-tokens.json` and the pairs in `docs/living/ux/tokens/contrast-pairs.json` and fails a pair below the WCAG 2 AA minimum (4.5 for text, 3 for large text and UI).

`front-end-tools` and `baselines` are skipped while `gate.front_end` is not configured, and separately while `gate.front_end.tools` or `gate.front_end.baselines` is absent (`gate.front_end.tools is not configured`, `gate.front_end.baselines is not configured`). A tool entry is `{ "name": "axe", "argv": ["node", "path/to/cli.js", "..."], "min_tier": "spike" }`: a real executable or `node <script>`, never a shell line, run from the project root with a 300 s limit. Every entry at or below the project tier runs even when an earlier one fails, and a failure is `front-end-tool-failed`. `baselines` is a list of snapshot files or folders (an entry ending in `/` is a folder). A changed, added, renamed or deleted baseline needs the record that `node .process/core/scripts/approve-baselines.mjs <projectDir> <cardId>` writes into `card.json` while the card is in the gate column; the record holds the hash of each file as the human saw it, so regenerating a baseline afterwards is `baseline-approval-stale`. Approval is the human's step at the gate; nothing authenticates who runs it.

`tests-fail-first` and `card-gate` are skipped, not failed, for a card with no gate command (`the card has no gate command`).

`boundary` is skipped while `gate.boundary` is not configured, except at the tier named by `boundary_required` (`hardened`), where an unconfigured boundary is the finding `boundary-not-configured`.

## Concerns

The tier is a label over six concerns: code hygiene, test depth, documentation, review, approvals and release handling. Each gate check belongs to one concern and runs when that concern resolves at or above the check's minimum. A concern resolves like the tier does: the card, else its cycle, else the project, and the nearest layer that sets it wins whether it raises or lowers. A layer's own `tier` sets all its concerns; a concern set on that layer wins over its tier. With nothing set per concern every concern holds the tier and nothing changes. `node .process/core/scripts/depth.mjs <projectDir> concern <card|cycle> <id|name> <concern> <tier|inherit>` sets one, and `show` prints the derived label, such as `product, spike docs`, when they differ.

| Concern | Checks |
|---|---|
| `code-hygiene` | `no-ids`, `manifest`, `boundary`, `secrets`, `ownership`, `front-end-css`, `front-end-contrast`, `front-end-tools`, `stance-hardened` |
| `test-depth` | `test-levels`, `tests-fail-first`, `card-gate`, `test-amendments`, `baselines`, `verification-recorded` |
| `documentation` | `spec`, `card-contract`, `docs-impact`, `index-fresh`, `living-state`, `living-via-delta`, `cycle-shape-recorded` |
| `review` | `reviewer-brief`, `review-recorded`, `review-clear`, `evidence-cited`, `claim-checked` |
| `approvals` | `design-approved`, `frozen` |
| `release` | none yet |

## Tuning the depth

`.process/tiers/rigor/tiers.json` holds the data:

```json
{
  "checks": { "<check id>": "<tier>" },
  "boundary_required": "hardened"
}
```

- `checks` maps a check id to the lowest tier at which it runs. `null` turns the check off. A check id left out keeps its built-in tier.
- `boundary_required` is the lowest tier at which an unconfigured `gate.boundary` is a finding instead of a skip, or `null` for never.
- A tier name must be `spike`, `prototype`, `product` or `hardened`; an unknown key, check id or tier is the finding `gate-tier-data-invalid`, and the gate stops there until the file is fixed.
- A turned-off check shows in the gate's skipped list as `turned off in .process/tiers/rigor/tiers.json`.

Edit that file to tune a project's depth. It is a managed file, so `upgrade` lists your edit on its decision card instead of overwriting it. Without the file the gate uses the built-in table, which this pack's `tiers.json` matches exactly.
