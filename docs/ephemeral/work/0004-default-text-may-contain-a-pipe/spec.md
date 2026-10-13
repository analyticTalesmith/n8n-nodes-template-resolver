# Spec: default text may contain a pipe

## Goal

A pipe inside a quoted default text after ?? is part of the default, and filters after the default still apply.

## Scope

In: nodes/TemplateResolver/parser.ts parseVariableExpression. Out: lexer, interpreter, filters, extractAllVariables.

## Boundaries

- Always: split filters only on pipes outside single or double quotes.
- Ask first: any change to the AST node shape or to the public resolveTemplate signature.
- Never: edit tests.

## Contract and constraints

- contract: the expression is split into the core (path and default) and filters at pipes that are outside quotes.
- constraint: an expression without quotes, or with quotes that hold no pipe, parses exactly as before.

## Change manifest

Edit nodes/TemplateResolver/parser.ts only.

## Acceptance criteria

- dp-01 `${{x ?? "a|b"}}` with x missing renders `a|b`.
- dp-02 `${{x ?? "a|b" | head=2}}` with x missing renders `a|`.
- dp-03 `${{x ?? 'a|b'}}` renders `a|b`; `${{x ?? "d" | trim}}` and `${{text | trim | head=3}}` render as before.
- dp-04 existing tests keep passing.
