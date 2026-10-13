---
id: rule-example-slug
type: rule
summary:
state: planned
source: assumption
form: ears
scope:
measure:
verify: test
links: []
---

# {{title}}

<!-- A rule is one checkable statement. form is ears, gwt, invariant, qas, non-goal or constraint. scope is the id it constrains. measure is required, and must be a number with a unit, when form is qas. verify is test, tool, review or manual. Ask who this is for and what the goal is before you write. Cite a source or write assumption; never invent a fact to fill a field. If there is nothing to add, write no file. Links: constrains (any atom but a test), verified-by (test). Store each on this side only, as "type: id" items; replace links: [] with a block list. Fill summary with one sentence of at most 160 characters; it stays empty here so the check reports it. Keep this file under about 60 lines; a second concept is a second atom. -->

## Statement

<!-- One assertion. EARS: "When <trigger>, the <system> shall <response>". Or Given, When, Then. -->

## Examples

## Waiver

<!-- Delete this section when the rule has a verified-by test. Otherwise: the reason it is untested and who accepted that. -->
