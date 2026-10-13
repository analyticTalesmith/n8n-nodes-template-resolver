---
name: design-craft
description: Use when building, reviewing or briefing a front end, or writing the Do's and Don'ts of DESIGN.md. A dated library of tells to avoid, each paired with what to do instead.
---

# Design craft

The library is `entries.json`, next to this file. A ban alone only moves the default somewhere else, so every entry pairs the tell with a direction to follow.

## Before you read the entries

1. Pick the surface mode first: `persuade` (landing and marketing pages), `operate` (a product UI people work in) or `read` (docs and long text). Read only the entries whose `modes` hold it.
2. Settle the positive direction before any ban:
   - a named palette of four to six colours, each with a role;
   - a role for each typeface, taken from the system's font tokens;
   - one signature element, where the page spends its boldness;
   - interface copy in sentence case.

## Entry fields

- `tell`: what to avoid, in one sentence.
- `instead`: what to do, which a builder can act on.
- `detection`: `deterministic` or `judgment`.
- `modes`, `family`, and `sources` with dates.

## Deterministic entries

These name a `prism_tell` (Prism's page lint) or a `gate_rule` (this project's gate). A `gate_rule` entry is enforced by the gate; a `prism_tell` entry is enforced only where Prism's `lint_page` runs. Fix what the tool reports and do not argue it; without Prism, check by eye using the entry's tell and instead. A line that is deliberate may carry the allow marker the gate documents.

## Judgment entries

These carry a `prompt`, a question for the reviewer. A builder asks it of the finished work; a reviewer answers it with evidence from the page. A no is a finding, and the `instead` line is the fix.

## Dates and versions

`entries.json` holds its own `version` and `dated`, and the Prism commit the tell ids were read at. Advice goes stale: when two entries disagree, the newer source date wins. A project's own `DESIGN.md` values win over any entry, and the brief's words win over both.

## Where it is used

- Builders read it before writing UI and again before reporting done.
- The UX designer reads it while writing screen specs.
- The design system steward names it in the Do's and Don'ts of `DESIGN.md`.
- The planning lead lists it in the reviewer brief for a card that changes a front end.
