Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language2c13-a4-define-and-call-macros

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T16:31:11.679Z
- Stalled: no
- Brief mismatch: m1 and c13 forbid changing any existing test file, and the card's own must-not ("change any existing test expectation other than the one named amendment") repeats that. Yet the manifest and files_scope list `tests/language/set.test.ts` as an edit, and the diff changes an expectation in it: the st-keywords derived block table now also expects DEFINE and CALL. That set.test.ts row pins the keyword table to today's rows plus SET, so any implementation of c12 (new lexer keywords) must change it. The criteria contradict the manifest. The lead should name this amendment in m1 and c13, or move the row, rather than treat the edit as a violation. Second, m5's exception list does not cover the new running output check. That check can now fail templates whose final output fits but whose untrimmed intermediate body does not (see the finding below). Either the code or m5 must change.
- Raised: f1, f2, f3

Restatement: Add macros to the deterministic, no-eval template language. `{{DEFINE name(params)}}...{{END_DEFINE}}` may appear only at the top level, is hoisted and prints nothing. `{{CALL name(args)}}` is a single tag that prints the body for positional path or literal arguments. A body sees only its parameters and the data. A call never leaks or reads the caller's locals, loop names or @ metadata. An unknown macro, a wrong argument count or bad syntax is a located syntax-error before any output, in every mode. Recursion, fan-out and output growth across calls are bounded by one runtime depth counter (maxDepth, capped at 256), by maxIterations (every CALL counts one) and by a running maxOutputChars check. An error inside a body stays at the failing body node and names the innermost macro and its CALL position. A stray RangeError becomes limit-depth in render, validate and analyze. analyze and validate walk each body once and never follow a CALL. Every template that was valid before keeps its output and error, except for the two named exceptions.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T16:54:25.368Z
- Stalled: no
- Brief mismatch: The criteria and the card disagree about test files. c13 and m1 (from card.json) say no existing test file changes. card.md's mc-compat and its must-not allow a 'logged amendment' of the st-keywords row in tests/language/set.test.ts, and the manifest lists set.test.ts as an edit. The diff makes exactly that edit, but the scope exceptions log says 'No scope exceptions are logged'. Either c13 and m1 need the set.test.ts exception, or the amendment needs to be logged. I treated the set.test.ts edit as the intended one and did not file it as a finding. Separately, the manifest says tests/language/macros.test.ts is 'add', but the diff shows it as modified from a base blob (index ebbe375), so the file existed at base and is frozen.
- Raised: f4, f5, f6

Restatement: Add hoisted, top-level-only `{{DEFINE name(params)}}...{{END_DEFINE}}` and the single tag `{{CALL name(args)}}` to the deterministic, no-eval template language. A macro body sees only its parameters and the data. Link errors (unknown macro, wrong argument count, duplicate or misplaced DEFINE, bad header) are syntax errors found before any output, in every mode. Recursion, fan-out and output growth across calls stay bounded by one runtime depth counter (capped at 256), the iteration count and a running output check. An error inside a body keeps the failing node's position and names the innermost macro and its CALL. analyze and validate stay linear and agree with render. No template that was valid before changes its output or error, apart from the two named exceptions, and no existing test file changes.

- Response to f1: withdraw (evidence: diff:core/src/parser.ts, code:core/src/parser.ts:7077, test:mc-define: a DEFINE in a ROW, a HEADER or a LIST_ITEM is a syntax-error at the DEFINE)
- Response to f2: withdraw (evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:6236, test:mc-compat: a trimming body keeps the output it had before macros)
- Response to f3: withdraw (evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:6494, code:core/src/interpreter.ts:6680, diff:core/src/render.ts, test:mc-output: a finished list line, table cell and table row counts as it finishes)

## Gate-verified closures

- f5: verified by project lead at 2026-10-15T17:00:24.603Z; gate run at commit 7cc1c409821e; test tests/language/macros.test.ts; files core/src/interpreter.ts, docs/ephemeral/work/261015-language2c13-a4-define-and-call-macros/gate-run.json

