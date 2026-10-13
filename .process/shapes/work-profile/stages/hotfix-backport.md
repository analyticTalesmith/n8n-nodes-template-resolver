---
id: stg-hotfix-backport
type: stage
summary: Hotfix and backport
state: built
code: R07
phase: release
form: make
owner: release-ops:release-lead
who: agent
risk: A fix that cannot reach the released lines.
skip: deployment in [none, served]
add-when: deployment in [library, customer-run]
today: absent
links: []
---

# Hotfix and backport

Apply a fix to each supported line. With one line (a hosted service) there is nothing to backport. Mitigate or roll back first; agents never touch main.
