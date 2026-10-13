---
id: stg-workspace
type: stage
summary: Workspace, environment, secrets
state: built
code: I02
phase: implement
form: make
owner: build
who: agent; the human holds secrets
risk: Edits on trunk and leaked secrets.
skip: size in [trivial, card]
today: thin
today-note: worktree and a secrets check
links: []
---

# Workspace, environment, secrets

Work in a branch or worktree with the environment ready and no secrets in files. A disposable spike uses a scratch folder and throwaway credentials.
