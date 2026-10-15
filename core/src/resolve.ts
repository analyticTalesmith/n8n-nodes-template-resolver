import {
  Limits,
  VariableMap,
  WhitespaceOptions,
  withDefaultLimits,
} from "./types";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

/**
 * Main template resolution entry point
 *
 * @param template - Template string with conditional markdown syntax
 * @param variables - Variable mappings (name → value)
 * @param options - Configuration options (strictMode, limits, standaloneLines; omitted limits take DEFAULT_LIMITS, standaloneLines defaults to false)
 * @returns Resolved markdown string
 */
export function resolveTemplate(
  template: string,
  variables: VariableMap,
  options?: {
    strictMode?: boolean;
    limits?: Partial<Limits>;
  } & WhitespaceOptions
): string {
  const limits = withDefaultLimits(options?.limits);

  // Tokenize
  const lexer = new Lexer(template, {
    standaloneLines: options?.standaloneLines ?? false,
  });
  const tokens = lexer.tokenize();

  // Parse to AST
  const parser = new Parser(tokens, {
    maxDepth: limits.maxDepth,
    maxNodes: limits.maxNodes,
  });
  const ast = parser.parse();

  // Interpret
  const interpreter = new Interpreter(variables, {
    strictMode: options?.strictMode,
    limits,
  });
  return interpreter.interpret(ast);
}
