---
summary: The RAW block syntax for outputting template text literally.
state: planned
user_facing: true
---

# RAW block

## Purpose

For people writing templates: put text that contains double braces or tag-like text into a template without it being read as template syntax. Everything between `{{RAW}}` and `{{END_RAW}}` is output exactly as written.

## Syntax

```
{{RAW}}text{{END_RAW}}
```

The closing tag may have spaces inside the braces, like other tags (`{{ END_RAW }}`).

## Rules

- The first `{{END_RAW}}` closes the block; raw blocks do not nest.
- The text is not trimmed: leading and trailing spaces and newlines are kept. CRLF line endings become LF.
- An empty block outputs nothing.
- A `{{RAW}}` with no `{{END_RAW}}` after it is a syntax error ("Unclosed {{RAW}} block", hint "Add {{END_RAW}}") reported at the position of the `{{RAW}}` tag.
- A `{{END_RAW}}` with no `{{RAW}}` before it is an unknown tag error, as before.
- Inside a loop the block's text appears once per iteration; inside an untaken branch it does not appear.

## Example

Template, with `name = "Ada"`:

```
Write ${{name}} like this: {{RAW}}${{name}} and {{IF x}}{{END_RAW}}
```

Output:

```
Write Ada like this: ${{name}} and {{IF x}}
```
