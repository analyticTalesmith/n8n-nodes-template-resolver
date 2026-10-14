import { Limits, TemplateValue, withDefaultLimits } from "./types";
import { DiagnosticCode, TemplateError } from "./errors";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";
import { analyze } from "./analyze";
import { estimateTokens } from "./estimate";

export interface RenderOptions {
  strictMode?: boolean;
  limits?: Partial<Limits>;
  tokenEstimator?: (text: string) => number;
}

export interface Diagnostic {
  severity: "error" | "warning";
  code: DiagnosticCode | "invalid-input" | "analysis-warning";
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

export interface RenderResult {
  ok: boolean;
  output: string;
  messages: unknown[];
  stats: {
    chars: number;
    estTokens: number;
    sectionsOmitted: number;
    iterations: number;
  };
  diagnostics: Diagnostic[];
}

/**
 * Render a template against data. Template and data problems never throw:
 * they come back as ok false, an empty output and the error first in
 * diagnostics.
 */
export function render(
  template: string,
  data: Record<string, unknown>,
  options?: RenderOptions
): RenderResult {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return failure(
      {
        severity: "error",
        code: "invalid-input",
        message: "Data must be an object mapping variable names to values",
        line: 1,
        column: 1,
      },
      0
    );
  }

  const limits = withDefaultLimits(options?.limits);
  const interpreter = new Interpreter(
    new Map(Object.entries(data)) as Map<string, TemplateValue>,
    { strictMode: options?.strictMode, limits }
  );

  let output: string;
  try {
    const tokens = new Lexer(template).tokenize();
    const ast = new Parser(tokens, { maxDepth: limits.maxDepth }).parse();
    output = interpreter.interpret(ast);
  } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    return failure(toDiagnostic(error), interpreter.iterationCount);
  }

  const estimate = options?.tokenEstimator ?? estimateTokens;
  return {
    ok: true,
    output,
    messages: [],
    stats: {
      chars: output.length,
      estTokens: estimate(output),
      sectionsOmitted: 0,
      iterations: interpreter.iterationCount,
    },
    diagnostics: [],
  };
}

/**
 * Check a template without data: syntax errors and unknown filters are
 * errors; conditions that only some data could satisfy are warnings.
 */
export function validate(
  template: string,
  options?: { limits?: Partial<Limits> }
): { ok: boolean; diagnostics: Diagnostic[] } {
  let diagnostics: Diagnostic[];
  try {
    diagnostics = analyze(template, options).diagnostics.map(
      ({ code, message, line, column }): Diagnostic =>
        code === "unknown-filter"
          ? { severity: "error", code, message, line, column }
          : { severity: "warning", code: "analysis-warning", message, line, column }
    );
  } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    diagnostics = [toDiagnostic(error)];
  }
  return {
    ok: diagnostics.every((d) => d.severity !== "error"),
    diagnostics,
  };
}

function failure(diagnostic: Diagnostic, iterations: number): RenderResult {
  return {
    ok: false,
    output: "",
    messages: [],
    stats: { chars: 0, estTokens: 0, sectionsOmitted: 0, iterations },
    diagnostics: [diagnostic],
  };
}

function toDiagnostic(error: TemplateError): Diagnostic {
  const diagnostic: Diagnostic = {
    severity: "error",
    code: error.code,
    message: error.detail,
    line: error.line,
    column: error.column,
  };
  if (error.suggestion !== undefined) diagnostic.suggestion = error.suggestion;
  return diagnostic;
}
