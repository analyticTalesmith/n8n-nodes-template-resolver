## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: the README, the changelog, the language contract, the module pages and ADR 0007 describe every filter, operator, limit and WHEN form built in this cycle exactly as the code behaves, and a test keeps spec() in step with the lexer and the registry.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: does every README example, rendered as shown (same template, data and options), produce the output the README prints, and does the golden case render the README showcase template exactly?
goal-critical: does the README document each of the 23 registry filters (with their parameter forms), the operators `in`, `not in`, `between` and `.length`, the equality rule, the limit option `maxNodes` (API option, CLI flag, `limit-nodes`), each WHEN form and the render-only behaviors, with no claim the code contradicts?
goal-critical: do the language contract, the template-resolver, api and cli module pages and the headless contract match the code (defaults, option names, flags, diagnostic codes, spec shape)?
goal-critical: does ADR 0007 give context, the options considered, the decision and its consequences, consistent with ADR 0001, without describing SET, INPUT or CALL as built?
goal-critical: does the test prove every lexer keyword, every registry filter and every operator the evaluator supports is in spec(), and would it fail if one were removed?
polish: are the documents free of plan codes and review-process words?

## Rubric

- each criterion is met by the diff and its test
- the card scope is respected (README, changelog, the surfaces test, the showcase golden case, and the living documents through deltas)
- nothing is described as available that the code does not do

## Design context

- docs/living/architecture/language-contract.md
- docs/living/architecture/modules/template-resolver.md
- docs/living/decisions/adr/0001-house-style-for-every-block.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
