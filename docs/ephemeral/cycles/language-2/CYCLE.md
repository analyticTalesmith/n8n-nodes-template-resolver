---
summary: "Authors can loop with windows, an empty branch and key and value pairs, build lists and tables from loops and conditions, name values with SET, declare typed a…"
name: language-2
goal: "Authors can loop with windows, an empty branch and key and value pairs, build lists and tables from loops and conditions, name values with SET, declare typed and required inputs, and define and reuse macros and partials in the language itself, without leaving the house style or the no-eval core."
tier: product
stage: beta
approvals: front
status: open
verification_levels: []
review_sweeps: [malicious-path]
kind: feature
intent: [add]
purpose: ship
compatibility: additive
uncertainty: partly
reversibility: costly
size: several
oracle: [new-tests, person]
trigger: planned
legibility: documented
---

# language-2

## Goal

Authors can loop with windows, an empty branch and key and value pairs, build lists and tables from loops and conditions, name values with SET, declare typed and required inputs, and define and reuse macros and partials in the language itself, without leaving the house style or the no-eval core.

## Why this shape

Shape: kind feature; intent add; purpose ship; compatibility additive; uncertainty partly; reversibility costly; size several; oracle new-tests, person; trigger planned; legibility documented (inferred, unconfirmed). Overrides: none. Derived: risk low, blast module, rigor product, plan approval human.

## Stages

<!-- A stage is a question the cycle asks; record an answer only when it is surprising. Stages with an artifact are done when it exists. Record only: "- <stage> done: <evidence>" for a stage with no artifact, "- <stage> skipped (override): <reason>" for a skip where its own rule says run, and "- <stage> added: <reason>" for a stage chosen on purpose. A spine stage cannot be skipped. -->

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

Audience: the repository owner, people who clone the portfolio repo, and authors of multi-agent prompts (the 28-agent SEO pipeline). Why now: the second half of slice C of the feature spec; filters, operators, CASE and limits shipped in the cycle language, and the prompt-aware blocks of slice D are only useful once an author can repeat, name and reuse fragments. Contract: docs/living/architecture/language-contract.md. Decisions: ADR 0001, 0003 and 0007.

## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. When the cycle has no user-facing story, write none: <reason> (a reason is required). -->

none: the spec names no personas or stories and none are invented; spec section 2 (Tier 1) is the source.

## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Every line is typed and needs an id: "- `contract` `area-01` text" or "- `constraint` `area-02` must: text". The test plan and the cards cite these ids, and only ids defined here. Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. A Must-have met by a document or a decision has no natural test: write it as a constraint, evidence-required (or human-decides when a person chooses), for example "- `constraint` `doc-01` evidence-required: the glossary names the new term". -->

- `contract` `lang-for` FOR accepts `limit` and `offset`, an `{{ELSE}}` empty branch, key and value pairs (`AS k, v`) and the metadata `@total` and `@parent`; an unknown FOR argument is an error; TABLE rows built by FOR use the same loop.
- `contract` `lang-children` FOR and IF may produce LIST items and TABLE rows, with gap-free numbering.
- `contract` `lang-set` SET binds a block-scoped local from a variable expression.
- `contract` `lang-inputs` INPUT declares a variable's type and whether it is required; a missing required input is an error in every mode; analyze, validate and the n8n node use the declaration.
- `contract` `lang-macros` DEFINE and CALL give parameterised fragments with isolated scope; partials passed in the render options supply more DEFINEs; calls are bounded by depth, iterations, output size and node count.
- `contract` `lang-surfaces` spec(), the API, the CLI, the OpenAPI document, the README and the changelog describe every construct and option this cycle adds, and a test derives spec()'s block list from the lexer's keyword table.
- `constraint` `lang-compat` must: every existing test passes; the only amended existing test is tests/language/surfaces.test.ts (named in the SET card, logged in test_amendments); resolveTemplate keeps its outputs for every template that was valid before, except three named changes: words after a FOR item name that were silently ignored, a table-cell pipe after an even run of backslashes, and a path segment such as `.constructor` that read an inherited member.
- `constraint` `lang-no-deps` must: add no runtime dependency.
- `constraint` `lang-no-eval` must-not: evaluate template text as code, compile a template-supplied regular expression, or read a file named by a template or a partial.
- `constraint` `lang-bounded` must: no template or partials input makes render, validate or analyze grow work or memory exponentially or without bound through recursion, fan-out, repetition or rebinding: calls, loops, partials and SET values are all held by the four limits (maxIterations, maxOutputChars, maxDepth, maxNodes) and by one total runtime depth cap; every new limit failure is a located diagnostic, never a thrown RangeError and never a `type-error`. Out of scope, filed as a ticket: filter cost proportional to the size of the data on every evaluation (for example `sort | json` over 1 MiB data in a 10000-iteration loop).
- `constraint` `lang-errors` must: every new unknown name, bad argument or bad declaration is a located error in every mode (ADR 0003); strict mode governs only missing data.
- `constraint` `lang-style` evidence-required: the language contract and ADR 0007 describe SET, INPUT, DEFINE and CALL as built, with the single-tag rule.

## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

- Tier 2 constructs (TREE, TAG, UNTRUSTED, table upgrades, `as`, BLOCK budgets, MESSAGE, CACHE_BREAK).
- The `matches /re/` operator (deferred).
- Filesystem includes, template inheritance, custom JS helpers, a partials UI in the n8n node.
- Mutation of a bound name: SET never accumulates across loop iterations (a SET inside FOR is fresh each iteration).
- Any attribute-style block; every block keeps the paired house style, SET, INPUT and CALL are single tags (ADR 0007).

## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

- `core/src/` lexer, parser, interpreter, analyze, expressions (type only), render, spec, types, errors, whitespace, index; new scope.ts, macros.ts, inputs.ts (docs/living/architecture/modules/template-resolver.md)
- `n8n/TemplateResolver.node.ts` (same module page)
- `api/routes.ts`, `api/openapi.json` (modules/api.md); `cli/main.ts` (modules/cli.md)
- `README.md`, `changelog.md`, `tests/language/` (new files), `tests/golden/render-cases/lang-*` (new)

## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

A person judges the cycle done when the SEO-brief showcase template (SET, FOR with limit and ELSE, CASE with several values, a LIST built by FOR, join and upper filters, a macro defined in a partial) renders the expected file through render, the CLI and the API, the README documents every construct, filter, option and limit, the full suite passes and CI is green on both operating systems.

<!-- generated index: replace everything between this line and the end marker -->
- [design-approval.md](design-approval.md) — Design approval for the second language cycle: loops, children, SET, INPUT, macros and partials
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
<!-- end generated index -->
