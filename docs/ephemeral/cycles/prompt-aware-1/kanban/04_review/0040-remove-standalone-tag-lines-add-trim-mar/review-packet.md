---
type: review-packet
card: 0040-remove-standalone-tag-lines-add-trim-mar
tier: product
built_at: 2026-10-14T02:26:12.652Z
base: 0687324cf97f7455deadb7d36ba1f3d204b4dc32
head: 999df73891e051308b45b39f093c12ddb2c950e2
frozen: true
brief_sha256: 39a6c5080770d89a8907ca5706d87e5d26841bcc52a58cbf2f6150c56b170b68
manifest_sha256: 15ec337cac4cfdb8c8fb53f339757ae23bb2075915c1cbc16f81707da721f8f2
criteria_sha256: d89bcee88cbb17763b7d242a10a39611361678a02f8f05ba3ca764234560ac59
scope_sha256: 948dceecc1f8923c15de377dec959f9f684da9a27565046cfd2c8d621d285633
diff_sha256: 172c74021baa8013f8c8c34519071169deca9546b90fe5d266ffcfb2b868a483
omitted_paths: 5
criteria_count: 6
must_not_count: 3
---

# Review packet: 0040-remove-standalone-tag-lines-add-trim-mar

Manifest amended after the freeze at 2026-10-14T02:26:07.588Z by lead: interpreter and parser needed no change (edit -core/src/interpreter.ts, edit -core/src/parser.ts)

Manifest amended after the freeze at 2026-10-14T02:26:07.696Z by lead: whitespace handling lives in its own module (add +core/src/whitespace.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: whitespace rules and literal braces in the lexer, parser and interpreter, plus the standaloneLines option in render.

### Criteria

- c1 (verify: test): ws-standalone: with standaloneLines on, a line holding only whitespace and block tags (IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR and comments) disappears with its line break, while a line that also holds text or a variable, and LIST, LIST_ITEM, TABLE, HEADER and ROW tags, keep their old spacing
- c2 (verify: test): ws-trim: a minus marker after the opening braces trims all whitespace before the tag and a minus marker before the closing braces trims all whitespace after it, both on every block tag and comment, with the standalone option on or off
- c3 (verify: test): ws-option: render defaults standaloneLines to true, resolveTemplate defaults it to false so the whole existing suite is unchanged, and an explicit option wins in both
- c4 (verify: test): rw-raw: RAW and END_RAW output their content literally (no tags, variables or comments), keep spaces, turn CRLF into LF, work inside FOR and untaken IF branches, and an unclosed RAW is a syntax-error located at the RAW tag
- c5 (verify: test): rw-escape: a backslash directly before the opening brace pair outputs the brace pair literally and consumes the backslash; a backslash elsewhere is text; two backslashes before the pair give a literal backslash and an active tag
- c6 (verify: test): rw-spec: spec lists RAW and its closer and the standaloneLines option

### Must not

- m1: change any existing test expectation
- m2: change what resolveTemplate renders by default
- m3: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: whitespace rules and literal braces in the lexer, parser and interpreter, plus the standaloneLines option in render.
Must not:
- change any existing test expectation
- change what resolveTemplate renders by default
- add a runtime dependency

## Questions

goal-critical: does a template with IF/FOR tags on their own lines render with no stray blank lines by default in render, and unchanged through resolveTemplate?
goal-critical: do analyze and validate understand RAW and the trim markers without errors?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
- docs/living/decisions/adr/0002-standalone-block-tag-lines-vanish.md
```

### spec.md as of base 0687324

```
# Spec

## Acceptance criteria

- ws-standalone: with standaloneLines on, a line holding only whitespace and block tags (IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR and comments) disappears with its line break, while a line that also holds text or a variable, and LIST, LIST_ITEM, TABLE, HEADER and ROW tags, keep their old spacing
- ws-trim: a minus marker after the opening braces trims all whitespace before the tag and a minus marker before the closing braces trims all whitespace after it, both on every block tag and comment, with the standalone option on or off
- ws-option: render defaults standaloneLines to true, resolveTemplate defaults it to false so the whole existing suite is unchanged, and an explicit option wins in both
- rw-raw: RAW and END_RAW output their content literally (no tags, variables or comments), keep spaces, turn CRLF into LF, work inside FOR and untaken IF branches, and an unclosed RAW is a syntax-error located at the RAW tag
- rw-escape: a backslash directly before the opening brace pair outputs the brace pair literally and consumes the backslash; a backslash elsewhere is text; two backslashes before the pair give a literal backslash and an active tag
- rw-spec: spec lists RAW and its closer and the standaloneLines option
```

### card.md as of base 0687324

```
# Remove standalone tag lines, add trim markers, RAW and brace escaping

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Lines that hold only a block tag vanish from the output, '-' markers trim adjacent whitespace, RAW blocks and the escaped opening brace pair output literal braces, all as the contract says. Existing templates keep their old spacing through resolveTemplate.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `ws-standalone` with standaloneLines on, a line holding only whitespace and block tags (IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR and comments) disappears with its line break, while a line that also holds text or a variable, and LIST, LIST_ITEM, TABLE, HEADER and ROW tags, keep their old spacing
- `contract` `ws-trim` a minus marker after the opening braces trims all whitespace before the tag and a minus marker before the closing braces trims all whitespace after it, both on every block tag and comment, with the standalone option on or off
- `contract` `ws-option` render defaults standaloneLines to true, resolveTemplate defaults it to false so the whole existing suite is unchanged, and an explicit option wins in both
- `contract` `rw-raw` RAW and END_RAW output their content literally (no tags, variables or comments), keep spaces, turn CRLF into LF, work inside FOR and untaken IF branches, and an unclosed RAW is a syntax-error located at the RAW tag
- `contract` `rw-escape` a backslash directly before the opening brace pair outputs the brace pair literally and consumes the backslash; a backslash elsewhere is text; two backslashes before the pair give a literal backslash and an active tag
- `contract` `rw-spec` spec lists RAW and its closer and the standaloneLines option


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- change what resolveTemplate renders by default
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the surfaces card documents it.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

RenderOptions.standaloneLines; resolveTemplate options.standaloneLines; RAW block; the escaped brace pair (see docs/living/architecture/prompt-aware-contract.md).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/interpreter.ts` | edit | none |
| `core/src/lexer.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
| `core/src/render.ts` | edit | none |
| `core/src/resolve.ts` | edit | none |
| `core/src/spec.ts` | edit | none |
| `core/src/types.ts` | edit | none |

Files scope: `core/src/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `core/src/whitespace.ts`
- remove: none
- edit: `core/src/lexer.ts`, `core/src/render.ts`, `core/src/resolve.ts`, `core/src/spec.ts`, `core/src/types.ts`
- files_scope: `core/src/`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/prompt-aware-contract.md

```
---
summary: Contract for the first prompt-aware language additions: standalone-line whitespace, trim markers, RAW and brace escaping, SECTION, heading offset, auto-sized FENCE and escape modes.
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

### docs/living/decisions/adr/0002-standalone-block-tag-lines-vanish.md

```
---
summary: Lines holding only a block tag vanish by default; '-' markers trim explicitly and an option turns the default off.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: built
---

# Standalone block-tag lines vanish by default

**Context.** Block tags on their own line leave blank lines in the output, the biggest day-to-day annoyance in markdown prompts.

**Decision.** A line that holds only a block tag (and whitespace) is removed from the output, following the Handlebars standalone rule. Explicit '-' markers on a tag trim adjacent whitespace. An option turns the standalone rule off.

**Alternatives.** Explicit '-' markers only, which every author must remember on every tag; rejected as the default.

**Consequences.** Output of existing templates may lose blank lines, so the rule is introduced with the whitespace work and covered by golden files. The option restores the old behaviour.
```

## Frozen tests (read-only)

These test files were committed before the work began, at base 0687324. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/promptaware/whitespace.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, resolveTemplate } from "../../core/src";

