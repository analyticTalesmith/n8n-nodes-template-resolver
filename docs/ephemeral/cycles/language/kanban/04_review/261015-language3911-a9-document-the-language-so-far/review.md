Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language3911-a9-document-the-language-so-far

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T05:37:16.712Z
- Stalled: no
- Brief mismatch: The card scope and manifest (files_scope: README.md, changelog.md, docs/living/architecture, the showcase template.md, surfaces.test.ts) do not cover docs/living/decisions/adr/0007-statement-tags-without-a-body.md, which c4 requires and the diff edits. They also omit the golden case's data.json, expected.md and options.json, which spec.md's Interface lists as added. The scope exceptions log says none were logged. The manifest needs amending, or the lead must say where these files come from.
- Raised: f1, f2, f3, f4, f5, f6, f7, f8

Restatement: This card changes documentation only, plus one guard test. The README, the changelog, the language contract, the template-resolver, api and cli module pages, the headless contract and a new ADR 0007 must describe every filter, operator, limit and WHEN form built in this cycle exactly as the code behaves. They must not present unbuilt constructs such as SET, INPUT, CALL or matches as available. A test must keep spec() in step with the lexer keywords, the filter registry and the evaluator's operators, and a golden case must render the README showcase template so the example is real. No test expectation, runtime dependency or language behavior may change.

## Findings

### f1: README and changelog call malformed math and unprintable values render-only; the language contract says both entry points

