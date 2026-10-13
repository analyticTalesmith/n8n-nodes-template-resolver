---
id: stg-blind-evaluation
type: stage
summary: Blind evaluation against goals and anti-scope
state: built
code: U15
phase: up
form: judge
owner: review
who: an agent with fresh context
risk: Meets the diff and misses the intent.
skip: size in [trivial, card] and oracle lacks rubric and oracle lacks person
today: thin
today-note: the blind reviewer; the package is planned
links:
  - pairs-with: stg-goals-oracle
---

# Blind evaluation against goals and anti-scope

A fresh evaluator gets the goal, the anti-goals, the criteria and the diff, never the author's reasons.
