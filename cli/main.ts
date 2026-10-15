import { promises as fs } from "fs";
import { parseArgs } from "util";
import { analyze, Diagnostic, Limits, render, spec, TemplateError, validate } from "../core/src";
import { createServer, listen } from "../api";

export interface CliIo {
  readStdin(): Promise<string>;
  stdout(text: string): void;
  stderr(text: string): void;
  signal?: AbortSignal;
}

const USAGE = `Usage: template-resolver <command> [options]

Commands:
  render <template-file|-> [--data <file|->] [--strict | --no-strict]
         [--standalone-lines | --no-standalone-lines]
         [--max-iterations n] [--max-output-chars n] [--max-depth n]
         [--max-nodes n] [--json]
      Render a template and print the output. A line holding only block tags
      is removed by default; --no-standalone-lines keeps it.
  validate <template-file|->   Check a template; prints {ok, diagnostics} as JSON.
  analyze <template-file|->    Print the variables, filters and blocks a template uses.
  spec                         Print the template language spec as JSON.
  serve [--port n] [--host h]  Start the HTTP API (default 127.0.0.1:3000).

"-" reads stdin; only one input may come from stdin.
Exit codes: 0 ok, 1 template errors, 2 usage or I/O errors.
`;

const STDIN = "-";
const STDIN_NAME = "<stdin>";

class UsageError extends Error {}
class InputError extends Error {}

type Options = NonNullable<Parameters<typeof parseArgs>[0]>["options"];
type Values = Record<string, string | boolean | undefined>;

const COMMAND_OPTIONS: Record<string, Options> = {
  render: {
    data: { type: "string" },
    strict: { type: "boolean" },
    "no-strict": { type: "boolean" },
    "standalone-lines": { type: "boolean" },
    "no-standalone-lines": { type: "boolean" },
    "max-iterations": { type: "string" },
    "max-output-chars": { type: "string" },
    "max-depth": { type: "string" },
    "max-nodes": { type: "string" },
    json: { type: "boolean" },
  },
  validate: {},
  analyze: {},
  spec: {},
  serve: { port: { type: "string" }, host: { type: "string" } },
};

