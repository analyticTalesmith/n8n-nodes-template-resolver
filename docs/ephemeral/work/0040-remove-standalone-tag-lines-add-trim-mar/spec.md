# Spec

## Acceptance criteria

- ws-standalone: with standaloneLines on, a line holding only whitespace and block tags (IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR and comments) disappears with its line break, while a line that also holds text or a variable, and LIST, LIST_ITEM, TABLE, HEADER and ROW tags, keep their old spacing
- ws-trim: a minus marker after the opening braces trims all whitespace before the tag and a minus marker before the closing braces trims all whitespace after it, both on every block tag and comment, with the standalone option on or off
- ws-option: render defaults standaloneLines to true, resolveTemplate defaults it to false so the whole existing suite is unchanged, and an explicit option wins in both
- rw-raw: RAW and END_RAW output their content literally (no tags, variables or comments), keep spaces, turn CRLF into LF, work inside FOR and untaken IF branches, and an unclosed RAW is a syntax-error located at the RAW tag
- rw-escape: a backslash directly before the opening brace pair outputs the brace pair literally and consumes the backslash; a backslash elsewhere is text; two backslashes before the pair give a literal backslash and an active tag
- rw-spec: spec lists RAW and its closer and the standaloneLines option
