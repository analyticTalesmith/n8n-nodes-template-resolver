# Context for Raw block outputs its text literally

Working memory for this ticket, next to card.md. The lead updates it in small edits as the conversation goes. It moves with the card, reaches the living documents only when the human approves, and is archived at done.

## Decisions

<!-- Dated, one line each: `2026-10-07: the human decided X`. The human's direction is recorded as a decision; an agent suggestion is marked `proposal` until the human accepts it. -->

## Open questions

<!-- What is still unanswered. -->

## Hypotheses

<!-- Each marked `untested`, `supported` or `unsupported`, with what showed it. -->

## Micro-research

<!-- Small findings that bear on this ticket, with where they came from. -->

## Scope exceptions

<!-- Append-only. When a change outside Scope is needed and the plan clearly implies it, the lead adds one row: date, path, kind (add, edit or remove), reason, approved by. The gate accepts a change outside Scope only when it is listed here, and flags it for the human. -->

| Date | Path | Kind | Reason | Approved by |
| --- | --- | --- | --- | --- |
| 2026-10-13 | nodes/TemplateResolver/utils.ts | edit | review finding f1: the n8n node detects variables by scanning the template text, so a variable tag inside RAW would be reported missing in strict mode; the cycle goal cannot be met in the node without it | project lead |
| 2026-10-13 | test-node/raw-block-review.test.ts | add | regression tests for review findings f1 to f3 | project lead |
| 2026-10-13 | docs/ephemeral/backlog/0008-follow-up-closing-tag-match-allows-only/card.json | add | follow-up ticket filed from review finding f4 | project lead |
| 2026-10-13 | docs/ephemeral/backlog/0008-follow-up-closing-tag-match-allows-only/card.md | add | follow-up ticket filed from review finding f4 | project lead |
| 2026-10-13 | docs/ephemeral/backlog/0008-follow-up-closing-tag-match-allows-only/context.md | add | follow-up ticket filed from review finding f4 | project lead |
| 2026-10-13 | docs/ephemeral/backlog/0009-follow-up-variable-detection-strips-raw/card.json | add | follow-up ticket filed from review finding f6 | project lead |
| 2026-10-13 | docs/ephemeral/backlog/0009-follow-up-variable-detection-strips-raw/card.md | add | follow-up ticket filed from review finding f6 | project lead |
| 2026-10-13 | docs/ephemeral/backlog/0009-follow-up-variable-detection-strips-raw/context.md | add | follow-up ticket filed from review finding f6 | project lead |