type Data = Record<string, unknown>;

/** render with the standaloneLines option set explicitly (cast: the option is new) */
function renderWith(template: string, data: Data, standaloneLines: boolean) {
  return render(template, data, { standaloneLines } as any);
}

/** a thrown template error comes back as its message, so a mismatch fails by assertion */
function resolveWith(template: string, data: Data, standaloneLines?: boolean): string {
  try {
    return resolveTemplate(
      template,
      new Map(Object.entries(data)) as any,
      standaloneLines === undefined ? undefined : ({ standaloneLines } as any)
    );
  } catch (e) {
    return `THROWN: ${(e as Error).message}`;
  }
}

const XS = ["a", "b"];

type Standalone = {
  name: string;
  template: string;
  data: Data;
  /** output with the option on, written by hand from the contract */
  on: string;
  /** output with the option off (the old spacing), when the case needs it checked */
  off?: string;
};

const STANDALONE: Standalone[] = [
  {
    name: "IF and END_IF each on their own line around text lines",
    template: "intro\n{{IF x}}\nyes\n{{END_IF}}\noutro\n",
    data: { x: true },
    on: "intro\nyes\noutro\n",
    off: "intro\n\nyes\n\noutro\n",
  },
  {
    name: "an untaken IF leaves no blank line behind",
    template: "intro\n{{IF x}}\nyes\n{{END_IF}}\noutro\n",
    data: { x: false },
    on: "intro\noutro\n",
    off: "intro\n\noutro\n",
  },
  {
    name: "ELSEIF and ELSE lines vanish (ELSEIF branch)",
    template: "{{IF a}}\nA\n{{ELSEIF b}}\nB\n{{ELSE}}\nC\n{{END_IF}}\nend",
    data: { a: false, b: true },
    on: "B\nend",
  },
  {
    name: "ELSEIF and ELSE lines vanish (ELSE branch)",
    template: "{{IF a}}\nA\n{{ELSEIF b}}\nB\n{{ELSE}}\nC\n{{END_IF}}\nend",
    data: { a: false, b: false },
    on: "C\nend",
  },
  {
    name: "ELSEIF and ELSE lines vanish (IF branch)",
    template: "{{IF a}}\nA\n{{ELSEIF b}}\nB\n{{ELSE}}\nC\n{{END_IF}}\nend",
    data: { a: true, b: true },
    on: "A\nend",
  },
  {
    name: "FOR with body lines",
    template: "{{FOR xs AS x}}\n- ${{x}}\n{{END_FOR}}\ndone",
    data: { xs: XS },
    on: "- a\n- b\ndone",
  },
  {
    name: "FOR over an empty array leaves only the text around it",
    template: "head\n{{FOR xs AS x}}\n- ${{x}}\n{{END_FOR}}\ndone",
    data: { xs: [] },
    on: "head\ndone",
  },
  {
    name: "indented tags nested in FOR and IF, body keeps its own indentation",
    template:
      "list:\n{{FOR xs AS x}}\n  {{IF @first}}\n  first ${{x}}\n  {{ELSE}}\n  other ${{x}}\n  {{END_IF}}\n{{END_FOR}}\nend",
    data: { xs: XS },
    on: "list:\n  first a\n  other b\nend",
  },
  {
    name: "CASE WHEN DEFAULT (WHEN branch)",
    template:
      '{{CASE s}}\n{{WHEN "a"}}\nA\n{{END_WHEN}}\n{{WHEN "b"}}\nB\n{{END_WHEN}}\n{{DEFAULT}}\nD\n{{END_DEFAULT}}\n{{END_CASE}}\nend',
    data: { s: "b" },
    on: "B\nend",
  },
  {
    name: "CASE WHEN DEFAULT (DEFAULT branch)",
    template:
      '{{CASE s}}\n{{WHEN "a"}}\nA\n{{END_WHEN}}\n{{DEFAULT}}\nD\n{{END_DEFAULT}}\n{{END_CASE}}\nend',
    data: { s: "zzz" },
    on: "D\nend",
  },
  {
    name: "a comment on its own line",
    template: "a\n{{# note #}}\nb",
    data: {},
    on: "a\nb",
    off: "a\n\nb",
  },
  {
    name: "an indented comment with trailing spaces",
    template: "a\n    {{# note #}}   \nb",
    data: {},
    on: "a\nb",
  },
  {
    name: "a comment on a line with text stays in place",
    template: "a {{# n #}} b\nc\n{{# gone #}}\n",
    data: {},
    on: "a  b\nc\n",
  },
  {
    name: "a tag line with trailing spaces and tabs",
    template: "{{IF x}}  \t\nyes\n{{END_IF}} \nend",
    data: { x: true },
    on: "yes\nend",
  },
  {
    name: "blank lines around tag lines are kept",
    template: "a\n\n{{IF x}}\nb\n{{END_IF}}\n\nc",
    data: { x: true },
    on: "a\n\nb\n\nc",
  },
  {
    name: "CRLF input: tag lines vanish with their CRLF",
    template: "a\r\n{{IF x}}\r\nb\r\n{{END_IF}}\r\nc\r\n",
    data: { x: true },
    on: "a\nb\nc\n",
  },
  {
    name: "first line is a tag line",
    template: "{{IF x}}\nb\n{{END_IF}}\n",
    data: { x: true },
    on: "b\n",
  },
  {
    name: "last line is a tag line without a trailing newline",
    template: "a\n{{IF x}}\nb\n{{END_IF}}",
    data: { x: true },
    on: "a\nb\n",
  },
  {
    name: "a template made only of comment lines",
    template: "{{# a #}}\n{{# b #}}\n",
    data: {},
    on: "",
  },
  {
    name: "a template made only of tag lines yields an empty output",
    template: "{{IF x}}\n{{END_IF}}",
    data: { x: true },
    on: "",
  },
  {
    name: "adjacent standalone tag lines all vanish",
    template: "a\n{{IF x}}\n{{FOR xs AS i}}\n${{i}}\n{{END_FOR}}\n{{END_IF}}\nz",
    data: { x: true, xs: XS },
    on: "a\na\nb\nz",
  },
  {
    name: "two tags on one line (no text) vanish together",
    template: "{{IF x}}{{FOR xs AS i}}\n${{i}}\n{{END_FOR}}{{END_IF}}\nz",
    data: { x: true, xs: XS },
    on: "a\nb\nz",
  },
  {
    name: "a tag and a comment on one line vanish together",
    template: "{{IF x}} {{# c #}}\nq\n{{END_IF}}\n",
    data: { x: true },
    on: "q\n",
  },
  {
    name: "a tag on a line with text stays (inline IF)",
    template: "{{IF x}}yes{{END_IF}}\nz\n{{# gone #}}\n",
    data: { x: true },
    on: "yes\nz\n",
  },
  {
    name: "an opening tag line then a closing tag that shares a text line",
    template: "{{IF x}}\nyes{{END_IF}}\nz",
    data: { x: true },
    on: "yes\nz",
  },
  {
    name: "a line with a variable and a tag is untouched",
    template: "${{v}} {{IF x}}\nb\n{{END_IF}}\n",
    data: { v: "V", x: true },
    on: "V \nb\n",
  },
  {
    name: "a line with text before a tag is untouched",
    template: "text {{FOR xs AS i}}\n${{i}}\n{{END_FOR}}\nz",
    data: { xs: XS },
    on: "text \na\n\nb\nz",
  },
  {
    name: "LIST and LIST_ITEM tags keep their old spacing inside a standalone IF",
    template:
      "x\n{{IF t}}\n{{LIST}}\n{{LIST_ITEM}}A{{END_LIST_ITEM}}\n{{LIST_ITEM}}B{{END_LIST_ITEM}}\n{{END_LIST}}\n{{END_IF}}\ny",
    data: { t: true },
    on: "x\n1. A\n2. B\ny",
    off: "x\n\n1. A\n2. B\n\ny",
  },
  {
    name: "an indented LIST tag line is not a standalone line",
    template:
      "{{IF t}}\n  {{LIST}}\n  {{LIST_ITEM}}A{{END_LIST_ITEM}}\n  {{END_LIST}}\n{{END_IF}}\ny",
    data: { t: true },
    on: "  1. A\ny",
    off: "\n  1. A\n\ny",
  },
  {
    name: "TABLE, HEADER and ROW tags keep their old spacing inside a standalone IF",
    template:
      "x\n{{IF t}}\n{{TABLE}}\n{{HEADER}}N|A{{END_HEADER}}\n{{ROW}}p|1{{END_ROW}}\n{{ROW}}q|2{{END_ROW}}\n{{END_TABLE}}\n{{END_IF}}\ny",
    data: { t: true },
    on: "x\n| N | A |\n|:-----|:-----|\n| p | 1 |\n| q | 2 |\ny",
    off: "x\n\n| N | A |\n|:-----|:-----|\n| p | 1 |\n| q | 2 |\n\ny",
  },
];

