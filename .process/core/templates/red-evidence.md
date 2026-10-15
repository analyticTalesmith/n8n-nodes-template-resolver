---
summary: One line saying which card these failing tests belong to.
command: ["node", "--test", "--test-reporter=tap", "test/example.test.mjs"]
exit_status: 1
---

# Red evidence

<!-- Write this with `node core/scripts/red-evidence.mjs <projectDir> <cardId>`, not by hand. It runs the card's gate command (or, for a card with no gate command, its first selected gates entry) and records one row per failing test. The log lives in the card's work folder, not in the card folder: docs/ephemeral/work/<card>/red-evidence.md. -->
<!-- The file is UTF-8 without a byte order mark, so a message may hold accented letters, CJK text or an emoji. Windows PowerShell 5.1 reads a file like this as the ANSI code page unless told otherwise and shows damaged text: read it with `Get-Content -Encoding UTF8 <file>`, or with any editor or `node -e` that reads UTF-8. The bytes are not damaged. -->
<!-- Test is the test name from the run. Criterion is the id a criterion text starts with, and it must appear in the test name. Reason is the kind label, a colon and the first line of the failure message. Only `assertion failed` is a valid red; `timeout`, `file failed to load`, `error thrown` and `cancelled` mean the test never reached its assertion. -->

| Test | Criterion | Reason |
| --- | --- | --- |
| x-01a: the behavior the criterion promises | x-01a | assertion failed: the message the assertion carries |