- Class: goal-risk
- Status: fixed
- Serves: c2: A core user who calls resolveTemplate with ${{(a + b}} or a cyclic value reads in the README that resolveTemplate keeps its old output. The contract says resolveTemplate raises a located type-error for both. One of the two documents contradicts the code, so the card goal of describing behavior exactly fails.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. Read README.md, the paragraph that begins '`render` only.': 'The zero divisor, the malformed expression, the unprintable value and the 15-digit printing apply to `render` ... Core's `resolveTemplate` keeps its old output for these'. 2. Read docs/living/architecture/language-contract.md, Math and output errors: Malformed math ends 'Applies in both entry points.' and Unprintable output ends 'Applies in both entry points.' 3. Read the changelog line 'Math and output errors in `render`: ... a value with no text form ... `resolveTemplate` keeps its old output for these'. 4. Call resolveTemplate('${{(1 + 2}}', new Map()) and resolveTemplate('${{loop}}', a map holding a cyclic object). If either throws, the README and the changelog are wrong; if neither throws, the contract is wrong. Smallest fix: make the README paragraph and the changelog line name only the zero divisor and the 15-digit printing as render-only, if the code matches the contract.
- Evidence: diff:README.md, diff:changelog.md, doc:docs/living/architecture/language-contract.md
- Reply after round 1 (fixed): restate: README and changelog said malformed math and unprintable values keep old output in resolveTemplate; verify: Ran resolveTemplate: both throw a located type-error; only zero divisor and 15-digit printing differ; evidence: diff:README.md, diff:changelog.md

### f2: README says .length on any value other than an array or a text stays null, but an object with its own length key returns that value

- Class: goal-risk
- Status: fixed
- Serves: c2: An author passes data {"o": {"length": 5}} and writes ${{o.length}}. The README says this prints empty (null). The contract says it prints 5 (and the same for a JSON object text with its own length key), so the README makes a claim the code contradicts.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. Read the README bullet '**`.length`** is a path segment after any value: an array gives its element count and a text gives ... Any other value, or missing data, stays null'. 2. Read the language contract bullet .length: 'an object with its own key `length` returns that key's value, null included' and 'unless it is a JSON object text with its own key `length`'. 3. Render ${{o.length}} with {"o": {"length": 5}}: the output 5 contradicts the README. Smallest fix: add the own-key exception to the README bullet.
- Evidence: diff:README.md, doc:docs/living/architecture/language-contract.md
- Reply after round 1 (fixed): restate: README .length bullet omitted the own-key length rule; verify: Ran render: own key 7, JSON text 9, null key empty, text 3, number empty; evidence: diff:README.md

### f3: Nothing in the packet shows the golden case data and expected output that render the README showcase; the guard checks only the template

- Class: goal-risk
- Status: fixed
- Serves: c2: c2 requires 'a golden case renders the README example'. The diff adds no data.json, expected.md or options.json under tests/golden/render-cases/lang-filters-showcase/, and the manifest lists only template.md there (committed before the base). The surfaces test checks only that the template appears verbatim. If the golden files are missing or differ from the README's data block and printed output, the README example is not proven to render as shown, and no test would notice.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. List tests/golden/render-cases/lang-filters-showcase/ at head 80572368: check whether data.json, expected.md and options.json exist. 2. If they exist, diff data.json against the README's JSON data block and expected.md against the README's 'it renders' block. 3. Change one line of the README's printed output (for example 'length: 4' to 'length: 5') and run the surfaces test: it still passes, because only the template is guarded. Smallest fix: make sure the golden case holds the README data and output, and add a guard that the README contains expected.md (and data.json) verbatim.
- Evidence: diff:README.md, test:ld-readme: the README holds the filters showcase template verbatim, doc:spec.md (The golden case paragraph and Interface)
- Reply after round 1 (fixed): restate: only the showcase template was guarded, not its data and expected output; verify: Added rows for data.json and expected.md; changing one README output char fails the row; evidence: test:ld-readme: the README holds the filters showcase expected.md verbatim, diff:tests/language/surfaces.test.ts

### f4: README analysis-diagnostics table omits limit-nodes, which analyze now raises

- Class: goal-risk
- Status: fixed
- Serves: c2: An API user sends a template over maxNodes to POST /v1/analyze and gets a limit-nodes diagnostic. The README table says only syntax-error and limit-depth occur there, so the limit-nodes documentation is incomplete in exactly the existing text the cycle made wrong.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. Read the README Analysis diagnostics row '`syntax-error`, `limit-depth` | `POST /v1/analyze` only: the template does not parse ...'. 2. Read the language contract, Node limit: limit-nodes 'is raised in `render`, `validate`, `analyze` and `resolveTemplate`'. 3. POST /v1/analyze a template of more than 20000 nodes: the response carries limit-nodes, which the table does not list. Smallest fix: add limit-nodes to that row.
- Evidence: diff:README.md, doc:docs/living/architecture/language-contract.md
- Reply after round 1 (fixed): restate: README analyze diagnostics row omitted limit-nodes; verify: The row now lists syntax-error, limit-depth and limit-nodes, as the contract and api module say; evidence: diff:README.md

### f5: Template-resolver module page still says filters run on the string form of the value

- Class: goal-risk
- Status: fixed
- Serves: c3: c3 requires the template-resolver module page to match the code. Its Interpreting bullet on Variable still ends 'then filters run on the string form'. The same page's Filters section and the contract say filters receive and return values, and the collection filters get lists. A reader changing filters is told the old string-only behavior.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. Read docs/living/architecture/modules/template-resolver.md, Interpreting, the Variable bullet: '... then the `??` default replaces a value that fails `isTruthy`, then filters run on the string form'. 2. Read the language contract, Values: 'A filter receives the resolved value and returns a value'. 3. Render ${{xs | length}} with xs = ["a","b"]: the output 2 shows the filter got a list, not the string form. Smallest fix: make the bullet say filters run on the resolved value.
- Evidence: doc:docs/living/architecture/modules/template-resolver.md, doc:docs/living/architecture/language-contract.md
- Reply after round 1 (fixed): restate: module page said filters run on the string form; verify: Rendered xs | length on a list gives 2; the Variable bullet now says filters run on the resolved value; evidence: diff:docs/living/architecture/modules/template-resolver.md

### f6: ADR 0007 is edited outside the card's manifest and files_scope, with no scope exception logged

- Class: drift
- Status: withdrawn
- Serves: c4: c4 needs ADR 0007 written, but docs/living/decisions/adr/ is outside files_scope (only docs/living/architecture is listed) and outside the manifest. A scope check flags the edit, or a later reader cannot trace why the card touched the file.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare the manifest and files_scope in section 1 with the diff path docs/living/decisions/adr/0007-statement-tags-without-a-body.md. The path is not covered, and the scope exceptions log is empty.
- Evidence: diff:docs/living/decisions/adr/0007-statement-tags-without-a-body.md
- Review lead ruling after round 1: withdraw: ADR 0007 is the card's own add delta (docs_impact lists it)

### f7: The lexer keyword table in the surfaces test is hand-written, so a keyword the lexer gains without a spec() entry passes

- Class: drift
- Status: filed (261015-language3911-a15-follow-up-the-lexer-keyword-table-in-the)
- Serves: card-goal: The card goal is a test that keeps spec() in step with the lexer. BLOCK_PAIRS is a fixed list checked against the lexer, so removing a keyword is caught. If a later card adds a keyword such as MESSAGE to the lexer but not to spec(), every test still passes. The filter half derives its list from FILTER_REGISTRY and has no such gap.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Add a new keyword to the lexer's accepted list without adding it to spec.ts or BLOCK_PAIRS, then run tests/language/surfaces.test.ts: it stays green. The test file is frozen, so this is a note for the lead, not a fix request.
- Evidence: test:ld-spec blocks: spec().blocks has no name outside the keyword table

### f8: Q9 is marked answered but stays in Open questions, and Interpreting still tags it open

- Class: drift
- Status: sustained
- Serves: c3: The module page lists Q9 under Open questions as 'Answered: ...' instead of moving it to Answered, and the Interpreting bullet still carries '[open: Q9]'. A reader cannot tell whether the question is settled.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Read docs/living/architecture/modules/template-resolver.md: Q9 is under Open questions, and the Variable bullet under Interpreting ends '[open: Q9]'.
- Evidence: diff:docs/living/architecture/modules/template-resolver.md
- Review lead ruling after round 1: sustain: fold the Q9 tidy into the same page edit
