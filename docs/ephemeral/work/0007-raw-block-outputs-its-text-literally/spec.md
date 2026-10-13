# Spec: raw block

## Goal

`{{RAW}}text{{END_RAW}}` renders `text` unchanged, whatever it contains.

## Scope

In: the lexer's tag scan, one README section. Out: parser, interpreter, filters, expressions, the n8n node file.

## Boundaries

- Always: emit the raw content as one ordinary Text token so the parser and interpreter need no change.
- Ask first: any change to the Token or AST types.
- Never: edit tests; add nesting or escapes.

## Options considered

1. Lexer-level scan (chosen): when a tag's keyword is RAW, read characters up to the next END_RAW tag and emit one Text token. No change to the AST.
2. A parser block node with its own interpreter visit: more code and a new AST type for no gain, since the content is only text.

## Contract and constraints

- contract: after the lexer reads a tag whose trimmed content is exactly `RAW`, it consumes everything up to the next `{{END_RAW}}` (the closing tag may have inner spaces, as other tags do) and emits one Text token with that content, CRLF normalized to LF. Empty content emits no token.
- contract: an END_RAW with no open RAW keeps the existing unknown-tag error.
- constraint: if no END_RAW follows, throw the lexer's SyntaxError at the RAW tag's line and column with the message `Unclosed {{RAW}} block` and the hint `Add {{END_RAW}}`.
- constraint: nothing else in the lexer changes for templates without RAW.

## Change manifest

Edit nodes/TemplateResolver/lexer.ts and README.md. Add docs/living/product/raw-block.md (state planned, user_facing true, describes the built syntax; the delta applies it to built when the cycle merges).

## Acceptance criteria

- rb-01 `{{RAW}}{{IF x}} ${{name}} {{# c #}} { }{{END_RAW}}` renders `{{IF x}} ${{name}} {{# c #}} { }`.
- rb-02 a RAW block in a FOR body appears once per iteration; in an untaken IF branch it does not appear.
- rb-03 leading and trailing spaces and newlines inside RAW stay; CRLF becomes LF.
- rb-04 `a{{RAW}}b` throws a SyntaxError whose message names line 1 and column 2.
- rb-05 existing tests pass.
- rb-06 README section present with one example (manual).
