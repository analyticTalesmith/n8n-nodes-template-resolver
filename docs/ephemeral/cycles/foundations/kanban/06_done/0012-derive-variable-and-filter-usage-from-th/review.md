Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0012-derive-variable-and-filter-usage-from-th

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T22:02:32.806Z
- Stalled: no
- Brief mismatch: none
- Raised: f1

Restatement: Add a core analyze(template) function that walks the parsed AST (and the evaluator's own expression splitting) to report every input variable a template reads: its root name, the distinct full paths, the constructs that read it (output, if, elseif, case, for source, list_item, table cells, condition operands on both sides of AND/OR/comparisons/contains), and whether every read has a ?? default (optional). It also lists the filters applied with counts and flags unknown filters as diagnostics. FOR item names inside their loop, @-metadata and operator words are not inputs. The n8n node's strict-mode pre-check switches to analyze, so it no longer rejects loop item names or ??-defaulted variables, and the regex-based extractAllVariables is removed from core. No existing test body may change and no runtime dependency may be added.

## Findings

### f1: Living module doc still describes utils.ts/extractAllVariables as the node's detection step

- Class: drift
- Status: filed (0025-follow-up-living-module-doc-still-descri)
- Serves: card-goal: After this card, docs/living/architecture/modules/template-resolver.md still lists utils.ts, exports extractAllVariables, and says the node computes detectedVariables = extractAllVariables(template) and rejects FOR item names in strict mode, none of which is true any more; a reader changing the node or strict mode is misled and analyze is undocumented
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Open docs/living/architecture/modules/template-resolver.md at head 4903ccd; lines 31, 37, 60 and 69 still describe extractAllVariables, while core/src/utils.ts is deleted in the diff and the node imports analyze
- Evidence: doc:docs/living/architecture/modules/template-resolver.md, diff:core/src/utils.ts, diff:n8n/TemplateResolver.node.ts
- Review lead ruling after round 1: drift: the recovered module document describes the base commit; it is updated through a modify delta after merge
