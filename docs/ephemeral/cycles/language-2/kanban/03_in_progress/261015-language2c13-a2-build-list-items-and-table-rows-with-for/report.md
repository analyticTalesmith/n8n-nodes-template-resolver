# Report: list items and table rows with FOR and IF

Status: done with concerns (gate clean; card still in progress, not moved to review).

Branch feature/build-list-items-and, worktree .worktrees/feature-build-list-items-and, merged into feature/language-2 by sync (head: manifest amendment commit).

Paths changed: core/src/types.ts, parser.ts, interpreter.ts, analyze.ts, spec.ts; tests/language/list-table-children.test.ts (new, 1736 tests); golden cases tests/golden/render-cases/lang-list-for and lang-table-if; card folder files (spec in docs/ephemeral/work/<card>/, compat-probe-base.json, reviewer-brief.md, briefs, card.json amendments).

Results: gate command 1736/1736; full suite 42 suites, 10964 tests green; tsc --noEmit exit 0; gate.mjs --to review clean.

Documents/deltas: none (docs_impact none). Member runs: test writer 1, implementer 2 (build, then two test-defect fixes). Cleanup skipped: about 290 added lines in core, implementer reported only small parseListChild/parseRowChild shape duplication.

Test amendments (card.json test_amendments, approver build lead, project lead please confirm): (1) one compat row pinned "unclosed ROW before END_FOR in a TABLE FOR is a syntax error", which contradicts lc-close; it now expects the three rows. (2) golden helper returned "no result" for passing cases; three header rows expected a 5-hyphen separator where the unchanged rule gives 6. Manifest amended once: --edit of the test file (test writer committed it before the base).

Design points to look at in review: a FOR directly in a TABLE keeps the legacy parse, run and double node count; a FOR inside an IF that builds rows is strict and silent on non-iterables (missing name still strict missing-variable); an IF or FOR holding a ROW inside a legacy TABLE FOR now builds rows (it rendered nothing before); comments are now allowed directly in LIST and TABLE; a stray END_IF in a bare item now reads "Unexpected token in LIST: END_IF". Compat guard: base probe in docs/ephemeral/work/<card>/compat-probe-base.json; 160 lc-compat rows pass.

Rounds: no review yet; 0 findings, 0 rebuttals.

Questions:
1. Confirm the three test amendments (recommended: yes, all are test defects or a direct criterion consequence).
2. lc-compat has no traces in card.json (tool criterion, as in the previous card). Recommended: leave.
