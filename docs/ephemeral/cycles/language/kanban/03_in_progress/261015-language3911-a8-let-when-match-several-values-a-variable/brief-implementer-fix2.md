# Brief: implementer, non-ASCII variable names in WHEN

Defect found before review: `{{CASE x}}{{WHEN cafe-with-accent}}` (a variable such as `café`) is a syntax-error "Cannot read {{WHEN}} value", while `{{CASE café}}` and `${{café}}` work. The WHEN path pattern `WHEN_PATH` in `core/src/expressions.ts` is ASCII only. Spec: a WHEN variable accepts the same names the CASE subject accepts.

Do this in the worktree (first `git merge --ff-only feature/language`):
1. Make the WHEN path pattern Unicode-aware (`u` flag, letters via `\p{L}`, digits via `\p{N}`, still `_`, `@` and `-` inside a name, dot-separated segments, a name may not start with a digit or hyphen, `1abc` stays a syntax-error, plain numbers stay number literals). Keep one pattern; do not copy.
2. Add rows to `tests/language/case.test.ts` (this is an approved-pending amendment recorded in card.json; add only these rows, in the existing tables, named with the criterion id): cs-var through all four entries with data `{ x: "a", "café": "a" }` and template `WHEN café` gives the match; a nested `user.prénom`; a comparison `{{WHEN == café}}`; cs-analyze lists `café` as a case variable; a cs-errors row that `1abc` and `é é` are still syntax-errors.
3. Gate, full suite, `npx tsc --noEmit -p .` green. Commit once: `fix(language): accept non-ASCII variable names in WHEN`. Never push, never redirect to nul, foreground. Report numbers and end with a status.
