---
summary: Lines holding only a block tag vanish by default; '-' markers trim explicitly and an option turns the default off.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: planned
---

# Standalone block-tag lines vanish by default

**Context.** Block tags on their own line leave blank lines in the output, the biggest day-to-day annoyance in markdown prompts.

**Decision.** A line that holds only a block tag (and whitespace) is removed from the output, following the Handlebars standalone rule. Explicit '-' markers on a tag trim adjacent whitespace. An option turns the standalone rule off.

**Alternatives.** Explicit '-' markers only, which every author must remember on every tag; rejected as the default.

**Consequences.** Output of existing templates may lose blank lines, so the rule is introduced with the whitespace work and covered by golden files. The option restores the old behaviour.
