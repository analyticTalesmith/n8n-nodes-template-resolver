Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0040-reject-unknown-characters-in-math-expres

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:14:48.416Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: When the math tokenizer meets a character it cannot place (a quote, backslash, non-ASCII letter, etc.) it must stop with an error instead of looping forever, so that resolveTemplate throws a TemplateError and render returns promptly with ok false and a located diagnostic, while every valid math expression keeps exactly the value it had before. Only core/src/expressions.ts may change.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:16:28.889Z
- Stalled: no
- Brief mismatch: none
- Raised: f3, f4

Restatement: When a math expression inside ${{...}} contains a character the math tokenizer does not recognise (a quote, backslash, non-ASCII letter and so on), tokenizing must stop with an error instead of spinning forever, and render must come back promptly with ok false and a located diagnostic, while every valid math expression keeps evaluating to exactly the same value as before. The only file in scope is core/src/expressions.ts.

- Response to f1: withdraw (evidence: code:core/src/expressions.ts:689, code:core/src/interpreter.ts:190-193, test:mh-no-hang: render returns ok false with a diagnostic for quote after plus)

## Findings

### f1: Unknown-character error is thrown as plain TypeError, so the interpreter discards it: strict mode reports a misleading missing-variable diagnostic and lenient mode renders ok with no diagnostic

- Class: goal-risk
- Status: withdrawn
- Serves: c1: Interpreter.visitVariable swallows math errors and only re-surfaces them when they are MathSyntaxError (interpreter.ts:190-193). The new throw uses TypeError, so for ${{ 1 + "x" }} strict render reports code missing-variable, message "Variable '1 + \"x\"' not found" (the unknown-character message never reaches the user), and render(t, {}, {strictMode:false}) returns ok:true, output "", diagnostics [] - no diagnostic at all, contrary to c1 'returns promptly with a diagnostic' and the cycle goal 'ends the render with a located error'. The hang is fixed; the diagnostic is not.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: In the worktree, transpile-require core/src and run render('${{ 1 + "x" }}', {}) -> diagnostics[0] = {code:'missing-variable', message:"Variable '1 + \"x\"' not found"}; then render('${{ 1 + "x" }}', {}, {strictMode:false}) -> {ok:true, output:'', diagnostics:[]}. Same for '${{ 1 + é }}'. Smallest fix: throw MathSyntaxError (already defined in errors.ts:90 and used for 'Unmatched parentheses' at expressions.ts:723) instead of TypeError at expressions.ts:689, so the interpreter surfaces the unknown-character message in strict mode (lenient-mode masking via MissingVariableError path should then be checked as well).
- Evidence: diff:core/src/expressions.ts, code:core/src/expressions.ts:688, code:core/src/interpreter.ts:176-194, code:core/src/errors.ts:90, test:mh-no-hang: render returns ok false with a diagnostic for quote after plus
- Reply after round 1 (fixed): restate: the unknown character error was swallowed by the math fallback; verify: strict render now reports type-error Unexpected character with a location; evidence: code:core/src/expressions.ts
- Review lead ruling after round 1: sustain: the math fallback swallowed the plain TypeError

### f2: Frozen test's 'backslash operand' case contains no backslash, so the goal-critical backslash path is untested

- Class: drift
- Status: filed (0041-follow-up-frozen-test-s-backslash-operan)
- Serves: card-goal: In the TS source the template literal is written with one backslash followed by a space, which JavaScript reads as an escaped space, so the actual template is ${{ 2 * }} with no backslash. The gate never exercises a backslash. Rendering a real backslash manually does terminate with a type-error diagnostic, so the code is fine; the gap is in the frozen test, outside this card scope.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Evaluate the TS string literal from test line 421 in node and print it: the output contains no backslash character.
- Evidence: test:mh-no-hang: resolveTemplate terminates and reports an error for backslash operand
- Review lead ruling after round 1: drift: the frozen case literal has no backslash; the code path is the same as for any unknown character

### f3: The frozen test's 'backslash operand' case contains no backslash, so backslash coverage rests on code reading only

- Class: drift
- Status: withdrawn
- Serves: c1: In the TypeScript source "${{ 2 * \ }}", the sequence backslash-space is an escape that yields a plain space, so the template is '${{ 2 * }}' and fails as 'Invalid math expression', never reaching the unknown-character branch. The gate passes without ever feeding a backslash to tokenizeMath. The implementation does handle a real backslash (verified manually: render returns type-error 'Unexpected character "\\"'), so this is a test-plan gap, not a defect in the diff.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: In the worktree, node -e 'console.log(JSON.stringify("${{ 2 * \ }}"))' prints "${{ 2 * }}". Rendering a template read from a file that contains a real backslash gives diagnostic 'Unexpected character "\\" in math expression'.
- Evidence: test:mh-no-hang: resolveTemplate terminates and reports an error for backslash operand, code:core/src/expressions.ts:688
- Review lead ruling after round 2: withdraw: duplicate of the ticketed test gap from round one

### f4: In lenient mode the unknown-character error is still swallowed: render returns ok true, empty output and no diagnostic

- Class: drift
- Status: filed (0042-follow-up-in-lenient-mode-the-unknown-ch)
- Serves: cycle-goal: render('${{ 1 + "x" }}', {}, { strictMode: false }) returns { ok: true, output: '', diagnostics: [] }. The hang is gone, but the render does not end with a located error in lenient mode. This is the pre-existing behavior for every math error (interpreter.ts only re-raises a MathSyntaxError when lookup throws MissingVariableError), lives in interpreter.ts outside the card's scope, and c1 is met in the default strict mode, so it is noted for the lead rather than asked as a fix.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Transpile-require core/src in the worktree and call render('${{ 1 + "x" }}', {}, { strictMode: false }); observe ok true and diagnostics [].
- Evidence: code:core/src/interpreter.ts:185-194, code:core/src/expressions.ts:688-694
- Review lead ruling after round 2: drift: lenient mode treats unparseable math as a plain variable path by design; ticketed
