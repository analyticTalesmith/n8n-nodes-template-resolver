---
name: deliverables
description: Use before writing a readme, user or technical docs, spec, report, changelog or release notes. Compose from validated documents and cite each claim.
---

# Deliverables

A deliverable is a document written for someone who was not in the session. You compose it by hand from documents that already passed validation. There is no generator, and nothing here builds a document for you.

## Rules

- Compose only from validated documents. For a release candidate, use the built ones.
- Cite the source document for each claim, next to the claim.
- Never invent behavior. If the sources do not say it, the document does not say it.
- When a needed fact is missing, say so in the document and name what is missing. Do not fill the gap.
- Follow the section list of the type, in order. Drop a section only by saying why.
- Write for the reader named in the type file, not for the team.

## Composed from atoms

Where the project keeps atoms, a deliverable is composed from them and checked.

- Frontmatter: `summary`, `state`, `composed: <type>` (such as prd or user-docs), and `cites:`, a block list of `id: commit` items, one per atom id used, each with the commit it was verified at.
- Body: `##` sections. Each ends its claims with `[cites: id, id]`. Cite built or validated atoms only; never a planned one.
- One source of truth: a fact lives in its atom. Restate and link; never hold a second copy. A fact no atom holds goes to the owning team as a delta.
- A section that is not a claim, such as thanks, is headed `## Exempt: <name>`. It is rare and stays visible.
- When `deliverable-fresh` flags a section, the cited atom changed since its recorded commit. Recompose only the flagged sections, then record the new commit for their ids.

The checks are `deliverable-cites` (every section cited, every id exists and is not planned) and `deliverable-fresh` (every id recorded, none changed since).

## Types

Each type has a short file in `types/` with its reader, its inputs and its ordered sections.

- `readme.md`: first page of a project, for a newcomer.
- `user-docs.md`: how to use the product, for its users.
- `technical-docs.md`: how it is built and run, for maintainers.
- `specification.md`: what the product must do, for builders and reviewers.
- `report.md`: what was done and found, for decision makers.
- `changelog.md`: what changed in a cycle, built from deltas, closed tickets and known issues.
- `release-notes.md`: the changelog addressed to users, with an upgrade note.

## Adding a type

Copy a file in `types/`, rename it for the new type, and keep its shape: a title, a `Read by` line, an `Inputs` line, then the ordered section list with one line on what goes in each section. It is picked up with no other change.
