Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language3911-a5-bound-the-total-node-count-of-a-template

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T03:45:29.037Z
- Stalled: no
- Brief mismatch: Three small inconsistencies, none of which blocks the review. (1) card.md lists different must-nots from the reviewer brief. The card names 'the one named amendment (if any)', ADR 0003 lenient-mode names and compiled regexes. The brief names three default-limits fixtures and 'change what any existing template outputs'. (2) card.md's interface contract names only tests/headless/spec.test.ts as the amendment. spec.md and m1 name limits.test.ts and api.test.ts too, and the post-freeze manifest drops spec.test.ts and errors.ts from edit as pre-base work, though files_scope still lists them. (3) The base already held a stub DEFAULT_LIMITS.maxNodes of 0, so part of the interface landed before base and cannot be reviewed here.
- Raised: f1, f2, f3, f4

Restatement: Add a node-count limit to the template language. limits.maxNodes defaults to 20000 and is counted once, in the parser. Every AST node except the root counts, in document order, at its opening token. Node maxNodes+1 fails with a limit-nodes diagnostic located at that node, with the same code and position in render, validate, analyze and resolveTemplate. ELSEIF chains must be handled with loops in the parser, interpreter and analyzer, so a long chain ends in a result or limit-nodes and never in a RangeError. analyze must use the caller's limits: with no caller maxDepth it stops failing at 32 levels of nesting and only stops absurd nesting with a coded limit-depth. The API must accept maxNodes and only ever lower it, validate and analyze on the server must use the server's maxNodes, the CLI must take --max-nodes, and the OpenAPI Limits and RequestLimits schemas must list it. No existing output or test expectation may change except the named default-limits fixtures, no runtime dependency may be added, and nothing may be evaluated as code.

## Findings

### f1: IF/ELSEIF condition parsing moved after the body, so a malformed template can now report a different first error

- Class: goal-risk
- Status: open
- Serves: m2: Base parseIf and parseElseIf called extractCondition(token.value) right after consuming the tag, before parsing the body. The new parseIfBranch calls it inside the returned object literal, after the whole consequent is parsed. Suppose a template's IF or ELSEIF condition is rejected by extractCondition and its body also holds a parse-time error, or enough nodes to cross maxNodes. Base reports the condition error at the IF tag. Head reports the later body error (syntax-error, type-error or limit-nodes) at a different position. For an existing malformed template, render now returns a different diagnostic and location, and resolveTemplate throws a different error.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Take a template whose IF tag content is something extractCondition rejects, for example an empty condition '{{IF }}', with an invalid FOR inside the body: '{{IF }}{{FOR bad}}{{END_FOR}}{{END_IF}}'. At base f4e552a, render(...).diagnostics[0] gives the condition error located at the IF tag (1:1). At head bde4503, the FOR syntax error comes first, located at the FOR tag. The smallest fix is to compute the condition from token.value right after this.open(type) in parseIfBranch, before the consequent loop, as the base code did.
- Evidence: diff:core/src/parser.ts, code:core/src/parser.ts:276, code:core/src/parser.ts:301

### f2: Living architecture documents edited directly, outside files_scope, with no scope exception logged

- Class: drift
- Status: withdrawn
- Serves: card-goal: The rubric says there must be no change outside the card scope. The diff edits docs/living/architecture/headless-contract.md, modules/api.md, modules/cli.md and modules/template-resolver.md. None of them is in files_scope (only docs/ephemeral/cycles/language/deltas is), and the scope exceptions log is empty. The project's own rule is that living documents change through deltas that are applied when the cycle merges. Editing them in the branch means the durable record gets ahead of the apply step and bypasses the delta trail the lead relies on.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare the diff's changed paths with the card's files_scope list. All four docs/living/architecture/*.md paths are absent from it, and 'No scope exceptions are logged.'
- Evidence: diff:docs/living/architecture/headless-contract.md, diff:docs/living/architecture/modules/api.md, diff:docs/living/architecture/modules/cli.md, diff:docs/living/architecture/modules/template-resolver.md, doc:card.md#Scope
- Review lead ruling after round 1: withdraw: living documents are changed by the card on purpose: docs_impact lists them and docs_deferred is true

### f3: The four node-limit delta documents are empty placeholders: the Proposed change body is only the template comment

- Class: drift
- Status: open
- Serves: card-goal: The deltas are the card's recorded change to the durable facts (maxNodes, limit-nodes, iterative ELSEIF, analyze's 256 ceiling). Each one has only a frontmatter summary and the unfilled template comment. The apply step therefore has no stated change to check the living documents against, and the analyze 256-ceiling decision lives only in the directly edited template-resolver.md text.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Open docs/ephemeral/cycles/language/deltas/node-limit-1.md through node-limit-4.md in the diff. Under '# Proposed change' each holds only the HTML template comment.
- Evidence: diff:docs/ephemeral/cycles/language/deltas/node-limit-1.md, diff:docs/ephemeral/cycles/language/deltas/node-limit-4.md

### f4: A caller-raised maxDepth still lets deep nesting overflow the stack in render and analyze

- Class: drift
- Status: filed (261015-language3911-a13-follow-up-a-caller-raised-maxdepth-still)
- Serves: c2: Nesting is bounded only by maxDepth, and the spec decision says a caller maxDepth is obeyed exactly. A core caller passing limits { maxDepth: 100000 } with about 19000 nested IF blocks stays under maxNodes 20000. The parser and interpreter then recurse several frames per level and can throw a RangeError, which render rethrows because it only catches TemplateError. That breaks 'render never throws' and the 'no stack overflow in any mode' wording. The API is protected by the server ceiling, so this concerns only direct core and CLI --max-depth callers. Recorded for the lead as a possible follow-up ticket (a hard internal nesting cap, or turning RangeError into a coded limit-depth). It is not a fix request for this card.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{IF t}}'.repeat(19000) + 'x' + '{{END_IF}}'.repeat(19000), {t:'x'}, { limits: { maxDepth: 100000 } }) can throw a RangeError instead of returning ok or a coded diagnostic. No frozen test covers a raised maxDepth.
- Evidence: code:core/src/analyze.ts:91, code:core/src/render.ts:76, test:ln-elseif: [render-strict] 5000 nested IF blocks give a coded limit-depth
