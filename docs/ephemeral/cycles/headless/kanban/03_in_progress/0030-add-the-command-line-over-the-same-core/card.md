# Add the command line over the same core

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A CLI with render, validate, analyze, spec and serve subcommands over core and the API, reading files or stdin, with documented exit codes and no new dependency.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `cl-render` render reads a template file or stdin and a data file or stdin, prints the output on stdout, prints diagnostics as file:line:col severity code message on stderr, exits 0 on ok and 1 on template errors, and --json prints the full result
- `contract` `cl-others` validate and analyze print JSON and validate exits 1 when not ok; spec prints the spec JSON
- `contract` `cl-usage` no arguments, an unknown subcommand or option, a missing file, bad data JSON and both inputs on stdin exit 2 with a message on stderr; --help prints usage and exits 0
- `contract` `cl-limits` --strict, --no-strict, --max-iterations, --max-output-chars and --max-depth reach the render options
- `contract` `cl-serve` serve starts the API on the given host and port and answers a request


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- add a runtime dependency
- write to stdout anything but the result
- leave a child process running after a test


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the README card documents the surface.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

the template-resolver command and its exit codes (design.md); main(argv, io) exported from cli/main.ts for tests.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `cli/index.ts` | edit | none |
| `cli/main.ts` | edit | none |

Files scope: `cli/`
<!-- end generated scope -->
