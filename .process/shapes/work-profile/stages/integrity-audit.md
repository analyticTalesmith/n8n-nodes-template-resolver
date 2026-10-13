---
id: stg-integrity-audit
type: stage
summary: Integrity audit: tampering and claims against evidence
state: built
code: U14
phase: up
form: judge
owner: review
who: script and reviewer
risk: Tests edited to go green and unsupported done claims.
skip: size in [trivial, card]
today: thin
today-note: test amendments and evidence checks exist; there is no freeze hash
links:
  - pairs-with: stg-red-first-tests
---

# Integrity audit: tampering and claims against evidence

Check that no test or gate file changed without a recorded reason and that every claim of done has evidence behind it. Skip it only when no existing test or gate file was touched.
