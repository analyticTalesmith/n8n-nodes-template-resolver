---
type: review-packet
card: 0043-expose-the-prompt-aware-options-on-the-a
tier: product
built_at: 2026-10-14T03:11:04.210Z
base: b3333a679644c90397d31af0bcce2591420884b8
head: d7b337dc6487d67cf6e6917cfca7f54d6180acb7
frozen: true
brief_sha256: 6a0d501dc01b5827595e0c0437c2325f0cbcb21b285465fbae54bcc0bb6525e2
manifest_sha256: 2a7b7dc220b087d14b2cfba419996f68d997fd74421ea8fb9c0ef112177ac49a
criteria_sha256: 19f447000ef82110e35cb6d55d9924b0d7acf4d1adce92bba3be9d8cb8f74b4f
scope_sha256: 71e16176a4fe7290b2023a163ae667507e3f346b220c46a151b699ce0ec971ef
diff_sha256: 942ae16296b56d005325df7738f9f6f8ae3ca11ac1d9c9f25e094da8d343bc49
omitted_paths: 5
criteria_count: 6
must_not_count: 3
---

# Review packet: 0043-expose-the-prompt-aware-options-on-the-a

Manifest amended after the freeze at 2026-10-14T03:10:25.505Z by lead: one frozen expectation corrected; living module documents updated with the surfaces (edit +tests/promptaware/surfaces.test.ts, scope +tests/promptaware)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the new language features are reachable and documented from every surface.

### Criteria

- c1 (verify: test): sf-api: POST /v1/render accepts options.standaloneLines (boolean, a non-boolean is 400 invalid-request), the OpenAPI document describes it, and the served document still equals the committed file
- c2 (verify: test): sf-cli: render accepts --no-standalone-lines and --standalone-lines, giving both together is a usage error exit 2, and the usage text lists them
- c3 (verify: test): sf-node: the node has a boolean option for standalone lines that defaults to true and reaches render
- c4 (verify: test): sf-golden: golden cases rendered through render cover a prompt template using sections, fences, offset headings, escaped values, RAW and trim markers, with standalone lines on and off
- c5 (verify: test): sf-docs: the README documents the whitespace rule and trim markers, RAW and brace escaping, SECTION, FENCE, heading_offset and the escape modes with examples, and names the standalone option on every surface
- c6 (verify: review): sf-living: the cycle deltas turn the prompt-aware contract and the module documents into built documents after the merge

### Must not

- m1: change any existing test expectation
- m2: document what the code does not do
- m3: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the new language features are reachable and documented from every surface.
Must not:
- change any existing test expectation
- document what the code does not do
- add a runtime dependency

## Questions

goal-critical: does every README example reproduce when run?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
```

### spec.md as of base b3333a6

```
# Spec

## Acceptance criteria

- sf-api: POST /v1/render accepts options.standaloneLines (boolean, a non-boolean is 400 invalid-request), the OpenAPI document describes it, and the served document still equals the committed file
- sf-cli: render accepts --no-standalone-lines and --standalone-lines, giving both together is a usage error exit 2, and the usage text lists them
- sf-node: the node has a boolean option for standalone lines that defaults to true and reaches render
- sf-golden: golden cases rendered through render cover a prompt template using sections, fences, offset headings, escaped values, RAW and trim markers, with standalone lines on and off
- sf-docs: the README documents the whitespace rule and trim markers, RAW and brace escaping, SECTION, FENCE, heading_offset and the escape modes with examples, and names the standalone option on every surface
- sf-living: the cycle deltas turn the prompt-aware contract and the module documents into built documents after the merge
```

### card.md as of base b3333a6

```
# Expose the prompt-aware options on the api, cli, node and in the docs

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

The API, CLI and n8n node accept the standaloneLines option, the OpenAPI document, README, changelog and living documents describe every new construct, and golden cases prove a realistic prompt end to end.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `sf-api` POST /v1/render accepts options.standaloneLines (boolean, a non-boolean is 400 invalid-request), the OpenAPI document describes it, and the served document still equals the committed file
- `contract` `sf-cli` render accepts --no-standalone-lines and --standalone-lines, giving both together is a usage error exit 2, and the usage text lists them
- `contract` `sf-node` the node has a boolean option for standalone lines that defaults to true and reaches render
- `contract` `sf-golden` golden cases rendered through render cover a prompt template using sections, fences, offset headings, escaped values, RAW and trim markers, with standalone lines on and off
- `contract` `sf-docs` the README documents the whitespace rule and trim markers, RAW and brace escaping, SECTION, FENCE, heading_offset and the escape modes with examples, and names the standalone option on every surface
- `contract` `sf-living` the cycle deltas turn the prompt-aware contract and the module documents into built documents after the merge


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- document what the code does not do
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

README.md and changelog.md are the user documentation this card writes.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

options.standaloneLines (API), --standalone-lines and --no-standalone-lines (CLI), a node boolean option.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `README.md` | edit | none |
| `api/openapi.json` | edit | none |
| `api/routes.ts` | edit | none |
| `changelog.md` | edit | none |
| `cli/main.ts` | edit | none |
| `docs/living/architecture/modules/api.md` | edit | none |
| `docs/living/architecture/modules/cli.md` | edit | none |
| `docs/living/architecture/modules/template-resolver.md` | edit | none |
| `docs/living/architecture/prompt-aware-contract.md` | edit | none |
| `n8n/TemplateResolver.node.ts` | edit | none |

