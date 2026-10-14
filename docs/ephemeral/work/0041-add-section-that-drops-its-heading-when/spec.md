# Spec

## Acceptance criteria

- sc-heading: a SECTION with a quoted or variable title writes hashes, a space and the title, a blank line, the body with leading and trailing blank lines trimmed and one trailing line break, and consecutive sections are separated by one blank line
- sc-level: level defaults to 2, is clamped to 1 through 6, and a non-integer level is a type-error located at the SECTION tag
- sc-empty: a SECTION whose rendered body is only whitespace produces no output at all, heading and spacing included, and render stats count it in sectionsOmitted, also inside FOR loops and nested sections
- sc-keep: skip_empty=false keeps the heading of an empty section and does not count an omission
- sc-errors: an empty or missing title is a type-error, an unclosed SECTION is a syntax-error at its tag, and SECTION counts toward maxDepth
- sc-analyze: analyze counts SECTION in blocks, reads variables in the title and the body, and spec lists SECTION and END_SECTION