describe("ws-standalone: standalone block-tag lines vanish with their line break", () => {
  it.each(STANDALONE)("ws-standalone: $name (render, option on)", ({ template, data, on }) => {
    const r = renderWith(template, data, true);
    expect(r.output).toBe(on);
    expect(r.ok).toBe(true);
  });

  it.each(STANDALONE)(
    "ws-standalone: $name (resolveTemplate, option on)",
    ({ template, data, on }) => {
      expect(resolveWith(template, data, true)).toBe(on);
    }
  );

  it.each(STANDALONE.filter((c) => c.off !== undefined))(
    "ws-standalone: $name (option off keeps the old output)",
    ({ template, data, on, off }) => {
      // the on-side check keeps this test red until the option exists
      expect(renderWith(template, data, true).output).toBe(on);
      expect(renderWith(template, data, false).output).toBe(off);
      expect(resolveWith(template, data, false)).toBe(off);
    }
  );

  it("ws-standalone: diagnostics keep line numbers of the template as written after tag lines vanish", () => {
    expect(renderWith("{{IF x}}\n{{END_IF}}\nv", { x: true }, true).output).toBe("v");
    const r = render("{{IF x}}\n{{END_IF}}\n${{missing}}", { x: true }, {
      strictMode: true,
      standaloneLines: true,
    } as any);
    expect(r.diagnostics[0]).toMatchObject({ code: "missing-variable", line: 3 });
    expect(r.ok).toBe(false);
  });

  it("ws-standalone: stats.chars counts the output after tag lines vanish", () => {
    const r = renderWith("{{IF x}}\nab\n{{END_IF}}\n", { x: true }, true);
    expect(r.output).toBe("ab\n");
    expect(r.stats.chars).toBe(3);
  });
});

type Trim = {
  name: string;
  template: string;
  data: Data;
  out: string;
};

const TRIM: Trim[] = [
  {
    name: "minus after the opening braces trims whitespace and newlines before an IF",
    template: "a  \n\t {{- IF x }}b{{END_IF}}",
    data: { x: true },
    out: "ab",
  },
  {
    name: "minus before the closing braces trims whitespace and newlines after an IF",
    template: "{{IF x -}}  \n\t b{{END_IF}}",
    data: { x: true },
    out: "b",
  },
  {
    name: "both markers on IF and END_IF (taken)",
    template: "a \n{{- IF x -}}\n b {{- END_IF -}}\n c",
    data: { x: true },
    out: "abc",
  },
  {
    name: "both markers on IF and END_IF (untaken)",
    template: "a \n{{- IF x -}}\n b {{- END_IF -}}\n c",
    data: { x: false },
    out: "ac",
  },
  {
    name: "no whitespace to trim is fine",
    template: "a{{- IF x -}}b{{END_IF}}",
    data: { x: true },
    out: "ab",
  },
  {
    name: "markers on ELSE (ELSE branch)",
    template: "{{IF f}}a {{- ELSE -}} b{{END_IF}}",
    data: { f: false },
    out: "b",
  },
  {
    name: "markers on ELSE (IF branch)",
    template: "{{IF f}}a {{- ELSE -}} b{{END_IF}}",
    data: { f: true },
    out: "a",
  },
  {
    name: "markers on ELSEIF",
    template: "{{IF f}}a {{- ELSEIF t -}} b {{- ELSE -}} c{{END_IF}}",
    data: { f: false, t: true },
    out: "b",
  },
  {
    name: "markers on FOR and END_FOR",
    template: "[ {{- FOR xs AS x -}} ${{x}} {{- END_FOR -}} ]",
    data: { xs: XS },
    out: "[ab]",
  },
  {
    name: "a marker only on the opening side of FOR leaves the body end alone",
    template: "[{{FOR xs AS x -}}  ${{x}} {{END_FOR}}]",
    data: { xs: XS },
    out: "[a b ]",
  },
  {
    name: "markers on CASE, WHEN, DEFAULT and their closers (WHEN branch)",
    template:
      '{{CASE s -}}\n  {{- WHEN "a" -}} A {{- END_WHEN -}}\n {{- WHEN "b" -}} B {{- END_WHEN -}}\n{{- DEFAULT -}} D {{- END_DEFAULT -}} \n{{- END_CASE}}!',
    data: { s: "b" },
    out: "B!",
  },
  {
    name: "markers on CASE, WHEN, DEFAULT and their closers (DEFAULT branch)",
    template:
      '{{CASE s -}}\n  {{- WHEN "a" -}} A {{- END_WHEN -}}\n{{- DEFAULT -}} D {{- END_DEFAULT -}} \n{{- END_CASE}}!',
    data: { s: "q" },
    out: "D!",
  },
  {
    name: "markers on a comment trim both sides",
    template: "a  {{-# c #-}}  b",
    data: {},
    out: "ab",
  },
  {
    name: "a comment marker before trims before only",
    template: "a \n{{-# c #}}\nb",
    data: {},
    out: "a\nb",
  },
  {
    name: "a comment marker after trims after only",
    template: "a\n{{# c #-}}\n b",
    data: {},
    out: "a\nb",
  },
  {
    name: "the minus is not part of the condition expression",
    template: "{{IF n -}} yes{{END_IF}}",
    data: { n: 5 },
    out: "yes",
  },
  {
    name: "trim before END_IF trims only the end of the taken branch body",
    template: "x{{IF f}} y {{- END_IF}} z",
    data: { f: true },
    out: "x y z",
  },
  {
    name: "trim before END_IF leaves the text after an untaken IF alone",
    template: "x{{IF f}} y {{- END_IF}} z",
    data: { f: false },
    out: "x z",
  },
];