/** Run the command line and resolve the exit code; never exits the process. */
export async function main(argv: string[], io: CliIo): Promise<number> {
  const [command, ...rest] = argv;
  if (command === "--help" || command === "-h" || rest.includes("--help")) {
    io.stdout(USAGE);
    return 0;
  }
  try {
    if (command === undefined) throw new UsageError("missing command");
    const options = COMMAND_OPTIONS[command];
    if (options === undefined) throw new UsageError(`unknown command '${command}'`);
    const { values, positionals } = parseCommand(rest, options);
    switch (command) {
      case "render":
        return await runRender(values, oneInput(positionals), io);
      case "validate":
        return await runValidate(oneInput(positionals), io);
      case "analyze":
        return await runAnalyze(oneInput(positionals), io);
      case "spec":
        noInput(positionals);
        printJson(io, spec());
        return 0;
      default:
        noInput(positionals);
        return await runServe(values, io);
    }
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(`template-resolver: ${error.message}\n\n${USAGE}`);
      return 2;
    }
    if (error instanceof InputError) {
      io.stderr(`template-resolver: ${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

function parseCommand(args: string[], options: Options): { values: Values; positionals: string[] } {
  try {
    const { values, positionals } = parseArgs({
      args: joinNegativeValues(args, options),
      options,
      allowPositionals: true,
      strict: true,
    });
    return { values: values as Values, positionals };
  } catch (error) {
    throw new UsageError(error.message);
  }
}

/** parseArgs rejects "--flag -1" as ambiguous; "--flag=-1" lets parseCount name the flag. */
function joinNegativeValues(args: string[], options: Options): string[] {
  const joined: string[] = [];
  for (const arg of args) {
    const previous = joined[joined.length - 1];
    const flag = previous?.startsWith("--") ? options?.[previous.slice(2)] : undefined;
    if (flag?.type === "string" && /^-\d/.test(arg)) joined[joined.length - 1] = `${previous}=${arg}`;
    else joined.push(arg);
  }
  return joined;
}

function oneInput(positionals: string[]): string {
  if (positionals.length !== 1) throw new UsageError("expected one template file or '-'");
  return positionals[0];
}

function noInput(positionals: string[]): void {
  if (positionals.length > 0) throw new UsageError(`unexpected argument '${positionals[0]}'`);
}

async function runRender(values: Values, templatePath: string, io: CliIo): Promise<number> {
  const dataPath = values.data as string | undefined;
  if (templatePath === STDIN && dataPath === STDIN) {
    throw new UsageError("only one input may be read from stdin");
  }
  if (values.strict && values["no-strict"]) {
    throw new UsageError("--strict and --no-strict cannot be combined");
  }
  if (values["standalone-lines"] && values["no-standalone-lines"]) {
    throw new UsageError("--standalone-lines and --no-standalone-lines cannot be combined");
  }
  const limits = parseLimits(values);
  const template = await readInput(templatePath, io);
  const data = dataPath === undefined ? {} : parseData(await readInput(dataPath, io), dataPath);

  const result = render(template, data, {
    strictMode: !values["no-strict"],
    standaloneLines: !values["no-standalone-lines"],
    limits,
  });
  if (values.json) {
    printJson(io, result);
  } else {
    io.stdout(result.output);
    printDiagnostics(io, displayName(templatePath), result.diagnostics);
  }
  return result.ok ? 0 : 1;
}

async function runValidate(templatePath: string, io: CliIo): Promise<number> {
  const result = validate(await readInput(templatePath, io));
  printJson(io, result);
  return result.ok ? 0 : 1;
}

async function runAnalyze(templatePath: string, io: CliIo): Promise<number> {
  const template = await readInput(templatePath, io);
  try {
    printJson(io, analyze(template));
    return 0;
  } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    const { code, detail, line, column } = error;
    printDiagnostics(io, displayName(templatePath), [
      { severity: "error", code, message: detail, line, column },
    ]);
    return 1;
  }
}

async function runServe(values: Values, io: CliIo): Promise<number> {
  const port = values.port === undefined ? 3000 : parseCount(values.port as string, "--port");
  const host = (values.host as string | undefined) ?? "127.0.0.1";
  const server = createServer();
  const address = await listen(server, port, host).catch((error: Error) => {
    throw new InputError(`cannot listen on ${host}:${port}: ${error.message}`);
  });
  io.stdout(`listening on http://${address.host}:${address.port}\n`);
  await aborted(io.signal);
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
  return 0;
}

function aborted(signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (signal === undefined) return;
    if (signal.aborted) return resolve();
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function parseLimits(values: Values): Partial<Limits> {
  const flags: [string, keyof Limits][] = [
    ["max-iterations", "maxIterations"],
    ["max-output-chars", "maxOutputChars"],
    ["max-depth", "maxDepth"],
    ["max-nodes", "maxNodes"],
  ];
  const limits: Partial<Limits> = {};
  for (const [flag, key] of flags) {
    const value = values[flag];
    if (value !== undefined) limits[key] = parseCount(value as string, `--${flag}`);
  }
  return limits;
}

function parseCount(value: string, flag: string): number {
  if (!/^\d+$/.test(value)) throw new UsageError(`${flag} must be a non-negative integer`);
  return Number(value);
}

async function readInput(path: string, io: CliIo): Promise<string> {
  if (path === STDIN) return io.readStdin();
  try {
    return await fs.readFile(path, "utf8");
  } catch (error) {
    throw new InputError(`cannot read '${path}': ${error.message}`);
  }
}

function parseData(text: string, path: string): Record<string, unknown> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new InputError(`invalid JSON in ${displayName(path)}: ${error.message}`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new InputError(`data in ${displayName(path)} must be a JSON object`);
  }
  return data as Record<string, unknown>;
}

function displayName(path: string): string {
  return path === STDIN ? STDIN_NAME : path;
}

function printDiagnostics(io: CliIo, name: string, diagnostics: Diagnostic[]): void {
  for (const d of diagnostics) {
    io.stderr(`${name}:${d.line}:${d.column}: ${d.severity} ${d.code}: ${d.message}\n`);
  }
}

function printJson(io: CliIo, value: unknown): void {
  io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}
