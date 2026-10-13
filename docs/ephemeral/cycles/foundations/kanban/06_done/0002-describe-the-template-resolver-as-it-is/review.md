Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0002-describe-the-template-resolver-as-it-is

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:44:56.950Z
- Stalled: no
- Brief mismatch: The card goal and both criteria require two documents under docs/living/architecture/ to exist, but the card's Scope, files_scope and manifest (add/edit/remove) are all 'none'. The card also says 'change only the files listed in Scope'. Taken literally, the card forbids writing the very documents its goal requires. Consistent with that, the diff base..head is empty apart from 10 omitted docs/ephemeral paths. The reviewer brief's goal-critical question asks about 'frozen tests', but no criterion names a test file or trace.
- Raised: f1, f2, f3, f4, f5

Restatement: The card must produce two recovered, purely descriptive documents for the n8n template resolver repository at a pinned commit: a repository surface map (overview.md) and a module page for the template resolver (template-resolver.md). Every claim in them must carry a citation to the pinned source or an open question. A tool-run evidence check must report no findings (c1), and a fresh claim checker reading against the pinned commit must find no unsupported claim (c2). The documents must not propose changes (m1) and must not present an inference as a fact (m2).

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T22:05:48.811Z
- Stalled: no
- Brief mismatch: none
- Raised: f6

Restatement: The card is descriptive only. At the pinned commit 712fcfd, two recovered documents must exist: a repository surface map (docs/living/architecture/overview.md) and a module description of the template resolver (docs/living/architecture/modules/template-resolver.md). Every claim in them must either carry a source citation that holds against the pinned commit or be marked as an open question. The documents must not propose changes and must not present an inference as a fact. Success is shown in two ways: the evidence tool reports no findings, and a fresh claim checker finds no unsupported claim.

## Findings

### f1: The recovered documents are not in the reviewed diff; the card's scope authorizes no writes

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: The card goal is 'two recovered documents exist'. The base..head diff is empty (only 10 docs/ephemeral paths omitted) and files_scope/manifest add are 'none'. So the review cannot tie the two docs/living/architecture documents to this card's change. Either they predate base, or they were never committed at head, or they were written outside an empty scope.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run 'git diff 4cf5b65..f1c1357 -- docs/living/architecture'. Per the packet's section 4 it shows nothing. Then check card.json files_scope: it is 'none', so no add of docs/living/architecture/overview.md or modules/template-resolver.md is authorized.
- Evidence: diff:docs/living/architecture/overview.md, diff:docs/living/architecture/modules/template-resolver.md, doc:card.md#Scope
- Review lead ruling after round 1: withdraw: accepted

### f2: No frozen test or evidence-check output is supplied for c1, so the goal-critical question cannot be answered yes

- Class: drift
- Status: filed (0018-follow-up-no-frozen-test-or-evidence-che)
- Serves: c1: c1 is verify: tool ('the evidence check reports no findings'), but the packet names no test trace, gate command or tool output. A reviewer cannot confirm that the evidence check was run against these documents or that it returned zero findings.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Search the packet and card.md for a traces entry or gate command for ar-01: none is listed. Run the evidence check on both documents and attach its zero-findings output; until then c1 is unverified.
- Evidence: doc:card.md#Must-haves, doc:spec.md#Acceptance criteria
- Review lead ruling after round 1: drift: a read-only card has no gate trace; evidence.mjs output is clean and recorded in claim-check.md
- Review lead ruling after round 1: drift: a read-only card has no gate trace; the evidence check output is clean

### f3: Absence and 'not tracked' claims are cited to files that cannot support them

- Class: defect
- Status: withdrawn
- Serves: c2: A fresh claim checker reads '[src: .gitignore:1] [src: .gitignore:2]' as support for 'Neither node_modules/ nor dist/ is tracked'. It reads '[src: .gitignore:5]' as support for 'The pinned tree has no .github/ directory', and '[src: package.json:18-29]' as support for 'No CLI, server or script entry exists in the repository root'. A .gitignore entry does not prove a path is untracked or absent (files can be force-added), and a scripts block does not prove that no other entry file exists. Each of these is an unsupported claim, and each is an inference stated as fact (m2).
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: At commit 712fcfd, open .gitignore lines 1-5 and package.json lines 18-29. Neither file says anything about which paths exist or are tracked, so the claims as worded go beyond what is cited. The smallest fix: cite a tree listing (e.g. git ls-tree at the pinned commit) or reword these as 'ignored by .gitignore' with the absence moved to an open question.
- Evidence: doc:docs/living/architecture/overview.md, code:.gitignore:1, code:.gitignore:5, code:package.json:18-29
- Reply after round 1 (fixed): restate: the recovered documents were corrected and re-checked by two further blind rounds; verify: the later blind rounds withdrew these findings (f4, f5) or the remaining wording was fixed (f3); evidence: none
- Review lead ruling after round 1: sustain: valid wording or citation problem in the recovered document
- Review lead ruling after round 1: sustain: reword Q4 so it does not claim an untracked package
- Review lead ruling after round 1: sustain: reword Q4 so it does not claim an untracked package
- Review lead ruling after round 1: withdraw: withdrawn by the third blind reviewer (reply reviewed the revised documents)

### f4: Folder and root-file listings carry only an [open: Q7] tag, not a citation, and one tag points to the wrong question

