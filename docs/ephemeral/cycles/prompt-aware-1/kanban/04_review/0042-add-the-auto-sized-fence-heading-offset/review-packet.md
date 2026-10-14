---
type: review-packet
card: 0042-add-the-auto-sized-fence-heading-offset
tier: product
built_at: 2026-10-14T02:53:01.576Z
base: b12a2ace597c163c1a55596d0592a3df63566b37
head: ff6d7ff18435a4f49a5140b5481a79794b32e92e
frozen: true
brief_sha256: c0514066958eb9ccaa2533d891e5356b4ed22c6e701f9cd7a50c1fdbc52cbcf3
manifest_sha256: 09e3c6c848d64cfde269f526318f19c6d4670ec28bbce4660cf24b78cd068cf6
criteria_sha256: 27823a9a6eca29b5e945629126122c2081f5160e011639132cff8f8c6ac0a5d6
scope_sha256: d97d7f6843e00da2c842e72e84c9750efef456ac37a5a665ad4a35269156be7f
diff_sha256: 898547edb49e911fde3ac00e8072d64aab707402a54c685e9e925c1cb964feef
omitted_paths: 6
criteria_count: 6
must_not_count: 3
---

# Review packet: 0042-add-the-auto-sized-fence-heading-offset

Manifest amended after the freeze at 2026-10-14T02:41:31.670Z by lead: heading offset and fence reuse the section card's token flow; the spec fixture test lists engine filters (edit +core/src/whitespace.ts, edit +tests/headless/spec.test.ts, scope +tests/headless)

Manifest amended after the freeze at 2026-10-14T02:51:52.789Z by lead: fix one miswritten expectation; the unknown-filter suggestion lists the shared filter list (edit +core/src/errors.ts, edit +tests/promptaware/fence.test.ts, scope +tests/promptaware)

