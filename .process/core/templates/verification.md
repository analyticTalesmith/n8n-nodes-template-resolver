---
summary:
stream:
result:
verdict:
verification_verdict:
validation_verdict:
ran_against:
tier:
scope:
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# {{title}}
<!-- Stream: unit-test, integration-test, system-test, acceptance-test, end-to-end-test, ai-qa, developer, qa-team, external-user. Result: pass, fail, mixed (the older shape, still accepted below product tier). Verdict: accept, revise, blocked. At product tier and above also fill verification_verdict (accept, revise, blocked: does the work conform to the documents) and validation_verdict (accept, revise, blocked, not-assessed: does it meet the real need); the two are never merged, and verdict may be accept only when neither is revise or blocked. Ran against: code commit. Tier: cycle tier. Scope: card <id> or merge request <branch>. Cycle evidence uses level system/acceptance or lens red-team/security/unhappy-path/malicious-path with sweep_round. A human fills signed_off_by. For cited local docs, list local_docs paths and local_docs_sha256 entries as docs/path.md=<sha256>. -->
## Scope
<!-- What was checked and left out. -->
## Levels
## Evidence
<!-- Commands, output and screenshots under verification/evidence/<record name>/. Name traces and videos without committing raw captures. -->
## Conformance
<!-- One row per criterion, story, must-have and requirement id in scope. State: proven (ran and passed; give the command and what it showed), failed (ran, did not pass), could-not-run (say why) or not-checked (say why). Tier of the evidence: deterministic (a command or test with a fixed result), agent-observed (an agent watched the running system), llm-judged (a model scored it against a rubric) or human-confirmed (a named person confirmed it). An item you did not check is a row with its reason, never an omission. -->
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |

## Validation
<!-- Does the work meet the real need, judged apart from conformance. Same columns. A row is proven only with tier human-confirmed and the person's name in the evidence; a model's score is a hypothesis, never proof. Leave the table empty and set validation_verdict to not-assessed when no one judged this. -->
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
## Revise
<!-- For a revise verdict, what failed, where and the fix. Otherwise none. -->
## Known issues
<!-- Anything failed, uncertain or not checked. Otherwise none. -->
## Manual
<!-- Human-only checks and steps. A blocked item becomes accept only when the human says so. -->
