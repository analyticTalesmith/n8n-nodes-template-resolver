# Spec

## Acceptance criteria

- ft-text: each of upper, lower, title, replace (replace:find="a",with="b", every occurrence), indent (indent=N spaces on every non-empty line, default 2), quote (a JSON-style double-quoted string) and round (round=N decimal places, default 0) gives the expected output for a table of inputs, including empty, number, boolean and non-string input coerced to text first; no existing filter output changes
- ft-params: a missing required parameter (replace without find, round or indent with a non-integer) or a parameter the filter does not declare is a type-error located at the variable, in every mode
- ft-default: default="x" replaces a value that is not truthy (missing, null, empty text, 0, false, empty list, empty object); the existing ?? keeps its current behaviour in this card

## Interface (names the tests may import)

- `core/src/filters-text.ts` exports `TEXT_FILTERS: FilterDefinition[]` (type in `core/src/types.ts`) with the rows `upper`, `lower`, `title`, `replace` (paramNames `["find","with"]`), `indent` (paramNames `["value"]`), `quote`, `round` (paramNames `["value"]`) and `default` (paramNames `["value"]`), in this order. The registry in `core/src/filters.ts` already includes the group; no dispatch or parser change.

## Behavior settled for this card

- Every filter except `default` coerces its input to text exactly as the output step prints it (`valueToText`); `default` reads the raw value and uses the interpreter's truthiness (`isTruthy`).
- `upper`, `lower`, `quote` take no parameter. `title` upper-cases the first letter of each whitespace-separated word and lower-cases the rest.
- `replace` replaces every non-overlapping occurrence of the literal `find` (required, non-empty) by `with` (optional, default empty text); no pattern is ever compiled.
- `indent=N` (default 2, integer 0 to 100) adds N spaces to every line of positive length; line breaks are kept. `round=N` (default 0, integer 0 to 20) rounds half away from zero in decimal arithmetic and prints exactly N decimals; input that is not a finite number passes through unchanged.
- `quote` prints the JSON double-quoted form of the text. `default=X` (required) returns X when the raw input is not truthy.
- A missing or non-integer or out-of-range parameter throws an error that the interpreter reports as a type-error at the variable; an undeclared parameter is already a type-error by the registry. `validate` and `analyze` run without data, so they check names and undeclared parameters only; a bad parameter value surfaces at render.

## Examples

- `${{ s | replace:find="a",with="b" }}` over `banana` is `bbnbnb`.
- `${{ n | round=2 }}` over `1.005` is `1.01`; over `3.1` is `3.10`.
- `${{ t | indent=4 }}` over `a\n\nb` is `    a\n\n    b`.
- `${{ x | default="n/a" }}` with `x` of `0` is `n/a`; `${{ x | indent=two }}` fails with a type-error located at the variable.