Manifest amended after the freeze at 2026-10-14T02:52:56.434Z by lead: the spec fixture change was committed with the tests before the card started (edit -tests/headless/spec.test.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the FENCE block, the fence and heading_offset filters, and escape_md modes in filters, lexer, parser, interpreter, analyze and spec.

### Criteria

- c1 (verify: test): fe-autosize: FENCE outputs a fence of at least three backticks and longer than the longest backtick run in its body, then the optional lang, the body with one leading and one trailing line break removed, and the closing fence with a trailing line break
- c2 (verify: test): fe-lang: lang may be a quoted string or a variable path; an empty or missing lang writes a bare fence; the fence filter does the same for a value, with an optional lang parameter
- c3 (verify: test): fe-errors: an unclosed FENCE is a syntax-error at its tag, FENCE counts toward maxDepth and its tags follow the standalone-line rule
- c4 (verify: test): ho-offset: heading_offset=N shifts every ATX heading line by N levels, clamped to 1 through 6, leaves headings inside fenced code blocks and non-heading hash text alone, accepts negative N, and a missing or non-integer parameter is a type-error
- c5 (verify: test): em-modes: escape_md and escape_md=inline keep today's escaping, escape_md=block adds line-start escaping so a value cannot fake structure (leading hash, greater-than, dash, plus, star, pipe, digits followed by a dot or parenthesis, runs of three or more dashes, equals, backticks or tildes), and any other mode is a type-error
- c6 (verify: test): fe-spec: spec lists FENCE and END_FENCE and the fence, heading_offset and escape_md modes in filters, and analyze counts FENCE in blocks and accepts the new filters

### Must not

- m1: change any existing test expectation
- m2: change what plain escape_md outputs
- m3: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the FENCE block, the fence and heading_offset filters, and escape_md modes in filters, lexer, parser, interpreter, analyze and spec.
Must not:
- change any existing test expectation
- change what plain escape_md outputs
- add a runtime dependency

## Questions

goal-critical: can any body make the fence close early?
goal-critical: do the escape modes and offsets leave existing templates unchanged?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
```

### spec.md as of base b12a2ac

```
# Spec

## Acceptance criteria

- fe-autosize: FENCE outputs a fence of at least three backticks and longer than the longest backtick run in its body, then the optional lang, the body with one leading and one trailing line break removed, and the closing fence with a trailing line break
- fe-lang: lang may be a quoted string or a variable path; an empty or missing lang writes a bare fence; the fence filter does the same for a value, with an optional lang parameter
- fe-errors: an unclosed FENCE is a syntax-error at its tag, FENCE counts toward maxDepth and its tags follow the standalone-line rule
- ho-offset: heading_offset=N shifts every ATX heading line by N levels, clamped to 1 through 6, leaves headings inside fenced code blocks and non-heading hash text alone, accepts negative N, and a missing or non-integer parameter is a type-error
- em-modes: escape_md and escape_md=inline keep today's escaping, escape_md=block adds line-start escaping so a value cannot fake structure (leading hash, greater-than, dash, plus, star, pipe, digits followed by a dot or parenthesis, runs of three or more dashes, equals, backticks or tildes), and any other mode is a type-error
- fe-spec: spec lists FENCE and END_FENCE and the fence, heading_offset and escape_md modes in filters, and analyze counts FENCE in blocks and accepts the new filters
```

### card.md as of base b12a2ac

```
# Add the auto-sized FENCE, heading offset and escape modes

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

FENCE and the fence filter wrap content in a code fence longer than any backtick run inside it; heading_offset shifts markdown headings; escape_md gains inline and block modes.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `fe-autosize` FENCE outputs a fence of at least three backticks and longer than the longest backtick run in its body, then the optional lang, the body with one leading and one trailing line break removed, and the closing fence with a trailing line break
- `contract` `fe-lang` lang may be a quoted string or a variable path; an empty or missing lang writes a bare fence; the fence filter does the same for a value, with an optional lang parameter
- `contract` `fe-errors` an unclosed FENCE is a syntax-error at its tag, FENCE counts toward maxDepth and its tags follow the standalone-line rule
- `contract` `ho-offset` heading_offset=N shifts every ATX heading line by N levels, clamped to 1 through 6, leaves headings inside fenced code blocks and non-heading hash text alone, accepts negative N, and a missing or non-integer parameter is a type-error
- `contract` `em-modes` escape_md and escape_md=inline keep today's escaping, escape_md=block adds line-start escaping so a value cannot fake structure (leading hash, greater-than, dash, plus, star, pipe, digits followed by a dot or parenthesis, runs of three or more dashes, equals, backticks or tildes), and any other mode is a type-error
- `contract` `fe-spec` spec lists FENCE and END_FENCE and the fence, heading_offset and escape_md modes in filters, and analyze counts FENCE in blocks and accepts the new filters


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- change what plain escape_md outputs
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the surfaces card documents it.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

FENCE block; filters fence, heading_offset and escape_md modes (see the prompt-aware contract).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | edit | none |
| `core/src/filters.ts` | edit | none |
| `core/src/interpreter.ts` | edit | none |
| `core/src/lexer.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
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
- edit: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/filters.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `tests/promptaware/fence.test.ts`
- files_scope: `core/src/`, `tests/headless`, `tests/promptaware`

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

These test files were committed before the work began, at base b12a2ac. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/promptaware/fence.test.ts (frozen)

``````
import { render, spec, analyze, validate } from "../../core/src";

// The whitespace card (standalone-line removal) is not in this branch. Every
// expected output below assumes {standaloneLines:false}: tag lines are NOT
// removed, so the text around a tag stays exactly as written. Only the cases
// marked "standalone on" assume the contract default (tag-only lines vanish
// with their line break). `as any` because the option does not exist on
// RenderOptions in this branch.
const OFF = { standaloneLines: false } as any;
const ON = { standaloneLines: true } as any;
const T = "`";
const run = (n: number) => T.repeat(n);

function r(template: string, data: Record<string, unknown> = {}, options: any = OFF) {
  return render(template, data, options);
}

interface Case {
  name: string;
  template: string;
  data?: Record<string, unknown>;
  expected: string;
  options?: any;
}

function runCases(id: string, cases: Case[]) {
  it.each(cases)(`${id}: $name`, (c) => {
    const res = r(c.template, c.data ?? {}, c.options ?? OFF);
    expect(res.output).toBe(c.expected);
    expect(res.ok).toBe(true);
    expect(res.diagnostics).toEqual([]);
  });
}

// analyze throws on a template that does not parse today; turn the throw into undefined so the
// failure is an assertion on the result.
function tryAnalyze(t: string) {
  try {
    return analyze(t);
  } catch {
    return undefined;
  }
}

const FB ="{{FENCE}}${{b}}{{END_FENCE}}";

describe("fe-autosize: FENCE sizes its fence from the longest backtick run in its body", () => {
  runCases("fe-autosize", [
    { name: "no backticks gets three", template: FB, data: { b: "hello" }, expected: "```\nhello\n```\n" },
    { name: "a run of 1 gets three", template: FB, data: { b: "a`b" }, expected: "```\na`b\n```\n" },
    { name: "a run of 2 gets three", template: FB, data: { b: "a``b" }, expected: "```\na``b\n```\n" },
    {
      name: "a run of 3 gets four",
      template: FB,
      data: { b: "a```b" },
      expected: `${run(4)}\na${run(3)}b\n${run(4)}\n`,
    },
    {
      name: "a run of 4 gets five",
      template: FB,
      data: { b: `x ${run(4)}y` },
      expected: `${run(5)}\nx ${run(4)}y\n${run(5)}\n`,
    },
    {
      name: "a run of 7 gets eight",
      template: FB,
      data: { b: `a${run(7)}b` },
      expected: `${run(8)}\na${run(7)}b\n${run(8)}\n`,
    },
    {
      name: "the longest of several runs wins (1, 2 and 3 gives four)",
      template: FB,
      data: { b: "`a``b```c" },
      expected: `${run(4)}\n\`a\`\`b\`\`\`c\n${run(4)}\n`,
    },
    {
      name: "the longest run wins even when it comes first",
      template: FB,
      data: { b: `${run(5)} then ${run(2)}` },
      expected: `${run(6)}\n${run(5)} then ${run(2)}\n${run(6)}\n`,
    },
    {
      name: "a body that is only a run of 3 gets four",
      template: FB,
      data: { b: "```" },
      expected: `${run(4)}\n${run(3)}\n${run(4)}\n`,
    },
    {
      name: "tildes do not count, the fence stays backticks",
      template: FB,
      data: { b: "~~~\nx\n~~~" },
      expected: "```\n~~~\nx\n~~~\n```\n",
    },
    { name: "multi-line body", template: FB, data: { b: "a\nb\nc" }, expected: "```\na\nb\nc\n```\n" },
    { name: "leading and trailing spaces are kept", template: FB, data: { b: " x " }, expected: "```\n x \n```\n" },
    { name: "one leading line break is removed", template: FB, data: { b: "\nhello" }, expected: "```\nhello\n```\n" },
    { name: "one trailing line break is removed", template: FB, data: { b: "hello\n" }, expected: "```\nhello\n```\n" },
    {
      name: "one leading and one trailing line break are removed",
      template: FB,
      data: { b: "\nhello\n" },
      expected: "```\nhello\n```\n",
    },
    {
      name: "only ONE line break is removed at each end (two leave a blank line at each end)",
      template: FB,
      data: { b: "\n\nhello\n\n" },
      expected: "```\n\nhello\n\n```\n",
    },
    // Contract: fence, lang, line break, body, line break, fence, line break. Empty body: two line breaks.
    { name: "empty body", template: FB, data: { b: "" }, expected: "```\n\n```\n" },
    {
      name: "template body text between the tags is the body",
      template: "{{FENCE}}\nplain text\n{{END_FENCE}}",
      expected: "```\nplain text\n```\n",
    },
    {
      name: "backticks written literally in the template body are counted",
      template: "{{FENCE}}a````b{{END_FENCE}}",
      expected: `${run(5)}\na${run(4)}b\n${run(5)}\n`,
    },
    {
      name: "the body is rendered first, the fence is sized from the rendered text",
      template: "{{FENCE}}{{IF t}}${{b}}{{ELSE}}none{{END_IF}}{{END_FENCE}}",
      data: { t: true, b: "x```y" },
      expected: `${run(4)}\nx${run(3)}y\n${run(4)}\n`,
    },
    {
      name: "text before and after the block is untouched",
      template: "before\n{{FENCE}}x{{END_FENCE}}after",
      expected: "before\n```\nx\n```\nafter",
    },
    {
      name: "FENCE inside FOR sizes each iteration on its own",
      template: '{{FOR xs AS it}}{{FENCE lang="x"}}${{it}}{{END_FENCE}}{{END_FOR}}',
      data: { xs: ["a", "b```c", "d"] },
      expected: "```x\na\n```\n" + `${run(4)}x\nb${run(3)}c\n${run(4)}\n` + "```x\nd\n```\n",
    },
    {
      name: "FENCE inside IF",
      template: "{{IF t}}{{FENCE}}x{{END_FENCE}}{{END_IF}}",
      data: { t: true },
      expected: "```\nx\n```\n",
    },
    {
      name: "FENCE in a false IF renders nothing",
      template: "{{IF t}}{{FENCE}}x{{END_FENCE}}{{END_IF}}",
      data: { t: false },
      expected: "",
    },
    {
      name: "nested FENCE: the outer fence is longer than the inner one it contains",
      template: '{{FENCE lang="md"}}\n{{FENCE lang="js"}}x{{END_FENCE}}\n{{END_FENCE}}',
      // inner renders "```js\nx\n```\n"; outer body "\n```js\nx\n```\n\n" loses one break at each end
      expected: "````md\n```js\nx\n```\n\n````\n",
    },
    {
      name: "three levels of nesting grow by one each",
      template: "{{FENCE}}{{FENCE}}{{FENCE}}x{{END_FENCE}}{{END_FENCE}}{{END_FENCE}}",
      // L3 = "```\nx\n```\n". L2 body = L3 minus its last break = "```\nx\n```", longest run 3,
      //   so L2 = "````\n```\nx\n```\n````\n". L1 body = L2 minus last break, longest run 4,
      //   so L1 = "`````\n````\n```\nx\n```\n````\n`````\n".
      expected: "`````\n````\n```\nx\n```\n````\n`````\n",
    },
  ]);
});

describe("fe-autosize: standalone rule applies to FENCE tag lines", () => {
  runCases("fe-autosize", [
    {
      name: "standalone on: tag lines are removed, the output is the tight form",
      template: 'before\n{{FENCE lang="md"}}\nhello\n{{END_FENCE}}\nafter',
      options: ON,
      expected: "before\n```md\nhello\n```\nafter",
    },
    {
      name: "standalone off: the break after END_FENCE stays, giving a blank line",
      template: "before\n{{FENCE}}\nhello\n{{END_FENCE}}\nafter",
      options: OFF,
      expected: "before\n```\nhello\n```\n\nafter",
    },
    {
      name: "standalone on: indented tag lines inside FOR vanish too",
      template: "{{FOR xs AS i}}\n  {{FENCE}}\n${{i}}\n  {{END_FENCE}}\n{{END_FOR}}",
      data: { xs: ["a", "b"] },
      options: ON,
      expected: "```\na\n```\n```\nb\n```\n",
    },
    {
      name: "standalone on: a FENCE tag sharing its line with text is not removed",
      template: "a {{FENCE}}x{{END_FENCE}} b\n",
      options: ON,
      expected: "a ```\nx\n``` b\n",
    },
  ]);
});

describe("fe-lang: lang is a quoted string or a variable path; the fence filter takes an optional lang", () => {
  runCases("fe-lang", [
    {
      name: "quoted literal lang",
      template: '{{FENCE lang="markdown"}}x{{END_FENCE}}',
      expected: "```markdown\nx\n```\n",
    },
    {
      name: "variable path lang",
      template: "{{FENCE lang=meta.lang}}x{{END_FENCE}}",
      data: { meta: { lang: "python" } },
      expected: "```python\nx\n```\n",
    },
    {
      name: "empty literal lang writes a bare fence",
      template: '{{FENCE lang=""}}x{{END_FENCE}}',
      expected: "```\nx\n```\n",
    },
    {
      name: "missing lang attribute writes a bare fence",
      template: "{{FENCE}}x{{END_FENCE}}",
      expected: "```\nx\n```\n",
    },
    {
      name: "lang variable that is missing writes a bare fence",
      template: "{{FENCE lang=nope}}x{{END_FENCE}}",
      expected: "```\nx\n```\n",
    },
    {
      name: "lang variable that is an empty string writes a bare fence",
      template: "{{FENCE lang=l}}x{{END_FENCE}}",
      data: { l: "" },
      expected: "```\nx\n```\n",
    },
    {
      name: "lang is written after a longer fence too",
      template: '{{FENCE lang="js"}}${{b}}{{END_FENCE}}',
      data: { b: "```" },
      expected: `${run(4)}js\n${run(3)}\n${run(4)}\n`,
    },
    {
      name: "filter form with a lang parameter",
      template: "${{ b | fence=md }}",
      data: { b: "x" },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form without lang writes a bare fence",
      template: "${{ b | fence }}",
      data: { b: "x" },
      expected: "```\nx\n```\n",
    },
    {
      name: "filter form with a quoted lang parameter",
      template: '${{ b | fence="md" }}',
      data: { b: "x" },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form sizes the fence like the block",
      template: "${{ b | fence=md }}",
      data: { b: `${run(3)}\ncode\n${run(3)}` },
      expected: `${run(4)}md\n${run(3)}\ncode\n${run(3)}\n${run(4)}\n`,
    },
    {
      name: "filter form removes one leading and one trailing line break",
      template: "${{ b | fence=md }}",
      data: { b: "\nx\n" },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form on an empty value",
      template: "${{ b | fence=md }}",
      data: { b: "" },
      expected: "```md\n\n```\n",
    },
    {
      name: "filter form after another filter",
      template: "${{ b | trim | fence=md }}",
      data: { b: "  x  " },
      expected: "```md\nx\n```\n",
    },
    {
      name: "filter form inside text and FOR",
      template: "a\n{{FOR xs AS i}}${{ i | fence=txt }}{{END_FOR}}z",
      data: { xs: ["p", "q"] },
      expected: "a\n```txt\np\n```\n```txt\nq\n```\nz",
    },
  ]);
});

describe("fe-errors: unclosed FENCE, depth and standalone", () => {
  interface ErrCase {
    name: string;
    template: string;
    data?: Record<string, unknown>;
    options?: any;
    code: string;
    line: number;
    column: number;
  }
  const cases: ErrCase[] = [
    { name: "unclosed FENCE at the start is located at its tag", template: "{{FENCE}}x", code: "syntax-error", line: 1, column: 1 },
    {
      name: "unclosed FENCE later in the template is located at its tag, not 1:1",
      template: 'ab\n  {{FENCE lang="x"}}\nzzz',
      code: "syntax-error",
      line: 2,
      column: 3,
    },
    {
      name: "outer FENCE unclosed around a closed inner one is located at the outer tag",
      template: "{{FENCE}}\n  {{FENCE}}x{{END_FENCE}}",
      code: "syntax-error",
      line: 1,
      column: 1,
    },
    {
      name: "a second FENCE left unclosed after a closed one is located at the second tag",
      template: "{{FENCE}}x{{END_FENCE}}\n  {{FENCE}}y",
      code: "syntax-error",
      line: 2,
      column: 3,
    },
    {
      name: "FENCE nested beyond maxDepth is limit-depth at the block that is too deep",
      template: "{{FENCE}}\n{{FENCE}}\n{{FENCE}}x{{END_FENCE}}\n{{END_FENCE}}\n{{END_FENCE}}",
      options: { standaloneLines: false, limits: { maxDepth: 2 } },
      code: "limit-depth",
      line: 3,
      column: 1,
    },
    {
      name: "FENCE inside IF counts toward maxDepth 1",
      template: "{{IF t}}{{FENCE}}x{{END_FENCE}}{{END_IF}}",
      data: { t: true },
      options: { standaloneLines: false, limits: { maxDepth: 1 } },
      code: "limit-depth",
      line: 1,
      column: 9,
    },
    {
      name: "IF inside FENCE counts toward maxDepth 1",
      template: "{{FENCE}}{{IF t}}x{{END_IF}}{{END_FENCE}}",
      data: { t: true },
      options: { standaloneLines: false, limits: { maxDepth: 1 } },
      code: "limit-depth",
      line: 1,
      column: 10,
    },
  ];
  it.each(cases)("fe-errors: $name", (c) => {
    // the closed form of a FENCE is valid (so the error below is about FENCE, not an unknown tag)
    expect(r("{{FENCE}}x{{END_FENCE}}").ok).toBe(true);
    const res = r(c.template, c.data ?? {}, c.options ?? OFF);
    expect(res.diagnostics[0]).toMatchObject({ code: c.code, line: c.line, column: c.column });
    expect(res.ok).toBe(false);
    expect(res.output).toBe("");
  });

  it("fe-errors: a single FENCE is within maxDepth 1 and two siblings are fine", () => {
    const res = r("{{FENCE}}a{{END_FENCE}}{{FENCE}}b{{END_FENCE}}", {}, { standaloneLines: false, limits: { maxDepth: 1 } });
    expect(res.output).toBe("```\na\n```\n```\nb\n```\n");
    expect(res.ok).toBe(true);
  });

  it("fe-errors: two nested FENCEs are within maxDepth 2", () => {
    const res = r("{{FENCE}}{{FENCE}}a{{END_FENCE}}{{END_FENCE}}", {}, { standaloneLines: false, limits: { maxDepth: 2 } });
    expect(res.output).toBe("````\n```\na\n```\n````\n");
    expect(res.ok).toBe(true);
  });

  it("fe-errors: validate reports an unclosed FENCE as a located syntax-error", () => {
    expect(validate("x\n  {{FENCE}}y{{END_FENCE}}").ok).toBe(true);
    const v = validate("x\n  {{FENCE}}y");
    expect(v.diagnostics[0]).toMatchObject({ code: "syntax-error", line: 2, column: 3 });
    expect(v.ok).toBe(false);
  });

  it("fe-errors: standalone on: tag-only lines for FENCE tags are removed with their line break", () => {
    const res = r("{{FENCE}}\nx\n{{END_FENCE}}\n", {}, ON);
    expect(res.output).toBe("```\nx\n```\n");
    expect(res.ok).toBe(true);
  });
});

describe("fe-spec: spec and analyze know FENCE and the new filters", () => {
  it("fe-spec: spec lists FENCE closing with END_FENCE", () => {
    const b = spec().blocks.find((x) => x.name === "FENCE");
    expect(b).toBeDefined();
    expect(b!.closes).toBe("END_FENCE");
    expect(b!.description.length).toBeGreaterThan(0);
  });

  it.each(["fence", "heading_offset"])("fe-spec: spec lists filter %s with a description", (name) => {
    const f = spec().filters.find((x) => x.name === name);
    expect(f).toBeDefined();
    expect(f!.description.length).toBeGreaterThan(0);
  });

  it.each(["fence", "heading_offset"])("fe-spec: filter %s is a new entry in the spec", (name) => {
    expect(spec().filters.map((f) => f.name)).toContain(name);
  });

  it("fe-spec: the spec text mentions FENCE, END_FENCE, fence, heading_offset and the block mode", () => {
    const json = JSON.stringify(spec());
    for (const word of ["FENCE", "END_FENCE", "fence", "heading_offset", "block"]) {
      expect(json).toContain(word);
    }
  });

  it("fe-spec: escape_md filter entry names the inline and block modes", () => {
    const f = spec().filters.find((x) => x.name === "escape_md")!;
    expect(f.params + " " + f.description).toContain("block");
    expect(f.params + " " + f.description).toContain("inline");
  });

  it("fe-spec: analyze counts FENCE in blocks", () => {
    expect(tryAnalyze('{{FENCE lang="x"}}a{{END_FENCE}}')?.blocks).toEqual({ FENCE: 1 });
    expect(tryAnalyze("{{FENCE}}a{{END_FENCE}}{{FENCE}}{{FENCE}}b{{END_FENCE}}{{END_FENCE}}")?.blocks).toEqual({ FENCE: 3 });
  });

  it("fe-spec: analyze reports FENCE next to other blocks", () => {
    const a = tryAnalyze("{{FOR xs AS i}}{{FENCE}}${{i}}{{END_FENCE}}{{END_FOR}}");
    expect(a?.blocks).toEqual({ FOR: 1, FENCE: 1 });
  });

  it("fe-spec: analyze does not report the new filters as unknown and counts them", () => {
    const a = tryAnalyze("${{a | fence=md}}${{b | heading_offset=1}}${{c | escape_md=block}}${{d | fence}}");
    expect(a?.diagnostics.filter((d) => d.code === "unknown-filter")).toEqual([]);
    const counts = Object.fromEntries((a?.filters ?? []).map((f) => [f.name, f.count]));
    expect(counts).toEqual({ fence: 2, heading_offset: 1, escape_md: 1 });
  });

  it("fe-spec: validate accepts a template using FENCE and the new filters", () => {
    const v = validate('{{FENCE lang="x"}}${{a | heading_offset=1}}{{END_FENCE}}${{b | escape_md=block}}${{c | fence=md}}');
    expect(v.diagnostics).toEqual([]);
    expect(v.ok).toBe(true);
  });
});
``````

### tests/promptaware/heading-offset.test.ts (frozen)

```
import { render } from "../../core/src";

// No block tags appear in the heading cases, so the standalone option has no
// effect; {standaloneLines:false} is passed only to be explicit (the option is
// not on RenderOptions in this branch, hence `as any`). Cases that use FOR
// assume it off, since their templates have no tag-only lines anyway.
const OFF = { standaloneLines: false } as any;

function ho(draft: string, offset: number | string) {
  return render(`\${{ draft | heading_offset=${offset} }}`, { draft }, OFF);
}

interface Case {
  name: string;
  draft: string;
  offset: number;
  expected: string;
}

const T = "`";
const F3 = T.repeat(3);
const F4 = T.repeat(4);
const ALL = "# a\n## b\n### c\n#### d\n##### e\n###### f";

const cases: Case[] = [
  { name: "# to ###### shift by 2 and clamp at 6", draft: ALL, offset: 2, expected: "### a\n#### b\n##### c\n###### d\n###### e\n###### f" },
  { name: "offset 1 on every level", draft: ALL, offset: 1, expected: "## a\n### b\n#### c\n##### d\n###### e\n###### f" },
  { name: "offset 0 changes nothing", draft: "# a\n## b\n###### f", offset: 0, expected: "# a\n## b\n###### f" },
  { name: "large offset clamps everything to 6", draft: "# a\n### c", offset: 10, expected: "###### a\n###### c" },
  { name: "negative offset -1 shifts up and clamps at 1", draft: "# a\n## b\n### c\n###### f", offset: -1, expected: "# a\n# b\n## c\n##### f" },
  { name: "negative offset -2", draft: "# a\n### c\n#### d\n###### f", offset: -2, expected: "# a\n# c\n## d\n#### f" },
  { name: "large negative offset clamps everything to 1", draft: "## b\n###### f", offset: -10, expected: "# b\n# f" },
  { name: "text lines between headings are untouched", draft: "intro\n# a\ntext line\n\n## b\nmore", offset: 1, expected: "intro\n## a\ntext line\n\n### b\nmore" },
  { name: "a trailing line break is kept", draft: "# a\n", offset: 1, expected: "## a\n" },
  { name: "a heading on the last line without a break", draft: "x\n# a", offset: 1, expected: "x\n## a" },
  { name: "empty value stays empty", draft: "", offset: 2, expected: "" },
  { name: "no headings stays the same", draft: "just text\nand more", offset: 2, expected: "just text\nand more" },
  { name: "#hashtag without a space is not a heading", draft: "#hashtag\n# real", offset: 1, expected: "#hashtag\n## real" },
  { name: "hashes without a space and seven hashes are not headings", draft: "##tag\n###### real\n####### seven", offset: 1, expected: "##tag\n###### real\n####### seven" },
  { name: "seven hashes with a space is not a heading", draft: "####### seven\n## b", offset: -1, expected: "####### seven\n# b" },
  { name: "a # in the middle of a line is untouched", draft: "a # b\nissue #12 here\n# real", offset: 1, expected: "a # b\nissue #12 here\n## real" },
  { name: "a heading keeps its text and inner hashes", draft: "# C# language # 2", offset: 1, expected: "## C# language # 2" },
  // The closing hash sequence is heading text as far as the contract goes: only the leading run shifts.
  { name: "trailing hashes stay (only the leading run shifts)", draft: "## Title ##\n# Two #", offset: 1, expected: "### Title ##\n## Two #" },
  { name: "CRLF line breaks are kept and CRLF headings shift", draft: "# A\r\ntext\r\n## B\r\n", offset: 1, expected: "## A\r\ntext\r\n### B\r\n" },
  // fenced code stays untouched
  { name: "headings inside a backtick fence are untouched", draft: `# out\n${F3}\n# in\n## in2\n${F3}\n## after`, offset: 1, expected: `## out\n${F3}\n# in\n## in2\n${F3}\n### after` },
  { name: "a fence with a language is a fence", draft: `${F3}md\n# in\n${F3}\n# out`, offset: 2, expected: `${F3}md\n# in\n${F3}\n### out` },
  { name: "headings inside a tilde fence are untouched", draft: "# out\n~~~\n# in\n~~~\n# out2", offset: 1, expected: "## out\n~~~\n# in\n~~~\n## out2" },
  { name: "a longer fence is closed only by a fence at least as long", draft: `${F4}\n${F3}\n# in\n${F3}\n# still in\n${F4}\n# out`, offset: 1, expected: `${F4}\n${F3}\n# in\n${F3}\n# still in\n${F4}\n## out` },
  { name: "a backtick fence is not closed by a tilde fence", draft: `${F3}\n~~~\n# in\n~~~\n# still in\n${F3}\n# out`, offset: 1, expected: `${F3}\n~~~\n# in\n~~~\n# still in\n${F3}\n## out` },
  { name: "a tilde fence is not closed by a backtick fence", draft: `~~~\n${F3}\n# in\n${F3}\n~~~\n# out`, offset: 1, expected: `~~~\n${F3}\n# in\n${F3}\n~~~\n## out` },
  { name: "an unclosed backtick fence protects everything after it", draft: `# before\n${F3}\n# in\n## also in`, offset: 1, expected: `## before\n${F3}\n# in\n## also in` },
  { name: "an unclosed tilde fence protects everything after it", draft: "# before\n~~~\n# in", offset: 1, expected: "## before\n~~~\n# in" },
  { name: "headings between two fenced blocks shift, headings inside do not", draft: `${F3}\n# a\n${F3}\n# mid\n${F3}\n# b\n${F3}`, offset: 1, expected: `${F3}\n# a\n${F3}\n## mid\n${F3}\n# b\n${F3}` },
  { name: "negative offset also spares fenced headings", draft: `### out\n${F3}\n### in\n${F3}`, offset: -1, expected: `## out\n${F3}\n### in\n${F3}` },
  { name: "CRLF fenced block is spared", draft: `# a\r\n${F3}\r\n# in\r\n${F3}\r\n# b`, offset: 1, expected: `## a\r\n${F3}\r\n# in\r\n${F3}\r\n## b` },
];

describe("ho-offset: heading_offset shifts ATX headings, clamped to 1 through 6, sparing fenced code", () => {
  it.each(cases)("ho-offset: $name", (c) => {
    const res = ho(c.draft, c.offset);
    expect(res.output).toBe(c.expected);
    expect(res.ok).toBe(true);
    expect(res.diagnostics).toEqual([]);
  });

  it("ho-offset: applies per FOR iteration and after another filter", () => {
    const res = render("{{FOR xs AS d}}${{ d | trim | heading_offset=1 }}|{{END_FOR}}", { xs: ["  # a  ", "# b\n"] }, OFF);
    expect(res.output).toBe("## a|## b|");
    expect(res.ok).toBe(true);
  });

  it("ho-offset: chained before escape_md the heading shifts first", () => {
    // shifts to "## a", then escape_md puts a backslash before each #
    const res = render("${{ d | heading_offset=1 | escape_md }}", { d: "# a" }, OFF);
    expect(res.output).toBe("\\#\\# a");
    expect(res.ok).toBe(true);
  });

  it("ho-offset: only values piped through the filter shift", () => {
    const res = render("${{ d }}|${{ d | heading_offset=1 }}", { d: "# a" }, OFF);
    expect(res.output).toBe("# a|## a");
    expect(res.ok).toBe(true);
  });

  describe("errors", () => {
    interface ErrCase {
      name: string;
      template: string;
      line: number;
      column: number;
    }
    const errors: ErrCase[] = [
      { name: "missing parameter", template: "a\n  ${{ draft | heading_offset }}", line: 2, column: 3 },
      { name: "empty parameter", template: "a\n  ${{ draft | heading_offset= }}", line: 2, column: 3 },
      { name: "non-numeric parameter", template: "a\nb\n  ${{ draft | heading_offset=abc }}", line: 3, column: 3 },
      { name: "decimal parameter", template: "${{ draft | heading_offset=1.5 }}", line: 1, column: 1 },
      { name: "parameter with trailing junk", template: "${{ draft | heading_offset=2x }}", line: 1, column: 1 },
      { name: "missing parameter inside a FOR is located at the variable in the body", template: "a\n{{FOR xs AS i}}\n x${{ i | heading_offset }}\n{{END_FOR}}", line: 3, column: 3 },
    ];
    it.each(errors)("ho-offset: $name is a type-error at the variable", (c) => {
      const res = render(c.template, { draft: "# a", xs: ["# a"] }, OFF);
      expect(res.diagnostics[0]).toMatchObject({ code: "type-error", line: c.line, column: c.column });
      expect(res.ok).toBe(false);
      expect(res.output).toBe("");
    });
  });
});
```

### tests/promptaware/escape-modes.test.ts (frozen)

````
import { render } from "../../core/src";

// Placeholders only, no block tags: the standalone option has no effect here.
// {standaloneLines:false} is passed to be explicit (`as any`: the option is not
// on RenderOptions in this branch).
const OFF = { standaloneLines: false } as any;

const esc = (mode: string | null, v: string) =>
  render(mode === null ? "${{ v | escape_md }}" : `\${{ v | escape_md=${mode} }}`, { v }, OFF);

// Inline escaping today: a backslash before each of  \ * _ [ ] ( ) # ` > ~ |
// Hand-derived from the character list; "-", "+", "." and "=" are NOT escaped inline.
const INLINE: [string, string][] = [
  ["plain text", "plain text"],
  ["a*b_c", "a\\*b\\_c"],
  ["[x](y)", "\\[x\\]\\(y\\)"],
  ["# h", "\\# h"],
  ["> q", "\\> q"],
  ["a|b", "a\\|b"],
  ["`c` ~d~", "\\`c\\` \\~d\\~"],
  ["back\\slash", "back\\\\slash"],
  ["- item\n+ plus\n1. one\n---", "- item\n+ plus\n1. one\n---"],
];

describe("em-modes: plain escape_md and escape_md=inline keep today's escaping; block differs", () => {
  it.each(INLINE)("em-modes: inline %j", (input, expected) => {
    const plain = esc(null, input);
    expect(plain.output).toBe(expected);
    expect(plain.ok).toBe(true);
    const inline = esc("inline", input);
    expect(inline.output).toBe(expected);
    expect(inline.ok).toBe(true);
    // mode names are validated (so "inline" is a real mode, not an ignored argument)
    const bad = esc("nosuchmode", input);
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics[0]).toMatchObject({ code: "type-error" });
  });

  it("em-modes: a quoted mode name is the same as a bare one", () => {
    const res = render('${{ v | escape_md="block" }}', { v: "- x" }, OFF);
    expect(res.output).toBe("\\- x");
    expect(res.ok).toBe(true);
  });
});

