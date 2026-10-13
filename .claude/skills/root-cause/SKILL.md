---
name: root-cause
description: Use before changing code to fix a bug, a failing test or unexpected behaviour. Find the cause by testing hypotheses, fix it where it arises, and never patch or hide the symptom.
---

# Root cause

A fix made where the symptom shows leaves the defect in place: the bug comes back, moves, or is hidden. Find the cause first; the change comes after.

## The loop

1. **Reproduce.** Run the failing case yourself and note the exact command and the failing output. If you cannot make it fail, stop and report; do not guess a fix.
2. **Pin it with a failing test.** Write the smallest test that fails because of the bug, with the criterion id in its name, so the red-evidence check can match it. A test that fails for another reason (a missing import, a typo) pins nothing.
3. **State hypotheses.** Write each as a prediction: "if X is the cause, then Y will show." One hypothesis is fine when the cause is plain; list more when it is not.
4. **Test one at a time.** Use the smallest probe that can disprove it: a log line, a debugger step, a bisect, a reduced input, a targeted assertion. Change one thing per probe and remove the probe after. Mark each hypothesis held or ruled out, with what showed it.
5. **Stop at the cause.** The cause is the defect whose removal makes the symptom impossible, not the first place the symptom appears. Keep asking why until the answer is a wrong line or a wrong assumption, not another symptom.
6. **Record it.** Write the hypotheses tested, the evidence and the cause in the card's root-cause record before you change any code.
7. **Fix at the cause.** Make the smallest change that removes it. Run the pinned test and the tests around it. If the cause turns out different from the record, correct the record and say why.

## Never

- Patch the symptom: swallow or catch the error, add a null guard that hides a bad caller, raise a timeout, add a retry or a sleep, special-case the failing input, loosen or skip the test, or silence the log.
- Claim a cause you did not test. "Probably" is a hypothesis.
- Fix something else you noticed on the way. File a ticket for it.
- Change several things at once, so that nothing shows which one mattered.

## Stop and report

- You cannot reproduce the failure.
- Three hypotheses are ruled out and no evidence points to a new one.
- The cause lies outside the card's file scope, or in a dependency you do not own.
- The cause is a wrong requirement, not wrong code. Say so; the card goes back to shaping.

Report what each probe showed, and do not widen the scope.
