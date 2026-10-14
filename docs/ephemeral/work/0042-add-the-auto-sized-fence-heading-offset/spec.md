# Spec

## Acceptance criteria

- fe-autosize: FENCE outputs a fence of at least three backticks and longer than the longest backtick run in its body, then the optional lang, the body with one leading and one trailing line break removed, and the closing fence with a trailing line break
- fe-lang: lang may be a quoted string or a variable path; an empty or missing lang writes a bare fence; the fence filter does the same for a value, with an optional lang parameter
- fe-errors: an unclosed FENCE is a syntax-error at its tag, FENCE counts toward maxDepth and its tags follow the standalone-line rule
- ho-offset: heading_offset=N shifts every ATX heading line by N levels, clamped to 1 through 6, leaves headings inside fenced code blocks and non-heading hash text alone, accepts negative N, and a missing or non-integer parameter is a type-error
- em-modes: escape_md and escape_md=inline keep today's escaping, escape_md=block adds line-start escaping so a value cannot fake structure (leading hash, greater-than, dash, plus, star, pipe, digits followed by a dot or parenthesis, runs of three or more dashes, equals, backticks or tildes), and any other mode is a type-error
- fe-spec: spec lists FENCE and END_FENCE and the fence, heading_offset and escape_md modes in filters, and analyze counts FENCE in blocks and accepts the new filters
