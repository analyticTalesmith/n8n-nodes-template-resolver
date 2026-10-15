# Report: test writer, FOR window card

Status: done with concerns

## Files
- tests/language/for-window.test.ts (1839 cases, table driven, ids fw-window fw-meta fw-else fw-args fw-table fw-limits fw-scope fw-no-copy fw-own)
- tests/golden/render-cases/lang-for-window/{template.md,data.json,options.json,expected.md}
- docs/ephemeral/work/<card>/red-evidence.md (written by red-evidence.mjs: 1635 failing tests, exit 0)
No stubs: the tests import only existing modules.

## Red state
1635 fail, 204 pass today. Every failure is an assertion (a check message), none a thrown error or missing import. The passing rows are legacy guards (missing @total outside a loop, own-key reads, ELSE misuse messages, lenient ignore of an unsupported window, maxIterations without a window, nested names).

## Criteria
- fw-window (unit via render/resolveTemplate, 4 entries each): about 400 rows, valid windows, 15 bad values x limit/offset x items/no items, literals, missing/null/undefined, outer-scope reads. Fails: window ignored or accepted, no type-error.
- fw-meta: 14 rows x 4 plus golden row. Fails: @total unsupported with a window, golden case needs the new syntax.
- fw-else: 31 rows x 4, 8 syntax rows x 6 modes, plus analyze/validate. Fails: ELSE in FOR is "Unexpected token".
- fw-args: 25 bad tags x 5 placements x 6 modes, plus good rows. Fails: trailing words accepted today, missing item name located at tag end instead of the tag.
- fw-table: 14 output rows, 7 error rows, limits row. Fails: window, ELSE and @total absent in TABLE FOR.
- fw-limits: 19 limit rows x 4, 10 stats rows, skipped-item and astral rows. Fails: offset and limit not honoured, ELSE body missing.
- fw-scope: 18 rows x 4. Fails: windowed variants and ELSE variants; name-scope guards pass today.
- fw-no-copy: 9 rows + ternary + error row. Fails: getAllVariables copies the map (iterator count above 0).
- fw-own: 5 segments x 5 shapes plus own-key rows. Fails: inherited constructor, __proto__, toString, valueOf read as values.

## Concerns
1. The ternary form has no template syntax today (lexer comment only), so the ternary no-copy row builds the AST by hand and calls Interpreter. A ForNode with new optional fields stays valid for it.
2. Today a scalar number as a FOR iterable renders as one item (no type-error); only null and objects are strict type-errors, so the spec's "non-iterable" rows use null and a plain object.
3. The brief's "ELSE after ELSEIF keeps Unexpected token" is read as ELSEIF directly inside a FOR, ELSEIF after a FOR's ELSE, ELSE outside IF and FOR, and ELSE inside a nested block; an ELSE after an ELSEIF in an IF is valid today and untouched.
4. fw-scope "frames carry a parent link" is not observable without importing core/src/scope.ts, which the brief forbids: no test.
5. Mutation proof against a real implementation is not possible before code exists; expected values were checked by hand and by probing present behaviour of the legacy parts.
6. card.json traces for each criterion should name tests/language/for-window.test.ts#<id> (fw-compat none); the card manifest needs no stub entry. I did not edit card.json.
7. Adding the golden case makes tests/promptaware/golden-render.test.ts and the golden render case run red until the card is implemented; this is expected.