// One line each, where block must add a backslash that inline does not.
const BLOCK_SINGLE: [string, string][] = [
  ["- item", "\\- item"],
  ["+ item", "\\+ item"],
  ["---", "\\---"],
  ["-----", "\\-----"],
  ["===", "\\==="],
  ["=====", "\\====="],
];

describe("em-modes: escape_md=block escapes line starts so a value cannot fake structure", () => {
  it.each(BLOCK_SINGLE)("em-modes: block on a single line %j", (input, expected) => {
    const res = esc("block", input);
    expect(res.output).toBe(expected);
    expect(res.ok).toBe(true);
    // the same value in the default mode is NOT escaped at the line start
    expect(esc("inline", input).output).toBe(input);
  });

  // Where inline already puts a backslash on the first character (hash, greater-than, star, pipe,
  // backticks, tildes) block must not add a second one.
  const ALREADY: [string, string][] = [
    ["# h", "\\# h"],
    ["## h", "\\#\\# h"],
    ["> q", "\\> q"],
    ["* b", "\\* b"],
    ["| a | b |", "\\| a \\| b \\|"],
    ["```", "\\`\\`\\`"],
    ["~~~", "\\~\\~\\~"],
  ];

  it("em-modes: block on a value whose first char inline already escapes adds no second backslash", () => {
    const outs = ALREADY.map(([input]) => esc("block", input).output);
    expect(outs).toEqual(ALREADY.map(([, expected]) => expected));
    // reaches here only once the block mode is accepted: it must also change a line inline leaves alone
    expect(esc("block", "- x").output).toBe("\\- x");
  });

  it("em-modes: a digit run followed by a dot or a parenthesis is escaped at the line start", () => {
    // Contract: the backslash goes before the dot or parenthesis: "1." and "2)".
    const dot = esc("block", "1. one").output;
    expect(dot).toBe("1\\. one");
    const paren = esc("block", "2) two").output;
    expect(paren).toBe("2\\) two");
    const multi = esc("block", "10. ten").output;
    expect(multi).toBe("10\\. ten");
  });

  it("em-modes: a digit run in the middle of a line is not escaped", () => {
    const res = esc("block", "- x\nversion 1. beta and 2) gamma");
    expect(res.output).toBe("\\- x\nversion 1. beta and 2\\) gamma");
  });

  it("em-modes: block escaping is applied to every line of a multi-line value", () => {
    const input = ["plain text", "- bullet", "+ plus", "---", "===", "```", "~~~", "# head", "> quote", "* star", "| pipe"].join("\n");
    const expected = [
      "plain text",
      "\\- bullet",
      "\\+ plus",
      "\\---",
      "\\===",
      "\\`\\`\\`",
      "\\~\\~\\~",
      "\\# head",
      "\\> quote",
      "\\* star",
      "\\| pipe",
    ].join("\n");
    const res = esc("block", input);
    expect(res.output).toBe(expected);
    expect(res.ok).toBe(true);
  });

  it("em-modes: block only changes line starts, ordinary lines get inline escaping and nothing more", () => {
    const res = esc("block", "plain text\nsecond a*b line\n- x\nmid - dash and + plus and --- three");
    expect(res.output).toBe("plain text\nsecond a\\*b line\n\\- x\nmid - dash and + plus and --- three");
  });

  it("em-modes: a dash or equals run that is only two long is not a rule line", () => {
    const res = esc("block", "- x\n==\n= y");
    // "- x" is a list marker; "==" and "= y" are not structure
    expect(res.output).toBe("\\- x\n==\n= y");
  });

  it("em-modes: a line break inside the value keeps the lines separate (CRLF stays CRLF)", () => {
    const res = esc("block", "a\r\n- b\r\n---");
    expect(res.output).toBe("a\r\n\\- b\r\n\\---");
  });

  it("em-modes: an empty value stays empty and plain text is unchanged in block mode", () => {
    expect(esc("block", "").output).toBe("");
    // a value that needs no escaping is the same in both modes; the second assertion makes this a red check
    expect(esc("block", "just words, 3.5 and 1-2").output).toBe("just words, 3.5 and 1-2");
    expect(esc("block", "- x").output).not.toBe("- x");
  });

  it("em-modes: block mode works per FOR item and after another filter", () => {
    const res = render("{{FOR xs AS i}}${{ i | trim | escape_md=block }}|{{END_FOR}}", { xs: ["  - a ", "b"] }, OFF);
    expect(res.output).toBe("\\- a|b|");
    expect(res.ok).toBe(true);
  });
});

