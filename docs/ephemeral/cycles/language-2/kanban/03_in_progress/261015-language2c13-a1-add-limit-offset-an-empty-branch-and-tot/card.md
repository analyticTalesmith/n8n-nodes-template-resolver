# Add limit, offset, an empty branch and @total to FOR on one loop runner and a scope stack

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

One loop runner, on a scope stack that can chain, serves FOR and TABLE-FOR; FOR gains the window, the empty branch and `@total`.

## Must-haves

- `contract` `fw-window` a literal or a path gives the window; a negative, non-integer, non-numeric or unsafe-integer value is a `type-error` located at the FOR in every mode; a missing path is `missing-variable` in strict mode and an ignored argument in lenient mode; the paths are read in the scope outside the loop.
- `contract` `fw-meta` `@index0 @index1 @first @last @notFirst @notLast` describe the position in the rendered window; `@total` is the number of items the loop renders after offset and limit, the same on every iteration; outside a loop `@total` is a missing variable.
- `contract` `fw-else` the empty branch renders exactly when zero items render: an empty array, offset past the end, `limit=0`, a missing or non-iterable value in lenient mode; it does not render when one item renders; a strict non-iterable keeps today's located `type-error`; the loop name and the `@` names are not bound inside the ELSE body; a second ELSE in one FOR is a `syntax-error` at it; an IF's own ELSE and a FOR inside an IF branch are not confused; ELSE after ELSEIF or outside IF and FOR keeps today's "Unexpected token".
- `contract` `fw-args` an unknown argument (`max=3`), a repeated argument, trailing words and a missing item name are a `syntax-error` at the FOR tag in every mode, even in a branch that never renders (question 5).
- `contract` `fw-table` TABLE rows built by FOR use the same runner and get window, ELSE (its body holds ROWs) and `@total`; the legacy rule "a non-iterable renders no rows, even in strict mode" is kept (question 4) and in that case the ELSE rows render, without an error;
- `contract` `fw-limits` each rendered item counts toward `maxIterations` (skipped offset items do not); the running output check applies inside the loop and the ELSE body; `stats.iterations` counts rendered items.
- `contract` `fw-scope` loop names and metadata live on a stack frame that is gone after END_FOR; an outer loop's name and metadata are visible again after an inner loop; an inner name shadows an outer or data name only inside; frames carry a parent link so L6 adds `@parent` without reworking the stack.
- `contract` `fw-no-copy` conditions, math and filters read variables through the scope chain; `resolveTemplate` over a loop with an IF, with the data given as a Map subclass that counts `Symbol.iterator`, `entries`, `keys` and `forEach` calls, makes zero copies of the data map during the run (red today: `getAllVariables` copies per condition). The test calls `resolveTemplate` because `render` builds its own Map.
- `contract` `fw-own` a non-root path segment reads own properties only, in output, conditions and math (`x.constructor`, `x.__proto__`, `x.toString` and `@parent.constructor` are missing, not inherited engine objects); an own key with those names still works.
- `contract` `fw-compat` the full suite passes, including `tests/regressions/nested-for.test.ts` and the TABLE tests of `tests/TemplateResolver.node.test.ts`; no existing test file changes.

## Acceptance criteria

- fw-window: a literal or a path gives the window; a negative, non-integer, non-numeric or unsafe-integer value is a `type-error` located at the FOR in every mode; a missing path is `missing-variable` in strict mode and an ignored argument in lenient mode; the paths are read in the scope outside the loop.
- fw-meta: `@index0 @index1 @first @last @notFirst @notLast` describe the position in the rendered window; `@total` is the number of items the loop renders after offset and limit, the same on every iteration; outside a loop `@total` is a missing variable.
- fw-else: the empty branch renders exactly when zero items render: an empty array, offset past the end, `limit=0`, a missing or non-iterable value in lenient mode; it does not render when one item renders; a strict non-iterable keeps today's located `type-error`; the loop name and the `@` names are not bound inside the ELSE body; a second ELSE in one FOR is a `syntax-error` at it; an IF's own ELSE and a FOR inside an IF branch are not confused; ELSE after ELSEIF or outside IF and FOR keeps today's "Unexpected token".
- fw-args: an unknown argument (`max=3`), a repeated argument, trailing words and a missing item name are a `syntax-error` at the FOR tag in every mode, even in a branch that never renders (question 5).
- fw-table: TABLE rows built by FOR use the same runner and get window, ELSE (its body holds ROWs) and `@total`; the legacy rule "a non-iterable renders no rows, even in strict mode" is kept (question 4) and in that case the ELSE rows render, without an error;
- fw-limits: each rendered item counts toward `maxIterations` (skipped offset items do not); the running output check applies inside the loop and the ELSE body; `stats.iterations` counts rendered items.
- fw-scope: loop names and metadata live on a stack frame that is gone after END_FOR; an outer loop's name and metadata are visible again after an inner loop; an inner name shadows an outer or data name only inside; frames carry a parent link so L6 adds `@parent` without reworking the stack.
- fw-no-copy: conditions, math and filters read variables through the scope chain; `resolveTemplate` over a loop with an IF, with the data given as a Map subclass that counts `Symbol.iterator`, `entries`, `keys` and `forEach` calls, makes zero copies of the data map during the run (red today: `getAllVariables` copies per condition). The test calls `resolveTemplate` because `render` builds its own Map.
- fw-own: a non-root path segment reads own properties only, in output, conditions and math (`x.constructor`, `x.__proto__`, `x.toString` and `@parent.constructor` are missing, not inherited engine objects); an own key with those names still works.
- fw-compat: the full suite passes, including `tests/regressions/nested-for.test.ts` and the TABLE tests of `tests/TemplateResolver.node.test.ts`; no existing test file changes.

## Must-nots

- change any existing test expectation other than the one named amendment (if any)
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown name or bad argument pass in lenient mode (ADR 0003)

## Context links

- [Language contract](../../../../../../living/architecture/language-contract.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

See the plan section for this card in docs/ephemeral/research/language-2-plan.md (syntax settled here, files, risks); the criteria above are the contract.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/scope.ts` | add | template-resolver |
| `tests/language/for-window.test.ts` | add | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/expressions.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/golden/render-cases/lang-for-window/data.json`, `tests/golden/render-cases/lang-for-window/expected.md`, `tests/golden/render-cases/lang-for-window/options.json`, `tests/golden/render-cases/lang-for-window/template.md`, `tests/language/for-window.test.ts`
<!-- end generated scope -->
