---
summary: Red evidence for 261015-language3911-a3-add-the-text-filters: 287 failing tests across 3 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/language/filters-text.test.ts","--json"]
exit_status: 1
tests_sha256: 7f75e0660a4d
---

# Red evidence for 261015-language3911-a3-add-the-text-filters

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| ft-text: the registry holds the eight text filters after the six ft-text: the registry names are the six existing filters then the eight new ones in order | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: the registry holds the eight text filters after the six ft-text: TEXT_FILTERS holds the eight names in order | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: the registry holds the eight text filters after the six ft-text: declared parameter names are none, none, none, find and with, value, none, value, value | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: the registry holds the eight text filters after the six ft-text: spec lists the eight with a non-empty params text and description | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), missing variable | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), number 3.14159 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), number 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), number 1000000 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), boolean true | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), boolean false | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), array printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), object printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), multi-line | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), CRLF | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: upper ft-text: upper (upper), unicode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), missing variable | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), number 3.14159 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), number 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), number 1000000 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), boolean true | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), array printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), object printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), multi-line | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), CRLF | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: lower ft-text: lower (lower), unicode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), rest of each word lower-cased | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), all caps | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), already titled | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), missing variable | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), number 3.14159 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), number 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), number 1000000 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), boolean true | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), boolean false | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), array printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), whitespace kept as is | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), line break separates words | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), CRLF separates words | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), apostrophe is not a word break | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), hyphen is not a word break | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: title ft-text: title (title), unicode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), every occurrence | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), adjacent occurrences | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), no occurrence | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), missing variable | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), matching is case sensitive | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), boolean false coerced to text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), array printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), object printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), CRLF kept | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), multi-line | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="b"), unicode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="1",with="7"), number 3.14159 coerced to text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="1",with="7"), number 1000000 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="é",with="e"), unicode find | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="r",with="R"), boolean true coerced to text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="aa",with="b"), non-overlapping, four a | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="aa",with="b"), non-overlapping, three a | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a"), with omitted deletes | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a"), with omitted on empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with=""), with empty deletes | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find=".",with="!"), find is literal text, dots only | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find=".",with="!"), a dot does not match any character | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="(x)",with="y"), find with pattern characters is literal | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="a",with="$&$&"), with is literal, no special replacement patterns | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace (replace:find="*",with="-"), find with a star is literal | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: replace ft-text: replace chained after upper replaces in the upper-cased text | ft-text | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-text: indent ft-text: indent (indent), default is two spaces on every line | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), single line | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), empty lines are left empty | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), final line break does not gain spaces | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), only a line break | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), missing variable | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), number 42 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), number 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), boolean true | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), array printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), object printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), CRLF lines kept and empty line left empty | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), final CRLF does not gain spaces | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), a line of only a space is not empty | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent), unicode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent=4), four spaces | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent=4), empty lines still empty | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent=0), zero spaces leaves text unchanged | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent="3"), a quoted count behaves like an unquoted one | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent=100), the upper bound is allowed | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: indent ft-text: indent (indent=1), number input coerced to text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), missing variable | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), number 3.14159 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), number 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), number 1000000 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), boolean true | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), boolean false | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), array printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), object printed form | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), double quotes escaped | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), backslash escaped | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), line break escaped | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), CRLF escaped | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), tab escaped | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), control character escaped | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote (quote), unicode kept | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: quote ft-text: quote output parses back to the coerced text | ft-text | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-text: round ft-text: round (round), default zero places | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), half rounds up | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), negative half rounds away from zero | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), number 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), number 1000000 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), string number | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), text half | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), negative text half | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), 1.5 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), -1.5 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), negative zero prints 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), negative zero text prints 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), not a number passes through | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), empty text passes through | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), missing variable gives empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), null gives empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), boolean true is not a number | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), boolean false is not a number | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), array is not a number | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), object is not a number | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), Infinity is not finite | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round), NaN is not finite | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), number 3.14159 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), 1.005 rounds in decimal arithmetic | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), 1.005 as text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), 2.675 rounds in decimal arithmetic | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), -1.005 rounds away from zero | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), pads to exactly two decimals | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), integer padded | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), zero padded | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), empty text passes through | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=2), not a number passes through | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=1), 0.05 rounds up | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=1), large value | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=1), 1000000 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=0), explicit zero | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round="2"), quoted places | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round (round=20), twenty places is allowed | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-text: round ft-text: round then quote chains | ft-text | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-text: round ft-text: round passes text through to quote unchanged | ft-text | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-text: existing filters keep their output ft-text: trim then upper | ft-text | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-text: existing filters keep their output ft-text: upper then head | ft-text | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, replace without find | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, replace with only with | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, replace with an empty find | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, replace with an undeclared name | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, replace with find, with and an undeclared name | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, replace with the shorthand value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, indent=x | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, indent=1.5 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, indent=-1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, indent=101 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, indent with an empty value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, indent:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, round=x | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, round=1.5 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, round=-1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, round=21 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, round with an empty value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, round:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, default without a value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, default:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, upper=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, upper:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, lower=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, lower:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, title=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, title:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, quote=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: a bad or missing parameter is a type-error at the variable, quote:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, replace with an undeclared name | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, replace with find, with and an undeclared name | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, replace with the shorthand value | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, indent:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, round:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, default:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, upper=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, upper:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, lower=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, lower:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, title=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, title:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, quote=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: lenient mode ft-params: validate and analyze agree with render on an undeclared parameter, quote:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, replace without find | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, replace with only with | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, replace with an empty find | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, replace with an undeclared name | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, replace with find, with and an undeclared name | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, replace with the shorthand value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, indent=x | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, indent=1.5 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, indent=-1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, indent=101 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, indent with an empty value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, indent:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, round=x | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, round=1.5 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, round=-1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, round=21 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, round with an empty value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, round:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, default without a value | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, default:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, upper=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, upper:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, lower=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, lower:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, title=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, title:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, quote=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: a bad or missing parameter is a type-error at the variable, quote:x=1 | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, replace with an undeclared name | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, replace with find, with and an undeclared name | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, replace with the shorthand value | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, indent:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, round:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, default:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, upper=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, upper:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, lower=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, lower:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, title=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, title:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, quote=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: strict mode ft-params: validate and analyze agree with render on an undeclared parameter, quote:x=1 | ft-params | assertion failed: Error: expect(received).toMatchObject(expected) |
| ft-params: valid calls give no diagnostic ft-params: upper is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: lower is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: title is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: quote is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: replace:find="a" is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: replace:find="a",with="b" is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: replace:find="a",with="" is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: indent is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: indent=0 is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: indent=100 is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: round is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: round=0 is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: round=20 is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: default="x" is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-params: valid calls give no diagnostic ft-params: default=x is accepted by validate and analyze | ft-params | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), missing variable in lenient mode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), number 0 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), boolean false | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), empty list | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), empty object | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), the text 0 (as ?? treats it today) | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), the text false (as ?? treats it today) | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), non-empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), number 1 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), number 3.14159 | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), boolean true | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), non-empty list | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="X"), non-empty object | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default=X), missing variable in lenient mode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default=X), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default=X), non-empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default:value="X"), missing variable in lenient mode | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default:value="X"), null | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default:value="X"), non-empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="n/a" \| upper), default then upper, falsy | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (default="n/a" \| upper), default then upper, truthy | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (upper \| default="x"), falsy after upper | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-text: default (trim \| default="x"), a blank value trimmed to empty text | ft-text | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| ft-default: default replaces a value that is not truthy ft-default: the replacement is printed as given, not as the input | ft-default | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| ft-default: ?? keeps its current behaviour ft-default: the default filter and ?? agree on every shared lenient row | ft-default | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
