export type LimitCode =
  | "limit-iterations"
  | "limit-output"
  | "limit-depth"
  | "limit-nodes";

export type DiagnosticCode =
  | "syntax-error"
  | "type-error"
  | "missing-variable"
  | "unknown-filter"
  | LimitCode;

/**
 * Base template error with rich context
 */
export class TemplateError extends Error {
  constructor(
    public readonly detail: string,
    public line: number,
    public column: number,
    public readonly suggestion: string | undefined,
    public readonly code: DiagnosticCode
  ) {
    super(TemplateError.formatMessage(detail, line, column, suggestion));
    this.name = "TemplateError";
    Object.setPrototypeOf(this, TemplateError.prototype);
  }

  /**
   * Move the error to the template node that evaluated it
   */
  locate(line: number, column: number): this {
    this.line = line;
    this.column = column;
    this.message = TemplateError.formatMessage(
      this.detail,
      line,
      column,
      this.suggestion
    );
    return this;
  }

  private static formatMessage(
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ): string {
    let formatted = `Template Error (line ${line}, col ${column}):\n   ${message}`;
    if (suggestion) {
      formatted += `\n   Suggestion: ${suggestion}`;
    }
    return formatted;
  }
}

/**
 * Syntax error (lexer/parser issues)
 */
export class SyntaxError extends TemplateError {
  constructor(
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ) {
    super(message, line, column, suggestion, "syntax-error");
    this.name = "SyntaxError";
    Object.setPrototypeOf(this, SyntaxError.prototype);
  }
}

/**
 * Type error (invalid operations on values)
 */
export class TypeError extends TemplateError {
  constructor(
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ) {
    super(message, line, column, suggestion, "type-error");
    this.name = "TypeError";
    Object.setPrototypeOf(this, TypeError.prototype);
  }
}

/**
 * Math expression that cannot be parsed (unmatched parentheses, dangling operators)
 */
export class MathSyntaxError extends TypeError {
  constructor(message: string, line: number, column: number) {
    super(message, line, column);
    this.name = "MathSyntaxError";
    Object.setPrototypeOf(this, MathSyntaxError.prototype);
  }
}

/**
 * Missing variable error (strict mode)
 */
export class MissingVariableError extends TemplateError {
  constructor(
    variableName: string,
    line: number,
    column: number,
    availableVariables: string[],
    hint?: string
  ) {
    const message = `Variable '${variableName}' not found`;
    const base =
      availableVariables.length > 0
        ? `Available variables: ${availableVariables.join(", ")}\nCheck variable name or enable Lenient Mode`
        : "No variables defined. Check variable mappings.";
    const suggestion = hint === undefined ? base : `${base}\n${hint}`;
    super(message, line, column, suggestion, "missing-variable");
    this.name = "MissingVariableError";
    Object.setPrototypeOf(this, MissingVariableError.prototype);
  }
}

/**
 * Filter name that does not exist
 */
export class UnknownFilterError extends TemplateError {
  constructor(
    filterName: string,
    line: number,
    column: number,
    availableFilters: string[]
  ) {
    super(
      `Unknown filter: ${filterName}`,
      line,
      column,
      `Available filters: ${availableFilters.join(", ")}`,
      "unknown-filter"
    );
    this.name = "UnknownFilterError";
    Object.setPrototypeOf(this, UnknownFilterError.prototype);
  }
}

/**
 * Render work crossed a configured limit
 */
export class LimitError extends TemplateError {
  constructor(
    code: LimitCode,
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ) {
    super(message, line, column, suggestion, code);
    this.name = "LimitError";
    Object.setPrototypeOf(this, LimitError.prototype);
  }
}

/**
 * The error located at the node that evaluated it. A plain Error (bad filter
 * parameters, failed math) becomes a type error there.
 */
export function locateError(
  error: unknown,
  line: number,
  column: number
): unknown {
  if (error instanceof TemplateError) return error.locate(line, column);
  if (error instanceof Error) return new TypeError(error.message, line, column);
  return error;
}
