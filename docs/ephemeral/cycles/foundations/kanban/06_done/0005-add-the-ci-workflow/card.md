# Add the CI workflow

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Add a GitHub Actions workflow that installs, builds and tests the package on the current Node LTS, on ubuntu and windows, for pushes to main and for pull requests. The repo's .gitignore currently ignores .github/, which would hide the workflow, so stop ignoring it.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `ci-01` the workflow runs on push to main and on pull_request, on a matrix of ubuntu-latest and windows-latest with the lts/* Node version
- `contract` `ci-02` the workflow runs npm ci, npm run build and npm test in that order
- `contract` `ci-03` .gitignore no longer ignores .github and git does not ignore the workflow file
- `contract` `ci-04` with dependencies installed, npm run build exits 0 and writes the compiled node entry listed in package.json n8n.nodes


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- publish anything or add a release job
- add secrets or tokens
- change source under nodes/


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

none: no public interface changes.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `.github/workflows/ci.yml` | add | build-tooling |
| `.gitignore` | edit | build-tooling |

Files scope: `.github/workflows/ci.yml`, `.gitignore`
<!-- end generated scope -->
