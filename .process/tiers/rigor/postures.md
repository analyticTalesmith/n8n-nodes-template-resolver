# Posture presets

A project names a posture in `.process/aperture.json` (`"posture": "agile"`). If absent, `hybrid` applies. Presets propose a tier from the cycle's stage, approval placement, and goal-loop budgets (the loop is an [execution mode](execution-mode.md), not a kind of work). The lead shows the proposal and the human chooses it; a preset never approves a cycle or silently changes an existing one. A cycle can choose a different tier or placement. The rigor tier table still controls test and review minimums.

| Placement | Human decision |
|---|---|
| `card` | At each card gate, then the cycle close review |
| `cycle` | At the cycle brief, then the cycle close review |
| `front` | At the design approval before card work, then the cycle close review |

## sketch

| Stage tiers (concept / alpha / beta / mvp / ga) | Approvals | Goal loop |
|---|---|---|
| spike / prototype / prototype / product / product | `cycle` | off |

For a small spike, the human's request can be the cycle choice when its scope is clear. Ask when the task's risk or depth is unclear.

## agile

| Stage tiers (concept / alpha / beta / mvp / ga) | Approvals | Goal loop |
|---|---|---|
| spike / prototype / product / product / hardened | `cycle` | off |

One cycle decision covers its cards. Selected verification depth still follows the work's risk and scope.

## hybrid

| Stage tiers (concept / alpha / beta / mvp / ga) | Approvals | Goal loop |
|---|---|---|
| spike / prototype / product / product / hardened | `card` | allowed: 40 iterations, 80 spawns |

This is the default and keeps the existing per-card human gate.

## waterfall

| Stage tiers (concept / alpha / beta / mvp / ga) | Approvals | Goal loop |
|---|---|---|
| prototype / product / product / hardened / hardened | `front` | allowed: 150 iterations, 300 spawns |

The human approves a complete design before cards move to ready. The loop must stop on budget, scope, or evidence limits and return to the human.

The regulated profile is not available yet. Installed preset JSON may tune these proposals; `validate` reports malformed data. Loop budgets also include three attempts without progress, three repeats of a failure, and three sweep rounds when the loop is allowed.
