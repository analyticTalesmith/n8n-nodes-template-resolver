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
