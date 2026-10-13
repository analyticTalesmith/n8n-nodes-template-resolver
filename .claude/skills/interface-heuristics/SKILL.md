---
name: interface-heuristics
description: Use when reviewing or checking a web-app interface change. Walk one flow against ten fixed usability rows, using the running page, and file each hit with where and what you saw.
---

# Interface heuristics

A fixed list makes interface findings cite a named standard and evidence instead of taste. Use the row names in findings.

## The rows

| Row | Probe for a web app |
|---|---|
| Visibility of system status | After each action, does the page show within a moment that it is working, done or failed? |
| Match with the real world | Do labels and messages use the user's words, not internal terms? |
| User control and freedom | Can the user undo, cancel or back out of each step without losing work? |
| Consistency and standards | Does the same thing look and behave the same here as elsewhere in the app? |
| Error prevention | Does the design stop a mistake before it happens, such as a confirm before deleting or a blocked invalid entry? |
| Recognition over recall | Is every option visible where it is needed, so nothing must be remembered from another screen? |
| Flexibility and efficiency | Can a repeat user go faster, with keyboard paths or defaults? |
| Minimalist design | Does every element on the screen serve the task at hand? |
| Error recovery | Does an error say what went wrong in plain words and offer the way forward? |
| Help | Is help findable at the point of need, short, and about the task? |

## Running it

1. Scope to one flow, one user type, one device size.
2. Use the page first: click, type, submit bad input, resize. Score only what you saw happen, not what the code suggests. Without a running page, score only what the diff shows and say so.
3. One finding per row hit: the row, where on the page, what you saw, and the failure scenario for the user.
4. A row that does not apply to the flow says why in one line. Do not leave it silent.

## What may block

A hit on a goal-critical rubric question is a goal-risk; a polish hit is drift. Only a hit with a failure scenario may block the work. A hit with no failure scenario is not a finding.

Spacing, type size and colour are not rows; leave them to the design standards.