## Findings

### f1: A DEFINE inside a top-level ROW or HEADER is accepted silently instead of a syntax-error, and analyze then lists a macro that render does not have

- Class: defect
- Status: withdrawn
- Serves: c1: c1 requires that a DEFINE inside any block is a syntax-error at the DEFINE. parseDefine rejects only when `this.depth > 0`. A ROW or HEADER written at the top level is parsed by parseNode (parseTableRow or parseTableHeader) without nested(), so depth stays 0 and the inner DEFINE is accepted. topLevelDefines reads only program.body, so this DEFINE never enters the macro table. A template without a CALL renders ok, with no error. With a CALL, the author gets 'Unknown macro: a' at the CALL instead of an error at the misplaced DEFINE. analyze's Walker reaches the DEFINE through visitCells, so it counts blocks.DEFINE and lists 'a' in `macros`, while render and analyze's own link check say 'a' does not exist (c11 consistency).
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1) render("{{ROW}}{{DEFINE a()}}x{{END_DEFINE}}{{END_ROW}}", {}) returns ok:true with output "". Expected: syntax-error at 1:8. 2) render("{{ROW}}{{DEFINE a()}}x{{END_DEFINE}}{{END_ROW}}{{CALL a()}}", {}) returns syntax-error 'Unknown macro: a' at the CALL, not at the DEFINE. 3) analyze of the first template returns macros [{name:'a',params:[]}] and blocks.DEFINE 1. The same holds with {{HEADER}}...{{END_HEADER}} at the top level. Smallest change that restores c1: reject a DEFINE whenever it is not a direct child of the program body. For example, dispatch DEFINE only from parse()'s top-level loop and let parseNode report it as the top-level error, or track a flag set while parsing ROW, HEADER and LIST_ITEM content.
- Evidence: diff:core/src/parser.ts, diff:core/src/macros.ts, diff:core/src/analyze.ts, code:core/src/parser.ts:2640
- Reply after round 1 (fixed): restate: A DEFINE inside a top-level ROW or HEADER was accepted; every DEFINE not directly in the program body must be a syntax-error at it.; verify: parse() starts DEFINE only at top level; parseNode rejects others at the DEFINE. render of the ROW repro now gives syntax-error 1:8; analyze throws.; evidence: diff:core/src/parser.ts, test:mc-define: a DEFINE inside a ROW or HEADER is a syntax-error at it

### f2: The running output check counts body text that SECTION and LIST_ITEM later trim, so templates valid before now fail with limit-output

- Class: defect
- Status: withdrawn
- Serves: m5: m5 forbids changing the output or error of any template that was valid before, except for two named cases. A limit-output that now fires for a template that never overflowed is not one of them. renderChildren adds every finished child's full length to `held` before the enclosing SECTION strips leading and trailing blank lines (or drops a skip_empty body that is all whitespace) and before LIST_ITEM content is .trim()-ed. Before this change, only the final text was measured. A template whose final output fits maxOutputChars but whose untrimmed body does not now fails.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Data v = "x" + "\n".repeat(30), limits {maxOutputChars: 20}. render('{{SECTION "T"}}${{v}}{{END_SECTION}}', {v}) at base returns ok with "## T\n\nx\n" (8 chars). At head: held reaches 31 > 20, giving limit-output at the variable. The same happens with v = " ".repeat(30) (base: the section is omitted, output "") and with '{{LIST}}{{LIST_ITEM}}${{v}}{{END_LIST_ITEM}}{{END_LIST}}' with v = "x" + " ".repeat(30) (base: "1. x"). Smallest change that restores m5: keep the in-body running check from tripping on characters a trimming body can still drop. For example, have SECTION and LIST_ITEM bodies not count trailing and leading blank runs in `held` until non-blank output follows, or have the lead add this case to m5's named exceptions.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:956, code:core/src/interpreter.ts:1068
- Reply after round 1 (fixed): restate: The running output check counted body text that SECTION, LIST_ITEM and cells trim, so valid old templates failed with limit-output.; verify: In trimming bodies a child counts its trimmed text plus CALL blanks. The 30-newline SECTION repro renders as at base (8 chars); guard rows match base probes.; evidence: diff:core/src/interpreter.ts, test:mc-compat: trimming bodies keep their base output

