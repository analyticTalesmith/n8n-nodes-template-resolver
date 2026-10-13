---
name: atom
description: Use when writing a design fact others link to, as one atom with an id, a source and typed links.
---

# Atom

An atom is one design fact in one file, so it is stated once and every other document links to it. Copy the template for its type from `.process/core/templates/atoms/` (in the Aperture checkout, `core/templates/atoms/`). The default captures are in `planning/`: outcome brief, persona, story, acceptance scenario and vision.

## Frontmatter

| Field | Rule |
|---|---|
| `id` | Type prefix plus a short slug, lowercase words joined by hyphens, unique in the project, never reused. |
| `type` | One of eleven: outcome, actor, object, action, rule, boundary, interface, surface, decision, risk, test. |
| `summary` | One sentence, at most 160 characters. It is what the index shows. |
| `state` | `planned`, `built` or `validated`. New files are `planned`; a delta moves them. |
| `source` | Required on outcome, actor, object and rule: an atom id, `file:line`, or the word `assumption`. |
| `links` | A block list of `type: id` items, or `links: []`. |

Prefixes in use: out, actor, obj, act, rule, bnd, ifc, srf, dec, risk, test. Only the id syntax is checked.

## Links

Write each link on one side only; the other side is computed. Never keep a "used by" list.
- action: serves (outcome), performed-by (actor), acts-on (object), shown-on (surface), needs (action)
- object: contains, belongs-to, relates-to (object)
- rule: constrains (any atom but a test), verified-by (test)
- interface: provided-by, consumed-by (boundary or actor), carries (object)
- boundary: contains, depends-on; decision: decides, supersedes; risk: threatens, mitigated-by

## Rules

- One concept per file. A second concept means a second atom.
- Write what the source says. With no source, write `assumption`; never invent a fact to fill a field.
- A fact with nothing to say yields no file. "Nothing to add" is a complete answer.
- Status words get their own field: a decision's `status`, a risk's `treatment`, an interface's `stability`. Never put them in `state`.
- A rule that is not tested says so under a Waiver heading, with the reason and who accepted it.
- Create atoms only for the areas the current cycle touches. Do not convert the rest of the project.
- Owner is the team whose write surface holds the file.

## Changing an atom

Record one delta per atom id: add, modify or remove one file. The records team applies it when the cycle merges. Never change the id; to replace an atom, add the new one and remove the old.

## Views

Views are tables written inside atoms, such as an object map or a rule-to-test table. They are written, not generated, and checks read them.
