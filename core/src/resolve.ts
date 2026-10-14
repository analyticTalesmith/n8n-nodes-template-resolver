import { Limits, VariableMap } from "./types";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

/**
 * Main template resolution entry point
 *
 * @param template - Template string with conditional markdown syntax
 * @param variables - Variable mappings (name → value)
 * @param options - Configuration options (strictMode)
 * @returns Resolved markdown string
 */
export function resolveTemplate(
  template: string,
  variables: VariableMap,
  options?: { strictMode?: boolean; limits?: Partial<Limits> }
): string {
  // Tokenize
  const lexer = new Lexer(template);
  const tokens = lexer.tokenize();

  // Parse to AST
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // Interpret
  const interpreter = new Interpreter(variables, options);
  return interpreter.interpret(ast);
}