### f3: Output from sibling LIST items and TABLE cells is outside the running check, so calls there run unbounded until the LIST or TABLE returns

- Class: goal-risk
- Status: withdrawn
- Serves: c7: The card and cycle goal says output growth across calls is bounded by the output limit, and c7 says maxOutputChars is enforced across macro bodies, before the work holds much more than twice the limit. collectListItems pushes finished item lines into a local `lines` array, and processCellsArray and collectRows build cell strings, without adding them to `held`. Only each item's own content (or each macro body) is checked. So N CALLs spread over N LIST_ITEMs or N ROW cells all run, each up to the limit minus the outer held total, before visitList or visitTable returns and the parent body finally trips. With maxIterations 10000 and a large body, the interpreter can hold thousands of times the limit. If the string grows past the engine's maximum, that RangeError is reported by the new render net as limit-depth 'The template nests too deeply to run', the wrong code and message.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Template: '{{DEFINE a()}}' + 'x'.repeat(100) + '{{END_DEFINE}}{{IF t}}{{LIST}}' + '{{LIST_ITEM}}{{CALL a()}}{{END_LIST_ITEM}}'.repeat(100) + '{{END_LIST}}{{END_IF}}', data {t:true}, limits {maxOutputChars: 1000}. render returns limit-output, but stats.iterations is 100 (every call ran), not the ≤22 that mc-output's stopsNearTheLimit bound asks for. The same happens with '{{TABLE}}{{ROW}}' + '{{CALL a()}}|'.repeat(100) + '{{END_ROW}}{{END_TABLE}}'. Smallest change: count each finished LIST line and each finished cell or row into `held` (and release it when the LIST or TABLE returns), as renderChildren does for other bodies.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:1033, code:core/src/interpreter.ts:1250, diff:core/src/render.ts, test:mc-output: 100 calls of a 100-character macro from a LIST_ITEM end in limit-output at the 11th call
- Reply after round 1 (fixed): restate: Finished LIST lines and table cells did not count into held, so calls in sibling items or cells all ran; engine-size growth was reported as limit-depth.; verify: Lines and cells are held as they finish, restored on return: LIST repro 10 iterations, TABLE repro 11 (was 100). Invalid string length is limit-output in render.; evidence: diff:core/src/interpreter.ts, diff:core/src/render.ts, test:mc-output: 100 calls of a 100-character macro from LIST_ITEMs and cells stop near the limit

### f4: The frozen test file tests/language/macros.test.ts is modified by the diff

- Class: defect
- Status: withdrawn
- Serves: m1: macros.test.ts existed at base (the diff shows index ebbe375..41e6ce0, not a new file) and is listed as a frozen test. The diff edits it twice. It appends about 240 lines of new rows under a 'review fixes' banner, and it adds a comment at the PARENS rows telling readers to 'raise the depth if a machine overflows later'. The contract the work is judged against has therefore been rewritten by the work under review. Every row in that block (DEFINE placement in ROW/HEADER/LIST_ITEM, trimming-body guards, list/cell fan-out bounds, HUGE_CHAIN limit-output) is now a builder-written expectation rather than a frozen one. m1 and c13 forbid changing an existing test file, and the packet says a change to a frozen test is a deviation to report.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: In section 4, `diff --git a/tests/language/macros.test.ts b/tests/language/macros.test.ts` shows `index ebbe375..41e6ce0` with hunks `@@ -979,6 +979,7 @@` (an added comment line) and `@@ -1782,3 +1783,242 @@` (appended describe blocks). Run `git diff c96d1a74 2b9276fe -- tests/language/macros.test.ts` and the change is not empty. Smallest change that restores m1: revert macros.test.ts to its base content. Either move the new regression rows into a new test file (which needs a scope entry from the lead), or have the lead log them as a test amendment.
- Evidence: diff:tests/language/macros.test.ts, test:mc-define: a DEFINE in a ROW, a HEADER or a LIST_ITEM is a syntax-error at the DEFINE, test:mc-compat: a trimming body keeps the output it had before macros
- Review lead ruling after round 2: withdraw: the appended rows are logged in test_amendments for macros.test.ts, approved by the project lead; they test the first-round fixes; no existing row changed

