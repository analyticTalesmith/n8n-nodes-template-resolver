# Work profile: kinds and stages

A cycle's shape says how much of the V it needs. It is built from small, separate settings, never from a fixed workflow.

## Dimensions

Eight are declared for each cycle:

| Dimension | Values |
|---|---|
| intent | correct, add, change, remove, restructure, adapt, harden, document, learn |
| purpose | answer, demonstrate, prove-structure, validate, ship |
| compatibility | none, additive, preserved, breaking |
| uncertainty | none, partly, unknown |
| reversibility | trivial, costly, one-way |
| size | trivial, card, several, batch, program |
| oracle | existing-tests, new-tests, metric, rubric, person, finding |
| trigger | planned, reactive, forced |

Code legibility (documented, undocumented, unknown) is inferred from the repository and confirmed by a person. A lens (security, performance, accessibility, reliability, i18n) may be set for a cycle; it adds stages and is not a dimension. Intent, oracle and lens may hold several values.

Five are declared once for the project in `.process/aperture.json` under `work_profile`, with `profile.mjs`: audience, governance, deployment, executor and independence (two settings of one dimension), and criticality. Risk, blast radius, the rigor label and approval placement are derived and never asked. A dimension nobody has set counts for nothing and is shown as not set; it is never invented.

## Kinds

A kind is a named preset in `kinds/`. It fills the eight declared dimensions, lists the stages it runs and keeps a short paragraph on how that work goes. It is a default only: any value can be changed one at a time, `--kind custom` sets every dimension by hand, and a project may keep its own kinds in `.process/kinds/`. A line `runs: stg-name when <rule>` runs a stage only when the rule holds.

A walking skeleton is a kind in the same way a feature or a spike is: a preset with its own purpose (prove the structure) and its own stages, not a separate category of work.

## Stages

A stage is a unit of work with a risk it removes, a person or team who owns it and a rule for when it may be skipped. Each is one file in `stages/`, grouped by phase: down (idea to ready), implement, up (built to validated), release and learn. Five stages are always present: intent and profile, goals and oracle, build slices, unit run and regression, and record. The others come from the kind, or are added by their own rule (for example, the threat model when the security lens is set).

Frontmatter of a stage:

- `skip` is a rule over the dimensions. `never` means the stage is never skipped and `manual` means a person judges it.
- `add-when` is an optional rule that adds the stage to any shape it holds for.
- `pairs-with` links the stage on the other leg of the V that checks it.
- `owner` names the team, or team and role, that does it.
- `today` says whether the stage is covered by a team or a check (`exists`, `thin`, `absent`, `unknown`).

Rules are written as `dimension = value`, `!=`, `in [a, b]`, `has value` and `lacks value`, joined by `and`, with `or` between groups. A rule about a dimension nobody has set does not hold. The derived values `risk` and `blast` may be used too.

Stages are defined here, not wired: nothing enforces a stage on its own. The cycle record is what is checked.

## The record

When a cycle opens with a kind, its `CYCLE.md` gets a "Why this shape" section and one line per stage. A stage line is `done: <evidence>` or `skipped: <reason>`; the reason `rule` means the stage's own skip rule holds. The `cycle-shape-recorded` check reads it before a card moves to ready, and a cycle with a kind cannot close until every line is recorded.

## Commands

- `cycle.mjs <projectDir> kinds` lists the kinds.
- `cycle.mjs <projectDir> propose --kind <kind> [--set <dimension>=<value>]...` shows the shape for a one-line confirm and writes nothing.
- `cycle.mjs <projectDir> new <name> --goal <text> --kind <kind> [--set <dimension>=<value>]...` opens the cycle with that shape.
- `cycle.mjs <projectDir> shape <name>` prints the profile, the stages and the concern settings.
- `cycle.mjs <projectDir> stage <name> <stage> <done|skipped|todo> <evidence or reason>` records one stage.
