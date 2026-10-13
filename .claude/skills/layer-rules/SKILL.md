---
name: layer-rules
description: Use when writing the layer rules in an architecture overview, or when placing new code in a web app. Each piece of code lives in one layer, imports point only downward, and an upward import stops for a decision record.
---

# Layer rules

A boundary checker enforces the layer section of the overview. If the section is missing or vague, nothing is enforced and code drifts upward. Your job is to place code and to refuse upward imports. Configuring the checker is not your job.

## Two rules

1. Every piece of code belongs to exactly one layer. If it seems to fit two, it does two jobs: split it.
2. A layer imports only from layers below it, never above and never sideways into another feature's internals.

## Default layers for a web app

Top to bottom. Each may import only from the rows beneath it.

| Layer | Does | Never |
|---|---|---|
| Page | Maps a route to a composition of features | Holds logic or fetches data |
| Feature | Joins one capability's visuals to its state | Imports another feature's internals |
| Visual | Renders given inputs, reports user events | Fetches data or reads shared state |
| State and logic | Holds state, runs rules, calls services | Renders anything |
| Service | Talks to the outside: network, storage | Knows the UI exists |
| Types | Shapes and validation of data | Imports anything but other types |
| Utilities | Small pure helpers | Imports anything but other utilities |

Rename or merge layers when the project truly differs, and say why in the overview.

## Writing them down

Put one entry per layer in the overview, in the form the checker reads: layer name, then the path pattern that holds it, then the layers it may import. Every source path must match exactly one pattern. A path that matches none is a gap in the rules, not an exception.

## Placing code

- Decide the layer before choosing the file. Name the layer in your plan.
- If code needs something from a layer above, the code is in the wrong layer. Move it down, or pass the value in from above.

## When the right design needs an upward import

Stop. Do not add the import and do not weaken the rules to let it pass. Write up the need and ask the human for a decision record that changes the rules. Continue only after it is accepted and the overview is updated.
