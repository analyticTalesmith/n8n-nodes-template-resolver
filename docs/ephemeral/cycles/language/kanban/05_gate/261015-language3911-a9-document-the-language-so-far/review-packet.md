---
type: review-packet
card: 261015-language3911-a9-document-the-language-so-far
tier: product
built_at: 2026-10-15T05:34:28.459Z
base: 51d779206f8a0e15e506b54dba1b32a25aa3e92e
head: 80572368a79b67d6f0cdf482420fac980219ac5d
read_at: 80572368a79b67d6f0cdf482420fac980219ac5d
frozen: true
brief_sha256: 11b3fc3cfb707e04398e6c112a4f50c693d4b13990c34629f186abee09100858
manifest_sha256: fe5f4846528bc40ca3cbef31f3e224264c8decba8c3bcfa252a2d97b710681dc
criteria_sha256: 666380ac502bfd0bcbb26f0c0d596fb6c2a79f7923250d88f9530a84a203ea7b
scope_sha256: 41fd62fc29482dd06863d9fee0ce28e9f4f0ae0a7c9ceea2153e950e1d90ddcc
diff_sha256: 4671e991b653963f51cc71073649b1d45e79744406bea0ad092bb3d63aa458b3
omitted_paths: 8
criteria_count: 4
must_not_count: 4
---

# Review packet: 261015-language3911-a9-document-the-language-so-far

Manifest amended after the freeze at 2026-10-15T05:33:42.448Z by lead: the showcase template was committed with the tests before the base; two living pages that lagged the code are corrected through their open deltas (add -tests/golden/render-cases/lang-filters-showcase/template.md, edit +docs/living/architecture/headless-contract.md, edit +docs/living/architecture/modules/template-resolver.md, scope +docs/living/architecture)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: the README, the changelog, the language contract, the module pages and ADR 0007 describe every filter, operator, limit and WHEN form built in this cycle exactly as the code behaves, and a test keeps spec() in step with the lexer and the registry.

### Criteria

- c1 (verify: tool): ld-spec: a test proves every lexer keyword and every registry filter appears in spec(), and every operator the evaluator supports appears in spec().operators
- c2 (verify: review): ld-readme: the README documents each filter, operator, limit option and WHEN form of this cycle with an example that renders as shown (a golden case renders the README example)
- c3 (verify: review): ld-contract: the language contract, the template-resolver module page, the api and cli module pages and the headless contract match the code
- c4 (verify: review): ld-adr: ADR 0007 (statement tags without a body: SET, INPUT and CALL are single tags like ELSE, recorded beside ADR 0001) exists with the options considered

### Must not

- m1: change any existing test expectation
- m2: add a runtime dependency
- m3: evaluate template text as code or compile a template-supplied regular expression
- m4: let an unknown name or bad parameter pass in lenient mode (ADR 0003)

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: the README, the changelog, the language contract, the module pages and ADR 0007 describe every filter, operator, limit and WHEN form built in this cycle exactly as the code behaves, and a test keeps spec() in step with the lexer and the registry.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: does every README example, rendered as shown (same template, data and options), produce the output the README prints, and does the golden case render the README showcase template exactly?
goal-critical: does the README document each of the 23 registry filters (with their parameter forms), the operators `in`, `not in`, `between` and `.length`, the equality rule, the limit option `maxNodes` (API option, CLI flag, `limit-nodes`), each WHEN form and the render-only behaviors, with no claim the code contradicts?
goal-critical: do the language contract, the template-resolver, api and cli module pages and the headless contract match the code (defaults, option names, flags, diagnostic codes, spec shape)?
goal-critical: does ADR 0007 give context, the options considered, the decision and its consequences, consistent with ADR 0001, without describing SET, INPUT or CALL as built?
goal-critical: does the test prove every lexer keyword, every registry filter and every operator the evaluator supports is in spec(), and would it fail if one were removed?
polish: are the documents free of plan codes and review-process words?

## Rubric

- each criterion is met by the diff and its test
- the card scope is respected (README, changelog, the surfaces test, the showcase golden case, and the living documents through deltas)
- nothing is described as available that the code does not do

## Design context

- docs/living/architecture/language-contract.md
- docs/living/architecture/modules/template-resolver.md
- docs/living/decisions/adr/0001-house-style-for-every-block.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
```

### spec.md as of base 51d779206f8a, read at 80572368a79b

```
# Spec

## Acceptance criteria

- ld-spec: a test proves every lexer keyword and every registry filter appears in spec(), and every operator the evaluator supports appears in spec().operators
- ld-readme: the README documents each filter, operator, limit option and WHEN form of this cycle with an example that renders as shown (a golden case renders the README example)
- ld-contract: the language contract, the template-resolver module page, the api and cli module pages and the headless contract match the code
- ld-adr: ADR 0007 (statement tags without a body: SET, INPUT and CALL are single tags like ELSE, recorded beside ADR 0001) exists with the options considered

## Behavior settled

This card changes no behavior. Documents describe what the code does today and nothing else; every claim is checked against the code or a test. SET, INPUT, CALL, DEFINE, macros, partials, the FOR upgrades and the `matches` operator are not built in this cycle: the README, the changelog and the contract do not describe them as available. Only ADR 0007 speaks of them, as a decision about their future shape.

**The test (`tests/language/surfaces.test.ts`).**
- ld-spec, blocks: each opening keyword the lexer accepts (IF, ELSEIF, ELSE, CASE, WHEN, DEFAULT, FOR, LIST, LIST_ITEM, TABLE, HEADER, ROW, SECTION, FENCE, RAW) is a `spec().blocks` name, and each `END_` keyword the lexer accepts is the `closes` of its block. The keyword table is derived from the lexer's behavior (a template using the tag lexes; a made-up tag is `Unknown template tag`), not copied from spec.ts.
- ld-spec, filters: every name in the exported `FILTER_REGISTRY` is a `spec().filters` name with a non-empty description (and a non-empty `params` form except for `trim`), and `spec().filters` has no name the registry lacks; each filter name also works through `render` (a sample template per filter, table-driven, renders with `ok: true`).
- ld-spec, operators: a table of every operator and spelling the evaluator supports (`==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean`, `AND`, `OR`, `NOT`, `in`, `not in`, `between`, `.length`, and the spellings `&&`, `||`, `!` of AND, OR, NOT) with a small condition that proves the evaluator accepts it (renders with `ok: true` and the expected branch); each canonical operator is in `spec().operators`, and `&&`, `||`, `!` map to AND, OR, NOT in that table. A condition with a made-up operator word is an error (ADR 0003), which keeps the table honest.
- ld-readme (guard): the README mentions every registry filter name, every `spec().operators` entry, every `spec().limits` key, the option `--max-nodes` and the code `limit-nodes`; and the README holds the template of `tests/golden/render-cases/lang-filters-showcase/template.md` verbatim in a fenced block, so the example shown is the one a golden case renders. These fail until the README is written, which is the red evidence.
- Table-driven `it.each`; each test name starts with its criterion id.

**The golden case (`tests/golden/render-cases/lang-filters-showcase/`).** `template.md`, `data.json`, `expected.md`, `options.json` (`{"standaloneLines":true}` like the other cases). The template uses every filter of the registry at least once (the six older ones included), one filter or short chain per line with a visible label, over data a reader can follow; `expected.md` is the real output of `render`, and each line is checked by hand against the filter definition in the contract (never pasted unchecked). It also holds a short `{{IF}}` using `in`, `between` or `.length` and a `{{CASE}}` using a list WHEN, so it reads as a prompt fragment, but the filters are its point. It renders with default strictness (no lenient options) and stays under about 45 lines so the README can show it.

**The README (`README.md`, edited by the implementer).** Each filter (all 23), each operator (`in`, `not in`, `between`, `.length`, the equality rule), the limit options (`maxNodes`, `limits.maxNodes`, `--max-nodes`, `limit-nodes`), each WHEN form (list, variable, comparison) and each render-only behavior (division by zero, float printing, malformed math, unprintable values, hyphenated names, `resolveTemplate` unchanged) has a short section with an example that was run and shows the real output. Existing text the cycle made wrong is corrected: the filter table, the `unknown-filter` rows, the limits table, the `spec` output, the CASE section, the Math section, the operator tables, and the notes on missing variables and defaults. The changelog gets lines under Unreleased for the cycle.

**The living documents (edited by the lead through deltas).** `language-contract.md`, `modules/template-resolver.md`, `modules/api.md`, `modules/cli.md` and `headless-contract.md` are checked against the code and corrected where they lag (the `standaloneLines` option, maxNodes, spec shape, analyze block kinds, the CLI flags). ADR 0007 gets its content: context, options considered, decision, consequences.

## Interface

- `tests/language/surfaces.test.ts` (add), `tests/golden/render-cases/lang-filters-showcase/*` (add), `README.md` and `changelog.md` (edit). Nothing else in the repo changes except the living documents and the card's own documents.
```

### card.md as of base 51d779206f8a, read at 80572368a79b

```
# Document the language so far

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

The README, the changelog, the language contract, the module pages and a new ADR describe every filter, operator, limit and WHEN form built in this cycle, and a test keeps spec() in step with the lexer and the registry.

## Must-haves

- `contract` `ld-spec` a test proves every lexer keyword and every registry filter appears in spec(), and every operator the evaluator supports appears in spec().operators
- `contract` `ld-readme` the README documents each filter, operator, limit option and WHEN form of this cycle with an example that renders as shown (a golden case renders the README example)
- `contract` `ld-contract` the language contract, the template-resolver module page, the api and cli module pages and the headless contract match the code
- `contract` `ld-adr` ADR 0007 (statement tags without a body: SET, INPUT and CALL are single tags like ELSE, recorded beside ADR 0001) exists with the options considered

## Acceptance criteria

- ld-spec: a test proves every lexer keyword and every registry filter appears in spec(), and every operator the evaluator supports appears in spec().operators
- ld-readme: the README documents each filter, operator, limit option and WHEN form of this cycle with an example that renders as shown (a golden case renders the README example)
- ld-contract: the language contract, the template-resolver module page, the api and cli module pages and the headless contract match the code
- ld-adr: ADR 0007 (statement tags without a body: SET, INPUT and CALL are single tags like ELSE, recorded beside ADR 0001) exists with the options considered

## Must-nots

- change any existing test expectation other than the one named amendment (if any)
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Context links