describe("ws-trim: minus markers trim adjacent whitespace", () => {
  it.each(TRIM)("ws-trim: $name (render, option on)", ({ template, data, out }) => {
    const r = renderWith(template, data, true);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(TRIM)("ws-trim: $name (render, option off)", ({ template, data, out }) => {
    const r = renderWith(template, data, false);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(TRIM)("ws-trim: $name (resolveTemplate, default)", ({ template, data, out }) => {
    expect(resolveWith(template, data)).toBe(out);
  });
});

describe("ws-option: standaloneLines defaults and explicit values", () => {
  const T = "{{IF x}}\nb\n{{END_IF}}\n";
  const vars = new Map<string, unknown>([["x", true]]) as any;

  it("ws-option: render defaults standaloneLines to true", () => {
    expect(render(T, { x: true }).output).toBe("b\n");
  });

  it("ws-option: render with other options but no standaloneLines key still defaults to true", () => {
    expect(render(T, { x: true }, { strictMode: true }).output).toBe("b\n");
  });

  it("ws-option: render with standaloneLines undefined still defaults to true", () => {
    expect(render(T, { x: true }, { standaloneLines: undefined } as any).output).toBe("b\n");
  });

  it("ws-option: render with standaloneLines false keeps the old spacing", () => {
    expect(renderWith(T, { x: true }, true).output).toBe("b\n");
    expect(renderWith(T, { x: true }, false).output).toBe("\nb\n\n");
  });

  it("ws-option: render with standaloneLines true removes tag lines", () => {
    expect(renderWith(T, { x: true }, true).output).toBe("b\n");
  });

  it("ws-option: resolveTemplate defaults standaloneLines to false", () => {
    // paired with the explicit-true check so the test is red until the option exists
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
    expect(resolveTemplate(T, vars)).toBe("\nb\n\n");
  });

  it("ws-option: resolveTemplate with other options only still defaults to false", () => {
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
    expect(resolveTemplate(T, vars, { strictMode: true })).toBe("\nb\n\n");
  });

  it("ws-option: resolveTemplate with standaloneLines true removes tag lines", () => {
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
  });

  it("ws-option: resolveTemplate with standaloneLines false keeps the old spacing", () => {
    expect(resolveWith(T, { x: true }, true)).toBe("b\n");
    expect(resolveWith(T, { x: true }, false)).toBe("\nb\n\n");
  });

  it("ws-option: an explicit option wins in both entry points for an untaken branch", () => {
    expect(renderWith(T, { x: false }, true).output).toBe("");
    expect(renderWith(T, { x: false }, false).output).toBe("\n");
    expect(resolveWith(T, { x: false }, true)).toBe("");
    expect(resolveWith(T, { x: false }, false)).toBe("\n");
  });
});
```

### tests/promptaware/raw.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import { analyze, render, resolveTemplate, spec, validate } from "../../core/src";

type Data = Record<string, unknown>;

/** render with the standaloneLines option off, so line removal never interferes */
function renderOff(template: string, data: Data) {
  return render(template, data, { standaloneLines: false } as any);
}

/** a thrown template error comes back as its message, so a mismatch fails by assertion */
function resolve(template: string, data: Data): string {
  try {
    return resolveTemplate(template, new Map(Object.entries(data)) as any);
  } catch (e) {
    return `THROWN: ${(e as Error).message}`;
  }
}

type Raw = { name: string; template: string; data: Data; out: string };

// Ported from the earlier RAW block tests: same intent, now through render and resolveTemplate.
const RAW: Raw[] = [
  {
    name: "content is literal: tags, variables, comments and single braces",
    template: "{{RAW}}{{IF x}} ${{name}} {{# c #}} { }{{END_RAW}}",
    data: {},
    out: "{{IF x}} ${{name}} {{# c #}} { }",
  },
  {
    name: "an empty RAW outputs nothing",
    template: "a{{RAW}}{{END_RAW}}b",
    data: {},
    out: "ab",
  },
  {
    name: "text and variables around RAW still render",
    template: "a{{RAW}}${{n}}{{END_RAW}}b ${{n}}",
    data: { n: "X" },
    out: "a${{n}}b X",
  },
  {
    name: "in a FOR body the raw text appears once per iteration",
    template: "{{FOR a AS x}}[{{RAW}}${{x}}{{END_RAW}}${{x}}]{{END_FOR}}",
    data: { a: [1, 2] },
    out: "[${{x}}1][${{x}}2]",
  },
  {
    name: "in an untaken IF branch it does not appear",
    template: "{{IF f}}{{RAW}}{{IF}}{{END_RAW}}{{END_IF}}z",
    data: { f: false },
    out: "z",
  },
  {
    name: "in a taken IF branch it appears",
    template: "{{IF f}}{{RAW}}{{IF}}{{END_RAW}}{{END_IF}}z",
    data: { f: true },
    out: "{{IF}}z",
  },
  {
    name: "leading and trailing spaces are kept and CRLF becomes LF",
    template: "{{RAW}}  a\r\n b  {{END_RAW}}",
    data: {},
    out: "  a\n b  ",
  },
  {
    name: "blank lines and spaces are kept inside an IF",
    template: "{{IF t}}{{RAW}}\n\n  a\n\n\n  b  \n{{END_RAW}}{{END_IF}}|",
    data: { t: true },
    out: "\n\n  a\n\n\n  b  \n|",
  },
  {
    name: "spaces inside the braces of RAW and END_RAW are allowed",
    template: "{{ RAW }}${{name}}{{ END_RAW }}",
    data: {},
    out: "${{name}}",
  },
  {
    name: "a tab inside the closing braces is allowed",
    template: "{{RAW}}${{a}}{{\tEND_RAW }} ${{b}}",
    data: { b: "B" },
    out: "${{a}} B",
  },
  {
    name: "closing tags and unknown tags inside RAW are content",
    template: "{{RAW}}{{END_IF}}{{BOGUS}}{{END_FOR}}{{END_RAW}}",
    data: {},
    out: "{{END_IF}}{{BOGUS}}{{END_FOR}}",
  },
  {
    name: "a backslash before braces inside RAW is content, not an escape",
    template: "{{RAW}}\\{{x}}{{END_RAW}}",
    data: {},
    out: "\\{{x}}",
  },
  {
    name: "two RAW blocks in one template",
    template: "{{RAW}}${{a}}{{END_RAW}}-{{RAW}}${{b}}{{END_RAW}}",
    data: { a: 1, b: 2 },
    out: "${{a}}-${{b}}",
  },
  {
    name: "a template without RAW renders unchanged",
    template: "a ${{n}} b \\{{",
    data: { n: "X" },
    out: "a X b {{",
  },
];

describe("rw-raw: RAW blocks output their content literally", () => {
  it.each(RAW)("rw-raw: $name (render)", ({ template, data, out }) => {
    const r = renderOff(template, data);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(RAW)("rw-raw: $name (resolveTemplate)", ({ template, data, out }) => {
    expect(resolve(template, data)).toBe(out);
  });

  it("rw-raw: with standalone lines on, RAW and END_RAW lines vanish and the content lines stay", () => {
    const r = render("x\n{{RAW}}\n{{ y }}\n{{END_RAW}}\nz", {});
    expect(r.output).toBe("x\n{{ y }}\nz");
    expect(r.ok).toBe(true);
  });

  it("rw-raw: with standalone lines off, the RAW tag lines keep their line breaks", () => {
    // paired with the on-side check so the test is red until the option exists
    expect(render("x\n{{RAW}}\n{{ y }}\n{{END_RAW}}\nz", {}).output).toBe("x\n{{ y }}\nz");
    expect(renderOff("x\n{{RAW}}\n{{ y }}\n{{END_RAW}}\nz", {}).output).toBe(
      "x\n\n{{ y }}\n\nz"
    );
  });
});

type Unclosed = { name: string; template: string; line: number; column: number };

const UNCLOSED: Unclosed[] = [
  { name: "after one character of text", template: "a{{RAW}}b", line: 1, column: 2 },
  { name: "at the start of the template", template: "{{RAW}}x", line: 1, column: 1 },
  {
    name: "after a closed multi-line RAW block",
    template: "{{RAW}}\nx\r\ny\n{{END_RAW}}\n{{RAW}}z",
    line: 5,
    column: 1,
  },
  { name: "inside a FOR body", template: "{{FOR a AS x}}{{RAW}}", line: 1, column: 15 },
];

describe("rw-raw: an unclosed RAW is a located syntax error", () => {
  it.each(UNCLOSED)("rw-raw: unclosed RAW $name (render)", ({ template, line, column }) => {
    const r = renderOff(template, { a: [1] });
    expect(r.diagnostics[0]).toMatchObject({ code: "syntax-error", line, column });
    expect(r.diagnostics[0].message).toMatch(/Unclosed RAW/);
    expect(r.ok).toBe(false);
  });

  it.each(UNCLOSED)(
    "rw-raw: unclosed RAW $name (resolveTemplate throws a located error)",
    ({ template, line, column }) => {
      let caught: any;
      try {
        resolveTemplate(template, new Map([["a", [1]]]) as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      expect(caught.message).toMatch(/Unclosed RAW/);
      expect(caught).toMatchObject({ code: "syntax-error", line, column });
    }
  );

  it("rw-raw: a tag after a RAW block reports its own position", () => {
    const r = renderOff("{{RAW}}\n\n{{END_RAW}}{{BOGUS}}", {});
    expect(r.diagnostics[0]).toMatchObject({ code: "syntax-error", line: 3, column: 12 });
    expect(r.diagnostics[0].message).toMatch(/Unknown/);
    expect(r.ok).toBe(false);
  });

  it("rw-raw: validate reports an unclosed RAW as an error", () => {
    const v = validate("a{{RAW}}b");
    expect(v.diagnostics[0]?.message).toMatch(/Unclosed RAW/);
    expect(v.diagnostics[0]).toMatchObject({ code: "syntax-error", line: 1, column: 2 });
    expect(v.ok).toBe(false);
  });
});

describe("rw-raw: analyze ignores everything inside a RAW block", () => {
  const names = (t: string) => {
    try {
      return analyze(t).variables.map((v) => v.name);
    } catch (e) {
      return [`THROWN: ${(e as Error).message}`];
    }
  };

  it.each([
    ["names inside a RAW block are not variables", "{{RAW}}${{name}} {{IF zz}}{{END_RAW}}", []],
    ["only the variable outside the block is found", "{{RAW}}${{a}}{{END_RAW}} ${{b}}", ["b"]],
    ["a RAW block with spaces inside the braces", "{{ RAW }}${{name}}{{ END_RAW }}", []],
    ["a RAW block closed with a tab inside the braces", "{{RAW}}${{a}}{{\tEND_RAW }} ${{b}}", ["b"]],
  ])("rw-raw: %s", (_n, template, expected) => {
    expect(names(template as string)).toEqual(expected);
  });

  it("rw-raw: validate accepts a closed RAW block holding tag-like text", () => {
    const v = validate("{{RAW}}{{IF}}{{BOGUS}}${{x{{END_RAW}}");
    expect(v.diagnostics).toEqual([]);
    expect(v.ok).toBe(true);
  });
});

type Escape = { name: string; template: string; data: Data; out: string };

// JS strings: "\\{{" is a backslash followed by the opening brace pair.
const ESCAPE: Escape[] = [
  {
    name: "a backslash before the pair outputs the pair and consumes the backslash",
    template: "a\\{{b}}",
    data: {},
    out: "a{{b}}",
  },
  {
    name: "an escaped pair at the end of the template",
    template: "a\\{{",
    data: {},
    out: "a{{",
  },
  {
    name: "an escaped tag name stays literal text",
    template: "\\{{IF x}}hi\\{{END_IF}}",
    data: { x: true },
    out: "{{IF x}}hi{{END_IF}}",
  },
  {
    name: "an escaped comment opener stays literal text",
    template: "\\{{# c #}}",
    data: {},
    out: "{{# c #}}",
  },
  {
    name: "an escaped RAW opener does not start a RAW block",
    template: "\\{{RAW}}",
    data: {},
    out: "{{RAW}}",
  },
  {
    name: "an escaped pair inside a FOR body, then a variable",
    template: "{{FOR xs AS x}}\\{{${{x}}}}{{END_FOR}}",
    data: { xs: ["a", "b"] },
    out: "{{a}}{{b}}",
  },
  {
    name: "an escaped pair in an untaken IF branch outputs nothing",
    template: "{{IF f}}\\{{x}}{{END_IF}}z",
    data: { f: false },
    out: "z",
  },
  {
    name: "a backslash before a dollar sign is text and the variable stays active",
    template: "\\${{x}} \\{{",
    data: { x: "V" },
    out: "\\V {{",
  },
  {
    name: "a backslash before ordinary characters is text",
    template: "C:\\dir\\new a\\b \\{{",
    data: {},
    out: "C:\\dir\\new a\\b {{",
  },
  {
    name: "a backslash before a single brace is text",
    template: "\\{x} and \\{ \\{{",
    data: {},
    out: "\\{x} and \\{ {{",
  },
  {
    name: "a trailing backslash is text",
    template: "\\{{ a\\",
    data: {},
    out: "{{ a\\",
  },
  {
    name: "a backslash then a space then the pair is text and an active tag",
    template: "\\{{ \\ {{IF x}}y{{END_IF}}",
    data: { x: true },
    out: "{{ \\ y",
  },
  {
    name: "two backslashes before the pair give a literal backslash and an active tag",
    template: "\\\\{{IF x}}y{{END_IF}}",
    data: { x: true },
    out: "\\y",
  },
  {
    name: "two backslashes before an active variable",
    template: "\\\\${{x}}|\\\\{{IF x}}y{{END_IF}}",
    data: { x: "V" },
    out: "\\\\V|\\y",
  },
];

describe("rw-escape: a backslash directly before the brace pair escapes it", () => {
  it.each(ESCAPE)("rw-escape: $name (render)", ({ template, data, out }) => {
    const r = renderOff(template, data);
    expect(r.output).toBe(out);
    expect(r.ok).toBe(true);
  });

  it.each(ESCAPE)("rw-escape: $name (resolveTemplate)", ({ template, data, out }) => {
    expect(resolve(template, data)).toBe(out);
  });

  it("rw-escape: with standalone lines on, an escaped tag line is text and stays", () => {
    const r = render("\\{{IF x}}\nhi\n", { x: true });
    expect(r.output).toBe("{{IF x}}\nhi\n");
    expect(r.ok).toBe(true);
  });

  it("rw-escape: with standalone lines on, an escaped pair does not hide a real tag line", () => {
    const r = render("\\{{a}}\n{{IF x}}\nhi\n{{END_IF}}\n", { x: true });
    expect(r.output).toBe("{{a}}\nhi\n");
    expect(r.ok).toBe(true);
  });

  it("rw-escape: analyze finds no variables and no error in escaped text", () => {
    let a: ReturnType<typeof analyze> | undefined;
    let thrown = "";
    try {
      a = analyze("\\{{IF zz}}x \\${{y}}");
    } catch (e) {
      thrown = (e as Error).message;
    }
    expect(thrown).toBe("");
    expect(a?.variables.map((v) => v.name)).toEqual(["y"]);
    expect(a?.diagnostics).toEqual([]);
  });

  it("rw-escape: validate accepts escaped tag names that would otherwise be unclosed or unknown", () => {
    const v = validate("\\{{IF x}} \\{{BOGUS}}");
    expect(v.diagnostics).toEqual([]);
    expect(v.ok).toBe(true);
  });
});

describe("rw-spec: spec lists RAW and the standaloneLines option", () => {
  it("rw-spec: the spec mentions RAW and its closer", () => {
    const text = JSON.stringify(spec());
    expect(text).toContain("RAW");
    expect(text).toContain("END_RAW");
  });

  it("rw-spec: the spec mentions the standaloneLines option", () => {
    expect(JSON.stringify(spec())).toContain("standaloneLines");
  });
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/lexer.ts b/core/src/lexer.ts
index f8d1349..71fce3d 100644
--- a/core/src/lexer.ts
+++ b/core/src/lexer.ts
@@ -1,5 +1,8 @@
-import { Token, TokenType } from "./types";
+import { Token, TokenType, WhitespaceOptions } from "./types";
 import { SyntaxError } from "./errors";
+import { applyWhitespace } from "./whitespace";
+
+const RAW_CLOSER = /\{\{-?[ \t]*END_RAW[ \t]*-?\}\}/y;
 
 /**
  * Lexer: Converts template string into array of tokens with position tracking
@@ -13,6 +16,8 @@ import { SyntaxError } from "./errors";
  * - Lists: {{LIST}}, {{LIST_ITEM}}, {{END_LIST}}
  * - Ternary: {{condition ? "true" : "false"}}
  * - Comments: {{# comment #}}
+ * - Literal blocks: {{RAW}}...{{END_RAW}}; \{{ is a literal brace pair
+ * - Trim markers: {{- TAG}} and {{TAG -}}
  */
 export class Lexer {
   private pos = 0;
@@ -20,7 +25,10 @@ export class Lexer {
   private column = 1;
   private tokens: Token[] = [];
 
-  constructor(private template: string) {}
+  constructor(
+    private template: string,
+    private options: WhitespaceOptions = {}
+  ) {}
 
   /**
    * Validate that all blocks are properly closed
@@ -170,7 +178,9 @@ export class Lexer {
     // Validate blocks are properly closed
     this.validateBlocks();
 
-    return this.tokens;
+    return applyWhitespace(this.tokens, this.options).filter(
+      (t) => t.type !== TokenType.RAW && t.type !== TokenType.END_RAW
+    );
   }
   /**
    * Scan variable substitution: ${{name}}, ${{user.name | filter}}
@@ -218,16 +228,21 @@ export class Lexer {
     // Consume {{
     this.advance(2);
 
+    const trimBefore = this.peek() === "-";
+    if (trimBefore) this.advance();
+
     // Skip whitespace
     this.skipWhitespace();
 
     // Check for comment: {{# ... #}}
     if (this.peek() === "#") {
-      this.scanComment(startLine, startColumn);
+      this.scanComment(startLine, startColumn, trimBefore);
       return;
     }
 
-    const content = this.scanUntilClosing();
+    let content = this.scanUntilClosing();
+    const trimAfter = content.endsWith("-");
+    if (trimAfter) content = content.slice(0, -1);
     const trimmed = content.trim();
 
     // Parse keyword
@@ -245,7 +260,7 @@ export class Lexer {
 
     if (
       trimmed !== keyword &&
-      (keyword === "ELSE" || keyword.startsWith("END_"))
+      (keyword === "ELSE" || keyword === "RAW" || keyword.startsWith("END_"))
     ) {
       const isElseIf =
         keyword === "ELSE" && /^IF(\s|$)/i.test(trimmed.slice(4).trim());
@@ -261,31 +276,109 @@ export class Lexer {
       );
     }
 
+    if (tokenType === TokenType.END_RAW) {
+      throw new SyntaxError(
+        "Unexpected {{END_RAW}} without matching {{RAW}}",
+        startLine,
+        startColumn,
+        "Check template structure"
+      );
+    }
+
     this.tokens.push({
       type: tokenType,
       value: trimmed,
       line: startLine,
       column: startColumn,
+      trimBefore,
+      trimAfter,
+    });
+
+    if (tokenType === TokenType.RAW) this.scanRaw(startLine, startColumn);
+  }
+
+  /**
+   * Scan the literal content of a RAW block and its {{END_RAW}} closer
+   */
+  private scanRaw(startLine: number, startColumn: number): void {
+    const contentLine = this.line;
+    const contentColumn = this.column;
+    let content = "";
+
+    while (this.pos < this.template.length) {
+      RAW_CLOSER.lastIndex = this.pos;
+      if (RAW_CLOSER.test(this.template)) {
+        if (content.length > 0) {
+          this.tokens.push({
+            type: TokenType.TEXT,
+            value: content.replace(/\r\n/g, "\n"),
+            line: contentLine,
+            column: contentColumn,
+          });
+        }
+        this.scanRawCloser();
+        return;
+      }
+      content += this.current();
+      this.advance();
+    }
+
+    throw new SyntaxError(
+      `Unclosed RAW block starting at line ${startLine}`,
+      startLine,
+      startColumn,
+      "Add {{END_RAW}}"
+    );
+  }
+
+  /**
+   * Scan {{END_RAW}}, with its optional trim markers
+   */
+  private scanRawCloser(): void {
+    const line = this.line;
+    const column = this.column;
+    this.advance(2);
+    const trimBefore = this.peek() === "-";
+    const content = this.scanUntilClosing();
+    this.tokens.push({
+      type: TokenType.END_RAW,
+      value: "END_RAW",
+      line,
+      column,
+      trimBefore,
+      trimAfter: content.endsWith("-"),
     });
   }
 
   /**
    * Scan comment: {{# comment text #}}
    */
-  private scanComment(startLine: number, startColumn: number): void {
+  private scanComment(
+    startLine: number,
+    startColumn: number,
+    trimBefore: boolean
+  ): void {
     // Consume #
     this.advance();
 
     let content = "";
     while (this.pos < this.template.length) {
-      if (this.peek() === "#" && this.peek(1) === "}" && this.peek(2) === "}") {
-        // Found closing #}}
-        this.advance(3);
+      const trimAfter = this.peek(1) === "-";
+      const closer = trimAfter ? 1 : 0;
+      if (
+        this.peek() === "#" &&
+        this.peek(1 + closer) === "}" &&
+        this.peek(2 + closer) === "}"
+      ) {
+        // Found closing #}} or #-}}
+        this.advance(3 + closer);
         this.tokens.push({
           type: TokenType.COMMENT,
           value: content,
           line: startLine,
           column: startColumn,
+          trimBefore,
+          trimAfter,
         });
         return;
       }
@@ -317,6 +410,23 @@ export class Lexer {
       if (this.peek() === "{" && this.peek(1) === "{") {
         break;
       }
+      if (this.peek() === "\\" && this.peek(1) === "{" && this.peek(2) === "{") {
+        // \{{ is a literal {{
+        content += "{{";
+        this.advance(3);
+        continue;
+      }
+      if (
+        this.peek() === "\\" &&
+        this.peek(1) === "\\" &&
+        this.peek(2) === "{" &&
+        this.peek(3) === "{"
+      ) {
+        // \\{{ is a literal backslash followed by an active tag
+        content += "\\";
+        this.advance(2);
+        break;
+      }
       content += this.current();
       this.advance();
     }
@@ -406,6 +516,8 @@ export class Lexer {
       ROW: TokenType.ROW,
       END_ROW: TokenType.END_ROW,
       END_TABLE: TokenType.END_TABLE,
+      RAW: TokenType.RAW,
+      END_RAW: TokenType.END_RAW,
     };
 
     return mapping[keyword] || null;
diff --git a/core/src/render.ts b/core/src/render.ts
index 210b5c1..5943021 100644
--- a/core/src/render.ts
+++ b/core/src/render.ts
@@ -1,4 +1,9 @@
-import { Limits, TemplateValue, withDefaultLimits } from "./types";
+import {
+  Limits,
+  TemplateValue,
+  WhitespaceOptions,
+  withDefaultLimits,
+} from "./types";
 import { DiagnosticCode, TemplateError } from "./errors";
 import { Lexer } from "./lexer";
 import { Parser } from "./parser";
@@ -6,7 +11,7 @@ import { Interpreter } from "./interpreter";
 import { analyze } from "./analyze";
 import { estimateTokens } from "./estimate";
 
-export interface RenderOptions {
+export interface RenderOptions extends WhitespaceOptions {
   strictMode?: boolean;
   limits?: Partial<Limits>;
   tokenEstimator?: (text: string) => number;
@@ -65,7 +70,9 @@ export function render(
 
   let output: string;
   try {
-    const tokens = new Lexer(template).tokenize();
+    const tokens = new Lexer(template, {
+      standaloneLines: options?.standaloneLines ?? true,
+    }).tokenize();
     const ast = new Parser(tokens, { maxDepth: limits.maxDepth }).parse();
     output = interpreter.interpret(ast);
   } catch (error) {
diff --git a/core/src/resolve.ts b/core/src/resolve.ts
index b9c8d58..5f949c0 100644
--- a/core/src/resolve.ts
+++ b/core/src/resolve.ts
@@ -1,4 +1,9 @@
-import { Limits, VariableMap, withDefaultLimits } from "./types";
+import {
+  Limits,
+  VariableMap,
+  WhitespaceOptions,
+  withDefaultLimits,
+} from "./types";
 import { Lexer } from "./lexer";
 import { Parser } from "./parser";
 import { Interpreter } from "./interpreter";
@@ -8,18 +13,23 @@ import { Interpreter } from "./interpreter";
  *
  * @param template - Template string with conditional markdown syntax
  * @param variables - Variable mappings (name → value)
- * @param options - Configuration options (strictMode, limits; omitted limits take DEFAULT_LIMITS)
+ * @param options - Configuration options (strictMode, limits, standaloneLines; omitted limits take DEFAULT_LIMITS, standaloneLines defaults to false)
  * @returns Resolved markdown string
  */
 export function resolveTemplate(
   template: string,
   variables: VariableMap,
-  options?: { strictMode?: boolean; limits?: Partial<Limits> }
+  options?: {
+    strictMode?: boolean;
+    limits?: Partial<Limits>;
+  } & WhitespaceOptions
 ): string {
   const limits = withDefaultLimits(options?.limits);
 
   // Tokenize
-  const lexer = new Lexer(template);
+  const lexer = new Lexer(template, {
+    standaloneLines: options?.standaloneLines ?? false,
+  });
   const tokens = lexer.tokenize();
 
   // Parse to AST
diff --git a/core/src/spec.ts b/core/src/spec.ts
index a43f0dd..c1d1dcc 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -7,7 +7,8 @@ export interface Spec {
   filters: { name: string; params: string; description: string }[];
   operators: string[];
   limits: Limits;
-  syntax: { variable: string; comment: string };
+  options: { name: string; default: string; description: string }[];
+  syntax: { variable: string; comment: string; trim: string; escape: string };
 }
 
 const LANGUAGE_VERSION = "1.0";
@@ -85,6 +86,22 @@ const BLOCKS: Spec["blocks"] = [
     args: "",
     description: "Inside TABLE: row cells separated by |",
   },
+  {
+    name: "RAW",
+    closes: "END_RAW",
+    args: "",
+    description:
+      "Outputs its content literally: tags, variables and comments inside are not interpreted",
+  },
+];
+
+const OPTIONS: Spec["options"] = [
+  {
+    name: "standaloneLines",
+    default: "true for render, false for resolveTemplate",
+    description:
+      "Removes a line holding only block tags and whitespace, with its line break; LIST, TABLE and their parts keep their own spacing",
+  },
 ];
 
 const OPERATORS = [
@@ -119,9 +136,12 @@ export function spec(): Spec {
     filters: FILTERS.map((f) => ({ ...f })),
     operators: [...OPERATORS],
     limits: { ...DEFAULT_LIMITS },
+    options: OPTIONS.map((o) => ({ ...o })),
     syntax: {
       variable: "${{path.to.value ?? \"default\" | filter=arg}}",
       comment: "{{# comment #}}",
+      trim: "{{- TAG}} trims whitespace before a tag and {{TAG -}} after it; comments take {{-# comment #-}}",
+      escape: "\\{{ outputs {{ literally",
     },
   };
 }
diff --git a/core/src/types.ts b/core/src/types.ts
index 2f4e8af..eedd651 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -52,6 +52,8 @@ export enum TokenType {
   ROW = "ROW",
   END_ROW = "END_ROW",
   END_TABLE = "END_TABLE",
+  RAW = "RAW",
+  END_RAW = "END_RAW",
   COMMENT = "COMMENT",
   EOF = "EOF",
 }
@@ -64,6 +66,18 @@ export interface Token {
   value: string;
   line: number;
   column: number;
+  /** A minus marker after the opening braces: trim all whitespace before the tag */
+  trimBefore?: boolean;
+  /** A minus marker before the closing braces: trim all whitespace after the tag */
+  trimAfter?: boolean;
+}
+
+/**
+ * Whitespace handling. With standaloneLines on, a line holding only block
+ * tags and whitespace is removed together with its line break.
+ */
+export interface WhitespaceOptions {
+  standaloneLines?: boolean;
 }
 
 /**
diff --git a/core/src/whitespace.ts b/core/src/whitespace.ts
new file mode 100644
index 0000000..a354464
--- /dev/null
+++ b/core/src/whitespace.ts
@@ -0,0 +1,120 @@
+import { Token, TokenType, WhitespaceOptions } from "./types";
+
+/** Tags whose own line vanishes under the standalone rule */
+const STANDALONE_TAGS = new Set<TokenType>([
+  TokenType.IF,
+  TokenType.ELSEIF,
+  TokenType.ELSE,
+  TokenType.END_IF,
+  TokenType.CASE,
+  TokenType.WHEN,
+  TokenType.END_WHEN,
+  TokenType.DEFAULT,
+  TokenType.END_DEFAULT,
+  TokenType.END_CASE,
+  TokenType.FOR,
+  TokenType.END_FOR,
+  TokenType.RAW,
+  TokenType.END_RAW,
+  TokenType.COMMENT,
+]);
+
+const isText = (token: Token | undefined) => token?.type === TokenType.TEXT;
+const isBlank = (token: Token) => isText(token) && /^[ \t]*$/.test(token.value);
+
+/**
+ * Apply trim markers, then (when standaloneLines is on) remove the lines that
+ * hold only block tags and whitespace. Text tokens left empty are dropped.
+ */
+export function applyWhitespace(tokens: Token[], options: WhitespaceOptions): Token[] {
+  const result = tokens.map((t) => ({ ...t }));
+  applyTrimMarkers(result);
+  if (options.standaloneLines) removeStandaloneLines(result);
+  return result.filter((t) => !(isText(t) && t.value === ""));
+}
+
+function applyTrimMarkers(tokens: Token[]): void {
+  tokens.forEach((token, i) => {
+    const before = tokens[i - 1];
+    const after = tokens[i + 1];
+    if (token.trimBefore && isText(before)) before.value = before.value.replace(/[ \t\n]+$/, "");
+    if (token.trimAfter && isText(after)) after.value = after.value.replace(/^[ \t\n]+/, "");
+  });
+}
+
+/**
+ * Find each run of standalone tags sharing one line (separated only by
+ * spaces and tabs), decide on the unchanged text whether that line holds
+ * nothing else, then cut the line's indentation, the whitespace between the
+ * tags and the line break after them.
+ */
+function removeStandaloneLines(tokens: Token[]): void {
+  const cuts = new Map<Token, { start: number; end: number }>();
+  const cut = (token: Token) => {
+    let c = cuts.get(token);
+    if (!c) {
+      c = { start: 0, end: token.value.length };
+      cuts.set(token, c);
+    }
+    return c;
+  };
+
+  let i = 0;
+  while (i < tokens.length) {
+    if (!STANDALONE_TAGS.has(tokens[i].type)) {
+      i++;
+      continue;
+    }
+    const first = i;
+    let last = i;
+    let j = i + 1;
+    while (j < tokens.length) {
+      if (STANDALONE_TAGS.has(tokens[j].type)) last = j;
+      else if (!isBlank(tokens[j])) break;
+      j++;
+    }
+
+    const lineStart = indentationStart(tokens, first);
+    const lineEnd = lineBreakEnd(tokens, last);
+    if (lineStart !== null && lineEnd !== null) {
+      if (first > 0) cut(tokens[first - 1]).end = lineStart;
+      for (let k = first + 1; k < last; k++) {
+        if (isText(tokens[k])) cut(tokens[k]).end = 0;
+      }
+      if (last + 1 < tokens.length) cut(tokens[last + 1]).start = lineEnd;
+    }
+    i = last + 1;
+  }
+
+  for (const [token, { start, end }] of cuts) {
+    token.value = token.value.slice(start, Math.max(start, end));
+  }
+}
+
+/**
+ * Where the indentation before the tag at index starts in the preceding
+ * text, or null when the line holds something else before the tag
+ */
+function indentationStart(tokens: Token[], index: number): number | null {
+  if (index === 0) return 0;
+  const before = tokens[index - 1];
+  if (!isText(before)) return null;
+  const match = /(^|\n)[ \t]*$/.exec(before.value);
+  if (!match) return null;
+  if (match[1] === "" && index - 1 > 0) return null;
+  return match.index + match[1].length;
+}
+
+/**
+ * Where the text after the tag at index continues past the line break, or
+ * null when the line holds something else after the tag
+ */
+function lineBreakEnd(tokens: Token[], index: number): number | null {
+  const after = tokens[index + 1];
+  if (!after || after.type === TokenType.EOF) return 0;
+  if (!isText(after)) return null;
+  const match = /^[ \t]*(\n|$)/.exec(after.value);
+  if (!match) return null;
+  if (match[1] === "" && tokens[index + 2]?.type !== TokenType.EOF) return null;
+  return match[0].length;
+}
```

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/promptaware/whitespace.test.ts tests/promptaware/raw.test.ts --json`
- Exit status: 0
- Tests: 211 passed, 0 failed
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