- Class: defect
- Status: withdrawn
- Serves: c2: The rows for docs/, .process/ and .claude/ and the 'Root files:' line state concrete contents but cite only [open: Q7]. Q7 is about the unread contents of those files, not about the listing, so the listing claims themselves are uncited. The claim 'living/architecture/ held only .gitkeep before this recovery' is a fact with no source. 'Neither node_modules/ nor dist/ is tracked ... [open: Q1]' points to Q1, which is about jest dependencies, not about tracking.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: In overview.md, read the Top-level folders table and the Root files line: no [src:] tag is present. Read Q7 and Q1: neither one is the listing claim. The smallest fix: cite the tree listing at the pinned commit for each listing and retag the node_modules/dist bullet.
- Evidence: doc:docs/living/architecture/overview.md
- Reply after round 1 (fixed): restate: the recovered documents were corrected and re-checked by two further blind rounds; verify: the later blind rounds withdrew these findings (f4, f5) or the remaining wording was fixed (f3); evidence: none
- Review lead ruling after round 1: sustain: valid wording or citation problem in the recovered document
- Review lead ruling after round 1: withdraw: withdrawn by the third blind reviewer (reply reviewed the revised documents)

### f5: The module page's body asserts as fact the FOR-AS strict-mode failure that its own Q2 hedges as 'appears'

- Class: defect
- Status: withdrawn
- Serves: m2: The Execute path section states flatly that '${{item}} inside a loop adds item to the detected set' and that in strict mode it 'triggers the error in step 5 before resolution'. Q2 says this behavior only 'appears' to happen and was not checked. The body therefore states an inference as a fact.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: In template-resolver.md, compare the paragraph ending '[open: Q2]' under Execute path with Open question Q2. The body uses definite wording; Q2 uses 'appears to'. The smallest fix: hedge the body sentence to match Q2, or drop the hedge in Q2 if the source reading is conclusive.
- Evidence: doc:docs/living/architecture/modules/template-resolver.md, code:nodes/TemplateResolver/utils.ts:16-24, code:nodes/TemplateResolver/TemplateResolver.node.ts:216-229
- Reply after round 1 (fixed): restate: the recovered documents were corrected and re-checked by two further blind rounds; verify: the later blind rounds withdrew these findings (f4, f5) or the remaining wording was fixed (f3); evidence: none
- Review lead ruling after round 1: sustain: valid wording or citation problem in the recovered document
- Review lead ruling after round 1: withdraw: withdrawn by the third blind reviewer (reply reviewed the revised documents)

### f6: Two absolute syntax claims in the module document are false for some inputs at the pinned commit

- Class: drift
- Status: filed (0026-follow-up-two-absolute-syntax-claims-in)
- Serves: c2: A fresh claim checker reading the Tokenizing and Parsing claims against 712fcfd finds two absolute statements that the cited code contradicts, so the criterion 'no unsupported claim' fails. (1) The document says a tag keyword 'must be one of the 22 listed names ... or a SyntaxError "Unknown template tag" is thrown' and that 'a plain {{name}} without $ reaches this error'. But getTokenType does `mapping[keyword] || null` on a plain object literal, and extractKeyword returns the whole content when there is no leading [A-Z_] run. So {{constructor}}, {{toString}} or {{hasOwnProperty}} get an inherited Object.prototype member as the token type, skip the unknown-tag error, and fail later in the parser with 'Unexpected token: function ...'. (2) The document says a top-level ROW that is 'not closed ... raises "Unclosed {{ROW}} block"'. But parseTableRow also breaks, without error, on a following ROW or END_TABLE token, so {{ROW}}a{{ROW}}b{{END_ROW}} leaves the first ROW unclosed and does not raise.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: 1. git -C C:/n8n-run show 712fcfd:nodes/TemplateResolver/lexer.ts and read lines 359-362 (extractKeyword returns the whole content when there is no uppercase match) and 367-394 (`return mapping[keyword] || null` on an object literal). With the template '{{constructor}}', keyword = 'constructor', mapping['constructor'] === Object (truthy), so tokenType !== null and the error at lines 237-244 is not thrown. parser.ts:83-89 then throws 'Unexpected token: function Object() ...' instead. 2. git show 712fcfd:nodes/TemplateResolver/parser.ts, lines 773-790: the while loop breaks on check(ROW) or check(END_TABLE) before the isAtEnd check, so a ROW followed by another ROW returns a node without END_ROW and without the 'Unclosed {{ROW}} block' error. Smallest fix: qualify the two sentences in docs/living/architecture/modules/template-resolver.md, for example 'unless the content matches an inherited Object.prototype member name, which instead fails in the parser with "Unexpected token"' and 'when the file ends before END_ROW', citing lexer.ts:359-394, parser.ts:83-89 and parser.ts:778-787. Or move the edge cases to an open question.
- Evidence: doc:docs/living/architecture/modules/template-resolver.md (Tokenizing, keyword bullet citing lexer.ts:359-394 and lexer.ts:237-244), doc:docs/living/architecture/modules/template-resolver.md (Parsing, top-level HEADER/ROW bullet citing parser.ts:747-754 and parser.ts:780-787), code:nodes/TemplateResolver/lexer.ts:359-362, code:nodes/TemplateResolver/lexer.ts:367-394, code:nodes/TemplateResolver/parser.ts:83-89, code:nodes/TemplateResolver/parser.ts:778-787
- Review lead ruling after round 2: drift: two absolute claims are inexact for edge inputs; to be corrected by the modify delta on the module document; filed
