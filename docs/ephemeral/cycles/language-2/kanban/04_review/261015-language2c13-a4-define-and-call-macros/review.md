Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language2c13-a4-define-and-call-macros

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T16:31:11.679Z
- Stalled: no
- Brief mismatch: m1 and c13 forbid changing any existing test file, and the card's own must-not ("change any existing test expectation other than the one named amendment") repeats that. Yet the manifest and files_scope list `tests/language/set.test.ts` as an edit, and the diff changes an expectation in it: the st-keywords derived block table now also expects DEFINE and CALL. That set.test.ts row pins the keyword table to today's rows plus SET, so any implementation of c12 (new lexer keywords) must change it. The criteria contradict the manifest. The lead should name this amendment in m1 and c13, or move the row, rather than treat the edit as a violation. Second, m5's exception list does not cover the new running output check. That check can now fail templates whose final output fits but whose untrimmed intermediate body does not (see the finding below). Either the code or m5 must change.
- Raised: f1, f2, f3

Restatement: Add macros to the deterministic, no-eval template language. `{{DEFINE name(params)}}...{{END_DEFINE}}` may appear only at the top level, is hoisted and prints nothing. `{{CALL name(args)}}` is a single tag that prints the body for positional path or literal arguments. A body sees only its parameters and the data. A call never leaks or reads the caller's locals, loop names or @ metadata. An unknown macro, a wrong argument count or bad syntax is a located syntax-error before any output, in every mode. Recursion, fan-out and output growth across calls are bounded by one runtime depth counter (maxDepth, capped at 256), by maxIterations (every CALL counts one) and by a running maxOutputChars check. An error inside a body stays at the failing body node and names the innermost macro and its CALL position. A stray RangeError becomes limit-depth in render, validate and analyze. analyze and validate walk each body once and never follow a CALL. Every template that was valid before keeps its output and error, except for the two named exceptions.

## Findings

### f1: A DEFINE inside a top-level ROW or HEADER is accepted silently instead of a syntax-error, and analyze then lists a macro that render does not have

- Class: defect
- Status: open
- Serves: c1: c1 requires that a DEFINE inside any block is a syntax-error at the DEFINE. parseDefine rejects only when `this.depth > 0`. A ROW or HEADER written at the top level is parsed by parseNode (parseTableRow or parseTableHeader) without nested(), so depth stays 0 and the inner DEFINE is accepted. topLevelDefines reads only program.body, so this DEFINE never enters the macro table. A template without a CALL renders ok, with no error. With a CALL, the author gets 'Unknown macro: a' at the CALL instead of an error at the misplaced DEFINE. analyze's Walker reaches the DEFINE through visitCells, so it counts blocks.DEFINE and lists 'a' in `macros`, while render and analyze's own link check say 'a' does not exist (c11 consistency).
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1) render("{{ROW}}{{DEFINE a()}}x{{END_DEFINE}}{{END_ROW}}", {}) returns ok:true with output "". Expected: syntax-error at 1:8. 2) render("{{ROW}}{{DEFINE a()}}x{{END_DEFINE}}{{END_ROW}}{{CALL a()}}", {}) returns syntax-error 'Unknown macro: a' at the CALL, not at the DEFINE. 3) analyze of the first template returns macros [{name:'a',params:[]}] and blocks.DEFINE 1. The same holds with {{HEADER}}...{{END_HEADER}} at the top level. Smallest change that restores c1: reject a DEFINE whenever it is not a direct child of the program body. For example, dispatch DEFINE only from parse()'s top-level loop and let parseNode report it as the top-level error, or track a flag set while parsing ROW, HEADER and LIST_ITEM content.
- Evidence: diff:core/src/parser.ts, diff:core/src/macros.ts, diff:core/src/analyze.ts, code:core/src/parser.ts:2640

### f2: The running output check counts body text that SECTION and LIST_ITEM later trim, so templates valid before now fail with limit-output

- Class: defect
- Status: open
- Serves: m5: m5 forbids changing the output or error of any template that was valid before, except for two named cases. A limit-output that now fires for a template that never overflowed is not one of them. renderChildren adds every finished child's full length to `held` before the enclosing SECTION strips leading and trailing blank lines (or drops a skip_empty body that is all whitespace) and before LIST_ITEM content is .trim()-ed. Before this change, only the final text was measured. A template whose final output fits maxOutputChars but whose untrimmed body does not now fails.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Data v = "x" + "\n".repeat(30), limits {maxOutputChars: 20}. render('{{SECTION "T"}}${{v}}{{END_SECTION}}', {v}) at base returns ok with "## T\n\nx\n" (8 chars). At head: held reaches 31 > 20, giving limit-output at the variable. The same happens with v = " ".repeat(30) (base: the section is omitted, output "") and with '{{LIST}}{{LIST_ITEM}}${{v}}{{END_LIST_ITEM}}{{END_LIST}}' with v = "x" + " ".repeat(30) (base: "1. x"). Smallest change that restores m5: keep the in-body running check from tripping on characters a trimming body can still drop. For example, have SECTION and LIST_ITEM bodies not count trailing and leading blank runs in `held` until non-blank output follows, or have the lead add this case to m5's named exceptions.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:956, code:core/src/interpreter.ts:1068

### f3: Output from sibling LIST items and TABLE cells is outside the running check, so calls there run unbounded until the LIST or TABLE returns

- Class: goal-risk
- Status: open
- Serves: c7: The card and cycle goal says output growth across calls is bounded by the output limit, and c7 says maxOutputChars is enforced across macro bodies, before the work holds much more than twice the limit. collectListItems pushes finished item lines into a local `lines` array, and processCellsArray and collectRows build cell strings, without adding them to `held`. Only each item's own content (or each macro body) is checked. So N CALLs spread over N LIST_ITEMs or N ROW cells all run, each up to the limit minus the outer held total, before visitList or visitTable returns and the parent body finally trips. With maxIterations 10000 and a large body, the interpreter can hold thousands of times the limit. If the string grows past the engine's maximum, that RangeError is reported by the new render net as limit-depth 'The template nests too deeply to run', the wrong code and message.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Template: '{{DEFINE a()}}' + 'x'.repeat(100) + '{{END_DEFINE}}{{IF t}}{{LIST}}' + '{{LIST_ITEM}}{{CALL a()}}{{END_LIST_ITEM}}'.repeat(100) + '{{END_LIST}}{{END_IF}}', data {t:true}, limits {maxOutputChars: 1000}. render returns limit-output, but stats.iterations is 100 (every call ran), not the ≤22 that mc-output's stopsNearTheLimit bound asks for. The same happens with '{{TABLE}}{{ROW}}' + '{{CALL a()}}|'.repeat(100) + '{{END_ROW}}{{END_TABLE}}'. Smallest change: count each finished LIST line and each finished cell or row into `held` (and release it when the LIST or TABLE returns), as renderChildren does for other bodies.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:1033, code:core/src/interpreter.ts:1250, diff:core/src/render.ts, test:mc-output: 100 calls of a 100-character macro from a LIST_ITEM end in limit-output at the 11th call