### f5: CALLs in one text run of a legacy TABLE-FOR body all run before the output check sees any of them

- Class: goal-risk
- Status: verified
- Serves: c7: The card adds 'Call' to the inline kinds of the legacy text-row rule. In tableRowsFrom, flush() renders a run of several inline nodes with `run.map((node) => this.visit(node)).join("")` and only then hands the lines to addText, which is the only place the cells are held. Each CALL in the run checks `held` only while its own body is built, and releases it on return. The outputs of earlier siblings in the same run are never in `held`. runLoop checks the loop total only after the whole iteration. So N CALLs written in one line of a FOR inside a TABLE all run, each producing up to the limit, before limit-output trips. This is the same unbounded-sibling pattern f3 fixed for LIST lines and ROW cells, left open on this path. It breaks the cycle goal that every call and output is bounded and c7's 'before the work holds much more than twice the limit'.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Template: `{{DEFINE a()}}` + 'x'.repeat(100) + `{{END_DEFINE}}{{TABLE}}{{FOR one AS i}}` + '{{CALL a()}}'.repeat(100) + `|1\n{{END_FOR}}{{END_TABLE}}`. Data: {one:[1]}. Limits: {maxOutputChars: 1000}. Expected by c7: limit-output with stats.iterations at most about 22. Per the code in the diff, all 100 calls run (the run is visited whole at flush) before addText holds a cell, so stats.iterations is about 101. With a fan-out macro (each top-level call itself producing nearly the limit), the work held grows to N times the limit. Smallest change that restores c7: in flush, hold each visited node's output as it is produced, for example by rendering the run through renderChildren or by calling hold per node and releasing it after addText.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:967, test:mc-output: a finished list line, table cell and table row counts as it finishes
- Reply after round 2 (fixed): restate: In a legacy TABLE-FOR text row, flush() ran every inline node (many CALLs on one line) before any cell was held, so all calls ran before limit-output.; verify: flush() renders the run through renderChildren in a trimming context, counting each node as it finishes: the 100-call repro has stats.iterations <= 22 (was 101); legacy outputs equal base.; evidence: diff:core/src/interpreter.ts, test:mc-output: 100 calls in one legacy TABLE-FOR text row stop near the limit

### f6: CALL path arguments reject names the language accepts elsewhere (hyphenated and non-ASCII)

- Class: drift
- Status: filed (261015-language2c13-a10-follow-up-call-path-arguments-reject-nam)
- Serves: cycle-goal: macros.ts PATH is `^[A-Za-z_@][\w@]*(\.[\w@]+)*$`. The language contract says a hyphen between two ASCII letters is part of a name (`first-name`, `user.first-name`), and CASE matchers accept paths such as `café`. `{{CALL f(first-name)}}` and `{{CALL f(user.café)}}` are therefore syntax errors, even though `${{first-name}}` reads the key. Such data cannot be passed to a macro except through a SET first. The spec's argument list does not mention hyphens, so this is noted for the lead rather than requested as a fix.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: render('{{DEFINE f(p)}}${{p}}{{END_DEFINE}}{{CALL f(first-name)}}', {'first-name':'A'}) is a syntax-error 'Invalid CALL syntax: bad argument "first-name"', while render('${{first-name}}', {'first-name':'A'}) prints A.
- Evidence: diff:core/src/macros.ts, doc:docs/living/architecture/language-contract.md
