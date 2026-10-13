---
summary:
approved_by:
validates: []
---
# Close review: raw-block
<!-- Only a human fills approved_by after reading this review. Validates lists project-relative documents believed to match what shipped. -->
## What shipped
<!-- User and code changes from deltas, done cards and merge request records. -->
- {{RAW}} ... {{END_RAW}} outputs its text literally (lexer.ts), variable detection ignores RAW text (utils.ts), README section, living document docs/living/product/raw-block.md (state planned until the delta applies on merge).

## Evidence
<!-- Verification records and human sign-offs by path; show selected and tier-minimum levels beside what ran. -->
- verification/ record for the card, accept with rb-06 (person confirmation of the README example) not checked.
- node:test 28 of 28; old jest suite 446 of 446 from a copy with jest installed.

## Loop summary
<!-- If a goal loop ran: stop reason, iterations, spawns, autonomous decisions, exceptions and warnings. -->
No goal loop ran.

## Known issues
<!-- What still fails or was left out. Write none if nothing. -->
- Closing tag does not accept a newline inside the braces (backlog ticket).
- Variable detection strips RAW at text level, so a RAW spelling inside a comment could hide a variable (backlog ticket).
- rb-06 needs a person.

## Expected streams
<!-- Each stream in the cycle brief: reported with paths, or missing. -->
developer: reported through the verification records listed above.

## Untriaged feedback
<!-- Count and paths of new feedback items, or none. -->
none

## Decision
<!-- Human decision: accept, accept with follow-ups or send back. -->
Awaiting the human: accept, accept with follow-ups or send back. approved_by is left empty for the human.

