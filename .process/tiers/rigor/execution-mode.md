# Execution mode: the goal loop

The goal loop is not a kind of work. It is a way of running any kind: the executor is unattended (`executor` in the project's work profile), approvals sit at the front (`approvals: front` on the cycle) and the run is bounded by loop budgets from the [posture](postures.md). The cycle's kind and stages say what the work is; this page says how an unattended session runs it. Budgets count iterations and spawns, never days. If the human approves `max_cost`, every iteration must record a non-negative `--cost`, including zero. The cap applies to recorded cost in the approved `cost_unit`; the loop cannot observe provider billing, so the lead must supply the amount. An uncapped loop may omit cost. The cycle's selected depth controls evidence and agents; a product label alone starts no sweep.

## Entry

An open cycle with `approvals: front`, a fresh `design-approval.md` signed by the human using `approve-design.mjs`, and a clean `cycle.mjs <projectDir> analyze <cycle>`. The human chooses the cycle, scope and budgets. Then run `loop.mjs <projectDir> <cycle> start`.

## Each iteration

1. At the start of every iteration, read `loop.md`, `CYCLE.md`, `design-approval.md`, the latest handoff and `next.mjs <projectDir> <cycle>` output, never session memory. Run `loop.mjs <projectDir> <cycle> status`; end the turn on `done` or `stop`, and hand off on `waiting`.
2. Choose one unit in this order: an open fix request on an in-flight card; the next runnable card from `next.mjs`; after every card is done, missing cycle-scoped test levels; then missing sweeps for the current round. Follow the cycle's kind and its stages for card work; the project lead moves cards with `card-move.mjs`. In a front-approved cycle there is no human stop at the gate: checks and the verifier still run, and the human reviews the batch at close.
3. When every card is done and selected cycle-scoped levels pass, `review:lead` spawns one fresh read-only `review:sweeper` per selected lens or hardened minimum, using the merged cycle diff. With no required lens, no sweeper spawns. Each selected lens writes a verification record. If code HEAD or an attested local document changes, rerun every required lens; otherwise rerun only lenses with findings. No prior passing records can certify changed bytes.
4. Run `loop.mjs <projectDir> <cycle> record --iteration <n> --unit <text> --action <text> --outcome <ok|fail|blocked|waiting> --progress <n> [--failure <card>: <rule or test>] [--spawns <n>] [--cost <n>] [--wait <item>]... [--clear <item>]... [--decided <text>]... [--sweep-round <n>]`. Supply `--cost` whenever the approved design sets `max_cost`; an older iteration without cost puts the loop into `waiting` until a person repairs the ledger. Resuming a stopped loop does not renew an exhausted cap; a person must approve a higher limit before another iteration. Count cards done, criteria passing, and levels and sweeps passing as progress; name a failure signature when something failed. Repeat-failure, no-progress, budget and sweep-round limits are judged by `status`, not by memory.
5. Raise interrupts in `loop.md` as `waiting_on` and in `docs/ephemeral/todo.md` with an "if unanswered" policy, then continue independent work. Interrupts include needs-human items, a stale design approval, a card outside the fix-card rule, design, scope, security or irreversible questions, accepting a security risk, an unplanned test amendment, a rebuttal disputing the design, and any action outside the checkout and registered docs store or on main. Only `bug` or `security` fix cards within approved modules that change no approved document may be created without another human decision. Everything else waits for the human.

Never fill `approved_by`, `approved_on` or `signed_off_by`; never run `approve-design.mjs` or `loop.mjs resume`. Only a person does those steps. The loop may write only to the checkout and registered docs store; never push, publish, send or act on main. The top-tier model is never chosen automatically.

## Optional

- At 80% of an iteration, spawn or known cost budget, add one warning line to `docs/ephemeral/todo.md`.
- When `status` says `waiting`, write a handoff so the next session can continue from files after the human answers; a person runs `loop.mjs resume --by <name>`.

## Records

- `loop.md` at the cycle root, with counters, iterations, decisions and `waiting_on`.
- `design-approval.md` with the human's approved scope and budgets.
- Cards and their frozen plans, tests and review records.
- Verification records for every selected and tier-minimum level and lens; a `developer` stream record of the human's own hands-on check.
- `close-review.md`, including its Loop summary, evidence, findings and human decision.

## Exit

`loop.mjs status` prints `done` only after all cards are done, required evidence is current against code HEAD and attested local document hashes, each required lens has `pass` / `accept` evidence in its latest applicable sweep round, and no open finding above `polish` remains. A person checks the ledger, selected and tier-minimum evidence, their hands-on record and required sign-offs before filling `approved_by` in the close review. The project lead then closes the cycle through the normal route.
