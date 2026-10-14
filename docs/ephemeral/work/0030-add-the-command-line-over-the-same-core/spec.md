# Spec

## Acceptance criteria

- cl-render: render reads a template file or stdin and a data file or stdin, prints the output on stdout, prints diagnostics as file:line:col severity code message on stderr, exits 0 on ok and 1 on template errors, and --json prints the full result
- cl-others: validate and analyze print JSON and validate exits 1 when not ok; spec prints the spec JSON
- cl-usage: no arguments, an unknown subcommand or option, a missing file, bad data JSON and both inputs on stdin exit 2 with a message on stderr; --help prints usage and exits 0
- cl-limits: --strict, --no-strict, --max-iterations, --max-output-chars and --max-depth reach the render options
- cl-serve: serve starts the API on the given host and port and answers a request
