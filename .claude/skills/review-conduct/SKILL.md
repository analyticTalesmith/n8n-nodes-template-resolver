---
name: review-conduct
description: Use when you give a review verdict, or when you receive a batch of review findings to act on. Shows how a clean verdict is earned and how findings are worked through one at a time.
---

# Review conduct

A review is worth what the reviewer tried and what the author checked. Two sides follow.

## Giving a review

- **A clean verdict shows its work.** "No findings" lists each attack you tried and what in the code made it fail. A bare "looks good" means you did not try, so it is not a verdict.
- **Findings come from reading.** Cite a file and line you opened in this review. A location recalled from memory or guessed from a name is invented, so leave it out.
- **Give one verdict and stand behind it.** Either the work needs changes or it does not. "Approve, but please fix these" asks for changes without saying so: if the points matter, ask for the change; if not, approve and move them to notes.
- **The count is whatever the change earned.** Many real findings on a bad change is correct; padding a good change to look thorough is not.

## Receiving findings

- **One unclear item stops the batch.** Findings can depend on each other, so a half-understood list gives a wrong fix. Ask about the unclear item before changing anything.
- **Apply one finding at a time, with the test that proves it.** Run that test before starting the next. A batch applied together hides which change broke what.
- **A rebuttal you got wrong is stated once, plainly.** Say what you checked, what the code does, that you are now fixing it, and do it. No apology and no defence.
- **Report what changed.** Name the file and the behaviour that is different. Skip thanks and agreement; the diff is the reply.