- [Template resolver module](../../../../../../living/architecture/modules/template-resolver.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)
- [Language contract](../../../../../../living/architecture/language-contract.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

Documentation, one test file and one golden case. The living documents change through deltas the lead records in the cycle; the ADR is a new document written through an add delta.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/surfaces.test.ts` | add | template-resolver |
| `README.md` | edit | template-resolver |
| `changelog.md` | edit | template-resolver |
| `docs/living/architecture/headless-contract.md` | edit | template-resolver |
| `docs/living/architecture/modules/template-resolver.md` | edit | template-resolver |

Files scope: `README.md`, `changelog.md`, `docs/living/architecture`, `tests/golden/render-cases/lang-filters-showcase/template.md`, `tests/language/surfaces.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `tests/language/surfaces.test.ts`
- remove: none
- edit: `README.md`, `changelog.md`, `docs/living/architecture/headless-contract.md`, `docs/living/architecture/modules/template-resolver.md`
- files_scope: `README.md`, `changelog.md`, `docs/living/architecture`, `tests/golden/render-cases/lang-filters-showcase/template.md`, `tests/language/surfaces.test.ts`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/language-contract.md

```
---
summary: "New language contract: filter registry and argument syntax first; later cards append their constructs"
state: built
---

# Language contract

<!-- Fill the summary with one sentence a reader can use to decide whether to open this document. State starts as planned; it becomes built when the work ships and validated only after a close review. -->

## Purpose

<!-- What this document is for and who reads it. Link to related documents, never copy them. Add the sections this kind of document needs below. -->

The contract for the template language beyond the prompt-aware constructs: filters, operators, CASE and FOR upgrades, SET, INPUT, macros and partials. It is written one card at a time; the first section is the filter registry. Settled decisions apply: [ADR 0001](../decisions/adr/0001-house-style-for-every-block.md) (paired blocks), [ADR 0003](../decisions/adr/0003-unknown-names-are-always-errors.md) (unknown names are errors in every mode). Companion: [prompt-aware-contract.md](prompt-aware-contract.md).

## Filters

- **One registry.** Every filter is one definition in one table: `name`, `params` (the signature text spec() shows), `description`, `paramNames` (the named parameters it accepts; the shorthand `name=value` is the parameter `value`) and `apply(input, params)`. render, `spec()`, `analyze` and `validate` read this table and nothing else; a filter added to it is accepted by all four. `spec()` shows only `name`, `params` and `description`.
- **Groups.** Core filters live in `filters.ts`; text filters and collection filters are added by later cards to `filters-text.ts` and `filters-collection.ts`, which the registry includes.
- **Values.** A filter receives the resolved value and returns a value; the text printed is the output step's text form of the final value. The existing filters coerce their input to text exactly as the output step does, so no existing output changes.
- **Arguments.** A filter call is written `name`, `name=value` or `name:key=value,key=value`. It is parsed once at parse time, respecting quotes: `fence="a=b"` and `fence="a:b"` keep the whole value. A parameter name the filter does not declare (`escape_md:mode=block`) is a `type-error` located at the variable (ADR 0003), in every mode.
- **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
- **Static checks.** `validate` and `analyze` report an undeclared parameter as a `type-error` at the variable, the same code, position and wording as `render`.
- **Known gap.** `FILTERS` (exported for compatibility) is a snapshot of the registry names taken at load; code that needs the live list reads `FILTER_REGISTRY` or `spec()`.

### Text filters

Group in `filters-text.ts`. Each coerces its input to text as the output step prints it, except `default`. A missing or invalid parameter value is a `type-error` at the variable in every mode; `validate` and `analyze` run without data, so they check names and undeclared parameters, and a bad value shows at render. The shorthand `name=value` is the parameter `value`.

| Filter | Result |
|---|---|
| `upper`, `lower` | the text in upper or lower case; no parameter |
| `title` | the first letter of each whitespace-separated word in upper case, the rest in lower case; no parameter |
| `replace:find="a",with="b"` | every non-overlapping occurrence of the literal `find` (required, non-empty) replaced by `with` (default empty text); never read as a pattern |
| `indent[=N]` | N spaces (whole number 0 to 100, default 2) before every line that has characters; line breaks are kept |
| `quote` | the text as a JSON double-quoted string; no parameter |
| `round[=N]` | a number rounded half away from zero to exactly N decimals (whole number 0 to 20, default 0), computed on its digits so `1.005` with `round=2` gives `1.01`; text that is not a finite number, or has an exponent beyond 400 (`1e400`), is left as it is |
| `default="x"` | `x` (required) when the raw value is not truthy by the language rule: missing, null, empty or whitespace-only text, the texts `0`, `false` and `no` in any letter case, the number 0, false, an empty list or an empty object; else the value. `??` keeps its own rule |

In strict mode a missing variable is reported before `default` runs, so `default` replaces missing data in lenient mode only.
### Collection filters

Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines`, `json`.

- **Input.** `join first last sort unique slice` coerce their input as FOR does: an array passes through, a text such as `"a,b,c"` or `'["x","y"]'` becomes a list, a number or boolean a one-item list, null or a missing value the empty list. An object given to one of them is a `type-error`. No filter changes its input.
- **Output.** A filter returns a value: `join`, `json` a text; `length` a number; `first`, `last` an item (null when the list is empty); `sort`, `unique`, `slice`, `lines` a list, which the output step prints as compact JSON and the next filter receives as a list.
- **join.** `join=SEP` needs its separator (`join=""` is allowed); items print as the output step prints them.
- **length.** Items of a list, UTF-16 code units of a text (not split into items, so one emoji counts 2), keys of an object, characters of a number or boolean's text form; 0 for null or missing.
- **slice.** `Array.prototype.slice` semantics (negative counts from the end); each given bound is an integer, else a `type-error`.
- **lines.** The text form split on `\r\n`, `\r` or `\n`; one trailing line break adds no empty item.
- **sort.** Stable and deterministic: numbers numeric, then strings by code unit (so `"10"` before `"9"`), then every other value in its original order. `sort=key` orders object items by that property with the same rule; items without it come last.
- **unique.** Keeps the first occurrence; two values are equal when they have the same type and value (`1` and `"1"` differ), objects and arrays by their `json` text.
- **json.** Compact JSON with object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a `type-error`, a shared non-cyclic reference is not.
- **Errors.** A parameter a collection filter does not declare is a located `type-error` in every mode, as for every filter.

## Math and output errors

- **Zero.** In `render`, `/` or `%` with a zero divisor (also `0 / 0` and a divisor computed to zero) is a `type-error` located at the variable, in every mode. `resolveTemplate` keeps its old output (`Infinity`, `NaN`): this is a render-only divergence, as `standaloneLines` is.
- **Float printing.** In `render`, an arithmetic result prints with at most 15 significant digits (`0.1 + 0.2` prints `0.3`; `1 / 3` prints `0.333333333333333`; integers of any size and negative numbers print unchanged). `resolveTemplate` prints the plain number, so `0.1 + 0.2` stays `0.30000000000000004` there.
- **Hyphens in names.** A hyphen with an ASCII letter on both sides is part of one name (`first-name`, `user.first-name`, `a-b + 1` reads the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y` and `1-a` are arithmetic. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form. `analyze` lists a hyphenated name as one variable. Applies in `render` and `resolveTemplate`.
- **Malformed math.** A malformed expression, whatever the data holds (so `total * ` errors whether or not `total` exists) (`(1 + 2`, `1 +`, `1 + * 2`, `2 $ 3`) is a located `type-error` in lenient mode too, instead of empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty in lenient mode. The error never replaces an existing key, and a missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math. Applies in both entry points.
- **Unprintable output.** A value with no text form (a cyclic object or array, a BigInt) used as output, as a CASE subject or before a filter that turns its input into text (every filter except `default` and the collection filters that keep a value: `length first last sort unique slice json`, so `xs | length` still counts, while `lines` and `join` check) is a `type-error` located at the variable or CASE node, in every mode; `null` and missing still print as empty. Applies in both entry points.

## Condition operators

Conditions are the same in `render` and `resolveTemplate`. Strict mode governs missing data only, and a condition never raises a missing-variable error (a missing name reads as null). Every error is a `type-error` located at the IF, ELSEIF or LIST_ITEM; a cyclic value or a BigInt as an operand is a located error or a normal result, never a raw exception.

- **in, not in.** `x in ["a", y, 3]`, `x in list_var`, `x in "text"`; the words are case-insensitive. A list literal holds operands (literals or variable paths) separated by commas outside quotes; `[]` is empty, while an empty item, a nested `[` or a missing `]` is an error. Against an array, true when an element equals x by the equality rule below (array, object and BigInt elements never match); against a text (quoted or from a variable), a case-sensitive substring test, so an empty x is contained and a text holding JSON is still only a text. A left side that is an array, an object (cyclic or not) or a BigInt is a `type-error` first, whatever the right side holds, a missing one included. Then a missing or null x, or a missing or null right side, gives false (`not in`: true). A right side that is a number, a boolean or an object is a `type-error`. `not in` is exactly the negation of `in`.
- **between.** `x between [lo, hi]`: exactly two operands, each a number or numeric text (a boolean, `true` or `false`, is not numeric here, though `>` still reads it as 1 or 0); inclusive at both ends; `lo` above `hi` is false. A non-numeric or missing operand, a list that is not two items and a right side that is not a list literal are a `type-error`. There is no `not between`.
- **Precedence.** `in`, `not in` and `between` split at the tier of `contains`: after AND, OR, NOT and the comparison operators, before type checks, outside quotes, brackets and parentheses, so `NOT x in [..]`, `a in [..] AND b` and `(a) OR (b between [1, 2])` need no extra rule. Chaining two operators (`a in b == c`) is an error. An operator word inside quotes never splits.
- **.length.** A path segment `length` after any value: an array gives its element count; a text gives its UTF-16 code units (as the `length` filter does, so one emoji is 2) unless it is a JSON object text with its own key `length`; an object with its own key `length` returns that key's value, null included. Any other value, and any missing data, stays null (no zero). Works in conditions, output, math, CASE subjects and after other segments (`user.tags.length`, `items.0.length`); a root variable named `length` is an ordinary variable.
- **Equality.** `==` and `!=`: when either side is a quoted literal both sides compare as text (`z == "01234"` is false for 1234, `"1.0" == 1` is false); otherwise numbers compare numerically and anything else as text, as before. `in` list items follow the same rule. For `contains`, `startsWith` and `endsWith` an unquoted number on the right keeps its written text (`x contains 1.50`, `007`).
- **Unknown words.** An operand that is not a literal, not a variable key and holds whitespace outside quotes (`a == b c`, `a like b`, `a matches /x/`) is an "Unrecognized condition" error in every mode, also in a branch that AND or OR would skip; `matches` is not an operator and no pattern in a template is ever compiled.
- **spec and analyze.** `spec().operators` lists `in`, `not in`, `between` and `.length` after the existing operators. `analyze` records the variables in the left side, the list items or right side, the bounds and the root of a `.length` path (path text as written); a malformed condition is an `unrecognized-condition` diagnostic.

## CASE matchers

`{{CASE subject}}` renders the first `{{WHEN ...}}` that matches, else `{{DEFAULT}}`. The text after `WHEN` is one of two forms, the same in `render` and `resolveTemplate`; tag words are upper case.

- **List.** One or more matchers separated by commas outside quotes (`{{WHEN "a", "b"}}`, `{{WHEN "a", other, 3}}`; spaces around commas are free). A matcher is a quoted text (`"a"` or `'a'`, a comma inside quotes belongs to the text, no unescaping; a quote followed by a comma or the end closes the text even after a backslash, so `'C:'` is the text `C:`), a number (`5`, `-2`, `1.50`), `true`, `false`, `null` (empty text) or a variable path (`other`, `user.plan`, `first-name`, `café`; segments separated by dots, a name starts with a letter, `_` or `@`, and a hyphen joins a name only between two ASCII letters, so `limit-1`, `a-` and `a--b` are not names). The WHEN matches when any matcher matches.
- **Comparison.** An operator `==`, `!=`, `>`, `<`, `>=` or `<=` and exactly one matcher (`{{WHEN >= 10}}`, `{{WHEN != other}}`).
- **Matching.** The subject and every matcher become text the way the subject always did (missing and null are empty text, lists and objects are JSON, a cyclic value or a BigInt is the located `type-error`). A variable matcher is read with the subject's own lookup: a missing name is a located `missing-variable` error in strict mode and empty text in lenient mode. Equality is the one rule of the operators above: when either side is a quoted text both compare as text (`WHEN "1"` does not match `1.0`), otherwise numeric texts compare as numbers (`WHEN 1` matches `1.0` and `"01"`) and anything else as text; a variable counts as unquoted. `!=` negates `==`. `>`, `<`, `>=` and `<=` compare numbers like the same operators in conditions; a side that is not numeric, empty text for a missing or null value included, is a `type-error`, never false. A runtime error in a matcher is located at its WHEN; the old single form `{{WHEN "x"}}` matches as before, `{{WHEN ""}}` matching a missing or null subject.
- **Errors.** At parse, in every mode and entry point: nothing after `WHEN`, an empty list item (`"a",`), an unterminated quote, a matcher that is neither a literal nor a variable path (`a b`, `"a" "b"`, `1abc`, `limit-1`, `a@b`), and a comparison with no matcher, with several (`>= 1, 2`) or after a list item (`"a", > 5`) are a `syntax-error` located at the WHEN tag, even in a branch that never renders.
- **spec and analyze.** `spec()` lists the WHEN arguments as `value[, value...] | variable | operator value`. `analyze` records every variable path of a WHEN (list or comparison) as `case` usage, not optional, with the subject's own rules (loop names and `@` names excluded, literals never recorded).
```

### docs/living/architecture/modules/template-resolver.md

```
---
summary: The template resolver module as it is: lexer, parser, interpreter, filters, coercion, errors and the n8n node, with its syntax and failure handling.
state: built
provenance: recovered
recovered_at: 712fcfd7f7af0b329e6506120a25f0db8e58de06
recovered_in: 0002-describe-the-template-resolver-as-it-is
---

# Template resolver module

> Since recovery: the source moved from `nodes/TemplateResolver/` to `core/src/` (pure library) and `n8n/` (node wrapper), and the syntax bugs listed in the foundations pull request are fixed. Tags in this document cite the recovered commit, not the current tree.

## Purpose

The module `nodes/TemplateResolver/` turns a template string containing `${{var}}` substitutions and `{{...}}` block tags into plain text, and exposes that as one n8n node. Readers are the teams changing template syntax, error reporting or node parameters. Repository-level facts are in `docs/living/architecture/overview.md`.

## Scope read

Read in full: `lexer.ts`, `parser.ts`, `expressions.ts`, `interpreter.ts`, `filters.ts`, `coercion.ts`, `errors.ts`, `types.ts`, `utils.ts`, `index.ts`, `TemplateResolver.node.ts` (all in `nodes/TemplateResolver/`). Not read: the test file, `README.md`, any spec or planning document, and `icoTemplateResolver.svg`. Nothing was executed, so every behavior below is read from source, not observed. Paths and line numbers are relative to `C:/n8n-run`.

## Responsibility

Pipeline: `resolveTemplate(template, variables, options)` runs `new Lexer(template).tokenize()`, then `new Parser(tokens).parse()`, then `new Interpreter(variables, options).interpret(ast)` and returns the string [src: nodes/TemplateResolver/TemplateResolver.node.ts:22-38]

- `lexer.ts`: splits the text into `Token`s (`TEXT`, `VARIABLE`, tag types, `COMMENT`, `EOF`) with line and column, and checks that block openers and closers balance [src: nodes/TemplateResolver/lexer.ts:142-174] [src: nodes/TemplateResolver/lexer.ts:28-137]
- `parser.ts`: recursive descent from tokens to an AST rooted at a `Program` node [src: nodes/TemplateResolver/parser.ts:36-52]
- `expressions.ts`: truthiness, condition evaluation (logical, comparison, string and type-check operators) and arithmetic for `${{...}}` [src: nodes/TemplateResolver/expressions.ts:26-108] [src: nodes/TemplateResolver/expressions.ts:434-569]
- `interpreter.ts`: walks the AST and builds the output string, owning variable lookup, loop context, list and table rendering [src: nodes/TemplateResolver/interpreter.ts:45-96] [src: nodes/TemplateResolver/interpreter.ts:239-395] [src: nodes/TemplateResolver/interpreter.ts:451-508]
- `filters.ts`: parses and applies the `head`, `tail`, `trim` and `escape_md` filters [src: nodes/TemplateResolver/filters.ts:89-102]
- `coercion.ts`: lenient conversion of values to number, array, object, boolean and string [src: nodes/TemplateResolver/coercion.ts:15-275]
- `errors.ts`: `TemplateError` and subclasses `SyntaxError`, `TypeError`, `MissingVariableError` [src: nodes/TemplateResolver/errors.ts:4-81]
- `types.ts`: `TemplateValue`, `VariableMap`, `FilterCall`, `TokenType` and the AST node interfaces [src: nodes/TemplateResolver/types.ts:5-232]
- `utils.ts`: `extractAllVariables`, which scans the raw template for root variable names [src: nodes/TemplateResolver/utils.ts:13-45]
- `TemplateResolver.node.ts`: `resolveTemplate` and the n8n node class `TemplateResolver` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22] [src: nodes/TemplateResolver/TemplateResolver.node.ts:66]
- `index.ts`: re-exports all of the above [src: nodes/TemplateResolver/index.ts:2-29]

## Interface

Exports (via `index.ts`) used by callers: `resolveTemplate(template: string, variables: VariableMap, options?: { strictMode?: boolean }): string` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22-26]; `Lexer`, `Parser`, `Interpreter` classes; `evaluateCondition`, `evaluateExpression`, `evaluateMathExpression`, `isTruthy`; `parseFilter`, `applyFilter`, `applyFilters`; the `tryCoerceTo*` functions; `extractAllVariables`; the error classes [src: nodes/TemplateResolver/index.ts:2-29]

`VariableMap` is `Map<string, TemplateValue>`; a `TemplateValue` is string, number, boolean, null, undefined, an array or an object of those [src: nodes/TemplateResolver/types.ts:5-17]. `Interpreter` defaults `strictMode` to `true` when the option is absent [src: nodes/TemplateResolver/interpreter.ts:53]

### n8n node parameters

Node `displayName` `Template Resolver`, internal name `templateResolver`, group `transform`, version 1, one `main` input and output, `usableAsTool: true`, icon `fa:file-code` [src: nodes/TemplateResolver/TemplateResolver.node.ts:67-81]

| name | type | default | notes |
|---|---|---|---|
| `template` | string (10 rows) | `""` | required [src: nodes/TemplateResolver/TemplateResolver.node.ts:83-109] |
| `variableMappings` | fixedCollection, multipleValues | `{}` | collection `mappings` of `variableName` (string, required) and `value` (string) [src: nodes/TemplateResolver/TemplateResolver.node.ts:110-147] |
| `strictMode` | boolean | `true` | [src: nodes/TemplateResolver/TemplateResolver.node.ts:148-155] |
| `showDetectedVariables` | boolean | `false` | [src: nodes/TemplateResolver/TemplateResolver.node.ts:156-163] |
| `outputField` | string | `resolved_prompt` | [src: nodes/TemplateResolver/TemplateResolver.node.ts:164-170] |

The `value` description says it supports n8n expressions; the code only reads the already-fetched parameter value via `getNodeParameter` [src: nodes/TemplateResolver/TemplateResolver.node.ts:136-143] [src: nodes/TemplateResolver/TemplateResolver.node.ts:181-200] [open: Q1]

### Execute path

`execute()` loops over `this.getInputData()` and, per item index [src: nodes/TemplateResolver/TemplateResolver.node.ts:174-178]

1. Reads `template`, `variableMappings` (default `{ mappings: [] }`), `strictMode`, `showDetectedVariables`, `outputField` [src: nodes/TemplateResolver/TemplateResolver.node.ts:181-200]
2. Computes `detectedVariables = extractAllVariables(template)` [src: nodes/TemplateResolver/TemplateResolver.node.ts:203]
3. Builds a `Map` from the mappings, keeping a mapping only when `variableName` is truthy and `value !== undefined` [src: nodes/TemplateResolver/TemplateResolver.node.ts:205-213]
4. Computes `mappedVariables` and `missingVariables` (detected names not in the map) [src: nodes/TemplateResolver/TemplateResolver.node.ts:216-219]
5. If `strictMode` and any are missing, throws `NodeOperationError` listing missing and detected names [src: nodes/TemplateResolver/TemplateResolver.node.ts:221-229]
6. If not strict, sets each missing name to `""` [src: nodes/TemplateResolver/TemplateResolver.node.ts:231-236]
7. Calls `resolveTemplate(template, variables, { strictMode })` [src: nodes/TemplateResolver/TemplateResolver.node.ts:239]
8. Outputs `{ [outputField]: resolved }`, plus `_template_metadata` (`detected_variables`, `mapped_variables`, `missing_variables`, `variable_count` = number detected) when `showDetectedVariables` is on; each item carries `pairedItem: { item: itemIndex }` [src: nodes/TemplateResolver/TemplateResolver.node.ts:242-258]
9. Returns `[returnData]` [src: nodes/TemplateResolver/TemplateResolver.node.ts:283]

`extractAllVariables` collects roots from `${{name...}}`, from `{{IF|CASE|FOR name}}` (case-insensitive tag word) and from `{{name ?` patterns, drops names starting with `@`, and returns them unique and sorted [src: nodes/TemplateResolver/utils.ts:16-44]. It does not exclude the `AS` name of a `FOR` tag, so `${{item}}` inside a loop adds `item` to the detected set [src: nodes/TemplateResolver/utils.ts:13-45]. In the node, an unmapped detected name therefore counts as missing, and in strict mode triggers the error in step 5 before resolution [src: nodes/TemplateResolver/TemplateResolver.node.ts:216-229] [answer: Q2] [open: Q10]

## Structured result, diagnostics and limits

Added after recovery, in the current tree (`core/src/render.ts`, `spec.ts`, `types.ts`, `errors.ts`, `estimate.ts`); the full contract is `docs/living/architecture/headless-contract.md`.

- `render(template, data, { strictMode?, standaloneLines?, limits?, tokenEstimator? })` returns `{ ok, output, messages, stats: { chars, estTokens, sectionsOmitted, iterations }, diagnostics }` and never throws for template or data problems: on failure `ok` is false, `output` is `""` and the one diagnostic is the error that stopped rendering. `messages` is always `[]` for now; `sectionsOmitted` counts the SECTION blocks omitted for an empty body. `estTokens` defaults to `estimateTokens`, `Math.ceil(chars / 4)`.
- `validate(template, { limits? })` returns `{ ok, diagnostics }` without data: parse errors and unknown filters are errors; conditions `analyze` cannot read become warnings with code `analysis-warning`; `ok` is false only when an error is present.
- A diagnostic is `{ severity, code, message, line, column, suggestion? }`. Every `TemplateError` carries a `code` (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `limit-nodes`) and the 1-based line and column of the node that failed: runtime errors are relocated to the evaluating node, and plain `Error`s from filters or math become `type-error` there. `render` adds `invalid-input` for data that is not an object.
- `Limits { maxIterations, maxOutputChars, maxDepth, maxNodes }` with `DEFAULT_LIMITS` 10000 (total FOR iterations across the render), 1000000 (output characters), 32 (block nesting, enforced by the parser) and 20000 (total AST nodes, counted by the parser: every node except the program root, parent before children, at its opening token; node `maxNodes + 1` is a `limit-nodes` error located there, in `render`, `validate`, `analyze` and `resolveTemplate`). `analyze` and `validate` apply the caller's `maxNodes` and `maxDepth`; with no `maxDepth` given, `analyze` does not apply 32 and only bounds nesting at 256 blocks (`limit-depth`). ELSEIF chains are parsed, run and analyzed in loops, so a long chain ends in a result or `limit-nodes`, never a stack overflow; `withDefaultLimits` fills omitted ones. `resolveTemplate` accepts `limits` too and keeps throwing.
- `spec()` describes the language: `version` (the language version, `"1.0"`), `blocks`, `filters`, `operators`, the default `limits`, the render `options` and `syntax` (variable, comment, trim markers, escape).
- `analyze` additionally reports `required` per variable (always `!optional`) and `blocks`, a count per block kind (`IF`, `CASE`, `FOR`, `LIST`, `TABLE`, `SECTION`, `FENCE`); it throws on a template that does not parse.
- The n8n node now detects variables with `analyze`, fails early in strict mode on unmapped required variables, renders with `render` and turns a failed result into a `NodeOperationError` carrying the first diagnostic's message, line and column.
- Consumers besides the node: the api module (`api/`, HTTP) and the cli module (`cli/`, bin `template-resolver`) call `render`, `validate`, `analyze` and `spec` and add only transport; see `api.md` and `cli.md`.

## Prompt-aware constructs

Added in the current tree (`core/src/whitespace.ts`, the lexer, parser and interpreter, `filters.ts`, `spec.ts`); the full contract is `docs/living/architecture/prompt-aware-contract.md`.

- Whitespace: the lexer passes its tokens through `applyWhitespace` before parsing. Trim markers `{{-` and `-}}` apply first; then, when `standaloneLines` is on, a line holding only block tags (IF, CASE, FOR, SECTION, FENCE, RAW, their parts and comments) and whitespace is removed with its line break. LIST, TABLE and their parts keep their own spacing. `standaloneLines` defaults to true for `render` and false for `resolveTemplate`.
- `{{RAW}}...{{END_RAW}}` content is one literal text token; `\{{` outputs `{{` (the backslash is consumed) and `\\{{` outputs one backslash before an active tag.
- `{{SECTION title level=N skip_empty=bool}}` outputs `<hashes> <title>`, a blank line and the trimmed body, or nothing (counted in `stats.sectionsOmitted`) when the body renders empty and skip_empty is true.
- `{{FENCE lang=...}}` and the `fence[=lang]` filter wrap content in a backtick fence longer than any backtick run inside it.
- Filters `heading_offset=N` (shifts ATX heading lines, clamped to 1 to 6, outside fenced code) and `escape_md=inline|block` (block adds line-start escaping).
- The n8n node passes its `standaloneLines` parameter ("Remove Standalone Tag Lines", default true) to `render`.

## Behavior

### Tokenizing

- `${{` starts a variable token; content runs to the first `}}` and is trimmed; no nesting [src: nodes/TemplateResolver/lexer.ts:149-153] [src: nodes/TemplateResolver/lexer.ts:178-200]
- A bare `{{` starts a tag; spaces and tabs after `{{` are skipped; `{{#` begins a comment ended by `#}}` and becomes a `COMMENT` token [src: nodes/TemplateResolver/lexer.ts:214-231] [src: nodes/TemplateResolver/lexer.ts:257-277]
- A tag body is scanned to its matching `}}`, counting nested `{{` pairs [src: nodes/TemplateResolver/lexer.ts:320-346]
- The keyword is the leading run of `[A-Z_]` characters; it must be one of the 22 listed names (`IF`, `ELSEIF`, `ELSE`, `END_IF`, `CASE`, `WHEN`, `DEFAULT`, `END_WHEN`, `END_DEFAULT`, `END_CASE`, `FOR`, `END_FOR`, `LIST`, `LIST_ITEM`, `END_LIST_ITEM`, `END_LIST`, `TABLE`, `HEADER`, `END_HEADER`, `ROW`, `END_ROW`, `END_TABLE`) or a `SyntaxError` "Unknown template tag" is thrown, except that content equal to an inherited `Object.prototype` member name (for example `{{constructor}}`) is not rejected there and fails later in the parser with "Unexpected token" [src: nodes/TemplateResolver/lexer.ts:359-394] [src: nodes/TemplateResolver/lexer.ts:237-244]. Keywords are case-sensitive uppercase; a plain `{{name}}` without `$` reaches this error. [src: nodes/TemplateResolver/lexer.ts:237-244]
- Text between tags becomes `TEXT` with `\r\n` normalized to `\n` [src: nodes/TemplateResolver/lexer.ts:289-315]
- After `EOF`, `validateBlocks` requires every `IF`, `FOR`, `CASE`, `TABLE`, `LIST` to be closed in stack order by its `END_*`; `WHEN`, `DEFAULT`, `LIST_ITEM`, `HEADER`, `ROW` are not tracked there [src: nodes/TemplateResolver/lexer.ts:28-137]
- The lexer header comment lists a ternary form `{{condition ? "true" : "false"}}`, but the lexer has no ternary path and the parser never creates a `Ternary` node, although `TernaryNode` and `visitTernary` exist [src: nodes/TemplateResolver/lexer.ts:14] [src: nodes/TemplateResolver/types.ts:107-112] [src: nodes/TemplateResolver/interpreter.ts:411-419] [open: Q3]

### Parsing (tags supported)

- Variable `${{path}}`: split on `|` first (rest are filters, stored as raw strings), then on the first `??` (default value, outer quotes stripped), then path split on `.` [src: nodes/TemplateResolver/parser.ts:131-171]
- `{{IF cond}}` ... `{{ELSEIF cond}}` ... `{{ELSE}}` ... `{{END_IF}}`; `ELSEIF` chains become nested `If` nodes in `alternate`; `END_IF` is required [src: nodes/TemplateResolver/parser.ts:176-293] [src: nodes/TemplateResolver/parser.ts:298-350]
- `{{CASE expr}}` containing `{{WHEN "v"}}...` and `{{DEFAULT}}...`; only whitespace text between clauses is allowed; `END_WHEN` and `END_DEFAULT` are optional; each `WHEN` reads a list of values and variables or one comparison into `WhenNode.match` (`parseWhenMatch`; `WhenNode.value` keeps the first quoted text); a malformed WHEN is a `syntax-error` at the tag [src: core/src/parser.ts parseWhen] [src: core/src/expressions.ts parseWhenMatch]
- `{{FOR path AS name}}` ... `{{END_FOR}}`; regex `FOR\s+(.+?)\s+AS\s+(\w+)`, case-insensitive; the iterable path is split on `.` [src: nodes/TemplateResolver/parser.ts:490-544]
- `{{LIST}}` containing `{{LIST_ITEM [cond] [| fallback="text"]}}` ... optional `{{END_LIST_ITEM}}` ... `{{END_LIST}}`; non-whitespace text directly inside `LIST` is a syntax error [src: nodes/TemplateResolver/parser.ts:549-654]
- `{{TABLE [align="a|b|c"]}}` containing optional `{{HEADER}}...`, `{{ROW}}...` (with optional `END_HEADER`, `END_ROW`) and `{{FOR}}` blocks, ended by `END_TABLE`; header and row content is split into cells on literal `|` in text nodes [src: nodes/TemplateResolver/parser.ts:659-735] [src: nodes/TemplateResolver/parser.ts:740-850]
- Comments produce a `Comment` node [src: nodes/TemplateResolver/parser.ts:855-863]
- A top-level `HEADER` or `ROW` token outside `TABLE`, when closed by its `END_*` tag, parses into a node type the interpreter's `visit` switch does not list, so it renders as an empty string; when the file ends before the closing tag it raises "Unclosed {{HEADER}} block" or "Unclosed {{ROW}} block" (a `ROW` followed directly by another `ROW` or `END_TABLE` ends without raising) [src: nodes/TemplateResolver/parser.ts:75-80] [src: nodes/TemplateResolver/interpreter.ts:73-95] [src: nodes/TemplateResolver/parser.ts:747-754] [src: nodes/TemplateResolver/parser.ts:780-787]. A stray `END_IF`, `END_FOR`, `END_CASE`, `END_TABLE` or `END_LIST` throws "Unexpected {{END_X}} without matching" from the lexer's block validation, and any other tag type the parser's `parseNode` does not handle (for example `ELSE`) raises "Unexpected token" [src: nodes/TemplateResolver/lexer.ts:55-123] [src: nodes/TemplateResolver/parser.ts:83-89]

### Interpreting

- Text passes through; comments render as `""` [src: nodes/TemplateResolver/interpreter.ts:75-92]
- Variable: if the joined path text contains any of `+ - * / %` or parentheses it (or text holding a character no name or operator uses next to a number, such as `2 $ 3`) is first tried as a math expression; a hyphen between two ASCII letters joins a name (`first-name`) and does not count as an operator. The expression shape is checked before any variable is read. A failed attempt falls through to normal lookup, except that a malformed expression (`MathSyntaxError`) stays an error when no variable has that name, in strict and lenient mode alike, and in `render` a division or modulo by zero (`DivisionByZeroError`) is a `type-error` at the variable that is never swallowed. In `render` the result prints with at most 15 significant digits (`formatNumber`); `resolveTemplate` prints `String(result)` and keeps `Infinity`, `NaN` and float noise [src: core/src/interpreter.ts visitVariable] [src: core/src/expressions.ts]. Then lookup, then the `??` default replaces a value that fails `isTruthy`, then filters run on the string form [src: nodes/TemplateResolver/interpreter.ts:121-136] [open: Q9]
- Lookup (`resolveNestedPath`): loop variables win over variables; a missing root throws `MissingVariableError` when strict and no `??` is present, else yields `null` [src: nodes/TemplateResolver/interpreter.ts:455-477]. Later path segments walk objects, array indexes (`parseInt`) and JSON-object strings (via `tryCoerceToObject`); a null intermediate, a string that is not a JSON object, or a primitive gives `null`, while a missing property on an object or index in an array gives `undefined` [src: nodes/TemplateResolver/interpreter.ts:483-507]
- Output formatting: `null`/`undefined` render as `""`; other values via `tryCoerceToString` (JSON for arrays and objects); a value with no text form (a cyclic object or array, a BigInt) is a `type-error` located at the variable (or the CASE node) in every mode, also before a filter that turns its input into text (`default` and the collection filters `length first last sort unique slice json` run first; `lines` and `join` check; the final value is always checked) [src: nodes/TemplateResolver/interpreter.ts:513-518] [src: nodes/TemplateResolver/coercion.ts:255-275]
- `IF`: `evaluateCondition` on the condition with variables plus loop context; `ELSE` array or nested `If` for `ELSEIF` [src: nodes/TemplateResolver/interpreter.ts:152-170]
- `CASE`: the expression is looked up with strict lookup and turned into text; each `WHEN` is evaluated by `evaluateWhen` in source order (any list matcher equal by `valuesEqual`, or the numeric comparison), a variable matcher read with the same lookup and located errors at the WHEN; the first match wins, no match falls to `DEFAULT`, else `""` [src: core/src/interpreter.ts visitCase] [src: core/src/expressions.ts evaluateWhen]
- `FOR`: iterable coerced with `tryCoerceToArray`; a non-coercible value throws `TypeError` in strict mode and renders `""` otherwise [src: nodes/TemplateResolver/interpreter.ts:197-211]. Per iteration it sets the item name and the loop variables `@index0`, `@index1`, `@first`, `@last`, `@notFirst`, `@notLast`; bodies are concatenated with no separator [src: nodes/TemplateResolver/interpreter.ts:215-233]. After the loop the whole loop context is cleared, including outer-loop entries [src: nodes/TemplateResolver/interpreter.ts:231] [open: Q4]
- `LIST`: items rendered as `N. text`, joined with `\n`, indented three spaces per depth; a list nested directly in an item's content is appended after a newline at depth + 1; an item whose condition is false renders its `fallback` or is skipped without consuming a number; item content is trimmed [src: nodes/TemplateResolver/interpreter.ts:239-284]
- `TABLE`: header and row cells are rendered and trimmed; a row that wraps a `FOR` iterates the array (nothing is rendered if the iterable is not coercible, even in strict mode) and renders each `ROW` in its body; rows are padded to the widest row; with a header it emits a `| a | b |` line, then a separator `|:-----|` whose dashes are `max(5, header cell length)` with `:` placement from `align` (`left` default, `center`, `right`), then data rows; without a header, just rows [src: nodes/TemplateResolver/interpreter.ts:289-395]
- Ternary: only reachable if a `Ternary` node is given; evaluates `condition`, and a value of the form `${{path}}` is looked up, else used literally [src: nodes/TemplateResolver/interpreter.ts:411-440]

### Conditions and operators (`expressions.ts`)

Order tried by `evaluateCondition`: `NOT(...)` wrapper, outer parentheses, then ` OR ` (rightmost split), ` AND ` (rightmost split), comparison, string operator, type check, finally truthiness of the resolved value [src: nodes/TemplateResolver/expressions.ts:66-108] [src: nodes/TemplateResolver/expressions.ts:129-178]

- `AND`, `OR`, `NOT(` are uppercase, space-delimited and matched only outside parentheses (for `AND`/`OR`) [src: nodes/TemplateResolver/expressions.ts:138-156]
- Comparison `== != >= <= > <` found left to right outside quotes; `==` and `!=` compare `String(left)` and `String(right)`; ordering operators coerce both sides to numbers and throw `TypeError` if either is not numeric [src: nodes/TemplateResolver/expressions.ts:182-238] [src: nodes/TemplateResolver/expressions.ts:243-272]
- String operators `contains`, `startsWith`, `endsWith` (the operator word is matched in any letter case; the text match itself is case-sensitive); the right side is a literal with outer quotes stripped, not a variable; a left side that is `null` yields `false` [src: nodes/TemplateResolver/expressions.ts:277-306]
- `in`, `not in` and `between [lo, hi]` split at the tier of the string operators, after comparison and before type checks, outside quotes, brackets and parentheses (`splitMembership`, `splitBetween`, shared by `evaluateCondition` and `conditionOperands`, so `analyze` reads the same operands); `.length` is one helper (`builtInLength`) used by both path walkers (`resolveValue` here and `resolveNestedPath` in `interpreter.ts`). A quoted literal side makes `==`, `!=` and `in` compare as text; an unquoted number right of `contains` keeps its written text; every operand with bare whitespace outside quotes is an "Unrecognized condition" `type-error` in every mode, checked before evaluation so a short-circuited branch cannot hide it. Rules: [language contract](../language-contract.md#condition-operators)
- Type checks `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean` as a trailing word [src: nodes/TemplateResolver/expressions.ts:311-359]
- Operand resolution: literals `true`, `false`, `null`, numbers and quoted strings; otherwise a dotted path over the variable map where string intermediates are `JSON.parse`d and a missing name yields `undefined` rather than an error [src: nodes/TemplateResolver/expressions.ts:364-416]. Conditions therefore never raise `MissingVariableError`. [src: nodes/TemplateResolver/expressions.ts:364-416]
- `isTruthy`: `null`/`undefined` false; strings trimmed and lowercased, false for `""`, `false`, `0`, `no`, true otherwise; numbers non-zero; booleans as is; arrays non-empty; objects with keys [src: nodes/TemplateResolver/expressions.ts:26-53]. The doc comment above it also lists `null`, `undefined` and `none` as falsy strings, which the body does not implement [src: nodes/TemplateResolver/expressions.ts:17-18] [src: nodes/TemplateResolver/expressions.ts:33] [open: Q5]
- Math (`+ - * / %`, parentheses; `*` `/` `%` before `+` `-`): identifiers resolve through `resolveValue` and must coerce to a number or a `TypeError` is thrown; unmatched parentheses or a leftover token shape throw `TypeError` [src: nodes/TemplateResolver/expressions.ts:445-569]. A `-` directly before a digit is a sign when no number or `)` comes before it (`-3 + 1` is -2); a `-` with ASCII letters on both sides belongs to a name, so `a - b`, `a -b`, `n-1` and `x1-y` stay subtraction. `render` passes `render: true` to the `Interpreter` for the zero error and the 15-digit printing; `resolveTemplate` does not [answer: Q6]

### Filters

Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the text and collection groups are `filters-text.ts` and `filters-collection.ts`): `render`, `spec()`, `analyze` and `validate` all read that table, and a definition added to it is accepted by all four. Filters receive and return values; the six built-ins coerce to text first. A call is parsed once at parse time, quote-aware (`fence="a=b"` keeps `a=b`), and a parameter the filter does not declare is a located `type-error` in every mode (also reported by `validate` and `analyze`). An unterminated quote in a `??` default is plain text and no longer hides the filters after it. The text group `filters-text.ts` adds `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` and `default`; a bad parameter value throws from the filter and is reported as a `type-error` at the variable. See `docs/living/architecture/language-contract.md`. The paragraph below describes the older string-only behavior and the filter names it lists.

Applied left to right to the string form of the value, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: nodes/TemplateResolver/filters.ts:11-65]. Implemented names: `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; `0` gives `""`; negative N drops the first N), `trim`, `escape_md` (backslash-escapes `\ * _ [ ] ( ) # ` > ~ |`) [src: nodes/TemplateResolver/filters.ts:89-186]. Any other name throws a plain `Error` "Unknown filter" [src: nodes/TemplateResolver/filters.ts:99-100]

Collection filters (`filters-collection.ts`): `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines` and `json`. List input is coerced as FOR coerces it, a missing value is the empty list, an object given to a list filter is a `type-error`, `sort` and `json` are deterministic (code-unit order, sorted keys) and `json` rejects a cyclic value. Details: `docs/living/architecture/language-contract.md`.

### Coercion and repair of string input

- Number: numbers (not `NaN`), booleans (1/0), non-empty trimmed numeric strings; else `null` [src: nodes/TemplateResolver/coercion.ts:15-35]
- Array: arrays pass; strings starting with `[` have trailing and leading commas removed and are `JSON.parse`d, falling back to comma splitting when unclosed or invalid; strings starting with `{` give `null`; any other string is split on commas (double quotes group, empty pieces dropped, outer brackets or braces stripped); other primitives become one-item arrays; objects give `null` [src: nodes/TemplateResolver/coercion.ts:48-153]
- Object: objects pass; strings that start with `{` and end with `}` are repaired (stray commas collapsed, trailing and leading commas removed) then parsed; anything else `null` [src: nodes/TemplateResolver/coercion.ts:165-201]
- Boolean: booleans; `1`/`0`; case-insensitive `true`/`yes`/`1` and `false`/`no`/`0`; else `null` [src: nodes/TemplateResolver/coercion.ts:214-243]

## Failure handling

- Error classes: `TemplateError(message, line, column, suggestion?)` formats its message as a line starting with a glyph prefix, then `Template Error (line L, col C):`, the message on an indented line, and an optional `Suggestion:` line; subclasses set `name` to `SyntaxError`, `TypeError`, `MissingVariableError` and shadow the global names [src: nodes/TemplateResolver/errors.ts:4-60]. `MissingVariableError` text is `Variable 'x' not found`; when variables are defined the suggestion lists them and names "Lenient Mode", otherwise it reads "No variables defined. Check variable mappings." [src: nodes/TemplateResolver/errors.ts:65-81] [open: Q7]
- The prefix glyph in the source file is stored as mojibake (bytes `c3 a2 c2 9d c5 92`), not a clean emoji [src: nodes/TemplateResolver/errors.ts:22] [open: Q8]
- Position info: lexer and parser errors carry real token line and column; runtime errors from the interpreter and expressions use fixed `1, 1` (`MissingVariableError`, math and comparison `TypeError`) or the node's own position (`FOR` `TypeError`) [src: nodes/TemplateResolver/interpreter.ts:470-475] [src: nodes/TemplateResolver/expressions.ts:252-257] [src: nodes/TemplateResolver/interpreter.ts:203-208]
- Filter errors (`Unknown filter`, `head`/`tail` parameter problems) are plain `Error`, not `TemplateError`, and carry no position [src: nodes/TemplateResolver/filters.ts:100-117] [src: nodes/TemplateResolver/filters.ts:131-139]
- Structural errors raised: unknown tag, unclosed variable, tag or comment, unmatched or unclosed block, missing `END_*`, bad `FOR` syntax, unexpected text or token inside `CASE`, `LIST`, `TABLE`, `consume` mismatch [src: nodes/TemplateResolver/lexer.ts:55-123] [src: nodes/TemplateResolver/lexer.ts:203-208] [src: nodes/TemplateResolver/lexer.ts:237-244] [src: nodes/TemplateResolver/lexer.ts:278-283] [src: nodes/TemplateResolver/lexer.ts:348-353] [src: nodes/TemplateResolver/parser.ts:364-396] [src: nodes/TemplateResolver/parser.ts:529-534] [src: nodes/TemplateResolver/parser.ts:555-585] [src: nodes/TemplateResolver/parser.ts:668-711] [src: nodes/TemplateResolver/parser.ts:914-924]
- Strict mode: affects missing root variables (not in conditions) and non-iterable `FOR` values; with `??` present a missing root does not throw [src: nodes/TemplateResolver/interpreter.ts:121-122] [src: nodes/TemplateResolver/interpreter.ts:468-477]
- Node level: any error inside the item loop is caught; with `continueOnFail()` the item becomes `{ error: message, error_type: name }`; otherwise a `NodeOperationError` is rethrown as is, or any other error is wrapped in a new `NodeOperationError` with the same message and `itemIndex` [src: nodes/TemplateResolver/TemplateResolver.node.ts:259-280]. Wrapping drops the original class name from the thrown error. [src: nodes/TemplateResolver/TemplateResolver.node.ts:273-279]

## Dependencies

- Runtime import: `n8n-workflow` (`IExecuteFunctions`, `INodeExecutionData`, `INodeType`, `INodeTypeDescription`, `NodeOperationError`), used only by `TemplateResolver.node.ts`; declared as a peer dependency [src: nodes/TemplateResolver/TemplateResolver.node.ts:6-12] [src: package.json:47-49]
- All other files import only from sibling files; there are no third-party packages in the resolver core [src: nodes/TemplateResolver/coercion.ts:2] [src: nodes/TemplateResolver/expressions.ts:1-9] [src: nodes/TemplateResolver/filters.ts:1] [src: nodes/TemplateResolver/interpreter.ts:1-28] [src: nodes/TemplateResolver/lexer.ts:1-2] [src: nodes/TemplateResolver/parser.ts:1-21]
- Internal order: `types` and `errors` are leaves; `coercion` uses `types`; `filters` uses `types`; `expressions` uses `types`, `errors`, `coercion`; `lexer` uses `types` and `errors`; `parser` uses `types`, `errors`, `filters` and `expressions` (`parseWhenMatch`); `interpreter` uses `types`, `errors`, `coercion`, `expressions`, `filters`; the node file uses `types`, `lexer`, `parser`, `interpreter`, `utils` [src: nodes/TemplateResolver/coercion.ts:2] [src: nodes/TemplateResolver/expressions.ts:1-9] [src: nodes/TemplateResolver/filters.ts:1] [src: nodes/TemplateResolver/interpreter.ts:1-28] [src: nodes/TemplateResolver/lexer.ts:1-2] [src: nodes/TemplateResolver/parser.ts:1-21] [src: nodes/TemplateResolver/TemplateResolver.node.ts:1-5]
- `TemplateMetadata` and `VariableMappingsCollection` are declared both in `types.ts` and (unexported) in the node file [src: nodes/TemplateResolver/types.ts:217-232] [src: nodes/TemplateResolver/TemplateResolver.node.ts:43-58]
- Tests mock `n8n-workflow` through `__mocks__/n8n-workflow.ts` [src: jest.config.js:6-8]

## Open questions

- Q1. Whether n8n expressions typed in a mapping `value` (for example `={{ $json.title }}`) are evaluated before `execute()` sees them is n8n runtime behavior outside this repository; the code only calls `getNodeParameter`. Looked at: `TemplateResolver.node.ts:136-143,181-200`.
- Q3. The lexer comment documents a `{{cond ? "a" : "b"}}` ternary and `utils.ts` detects its condition name, but no lexer or parser path produces it; a tag of that shape reaches the unknown-tag error. Whether the ternary is intended to work is not stated in the code.
- Q4. The `FOR` loop clears the entire loop context at its end (`interpreter.ts:231`), so a nested inner loop would remove the outer item and index values for the rest of the outer iteration. Not run; effect on real templates unconfirmed.
- Q5. `isTruthy` comment lists `null`, `undefined` and `none` strings as falsy but the code treats them as truthy. Which is intended is unknown.
- Q7. `MissingVariableError` suggests enabling "Lenient Mode", while the node parameter is named "Strict Mode". Whether another name for the setting exists is unknown.
- Q8. The error-message prefix is double-encoded text in the source; whether tests or consumers depend on the exact bytes is unknown (tests not read). Several comments in `lexer.ts`, `parser.ts`, `filters.ts` and `coercion.ts` show the same encoding damage for arrows.
- Q9. The interpreter prints swallowed math errors with `console.log`; whether that output is intended for n8n execution logs is unknown. Looked at: `interpreter.ts:111-118`.
- Q10. Whether tests exercise a `FOR` item name used as `${{item}}` under strict mode, and whether that behavior is intended, was not checked (tests not read).

## Answered

- Q2. Code path: `extractAllVariables` adds the root of every `${{name}}`, including a `FOR ... AS` item name, to the detected set (`utils.ts:13-45`), and in strict mode the node throws when a detected name has no mapping (`TemplateResolver.node.ts:216-229`). Answered from source by research:lead.

- Q6. A leading negative number such as `-3 + 1` ends in `MissingVariableError` for the key `-3 + 1` in strict mode and renders empty in lenient mode: the math attempt fails ("Invalid math expression"), the error is swallowed, and normal lookup finds no such key. Answered from source by research:lead (`interpreter.ts:110-119`, `interpreter.ts:468-477`, `expressions.ts:564-566`).
```

### docs/living/decisions/adr/0001-house-style-for-every-block.md

```
---
summary: Every new block uses the {{KEYWORD}}...{{END_KEYWORD}} house style; no attribute-style tags are added.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: built
---

# Keep the house style for every block

**Context.** The language already uses {{KEYWORD ...}} to {{END_KEYWORD}} for IF, FOR, CASE, LIST and TABLE. The feature spec asks whether new blocks may use a second, attribute-style tag form.

**Decision.** Every new block keeps the paired {{KEYWORD}}...{{END_KEYWORD}} form, with attributes inside the opening tag. No second tag style is introduced.

**Alternatives.** Allow a few attribute-style or self-closing tags for compactness; rejected because two styles double the parser and the learning cost.

**Consequences.** Existing templates keep working. The grammar stays small and the spec lists one block shape. Compact one-line constructs are written as paired tags.
```

### docs/living/decisions/adr/0003-unknown-names-are-always-errors.md

```
---
summary: Unknown filters and unknown identifiers are always errors; strict mode only governs missing data.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: built
---

# Unknown names are always errors, strict mode governs missing data

**Context.** Unknown filters throw today but unknown identifiers followed by operators silently evaluate false, and strict mode mixes missing data with misspelled names.

**Decision.** A filter, operator or identifier that the language does not define is a syntax-level error in every mode. Strict mode decides only what happens when a defined variable has no value in the data.

**Alternatives.** Report unknown names as errors in strict mode only; rejected because a typo then passes silently in the default mode.

**Consequences.** Typos are caught before a run by validate and analyze. Missing data stays tolerant by default.
```

## Frozen tests (read-only)

These test files are shown as committed at 80572368a79b, the commit the contract is read at; the diff starts at base 51d779206f8a, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/surfaces.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";
import { FILTER_REGISTRY } from "../../core/src/filters";
import { Lexer } from "../../core/src/lexer";
import { render } from "../../core/src/render";
import { spec } from "../../core/src/spec";

const REPO = path.join(__dirname, "..", "..");
const README = fs.readFileSync(path.join(REPO, "README.md"), "utf8").replace(/\r\n/g, "\n");
const SHOWCASE_DIR = path.join(REPO, "tests", "golden", "render-cases", "lang-filters-showcase");
const SHOWCASE = fs
  .readFileSync(path.join(SHOWCASE_DIR, "template.md"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\n+$/, "");

const REGISTRY_NAMES = FILTER_REGISTRY.map((f) => f.name);

/** The lexer accepts a keyword when its tag is anything but an unknown tag. */
function lexerAccepts(keyword: string): boolean {
  try {
    new Lexer(`{{${keyword}}}`).tokenize();
    return true;
  } catch (e) {
    return !String((e as Error).message).includes("Unknown template tag");
  }
}

// ---- ld-spec: blocks ----

const BLOCK_PAIRS: [string, string | undefined][] = [
  ["IF", "END_IF"],
  ["ELSEIF", undefined],
  ["ELSE", undefined],
  ["CASE", "END_CASE"],
  ["WHEN", "END_WHEN"],
  ["DEFAULT", "END_DEFAULT"],
  ["FOR", "END_FOR"],
  ["LIST", "END_LIST"],
  ["LIST_ITEM", "END_LIST_ITEM"],
  ["TABLE", "END_TABLE"],
  ["HEADER", "END_HEADER"],
  ["ROW", "END_ROW"],
  ["SECTION", "END_SECTION"],
  ["FENCE", "END_FENCE"],
  ["RAW", "END_RAW"],
];

describe("surfaces", () => {
  it("ld-spec lexer probe: a made-up tag is not accepted", () => {
    expect(lexerAccepts("NOPE")).toBe(false);
  });

  it.each(BLOCK_PAIRS)("ld-spec block %s: the lexer accepts it and spec() lists it with closer %s", (open, close) => {
    expect(lexerAccepts(open)).toBe(true);
    const block = spec().blocks.find((b) => b.name === open);
    expect(block).toBeDefined();
    if (close === undefined) {
      expect(block?.closes).toBeUndefined();
    } else {
      expect(lexerAccepts(close)).toBe(true);
      expect(block?.closes).toBe(close);
    }
  });

  it("ld-spec blocks: spec().blocks has no name outside the keyword table", () => {
    const known = BLOCK_PAIRS.map(([open]) => open);
    const extra = spec()
      .blocks.map((b) => b.name)
      .filter((n) => !known.includes(n));
    expect(extra).toEqual([]);
  });

  // ---- ld-spec: filters ----

  it.each(REGISTRY_NAMES)("ld-spec filter %s: spec() lists it with a description and a params form", (name) => {
    const entry = spec().filters.find((f) => f.name === name);
    expect(entry).toBeDefined();
    expect(entry?.description.length).toBeGreaterThan(0);
    const takesParams = (FILTER_REGISTRY.find((f) => f.name === name)?.paramNames.length ?? 0) > 0;
    if (takesParams) expect(entry?.params.length).toBeGreaterThan(0);
  });

  it("ld-spec filters: spec().filters has the registry names in the registry order, none extra", () => {
    expect(spec().filters.map((f) => f.name)).toEqual(REGISTRY_NAMES);
  });

  const FILTER_PROBES: [string, string, Record<string, any>][] = [
    ["head", "${{s | head=3}}", { s: "abcdef" }],
    ["tail", "${{s | tail=3}}", { s: "abcdef" }],
    ["trim", "${{s | trim}}", { s: "  x  " }],
    ["escape_md", "${{s | escape_md}}", { s: "a*b" }],
    ["fence", "${{s | fence=js}}", { s: "x = 1" }],
    ["heading_offset", "${{s | heading_offset=1}}", { s: "# T" }],
    ["upper", "${{s | upper}}", { s: "ab" }],
    ["lower", "${{s | lower}}", { s: "AB" }],
    ["title", "${{s | title}}", { s: "ab cd" }],
    ['replace', '${{s | replace:find="a",with="b"}}', { s: "aa" }],
    ["indent", "${{s | indent=2}}", { s: "a\nb" }],
    ["quote", "${{s | quote}}", { s: "a" }],
    ["round", "${{n | round=1}}", { n: 1.25 }],
    ["default", '${{s | default="x"}}', { s: "" }],
    ["join", '${{xs | join=", "}}', { xs: ["a", "b"] }],
    ["length", "${{xs | length}}", { xs: ["a", "b"] }],
    ["first", "${{xs | first}}", { xs: ["a", "b"] }],
    ["last", "${{xs | last}}", { xs: ["a", "b"] }],
    ["sort", "${{xs | sort}}", { xs: ["b", "a"] }],
    ["unique", "${{xs | unique}}", { xs: ["a", "a"] }],
    ["slice", "${{xs | slice:start=1}}", { xs: ["a", "b"] }],
    ["lines", "${{s | lines}}", { s: "a\nb" }],
    ["json", "${{o | json}}", { o: { b: 1, a: 2 } }],
  ];

  it.each(FILTER_PROBES)("ld-spec filter %s: a sample template renders ok", (_name, template, data) => {
    const r = render(template, data, { strictMode: true });
    expect({ ok: r.ok, diagnostics: r.diagnostics.map((d) => d.message) }).toEqual({ ok: true, diagnostics: [] });
  });

  it("ld-spec filters: the probe table covers exactly the registry names", () => {
    expect(FILTER_PROBES.map(([n]) => n).sort()).toEqual([...REGISTRY_NAMES].sort());
  });

  // ---- ld-spec: operators ----

  type OpRow = [string, string, Record<string, any>, "yes" | "no"];
  const OPERATOR_ROWS: OpRow[] = [
    ["==", 'a == "x"', { a: "x" }, "yes"],
    ["!=", 'a != "x"', { a: "y" }, "yes"],
    [">", "n > 1", { n: 2 }, "yes"],
    ["<", "n < 1", { n: 2 }, "no"],
    [">=", "n >= 2", { n: 2 }, "yes"],
    ["<=", "n <= 1", { n: 2 }, "no"],
    ["contains", 'a contains "b"', { a: "abc" }, "yes"],
    ["startsWith", 'a startsWith "ab"', { a: "abc" }, "yes"],
    ["endsWith", 'a endsWith "bc"', { a: "abc" }, "yes"],
    ["isEmpty", "a isEmpty", { a: "" }, "yes"],
    ["isNotEmpty", "a isNotEmpty", { a: "x" }, "yes"],
    ["isArray", "a isArray", { a: [1] }, "yes"],
    ["isNumber", "a isNumber", { a: 3 }, "yes"],
    ["isObject", "a isObject", { a: { k: 1 } }, "yes"],
    ["isBoolean", "a isBoolean", { a: true }, "yes"],
    ["AND", "a AND b", { a: true, b: false }, "no"],
    ["OR", "a OR b", { a: true, b: false }, "yes"],
    ["NOT", "NOT(a)", { a: false }, "yes"],
    ["in", 'a in ["x", "y"]', { a: "y" }, "yes"],
    ["not in", 'a not in ["x", "y"]', { a: "z" }, "yes"],
    ["between", "n between [1, 5]", { n: 5 }, "yes"],
    [".length", "xs.length > 1", { xs: [1, 2] }, "yes"],
    ["&&", "a && b", { a: true, b: false }, "no"],
    ["||", "a || b", { a: true, b: false }, "yes"],
    ["!", "!a", { a: false }, "yes"],
  ];
  const SPELLING_OF: Record<string, string> = { "&&": "AND", "||": "OR", "!": "NOT" };

  it.each(OPERATOR_ROWS)("ld-spec operator %s: the evaluator accepts %s and picks the right branch", (_op, cond, data, want) => {
    const r = render(`{{IF ${cond}}}yes{{ELSE}}no{{END_IF}}`, data, { strictMode: true });
    expect({ ok: r.ok, output: r.output }).toEqual({ ok: true, output: want });
  });

  it.each(OPERATOR_ROWS.filter(([op]) => !(op in SPELLING_OF)).map(([op]) => [op]))(
    "ld-spec operator %s: spec().operators lists it",
    (op) => {
      expect(spec().operators).toContain(op);
    },
  );

  it.each(Object.entries(SPELLING_OF))("ld-spec operator spelling %s maps to %s which spec() lists", (_s, canonical) => {
    expect(spec().operators).toContain(canonical);
  });

  it("ld-spec operators: every spec().operators entry has a row in the operator table", () => {
    const rows = OPERATOR_ROWS.map(([op]) => SPELLING_OF[op] ?? op);
    const missing = spec().operators.filter((o) => !rows.includes(o));
    expect(missing).toEqual([]);
  });

  it.each([true, false])("ld-spec operators: a made-up operator word is an error (strictMode %s)", (strictMode) => {
    const r = render("{{IF a like b}}yes{{ELSE}}no{{END_IF}}", { a: "x", b: "x" }, { strictMode });
    expect(r.ok).toBe(false);
  });

  // ---- ld-readme (guard) ----

  const LIMIT_KEYS = Object.keys(spec().limits);

  it.each(REGISTRY_NAMES)("ld-readme filter %s: the README mentions it", (name) => {
    expect(README.includes(name)).toBe(true);
  });

  it.each(spec().operators)("ld-readme operator %s: the README mentions it", (op) => {
    expect(README.includes(op)).toBe(true);
  });

  it.each(LIMIT_KEYS)("ld-readme limit %s: the README mentions the limit key", (key) => {
    expect(README.includes(key)).toBe(true);
  });

  it("ld-readme limits: spec().limits includes maxNodes", () => {
    expect(LIMIT_KEYS).toContain("maxNodes");
  });

  it("ld-readme: the README mentions the --max-nodes flag", () => {
    expect(README.includes("--max-nodes")).toBe(true);
  });

  it("ld-readme: the README mentions the limit-nodes code", () => {
    expect(README.includes("limit-nodes")).toBe(true);
  });

  it("ld-readme: the README holds the filters showcase template verbatim", () => {
    expect(SHOWCASE.length).toBeGreaterThan(0);
    expect(README.includes(SHOWCASE)).toBe(true);
  });

  it.each(REGISTRY_NAMES)("ld-readme filter %s: the showcase template calls it as a filter", (name) => {
    const calls = new RegExp(`\\|\\s*${name}\\s*(?:[=:}|]|$)`, "m");
    expect(calls.test(SHOWCASE)).toBe(true);
  });
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

`````diff
diff --git a/README.md b/README.md
index 28937c4..825c2f2 100644
--- a/README.md
+++ b/README.md
@@ -89,22 +89,39 @@ Provide a fallback when a variable is empty or missing:
 Author: ${{author ?? "Anonymous"}}
 ```
 
+The `??` default also accepts a variable that is missing in strict mode, which the [`default` filter](#filters-name--filter) does not: `${{name | default="x"}}` is still a `missing-variable` error when `name` is missing in strict mode.
+
 ---
 
 ### Filters: `${{name | filter}}`
 
 Transform values before output.
 
-| Filter              | Example                         | Description                                                                 |
-| ------------------- | ------------------------------- | --------------------------------------------------------------------------- |
-| `trim`              | `${{text \| trim}}`             | Remove leading/trailing whitespace                                          |
-| `head=N`            | `${{text \| head=100}}`         | First N characters; a negative N drops the last \|N\| characters            |
-| `tail=N`            | `${{text \| tail=50}}`          | Last N characters; a negative N drops the first \|N\| characters            |
-| `escape_md`         | `${{text \| escape_md}}`        | Escape markdown special characters (the same as `escape_md=inline`)         |
-| `escape_md=inline`  | `${{title \| escape_md=inline}}` | Escape markdown special characters with a backslash                        |
-| `escape_md=block`   | `${{note \| escape_md=block}}`  | Inline escaping, plus line starts that would read as structure (headings, quotes, list markers, tables, rules, fences) |
-| `fence` / `fence=lang` | `${{code \| fence=ts}}`      | Wrap the value in a code fence longer than any backtick run inside it       |
-| `heading_offset=N`  | `${{doc \| heading_offset=2}}`  | Shift markdown headings by N levels (negative N shifts up), clamped to 1-6  |
+| Filter | Example | Description |
+| --- | --- | --- |
+| `head=N` | `${{text \| head=100}}` | First N characters; a negative N drops the last \|N\| characters |
+| `tail=N` | `${{text \| tail=50}}` | Last N characters; a negative N drops the first \|N\| characters |
+| `trim` | `${{text \| trim}}` | Leading and trailing whitespace removed |
+| `escape_md[=inline\|block]` | `${{note \| escape_md=block}}` | Markdown special characters escaped with a backslash (inline, the default); block also escapes line starts that would read as structure: headings, quotes, list markers, tables, rules and fences |
+| `fence[=lang]` | `${{code \| fence=ts}}` | The value in a code fence of at least three backticks, longer than any backtick run inside it, with the optional language; one leading and one trailing line break of the value are removed |
+| `heading_offset=N` | `${{doc \| heading_offset=2}}` | Markdown ATX headings shifted by N levels (negative N shifts up), clamped to 1-6; headings inside fenced code are untouched |
+| `upper` | `${{name \| upper}}` | Text in upper case |
+| `lower` | `${{name \| lower}}` | Text in lower case |
+| `title` | `${{name \| title}}` | First letter of each whitespace-separated word in upper case, the rest in lower case |
+| `replace:find="a",with="b"` | `${{text \| replace:find="a",with="b"}}` | Every occurrence of the literal text find replaced by with (empty when omitted); find is required and never read as a pattern |
+| `indent[=N]` | `${{text \| indent=4}}` | N spaces (default 2, from 0 to 100) added at the start of every non-empty line; line breaks are kept |
+| `quote` | `${{text \| quote}}` | Text as a JSON double-quoted string, with quotes, backslashes and control characters escaped |
+| `round[=N]` | `${{price \| round=2}}` | A number rounded half away from zero to exactly N decimal places (default 0, up to 20); anything that is not a finite number is left as it is |
+| `default="x"` | `${{nick \| default="n/a"}}` | The given value when the input is missing, null, empty or whitespace-only text, the text 0, false or no (any letter case), the number 0, false, an empty list or an empty object; otherwise the input |
+| `join=SEP` | `${{tags \| join=", "}}` | Items joined with SEP, each as the output step prints it |
+| `length` | `${{tags \| length}}` | Items of a list, UTF-16 code units of a text, keys of an object |
+| `first` | `${{tags \| first}}` | First item of a list, empty when there is none |
+| `last` | `${{tags \| last}}` | Last item of a list, empty when there is none |
+| `sort[=key]` | `${{items \| sort=name}}` | Stable sort: numbers, then strings, then the rest; sort=key orders objects by that key |
+| `unique` | `${{tags \| unique}}` | List with the first occurrence of each value, order kept |
+| `slice[:start=N,end=N]` | `${{tags \| slice:start=1,end=3}}` | Part of a list from start up to end; negative counts from the end |
+| `lines` | `${{text \| lines}}` | Text split on line breaks into a list |
+| `json` | `${{config \| json}}` | Compact JSON text with object keys in stable order |
 
 **Chain multiple filters:**
 
@@ -112,6 +129,165 @@ Transform values before output.
 ${{description | trim | head=200 | escape_md}}
 ```
 
+**Arguments.** A filter is written `name`, `name=value` (the one parameter of the filter) or `name:key=value,key=value` (named parameters). A value in quotes keeps any `=`, `,` and `:` inside it, so `join="a=b"` and `replace:find="a,b",with="x=y"` each read as one value.
+
+```console
+$ cat args.tpl
+${{a | replace:find="a,b",with="x=y"}}
+${{b | join=": "}}
+${{c | join="a=b"}}
+$ template-resolver render args.tpl --data args.json
+1 x=y 2
+p: q
+xa=by
+```
+
+With `args.json` holding `{"a": "1 a,b 2", "b": ["p", "q"], "c": ["x", "y"]}`.
+
+**Filter errors.** A filter that is not in the table, a parameter the filter does not declare and a bad parameter value are each a located error, in strict mode and with it off alike; `validate` and `analyze` report the first two without data.
+
+```console
+$ printf '${{a | shout}}\n' > bad.tpl
+$ template-resolver render bad.tpl --data a.json
+bad.tpl:1:1: error unknown-filter: Unknown filter: shout
+$ printf '${{a | escape_md:mode=block}}\n' > bad.tpl
+$ template-resolver render bad.tpl --data a.json --no-strict
+bad.tpl:1:1: error type-error: Filter escape_md has no parameter 'mode' (accepts: value)
+$ printf '${{a | indent=500}}\n' > bad.tpl
+$ template-resolver render bad.tpl --data a.json
+bad.tpl:1:1: error type-error: indent requires a whole number from 0 to 100 (e.g., indent=2), got 500
+```
+
+With `a.json` holding `{"a": "hi"}`.
+
+**Lists.** `sort`, `unique`, `slice` and `lines` return a list: printed on its own it is compact JSON, and a filter after it receives the list.
+
+```console
+$ cat lists.tpl
+${{tags | sort}} ${{tags | sort | first}} ${{tags | unique | join="+"}}
+$ template-resolver render lists.tpl --data tags.json
+["apple","apple","pear"] apple pear+apple
+```
+
+With `tags.json` holding `{"tags": ["pear", "apple", "apple"]}`.
+
+**`default` and `round`.** `default="x"` replaces a value that is not truthy by the [truthiness rules](#truthiness) (missing, empty, `0`, `false`, an empty list), but in strict mode a missing variable is still a `missing-variable` error before `default` runs; use it for empty values, or turn strict mode off, or use `??`, which also accepts a missing variable in strict mode. `round=N` rounds half away from zero on the digits of the number, so `1.005` with `round=2` is `1.01`.
+
+```console
+$ cat round.tpl
+${{price | round=2}} ${{price | round}} ${{n | default="none"}} ${{gone ?? "x"}}
+$ template-resolver render round.tpl --data round.json
+1.01 1 none x
+$ printf '${{gone | default="x"}}\n' > gone.tpl
+$ template-resolver render gone.tpl
+gone.tpl:1:1: error missing-variable: Variable 'gone' not found
+$ template-resolver render gone.tpl --no-strict
+x
+```
+
+With `round.json` holding `{"price": 1.005, "n": 0}`.
+
+**All the filters at once.** This template calls every filter once and then branches with the [`between`](#membership-range-and-length) operator and the [WHEN comparison](#casewhen-case):
+
+````
+head: ${{summary | head=11}}
+tail: ${{summary | tail=6}}
+trim: [${{padded | trim}}]
+escape_md: ${{note | escape_md}}
+upper: ${{name | upper}}
+lower: ${{name | lower}}
+title: ${{name | title}}
+replace: ${{name | replace:find="a",with="4"}}
+quote: ${{name | quote}}
+round: ${{price | round=2}}
+default: ${{nick | default="n/a"}}
+join: ${{tags | join=", "}}
+length: ${{tags | length}}
+first: ${{tags | first}}
+last: ${{tags | last}}
+sort: ${{tags | sort}}
+unique and join: ${{dupes | unique | join="+"}}
+slice: ${{tags | slice:start=1,end=3}}
+lines: ${{poem | lines}}
+json: ${{config | json}}
+indent:
+${{poem | indent=2}}
+fence:
+${{code | fence=js}}
+heading_offset:
+${{doc | heading_offset=1}}
+{{IF tags.length > 2 AND level between [1, 5]}}
+Many tags at a usable level.
+{{END_IF}}
+{{CASE level}}
+{{WHEN 1, 2}}
+Level: low
+{{WHEN >= 3}}
+Level: high
+{{END_CASE}}
+````
+
+With this data:
+
+```json
+{
+  "summary": "Release notes for the spring update",
+  "padded": "  ready  ",
+  "note": "Use *bold* and _italic_",
+  "name": "ada lovelace",
+  "price": 1.005,
+  "nick": "",
+  "tags": ["pear", "apple", "fig", "apple"],
+  "dupes": ["b", "a", "b"],
+  "poem": "one\ntwo\n\nfour",
+  "config": { "name": "x", "id": 7, "flags": { "z": true, "a": false } },
+  "code": "const x = 1;",
+  "doc": "# Title\n\n## Part",
+  "level": 3
+}
+```
+
+it renders (default render options, so lines that hold only block tags are removed):
+
+````
+head: Release not
+tail: update
+trim: [ready]
+escape_md: Use \*bold\* and \_italic\_
+upper: ADA LOVELACE
+lower: ada lovelace
+title: Ada Lovelace
+replace: 4d4 lovel4ce
+quote: "ada lovelace"
+round: 1.01
+default: n/a
+join: pear, apple, fig, apple
+length: 4
+first: pear
+last: apple
+sort: ["apple","apple","fig","pear"]
+unique and join: b+a
+slice: ["apple","fig"]
+lines: ["one","two","","four"]
+json: {"flags":{"a":false,"z":true},"id":7,"name":"x"}
+indent:
+  one
+  two
+
+  four
+fence:
+```js
+const x = 1;
+```
+
+heading_offset:
+## Title
+
+### Part
+Many tags at a usable level.
+Level: high
+````
+
 **Escape modes.** Use `escape_md=block` for a value that is placed on its own lines, such as user text pasted into a prompt, so it cannot fake a heading or a list; `escape_md=inline` (or plain `escape_md`) escapes only the characters that would format text. The mode is case-sensitive; any other mode is a `type-error`.
 
 ```console
@@ -237,7 +413,72 @@ You are a general assistant.
 
 - First matching `{{WHEN}}` wins
 - `{{DEFAULT}}` handles unmatched values (optional)
-- Values must be quoted: `{{WHEN "value"}}`
+- A `{{WHEN}}` takes one of three forms, below
+
+**The three WHEN forms:**
+
+| Form | Example | Matches when |
+| ---- | ------- | ------------ |
+| List of values | `{{WHEN "a", "b"}}` | the subject equals any value in the list |
+| Variable | `{{WHEN other}}` | the subject equals the value of `other` |
+| Comparison | `{{WHEN >= 10}}` | the comparison `==`, `!=`, `>`, `<`, `>=` or `<=` with one value holds |
+
+A value is a quoted text (`"a"` or `'a'`; a comma inside quotes belongs to the text), a number (`5`, `-2`, `1.50`), `true`, `false`, `null` (empty text) or a variable path (`other`, `user.plan`). A list holds one or more values separated by commas, mixing quoted values and variables if you like (`{{WHEN "a", other, 3}}`). A comparison takes exactly one value.
+
+```console
+$ cat when.tpl
+{{CASE plan}}
+{{WHEN "free", "trial"}}
+Limited
+{{END_WHEN}}
+{{WHEN other}}
+Same as other
+{{END_WHEN}}
+{{WHEN >= 10}}
+Big
+{{END_WHEN}}
+{{DEFAULT}}
+Other
+{{END_DEFAULT}}
+{{END_CASE}}
+$ echo '{"plan": "trial", "other": "x"}' > plan.json
+$ template-resolver render when.tpl --data plan.json
+Limited
+$ echo '{"plan": "x", "other": "x"}' > plan.json
+$ template-resolver render when.tpl --data plan.json
+Same as other
+$ echo '{"plan": 12, "other": "x"}' > plan.json
+$ template-resolver render when.tpl --data plan.json
+Big
+```
+
+**Matching.** The subject and every value are compared as the equality rule of the [operators](#equality) says: when either side is a quoted text, both compare as text (`{{WHEN "1"}}` does not match `1.0`); otherwise numeric texts compare as numbers (`{{WHEN 1}}` matches `1.0` and `"01"`) and anything else as text. A variable counts as unquoted. `!=` is the negation of `==`. A null subject, or a missing one with strict mode off, is empty text, which `{{WHEN ""}}` matches. The comparison operators `>`, `<`, `>=` and `<=` need numbers on both sides: a side that is not numeric (empty text for a missing value included) is a located `type-error`, not "no match".
+
+```console
+$ echo '{"plan": "zz", "other": "x"}' > plan.json
+$ template-resolver render when.tpl --data plan.json
+when.tpl:8:1: error type-error: Cannot use operator '>=' with non-numeric values: "zz" >= "10"
+```
+
+**Variables that are missing.** A variable in a `{{WHEN}}` is looked up like the subject: a missing one is a `missing-variable` error in strict mode, located at the `{{WHEN}}`, and empty text with strict mode off. The error is raised only when matching reaches that `{{WHEN}}`.
+
+```console
+$ echo '{"plan": "5"}' > plan.json
+$ template-resolver render when.tpl --data plan.json
+when.tpl:5:1: error missing-variable: Variable 'other' not found
+$ template-resolver render when.tpl --data plan.json --no-strict
+Other
+```
+
+**Syntax errors.** These are `syntax-error` diagnostics located at the `{{WHEN}}` tag, in every mode, even in a branch that never renders: nothing after `WHEN`, an empty list item (`{{WHEN "a",}}`), an unterminated quote, a value that is neither a literal nor a variable path (`{{WHEN a b}}`), and a comparison with no value, with several values (`{{WHEN >= 1, 2}}`) or after a list item (`{{WHEN "a", > 5}}`).
+
+```console
+$ printf '{{CASE n}}{{WHEN >= 1, 2}}a{{END_WHEN}}{{END_CASE}}\n' > bad-when.tpl
+$ template-resolver render bad-when.tpl --data n.json
+bad-when.tpl:1:11: error syntax-error: '>=' in {{WHEN}} takes exactly one value
+```
+
+With `n.json` holding `{"n": 1}`.
 
 ---
 
@@ -522,6 +763,62 @@ Use parentheses for order of operations:
 ${{(base_price + tax) * quantity}}
 ```
 
+**Printing.** A result prints with at most 15 significant digits, so `0.1 + 0.2` prints `0.3` and `1 / 3` prints `0.333333333333333`. Integers of any size and negative numbers print unchanged.
+
+**Names with a hyphen.** A hyphen between two letters is part of a name: `${{first-name}}` reads the variable `first-name`. Arithmetic needs spaces around the minus (`a - b`); `n-1`, `x1-y` and `1-a` are arithmetic too, because a digit sits next to the hyphen. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form (`If you meant subtraction, write 'first - name'`).
+
+```console
+$ cat math.tpl
+Sum: ${{a + b}}
+Third: ${{1 / 3}}
+Name: ${{first-name}}, difference: ${{a - b}}
+$ template-resolver render math.tpl --data math.json
+Sum: 0.3
+Third: 0.333333333333333
+Name: Ada, difference: -0.1
+```
+
+With `math.json` holding `{"a": 0.1, "b": 0.2, "first-name": "Ada"}`.
+
+**Errors in math.** These are located `type-error` diagnostics (the position of the variable placeholder) in every mode, strict or not:
+
+- A zero divisor: `/` or `%` by zero, `0 / 0` and a divisor that computes to zero.
+- A malformed expression, whatever the data holds: `(1 + 2`, `1 +`, `1 + * 2` and `2 $ 3`. With strict mode off it is an error too, not empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty with strict mode off. A missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math.
+- A value that has no text form (a cyclic object or array, or a BigInt) used as output, as a `CASE` subject or before a filter that turns its value into text. `null` and a missing value still print as empty.
+
+```console
+$ cat zero.tpl
+Ratio: ${{a / b}}
+$ template-resolver render zero.tpl --data zero.json
+zero.tpl:1:8: error type-error: Cannot divide by zero in math expression
+$ printf '${{(a + b}}\n' > bad-math.tpl
+$ template-resolver render bad-math.tpl --data math.json --no-strict
+bad-math.tpl:1:1: error type-error: Unmatched parentheses in math expression
+$ printf 'Total: ${{total * }}\n' > bad-math2.tpl
+$ template-resolver render bad-math2.tpl --data math.json --no-strict
+bad-math2.tpl:1:8: error type-error: Invalid math expression
+```
+
+With `zero.json` holding `{"a": 1, "b": 0}`.
+
+**`render` only.** The zero divisor, the malformed expression, the unprintable value and the 15-digit printing apply to `render`: the command line, the HTTP API, the n8n node and core's `render`. Core's `resolveTemplate` keeps its old output for these (`Infinity`, `NaN` and the plain number), as it does for `standaloneLines`. The hyphenated names and the condition operators are the same in both.
+
+```console
+$ node -e '
+const { render, resolveTemplate } = require("./dist/core/src");
+const data = { a: 1, b: 0 };
+console.log(JSON.stringify(resolveTemplate("${{a / b}} ${{a % b}} ${{0.1 + 0.2}}", new Map(Object.entries(data)))));
+const r = render("${{a / b}}", data);
+console.log(r.ok, r.diagnostics[0].code);
+const loop = {}; loop.self = loop;
+const c = render("${{loop}}", { loop });
+console.log(c.ok, c.diagnostics[0].message);
+'
+"Infinity NaN 0.30000000000000004"
+false type-error
+false Cannot print a value with no text form (a cyclic structure or a BigInt)
+```
+
 ---
 
 ## Operators
@@ -540,6 +837,57 @@ ${{(base_price + tax) * quantity}}
 | `startsWith` | `url startsWith "https"`  | Prefix match     |
 | `endsWith`   | `file endsWith ".pdf"`    | Suffix match     |
 
+### Equality
+
+`==` and `!=` follow one rule, also used by the items of `in` and by [`{{WHEN}}`](#casewhen-case): when either side is a quoted literal, both sides compare as text; otherwise two numbers compare numerically and anything else compares as text. So `z == "01234"` is false when `z` is `1234` (the text `1234` is not `01234`), while `z == 1234` is true.
+
+```console
+$ cat eq.tpl
+{{IF z == "01234"}}text match{{ELSE}}no text match{{END_IF}}
+{{IF z == 1234}}number match{{ELSE}}no number match{{END_IF}}
+{{IF z == "1234"}}text equal{{END_IF}}
+$ template-resolver render eq.tpl --data eq.json
+no text match
+number match
+text equal
+```
+
+With `eq.json` holding `{"z": 1234}`.
+
+### Membership, range and length
+
+| Operator     | Example                        | Description                                                      |
+| ------------ | ------------------------------ | ---------------------------------------------------------------- |
+| `in`         | `role in ["admin", "owner"]`   | The left side is one of the items of a list, or a substring of a text |
+| `not in`     | `role not in allowed`          | The exact negation of `in`                                       |
+| `between`    | `score between [1, 10]`        | A number from the first to the second bound, both included       |
+| `.length`    | `tags.length > 2`              | Count of items of an array, or characters of a text              |
+
+- **`in` and `not in`** take a list literal in brackets (items are literals or variable paths separated by commas; `[]` is empty), a variable that holds a list, or a text (a quoted text or a variable holding one: a case-sensitive substring test). Items are compared by the [equality rule](#equality). A missing or null value on either side is not in the list (`not in` is true). The words are case-insensitive.
+- **`between [lo, hi]`** takes exactly two numbers or numeric texts (a boolean is not numeric here) and includes both ends; `lo` above `hi` is false. Anything else, such as a missing or non-numeric bound, a list that is not two items or a right side that is not a list literal, is a `type-error`. There is no `not between`: write `NOT (n between [1, 10])`.
+- **`.length`** is a path segment after any value: an array gives its element count and a text gives its length in UTF-16 code units (an emoji counts 2, as with the `length` filter). Any other value, or missing data, stays null, so no zero appears from nowhere. It works in conditions, in output (`${{tags.length}}`), in math and after other segments (`user.tags.length`). A variable that is itself named `length` is an ordinary variable.
+
+```console
+$ cat ops.tpl
+{{IF role in ["admin", "owner"]}}staff{{ELSE}}guest{{END_IF}}
+{{IF role in allowed}}allowed{{ELSE}}not allowed{{END_IF}}
+{{IF role not in allowed}}not in the list{{END_IF}}
+{{IF "ell" in word}}substring{{END_IF}}
+{{IF score between [1, 10]}}in range{{ELSE}}out of range{{END_IF}}
+{{IF tags.length > 2}}many tags{{END_IF}}
+Tags: ${{tags.length}}, name: ${{name.length}}
+$ template-resolver render ops.tpl --data ops.json
+staff
+not allowed
+not in the list
+substring
+in range
+many tags
+Tags: 3, name: 5
+```
+
+With `ops.json` holding `{"role": "owner", "allowed": ["a", "b"], "word": "hello", "score": 10, "tags": ["x", "y", "z"], "name": "Alice"}`.
+
 ### Type Checks
 
 | Operator     | Example               | Description         |
@@ -558,8 +906,33 @@ ${{(base_price + tax) * quantity}}
 | `AND`    | `a AND b`        | Both must be true  |
 | `OR`     | `a OR b`         | Either can be true |
 | `NOT()`  | `NOT(expired)`   | Negation           |
+| `&&`     | `a && b`         | The same as `AND`  |
+| `\|\|`   | `a \|\| b`       | The same as `OR`   |
+| `!`      | `!expired`       | The same as `NOT`  |
 | `()`     | `(a AND b) OR c` | Grouping           |
 
+`&&`, `||` and `!` are spellings of `AND`, `OR` and `NOT`:
+
+```console
+$ cat logic.tpl
+{{IF a && !b}}1{{END_IF}}{{IF b || a}}2{{END_IF}}{{IF !(a && b)}}3{{END_IF}}
+$ template-resolver render logic.tpl --data logic.json
+123
+```
+
+With `logic.json` holding `{"a": true, "b": false}`.
+
+### Unknown words
+
+A condition that holds a word the engine does not know is an error in every mode: `{{IF a like b}}` and `{{IF a matches "x"}}` are a located `type-error`, also in a branch that `AND` or `OR` would skip. There is no `matches` operator, and no pattern in a template is ever compiled. `validate` and `analyze` report the same condition as a warning (`analysis-warning`, `unrecognized-condition`) so that a template can be checked without data.
+
+```console
+$ cat like.tpl
+{{IF status is active}}Active{{END_IF}}
+$ template-resolver render like.tpl --data logic.json --no-strict
+like.tpl:1:1: error type-error: Unrecognized condition: status is active
+```
+
 ---
 
 ## Truthiness
@@ -736,15 +1109,16 @@ Render and validate results (`render`, `validate`, `POST /v1/render`, `POST /v1/
 
 | Code               | Severity | When                                                                                                   |
 | ------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
-| `syntax-error`     | error    | The template does not parse: unknown tag, unclosed block, bad `FOR` syntax, stray `END_*`             |
-| `type-error`       | error    | An operation fails on its values: non-numeric comparison or math, bad filter parameters, non-array `FOR` in strict mode |
+| `syntax-error`     | error    | The template does not parse: unknown tag, unclosed block, bad `FOR` or `WHEN` syntax, stray `END_*`   |
+| `type-error`       | error    | An operation fails on its values: non-numeric comparison or math, a division or remainder by zero, a malformed math expression, a value with no text form (a cyclic object or a BigInt), an unrecognized word in a condition, a bad or undeclared filter parameter, non-array `FOR` in strict mode |
 | `missing-variable` | error    | Strict mode and a placeholder reads a variable that is not in the data and has no `??` default         |
-| `unknown-filter`   | error    | A filter other than `head`, `tail`, `trim`, `escape_md`, `fence`, `heading_offset`                      |
+| `unknown-filter`   | error    | A filter that is not in the [filter table](#filters-name--filter)                                       |
 | `limit-iterations` | error    | FOR loops ran more than `maxIterations` iterations in total                                            |
 | `limit-output`     | error    | The output grew past `maxOutputChars`                                                                  |
 | `limit-depth`      | error    | Blocks nest deeper than `maxDepth`                                                                     |
+| `limit-nodes`      | error    | The template holds more than `maxNodes` nodes (each run of text, each placeholder, each comment and each block counts one) |
 | `invalid-input`    | error    | Core `render` was given data that is not an object (the CLI and the API reject such data before rendering) |
-| `analysis-warning` | warning  | `validate` only: a condition the engine cannot read, such as `{{IF status is active}}`                 |
+| `analysis-warning` | warning  | `validate` only: a condition the engine cannot read, such as `{{IF status is active}}` (`render` reports it as a `type-error`) |
 
 #### Analysis diagnostics
 
@@ -752,7 +1126,7 @@ Render and validate results (`render`, `validate`, `POST /v1/render`, `POST /v1/
 
 | Code                     | When                                                                                         |
 | ------------------------ | -------------------------------------------------------------------------------------------- |
-| `unknown-filter`         | A filter other than `head`, `tail`, `trim`, `escape_md`, `fence`, `heading_offset`           |
+| `unknown-filter`         | A filter that is not in the [filter table](#filters-name--filter)                            |
 | `unrecognized-condition` | A condition the engine cannot read, such as `{{IF status is active}}` (`validate` reports it as `analysis-warning`) |
 | `syntax-error`, `limit-depth` | `POST /v1/analyze` only: the template does not parse; the result has empty `variables`, `filters` and `blocks` and this one diagnostic |
 
@@ -774,8 +1148,19 @@ Limits bound the work of one render. Each can be lowered per render; anything le
 | `maxIterations`  | 10000     | Total FOR iterations across the whole render            | `limit-iterations` |
 | `maxOutputChars` | 1000000   | Length of the output                                    | `limit-output`     |
 | `maxDepth`       | 32        | Nesting of blocks (also applied by validate and analyze) | `limit-depth`      |
+| `maxNodes`       | 20000     | Size of the template: the nodes counted while it is parsed (each run of text, each placeholder, each comment and each block counts one; also applied by validate and analyze) | `limit-nodes`      |
+
+The command line sets them with `--max-iterations`, `--max-output-chars`, `--max-depth` and `--max-nodes`; the HTTP API with `options.limits` (a request can only lower the server's limits). `template-resolver spec` and `GET /v1/spec` report the defaults.
 
-The command line sets them with `--max-iterations`, `--max-output-chars` and `--max-depth`; the HTTP API with `options.limits` (a request can only lower the server's limits). `template-resolver spec` and `GET /v1/spec` report the defaults.
+The `limit-nodes` error is located at the node that crossed the limit, so it points at the place where the template grew too large. With `nodes.tpl` holding a two-line template and `nodes.json` holding `{"name": "A", "vip": true}`:
+
+```console
+$ cat nodes.tpl
+Hi ${{name}}
+{{IF vip}}VIP{{END_IF}}
+$ template-resolver render nodes.tpl --data nodes.json --max-nodes 5
+nodes.tpl:2:24: error limit-nodes: Template exceeds the maximum of 5 nodes
+```
 
 ---
 
@@ -813,6 +1198,7 @@ Exit codes for every command:
 | `--max-iterations n`                   | Lower or raise `maxIterations`                                           |
 | `--max-output-chars n`                 | Lower or raise `maxOutputChars`                                          |
 | `--max-depth n`                        | Lower or raise `maxDepth`                                                |
+| `--max-nodes n`                        | Lower or raise `maxNodes`                                                |
 | `--json`                               | Print the full structured render result instead of the text (exit codes unchanged) |
 
 Without `--json`, the output goes to stdout and diagnostics to stderr.
@@ -958,11 +1344,12 @@ $ template-resolver analyze greeting.tpl
 `spec` (the end of it, with the default limits, the render options and the syntax):
 
 ```console
-$ template-resolver spec | tail -n 19
+$ template-resolver spec | tail -n 20
   "limits": {
     "maxIterations": 10000,
     "maxOutputChars": 1000000,
-    "maxDepth": 32
+    "maxDepth": 32,
+    "maxNodes": 20000
   },
   "options": [
     {
@@ -1003,7 +1390,8 @@ Usage: template-resolver <command> [options]
 Commands:
   render <template-file|-> [--data <file|->] [--strict | --no-strict]
          [--standalone-lines | --no-standalone-lines]
-         [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]
+         [--max-iterations n] [--max-output-chars n] [--max-depth n]
+         [--max-nodes n] [--json]
       Render a template and print the output. A line holding only block tags
       is removed by default; --no-standalone-lines keeps it.
   validate <template-file|->   Check a template; prints {ok, diagnostics} as JSON.
@@ -1040,7 +1428,7 @@ The API is stateless JSON over HTTP. It listens on loopback (`127.0.0.1`) by def
 
 - POST bodies must be JSON with `Content-Type: application/json`, at most 1 MiB.
 - Template problems are results, not HTTP errors: `200` with `ok: false` and diagnostics. An `analyze` of a template that does not parse returns `200` with empty variables and the error in `diagnostics`.
-- `options.strictMode` defaults to `true`. `options.standaloneLines` (boolean) defaults to `true`; `false` keeps lines that hold only block tags (see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers)). `options.limits` takes `maxIterations`, `maxOutputChars` and `maxDepth`; a request can only lower the server's limits, so a value above the server's is capped at the server's. `validate` and `analyze` use the server's `maxDepth`.
+- `options.strictMode` defaults to `true`. `options.standaloneLines` (boolean) defaults to `true`; `false` keeps lines that hold only block tags (see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers)). `options.limits` takes `maxIterations`, `maxOutputChars`, `maxDepth` and `maxNodes`; a request can only lower the server's limits, so a value above the server's is capped at the server's. `validate` and `analyze` use the server's `maxDepth` and `maxNodes`.
 
 Request errors are `{"error": {"code", "message"}}`:
 
diff --git a/changelog.md b/changelog.md
index 8313a55..03769f7 100644
--- a/changelog.md
+++ b/changelog.md
@@ -19,6 +19,15 @@
 - `{{FENCE lang="..."}}` and the `fence` filter wrap content in a code fence longer than any backtick run inside it
 - `heading_offset=N` shifts markdown headings; `escape_md=block` also escapes line starts that would read as structure, `escape_md=inline` is the existing behavior
 - The OpenAPI document describes `options.standaloneLines`, the render options and trim and escape syntax in the spec, and accepts every block kind in the analysis `blocks` counts
+- Filter registry: one table feeds `render`, `validate`, `analyze` and `spec`; a filter is written `name`, `name=value` or `name:key=value,key=value`, quotes keep `=`, `,` and `:` inside a value, and an undeclared parameter is a located error in every mode
+- Text filters: `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` (half away from zero, on the digits) and `default`
+- Collection filters: `join`, `length`, `first`, `last`, `sort`, `unique`, `slice`, `lines` and `json`; a list prints as compact JSON and passes to the next filter as a list
+- Math and output errors in `render`: a division or remainder by zero and a value with no text form are located `type-error`s, and results print with at most 15 significant digits (`0.1 + 0.2` prints `0.3`); `resolveTemplate` keeps its old output for these
+- A malformed math expression is a located `type-error` even with strict mode off; a hyphen between two letters is part of a name (`first-name`) and subtraction needs spaces (`a - b`)
+- Condition operators `in`, `not in`, `between` and `.length`; `==` compares as text when a side is a quoted literal (`z == "01234"` is false for 1234); an unrecognized word in a condition is an error in every mode
+- `{{WHEN}}` takes a list of values (`{{WHEN "a", "b"}}`), a variable (`{{WHEN other}}`) or a comparison (`{{WHEN >= 10}}`); a malformed `{{WHEN}}` is a located syntax error
+- Limit `maxNodes` (default 20000) bounds the size of a template, with the `limit-nodes` diagnostic, the `--max-nodes` flag and `options.limits.maxNodes` in the HTTP API; `spec` reports it
+- README documents every filter, operator, limit option and `{{WHEN}}` form with examples that render as shown
 
 ### 1.0.0
 
diff --git a/docs/living/architecture/headless-contract.md b/docs/living/architecture/headless-contract.md
index 2837ded..e20d72b 100644
--- a/docs/living/architecture/headless-contract.md
+++ b/docs/living/architecture/headless-contract.md
@@ -12,16 +12,16 @@ Decisions already settled in the ADRs apply (0003 unknown names always error, 00
 ```ts
 interface Limits { maxIterations: number; maxOutputChars: number; maxDepth: number; maxNodes: number }
 // DEFAULT_LIMITS: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks), maxNodes 20000 (total AST nodes of the template, counted at parse)
-interface RenderOptions { strictMode?: boolean; limits?: Partial<Limits>; tokenEstimator?: (text: string) => number }
+interface RenderOptions { strictMode?: boolean; standaloneLines?: boolean; limits?: Partial<Limits>; tokenEstimator?: (text: string) => number }   // standaloneLines defaults to true in render, false in resolveTemplate
 interface Diagnostic { severity: "error" | "warning"; code: DiagnosticCode | "invalid-input" | "analysis-warning"; message: string; line: number; column: number; suggestion?: string }
 interface RenderResult { ok: boolean; output: string; messages: unknown[]; stats: { chars: number; estTokens: number; sectionsOmitted: number; iterations: number }; diagnostics: Diagnostic[] }
 render(template: string, data: Record<string, unknown>, options?: RenderOptions): RenderResult   // never throws for template or data problems
 validate(template: string, options?: { limits?: Partial<Limits> }): { ok: boolean; diagnostics: Diagnostic[] }
-analyze(template, options?: { limits? }): existing result plus `required` on each variable (= !optional) and `blocks: Partial<Record<"IF" | "CASE" | "FOR" | "LIST" | "TABLE", number>>` (count per block kind present)
-spec(): { version: string; blocks: {name, closes?, args, description}[]; filters: {name, params, description}[]; operators: string[]; limits: Limits; syntax: {variable, comment} }
+analyze(template, options?: { limits? }): existing result plus `required` on each variable (= !optional) and `blocks: Partial<Record<"IF" | "CASE" | "FOR" | "LIST" | "TABLE" | "SECTION" | "FENCE", number>>` (count per block kind present)
+spec(): { version: string; blocks: {name, closes?, args, description}[]; filters: {name, params, description}[]; operators: string[]; limits: Limits; options: {name, default, description}[]; syntax: {variable, comment, trim, escape} }
 ```
 
-- `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` is 0 until SECTION exists. `stats.iterations` is reported on failure too.
+- `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` counts the SECTION blocks omitted for an empty body. `stats.iterations` is reported on failure too.
 - Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `limit-nodes` (carried by `TemplateError` as `DiagnosticCode`), plus `invalid-input` (render, data not an object) and `analysis-warning` (validate). Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
 - On failure `ok` is false, `output` is `""`, and the only diagnostic is the error that stopped rendering.
 - `validate` maps `analyze`'s diagnostics: `unknown-filter` stays an error; every other analysis finding (an unrecognized condition) becomes a warning with code `analysis-warning`. A template that does not parse gives its error. `ok` is false only when an error is present.
@@ -38,14 +38,14 @@ spec(): { version: string; blocks: {name, closes?, args, description}[]; filters
 
 | Route | Request body | Response (200) |
 |---|---|---|
-| POST /v1/render | `{template, data?, options?: {strictMode?, limits?}}` | RenderResult |
+| POST /v1/render | `{template, data?, options?: {strictMode?, standaloneLines?, limits?}}` | RenderResult |
 | POST /v1/validate | `{template}` | `{ok, diagnostics}` |
 | POST /v1/analyze | `{template}` | analysis |
 | GET /v1/spec | | spec() |
 | GET /v1/openapi.json | | the committed `api/openapi.json` |
 
 - Template problems are results, not HTTP errors: 200 with `ok: false` and diagnostics. An unparseable template on `/v1/analyze` gives 200 with empty variables, filters and blocks and the error in `diagnostics`.
-- Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, non-object body, missing or non-string `template`, non-object `data`, `options` or `options.limits`, non-boolean `strictMode`, a limit that is not a non-negative integer); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON; 500 `internal-error` for an unexpected exception. All responses are JSON.
+- Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, non-object body, missing or non-string `template`, non-object `data`, `options` or `options.limits`, non-boolean `strictMode` or `standaloneLines`, a limit that is not a non-negative integer); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON; 500 `internal-error` for an unexpected exception. All responses are JSON.
 - Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's (the effective value is the minimum). `validate` and `analyze` use the server's `maxDepth` and `maxNodes`.
 - `api/openapi.json` is committed, OpenAPI 3.1, describes every route, request and response schema; a test proves its paths and methods equal the router's table.
 
@@ -53,7 +53,7 @@ spec(): { version: string; blocks: {name, closes?, args, description}[]; filters
 
 `template-resolver <render|validate|analyze|spec|serve> [options]`
 
-- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--max-nodes n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged). Strict by default; limit flags set the render's limits directly.
+- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--standalone-lines | --no-standalone-lines] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--max-nodes n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged). Strict by default; limit flags set the render's limits directly.
 - `validate <template-file|->`, `analyze <template-file|->`: print JSON; `validate` exits 1 when not ok; `analyze` of an unparseable template prints the diagnostic to stderr and exits 1.
 - `spec`: prints the spec JSON. `serve [--port n] [--host h]`: starts the API with default server options (default 127.0.0.1:3000), prints `listening on http://host:port`, and on SIGINT or SIGTERM closes and exits 0; a port that cannot be bound exits 2.
 - `-` reads stdin; only one input may be stdin. `--help` prints usage to stdout (exit 0); no arguments print usage to stderr (exit 2).
diff --git a/docs/living/architecture/language-contract.md b/docs/living/architecture/language-contract.md
index c28dcfd..ff6d90b 100644
--- a/docs/living/architecture/language-contract.md
+++ b/docs/living/architecture/language-contract.md
@@ -1,5 +1,5 @@
 ---
-summary: "New language contract: filter registry and argument syntax first; later cards append their constructs"
+summary: "The template language contract: the filter registry and its 23 filters, math and output errors, condition operators, CASE matchers, the node limit and the surfaces that must agree"
 state: built
 ---
 
@@ -11,12 +11,12 @@ state: built
 
 <!-- What this document is for and who reads it. Link to related documents, never copy them. Add the sections this kind of document needs below. -->
 
-The contract for the template language beyond the prompt-aware constructs: filters, operators, CASE and FOR upgrades, SET, INPUT, macros and partials. It is written one card at a time; the first section is the filter registry. Settled decisions apply: [ADR 0001](../decisions/adr/0001-house-style-for-every-block.md) (paired blocks), [ADR 0003](../decisions/adr/0003-unknown-names-are-always-errors.md) (unknown names are errors in every mode). Companion: [prompt-aware-contract.md](prompt-aware-contract.md).
+The contract for the template language beyond the prompt-aware constructs: the filter registry and its filters, math and output errors, condition operators, CASE matchers and the node limit. SET, INPUT, CALL, macros and partials are not built yet; [ADR 0007](../decisions/adr/0007-statement-tags-without-a-body.md) records that SET, INPUT and CALL will be single tags. Settled decisions apply: [ADR 0001](../decisions/adr/0001-house-style-for-every-block.md) (paired blocks), [ADR 0003](../decisions/adr/0003-unknown-names-are-always-errors.md) (unknown names are errors in every mode). Companion: [prompt-aware-contract.md](prompt-aware-contract.md).
 
 ## Filters
 
 - **One registry.** Every filter is one definition in one table: `name`, `params` (the signature text spec() shows), `description`, `paramNames` (the named parameters it accepts; the shorthand `name=value` is the parameter `value`) and `apply(input, params)`. render, `spec()`, `analyze` and `validate` read this table and nothing else; a filter added to it is accepted by all four. `spec()` shows only `name`, `params` and `description`.
-- **Groups.** Core filters live in `filters.ts`; text filters and collection filters are added by later cards to `filters-text.ts` and `filters-collection.ts`, which the registry includes.
+- **Groups.** The six core filters (`head`, `tail`, `trim`, `escape_md`, `fence`, `heading_offset`) live in `filters.ts`; the eight text filters are in `filters-text.ts` and the nine collection filters in `filters-collection.ts`, which the registry includes: 23 filters in all.
 - **Values.** A filter receives the resolved value and returns a value; the text printed is the output step's text form of the final value. The existing filters coerce their input to text exactly as the output step does, so no existing output changes.
 - **Arguments.** A filter call is written `name`, `name=value` or `name:key=value,key=value`. It is parsed once at parse time, respecting quotes: `fence="a=b"` and `fence="a:b"` keep the whole value. A parameter name the filter does not declare (`escape_md:mode=block`) is a `type-error` located at the variable (ADR 0003), in every mode.
 - **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
@@ -38,6 +38,7 @@ Group in `filters-text.ts`. Each coerces its input to text as the output step pr
 | `default="x"` | `x` (required) when the raw value is not truthy by the language rule: missing, null, empty or whitespace-only text, the texts `0`, `false` and `no` in any letter case, the number 0, false, an empty list or an empty object; else the value. `??` keeps its own rule |
 
 In strict mode a missing variable is reported before `default` runs, so `default` replaces missing data in lenient mode only.
+
 ### Collection filters
 
 Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines`, `json`.
@@ -67,6 +68,7 @@ Conditions are the same in `render` and `resolveTemplate`. Strict mode governs m
 
 - **in, not in.** `x in ["a", y, 3]`, `x in list_var`, `x in "text"`; the words are case-insensitive. A list literal holds operands (literals or variable paths) separated by commas outside quotes; `[]` is empty, while an empty item, a nested `[` or a missing `]` is an error. Against an array, true when an element equals x by the equality rule below (array, object and BigInt elements never match); against a text (quoted or from a variable), a case-sensitive substring test, so an empty x is contained and a text holding JSON is still only a text. A left side that is an array, an object (cyclic or not) or a BigInt is a `type-error` first, whatever the right side holds, a missing one included. Then a missing or null x, or a missing or null right side, gives false (`not in`: true). A right side that is a number, a boolean or an object is a `type-error`. `not in` is exactly the negation of `in`.
 - **between.** `x between [lo, hi]`: exactly two operands, each a number or numeric text (a boolean, `true` or `false`, is not numeric here, though `>` still reads it as 1 or 0); inclusive at both ends; `lo` above `hi` is false. A non-numeric or missing operand, a list that is not two items and a right side that is not a list literal are a `type-error`. There is no `not between`.
+- **Logic.** `AND`, `OR` and `NOT` are read in any letter case; `&&`, `||` and `!` are spellings of the same three (`NOT x`, `NOT (x)` and `!x` negate), and parentheses group. `spec().operators` lists `AND`, `OR` and `NOT` only.
 - **Precedence.** `in`, `not in` and `between` split at the tier of `contains`: after AND, OR, NOT and the comparison operators, before type checks, outside quotes, brackets and parentheses, so `NOT x in [..]`, `a in [..] AND b` and `(a) OR (b between [1, 2])` need no extra rule. Chaining two operators (`a in b == c`) is an error. An operator word inside quotes never splits.
 - **.length.** A path segment `length` after any value: an array gives its element count; a text gives its UTF-16 code units (as the `length` filter does, so one emoji is 2) unless it is a JSON object text with its own key `length`; an object with its own key `length` returns that key's value, null included. Any other value, and any missing data, stays null (no zero). Works in conditions, output, math, CASE subjects and after other segments (`user.tags.length`, `items.0.length`); a root variable named `length` is an ordinary variable.
 - **Equality.** `==` and `!=`: when either side is a quoted literal both sides compare as text (`z == "01234"` is false for 1234, `"1.0" == 1` is false); otherwise numbers compare numerically and anything else as text, as before. `in` list items follow the same rule. For `contains`, `startsWith` and `endsWith` an unquoted number on the right keeps its written text (`x contains 1.50`, `007`).
@@ -82,3 +84,15 @@ Conditions are the same in `render` and `resolveTemplate`. Strict mode governs m
 - **Matching.** The subject and every matcher become text the way the subject always did (missing and null are empty text, lists and objects are JSON, a cyclic value or a BigInt is the located `type-error`). A variable matcher is read with the subject's own lookup: a missing name is a located `missing-variable` error in strict mode and empty text in lenient mode. Equality is the one rule of the operators above: when either side is a quoted text both compare as text (`WHEN "1"` does not match `1.0`), otherwise numeric texts compare as numbers (`WHEN 1` matches `1.0` and `"01"`) and anything else as text; a variable counts as unquoted. `!=` negates `==`. `>`, `<`, `>=` and `<=` compare numbers like the same operators in conditions; a side that is not numeric, empty text for a missing or null value included, is a `type-error`, never false. A runtime error in a matcher is located at its WHEN; the old single form `{{WHEN "x"}}` matches as before, `{{WHEN ""}}` matching a missing or null subject.
 - **Errors.** At parse, in every mode and entry point: nothing after `WHEN`, an empty list item (`"a",`), an unterminated quote, a matcher that is neither a literal nor a variable path (`a b`, `"a" "b"`, `1abc`, `limit-1`, `a@b`), and a comparison with no matcher, with several (`>= 1, 2`) or after a list item (`"a", > 5`) are a `syntax-error` located at the WHEN tag, even in a branch that never renders.
 - **spec and analyze.** `spec()` lists the WHEN arguments as `value[, value...] | variable | operator value`. `analyze` records every variable path of a WHEN (list or comparison) as `case` usage, not optional, with the subject's own rules (loop names and `@` names excluded, literals never recorded).
+
+## Node limit
+
+- **maxNodes.** `Limits.maxNodes` (default 20000, `DEFAULT_LIMITS`) bounds the size of a template, partials excluded because none exist yet. The parser counts every node it builds except the program root, parent before children, at the node's opening token; node `maxNodes + 1` is a `limit-nodes` error located at that token, with the suggestion "Shorten the template or raise limits.maxNodes". It is raised in `render`, `validate`, `analyze` and `resolveTemplate`, in every mode, before any output is produced.
+- **Long chains.** An ELSEIF chain is parsed, run and analyzed in loops, so a very long chain ends in a result or in `limit-nodes`, never in a stack overflow.
+- **Surfaces.** The CLI takes `--max-nodes n` (it can raise as well as lower), the HTTP API takes `options.limits.maxNodes` (it can only lower the server's value; `validate` and `analyze` use the server's), the OpenAPI document lists it in its Limits schema, and `spec().limits` reports it. `analyze` applies the caller's limits, else the defaults.
+
+## Surfaces that agree
+
+- **One source each.** `spec().blocks` lists every opening keyword the lexer accepts with its `END_` keyword as `closes` (`ELSEIF` and `ELSE` have none); `spec().filters` is the registry; `spec().operators` lists the operators of the conditions: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean`, `AND`, `OR`, `NOT`, `in`, `not in`, `between` and `.length`.
+- **A test keeps them in step.** `tests/language/surfaces.test.ts` fails when a lexer keyword, a registry filter or an evaluator operator is not in `spec()`, when `spec()` lists a block or filter the lexer or registry lacks, or when the README lacks a filter, an operator, a limit key, `--max-nodes`, `limit-nodes` or the showcase template of the golden case `tests/golden/render-cases/lang-filters-showcase/`.
+- **The README.** It documents each filter, operator, limit option and WHEN form with examples that were run; the showcase example is the golden case's template, so it renders as shown.
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index f09d435..30f31ea 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -36,7 +36,7 @@ Pipeline: `resolveTemplate(template, variables, options)` runs `new Lexer(templa
 
 ## Interface
 
-Exports (via `index.ts`) used by callers: `resolveTemplate(template: string, variables: VariableMap, options?: { strictMode?: boolean }): string` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22-26]; `Lexer`, `Parser`, `Interpreter` classes; `evaluateCondition`, `evaluateExpression`, `evaluateMathExpression`, `isTruthy`; `parseFilter`, `applyFilter`, `applyFilters`; the `tryCoerceTo*` functions; `extractAllVariables`; the error classes [src: nodes/TemplateResolver/index.ts:2-29]
+Exports (via `index.ts`) used by callers: `resolveTemplate(template: string, variables: VariableMap, options?: { strictMode?: boolean; limits?: Partial<Limits>; standaloneLines?: boolean }): string` (limits left out take `DEFAULT_LIMITS`; `standaloneLines` defaults to false here, true in `render`) [src: core/src/resolve.ts]; `Lexer`, `Parser`, `Interpreter` classes; `evaluateCondition`, `evaluateExpression`, `evaluateMathExpression`, `isTruthy`; `parseFilter`, `applyFilter`, `applyFilters`; the `tryCoerceTo*` functions; `extractAllVariables`; the error classes [src: nodes/TemplateResolver/index.ts:2-29]
 
 `VariableMap` is `Map<string, TemplateValue>`; a `TemplateValue` is string, number, boolean, null, undefined, an array or an object of those [src: nodes/TemplateResolver/types.ts:5-17]. `Interpreter` defaults `strictMode` to `true` when the option is absent [src: nodes/TemplateResolver/interpreter.ts:53]
 
@@ -101,14 +101,14 @@ Added in the current tree (`core/src/whitespace.ts`, the lexer, parser and inter
 - `${{` starts a variable token; content runs to the first `}}` and is trimmed; no nesting [src: nodes/TemplateResolver/lexer.ts:149-153] [src: nodes/TemplateResolver/lexer.ts:178-200]
 - A bare `{{` starts a tag; spaces and tabs after `{{` are skipped; `{{#` begins a comment ended by `#}}` and becomes a `COMMENT` token [src: nodes/TemplateResolver/lexer.ts:214-231] [src: nodes/TemplateResolver/lexer.ts:257-277]
 - A tag body is scanned to its matching `}}`, counting nested `{{` pairs [src: nodes/TemplateResolver/lexer.ts:320-346]
-- The keyword is the leading run of `[A-Z_]` characters; it must be one of the 22 listed names (`IF`, `ELSEIF`, `ELSE`, `END_IF`, `CASE`, `WHEN`, `DEFAULT`, `END_WHEN`, `END_DEFAULT`, `END_CASE`, `FOR`, `END_FOR`, `LIST`, `LIST_ITEM`, `END_LIST_ITEM`, `END_LIST`, `TABLE`, `HEADER`, `END_HEADER`, `ROW`, `END_ROW`, `END_TABLE`) or a `SyntaxError` "Unknown template tag" is thrown, except that content equal to an inherited `Object.prototype` member name (for example `{{constructor}}`) is not rejected there and fails later in the parser with "Unexpected token" [src: nodes/TemplateResolver/lexer.ts:359-394] [src: nodes/TemplateResolver/lexer.ts:237-244]. Keywords are case-sensitive uppercase; a plain `{{name}}` without `$` reaches this error. [src: nodes/TemplateResolver/lexer.ts:237-244]
+- The keyword is the leading run of `[A-Z_]` characters; it must be one of the 28 listed names (`IF`, `ELSEIF`, `ELSE`, `END_IF`, `CASE`, `WHEN`, `DEFAULT`, `END_WHEN`, `END_DEFAULT`, `END_CASE`, `FOR`, `END_FOR`, `LIST`, `LIST_ITEM`, `END_LIST_ITEM`, `END_LIST`, `TABLE`, `HEADER`, `END_HEADER`, `ROW`, `END_ROW`, `END_TABLE`, `RAW`, `END_RAW`, `SECTION`, `END_SECTION`, `FENCE`, `END_FENCE`) or a `SyntaxError` "Unknown template tag" is thrown, except that content equal to an inherited `Object.prototype` member name (for example `{{constructor}}`) is not rejected there and fails later in the parser with "Unexpected token" [src: nodes/TemplateResolver/lexer.ts:359-394] [src: nodes/TemplateResolver/lexer.ts:237-244]. Keywords are case-sensitive uppercase; a plain `{{name}}` without `$` reaches this error. [src: nodes/TemplateResolver/lexer.ts:237-244]
 - Text between tags becomes `TEXT` with `\r\n` normalized to `\n` [src: nodes/TemplateResolver/lexer.ts:289-315]
-- After `EOF`, `validateBlocks` requires every `IF`, `FOR`, `CASE`, `TABLE`, `LIST` to be closed in stack order by its `END_*`; `WHEN`, `DEFAULT`, `LIST_ITEM`, `HEADER`, `ROW` are not tracked there [src: nodes/TemplateResolver/lexer.ts:28-137]
+- After `EOF`, `validateBlocks` requires every `IF`, `FOR`, `CASE`, `TABLE`, `LIST`, `SECTION` and `FENCE` to be closed in stack order by its `END_*` (an unclosed `SECTION` is reported at the latest `SECTION` tag opened inside it); `WHEN`, `DEFAULT`, `LIST_ITEM`, `HEADER`, `ROW` are not tracked there, and `RAW` content is one literal token [src: core/src/lexer.ts validateBlocks]
 - The lexer header comment lists a ternary form `{{condition ? "true" : "false"}}`, but the lexer has no ternary path and the parser never creates a `Ternary` node, although `TernaryNode` and `visitTernary` exist [src: nodes/TemplateResolver/lexer.ts:14] [src: nodes/TemplateResolver/types.ts:107-112] [src: nodes/TemplateResolver/interpreter.ts:411-419] [open: Q3]
 
 ### Parsing (tags supported)
 
-- Variable `${{path}}`: split on `|` first (rest are filters, stored as raw strings), then on the first `??` (default value, outer quotes stripped), then path split on `.` [src: nodes/TemplateResolver/parser.ts:131-171]
+- Variable `${{path}}`: split on `|` first (rest are filters, each parsed into a `FilterCall` `{ name, params }` at parse time, quote-aware), then on the first `??` (default value, outer quotes stripped), then path split on `.` [src: nodes/TemplateResolver/parser.ts:131-171]
 - `{{IF cond}}` ... `{{ELSEIF cond}}` ... `{{ELSE}}` ... `{{END_IF}}`; `ELSEIF` chains become nested `If` nodes in `alternate`; `END_IF` is required [src: nodes/TemplateResolver/parser.ts:176-293] [src: nodes/TemplateResolver/parser.ts:298-350]
 - `{{CASE expr}}` containing `{{WHEN "v"}}...` and `{{DEFAULT}}...`; only whitespace text between clauses is allowed; `END_WHEN` and `END_DEFAULT` are optional; each `WHEN` reads a list of values and variables or one comparison into `WhenNode.match` (`parseWhenMatch`; `WhenNode.value` keeps the first quoted text); a malformed WHEN is a `syntax-error` at the tag [src: core/src/parser.ts parseWhen] [src: core/src/expressions.ts parseWhenMatch]
 - `{{FOR path AS name}}` ... `{{END_FOR}}`; regex `FOR\s+(.+?)\s+AS\s+(\w+)`, case-insensitive; the iterable path is split on `.` [src: nodes/TemplateResolver/parser.ts:490-544]
@@ -132,11 +132,11 @@ Added in the current tree (`core/src/whitespace.ts`, the lexer, parser and inter
 
 ### Conditions and operators (`expressions.ts`)
 
-Order tried by `evaluateCondition`: `NOT(...)` wrapper, outer parentheses, then ` OR ` (rightmost split), ` AND ` (rightmost split), comparison, string operator, type check, finally truthiness of the resolved value [src: nodes/TemplateResolver/expressions.ts:66-108] [src: nodes/TemplateResolver/expressions.ts:129-178]
+Order tried by `evaluateCondition`: every operand is checked first (an unreadable one is an "Unrecognized condition" error), then outer parentheses, the logical operators (`OR` rightmost split, then `AND`), negation (`NOT x`, `NOT (x)`, `!x`), comparison, `in` and `not in`, `between`, the string operators, the type checks, finally truthiness of the resolved value [src: core/src/expressions.ts evaluateConditionText]
 
-- `AND`, `OR`, `NOT(` are uppercase, space-delimited and matched only outside parentheses (for `AND`/`OR`) [src: nodes/TemplateResolver/expressions.ts:138-156]
-- Comparison `== != >= <= > <` found left to right outside quotes; `==` and `!=` compare `String(left)` and `String(right)`; ordering operators coerce both sides to numbers and throw `TypeError` if either is not numeric [src: nodes/TemplateResolver/expressions.ts:182-238] [src: nodes/TemplateResolver/expressions.ts:243-272]
-- String operators `contains`, `startsWith`, `endsWith` (the operator word is matched in any letter case; the text match itself is case-sensitive); the right side is a literal with outer quotes stripped, not a variable; a left side that is `null` yields `false` [src: nodes/TemplateResolver/expressions.ts:277-306]
+- `AND`, `OR` and `NOT` are read in any letter case, with `&&`, `||` and `!` as spellings; `AND` and `OR` split only outside parentheses and quotes [src: core/src/expressions.ts splitLogical, splitNegation]
+- Comparison `== != >= <= > <` found left to right outside quotes; `==` and `!=` use `valuesEqual` (when either side is a quoted literal both compare as text, otherwise two numbers compare numerically and anything else as text); ordering operators coerce both sides to numbers and throw a located `type-error` if either is not numeric [src: core/src/expressions.ts valuesEqual, evaluateNumericComparison]
+- String operators `contains`, `startsWith`, `endsWith` (the operator word is matched in any letter case; the text match itself is case-sensitive); both sides are read as operands (a quoted text, a literal or a variable path), and an unquoted number on the right keeps its written text; a left side that is `null` yields `false` [src: core/src/expressions.ts tryEvaluateStringOp]
 - `in`, `not in` and `between [lo, hi]` split at the tier of the string operators, after comparison and before type checks, outside quotes, brackets and parentheses (`splitMembership`, `splitBetween`, shared by `evaluateCondition` and `conditionOperands`, so `analyze` reads the same operands); `.length` is one helper (`builtInLength`) used by both path walkers (`resolveValue` here and `resolveNestedPath` in `interpreter.ts`). A quoted literal side makes `==`, `!=` and `in` compare as text; an unquoted number right of `contains` keeps its written text; every operand with bare whitespace outside quotes is an "Unrecognized condition" `type-error` in every mode, checked before evaluation so a short-circuited branch cannot hide it. Rules: [language contract](../language-contract.md#condition-operators)
 - Type checks `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean` as a trailing word [src: nodes/TemplateResolver/expressions.ts:311-359]
 - Operand resolution: literals `true`, `false`, `null`, numbers and quoted strings; otherwise a dotted path over the variable map where string intermediates are `JSON.parse`d and a missing name yields `undefined` rather than an error [src: nodes/TemplateResolver/expressions.ts:364-416]. Conditions therefore never raise `MissingVariableError`. [src: nodes/TemplateResolver/expressions.ts:364-416]
@@ -145,9 +145,9 @@ Order tried by `evaluateCondition`: `NOT(...)` wrapper, outer parentheses, then
 
 ### Filters
 
-Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the text and collection groups are `filters-text.ts` and `filters-collection.ts`): `render`, `spec()`, `analyze` and `validate` all read that table, and a definition added to it is accepted by all four. Filters receive and return values; the six built-ins coerce to text first. A call is parsed once at parse time, quote-aware (`fence="a=b"` keeps `a=b`), and a parameter the filter does not declare is a located `type-error` in every mode (also reported by `validate` and `analyze`). An unterminated quote in a `??` default is plain text and no longer hides the filters after it. The text group `filters-text.ts` adds `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` and `default`; a bad parameter value throws from the filter and is reported as a `type-error` at the variable. See `docs/living/architecture/language-contract.md`. The paragraph below describes the older string-only behavior and the filter names it lists.
+Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the text and collection groups are `filters-text.ts` and `filters-collection.ts`): `render`, `spec()`, `analyze` and `validate` all read that table, and a definition added to it is accepted by all four. Filters receive and return values; the six built-ins coerce to text first. A call is parsed once at parse time, quote-aware (`fence="a=b"` keeps `a=b`), and a parameter the filter does not declare is a located `type-error` in every mode (also reported by `validate` and `analyze`). An unterminated quote in a `??` default is plain text and no longer hides the filters after it. The text group `filters-text.ts` adds `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` and `default`; a bad parameter value throws from the filter and is reported as a `type-error` at the variable. See `docs/living/architecture/language-contract.md`.
 
-Applied left to right to the string form of the value, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: nodes/TemplateResolver/filters.ts:11-65]. Implemented names: `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; `0` gives `""`; negative N drops the first N), `trim`, `escape_md` (backslash-escapes `\ * _ [ ] ( ) # ` > ~ |`) [src: nodes/TemplateResolver/filters.ts:89-186]. Any other name throws a plain `Error` "Unknown filter" [src: nodes/TemplateResolver/filters.ts:99-100]
+Filters are applied left to right, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: core/src/filters.ts parseFilter]. The core filters are `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; negative N drops the first N), `trim`, `escape_md[=inline|block]`, `fence[=lang]` and `heading_offset=N`; an unknown name is an `unknown-filter` error.
 
 Collection filters (`filters-collection.ts`): `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines` and `json`. List input is coerced as FOR coerces it, a missing value is the empty list, an object given to a list filter is a `type-error`, `sort` and `json` are deterministic (code-unit order, sorted keys) and `json` rejects a cyclic value. Details: `docs/living/architecture/language-contract.md`.
 
@@ -162,8 +162,8 @@ Collection filters (`filters-collection.ts`): `join=SEP`, `length`, `first`, `la
 
 - Error classes: `TemplateError(message, line, column, suggestion?)` formats its message as a line starting with a glyph prefix, then `Template Error (line L, col C):`, the message on an indented line, and an optional `Suggestion:` line; subclasses set `name` to `SyntaxError`, `TypeError`, `MissingVariableError` and shadow the global names [src: nodes/TemplateResolver/errors.ts:4-60]. `MissingVariableError` text is `Variable 'x' not found`; when variables are defined the suggestion lists them and names "Lenient Mode", otherwise it reads "No variables defined. Check variable mappings." [src: nodes/TemplateResolver/errors.ts:65-81] [open: Q7]
 - The prefix glyph in the source file is stored as mojibake (bytes `c3 a2 c2 9d c5 92`), not a clean emoji [src: nodes/TemplateResolver/errors.ts:22] [open: Q8]
-- Position info: lexer and parser errors carry real token line and column; runtime errors from the interpreter and expressions use fixed `1, 1` (`MissingVariableError`, math and comparison `TypeError`) or the node's own position (`FOR` `TypeError`) [src: nodes/TemplateResolver/interpreter.ts:470-475] [src: nodes/TemplateResolver/expressions.ts:252-257] [src: nodes/TemplateResolver/interpreter.ts:203-208]
-- Filter errors (`Unknown filter`, `head`/`tail` parameter problems) are plain `Error`, not `TemplateError`, and carry no position [src: nodes/TemplateResolver/filters.ts:100-117] [src: nodes/TemplateResolver/filters.ts:131-139]
+- Position info: every error carries the 1-based line and column of the node that failed. Lexer and parser errors use their token; runtime errors (missing variable, math, comparison, filter, unprintable value) are relocated to the evaluating node, so a diagnostic never reports a placeholder `1, 1` [src: core/src/errors.ts] [src: core/src/interpreter.ts]
+- Filter errors (an unknown name, an undeclared parameter, a bad parameter value) are thrown by `applyFilter` or the filter and converted to a `TemplateError` at the node that evaluates them: `unknown-filter` for an unknown name, `type-error` otherwise [src: core/src/filters.ts applyFilter]
 - Structural errors raised: unknown tag, unclosed variable, tag or comment, unmatched or unclosed block, missing `END_*`, bad `FOR` syntax, unexpected text or token inside `CASE`, `LIST`, `TABLE`, `consume` mismatch [src: nodes/TemplateResolver/lexer.ts:55-123] [src: nodes/TemplateResolver/lexer.ts:203-208] [src: nodes/TemplateResolver/lexer.ts:237-244] [src: nodes/TemplateResolver/lexer.ts:278-283] [src: nodes/TemplateResolver/lexer.ts:348-353] [src: nodes/TemplateResolver/parser.ts:364-396] [src: nodes/TemplateResolver/parser.ts:529-534] [src: nodes/TemplateResolver/parser.ts:555-585] [src: nodes/TemplateResolver/parser.ts:668-711] [src: nodes/TemplateResolver/parser.ts:914-924]
 - Strict mode: affects missing root variables (not in conditions) and non-iterable `FOR` values; with `??` present a missing root does not throw [src: nodes/TemplateResolver/interpreter.ts:121-122] [src: nodes/TemplateResolver/interpreter.ts:468-477]
 - Node level: any error inside the item loop is caught; with `continueOnFail()` the item becomes `{ error: message, error_type: name }`; otherwise a `NodeOperationError` is rethrown as is, or any other error is wrapped in a new `NodeOperationError` with the same message and `itemIndex` [src: nodes/TemplateResolver/TemplateResolver.node.ts:259-280]. Wrapping drops the original class name from the thrown error. [src: nodes/TemplateResolver/TemplateResolver.node.ts:273-279]
@@ -184,11 +184,11 @@ Collection filters (`filters-collection.ts`): `join=SEP`, `length`, `first`, `la
 - Q5. `isTruthy` comment lists `null`, `undefined` and `none` strings as falsy but the code treats them as truthy. Which is intended is unknown.
 - Q7. `MissingVariableError` suggests enabling "Lenient Mode", while the node parameter is named "Strict Mode". Whether another name for the setting exists is unknown.
 - Q8. The error-message prefix is double-encoded text in the source; whether tests or consumers depend on the exact bytes is unknown (tests not read). Several comments in `lexer.ts`, `parser.ts`, `filters.ts` and `coercion.ts` show the same encoding damage for arrows.
-- Q9. The interpreter prints swallowed math errors with `console.log`; whether that output is intended for n8n execution logs is unknown. Looked at: `interpreter.ts:111-118`.
+- Q9. Answered: the interpreter no longer prints swallowed math errors; `core/src` holds no `console.log`.
 - Q10. Whether tests exercise a `FOR` item name used as `${{item}}` under strict mode, and whether that behavior is intended, was not checked (tests not read).
 
 ## Answered
 
 - Q2. Code path: `extractAllVariables` adds the root of every `${{name}}`, including a `FOR ... AS` item name, to the detected set (`utils.ts:13-45`), and in strict mode the node throws when a detected name has no mapping (`TemplateResolver.node.ts:216-229`). Answered from source by research:lead.
 
-- Q6. A leading negative number such as `-3 + 1` ends in `MissingVariableError` for the key `-3 + 1` in strict mode and renders empty in lenient mode: the math attempt fails ("Invalid math expression"), the error is swallowed, and normal lookup finds no such key. Answered from source by research:lead (`interpreter.ts:110-119`, `interpreter.ts:468-477`, `expressions.ts:564-566`).
+- Q6. A leading negative number such as `-3 + 1` ended in `MissingVariableError` for the key `-3 + 1` when this document was recovered; in the current tree it is arithmetic and prints `-2` (see Math above, `expressions.ts` sign rule). Answered from source by research:lead and rechecked against `core/src`.
diff --git a/docs/living/decisions/adr/0007-statement-tags-without-a-body.md b/docs/living/decisions/adr/0007-statement-tags-without-a-body.md
index 3cbf24f..3b99217 100644
--- a/docs/living/decisions/adr/0007-statement-tags-without-a-body.md
+++ b/docs/living/decisions/adr/0007-statement-tags-without-a-body.md
@@ -1,12 +1,27 @@
 ---
 summary: "ADR: SET, INPUT and CALL are single tags without an END, like ELSE"
+type: adr
+domain: language
+status: accepted
+date: 2026-10-14
 state: planned
 ---
 
 # 0007 statement tags without a body
 
-<!-- Fill the summary with one sentence a reader can use to decide whether to open this document. State starts as planned; it becomes built when the work ships and validated only after a close review. -->
+**Context.** [ADR 0001](0001-house-style-for-every-block.md) gives every block the paired form `{{KEYWORD}}...{{END_KEYWORD}}`. Three constructs planned for the language do not wrap anything: `SET` names a value, `INPUT` declares a typed input and `CALL` outputs the text of a macro. A paired form for them would be an empty block (`{{SET x ...}}{{END_SET}}`). The language already has single tags: `ELSE` and `ELSEIF` mark a part inside an `IF` block, and neither has an END keyword. The tags themselves are not built yet; this decision settles their shape before they are.
 
-## Purpose
+**Options considered.**
 
-<!-- What this document is for and who reads it. Link to related documents, never copy them. Add the sections this kind of document needs below. -->
+1. Paired empty blocks: `{{SET name = value}}{{END_SET}}`. Keeps ADR 0001 literally, but every statement needs a closer that holds nothing, the lexer tracks a closer for no reason, and a forgotten closer becomes a new error class.
+2. Single tags without an END, like `ELSE`: `{{SET name = value}}`, `{{INPUT name type}}`, `{{CALL macro args}}`. One tag per statement, nothing to close, nothing to forget. The argument forms shown here only illustrate; each tag settles its own when it is built.
+3. Self-closing or attribute-style tags (`{{SET name value /}}`). Rejected by ADR 0001: a second tag style doubles the parser and the learning cost.
+
+**Decision.** Option 2. A construct that wraps text is a paired block with the `{{KEYWORD}}...{{END_KEYWORD}}` house style; a construct that only acts or outputs on its own, with all its arguments inside the tag, is a single tag with no END. `SET`, `INPUT` and `CALL` are single tags. ADR 0001 still holds for every block: a construct with a body, such as a macro definition, stays paired, and no second tag style is introduced. The human approved this on 2026-10-14.
+
+**Consequences.**
+
+- The grammar keeps two tag shapes, both already present: a paired block and a single tag. The spec lists a single tag without a `closes` entry, as it does for `ELSE` and `ELSEIF`.
+- The lexer and the parser need no closer tracking for these tags; an `END_SET`, `END_INPUT` or `END_CALL` is an unknown tag, an error in every mode ([ADR 0003](0003-unknown-names-are-always-errors.md)).
+- Nothing in the language changes with this decision: `SET`, `INPUT` and `CALL` are not available yet and the README, the changelog and the [language contract](../../architecture/language-contract.md) do not describe them. The next cycle that builds them records their behavior there.
+- A future construct is paired or single by the rule above, without a new decision.
`````

## Gate run

Gate command green at commit 80572368a79b (194 tests).

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
- The Gate run line is tool output recorded by the gate, not the builder's claim. A criterion verified by tests may rely on it; you do not run, judge or ask for tests. A stale or missing line is a reason to say so, never to assume. Review is for what tests cannot catch: fit to the objective and contract, scope drift, design and readability, security, gaps in the tests themselves and edge cases nobody tested.
