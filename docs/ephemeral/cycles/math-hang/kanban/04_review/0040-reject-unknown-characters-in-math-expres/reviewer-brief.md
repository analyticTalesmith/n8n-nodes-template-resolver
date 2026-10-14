## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A character the math tokenizer does not know ends the render with a located error instead of hanging.
Card goal: tokenizeMath throws on an unknown character; render returns promptly.
Must not:
- change what any valid math expression evaluates to

## Questions

goal-critical: does every unknown character end tokenizing, including a quote, backslash and unicode?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/modules/template-resolver.md
