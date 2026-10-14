---
type: review-packet
card: 0041-add-section-that-drops-its-heading-when
tier: product
built_at: 2026-10-14T02:38:53.541Z
base: f3d44d299f9503ff27604e42e9a6a2b56c2888da
head: 7dd25d1b1bdb73d3f89ffb421df51296e2fa40f4
frozen: true
brief_sha256: 73641d0bbcb2947f00ff9a0b4c4a036b77a10a0076d790a65fdb0fc13ad15367
manifest_sha256: d3ae1ef75c821d3ee1e116308265fe2600170914078364b53c4b5928a2414376
criteria_sha256: 7e9aebf019a9ee641fc33bdbbe37b0da2478402b71a9ad1b27638c0f644b0543
scope_sha256: 66f328103c947e8273beb4ae03b199776e4f4775534c0c1d9a969b53be05eee9
diff_sha256: 3bebd7356cb53d1e86879265bea66f5bac90a082dfdd9516c8dd19ba3c4fb77d
omitted_paths: 5
criteria_count: 6
must_not_count: 3
---

# Review packet: 0041-add-section-that-drops-its-heading-when

Manifest amended after the freeze at 2026-10-14T02:38:48.443Z by lead: SECTION tags join the standalone rule in the whitespace module (edit +core/src/whitespace.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the SECTION block with title, level and skip_empty, in the lexer, parser, interpreter, analyze, render stats and spec.

### Criteria

- c1 (verify: test): sc-heading: a SECTION with a quoted or variable title writes hashes, a space and the title, a blank line, the body with leading and trailing blank lines trimmed and one trailing line break, and consecutive sections are separated by one blank line
- c2 (verify: test): sc-level: level defaults to 2, is clamped to 1 through 6, and a non-integer level is a type-error located at the SECTION tag
- c3 (verify: test): sc-empty: a SECTION whose rendered body is only whitespace produces no output at all, heading and spacing included, and render stats count it in sectionsOmitted, also inside FOR loops and nested sections
- c4 (verify: test): sc-keep: skip_empty=false keeps the heading of an empty section and does not count an omission
- c5 (verify: test): sc-errors: an empty or missing title is a type-error, an unclosed SECTION is a syntax-error at its tag, and SECTION counts toward maxDepth
- c6 (verify: test): sc-analyze: analyze counts SECTION in blocks, reads variables in the title and the body, and spec lists SECTION and END_SECTION

### Must not

- m1: change any existing test expectation
- m2: change output for templates without SECTION
- m3: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the SECTION block with title, level and skip_empty, in the lexer, parser, interpreter, analyze, render stats and spec.
Must not:
- change any existing test expectation
- change output for templates without SECTION
- add a runtime dependency

## Questions

goal-critical: does an empty section leave no stray blank lines, with standaloneLines on and off?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
```

### spec.md as of base f3d44d2

```
# Spec

## Acceptance criteria

- sc-heading: a SECTION with a quoted or variable title writes hashes, a space and the title, a blank line, the body with leading and trailing blank lines trimmed and one trailing line break, and consecutive sections are separated by one blank line
- sc-level: level defaults to 2, is clamped to 1 through 6, and a non-integer level is a type-error located at the SECTION tag
- sc-empty: a SECTION whose rendered body is only whitespace produces no output at all, heading and spacing included, and render stats count it in sectionsOmitted, also inside FOR loops and nested sections
- sc-keep: skip_empty=false keeps the heading of an empty section and does not count an omission
- sc-errors: an empty or missing title is a type-error, an unclosed SECTION is a syntax-error at its tag, and SECTION counts toward maxDepth
- sc-analyze: analyze counts SECTION in blocks, reads variables in the title and the body, and spec lists SECTION and END_SECTION
```

### card.md as of base f3d44d2

```
# Add SECTION that drops its heading when empty

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

SECTION writes a heading and its body and drops itself, heading and spacing included, when its body renders empty; omissions are counted in stats.sectionsOmitted.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `sc-heading` a SECTION with a quoted or variable title writes hashes, a space and the title, a blank line, the body with leading and trailing blank lines trimmed and one trailing line break, and consecutive sections are separated by one blank line
- `contract` `sc-level` level defaults to 2, is clamped to 1 through 6, and a non-integer level is a type-error located at the SECTION tag
- `contract` `sc-empty` a SECTION whose rendered body is only whitespace produces no output at all, heading and spacing included, and render stats count it in sectionsOmitted, also inside FOR loops and nested sections
- `contract` `sc-keep` skip_empty=false keeps the heading of an empty section and does not count an omission
- `contract` `sc-errors` an empty or missing title is a type-error, an unclosed SECTION is a syntax-error at its tag, and SECTION counts toward maxDepth
- `contract` `sc-analyze` analyze counts SECTION in blocks, reads variables in the title and the body, and spec lists SECTION and END_SECTION


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- change output for templates without SECTION
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the surfaces card documents it.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

the SECTION block; RenderResult.stats.sectionsOmitted (see the prompt-aware contract).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | edit | none |
| `core/src/interpreter.ts` | edit | none |
| `core/src/lexer.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
| `core/src/render.ts` | edit | none |
| `core/src/spec.ts` | edit | none |
| `core/src/types.ts` | edit | none |

Files scope: `core/src/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`
- files_scope: `core/src/`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/prompt-aware-contract.md

```
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
```

## Frozen tests (read-only)

These test files were committed before the work began, at base f3d44d2. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/promptaware/section.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, analyze as coreAnalyze, spec } from "../../core/src";

// analyze throws on a tag it does not know; turn that into an empty analysis so a missing feature fails by assertion.
function analyze(template: string): ReturnType<typeof coreAnalyze> {
  try {
    return coreAnalyze(template);
  } catch (e) {
    return { variables: [], filters: [], blocks: {}, diagnostics: [{ code: "threw", message: String(e), line: 1, column: 1 }] };
  }
}

// `standaloneLines` belongs to a sibling card, so the option goes through `any`.
function run(template: string, data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return render(template, data, extra as any);
}
const ON = { standaloneLines: true };
const OFF = { standaloneLines: false };

type OutCase = {
  name: string;
  template: string;
  data?: Record<string, unknown>;
  options?: Record<string, unknown>;
  output: string;
  omitted?: number;
};

function runOutCases(id: string, cases: OutCase[]) {
  it.each(cases)(`${id}: $name`, ({ template, data, options, output, omitted }) => {
    const r = run(template, data ?? {}, options ?? {});
    expect(r.output).toBe(output);
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.stats.sectionsOmitted).toBe(omitted ?? 0);
  });
}

describe("sc-heading: heading, body trimming and spacing between sections", () => {
  runOutCases("sc-heading", [
    {
      name: "quoted title, default level 2",
      template: '{{SECTION "Intro"}}hello{{END_SECTION}}',
      output: "## Intro\n\nhello\n",
    },
    {
      name: "title with punctuation and hash is kept verbatim",
      template: '{{SECTION "My: Title #1"}}b{{END_SECTION}}',
      output: "## My: Title #1\n\nb\n",
    },
    {
      name: "variable title",
      template: "{{SECTION t}}body{{END_SECTION}}",
      data: { t: "From Data" },
      output: "## From Data\n\nbody\n",
    },
    {
      name: "dotted variable path title",
      template: "{{SECTION doc.title}}body{{END_SECTION}}",
      data: { doc: { title: "Nested" } },
      output: "## Nested\n\nbody\n",
    },
    {
      name: "variables in the body",
      template: '{{SECTION "A"}}${{x}} and ${{y}}{{END_SECTION}}',
      data: { x: "one", y: "two" },
      output: "## A\n\none and two\n",
    },
    {
      name: "leading and trailing blank lines of the body are trimmed",
      template: '{{SECTION "A"}}\n\n\nx\n\n\n{{END_SECTION}}',
      output: "## A\n\nx\n",
      options: OFF,
    },
    {
      name: "blank lines inside the body are kept",
      template: '{{SECTION "A"}}\na\n\nb\n{{END_SECTION}}',
      output: "## A\n\na\n\nb\n",
      options: OFF,
    },
    {
      name: "a multi-line body ends with exactly one line break",
      template: '{{SECTION "A"}}a\nb\nc\n\n{{END_SECTION}}',
      output: "## A\n\na\nb\nc\n",
    },
    {
      name: "text before and after an inline section",
      template: 'before\n{{SECTION "A"}}x{{END_SECTION}}after',
      output: "before\n## A\n\nx\nafter",
    },
    {
      name: "tag lines on their own lines, standaloneLines true: tag lines vanish",
      template: '{{SECTION "A"}}\nx\n{{END_SECTION}}\n',
      options: ON,
      output: "## A\n\nx\n",
    },
    {
      name: "tag lines on their own lines, standaloneLines false: tag line breaks stay in the body and after",
      template: '{{SECTION "A"}}\nx\n{{END_SECTION}}\n',
      options: OFF,
      output: "## A\n\nx\n\n",
    },
    {
      name: "text before and after own-line tags, standaloneLines true",
      template: 'before\n{{SECTION "A"}}\nx\n{{END_SECTION}}\nafter\n',
      options: ON,
      output: "before\n## A\n\nx\nafter\n",
    },
    {
      name: "text before and after own-line tags, standaloneLines false",
      template: 'before\n{{SECTION "A"}}\nx\n{{END_SECTION}}\nafter\n',
      options: OFF,
      output: "before\n## A\n\nx\n\nafter\n",
    },
    {
      name: "two sections with one blank line between them in the template, standaloneLines true",
      template: '{{SECTION "A"}}\na\n{{END_SECTION}}\n\n{{SECTION "B"}}\nb\n{{END_SECTION}}\n',
      options: ON,
      output: "## A\n\na\n\n## B\n\nb\n",
    },
    {
      name: "two sections with one blank line between them in the template, standaloneLines false",
      template: '{{SECTION "A"}}\na\n{{END_SECTION}}\n\n{{SECTION "B"}}\nb\n{{END_SECTION}}\n',
      options: OFF,
      output: "## A\n\na\n\n\n## B\n\nb\n\n",
    },
    {
      name: "FOR producing one section per item, titles from the loop variable",
      template: "{{FOR items AS it}}{{SECTION it.name}}${{it.body}}{{END_SECTION}}{{END_FOR}}",
      data: { items: [{ name: "A", body: "a" }, { name: "B", body: "b" }] },
      output: "## A\n\na\n## B\n\nb\n",
    },
    {
      name: "FOR producing sections on own lines, standaloneLines true",
      template: "{{FOR xs AS x}}\n{{SECTION x}}\n${{x}}\n{{END_SECTION}}\n{{END_FOR}}\n",
      data: { xs: ["a", "b"] },
      options: ON,
      output: "## a\n\na\n## b\n\nb\n",
    },
    {
      name: "FOR producing sections on own lines, standaloneLines false",
      template: "{{FOR xs AS x}}\n{{SECTION x}}\n${{x}}\n{{END_SECTION}}\n{{END_FOR}}\n",
      data: { xs: ["a", "b"] },
      options: OFF,
      output: "\n## a\n\na\n\n\n## b\n\nb\n\n\n",
    },
    {
      name: "FOR inside a section",
      template: '{{SECTION "List"}}{{FOR xs AS x}}- ${{x}}\n{{END_FOR}}{{END_SECTION}}',
      data: { xs: ["a", "b"] },
      output: "## List\n\n- a\n- b\n",
    },
    {
      name: "nested sections",
      template: '{{SECTION "O" level=1}}intro\n{{SECTION "I" level=2}}in{{END_SECTION}}{{END_SECTION}}',
      output: "# O\n\nintro\n## I\n\nin\n",
    },
    {
      name: "adjacent sections get no blank line added",
      template: '{{SECTION "A"}}a{{END_SECTION}}{{SECTION "B"}}b{{END_SECTION}}',
      output: "## A\n\na\n## B\n\nb\n",
    },
    {
      name: "adjacent sections on own lines, standaloneLines true: still no blank line",
      template: '{{SECTION "A"}}\na\n{{END_SECTION}}\n{{SECTION "B"}}\nb\n{{END_SECTION}}\n',
      options: ON,
      output: "## A\n\na\n## B\n\nb\n",
    },
    {
      name: "CRLF line breaks in the body become LF",
      template: '{{SECTION "A"}}a\r\nb\r\n{{END_SECTION}}',
      output: "## A\n\na\nb\n",
    },
    {
      name: "CRLF template with own-line tags, standaloneLines true",
      template: '{{SECTION "A"}}\r\nx\r\n{{END_SECTION}}\r\n',
      options: ON,
      output: "## A\n\nx\n",
    },
    {
      name: "IF inside a section",
      template: '{{SECTION "A"}}{{IF f}}yes{{ELSE}}no{{END_IF}}{{END_SECTION}}',
      data: { f: true },
      output: "## A\n\nyes\n",
    },
  ]);
});

describe("sc-level: level default, clamping and non-integer", () => {
  runOutCases(
    "sc-level",
    [
      ["level omitted is 2", "", "##"],
      ["level=1", " level=1", "#"],
      ["level=2", " level=2", "##"],
      ["level=3", " level=3", "###"],
      ["level=4", " level=4", "####"],
      ["level=5", " level=5", "#####"],
      ["level=6", " level=6", "######"],
      ["level=7 clamps to 6", " level=7", "######"],
      ["level=99 clamps to 6", " level=99", "######"],
      ["level=0 clamps to 1", " level=0", "#"],
      ["level=-3 clamps to 1", " level=-3", "#"],
    ].map(([name, param, hashes]) => ({
      name,
      template: `{{SECTION "T"${param}}}b{{END_SECTION}}`,
      output: `${hashes} T\n\nb\n`,
    }))
  );

  it("sc-level: level can be given before skip_empty", () => {
    const r = run('{{SECTION "T" level=3 skip_empty=true}}b{{END_SECTION}}');
    expect(r.output).toBe("### T\n\nb\n");
    expect(r.ok).toBe(true);
  });

  it.each([
    ["decimal 2.5", '{{SECTION "T" level=2.5}}x{{END_SECTION}}'],
    ["string", '{{SECTION "T" level="high"}}x{{END_SECTION}}'],
  ])("sc-level: non-integer level (%s) is a type-error located at the SECTION tag", (_n, tag) => {
    const r = run(`ab\n  ${tag}`, {});
    expect(r.diagnostics[0]).toMatchObject({ code: "type-error", line: 2, column: 3 });
    expect(r.ok).toBe(false);
    expect(r.output).toBe("");
  });
});

describe("sc-empty: an empty section disappears and is counted", () => {
  runOutCases("sc-empty", [
    {
      name: "no body at all",
      template: 'a\n{{SECTION "A"}}{{END_SECTION}}b',
      output: "a\nb",
      omitted: 1,
    },
    {
      name: "body of only spaces, tabs and line breaks",
      template: 'a{{SECTION "A"}}  \n\t\n {{END_SECTION}}b',
      output: "ab",
      omitted: 1,
    },
    {
      name: "body whose variable renders an empty string",
      template: '{{SECTION "A"}}${{e}}{{END_SECTION}}',
      data: { e: "" },
      output: "",
      omitted: 1,
    },
    {
      name: "body that is only an IF that renders nothing",
      template: '{{SECTION "A"}}{{IF f}}x{{END_IF}}{{END_SECTION}}',
      data: { f: false },
      output: "",
      omitted: 1,
    },
    {
      name: "the same section with the IF true is kept",
      template: '{{SECTION "A"}}{{IF f}}x{{END_IF}}{{END_SECTION}}',
      data: { f: true },
      output: "## A\n\nx\n",
      omitted: 0,
    },
    {
      name: "body that is a FOR over an empty array",
      template: '{{SECTION "A"}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_SECTION}}',
      data: { xs: [] },
      output: "",
      omitted: 1,
    },
    {
      name: "explicit skip_empty=true behaves like the default",
      template: '{{SECTION "A" skip_empty=true}}{{END_SECTION}}',
      output: "",
      omitted: 1,
    },
    {
      name: "own-line tags around an empty body, standaloneLines true",
      template: '{{SECTION "A"}}\n{{END_SECTION}}\nafter\n',
      options: ON,
      output: "after\n",
      omitted: 1,
    },
    {
      name: "own-line tags around an empty body, standaloneLines false",
      template: '{{SECTION "A"}}\n{{END_SECTION}}\nafter\n',
      options: OFF,
      output: "\nafter\n",
      omitted: 1,
    },
    {
      name: "an empty section before a kept one leaves no heading or spacing of its own",
      template: '{{SECTION "A"}}{{END_SECTION}}\n{{SECTION "B"}}b{{END_SECTION}}',
      options: OFF,
      output: "\n## B\n\nb\n",
      omitted: 1,
    },
    {
      name: "FOR where one iteration yields an empty section",
      template: "{{FOR items AS it}}{{SECTION it.name}}${{it.body}}{{END_SECTION}}{{END_FOR}}",
      data: {
        items: [
          { name: "A", body: "a" },
          { name: "B", body: "" },
          { name: "C", body: "c" },
        ],
      },
      output: "## A\n\na\n## C\n\nc\n",
      omitted: 1,
    },
    {
      name: "FOR where every iteration yields an empty section counts each",
      template: "{{FOR xs AS x}}{{SECTION x}}{{END_SECTION}}{{END_FOR}}",
      data: { xs: ["a", "b", "c"] },
      output: "",
      omitted: 3,
    },
    {
      name: "FOR inside a section with every item empty omits the section",
      template: '{{SECTION "S"}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_SECTION}}',
      data: { xs: ["", ""] },
      output: "",
      omitted: 1,
    },
    {
      name: "an empty inner section is omitted and the outer section keeps its text",
      template: '{{SECTION "O"}}text{{SECTION "I"}}{{END_SECTION}}{{END_SECTION}}',
      output: "## O\n\ntext\n",
      omitted: 1,
    },
    {
      name: "an outer section whose only content is an empty inner section is omitted too",
      template: '{{SECTION "O"}}{{SECTION "I"}}{{END_SECTION}}{{END_SECTION}}',
      output: "",
      omitted: 2,
    },
    {
      name: "a non-empty inner section keeps the outer section",
      template: '{{SECTION "O"}}{{SECTION "I"}}in{{END_SECTION}}{{END_SECTION}}',
      output: "## O\n\n## I\n\nin\n",
      omitted: 0,
    },
    {
      name: "two omitted sections in a row are counted separately",
      template: 'x{{SECTION "A"}}{{END_SECTION}}{{SECTION "B"}}{{END_SECTION}}y',
      output: "xy",
      omitted: 2,
    },
  ]);
});

describe("sc-keep: skip_empty=false keeps the heading", () => {
  it("sc-keep: an empty section keeps its heading and is not counted", () => {
    const r = run('{{SECTION "A" skip_empty=false}}{{END_SECTION}}');
    expect(r.output).toBe("## A\n");
    expect(r.ok).toBe(true);
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: a whitespace-only body keeps the heading, the whitespace is dropped", () => {
    const r = run('{{SECTION "A" skip_empty=false}}  \n \n{{END_SECTION}}');
    expect(r.output).toBe("## A\n");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: level and skip_empty combine in either order", () => {
    const a = run('{{SECTION "A" level=4 skip_empty=false}}{{END_SECTION}}');
    const b = run('{{SECTION "A" skip_empty=false level=4}}{{END_SECTION}}');
    expect(a.output).toBe("#### A\n");
    expect(b.output).toBe("#### A\n");
    expect(a.stats.sectionsOmitted + b.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: text around a kept empty section stays where it was", () => {
    const r = run('a\n{{SECTION "A" skip_empty=false}}{{END_SECTION}}b');
    expect(r.output).toBe("a\n## A\nb");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: an inner empty section kept by skip_empty=false keeps the outer one non-empty", () => {
    const r = run('{{SECTION "O"}}{{SECTION "I" skip_empty=false}}{{END_SECTION}}{{END_SECTION}}');
    expect(r.output).toBe("## O\n\n## I\n");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: skip_empty=false on a non-empty section changes nothing", () => {
    const r = run('{{SECTION "A" skip_empty=false}}x{{END_SECTION}}');
    expect(r.output).toBe("## A\n\nx\n");
    expect(r.stats.sectionsOmitted).toBe(0);
  });

  it("sc-keep: inside FOR, kept empty sections are not counted and omitted ones still are", () => {
    const r = run(
      '{{FOR xs AS x}}{{SECTION x skip_empty=false}}{{END_SECTION}}{{END_FOR}}{{SECTION "Z"}}{{END_SECTION}}',
      { xs: ["a", "b"] }
    );
    expect(r.output).toBe("## a\n## b\n");
    expect(r.stats.sectionsOmitted).toBe(1);
  });
});

describe("sc-errors: invalid sections and depth", () => {
  const cases: {
    name: string;
    template: string;
    data?: Record<string, unknown>;
    code: string;
    line: number;
    column: number;
  }[] = [
    { name: "empty quoted title", template: 'a\n  {{SECTION ""}}x{{END_SECTION}}', code: "type-error", line: 2, column: 3 },
    { name: "missing title", template: "{{SECTION}}x{{END_SECTION}}", code: "type-error", line: 1, column: 1 },
    {
      name: "missing title with only a level",
      template: "ab {{SECTION level=2}}x{{END_SECTION}}",
      code: "type-error",
      line: 1,
      column: 4,
    },
    {
      name: "variable title that is an empty string",
      template: "{{SECTION t}}x{{END_SECTION}}",
      data: { t: "" },
      code: "type-error",
      line: 1,
      column: 1,
    },
    {
      name: "variable title that is a number",
      template: "\n{{SECTION t}}x{{END_SECTION}}",
      data: { t: 5 },
      code: "type-error",
      line: 2,
      column: 1,
    },
    {
      name: "variable title that is an array",
      template: "{{SECTION t}}x{{END_SECTION}}",
      data: { t: ["a"] },
      code: "type-error",
      line: 1,
      column: 1,
    },
    { name: "stray END_SECTION", template: "a\n  {{END_SECTION}}", code: "syntax-error", line: 2, column: 3 },
    {
      name: "non-boolean skip_empty (string)",
      template: 'a\n  {{SECTION "T" skip_empty="no"}}x{{END_SECTION}}',
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "non-boolean skip_empty (number)",
      template: '{{SECTION "T" skip_empty=2}}x{{END_SECTION}}',
      code: "type-error",
      line: 1,
      column: 1,
    },
    { name: "unclosed SECTION is located at its tag", template: 'a\n  {{SECTION "T"}}x', code: "syntax-error", line: 2, column: 3 },
    {
      name: "unclosed inner SECTION is located at the inner tag",
      template: '{{SECTION "O"}}\n {{SECTION "I"}}x\n{{END_SECTION}}',
      code: "syntax-error",
      line: 2,
      column: 2,
    },
    {
      name: "unclosed SECTION inside an IF",
      template: '{{IF t}}{{SECTION "A"}}x{{END_IF}}',
      data: { t: true },
      code: "syntax-error",
      line: 1,
      column: 9,
    },
  ];

  it.each(cases)("sc-errors: $name", ({ template, data, code, line, column }) => {
    const r = run(template, data ?? {});
    expect(r.diagnostics[0]).toMatchObject({ code, line, column });
    expect(r.diagnostics[0].message).not.toMatch(/unknown template tag/i);
    expect(r.ok).toBe(false);
    expect(r.output).toBe("");
  });

  it.each([
    ["standaloneLines true", ON],
    ["standaloneLines false", OFF],
  ])("sc-errors: error locations are source locations (%s)", (_n, options) => {
    const r = run('x\n{{SECTION "A"}}\n  {{SECTION ""}}\ny\n{{END_SECTION}}\n{{END_SECTION}}', {}, options);
    expect(r.diagnostics[0]).toMatchObject({ code: "type-error", line: 3, column: 3 });
  });

  it("sc-errors: an error is raised even when the section would be empty", () => {
    const r = run('{{SECTION ""}}{{END_SECTION}}');
    expect(r.diagnostics[0]).toMatchObject({ code: "type-error", line: 1, column: 1 });
    expect(r.ok).toBe(false);
  });

  it.each([
    ["two nested sections", '{{SECTION "A"}}\n  {{SECTION "B"}}x{{END_SECTION}}\n{{END_SECTION}}', 1, 2, 3],
    ["a section inside an IF", '{{IF t}}{{SECTION "A"}}x{{END_SECTION}}{{END_IF}}', 1, 1, 9],
    ["an IF inside a section", '{{SECTION "A"}}\n{{IF t}}x{{END_IF}}\n{{END_SECTION}}', 1, 2, 1],
    ["a section inside a FOR", "{{FOR xs AS x}}{{SECTION x}}${{x}}{{END_SECTION}}{{END_FOR}}", 1, 1, 16],
  ])("sc-errors: %s counts toward maxDepth", (_n, template, maxDepth, line, column) => {
    const data = { t: true, xs: ["a"] };
    const tooDeep = run(template, data, { limits: { maxDepth } });
    expect(tooDeep.diagnostics[0]).toMatchObject({ code: "limit-depth", line, column });
    expect(tooDeep.ok).toBe(false);
    const fine = run(template, data, { limits: { maxDepth: maxDepth + 1 } });
    expect(fine.diagnostics).toEqual([]);
    expect(fine.ok).toBe(true);
  });

  it("sc-errors: a single top-level section is within maxDepth 1", () => {
    const r = run('{{SECTION "A"}}x{{END_SECTION}}', {}, { limits: { maxDepth: 1 } });
    expect(r.output).toBe("## A\n\nx\n");
    expect(r.ok).toBe(true);
  });
});

describe("sc-analyze: analyze and spec know SECTION", () => {
  const names = (a: ReturnType<typeof analyze>) => a.variables.map((v) => v.name).sort();

  it("sc-analyze: blocks.SECTION counts every section, nested ones included", () => {
    const a = analyze('{{SECTION "A"}}x{{END_SECTION}}{{SECTION "B"}}{{SECTION "C"}}y{{END_SECTION}}{{END_SECTION}}');
    expect((a.blocks as any).SECTION).toBe(3);
    expect(a.diagnostics).toEqual([]);
  });

  it("sc-analyze: sections are counted next to other blocks", () => {
    const a = analyze('{{FOR xs AS x}}{{SECTION "A"}}{{IF t}}${{x}}{{END_IF}}{{END_SECTION}}{{END_FOR}}');
    expect(a.blocks).toMatchObject({ FOR: 1, SECTION: 1, IF: 1 });
  });

  it("sc-analyze: a variable title is read as a required variable", () => {
    const a = analyze("{{SECTION title}}x{{END_SECTION}}");
    expect(names(a)).toEqual(["title"]);
    expect(a.variables[0]).toMatchObject({ name: "title", paths: ["title"], required: true });
  });

  it("sc-analyze: a dotted title path is recorded under its root name", () => {
    const a = analyze("{{SECTION doc.title}}x{{END_SECTION}}");
    expect(a.variables[0]).toMatchObject({ name: "doc", paths: ["doc.title"], required: true });
  });

  it("sc-analyze: variables in a title or body have usedIn output", () => {
    const a = analyze("{{SECTION t}}${{b}}{{END_SECTION}}");
    const used = Object.fromEntries(a.variables.map((v) => [v.name, v.usedIn]));
    expect(used).toEqual({ t: ["output"], b: ["output"] });
  });

  it("sc-analyze: variables in the body are read", () => {
    const a = analyze('{{SECTION "A"}}${{p}} ${{q}}{{END_SECTION}}');
    expect(names(a)).toEqual(["p", "q"]);
  });

  it("sc-analyze: title and body variables are both read", () => {
    const a = analyze("{{SECTION t}}${{b}}{{END_SECTION}}");
    expect(names(a)).toEqual(["b", "t"]);
  });

  it("sc-analyze: a loop variable used as title is not an input", () => {
    const a = analyze("{{FOR xs AS x}}{{SECTION x}}${{x}}{{END_SECTION}}{{END_FOR}}");
    expect(names(a)).toEqual(["xs"]);
  });

  it("sc-analyze: a quoted title reads no variable", () => {
    const a = analyze('{{SECTION "t"}}x{{END_SECTION}}');
    expect(names(a)).toEqual([]);
    expect((a.blocks as any).SECTION).toBe(1);
  });

  it("sc-analyze: spec lists SECTION closed by END_SECTION", () => {
    const blocks = spec().blocks;
    const section = blocks.find((b) => b.name === "SECTION");
    expect(section).toBeDefined();
    expect(section?.closes).toBe("END_SECTION");
    expect(typeof section?.description).toBe("string");
    expect(section?.description.length).toBeGreaterThan(0);
  });

  it("sc-analyze: spec text mentions SECTION and END_SECTION", () => {
    const text = JSON.stringify(spec());
    expect(text).toContain("SECTION");
    expect(text).toContain("END_SECTION");
  });
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index 5073854..5537847 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -16,6 +16,7 @@ import {
   Limits,
   ListItemNode,
   ListNode,
+  SectionNode,
   TableHeaderNode,
   TableNode,
   TableRowNode,
@@ -56,7 +57,7 @@ export interface AnalysisDiagnostic {
   column: number;
 }
 
-export type BlockKind = "IF" | "CASE" | "FOR" | "LIST" | "TABLE";
+export type BlockKind = "IF" | "CASE" | "FOR" | "LIST" | "TABLE" | "SECTION";
 
 export interface TemplateAnalysis {
   variables: VariableUsage[];
@@ -140,6 +141,9 @@ class Walker {
       case "Table":
         this.countBlock("TABLE");
         return this.visitTable(node as TableNode);
+      case "Section":
+        this.countBlock("SECTION");
+        return this.visitSection(node as SectionNode);
       case "Header":
       case "TableRow":
         return this.visitCells(node as TableHeaderNode | TableRowNode);
@@ -194,6 +198,13 @@ class Walker {
     this.scopes.pop();
   }
 
+  private visitSection(node: SectionNode): void {
+    if (node.title.kind === "path") {
+      this.record(node.title.path.join("."), "output", false);
+    }
+    this.visitAll(node.body);
+  }
+
   private visitListItem(node: ListItemNode): void {
     if (node.condition) this.visitCondition(node.condition, "list_item", node);
     this.visitAll(node.content);
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index f40a7dc..1e52406 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -11,6 +11,7 @@ import {
   TableNode,
   TableRowNode,
   TernaryNode,
+  SectionNode,
   VariableMap,
   TemplateValue,
   Limits,
@@ -54,6 +55,7 @@ export class Interpreter {
   private strictMode: boolean;
   private limits: Limits;
   private iterations = 0;
+  private omittedSections = 0;
   private loopContext: Map<string, TemplateValue> = new Map();
 
   constructor(
@@ -71,11 +73,19 @@ export class Interpreter {
     return this.iterations;
   }
 
+  /**
+   * Sections dropped for an empty body by the latest interpret call
+   */
+  get sectionsOmitted(): number {
+    return this.omittedSections;
+  }
+
   /**
    * Main interpretation entry point
    */
   interpret(ast: ProgramNode): string {
     this.iterations = 0;
+    this.omittedSections = 0;
     return this.visitProgram(ast);
   }
 
@@ -149,6 +159,8 @@ export class Interpreter {
         return this.visitList(node as ListNode);
       case "Table":
         return this.visitTable(node as TableNode);
+      case "Section":
+        return this.visitSection(node as SectionNode);
       case "Ternary":
         return this.at(node, () => this.visitTernary(node as TernaryNode));
       case "Comment":
@@ -314,6 +326,44 @@ export class Interpreter {
     return results.join("");
   }
 
+  /**
+   * Visit SECTION: the heading, a blank line and the body without its
+   * leading and trailing blank lines; nothing when the body is blank and
+   * skipEmpty is set
+   */
+  private visitSection(node: SectionNode): string {
+    const title = this.at(node, () => this.sectionTitle(node));
+    const heading = `${"#".repeat(node.level)} ${title}\n`;
+    const body = node.body
+      .map((child) => this.visit(child))
+      .join("")
+      .replace(/\r\n/g, "\n");
+
+    if (body.trim() === "") {
+      if (!node.skipEmpty) return heading;
+      this.omittedSections++;
+      return "";
+    }
+    const trimmed = body
+      .replace(/^([ \t]*\n)+/, "")
+      .replace(/(\n[ \t]*)+$/, "");
+    return `${heading}\n${trimmed}\n`;
+  }
+
+  private sectionTitle(node: SectionNode): string {
+    if (node.title.kind === "literal") return node.title.text;
+    const value = this.resolveNestedPath(node.title.path);
+    if (typeof value !== "string" || value === "") {
+      throw new TypeError(
+        `SECTION title must be a non-empty string, got ${describeValue(value)}`,
+        node.line,
+        node.column,
+        "Map the title variable to a non-empty string"
+      );
+    }
+    return value;
+  }
+
   private restoreLoopContext(saved: Map<string, TemplateValue>): void {
     this.loopContext.clear();
     for (const [key, value] of saved) {
diff --git a/core/src/lexer.ts b/core/src/lexer.ts
index 71fce3d..d54bd9d 100644
--- a/core/src/lexer.ts
+++ b/core/src/lexer.ts
@@ -4,6 +4,17 @@ import { applyWhitespace } from "./whitespace";
 
 const RAW_CLOSER = /\{\{-?[ \t]*END_RAW[ \t]*-?\}\}/y;
 
+/** Block closers checked for balance, each with the opener it closes */
+const CLOSERS: Partial<Record<TokenType, TokenType>> = {
+  [TokenType.END_IF]: TokenType.IF,
+  [TokenType.END_FOR]: TokenType.FOR,
+  [TokenType.END_CASE]: TokenType.CASE,
+  [TokenType.END_TABLE]: TokenType.TABLE,
+  [TokenType.END_LIST]: TokenType.LIST,
+  [TokenType.END_SECTION]: TokenType.SECTION,
+};
+const OPENERS = new Set(Object.values(CLOSERS));
+
 /**
  * Lexer: Converts template string into array of tokens with position tracking
  *
@@ -14,6 +25,7 @@ const RAW_CLOSER = /\{\{-?[ \t]*END_RAW[ \t]*-?\}\}/y;
  * - Loops: {{FOR items AS item}}, {{END_FOR}}
  * - Tables: {{TABLE}}, {{HEADER}}, {{ROW}}, {{END_TABLE}}
  * - Lists: {{LIST}}, {{LIST_ITEM}}, {{END_LIST}}
+ * - Sections: {{SECTION "Title" level=2}}, {{END_SECTION}}
  * - Ternary: {{condition ? "true" : "false"}}
  * - Comments: {{# comment #}}
  * - Literal blocks: {{RAW}}...{{END_RAW}}; \{{ is a literal brace pair
@@ -31,117 +43,52 @@ export class Lexer {
   ) {}
 
   /**
-   * Validate that all blocks are properly closed
+   * Validate that all blocks are properly closed. An open SECTION that meets
+   * another block's closer, or the end of the template, is reported at the
+   * latest SECTION tag opened inside it.
    */
   private validateBlocks(): void {
-    const stack: Array<{ type: string; line: number; column: number }> = [];
+    const stack: Token[] = [];
+    let latestSection: Token | null = null;
 
     for (const token of this.tokens) {
-      // Opening blocks
-      if (
-        [
-          TokenType.IF,
-          TokenType.FOR,
-          TokenType.CASE,
-          TokenType.TABLE,
-          TokenType.LIST,
-        ].includes(token.type)
-      ) {
-        stack.push({
-          type: token.type,
-          line: token.line,
-          column: token.column,
-        });
-      }
-
-      // Closing blocks
-      if (token.type === TokenType.END_IF) {
-        if (
-          stack.length === 0 ||
-          stack[stack.length - 1].type !== TokenType.IF
-        ) {
-          throw new SyntaxError(
-            `Unexpected {{END_IF}} without matching {{IF}}`,
-            token.line,
-            token.column,
-            "Check template structure"
-          );
-        }
-        stack.pop();
-      }
-
-      if (token.type === TokenType.END_FOR) {
-        if (
-          stack.length === 0 ||
-          stack[stack.length - 1].type !== TokenType.FOR
-        ) {
-          throw new SyntaxError(
-            `Unexpected {{END_FOR}} without matching {{FOR}}`,
-            token.line,
-            token.column,
-            "Check template structure"
-          );
-        }
-        stack.pop();
-      }
-
-      if (token.type === TokenType.END_CASE) {
-        if (
-          stack.length === 0 ||
-          stack[stack.length - 1].type !== TokenType.CASE
-        ) {
-          throw new SyntaxError(
-            `Unexpected {{END_CASE}} without matching {{CASE}}`,
-            token.line,
-            token.column,
-            "Check template structure"
-          );
-        }
-        stack.pop();
-      }
-
-      if (token.type === TokenType.END_TABLE) {
-        if (
-          stack.length === 0 ||
-          stack[stack.length - 1].type !== TokenType.TABLE
-        ) {
-          throw new SyntaxError(
-            `Unexpected {{END_TABLE}} without matching {{TABLE}}`,
-            token.line,
-            token.column,
-            "Check template structure"
-          );
-        }
-        stack.pop();
+      if (OPENERS.has(token.type)) {
+        stack.push(token);
+        if (token.type === TokenType.SECTION) latestSection = token;
+        continue;
       }
 
-      if (token.type === TokenType.END_LIST) {
-        if (
-          stack.length === 0 ||
-          stack[stack.length - 1].type !== TokenType.LIST
-        ) {
-          throw new SyntaxError(
-            `Unexpected {{END_LIST}} without matching {{LIST}}`,
-            token.line,
-            token.column,
-            "Check template structure"
-          );
-        }
+      const opener = CLOSERS[token.type];
+      if (opener === undefined) continue;
+      const top = stack[stack.length - 1];
+      if (top?.type === opener) {
         stack.pop();
+        continue;
       }
-    }
-
-    // Check for unclosed blocks
-    if (stack.length > 0) {
-      const unclosed = stack[stack.length - 1];
-      const typeName = unclosed.type.replace("_", " ");
+      if (top?.type === TokenType.SECTION) this.unclosed(latestSection ?? top);
       throw new SyntaxError(
-        `Unclosed {{${typeName}}} block starting at line ${unclosed.line}`,
-        unclosed.line,
-        unclosed.column,
-        `Add {{END_${typeName}}}`
+        `Unexpected {{${token.type}}} without matching {{${opener}}}`,
+        token.line,
+        token.column,
+        "Check template structure"
       );
     }
+
+    const unclosed = stack[stack.length - 1];
+    if (unclosed === undefined) return;
+    this.unclosed(
+      unclosed.type === TokenType.SECTION ? latestSection ?? unclosed : unclosed
+    );
+  }
+
+  private unclosed(opener: Token): never {
+    const typeName = opener.type.replace("_", " ");
+    throw new SyntaxError(
+      `Unclosed {{${typeName}}} block starting at line ${opener.line}`,
+      opener.line,
+      opener.column,
+      `Add {{END_${typeName}}}`
+    );
   }
 
   /**
@@ -518,6 +465,8 @@ export class Lexer {
       END_TABLE: TokenType.END_TABLE,
       RAW: TokenType.RAW,
       END_RAW: TokenType.END_RAW,
+      SECTION: TokenType.SECTION,
+      END_SECTION: TokenType.END_SECTION,
     };
 
     return mapping[keyword] || null;
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 3df3c7e..4956e1e 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -16,10 +16,15 @@ import {
   TableHeaderNode,
   TableRowNode,
   CommentNode,
+  SectionNode,
+  SectionTitle,
   FilterCall,
   DEFAULT_LIMITS,
 } from "./types";
-import { SyntaxError, LimitError } from "./errors";
+import { SyntaxError, TypeError, LimitError } from "./errors";
+
+const SECTION_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
+const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
 
 /**
  * Parser: Builds Abstract Syntax Tree from tokens
@@ -80,6 +85,8 @@ export class Parser {
         return this.nested(() => this.parseList());
       case TokenType.TABLE:
         return this.nested(() => this.parseTable());
+      case TokenType.SECTION:
+        return this.nested(() => this.parseSection());
       case TokenType.HEADER:
         return this.parseTableHeader();
       case TokenType.ROW:
@@ -600,6 +607,103 @@ export class Parser {
     return { iterable: iterablePath, itemName };
   }
 
+  /**
+   * Parse SECTION: {{SECTION "Title" level=2 skip_empty=false}}...{{END_SECTION}}
+   */
+  private parseSection(): SectionNode {
+    const token = this.consume(TokenType.SECTION);
+    const { title, level, skipEmpty } = this.parseSectionArguments(token);
+
+    const body: ASTNode[] = [];
+    while (!this.check(TokenType.END_SECTION)) {
+      if (this.isAtEnd()) {
+        throw new SyntaxError(
+          "Unclosed {{SECTION}} block",
+          token.line,
+          token.column,
+          "Add {{END_SECTION}}"
+        );
+      }
+      const node = this.parseNode();
+      if (node) body.push(node);
+    }
+
+    this.consume(TokenType.END_SECTION);
+
+    return {
+      type: "Section",
+      title,
+      level,
+      skipEmpty,
+      body,
+      line: token.line,
+      column: token.column,
+    };
+  }
+
+  /**
+   * Parse the SECTION title (quoted string or variable path) and its
+   * level and skip_empty options
+   */
+  private parseSectionArguments(token: Token): {
+    title: SectionTitle;
+    level: number;
+    skipEmpty: boolean;
+  } {
+    const typeError = (message: string, suggestion: string) =>
+      new TypeError(message, token.line, token.column, suggestion);
+    const syntaxError = (message: string) =>
+      new SyntaxError(
+        message,
+        token.line,
+        token.column,
+        'Expected: {{SECTION "Title" level=2 skip_empty=true}}'
+      );
+
+    let title: SectionTitle | null = null;
+    let level = 2;
+    let skipEmpty = true;
+    const args = token.value.slice("SECTION".length);
+
+    for (const [argument, key, value] of args.matchAll(SECTION_ARGUMENT)) {
+      if (key === "level") {
+        if (!/^[+-]?\d+$/.test(value)) {
+          throw typeError(
+            `SECTION level must be an integer, got ${value}`,
+            "Use level=1 through level=6"
+          );
+        }
+        level = Math.min(6, Math.max(1, Number(value)));
+      } else if (key === "skip_empty") {
+        if (value !== "true" && value !== "false") {
+          throw typeError(
+            `SECTION skip_empty must be true or false, got ${value}`,
+            "Use skip_empty=true or skip_empty=false"
+          );
+        }
+        skipEmpty = value === "true";
+      } else if (key !== undefined) {
+        throw syntaxError(`Unknown SECTION option: ${key}`);
+      } else if (title !== null) {
+        throw syntaxError(`Unexpected SECTION argument: ${argument}`);
+      } else if (/^(["']).*\1$/.test(argument)) {
+        title = { kind: "literal", text: argument.slice(1, -1) };
+      } else if (VARIABLE_PATH.test(argument)) {
+        title = { kind: "path", path: argument.split(".") };
+      } else {
+        throw syntaxError(`Invalid SECTION title: ${argument}`);
+      }
+    }
+
+    if (title === null || (title.kind === "literal" && title.text === "")) {
+      throw typeError(
+        "SECTION needs a non-empty title",
+        'Give a quoted title or a variable path: {{SECTION "Title"}}'
+      );
+    }
+    return { title, level, skipEmpty };
+  }
+
   /**
    * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
    */
diff --git a/core/src/render.ts b/core/src/render.ts
index 5943021..ee12cb2 100644
--- a/core/src/render.ts
+++ b/core/src/render.ts
@@ -88,7 +88,7 @@ export function render(
     stats: {
       chars: output.length,
       estTokens: estimate(output),
-      sectionsOmitted: 0,
+      sectionsOmitted: interpreter.sectionsOmitted,
       iterations: interpreter.iterationCount,
     },
     diagnostics: [],
diff --git a/core/src/spec.ts b/core/src/spec.ts
index c1d1dcc..827c82d 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -86,6 +86,13 @@ const BLOCKS: Spec["blocks"] = [
     args: "",
     description: "Inside TABLE: row cells separated by |",
   },
+  {
+    name: "SECTION",
+    closes: "END_SECTION",
+    args: '"Title" | path [level=1-6] [skip_empty=true|false]',
+    description:
+      "A markdown heading at level (default 2, clamped to 1-6), a blank line and the body with its leading and trailing blank lines trimmed; omitted entirely when the body renders empty, unless skip_empty=false keeps the heading",
+  },
   {
     name: "RAW",
     closes: "END_RAW",
diff --git a/core/src/types.ts b/core/src/types.ts
index eedd651..7cdf8f3 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -54,6 +54,8 @@ export enum TokenType {
   END_TABLE = "END_TABLE",
   RAW = "RAW",
   END_RAW = "END_RAW",
+  SECTION = "SECTION",
+  END_SECTION = "END_SECTION",
   COMMENT = "COMMENT",
   EOF = "EOF",
 }
@@ -172,6 +174,25 @@ export interface ForNode extends ASTNode {
   body: ASTNode[];
 }
 
+/**
+ * SECTION title: a quoted string or a variable path
+ */
+export type SectionTitle =
+  | { kind: "literal"; text: string }
+  | { kind: "path"; path: string[] };
+
+/**
+ * SECTION block: a markdown heading over its body, dropped when the body
+ * renders empty
+ */
+export interface SectionNode extends ASTNode {
+  type: "Section";
+  title: SectionTitle;
+  level: number;
+  skipEmpty: boolean;
+  body: ASTNode[];
+}
+
 /**
  * List container node
  */
diff --git a/core/src/whitespace.ts b/core/src/whitespace.ts
index b04a13c..6033472 100644
--- a/core/src/whitespace.ts
+++ b/core/src/whitespace.ts
@@ -14,6 +14,8 @@ const STANDALONE_TAGS = new Set<TokenType>([
   TokenType.END_CASE,
   TokenType.FOR,
   TokenType.END_FOR,
+  TokenType.SECTION,
+  TokenType.END_SECTION,
   TokenType.RAW,
   TokenType.END_RAW,
   TokenType.COMMENT,
```

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/promptaware/section.test.ts --json`
- Exit status: 0
- Tests: 94 passed, 0 failed
- Failing tests: none

## Output

Answer with one JSON object and nothing else, in this shape:

```json
{
  "restatement": "the objective in your own words, one short paragraph",
  "brief_mismatch": null,
  "verification_plan": ["each check you will make, written from section 1 alone"],
  "findings": [{
    "title": "one line",
    "class": "defect | goal-risk | drift | simplification",
    "serves": { "target": "c1 | m1 | card-goal | cycle-goal | project-goal", "scenario": "the concrete failure against that target" },
    "rubric": "the rubric item or criterion cited",
    "reproduction": "falsifiable steps that show the failure",
    "evidence": ["doc:<path>", "code:<path>:<line>", "test:<name>", "diff:<path>"],
    "location": "path:line or null"
  }],
  "responses": [{ "finding": "f1", "verdict": "sustain | withdraw", "evidence": ["code:src/a.mjs:12"] }]
}
```

Rules:

- Judge the diff against section 1 and the goals it names, never against how the work was done. Write `restatement` before you read section 3.
- Product tier and up: write `verification_plan` from section 1 alone, before you read section 3.
- `brief_mismatch`: a string when the brief, the criteria and the goals contradict each other; otherwise null.
- Every finding names what it serves in `serves.target`: a criterion (c1, c2, ...), a must-not (m1, m2, ...) or a goal (card-goal, cycle-goal, project-goal). A finding that serves nothing in the objective chain is dropped.
- `defect` and `goal-risk` need a rubric item and falsifiable reproduction steps; `goal-risk` also needs evidence. Every evidence entry is `<kind>:<ref>` with a kind of doc, code, test or diff.
- Answer each question in the reviewer brief. A weak answer to a goal-critical question is a `goal-risk` finding serving that question's goal (a fix request: revise and resubmit). A weak answer to a polish question is a `drift` finding (noted for the lead, never a fix request). Strong and adequate answers need no finding.
- `responses` answers earlier findings by label when you are asked to; otherwise leave it empty.