Files scope: `README.md`, `api/`, `changelog.md`, `cli/`, `docs/living/`, `n8n/`, `tests/golden/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `README.md`, `api/openapi.json`, `api/routes.ts`, `changelog.md`, `cli/main.ts`, `docs/living/architecture/modules/api.md`, `docs/living/architecture/modules/cli.md`, `docs/living/architecture/modules/template-resolver.md`, `docs/living/architecture/prompt-aware-contract.md`, `n8n/TemplateResolver.node.ts`, `tests/promptaware/surfaces.test.ts`
- files_scope: `README.md`, `api/`, `changelog.md`, `cli/`, `docs/living/`, `n8n/`, `tests/golden/`, `tests/promptaware`

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

These test files were committed before the work began, at base b3333a6. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/promptaware/surfaces.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { main } from "../../cli/main";
import { TemplateResolver } from "../../n8n/TemplateResolver.node";
import { check, start, stop, call, postJson, Running } from "../headless/http-helpers";

// One template whose block-tag lines sit alone: with standalone lines on they vanish, off they leave blank lines.
const IF_TEMPLATE = "a\n{{IF on}}\nb\n{{END_IF}}\nc\n";
const IF_ON = "a\nb\nc\n";
const IF_OFF = "a\n\nb\n\nc\n";
const FOR_TEMPLATE = "{{FOR xs AS x}}\n- ${{x}}\n{{END_FOR}}\nend\n";
const FOR_ON = "- 1\n- 2\nend\n";
const FOR_OFF = "\n- 1\n\n- 2\n\n\nend\n";

let running: Running | undefined;
afterEach(async () => {
  await stop(running);
  running = undefined;
});

describe("sf-api: options.standaloneLines on POST /v1/render", () => {
  const cases: [string, string, any, any, string][] = [
    ["IF lines, option omitted (default on)", IF_TEMPLATE, { on: true }, undefined, IF_ON],
    ["IF lines, true", IF_TEMPLATE, { on: true }, true, IF_ON],
    ["IF lines, false", IF_TEMPLATE, { on: true }, false, IF_OFF],
    ["FOR lines, true", FOR_TEMPLATE, { xs: [1, 2] }, true, FOR_ON],
    ["FOR lines, false", FOR_TEMPLATE, { xs: [1, 2] }, false, FOR_OFF],
  ];
  it.each(cases)("sf-api: %s", async (label, template, data, flag, expected) => {
    running = await start();
    const options = flag === undefined ? {} : { standaloneLines: flag };
    const r = await postJson(running, "/v1/render", { template, data, options });
    check(r.status, `${label}: 200`).toBe(200);
    check(r.json?.output, `${label}: output spacing follows the option`).toBe(expected);
    if (flag === false) {
      const on = await postJson(running, "/v1/render", { template, data, options: { standaloneLines: true } });
      check(on.json?.output === expected, `${label}: the same template with true differs from false`).toBe(false);
    }
  });

  it.each([
    ["string false", "false"],
    ["number 0", 0],
    ["number 1", 1],
    ["string yes", "yes"],
    ["array", []],
    ["object", {}],
  ])("sf-api: a non-boolean standaloneLines (%s) is 400 invalid-request", async (label, value) => {
    running = await start();
    const r = await postJson(running, "/v1/render", {
      template: "x",
      data: {},
      options: { standaloneLines: value },
    });
    check(r.status, `${label}: status 400`).toBe(400);
    check(r.json?.error?.code, `${label}: code invalid-request`).toBe("invalid-request");
  });

  it("sf-api: the OpenAPI document describes options.standaloneLines as a boolean and is still served byte for byte", async () => {
    const file = path.join(__dirname, "..", "..", "api", "openapi.json");
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    const found: any[] = [];
    const walk = (node: any): void => {
      if (node && typeof node === "object") {
        if (node.properties?.options?.properties?.standaloneLines) {
          found.push(node.properties.options.properties.standaloneLines);
        }
        Object.values(node).forEach(walk);
      }
    };
    walk(doc);
    check(found.length, "a render options schema lists standaloneLines").toBeGreaterThan(0);
    check(found[0].type, "standaloneLines is a boolean").toBe("boolean");
    check(typeof found[0].description, "standaloneLines has a description").toBe("string");
    running = await start();
    const r = await call(running, "GET", "/v1/openapi.json");
    check(r.raw.equals(fs.readFileSync(file)), "served document equals the committed file").toBe(true);
  });
});

describe("sf-cli: --standalone-lines and --no-standalone-lines", () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-sf-cli-"));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
    const r = { code: -1, out: "", err: "" };
    r.code = await main(argv, {
      readStdin: async () => "",
      stdout: (t) => {
        r.out += t;
      },
      stderr: (t) => {
        r.err += t;
      },
    });
    return r;
  }

  function files(): { t: string; d: string } {
    const t = path.join(dir, "t.txt");
    const d = path.join(dir, "d.json");
    fs.writeFileSync(t, IF_TEMPLATE);
    fs.writeFileSync(d, JSON.stringify({ on: true }));
    return { t, d };
  }

  it.each([
    ["no flag (default on)", [], IF_ON],
    ["--standalone-lines", ["--standalone-lines"], IF_ON],
    ["--no-standalone-lines", ["--no-standalone-lines"], IF_OFF],
  ] as [string, string[], string][])("sf-cli: %s", async (_n, flags, expected) => {
    const { t, d } = files();
    const r = await run(["render", t, "--data", d, ...flags]);
    expect({ code: r.code, out: r.out, err: r.err }).toEqual({ code: 0, out: expected, err: "" });
  });

  it.each([
    ["on then off", ["--standalone-lines", "--no-standalone-lines"]],
    ["off then on", ["--no-standalone-lines", "--standalone-lines"]],
  ] as [string, string[]][])("sf-cli: both flags together (%s) is a usage error, exit 2", async (_n, flags) => {
    const { t, d } = files();
    for (const single of flags) {
      const ok = await run(["render", t, "--data", d, single]);
      expect({ flag: single, code: ok.code }).toEqual({ flag: single, code: 0 });
    }
    const r = await run(["render", t, "--data", d, ...flags]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 2, out: "" });
    expect(r.err.trim().length).toBeGreaterThan(0);
  });

  it("sf-cli: the usage text lists both flags", async () => {
    const r = await run(["--help"]);
    expect(r.out).toContain("--standalone-lines");
    expect(r.out).toContain("--no-standalone-lines");
  });
});

describe("sf-node: the standalone lines option", () => {
  async function runNode(params: Record<string, any>): Promise<{ json?: any; error?: Error }> {
    const node = new TemplateResolver();
    const ctx: any = {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string, _i: number, dflt?: any) =>
        name in params ? params[name] : dflt,
      continueOnFail: () => false,
      getNode: () => ({ name: "TemplateResolver" }),
    };
    try {
      const result = await node.execute.call(ctx);
      return { json: result[0][0].json };
    } catch (e) {
      return { error: e as Error };
    }
  }

  const base = {
    variableMappings: { mappings: [{ variableName: "on", value: "yes" }] },
    strictMode: true,
    showDetectedVariables: false,
    outputField: "resolved_prompt",
    template: IF_TEMPLATE,
  };

  it("sf-node: the node lists a boolean standaloneLines option that defaults to true", () => {
    const prop = (new TemplateResolver().description.properties as any[]).find(
      (p) => p.name === "standaloneLines"
    );
    expect(prop).toBeDefined();
    expect(prop.type).toBe("boolean");
    expect(prop.default).toBe(true);
    expect(prop.displayName).toBe("Remove Standalone Tag Lines");
  });

  it.each([
    ["true removes the tag lines", { standaloneLines: true }, IF_ON],
    ["parameter absent defaults to removing them", {}, IF_ON],
    ["false keeps the blank lines", { standaloneLines: false }, IF_OFF],
  ] as [string, Record<string, any>, string][])("sf-node: %s", async (_n, extra, expected) => {
    const on = await runNode({ ...base, standaloneLines: true });
    expect(on.json?.resolved_prompt).toBe(IF_ON);
    const r = await runNode({ ...base, ...extra });
    expect(r.error).toBeUndefined();
    expect(r.json.resolved_prompt).toBe(expected);
  });
});
```

### tests/promptaware/golden-render.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import { render } from "../../core/src";
import { runGoldenCases } from "../golden/harness";

const casesDir = path.join(__dirname, "..", "golden", "render-cases");

// The render adapter: the string the golden harness compares is render's output; a failed render throws.
function renderOutput(template: string, data: any, options: any): string {
  const result = render(template, data, options);
  if (!result.ok) {
    throw new Error(
      `render failed: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`
    );
  }
  return result.output;
}

const results = runGoldenCases(casesDir, renderOutput, { update: false });

describe("sf-golden: prompt-aware golden cases rendered through render", () => {
  it.each(results.map((r) => [r.name, r] as [string, (typeof results)[number]]))(
    "sf-golden: case %s renders to its expected file",
    (_name, r) => {
      expect(r.message ?? "").toBe("");
    }
  );
});
```

### tests/promptaware/docs.test.ts (frozen)

```
import * as fs from "fs";
import * as path from "path";

