---
id: act-example-slug
type: action
summary:
state: planned
source: assumption
links: []
---

# {{title}}

<!-- One atom per file. id is <type prefix>-<slug>: lowercase words joined by hyphens, unique across the project and never reused: an id listed in docs/living/retired-ids.md (one "- id: note" line per deleted atom) is refused for a new atom. The prefix scheme is provisional: the project owner decides it, and the check enforces only the id syntax, never the prefix. type is one of outcome, actor, object, action, rule, boundary, interface, surface, decision, risk, test. summary is one sentence of at most 160 characters; it is left empty here on purpose, so the check reports it until you fill it. state starts as planned. source is required on outcome, actor, object and rule atoms and is an atom id, a file:line or the word assumption; leave it out on the others. -->

<!-- links is a block list of "type: id" items, or links: [] for none. A link is stored on one side only. Link types by atom type:
action: serves (outcome), performed-by (actor), acts-on (object), shown-on (surface), needs (action)
object: contains, belongs-to, relates-to (object)
rule: constrains (any atom but a test), verified-by (test)
interface: provided-by (boundary), consumed-by (boundary or actor), carries (object)
boundary: contains (any atom but a test), depends-on (boundary)
decision: decides (any atom), supersedes (decision)
risk: threatens (boundary, interface, object or action), mitigated-by (rule or decision)
outcome, actor, surface and test have no links.
Example:
links:
  - serves: out-see-all-work
  - acts-on: obj-card -->
