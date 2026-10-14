---
summary: Red evidence for 0041-add-section-that-drops-its-heading-when: 94 failing tests across 6 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/promptaware/section.test.ts","--json"]
exit_status: 1
tests_sha256: 96dda8abf75a
---

# Red evidence for 0041-add-section-that-drops-its-heading-when

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| sc-heading: heading, body trimming and spacing between sections sc-heading: quoted title, default level 2 | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: title with punctuation and hash is kept verbatim | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: variable title | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: dotted variable path title | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: variables in the body | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: leading and trailing blank lines of the body are trimmed | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: blank lines inside the body are kept | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: a multi-line body ends with exactly one line break | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: text before and after an inline section | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: tag lines on their own lines, standaloneLines true: tag lines vanish | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: tag lines on their own lines, standaloneLines false: tag line breaks stay in the body and after | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: text before and after own-line tags, standaloneLines true | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: text before and after own-line tags, standaloneLines false | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: two sections with one blank line between them in the template, standaloneLines true | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: two sections with one blank line between them in the template, standaloneLines false | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: FOR producing one section per item, titles from the loop variable | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: FOR producing sections on own lines, standaloneLines true | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: FOR producing sections on own lines, standaloneLines false | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: FOR inside a section | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: nested sections | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: adjacent sections get no blank line added | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: adjacent sections on own lines, standaloneLines true: still no blank line | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: CRLF line breaks in the body become LF | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: CRLF template with own-line tags, standaloneLines true | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-heading: heading, body trimming and spacing between sections sc-heading: IF inside a section | sc-heading | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level omitted is 2 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=1 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=2 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=3 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=4 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=5 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=6 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=7 clamps to 6 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=99 clamps to 6 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=0 clamps to 1 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level=-3 clamps to 1 | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: level can be given before skip_empty | sc-level | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-level: level default, clamping and non-integer sc-level: non-integer level (decimal 2.5) is a type-error located at the SECTION tag | sc-level | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-level: level default, clamping and non-integer sc-level: non-integer level (string) is a type-error located at the SECTION tag | sc-level | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-empty: an empty section disappears and is counted sc-empty: no body at all | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: body of only spaces, tabs and line breaks | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: body whose variable renders an empty string | sc-empty | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-empty: an empty section disappears and is counted sc-empty: body that is only an IF that renders nothing | sc-empty | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-empty: an empty section disappears and is counted sc-empty: the same section with the IF true is kept | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: body that is a FOR over an empty array | sc-empty | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-empty: an empty section disappears and is counted sc-empty: explicit skip_empty=true behaves like the default | sc-empty | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-empty: an empty section disappears and is counted sc-empty: own-line tags around an empty body, standaloneLines true | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: own-line tags around an empty body, standaloneLines false | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: an empty section before a kept one leaves no heading or spacing of its own | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: FOR where one iteration yields an empty section | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: FOR where every iteration yields an empty section counts each | sc-empty | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-empty: an empty section disappears and is counted sc-empty: FOR inside a section with every item empty omits the section | sc-empty | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-empty: an empty section disappears and is counted sc-empty: an empty inner section is omitted and the outer section keeps its text | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: an outer section whose only content is an empty inner section is omitted too | sc-empty | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-empty: an empty section disappears and is counted sc-empty: a non-empty inner section keeps the outer section | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-empty: an empty section disappears and is counted sc-empty: two omitted sections in a row are counted separately | sc-empty | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-keep: skip_empty=false keeps the heading sc-keep: an empty section keeps its heading and is not counted | sc-keep | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-keep: skip_empty=false keeps the heading sc-keep: a whitespace-only body keeps the heading, the whitespace is dropped | sc-keep | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-keep: skip_empty=false keeps the heading sc-keep: level and skip_empty combine in either order | sc-keep | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-keep: skip_empty=false keeps the heading sc-keep: text around a kept empty section stays where it was | sc-keep | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-keep: skip_empty=false keeps the heading sc-keep: an inner empty section kept by skip_empty=false keeps the outer one non-empty | sc-keep | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-keep: skip_empty=false keeps the heading sc-keep: skip_empty=false on a non-empty section changes nothing | sc-keep | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-keep: skip_empty=false keeps the heading sc-keep: inside FOR, kept empty sections are not counted and omitted ones still are | sc-keep | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-errors: invalid sections and depth sc-errors: empty quoted title | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: missing title | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: missing title with only a level | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: variable title that is an empty string | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: variable title that is a number | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: variable title that is an array | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: stray END_SECTION | sc-errors | assertion failed: Error: expect(received).not.toMatch(expected) |
| sc-errors: invalid sections and depth sc-errors: non-boolean skip_empty (string) | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: non-boolean skip_empty (number) | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: unclosed SECTION is located at its tag | sc-errors | assertion failed: Error: expect(received).not.toMatch(expected) |
| sc-errors: invalid sections and depth sc-errors: unclosed inner SECTION is located at the inner tag | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: unclosed SECTION inside an IF | sc-errors | assertion failed: Error: expect(received).not.toMatch(expected) |
| sc-errors: invalid sections and depth sc-errors: error locations are source locations (standaloneLines true) | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: error locations are source locations (standaloneLines false) | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: an error is raised even when the section would be empty | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: two nested sections counts toward maxDepth | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: a section inside an IF counts toward maxDepth | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: an IF inside a section counts toward maxDepth | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: a section inside a FOR counts toward maxDepth | sc-errors | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-errors: invalid sections and depth sc-errors: a single top-level section is within maxDepth 1 | sc-errors | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: blocks.SECTION counts every section, nested ones included | sc-analyze | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: sections are counted next to other blocks | sc-analyze | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-analyze: analyze and spec know SECTION sc-analyze: a variable title is read as a required variable | sc-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: a dotted title path is recorded under its root name | sc-analyze | assertion failed: Error: expect(received).toMatchObject(expected) |
| sc-analyze: analyze and spec know SECTION sc-analyze: variables in a title or body have usedIn output | sc-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: variables in the body are read | sc-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: title and body variables are both read | sc-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: a loop variable used as title is not an input | sc-analyze | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: a quoted title reads no variable | sc-analyze | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sc-analyze: analyze and spec know SECTION sc-analyze: spec lists SECTION closed by END_SECTION | sc-analyze | assertion failed: Error: expect(received).toBeDefined() |
| sc-analyze: analyze and spec know SECTION sc-analyze: spec text mentions SECTION and END_SECTION | sc-analyze | assertion failed: Error: expect(received).toContain(expected) // indexOf |