const root = path.join(__dirname, "..", "..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const changelog = fs.readFileSync(path.join(root, "changelog.md"), "utf8");

const readmeNeedles: [string, string][] = [
  ["a SECTION example", "{{SECTION"],
  ["the SECTION end tag", "{{END_SECTION}}"],
  ["a FENCE example", "{{FENCE"],
  ["the FENCE end tag", "{{END_FENCE}}"],
  ["RAW", "{{RAW}}"],
  ["the RAW end tag", "{{END_RAW}}"],
  ["heading_offset", "heading_offset"],
  ["the block escape mode", "escape_md=block"],
  ["the inline escape mode", "escape_md=inline"],
  ["the whitespace rule", "standalone"],
  ["the trim marker before a tag", "{{-"],
  ["the trim marker after a tag", "-}}"],
  ["the API option", "standaloneLines"],
  ["the CLI flag", "--no-standalone-lines"],
  ["the CLI opt-in flag", "--standalone-lines"],
  ["the node option label", "Remove Standalone Tag Lines"],
  ["skip_empty", "skip_empty"],
];

describe("sf-docs: README documents the prompt-aware constructs", () => {
  it.each(readmeNeedles)("sf-docs: README documents %s", (_label, needle) => {
    expect(readme).toContain(needle);
  });

  it("sf-docs: the README describes the standalone option on the API, the CLI and the node", () => {
    const api = /options[^\n]*standaloneLines|standaloneLines[^\n]*options/i;
    expect(readme).toMatch(api);
    expect(readme).toMatch(/--no-standalone-lines[\s\S]*Remove Standalone Tag Lines|Remove Standalone Tag Lines[\s\S]*--no-standalone-lines/);
  });

  it("sf-docs: the README explains that a backslash before the brace pair outputs it literally", () => {
    const lines = readme.split("\n").filter((l) => l.includes(String.fromCharCode(92) + "{{"));
    expect(lines.some((l) => /literal|escape/i.test(l))).toBe(true);
  });

  it("sf-docs: the changelog mentions SECTION and FENCE", () => {
    expect(changelog).toContain("SECTION");
    expect(changelog).toContain("FENCE");
  });
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

``````diff
diff --git a/README.md b/README.md
index 16d8f2d..28937c4 100644
--- a/README.md
+++ b/README.md
@@ -95,12 +95,16 @@ Author: ${{author ?? "Anonymous"}}
 
 Transform values before output.
 
-| Filter      | Example                  | Description                        |
-| ----------- | ------------------------ | ---------------------------------- |
-| `trim`      | `${{text \| trim}}`      | Remove leading/trailing whitespace |
-| `head=N`    | `${{text \| head=100}}`  | First N characters                 |
-| `tail=N`    | `${{text \| tail=50}}`   | Last N characters                  |
-| `escape_md` | `${{text \| escape_md}}` | Escape markdown special characters |
+| Filter              | Example                         | Description                                                                 |
+| ------------------- | ------------------------------- | --------------------------------------------------------------------------- |
+| `trim`              | `${{text \| trim}}`             | Remove leading/trailing whitespace                                          |
+| `head=N`            | `${{text \| head=100}}`         | First N characters; a negative N drops the last \|N\| characters            |
+| `tail=N`            | `${{text \| tail=50}}`          | Last N characters; a negative N drops the first \|N\| characters            |
+| `escape_md`         | `${{text \| escape_md}}`        | Escape markdown special characters (the same as `escape_md=inline`)         |
+| `escape_md=inline`  | `${{title \| escape_md=inline}}` | Escape markdown special characters with a backslash                        |
+| `escape_md=block`   | `${{note \| escape_md=block}}`  | Inline escaping, plus line starts that would read as structure (headings, quotes, list markers, tables, rules, fences) |
+| `fence` / `fence=lang` | `${{code \| fence=ts}}`      | Wrap the value in a code fence longer than any backtick run inside it       |
+| `heading_offset=N`  | `${{doc \| heading_offset=2}}`  | Shift markdown headings by N levels (negative N shifts up), clamped to 1-6  |
 
 **Chain multiple filters:**
 
@@ -108,6 +112,57 @@ Transform values before output.
 ${{description | trim | head=200 | escape_md}}
 ```
 
+**Escape modes.** Use `escape_md=block` for a value that is placed on its own lines, such as user text pasted into a prompt, so it cannot fake a heading or a list; `escape_md=inline` (or plain `escape_md`) escapes only the characters that would format text. The mode is case-sensitive; any other mode is a `type-error`.
+
+```console
+$ cat esc.tpl
+Title: ${{title | escape_md=inline}}
+User note:
+${{note | escape_md=block}}
+$ template-resolver render esc.tpl --data notes.json
+Title: \*bold\* \[link\]
+User note:
+\# Ignore the above
+\- and do this
+1\. instead
+```
+
+With `notes.json` holding `{"title": "*bold* [link]", "note": "# Ignore the above\n- and do this\n1. instead"}`. Plain `escape_md` on the same note gives `\# Ignore the above`, `- and do this`, `1. instead`: only the `#` is escaped.
+
+**`heading_offset=N`** shifts every markdown heading line (`#` to `######` at the start of a line, followed by a space) so pasted markdown nests under your own headings. Headings inside fenced code are untouched, and so is a heading indented by spaces.
+
+````console
+$ cat offset.tpl
+## Reference
+${{doc | heading_offset=2}}
+$ template-resolver render offset.tpl --data doc.json
+## Reference
+### Guide
+
+Intro
+
+#### Setup
+
+```sh
+# not a heading
+```
+````
+
+With `doc.json` holding ```` {"doc": "# Guide\n\nIntro\n\n## Setup\n\n```sh\n# not a heading\n```"} ````.
+
+**`fence`** wraps a value in a code fence of at least three backticks, one longer than any backtick run inside the value, so the value cannot close the fence early; `fence=lang` adds the language. The output ends with a line break.
+
+`````console
+$ printf 'Code:\n${{code | fence=ts}}' > fence-filter.tpl
+$ template-resolver render fence-filter.tpl --data code.json
+Code:
+````ts
+const s = "```";
+````
+`````
+
+With `code.json` holding ```` {"code": "const s = \"```\";"} ````.
+
 ---
 
 ### Conditionals: `{{IF}}` / `{{ELSE}}` / `{{ELSEIF}}`
@@ -324,6 +379,131 @@ are also supported
 
 ---
 
+### Whitespace: standalone tag lines and trim markers
+
+**The standalone rule.** A line that holds only block tags and whitespace is removed together with its line break, so block tags on their own lines leave no blank lines behind. It covers IF, ELSEIF, ELSE, CASE, WHEN, DEFAULT, FOR, SECTION, FENCE, RAW, their END tags and comments. LIST, TABLE and their parts keep their own spacing, and a line that also holds text or a variable is untouched.
+
+```console
+$ cat standalone.tpl
+Intro
+{{IF vip}}
+VIP customer
+{{END_IF}}
+Outro
+$ template-resolver render standalone.tpl --data vip.json
+Intro
+VIP customer
+Outro
+$ template-resolver render standalone.tpl --data vip.json --no-standalone-lines
+Intro
+
+VIP customer
+
+Outro
+```
+
+With `vip.json` holding `{"vip": true}`. The rule is on by default everywhere; turn it off with the `standaloneLines: false` render option, `options.standaloneLines` in the HTTP API, `--no-standalone-lines` on the command line, or by disabling **Remove Standalone Tag Lines** in the n8n node.
+
+**Trim markers.** `{{- TAG}}` removes all whitespace (spaces, tabs, line breaks) before the tag, and `{{TAG -}}` all whitespace after it; comments take `{{-# ... #-}}`. Markers work whether the standalone rule is on or off. They apply first; a tag line whose line break before it was trimmed then shares its line with the preceding text, so it is no longer standalone and its own line break stays:
+
+```console
+$ cat trim.tpl
+Tags:
+{{- FOR tags AS t}} ${{t}}{{END_FOR}}
+$ template-resolver render trim.tpl --data tags.json
+Tags: api llm
+$ cat trim-both.tpl
+[
+  {{- FOR xs AS x -}}
+  ${{x}},
+  {{- END_FOR -}}
+]
+$ template-resolver render trim-both.tpl --data xs.json
+[1,2,3,]
+```
+
+With `tags.json` holding `{"tags": ["api", "llm"]}` and `xs.json` holding `{"xs": [1, 2, 3]}`.
+
+---
+
+### Literal text: `{{RAW}}` and `\{{`
+
+`{{RAW}}...{{END_RAW}}` outputs its content literally: tags, variables and comments inside are not interpreted. A backslash right before `{{` escapes it: `\{{` outputs a literal `{{` and the backslash is consumed. `\\{{` outputs one literal backslash followed by an active tag. A backslash anywhere else is ordinary text.
+
+```console
+$ cat raw.tpl
+Write a template like this:
+{{RAW}}
+Hello ${{name}}! {{IF vip}}VIP{{END_IF}}
+{{END_RAW}}
+Inline: \{{IF x}} is not a tag, ${{name}} is a variable.
+$ template-resolver render raw.tpl --data name.json
+Write a template like this:
+Hello ${{name}}! {{IF vip}}VIP{{END_IF}}
+Inline: {{IF x}} is not a tag, Alice is a variable.
+$ cat path.tpl
+Path: C:\\{{IF x}}yes{{END_IF}}
+$ template-resolver render path.tpl --data x.json
+Path: C:\yes
+```
+
+With `name.json` holding `{"name": "Alice"}` and `x.json` holding `{"x": true}`.
+
+---
+
+### Sections: `{{SECTION}}`
+
+`{{SECTION "Title" level=2}}...{{END_SECTION}}` outputs a markdown heading (`level` 1 to 6, default 2), a blank line and the body with its leading and trailing blank lines trimmed. The title is a quoted string or a variable path. When the body renders empty, the whole section is omitted and `stats.sectionsOmitted` counts it; `skip_empty=false` keeps the heading of an empty section instead. An omitted section removes only its own output: the blank lines the template holds around it stay.
+
+```console
+$ cat section.tpl
+{{SECTION "Context"}}
+${{context}}
+{{END_SECTION}}
+
+{{SECTION "Examples" level=3}}
+{{FOR examples AS e}}
+- ${{e}}
+{{END_FOR}}
+{{END_SECTION}}
+
+{{SECTION "Notes" skip_empty=false}}
+${{notes ?? ""}}
+{{END_SECTION}}
+$ template-resolver render section.tpl --data section.json
+## Context
+
+The user asks about billing.
+
+
+## Notes
+```
+
+With `section.json` holding `{"context": "The user asks about billing.", "examples": []}`: the empty Examples section is omitted (its surrounding blank lines remain) and `--json` reports `"sectionsOmitted": 1`.
+
+---
+
+### Code fences: `{{FENCE}}`
+
+`{{FENCE lang="ts"}}...{{END_FENCE}}` wraps its rendered body in a code fence of at least three backticks, one longer than any backtick run inside the body, so pasted code cannot close the fence early. `lang` is optional and takes a quoted string or a variable path. One leading and one trailing line break of the body are removed.
+
+`````console
+$ cat fence.tpl
+Review this file:
+{{FENCE lang="ts"}}
+${{code}}
+{{END_FENCE}}
+$ template-resolver render fence.tpl --data code.json
+Review this file:
+````ts
+const s = "```";
+````
+`````
+
+With `code.json` as in the `fence` filter example above.
+
+---
+
 ### Math: `${{a + b}}`
 
 Basic arithmetic in variable expressions:
@@ -413,6 +593,7 @@ What counts as **false**:
 | **Template**                | Your template text with syntax markers      |
 | **Variable Mappings**       | Connect template variables to workflow data |
 | **Strict Mode**             | Error on missing variables (default: on)    |
+| **Remove Standalone Tag Lines** | Remove lines that hold only block tags (default: on); see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers) |
 | **Show Detected Variables** | Include metadata in output                  |
 | **Output Field Name**       | Name for the resolved text field            |
 
@@ -519,7 +700,7 @@ ${{current_message}}
 
 ## Structured render result
 
-Every render, whether through the command line (`--json`), the HTTP API (`POST /v1/render`) or core's `render(template, data, options)`, returns the same object. Template and data problems never throw; they come back in the result.
+Every render, whether through the command line (`--json`), the HTTP API (`POST /v1/render`) or core's `render(template, data, options)`, returns the same object. Template and data problems never throw; they come back in the result. Core's render options include `strictMode` (default `true`), `standaloneLines` (default `true`, see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers)) and `limits`.
 
 ```json
 {
@@ -543,7 +724,7 @@ Every render, whether through the command line (`--json`), the HTTP API (`POST /
 | `messages`              | Always `[]` for now (reserved for message blocks)                                        |
 | `stats.chars`           | Length of `output`                                                                       |
 | `stats.estTokens`       | Token estimate, `ceil(chars / 4)`: roughly +/-30 percent for English prose               |
-| `stats.sectionsOmitted` | Always `0` for now (reserved for section blocks)                                         |
+| `stats.sectionsOmitted` | Number of `SECTION` blocks omitted because their body rendered empty                     |
 | `stats.iterations`      | FOR iterations run in total, also reported when the render failed                        |
 | `diagnostics`           | On failure, one diagnostic: the error that stopped rendering                             |
 
@@ -558,7 +739,7 @@ Render and validate results (`render`, `validate`, `POST /v1/render`, `POST /v1/
 | `syntax-error`     | error    | The template does not parse: unknown tag, unclosed block, bad `FOR` syntax, stray `END_*`             |
 | `type-error`       | error    | An operation fails on its values: non-numeric comparison or math, bad filter parameters, non-array `FOR` in strict mode |
 | `missing-variable` | error    | Strict mode and a placeholder reads a variable that is not in the data and has no `??` default         |
-| `unknown-filter`   | error    | A filter other than `head`, `tail`, `trim`, `escape_md`                                                 |
+| `unknown-filter`   | error    | A filter other than `head`, `tail`, `trim`, `escape_md`, `fence`, `heading_offset`                      |
 | `limit-iterations` | error    | FOR loops ran more than `maxIterations` iterations in total                                            |
 | `limit-output`     | error    | The output grew past `maxOutputChars`                                                                  |
 | `limit-depth`      | error    | Blocks nest deeper than `maxDepth`                                                                     |
@@ -571,7 +752,7 @@ Render and validate results (`render`, `validate`, `POST /v1/render`, `POST /v1/
 
 | Code                     | When                                                                                         |
 | ------------------------ | -------------------------------------------------------------------------------------------- |
-| `unknown-filter`         | A filter other than `head`, `tail`, `trim`, `escape_md`                                      |
+| `unknown-filter`         | A filter other than `head`, `tail`, `trim`, `escape_md`, `fence`, `heading_offset`           |
 | `unrecognized-condition` | A condition the engine cannot read, such as `{{IF status is active}}` (`validate` reports it as `analysis-warning`) |
 | `syntax-error`, `limit-depth` | `POST /v1/analyze` only: the template does not parse; the result has empty `variables`, `filters` and `blocks` and this one diagnostic |
 
@@ -609,7 +790,7 @@ template-resolver <command> [options]
 | `template-resolver render <file\|->`       | Renders a template and prints the output to stdout                       |
 | `template-resolver validate <file\|->`     | Checks a template without data; prints `{ok, diagnostics}` as JSON       |
 | `template-resolver analyze <file\|->`      | Prints the variables, filters and blocks a template uses, as JSON        |
-| `template-resolver spec`                   | Prints the template language spec as JSON (blocks, filters, operators, default limits, syntax) |
+| `template-resolver spec`                   | Prints the template language spec as JSON (blocks, filters, operators, default limits, render options, syntax) |
 | `template-resolver serve`                  | Starts the HTTP API                                                      |
 
 Exit codes for every command:
@@ -628,6 +809,7 @@ Exit codes for every command:
 | -------------------------------------- | ------------------------------------------------------------------------ |
 | `--data <file\|->`                     | JSON object with the variables (default `{}`)                            |
 | `--strict` / `--no-strict`             | Strict mode is on by default; `--no-strict` renders missing variables as `""`; the two cannot be combined |
+| `--standalone-lines` / `--no-standalone-lines` | The [standalone rule](#whitespace-standalone-tag-lines-and-trim-markers) is on by default; `--no-standalone-lines` keeps lines that hold only block tags; the two cannot be combined (exit 2) |
 | `--max-iterations n`                   | Lower or raise `maxIterations`                                           |
 | `--max-output-chars n`                 | Lower or raise `maxOutputChars`                                          |
 | `--max-depth n`                        | Lower or raise `maxDepth`                                                |
@@ -773,22 +955,43 @@ $ template-resolver analyze greeting.tpl
 }
 ```
 
-`spec` (the end of it, with the default limits):
+`spec` (the end of it, with the default limits, the render options and the syntax):
 
 ```console
-$ template-resolver spec | tail -n 10
+$ template-resolver spec | tail -n 19
   "limits": {
     "maxIterations": 10000,
     "maxOutputChars": 1000000,
     "maxDepth": 32
   },
+  "options": [
+    {
+      "name": "standaloneLines",
+      "default": "true for render, false for resolveTemplate",
+      "description": "Removes a line holding only block tags and whitespace, with its line break; LIST, TABLE and their parts keep their own spacing"
+    }
+  ],
   "syntax": {
     "variable": "${{path.to.value ?? \"default\" | filter=arg}}",
-    "comment": "{{# comment #}}"
+    "comment": "{{# comment #}}",
+    "trim": "{{- TAG}} trims whitespace before a tag and {{TAG -}} after it; comments take {{-# comment #-}}",
+    "escape": "\\{{ outputs {{ literally"
   }
 }
 ```
 
+Both standalone flags together are a usage error:
+
+```console
+$ template-resolver render standalone.tpl --data vip.json --standalone-lines --no-standalone-lines
+template-resolver: --standalone-lines and --no-standalone-lines cannot be combined
+
+Usage: template-resolver <command> [options]
+...
+$ echo $?
+2
+```
+
 Usage errors exit 2:
 
 ```console
@@ -799,8 +1002,10 @@ Usage: template-resolver <command> [options]
 
 Commands:
   render <template-file|-> [--data <file|->] [--strict | --no-strict]
+         [--standalone-lines | --no-standalone-lines]
          [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]
-      Render a template and print the output.
+      Render a template and print the output. A line holding only block tags
+      is removed by default; --no-standalone-lines keeps it.
   validate <template-file|->   Check a template; prints {ok, diagnostics} as JSON.
   analyze <template-file|->    Print the variables, filters and blocks a template uses.
   spec                         Print the template language spec as JSON.
@@ -827,7 +1032,7 @@ The API is stateless JSON over HTTP. It listens on loopback (`127.0.0.1`) by def
 
 | Route                   | Request body                                         | 200 response                              |
 | ----------------------- | ---------------------------------------------------- | ----------------------------------------- |
-| `POST /v1/render`       | `{template, data?, options?: {strictMode?, limits?}}` | The [structured render result](#structured-render-result) |
+| `POST /v1/render`       | `{template, data?, options?: {strictMode?, standaloneLines?, limits?}}` | The [structured render result](#structured-render-result) |
 | `POST /v1/validate`     | `{template}`                                         | `{ok, diagnostics}`                       |
 | `POST /v1/analyze`      | `{template}`                                         | The analysis (variables, filters, blocks, diagnostics) |
 | `GET /v1/spec`          |                                                      | The template language spec                |
@@ -835,7 +1040,7 @@ The API is stateless JSON over HTTP. It listens on loopback (`127.0.0.1`) by def
 
 - POST bodies must be JSON with `Content-Type: application/json`, at most 1 MiB.
 - Template problems are results, not HTTP errors: `200` with `ok: false` and diagnostics. An `analyze` of a template that does not parse returns `200` with empty variables and the error in `diagnostics`.
-- `options.strictMode` defaults to `true`. `options.limits` takes `maxIterations`, `maxOutputChars` and `maxDepth`; a request can only lower the server's limits, so a value above the server's is capped at the server's. `validate` and `analyze` use the server's `maxDepth`.
+- `options.strictMode` defaults to `true`. `options.standaloneLines` (boolean) defaults to `true`; `false` keeps lines that hold only block tags (see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers)). `options.limits` takes `maxIterations`, `maxOutputChars` and `maxDepth`; a request can only lower the server's limits, so a value above the server's is capped at the server's. `validate` and `analyze` use the server's `maxDepth`.
 
 Request errors are `{"error": {"code", "message"}}`:
 
@@ -861,6 +1066,16 @@ $ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/
 {"ok":false,"output":"","messages":[],"stats":{"chars":0,"estTokens":0,"sectionsOmitted":0,"iterations":0},"diagnostics":[{"severity":"error","code":"missing-variable","message":"Variable 'name' not found","line":1,"column":7,"suggestion":"No variables defined. Check variable mappings."}]}
 ```
 
+A request that turns the standalone rule off, and one whose `standaloneLines` is not a boolean:
+
+```console
+$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "Intro\n{{IF vip}}\nVIP customer\n{{END_IF}}\nOutro\n", "data": {"vip": true}, "options": {"standaloneLines": false}}'
+{"ok":true,"output":"Intro\n\nVIP customer\n\nOutro\n","messages":[],"stats":{"chars":27,"estTokens":7,"sectionsOmitted":0,"iterations":0},"diagnostics":[]}
+$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "x", "options": {"standaloneLines": "no"}}'
+{"error":{"code":"invalid-request","message":"options.standaloneLines must be a boolean"}}
+400
+```
+
 A request that lowers a limit:
 
 ```console
@@ -876,6 +1091,8 @@ $ curl -s -X POST http://127.0.0.1:3000/v1/validate -H 'Content-Type: applicatio
 ```console
 $ curl -s -X POST http://127.0.0.1:3000/v1/analyze -H 'Content-Type: application/json' -d '{"template": "${{user.name ?? \"guest\"}} ${{note | trim}}"}'
 {"variables":[{"name":"user","paths":["user.name"],"usedIn":["output"],"optional":true,"required":false},{"name":"note","paths":["note"],"usedIn":["output"],"optional":false,"required":true}],"filters":[{"name":"trim","count":1}],"blocks":{},"diagnostics":[]}
+$ curl -s -X POST http://127.0.0.1:3000/v1/analyze -H 'Content-Type: application/json' -d '{"template": "{{SECTION \"Code\"}}\n{{FENCE lang=\"ts\"}}\n${{code}}\n{{END_FENCE}}\n{{END_SECTION}}\n"}'
+{"variables":[{"name":"code","paths":["code"],"usedIn":["output"],"optional":false,"required":true}],"filters":[],"blocks":{"SECTION":1,"FENCE":1},"diagnostics":[]}
 ```
 
 ```console
diff --git a/api/openapi.json b/api/openapi.json
index 6e5013f..9bf9e01 100644
--- a/api/openapi.json
+++ b/api/openapi.json
@@ -146,7 +146,7 @@
         "summary": "Describe the template language",
         "responses": {
           "200": {
-            "description": "Blocks, filters, condition operators, default limits and syntax",
+            "description": "Blocks, filters, condition operators, default limits, render options and syntax",
             "content": {
               "application/json": {
                 "schema": {
@@ -248,6 +248,11 @@
               "strictMode": {
                 "type": "boolean"
               },
+              "standaloneLines": {
+                "type": "boolean",
+                "default": true,
+                "description": "Removes a line holding only block tags (IF, CASE, FOR, SECTION, FENCE, RAW and their parts), comments and whitespace, with its line break; LIST, TABLE and their parts keep their own spacing. Trim markers {{- and -}} apply either way"
+              },
               "limits": {
                 "$ref": "#/components/schemas/RequestLimits"
               }
@@ -491,30 +496,11 @@
           },
           "blocks": {
             "type": "object",
-            "description": "Count per block kind present in the template",
-            "properties": {
-              "IF": {
-                "type": "integer",
-                "minimum": 1
-              },
-              "CASE": {
-                "type": "integer",
-                "minimum": 1
-              },
-              "FOR": {
-                "type": "integer",
-                "minimum": 1
-              },
-              "LIST": {
-                "type": "integer",
-                "minimum": 1
-              },
-              "TABLE": {
-                "type": "integer",
-                "minimum": 1
-              }
-            },
-            "additionalProperties": false
+            "description": "Count per block kind present in the template, keyed by block name (IF, CASE, FOR, LIST, TABLE, SECTION, FENCE)",
+            "additionalProperties": {
+              "type": "integer",
+              "minimum": 1
+            }
           },
           "diagnostics": {
             "type": "array",
@@ -532,6 +518,7 @@
           "filters",
           "operators",
           "limits",
+          "options",
           "syntax"
         ],
         "properties": {
@@ -594,11 +581,36 @@
           "limits": {
             "$ref": "#/components/schemas/Limits"
           },
+          "options": {
+            "type": "array",
+            "description": "Render options, such as standaloneLines, with their defaults",
+            "items": {
+              "type": "object",
+              "required": [
+                "name",
+                "default",
+                "description"
+              ],
+              "properties": {
+                "name": {
+                  "type": "string"
+                },
+                "default": {
+                  "type": "string"
+                },
+                "description": {
+                  "type": "string"
+                }
+              }
+            }
+          },
           "syntax": {
             "type": "object",
             "required": [
               "variable",
-              "comment"
+              "comment",
+              "trim",
+              "escape"
             ],
             "properties": {
               "variable": {
@@ -606,6 +618,14 @@
               },
               "comment": {
                 "type": "string"
+              },
+              "trim": {
+                "type": "string",
+                "description": "The trim markers {{- and -}}"
+              },
+              "escape": {
+                "type": "string",
+                "description": "How to output a literal {{"
               }
             }
           }
diff --git a/api/routes.ts b/api/routes.ts
index 6cb8975..4ccb4b1 100644
--- a/api/routes.ts
+++ b/api/routes.ts
@@ -52,8 +52,12 @@ function renderRoute(body: Record<string, unknown>, context: RouteContext): unkn
   if (options.strictMode !== undefined && typeof options.strictMode !== "boolean") {
     invalid("options.strictMode must be a boolean");
   }
+  if (options.standaloneLines !== undefined && typeof options.standaloneLines !== "boolean") {
+    invalid("options.standaloneLines must be a boolean");
+  }
   return render(template, data, {
     strictMode: options.strictMode,
+    standaloneLines: options.standaloneLines,
     limits: lowerLimits(context.limits, options.limits),
     tokenEstimator: context.tokenEstimator,
   });
diff --git a/changelog.md b/changelog.md
index 327114d..8313a55 100644
--- a/changelog.md
+++ b/changelog.md
@@ -13,6 +13,12 @@
 - Command line `template-resolver` with `render`, `validate`, `analyze`, `spec` and `serve`; exit codes 0, 1 and 2
 - HTTP API: `POST /v1/render`, `POST /v1/validate`, `POST /v1/analyze`, `GET /v1/spec`, `GET /v1/openapi.json`, on loopback by default, with a committed OpenAPI 3.1 document; request limits can only lower the server's
 - README documents the result, the diagnostics, the limits, the command line and the HTTP API; missing variables are now described as an error in strict mode
+- Whitespace: a line holding only block tags (IF, CASE, FOR, SECTION, FENCE, RAW, their parts and comments) is removed with its line break; the `standaloneLines` render option turns this off (`options.standaloneLines` in the HTTP API, `--no-standalone-lines` and `--standalone-lines` on the command line, "Remove Standalone Tag Lines" in the n8n node); trim markers `{{-` and `-}}` remove whitespace before or after a tag
+- `{{RAW}}...{{END_RAW}}` outputs its content literally and `\{{` outputs a literal `{{`
+- `{{SECTION "Title" level=2}}` outputs a markdown heading and its body, and is omitted (counted in `stats.sectionsOmitted`) when the body renders empty unless `skip_empty=false`
+- `{{FENCE lang="..."}}` and the `fence` filter wrap content in a code fence longer than any backtick run inside it
+- `heading_offset=N` shifts markdown headings; `escape_md=block` also escapes line starts that would read as structure, `escape_md=inline` is the existing behavior
+- The OpenAPI document describes `options.standaloneLines`, the render options and trim and escape syntax in the spec, and accepts every block kind in the analysis `blocks` counts
 
 ### 1.0.0
 
diff --git a/cli/main.ts b/cli/main.ts
index 304c956..a79841f 100644
--- a/cli/main.ts
+++ b/cli/main.ts
@@ -14,8 +14,10 @@ const USAGE = `Usage: template-resolver <command> [options]
 
 Commands:
   render <template-file|-> [--data <file|->] [--strict | --no-strict]
+         [--standalone-lines | --no-standalone-lines]
          [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]
-      Render a template and print the output.
+      Render a template and print the output. A line holding only block tags
+      is removed by default; --no-standalone-lines keeps it.
   validate <template-file|->   Check a template; prints {ok, diagnostics} as JSON.
   analyze <template-file|->    Print the variables, filters and blocks a template uses.
   spec                         Print the template language spec as JSON.
@@ -39,6 +41,8 @@ const COMMAND_OPTIONS: Record<string, Options> = {
     data: { type: "string" },
     strict: { type: "boolean" },
     "no-strict": { type: "boolean" },
+    "standalone-lines": { type: "boolean" },
+    "no-standalone-lines": { type: "boolean" },
     "max-iterations": { type: "string" },
     "max-output-chars": { type: "string" },
     "max-depth": { type: "string" },
@@ -116,11 +120,18 @@ async function runRender(values: Values, templatePath: string, io: CliIo): Promi
   if (values.strict && values["no-strict"]) {
     throw new UsageError("--strict and --no-strict cannot be combined");
   }
+  if (values["standalone-lines"] && values["no-standalone-lines"]) {
+    throw new UsageError("--standalone-lines and --no-standalone-lines cannot be combined");
+  }
   const limits = parseLimits(values);
   const template = await readInput(templatePath, io);
   const data = dataPath === undefined ? {} : parseData(await readInput(dataPath, io), dataPath);
 
-  const result = render(template, data, { strictMode: !values["no-strict"], limits });
+  const result = render(template, data, {
+    strictMode: !values["no-strict"],
+    standaloneLines: !values["no-standalone-lines"],
+    limits,
+  });
   if (values.json) {
     printJson(io, result);
   } else {
diff --git a/docs/living/architecture/modules/api.md b/docs/living/architecture/modules/api.md
index 7b15a67..6653274 100644
--- a/docs/living/architecture/modules/api.md
+++ b/docs/living/architecture/modules/api.md
@@ -27,7 +27,7 @@ Limits left out take core's defaults (`maxIterations` 10000, `maxOutputChars` 10
 
 | Route | Request body | Response (200) |
 |---|---|---|
-| POST /v1/render | `{template, data?, options?: {strictMode?, limits?}}` | core `render` result |
+| POST /v1/render | `{template, data?, options?: {strictMode?, standaloneLines?, limits?}}` | core `render` result |
 | POST /v1/validate | `{template}` | core `validate` result, `{ok, diagnostics}` |
 | POST /v1/analyze | `{template}` | core `analyze` result |
 | GET /v1/spec | | core `spec()` |
@@ -38,13 +38,18 @@ Limits left out take core's defaults (`maxIterations` 10000, `maxOutputChars` 10
 - `validate` and `analyze` run with the server's `maxDepth`. An `analyze` of a template that does not parse answers 200 with empty `variables`, `filters` and `blocks` and the parse error (`syntax-error` or `limit-depth`) in `diagnostics`. Analysis diagnostics have the shape `{code, message, line, column}`, without the `severity` and `suggestion` of render and validate diagnostics; besides parse errors their codes are `unknown-filter` and `unrecognized-condition`.
 - The query string is ignored when matching a route. The OpenAPI document is served in the committed file's exact serialization.
 
+### Standalone lines and the prompt-aware constructs
+
+- `options.standaloneLines` (boolean) is passed to core `render`; omitted, it takes core's default (true: lines holding only block tags are removed). A non-boolean value is 400 `invalid-request`.
+- The OpenAPI document describes `options.standaloneLines`, the `options` and the trim and escape `syntax` entries of `spec()`, and types the analysis `blocks` as a map of block name to count, so `SECTION` and `FENCE` counts validate. The new blocks and filters need no other change in the api: they reach it through core.
+
 ## Failure handling
 
 Template problems are results, never HTTP errors: 200 with `ok: false` and diagnostics. Request problems answer `{error: {code, message}}`:
 
 | Status | Code | When |
 |---|---|---|
-| 400 | `invalid-request` | body not JSON or not an object; `template` not a string; `data`, `options` or `options.limits` not an object; `options.strictMode` not a boolean; a limit not a non-negative integer |
+| 400 | `invalid-request` | body not JSON or not an object; `template` not a string; `data`, `options` or `options.limits` not an object; `options.strictMode` or `options.standaloneLines` not a boolean; a limit not a non-negative integer |
 | 404 | `not-found` | no route has the path |
 | 405 | `method-not-allowed` | the path exists for another method; the `Allow` header lists the methods |
 | 413 | `payload-too-large` | the declared or streamed body exceeds `maxBodyBytes` |
diff --git a/docs/living/architecture/modules/cli.md b/docs/living/architecture/modules/cli.md
index b20c4d2..015cc90 100644
--- a/docs/living/architecture/modules/cli.md
+++ b/docs/living/architecture/modules/cli.md
@@ -25,13 +25,14 @@ Built to `dist/cli/index.js`, which `package.json` names as the bin `template-re
 
 | Command | Does |
 |---|---|
-| `render <template-file\|-> [--data <file\|->] [--strict \| --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]` | renders; output to stdout, diagnostics to stderr as `file:line:column: severity code: message`; `--json` prints the whole render result to stdout instead |
+| `render <template-file\|-> [--data <file\|->] [--strict \| --no-strict] [--standalone-lines \| --no-standalone-lines] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]` | renders; output to stdout, diagnostics to stderr as `file:line:column: severity code: message`; `--json` prints the whole render result to stdout instead |
 | `validate <template-file\|->` | prints core `validate`'s `{ok, diagnostics}` as JSON |
 | `analyze <template-file\|->` | prints core `analyze` as JSON, whose diagnostics are `{code, message, line, column}` (`unknown-filter`, `unrecognized-condition`); a template that does not parse prints its diagnostic to stderr |
 | `spec` | prints core `spec()` as JSON |
 | `serve [--port n] [--host h]` | starts the api module's server (default `127.0.0.1:3000`, default limits and body size), prints `listening on http://host:port`, and runs until the abort signal |
 
 - Strict mode is on unless `--no-strict`; `--strict` with `--no-strict` is a usage error. `--data` defaults to `{}` and must be a JSON object.
+- Standalone lines: render passes `standaloneLines` to core, true unless `--no-standalone-lines` (lines holding only block tags are removed); `--standalone-lines` states the default; giving both is a usage error. The prompt-aware blocks and filters (RAW, SECTION, FENCE, `fence`, `heading_offset`, `escape_md` modes, trim markers) need no cli change: they reach it through core.
 - Limit flags set the render's limits directly (they can raise as well as lower them); limits not given take core's defaults. `validate` and `analyze` use the defaults.
 - `-` reads stdin. Only one input may be stdin: `render - --data -` is a usage error, detected before anything is read. Diagnostics name stdin `<stdin>`.
 - JSON output is pretty-printed with two spaces and a trailing newline.
@@ -43,7 +44,7 @@ Built to `dist/cli/index.js`, which `package.json` names as the bin `template-re
 |---|---|
 | 0 | success; `validate` with warnings only; `--help`; `serve` after a clean shutdown |
 | 1 | template errors: render not ok, validate not ok, analyze cannot parse |
-| 2 | usage errors (no or unknown command, unknown option, wrong number of inputs, both inputs on stdin, a flag value that is not a non-negative integer, `--strict` with `--no-strict`), printed with the usage to stderr; I/O errors (unreadable file, invalid or non-object JSON data, a port that cannot be bound), printed as one line to stderr |
+| 2 | usage errors (no or unknown command, unknown option, wrong number of inputs, both inputs on stdin, a flag value that is not a non-negative integer, `--strict` with `--no-strict`, `--standalone-lines` with `--no-standalone-lines`), printed with the usage to stderr; I/O errors (unreadable file, invalid or non-object JSON data, a port that cannot be bound), printed as one line to stderr |
 
 Every message on stderr starts with `template-resolver: `. An unexpected exception is not caught by `main` and surfaces as a crash.
 
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index cc5ac7c..80d9f0b 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -74,15 +74,26 @@ The `value` description says it supports n8n expressions; the code only reads th
 
 Added after recovery, in the current tree (`core/src/render.ts`, `spec.ts`, `types.ts`, `errors.ts`, `estimate.ts`); the full contract is `docs/living/architecture/headless-contract.md`.
 
-- `render(template, data, { strictMode?, limits?, tokenEstimator? })` returns `{ ok, output, messages, stats: { chars, estTokens, sectionsOmitted, iterations }, diagnostics }` and never throws for template or data problems: on failure `ok` is false, `output` is `""` and the one diagnostic is the error that stopped rendering. `messages` is always `[]` and `sectionsOmitted` always 0 for now. `estTokens` defaults to `estimateTokens`, `Math.ceil(chars / 4)`.
+- `render(template, data, { strictMode?, standaloneLines?, limits?, tokenEstimator? })` returns `{ ok, output, messages, stats: { chars, estTokens, sectionsOmitted, iterations }, diagnostics }` and never throws for template or data problems: on failure `ok` is false, `output` is `""` and the one diagnostic is the error that stopped rendering. `messages` is always `[]` for now; `sectionsOmitted` counts the SECTION blocks omitted for an empty body. `estTokens` defaults to `estimateTokens`, `Math.ceil(chars / 4)`.
 - `validate(template, { limits? })` returns `{ ok, diagnostics }` without data: parse errors and unknown filters are errors; conditions `analyze` cannot read become warnings with code `analysis-warning`; `ok` is false only when an error is present.
 - A diagnostic is `{ severity, code, message, line, column, suggestion? }`. Every `TemplateError` carries a `code` (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`) and the 1-based line and column of the node that failed: runtime errors are relocated to the evaluating node, and plain `Error`s from filters or math become `type-error` there. `render` adds `invalid-input` for data that is not an object.
 - `Limits { maxIterations, maxOutputChars, maxDepth }` with `DEFAULT_LIMITS` 10000 (total FOR iterations across the render), 1000000 (output characters) and 32 (block nesting, enforced by the parser, so also by `analyze` and `validate`); `withDefaultLimits` fills omitted ones. `resolveTemplate` accepts `limits` too and keeps throwing.
-- `spec()` describes the language: `version` (the language version, `"1.0"`), `blocks`, `filters`, `operators`, the default `limits` and `syntax`.
-- `analyze` additionally reports `required` per variable (always `!optional`) and `blocks`, a count per block kind (`IF`, `CASE`, `FOR`, `LIST`, `TABLE`); it throws on a template that does not parse.
+- `spec()` describes the language: `version` (the language version, `"1.0"`), `blocks`, `filters`, `operators`, the default `limits`, the render `options` and `syntax` (variable, comment, trim markers, escape).
+- `analyze` additionally reports `required` per variable (always `!optional`) and `blocks`, a count per block kind (`IF`, `CASE`, `FOR`, `LIST`, `TABLE`, `SECTION`, `FENCE`); it throws on a template that does not parse.
 - The n8n node now detects variables with `analyze`, fails early in strict mode on unmapped required variables, renders with `render` and turns a failed result into a `NodeOperationError` carrying the first diagnostic's message, line and column.
 - Consumers besides the node: the api module (`api/`, HTTP) and the cli module (`cli/`, bin `template-resolver`) call `render`, `validate`, `analyze` and `spec` and add only transport; see `api.md` and `cli.md`.
 
+## Prompt-aware constructs
+
+Added in the current tree (`core/src/whitespace.ts`, the lexer, parser and interpreter, `filters.ts`, `spec.ts`); the full contract is `docs/living/architecture/prompt-aware-contract.md`.
+
+- Whitespace: the lexer passes its tokens through `applyWhitespace` before parsing. Trim markers `{{-` and `-}}` apply first; then, when `standaloneLines` is on, a line holding only block tags (IF, CASE, FOR, SECTION, FENCE, RAW, their parts and comments) and whitespace is removed with its line break. LIST, TABLE and their parts keep their own spacing. `standaloneLines` defaults to true for `render` and false for `resolveTemplate`.
+- `{{RAW}}...{{END_RAW}}` content is one literal text token; `\{{` outputs `{{` (the backslash is consumed) and `\\{{` outputs one backslash before an active tag.
+- `{{SECTION title level=N skip_empty=bool}}` outputs `<hashes> <title>`, a blank line and the trimmed body, or nothing (counted in `stats.sectionsOmitted`) when the body renders empty and skip_empty is true.
+- `{{FENCE lang=...}}` and the `fence[=lang]` filter wrap content in a backtick fence longer than any backtick run inside it.
+- Filters `heading_offset=N` (shifts ATX heading lines, clamped to 1 to 6, outside fenced code) and `escape_md=inline|block` (block adds line-start escaping).
+- The n8n node passes its `standaloneLines` parameter ("Remove Standalone Tag Lines", default true) to `render`.
+
 ## Behavior
 
 ### Tokenizing
diff --git a/docs/living/architecture/prompt-aware-contract.md b/docs/living/architecture/prompt-aware-contract.md
index 441e579..b74d0f6 100644
--- a/docs/living/architecture/prompt-aware-contract.md
+++ b/docs/living/architecture/prompt-aware-contract.md
@@ -10,13 +10,13 @@ Settled decisions apply: ADR 0001 (every block is `{{KEYWORD ...}}...{{END_KEYWO
 ## Whitespace
 
 - **Standalone rule.** A line that holds only whitespace and one or more block tags is removed together with its line break. Block tags for this rule: IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR, SECTION, END_SECTION, FENCE, END_FENCE, RAW, END_RAW and comments `{{# ... #}}`. LIST, LIST_ITEM, TABLE, HEADER, ROW and their END tags are not subject to the rule (they have their own spacing). Lines that also hold text or a variable are untouched.
-- **Trim markers.** `{{- TAG ...}}` removes all whitespace (spaces, tabs, line breaks) before the tag; `{{TAG ... -}}` removes all whitespace after it. Both may be combined. Trim markers apply first and standalone removal then applies to what remains, so a standalone tag line with a leading trim marker removes the line break before it as well as its own. They work on every block tag and comment, are independent of the standalone option, and are never part of an expression.
-- **Option.** `standaloneLines` (boolean) in render options; default `true` for `render` (and so for the API, CLI and the n8n node), default `false` for the legacy `resolveTemplate` string function so its existing tests keep their oracle. The n8n node gets a boolean option "Remove standalone tag lines" (default on).
+- **Trim markers.** `{{- TAG ...}}` removes all whitespace (spaces, tabs, line breaks) before the tag; `{{TAG ... -}}` removes all whitespace after it. Both may be combined. Trim markers apply first and the standalone rule then applies to what remains: after trimming, a tag line that now shares its line with preceding text is no longer standalone, so its own line break stays (`a\n{{- IF x}}\nb\n{{END_IF}}\n` with x true renders `a\nb\n`). They work on every block tag and comment, are independent of the standalone option, and are never part of an expression.
+- **Option.** `standaloneLines` (boolean) in render options; default `true` for `render` (and so for the API, CLI and the n8n node), default `false` for the legacy `resolveTemplate` string function so its existing tests keep their oracle. The n8n node gets a boolean option "Remove Standalone Tag Lines" (`standaloneLines`, default on).
 
 ## RAW and escaping
 
 - `{{RAW}}...{{END_RAW}}` outputs its content literally (no tags, variables or comments are interpreted; CRLF becomes LF; spaces are kept). An unclosed RAW is a `syntax-error` located at the RAW tag. With standaloneLines off, a line break right after the RAW tag is part of the literal content.
-- `\{{` outputs `{{` literally (the backslash is consumed); a backslash not followed by `{{` is ordinary text. `\\{{` is a literal backslash followed by an active tag (only a single backslash directly before `{{` escapes).
+- `\{{` outputs `{{` literally (the backslash is consumed); a backslash not followed by `{{` is ordinary text. `\\{{` outputs one literal backslash followed by an active tag (only a single backslash directly before `{{` escapes).
 
 ## SECTION
 
@@ -24,12 +24,12 @@ Settled decisions apply: ADR 0001 (every block is `{{KEYWORD ...}}...{{END_KEYWO
 
 - Output is `<hashes> <title>`, a blank line, the body with leading and trailing blank lines trimmed, and one trailing line break. Consecutive sections are separated by exactly the blank lines the template holds between them (the SECTION tag lines vanish under the standalone rule), nothing is added. Body line breaks are normalized to LF.
 - With skip_empty=false an empty section outputs only the heading line and its line break (a heading line such as `## Title` followed by one line break).
-- When the rendered body is empty (only whitespace) and skip_empty is true, nothing is output (heading and spacing included) and `stats.sectionsOmitted` counts it.
+- When the rendered body is empty (only whitespace) and skip_empty is true, nothing is output (heading and spacing included) and `stats.sectionsOmitted` counts it. The blank lines the template holds around an omitted section stay.
 - A section nests like any block (counts toward maxDepth); an empty or non-string title, a non-integer level or a non-boolean skip_empty is a `type-error` located at the SECTION tag; a stray END_SECTION or an unclosed SECTION is a `syntax-error`. analyze reports variables read in a title or body with usedIn `output`.
 
 ## Filters
 
-- `heading_offset=N` (integer, may be negative): shifts every markdown ATX heading line (`#` to `######` followed by a space) by N levels, clamped to 1 to 6; headings inside fenced code blocks and non-heading `#` text are untouched. Missing or non-integer parameter is a `type-error`.
+- `heading_offset=N` (integer, may be negative): shifts every markdown ATX heading line (`#` to `######` followed by a space) by N levels, clamped to 1 to 6; headings inside fenced code blocks, headings indented by spaces and non-heading `#` text are untouched. Missing or non-integer parameter is a `type-error`.
 - `escape_md=inline` (default, the existing behavior; plain `escape_md` is inline) and `escape_md=block`: inline escaping plus line-start escaping so a value cannot fake structure (block mode adds nothing for characters inline mode already escapes; otherwise a backslash before a leading `#`, `>`, `-`, `+`, `*`, `|`, the `.` or `)` that follows a leading digit run (written `1\.`, since digits cannot be escaped), a line of three or more `-`, `=`, `` ` `` or `~` gets one backslash before its first character). Modes are case-sensitive; an empty or any other mode is a `type-error`.
 - `fence` (optional `lang`): wraps the value in an auto-sized fence, same rules as FENCE below.
 
@@ -39,4 +39,4 @@ Settled decisions apply: ADR 0001 (every block is `{{KEYWORD ...}}...{{END_KEYWO
 
 ## Surfaces
 
-`spec()` lists every new block and filter and the new option; the API and CLI accept `standaloneLines` (API: `options.standaloneLines`; CLI: `--no-standalone-lines`); the OpenAPI document and the README describe them.
+`spec()` lists every new block and filter and the new option; the API and CLI accept `standaloneLines` (API: `options.standaloneLines`, a boolean, anything else is 400 `invalid-request`; CLI: `--no-standalone-lines` and `--standalone-lines`, both together a usage error, exit 2); the n8n node passes its "Remove Standalone Tag Lines" option to `render`; the OpenAPI document and the README describe them.
diff --git a/n8n/TemplateResolver.node.ts b/n8n/TemplateResolver.node.ts
index 2d3f7dd..d06eec5 100644
--- a/n8n/TemplateResolver.node.ts
+++ b/n8n/TemplateResolver.node.ts
@@ -129,6 +129,14 @@ By \${{author}}
         description:
           "Whether to throw an error if template variables are missing. If disabled, missing variables become empty strings.",
       },
+      {
+        displayName: "Remove Standalone Tag Lines",
+        name: "standaloneLines",
+        type: "boolean",
+        default: true,
+        description:
+          "Whether to remove a line that holds only block tags such as {{IF}} or {{END_FOR}}, with its line break. If disabled, such lines leave blank lines in the output.",
+      },
       {
         displayName: "Show Detected Variables",
         name: "showDetectedVariables",
@@ -166,6 +174,11 @@ By \${{author}}
           "strictMode",
           itemIndex
         ) as boolean;
+        const standaloneLines = this.getNodeParameter(
+          "standaloneLines",
+          itemIndex,
+          true
+        ) as boolean;
         const showDetectedVariables = this.getNodeParameter(
           "showDetectedVariables",
           itemIndex
@@ -240,6 +253,7 @@ By \${{author}}
 
         const result = render(template, Object.fromEntries(variables), {
           strictMode,
+          standaloneLines,
         });
         if (!result.ok) {
           throw new NodeOperationError(
diff --git a/tests/promptaware/surfaces.test.ts b/tests/promptaware/surfaces.test.ts
index 1047e0f..1db49d6 100644
--- a/tests/promptaware/surfaces.test.ts
+++ b/tests/promptaware/surfaces.test.ts
@@ -12,7 +12,7 @@ const IF_ON = "a\nb\nc\n";
 const IF_OFF = "a\n\nb\n\nc\n";
 const FOR_TEMPLATE = "{{FOR xs AS x}}\n- ${{x}}\n{{END_FOR}}\nend\n";
 const FOR_ON = "- 1\n- 2\nend\n";
-const FOR_OFF = "\n- 1\n\n- 2\n\n\nend\n";
+const FOR_OFF = "\n- 1\n\n- 2\n\nend\n";
 
 let running: Running | undefined;
 afterEach(async () => {
``````

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/promptaware/surfaces.test.ts tests/promptaware/golden-render.test.ts tests/promptaware/docs.test.ts --json`
- Exit status: 0
- Tests: 54 passed, 0 failed
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
