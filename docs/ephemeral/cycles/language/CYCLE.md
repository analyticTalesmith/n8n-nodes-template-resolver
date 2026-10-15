---
summary: "Authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself (filters, operators, CASE and FOR upgrades, SET, typed…"
name: language
goal: "Authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself (filters, operators, CASE and FOR upgrades, SET, typed inputs, macros and partials) without leaving the house style or the no-eval core."
tier: product
stage: beta
approvals: front
status: open
verification_levels: []
review_sweeps: []
kind: feature
intent: [add]
purpose: ship
compatibility: additive
uncertainty: partly
reversibility: costly
size: batch
oracle: [new-tests, person]
trigger: planned
legibility: documented
---

# language

## Goal

Authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself (filters, operators, CASE and FOR upgrades, SET, typed inputs, macros and partials) without leaving the house style or the no-eval core.

## Why this shape

Shape: kind feature; intent add; purpose ship; compatibility additive; uncertainty partly; reversibility costly; size batch; oracle new-tests, person; trigger planned; legibility documented (inferred, unconfirmed). Overrides: size. Derived: risk low, blast wide, rigor product, plan approval human.

## Stages

<!-- A stage is a question the cycle asks; record an answer only when it is surprising. Stages with an artifact are done when it exists. Record only: "- <stage> done: <evidence>" for a stage with no artifact, "- <stage> skipped (override): <reason>" for a skip where its own rule says run, and "- <stage> added: <reason>" for a stage chosen on purpose. A spine stage cannot be skipped. -->
- stg-goals-oracle done: goal: language growth; oracle: new tests per card plus every existing test
- stg-ready-check done: card has criteria, gate, manifest and red evidence before ready
- stg-plan-approval done: front approval recorded in design-approval.md

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

Audience: the repository owner, people who clone the portfolio repo, and authors of multi-agent prompts (the 28-agent SEO pipeline). Why now: slice C of the feature spec; the prompt-aware blocks of slice D are only useful once the core language can join, count, choose and reuse. Contract: docs/living/architecture/language-contract.md (planned). This cycle holds the first half of slice C: filters, limits, math, operators and CASE; FOR upgrades, LIST and TABLE children, SET, INPUT, macros and partials follow in the cycle language-2.

## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. When the cycle has no user-facing story, write none: <reason> (a reason is required). -->

none: the spec names no personas or stories and none are invented; spec section 2 (Tier 1) is the source.

## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Every line is typed and needs an id: "- `contract` `area-01` text" or "- `constraint` `area-02` must: text". The test plan and the cards cite these ids, and only ids defined here. Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. A Must-have met by a document or a decision has no natural test: write it as a constraint, evidence-required (or human-decides when a person chooses), for example "- `constraint` `doc-01` evidence-required: the glossary names the new term". -->

- `contract` `lang-filters` Every filter is dispatched from one registry that also feeds spec() and analyze; filters take and return values; filter arguments are parsed quote-aware at parse time; the text and collection filters of the language contract exist.
- `contract` `lang-math` Division or modulo by zero, a cyclic or unprintable value and a malformed math expression end render with a located error in every mode; arithmetic results print without binary float noise; a hyphen between two letters is part of a name.
- `contract` `lang-operators` Conditions support `in`, `not in`, `between [a, b]` and `.length`; equality compares numerically only when neither side is a quoted literal.
- `contract` `lang-case` WHEN accepts several values, a variable and a comparison.
- `contract` `lang-limits` maxNodes bounds the parsed size of a template and its partials and is reported as a located diagnostic.
- `contract` `lang-surfaces` spec(), the API, the CLI, the OpenAPI document, the README and the changelog describe every filter, operator, limit and WHEN form this cycle adds, and a test keeps spec() in step with the lexer and the registry.
- `constraint` `lang-compat` must: every existing test passes; the only amended existing tests are those the plan names, each logged in test_amendments; resolveTemplate keeps its outputs.
- `constraint` `lang-no-deps` must: add no runtime dependency.
- `constraint` `lang-no-eval` must-not: evaluate template text as code or compile a template-supplied regular expression.
- `constraint` `lang-style` human-decides: statement tags without a body (SET, INPUT, CALL) are recorded as an ADR beside ADR 0001. Decided by the human in chat on 2026-10-14: yes; the ADR is written in this cycle, the tags are built in the next.

## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

- FOR upgrades, LIST and TABLE children, SET, INPUT, DEFINE, CALL and partials (cycle language-2).
- Tier 2 constructs not yet built (TREE, TAG, UNTRUSTED, table upgrades, `as`, BLOCK budgets, MESSAGE, CACHE_BREAK).
- The `matches /re/` operator (deferred).
- Filesystem includes, template inheritance, custom JS helpers, a partials UI in the n8n node.
- Any attribute-style block; every block keeps the paired house style.

## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

- developer
- unit-test
- ai-qa
- integration-test
- system-test
- end-to-end-test
- external-user

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

- `core/src/` lexer, parser, interpreter, expressions, filters (+ new filters-text.ts, filters-collection.ts), analyze, render, resolve, types, errors, whitespace, spec (docs/living/architecture/modules/template-resolver.md)
- `api/routes.ts`, `api/openapi.json` (docs/living/architecture/modules/api.md)
- `cli/main.ts` (docs/living/architecture/modules/cli.md)
- `README.md`, `changelog.md`, `tests/language/` (new), `tests/golden/render-cases/lang-*` (new)

## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

A person judges the cycle done when the README documents every filter, operator, node limit and WHEN form, a golden case renders a template that uses join, upper, in, between and a multi-value WHEN, the full suite passes and CI is green on both operating systems.

<!-- An approved design document may live in this folder under docs/ephemeral/ when design-approval.md lists it; the reviewer then sees it as approved design. List docs/x.md#Heading to approve only that section. -->

<!-- Session instructions: the depth script adds a dated one-line list under a Session instructions heading here, created on first use. Do not write instructions by hand or leave them only in chat. -->

<!-- generated index: replace everything between this line and the end marker -->
- [deltas/](deltas/INDEX.md) — Index of docs/ephemeral/cycles/language/deltas.
- [design-approval.md](design-approval.md) — Language cycle trial: the filter registry card only; design approved by the human in chat on 2026-10-14.
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
<!-- end generated index -->
