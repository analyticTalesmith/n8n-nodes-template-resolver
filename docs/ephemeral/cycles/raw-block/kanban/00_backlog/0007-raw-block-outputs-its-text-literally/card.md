# Raw block outputs its text literally

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

A template that contains double braces as literal text (a code sample, a JSON example, Jinja) throws a syntax error today, so it cannot be used in a prompt template. Add a `{{RAW}} ... {{END_RAW}}` block whose contents are output exactly as written. The owner's feature spec lists this as a Tier 1 gap.

## Must-haves

- `contract` `rb-01` The text between RAW and END_RAW renders exactly as written, including IF tags, variable tags, comment markers and lone braces.
- `contract` `rb-02` A RAW block inside IF and FOR bodies repeats per iteration and is skipped in an untaken branch, with surrounding tags and variables rendering as before.
- `contract` `rb-03` The raw text is not trimmed and CRLF in it becomes LF.
- `constraint` `rb-04` must: report an unclosed RAW block as a syntax error that names its line and column.
- `constraint` `rb-05` must: leave templates without RAW rendering exactly as before.
- `contract` `rb-06` The README documents RAW with one example whose output a person confirms.

## Must-nots

- Do not change the parser, the interpreter or any other tag's behavior.
- Do not add nesting, escapes or options to RAW.

## Context links

- none

## User documentation

Users see the new tag. The README gains a short RAW section with one example and its output.

## Interface contract

The template syntax gains `{{RAW}}` and `{{END_RAW}}`. The first `{{END_RAW}}` after a `{{RAW}}` closes the block; there is no nesting. The public resolveTemplate signature is unchanged.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| nodes/TemplateResolver/lexer.ts | edit | 30 | resolver-core |
| README.md | edit | 25 | resolver-core |
