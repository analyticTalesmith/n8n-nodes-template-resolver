/**
 * Base template error with rich context
 */
export class TemplateError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly suggestion?: string
  ) {
    super(TemplateError.formatMessage(message, line, column, suggestion));
    this.name = "TemplateError";
    Object.setPrototypeOf(this, TemplateError.prototype);
  }

  private static formatMessage(
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ): string {
    let formatted = `âŒ Template Error (line ${line}, col ${column}):\n   ${message}`;
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
    super(message, line, column, suggestion);
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
    super(message, line, column, suggestion);
    this.name = "TypeError";
    Object.setPrototypeOf(this, TypeError.prototype);
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
    availableVariables: string[]
  ) {
    const message = `Variable '${variableName}' not found`;
    const suggestion =
      availableVariables.length > 0
        ? `Available variables: ${availableVariables.join(", ")}\nCheck variable name or enable Lenient Mode`
        : "No variables defined. Check variable mappings.";
    super(message, line, column, suggestion);
    this.name = "MissingVariableError";
    Object.setPrototypeOf(this, MissingVariableError.prototype);
  }
}
