Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0030-add-the-command-line-over-the-same-core

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:49:22.171Z
- Stalled: no
- Brief mismatch: m2 says stdout carries nothing but the result, but the frozen cl-serve test reads the listening address from stdout. The diff prints 'listening on http://host:port' there. That is reasonable if the address counts as serve's result, but the brief should say so.
- Raised: f1

Restatement: Give the headless template-resolver core a command line (template-resolver) with render, validate, analyze, spec and serve subcommands, built only on node built-ins over the existing core and HTTP API. It reads a template and data from files or stdin (only one from stdin), prints only the result on stdout, prints located diagnostics on stderr, and uses the exit codes design.md documents: 0 ok, 1 template error, 2 usage or I/O error. Render limits and strictness are passed through as flags, serve starts the API and shuts down cleanly, and main(argv, io) is exported so it can be tested without spawning a process.

## Findings

### f1: analyze on an unparseable template prints a stderr diagnostic instead of JSON

- Class: drift
- Status: filed (0039-follow-up-analyze-on-an-unparseable-temp)
- Serves: c2: design.md says analyze prints JSON. When the template has a syntax error, analyze writes '<file>:1:1: error syntax-error: ...' to stderr, leaves stdout empty and exits 1. A caller that pipes analyze into a JSON parser gets no JSON. The criterion does not specify the error case, so this is noted rather than asked to be fixed.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: printf '{{IF a}}x' | template-resolver analyze - -> stderr '<stdin>:1:1: error syntax-error: Unclosed {{IF}} block...', stdout empty, exit 1
- Evidence: diff:cli/main.ts, doc:docs/living/architecture/headless-contract.md
- Review lead ruling after round 1: drift: a syntax error is reported as a located diagnostic with exit 1; JSON on that path is a refinement