describe("em-modes: any other mode is a type-error located at the variable", () => {
  interface ErrCase {
    name: string;
    template: string;
    line: number;
    column: number;
  }
  const errors: ErrCase[] = [
    { name: "unknown mode name", template: "a\n  ${{ v | escape_md=bogus }}", line: 2, column: 3 },
    { name: "empty mode", template: "${{ v | escape_md= }}", line: 1, column: 1 },
    { name: "a mode that is the wrong case", template: "x\ny\n  ${{ v | escape_md=BLOCK }}", line: 3, column: 3 },
    { name: "a numeric mode", template: "${{ v | escape_md=1 }}", line: 1, column: 1 },
    { name: "an unknown mode inside a FOR is located at the variable in the body", template: "a\n{{FOR xs AS i}}\n x${{ i | escape_md=html }}\n{{END_FOR}}", line: 3, column: 3 },
  ];
  it.each(errors)("em-modes: $name", (c) => {
    const res = render(c.template, { v: "x", xs: ["x"] }, OFF);
    expect(res.diagnostics[0]).toMatchObject({ code: "type-error", line: c.line, column: c.column });
    expect(res.ok).toBe(false);
    expect(res.output).toBe("");
  });
});
````

## 4. Diff

6 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

````diff
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index 5537847..4e1af2d 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -11,6 +11,7 @@ import {
 import {
   ASTNode,
   CaseNode,
+  FenceNode,
   ForNode,
   IfNode,
   Limits,
@@ -57,7 +58,14 @@ export interface AnalysisDiagnostic {
   column: number;
 }
 
-export type BlockKind = "IF" | "CASE" | "FOR" | "LIST" | "TABLE" | "SECTION";
+export type BlockKind =
+  | "IF"
+  | "CASE"
+  | "FOR"
+  | "LIST"
+  | "TABLE"
+  | "SECTION"
+  | "FENCE";
 
 export interface TemplateAnalysis {
   variables: VariableUsage[];
@@ -144,6 +152,9 @@ class Walker {
       case "Section":
         this.countBlock("SECTION");
         return this.visitSection(node as SectionNode);
+      case "Fence":
+        this.countBlock("FENCE");
+        return this.visitFence(node as FenceNode);
       case "Header":
       case "TableRow":
         return this.visitCells(node as TableHeaderNode | TableRowNode);
@@ -205,6 +216,13 @@ class Walker {
     this.visitAll(node.body);
   }
 
+  private visitFence(node: FenceNode): void {
+    if (node.lang?.kind === "path") {
+      this.record(node.lang.path.join("."), "output", true);
+    }
+    this.visitAll(node.body);
+  }
+
   private visitListItem(node: ListItemNode): void {
     if (node.condition) this.visitCondition(node.condition, "list_item", node);
     this.visitAll(node.content);
diff --git a/core/src/errors.ts b/core/src/errors.ts
index 0a97ad8..6b1bebf 100644
--- a/core/src/errors.ts
+++ b/core/src/errors.ts
@@ -120,12 +120,17 @@ export class MissingVariableError extends TemplateError {
  * Filter name that does not exist
  */
 export class UnknownFilterError extends TemplateError {
-  constructor(filterName: string, line: number, column: number) {
+  constructor(
+    filterName: string,
+    line: number,
+    column: number,
+    availableFilters: string[]
+  ) {
     super(
       `Unknown filter: ${filterName}`,
       line,
       column,
-      "Available filters: head, tail, trim, escape_md",
+      `Available filters: ${availableFilters.join(", ")}`,
       "unknown-filter"
     );
     this.name = "UnknownFilterError";
diff --git a/core/src/filters.ts b/core/src/filters.ts
index 506cc8b..2b4c0d5 100644
--- a/core/src/filters.ts
+++ b/core/src/filters.ts
@@ -108,8 +108,21 @@ export const FILTERS: { name: string; params: string; description: string }[] =
     },
     {
       name: "escape_md",
-      params: "",
-      description: "Markdown special characters escaped with a backslash",
+      params: "escape_md[=inline|block]",
+      description:
+        "Markdown special characters escaped with a backslash (inline, the default); block also escapes line starts that would read as structure: headings, quotes, list markers, tables, rules and fences",
+    },
+    {
+      name: "fence",
+      params: "fence[=lang]",
+      description:
+        "The value in a code fence of at least three backticks, longer than any backtick run inside it, with the optional language; one leading and one trailing line break of the value are removed",
+    },
+    {
+      name: "heading_offset",
+      params: "heading_offset=N",
+      description:
+        "Markdown ATX headings shifted by N levels (negative N shifts up), clamped to 1-6; headings inside fenced code are untouched",
     },
   ];
 
@@ -125,9 +138,18 @@ export function applyFilter(text: string, filter: FilterCall): string {
     case "trim":
       return text.trim();
     case "escape_md":
-      return applyEscapeMdFilter(text);
+      return applyEscapeMdFilter(text, filter.params);
+    case "fence":
+      return fenced(text, filter.params.value ?? "");
+    case "heading_offset":
+      return applyHeadingOffsetFilter(text, filter.params);
     default:
-      throw new UnknownFilterError(filter.name, 1, 1);
+      throw new UnknownFilterError(
+        filter.name,
+        1,
+        1,
+        FILTERS.map((f) => f.name)
+      );
   }
 }
 
@@ -183,9 +205,94 @@ function applyTailFilter(text: string, params: Record<string, string>): string {
 }
 
 /**
- * Apply escape_md filter: escape markdown special characters
+ * Apply escape_md filter: inline escaping by default, block mode adds
+ * line-start escaping
+ */
+function applyEscapeMdFilter(
+  text: string,
+  params: Record<string, string>
+): string {
+  const mode = params.value ?? "inline";
+  if (mode === "inline") return escapeInline(text);
+  if (mode === "block") {
+    return escapeInline(text).split("\n").map(escapeLineStart).join("\n");
+  }
+  throw new Error(
+    `Invalid escape_md mode: ${mode} (must be inline or block)`
+  );
+}
+
+/**
+ * Backslash before a line start that inline escaping leaves able to read as
+ * structure: a list marker, an ordered list number or a setext underline.
+ * Digits cannot be escaped, so an ordered list escapes the dot after them.
+ */
+function escapeLineStart(line: string): string {
+  return line
+    .replace(/^([ \t]*)([-+]|={3,}[ \t]*\r?$)/, "$1\\$2")
+    .replace(/^([ \t]*\d+)\./, "$1\\.");
+}
+
+/**
+ * Wrap text in a code fence of at least three backticks, longer than any
+ * backtick run in it, after removing one leading and one trailing line break
+ */
+export function fenced(text: string, lang: string): string {
+  const body = text.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
+  const longestRun = Math.max(
+    0,
+    ...(body.match(/`+/g) ?? []).map((run) => run.length)
+  );
+  const fence = "`".repeat(Math.max(3, longestRun + 1));
+  return `${fence}${lang}\n${body}\n${fence}\n`;
+}
+
+/**
+ * Apply heading_offset filter: shift ATX headings outside fenced code by N
+ * levels, clamped to 1-6
+ */
+function applyHeadingOffsetFilter(
+  text: string,
+  params: Record<string, string>
+): string {
+  const value = params.value;
+  if (value === undefined || !/^[+-]?\d+$/.test(value)) {
+    throw new Error(
+      `heading_offset requires an integer parameter (e.g., heading_offset=1), got ${value ?? "none"}`
+    );
+  }
+  const offset = Number(value);
+  let openFence: string | null = null;
+
+  return text
+    .split("\n")
+    .map((line) => {
+      const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
+      if (openFence !== null) {
+        const closes =
+          fence !== undefined &&
+          fence[0] === openFence[0] &&
+          fence.length >= openFence.length &&
+          line.trim() === fence;
+        if (closes) openFence = null;
+        return line;
+      }
+      if (fence !== undefined) {
+        openFence = fence;
+        return line;
+      }
+      return line.replace(/^(#{1,6}) /, (_, hashes: string) => {
+        const level = Math.min(6, Math.max(1, hashes.length + offset));
+        return `${"#".repeat(level)} `;
+      });
+    })
+    .join("\n");
+}
+
+/**
+ * Inline markdown escaping: a backslash before each markdown special character
  */
-function applyEscapeMdFilter(text: string): string {
+function escapeInline(text: string): string {
   const specialChars = [
     "\\",
     "*",
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 1e52406..5371db2 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -12,6 +12,7 @@ import {
   TableRowNode,
   TernaryNode,
   SectionNode,
+  FenceNode,
   VariableMap,
   TemplateValue,
   Limits,
@@ -34,7 +35,7 @@ import {
   evaluateMathExpression,
   isTruthy,
 } from "./expressions";
-import { parseFilter, applyFilters } from "./filters";
+import { parseFilter, applyFilters, fenced } from "./filters";
 
 /**
  * Interpreter: Walks AST and produces output string
@@ -47,7 +48,8 @@ import { parseFilter, applyFilters } from "./filters";
  * - FOR loops with special variables (@index0, @first, @last, etc.)
  * - Lists (numbered, nested)
  * - Tables (with/without headers, alignment)
- * - Filters (head, tail, trim, escape_md)
+ * - Code fences sized to their content (FENCE)
+ * - Filters (head, tail, trim, escape_md, fence, heading_offset)
  * - Default operator (??)
  * - Ternary with variable references
  */
@@ -161,6 +163,8 @@ export class Interpreter {
         return this.visitTable(node as TableNode);
       case "Section":
         return this.visitSection(node as SectionNode);
+      case "Fence":
+        return this.visitFence(node as FenceNode);
       case "Ternary":
         return this.at(node, () => this.visitTernary(node as TernaryNode));
       case "Comment":
@@ -364,6 +368,34 @@ export class Interpreter {
     return value;
   }
 
+  /**
+   * Visit FENCE: the rendered body in a code fence sized to it
+   */
+  private visitFence(node: FenceNode): string {
+    const lang = this.at(node, () => this.fenceLang(node));
+    const body = node.body.map((child) => this.visit(child)).join("");
+    return fenced(body, lang);
+  }
+
+  /**
+   * The FENCE language; a missing, null or empty value gives a bare fence
+   */
+  private fenceLang(node: FenceNode): string {
+    if (node.lang === null) return "";
+    if (node.lang.kind === "literal") return node.lang.text;
+    const value = this.resolveNestedPath(node.lang.path, true);
+    if (value == null) return "";
+    if (typeof value !== "string") {
+      throw new TypeError(
+        `FENCE lang must be a string, got ${describeValue(value)}`,
+        node.line,
+        node.column,
+        "Map the lang variable to a string"
+      );
+    }
+    return value;
+  }
+
   private restoreLoopContext(saved: Map<string, TemplateValue>): void {
     this.loopContext.clear();
     for (const [key, value] of saved) {
diff --git a/core/src/lexer.ts b/core/src/lexer.ts
index d54bd9d..611f3be 100644
--- a/core/src/lexer.ts
+++ b/core/src/lexer.ts
@@ -12,6 +12,7 @@ const CLOSERS: Partial<Record<TokenType, TokenType>> = {
   [TokenType.END_TABLE]: TokenType.TABLE,
   [TokenType.END_LIST]: TokenType.LIST,
   [TokenType.END_SECTION]: TokenType.SECTION,
+  [TokenType.END_FENCE]: TokenType.FENCE,
 };
 const OPENERS = new Set(Object.values(CLOSERS));
 
@@ -26,6 +27,7 @@ const OPENERS = new Set(Object.values(CLOSERS));
  * - Tables: {{TABLE}}, {{HEADER}}, {{ROW}}, {{END_TABLE}}
  * - Lists: {{LIST}}, {{LIST_ITEM}}, {{END_LIST}}
  * - Sections: {{SECTION "Title" level=2}}, {{END_SECTION}}
+ * - Code fences: {{FENCE lang="md"}}, {{END_FENCE}}
  * - Ternary: {{condition ? "true" : "false"}}
  * - Comments: {{# comment #}}
  * - Literal blocks: {{RAW}}...{{END_RAW}}; \{{ is a literal brace pair
@@ -467,6 +469,8 @@ export class Lexer {
       END_RAW: TokenType.END_RAW,
       SECTION: TokenType.SECTION,
       END_SECTION: TokenType.END_SECTION,
+      FENCE: TokenType.FENCE,
+      END_FENCE: TokenType.END_FENCE,
     };
 
     return mapping[keyword] || null;
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 4956e1e..948a79a 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -18,12 +18,14 @@ import {
   CommentNode,
   SectionNode,
   SectionTitle,
+  FenceNode,
+  FenceLang,
   FilterCall,
   DEFAULT_LIMITS,
 } from "./types";
 import { SyntaxError, TypeError, LimitError } from "./errors";
 
-const SECTION_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
+const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
 const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
 
 /**
@@ -87,6 +89,8 @@ export class Parser {
         return this.nested(() => this.parseTable());
       case TokenType.SECTION:
         return this.nested(() => this.parseSection());
+      case TokenType.FENCE:
+        return this.nested(() => this.parseFence());
       case TokenType.HEADER:
         return this.parseTableHeader();
       case TokenType.ROW:
@@ -665,7 +669,7 @@ export class Parser {
     let skipEmpty = true;
     const args = token.value.slice("SECTION".length);
 
-    for (const [argument, key, value] of args.matchAll(SECTION_ARGUMENT)) {
+    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
       if (key === "level") {
         if (!/^[+-]?\d+$/.test(value)) {
           throw typeError(
@@ -704,6 +708,72 @@ export class Parser {
     return { title, level, skipEmpty };
   }
 
+  /**
+   * Parse FENCE: {{FENCE lang="md"}}...{{END_FENCE}}
+   */
+  private parseFence(): FenceNode {
+    const token = this.consume(TokenType.FENCE);
+    const lang = this.parseFenceLang(token);
+
+    const body: ASTNode[] = [];
+    while (!this.check(TokenType.END_FENCE)) {
+      if (this.isAtEnd()) {
+        throw new SyntaxError(
+          "Unclosed {{FENCE}} block",
+          token.line,
+          token.column,
+          "Add {{END_FENCE}}"
+        );
+      }
+      const node = this.parseNode();
+      if (node) body.push(node);
+    }
+
+    this.consume(TokenType.END_FENCE);
+
+    return {
+      type: "Fence",
+      lang,
+      body,
+      line: token.line,
+      column: token.column,
+    };
+  }
+
+  /**
+   * Parse the optional FENCE lang option: a quoted string or a variable path
+   */
+  private parseFenceLang(token: Token): FenceLang | null {
+    const syntaxError = (message: string) =>
+      new SyntaxError(
+        message,
+        token.line,
+        token.column,
+        'Expected: {{FENCE lang="markdown"}} or {{FENCE lang=path.to.lang}}'
+      );
+
+    let lang: FenceLang | null = null;
+    const args = token.value.slice("FENCE".length);
+
+    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
+      if (key !== "lang") {
+        throw syntaxError(
+          key === undefined
+            ? `Unexpected FENCE argument: ${argument}`
+            : `Unknown FENCE option: ${key}`
+        );
+      }
+      if (/^(["']).*\1$/.test(value)) {
+        lang = { kind: "literal", text: value.slice(1, -1) };
+      } else if (VARIABLE_PATH.test(value)) {
+        lang = { kind: "path", path: value.split(".") };
+      } else {
+        throw syntaxError(`Invalid FENCE lang: ${value}`);
+      }
+    }
+    return lang;
+  }
+
   /**
    * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
    */
diff --git a/core/src/spec.ts b/core/src/spec.ts
index 827c82d..eab7589 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -93,6 +93,13 @@ const BLOCKS: Spec["blocks"] = [
     description:
       "A markdown heading at level (default 2, clamped to 1-6), a blank line and the body with its leading and trailing blank lines trimmed; omitted entirely when the body renders empty, unless skip_empty=false keeps the heading",
   },
+  {
+    name: "FENCE",
+    closes: "END_FENCE",
+    args: '[lang="language" | lang=path]',
+    description:
+      "A code fence of at least three backticks, longer than any backtick run in the rendered body, with the optional language; one leading and one trailing line break of the body are removed",
+  },
   {
     name: "RAW",
     closes: "END_RAW",
diff --git a/core/src/types.ts b/core/src/types.ts
index 7cdf8f3..a91a0c2 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -56,6 +56,8 @@ export enum TokenType {
   END_RAW = "END_RAW",
   SECTION = "SECTION",
   END_SECTION = "END_SECTION",
+  FENCE = "FENCE",
+  END_FENCE = "END_FENCE",
   COMMENT = "COMMENT",
   EOF = "EOF",
 }
@@ -193,6 +195,23 @@ export interface SectionNode extends ASTNode {
   body: ASTNode[];
 }
 
+/**
+ * FENCE language: a quoted string or a variable path
+ */
+export type FenceLang =
+  | { kind: "literal"; text: string }
+  | { kind: "path"; path: string[] };
+
+/**
+ * FENCE block: its rendered body in a code fence longer than any backtick
+ * run inside it
+ */
+export interface FenceNode extends ASTNode {
+  type: "Fence";
+  lang: FenceLang | null;
+  body: ASTNode[];
+}
+
 /**
  * List container node
  */
diff --git a/core/src/whitespace.ts b/core/src/whitespace.ts
index 6033472..1cedbd9 100644
--- a/core/src/whitespace.ts
+++ b/core/src/whitespace.ts
@@ -16,6 +16,8 @@ const STANDALONE_TAGS = new Set<TokenType>([
   TokenType.END_FOR,
   TokenType.SECTION,
   TokenType.END_SECTION,
+  TokenType.FENCE,
+  TokenType.END_FENCE,
   TokenType.RAW,
   TokenType.END_RAW,
   TokenType.COMMENT,
diff --git a/tests/promptaware/fence.test.ts b/tests/promptaware/fence.test.ts
index b279c72..e0ce5fa 100644
--- a/tests/promptaware/fence.test.ts
+++ b/tests/promptaware/fence.test.ts
@@ -190,7 +190,7 @@ describe("fe-autosize: standalone rule applies to FENCE tag lines", () => {
       name: "standalone on: a FENCE tag sharing its line with text is not removed",
       template: "a {{FENCE}}x{{END_FENCE}} b\n",
       options: ON,
-      expected: "a ```\nx\n``` b\n",
+      expected: "a ```\nx\n```\n b\n",
     },
   ]);
 });
````

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/promptaware/fence.test.ts tests/promptaware/heading-offset.test.ts tests/promptaware/escape-modes.test.ts --json`
- Exit status: 0
- Tests: 136 passed, 0 failed
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
