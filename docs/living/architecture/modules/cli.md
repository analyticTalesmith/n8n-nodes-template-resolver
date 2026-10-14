---
summary: The command line over core: subcommands, options, exit codes and stdin rules.
state: built
---

# cli module

## Purpose

A terminal surface over core, the bin `template-resolver`, for rendering, checking and inspecting templates from files or pipes, and for starting the HTTP API. Like the api module it adds transport only.

## Responsibility

- `cli/main.ts`: `main(argv, io)` parses the arguments with `util.parseArgs` (strict), reads inputs, calls core and resolves the exit code. It never exits the process and does all I/O through the `CliIo` it is given, so tests drive it in process.
- `cli/index.ts`: the bin entry (`#!/usr/bin/env node`); wires `main` to the real stdin, stdout and stderr, turns SIGINT and SIGTERM into the abort signal, and sets `process.exitCode`.

## Interface

```ts
interface CliIo { readStdin(): Promise<string>; stdout(text: string): void; stderr(text: string): void; signal?: AbortSignal }
main(argv: string[], io: CliIo): Promise<number>
```

Built to `dist/cli/index.js`, which `package.json` names as the bin `template-resolver`.

| Command | Does |
|---|---|
| `render <template-file\|-> [--data <file\|->] [--strict \| --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]` | renders; output to stdout, diagnostics to stderr as `file:line:column: severity code: message`; `--json` prints the whole render result to stdout instead |
| `validate <template-file\|->` | prints core `validate`'s `{ok, diagnostics}` as JSON |
| `analyze <template-file\|->` | prints core `analyze` as JSON, whose diagnostics are `{code, message, line, column}` (`unknown-filter`, `unrecognized-condition`); a template that does not parse prints its diagnostic to stderr |
| `spec` | prints core `spec()` as JSON |
| `serve [--port n] [--host h]` | starts the api module's server (default `127.0.0.1:3000`, default limits and body size), prints `listening on http://host:port`, and runs until the abort signal |

- Strict mode is on unless `--no-strict`; `--strict` with `--no-strict` is a usage error. `--data` defaults to `{}` and must be a JSON object.
- Limit flags set the render's limits directly (they can raise as well as lower them); limits not given take core's defaults. `validate` and `analyze` use the defaults.
- `-` reads stdin. Only one input may be stdin: `render - --data -` is a usage error, detected before anything is read. Diagnostics name stdin `<stdin>`.
- JSON output is pretty-printed with two spaces and a trailing newline.
- `--help` anywhere, or `-h` as the first argument, prints the usage to stdout.

## Failure handling

| Exit code | When |
|---|---|
| 0 | success; `validate` with warnings only; `--help`; `serve` after a clean shutdown |
| 1 | template errors: render not ok, validate not ok, analyze cannot parse |
| 2 | usage errors (no or unknown command, unknown option, wrong number of inputs, both inputs on stdin, a flag value that is not a non-negative integer, `--strict` with `--no-strict`), printed with the usage to stderr; I/O errors (unreadable file, invalid or non-object JSON data, a port that cannot be bound), printed as one line to stderr |

Every message on stderr starts with `template-resolver: `. An unexpected exception is not caught by `main` and surfaces as a crash.

## Dependencies

- core (`render`, `validate`, `analyze`, `spec`, `TemplateError`), imported from `core/src`.
- the api module (`createServer`, `listen`) for `serve`.
- node's `fs`, `util.parseArgs` and `process` only; no runtime dependency.
