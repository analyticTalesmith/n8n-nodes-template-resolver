---
summary: First half of the prompt-aware language: whitespace rules, RAW and escaping, SECTION, FENCE, heading offset and escape modes.
state: planned
---

# Prompt-aware language contract (first half)

Settled decisions apply: ADR 0001 (every block is `{{KEYWORD ...}}...{{END_KEYWORD}}`), ADR 0002 (standalone block-tag lines vanish by default, `-` markers trim, an option turns the default off), ADR 0003 (unknown names always error).

## Whitespace

- **Standalone rule.** A line that holds only whitespace and one or more block tags is removed together with its line break. Block tags for this rule: IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR, SECTION, END_SECTION, FENCE, END_FENCE, RAW, END_RAW and comments `{{# ... #}}`. LIST, LIST_ITEM, TABLE, HEADER, ROW and their END tags are not subject to the rule (they have their own spacing). Lines that also hold text or a variable are untouched.
- **Trim markers.** `{{- TAG ...}}` removes all whitespace (spaces, tabs, line breaks) before the tag; `{{TAG ... -}}` removes all whitespace after it. Both may be combined. Trim markers apply first and standalone removal then applies to what remains, so a standalone tag line with a leading trim marker removes the line break before it as well as its own. They work on every block tag and comment, are independent of the standalone option, and are never part of an expression.
- **Option.** `standaloneLines` (boolean) in render options; default `true` for `render` (and so for the API, CLI and the n8n node), default `false` for the legacy `resolveTemplate` string function so its existing tests keep their oracle. The n8n node gets a boolean option "Remove standalone tag lines" (default on).

## RAW and escaping

- `{{RAW}}...{{END_RAW}}` outputs its content literally (no tags, variables or comments are interpreted; CRLF becomes LF; spaces are kept). An unclosed RAW is a `syntax-error` located at the RAW tag. With standaloneLines off, a line break right after the RAW tag is part of the literal content.
- `\{{` outputs `{{` literally (the backslash is consumed); a backslash not followed by `{{` is ordinary text. `\\{{` is a literal backslash followed by an active tag (only a single backslash directly before `{{` escapes).

## SECTION

`{{SECTION "Title" level=2}}...{{END_SECTION}}`. Title is a quoted string or a variable path; `level` is 1 to 6 (default 2, clamped); `skip_empty` defaults to true, `skip_empty=false` keeps an empty section.

- Output is `<hashes> <title>`, a blank line, the body with leading and trailing blank lines trimmed, and one trailing line break. Consecutive sections are separated by exactly the blank lines the template holds between them (the SECTION tag lines vanish under the standalone rule), nothing is added. Body line breaks are normalized to LF.
- With skip_empty=false an empty section outputs only the heading line and its line break (a heading line such as `## Title` followed by one line break).
- When the rendered body is empty (only whitespace) and skip_empty is true, nothing is output (heading and spacing included) and `stats.sectionsOmitted` counts it.
- A section nests like any block (counts toward maxDepth); an empty or non-string title, a non-integer level or a non-boolean skip_empty is a `type-error` located at the SECTION tag; a stray END_SECTION or an unclosed SECTION is a `syntax-error`. analyze reports variables read in a title or body with usedIn `output`.

## Filters

- `heading_offset=N` (integer, may be negative): shifts every markdown ATX heading line (`#` to `######` followed by a space) by N levels, clamped to 1 to 6; headings inside fenced code blocks and non-heading `#` text are untouched. Missing or non-integer parameter is a `type-error`.
- `escape_md=inline` (default, the existing behavior; plain `escape_md` is inline) and `escape_md=block`: inline escaping plus line-start escaping so a value cannot fake structure (block mode adds nothing for characters inline mode already escapes; otherwise a backslash before a leading `#`, `>`, `-`, `+`, `*`, `|`, the `.` or `)` that follows a leading digit run (written `1\.`, since digits cannot be escaped), a line of three or more `-`, `=`, `` ` `` or `~` gets one backslash before its first character). Modes are case-sensitive; an empty or any other mode is a `type-error`.
- `fence` (optional `lang`): wraps the value in an auto-sized fence, same rules as FENCE below.

## FENCE

`{{FENCE lang="markdown"}}...{{END_FENCE}}` outputs a fenced code block whose fence is the shortest run of at least three backticks that is longer than any backtick run inside the body, followed by the optional language, a line break, the body (one leading and one trailing line break removed), a line break, the fence and a trailing line break. `lang` is a quoted string or variable path.

## Surfaces

`spec()` lists every new block and filter and the new option; the API and CLI accept `standaloneLines` (API: `options.standaloneLines`; CLI: `--no-standalone-lines`); the OpenAPI document and the README describe them.
