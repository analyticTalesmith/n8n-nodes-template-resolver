# Default text may contain a pipe

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

`${{name ?? "a|b"}}` fails with "Unknown filter" because the variable expression is split on every pipe before the default text is read, so the second half of the default is treated as a filter name. A default value is free text and may contain a pipe (a path, a label such as "n/a | pending"); it must render whole, and filters after it must still apply.

## Must-haves

- `contract` `dp-01` A double-quoted default text after ?? may contain a pipe character and renders whole when the value is missing.
- `contract` `dp-02` Filters after a default that contains a pipe still apply to the default text.
- `contract` `dp-03` A single-quoted default containing a pipe renders whole, and defaults and filters without a quoted pipe behave as before.
- `constraint` `dp-04` must: leave the existing jest suite files untouched and keep the whole node:test suite passing.

## Must-nots

- Do not change how a pipe outside quotes separates filters.
- Do not change the ?? rule for which values count as empty.

## Context links

- none

## User documentation

none

## Interface contract

none: internal parser behavior; the public resolveTemplate signature is unchanged.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| nodes/TemplateResolver/parser.ts | edit | 20 | resolver-core |
