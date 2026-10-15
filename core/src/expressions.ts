import { VariableMap, TemplateValue } from "./types";
import { TypeError, MathSyntaxError } from "./errors";
import {
  tryCoerceToNumber,
  tryCoerceToArray,
  tryCoerceToObject,
  tryCoerceStringForPathSegment,
  tryCoerceToBoolean,
  tryCoerceToString,
} from "./coercion";

/**
 * Evaluate truthiness of a value
 *
 * Falsy values:
 * - null, undefined
 * - Empty string, whitespace-only string
 * - Strings: "false", "0", "no", "null", "undefined", "none"
 * - Number 0
 * - Boolean false
 * - Empty arrays []
 * - Empty objects {}
 *
 * Everything else is truthy
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTruthy(value: any): boolean {
  if (value === null || value === undefined) return false;

  // Normalize strings
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (v === "" || v === "false" || v === "0" || v === "no") return false;
    if (v === "true" || v === "1" || v === "yes") return true;

    // Any other non-empty string counts as truthy
    return true;
  }

  // Numbers
  if (typeof value === "number") return value !== 0;

  // Booleans
  if (typeof value === "boolean") return value;

  // Arrays: empty = false, non-empty = true
  if (Array.isArray(value)) return value.length > 0;

  // Objects: empty = false, non-empty = true
  if (typeof value === "object") return Object.keys(value).length > 0;

  return Boolean(value);
}

/**
 * Evaluate conditional expression
 *
 * Supports:
 * - Simple truthiness: "varName"
 * - Comparisons: ==, !=, >, <, >=, <=
 * - String ops: contains, startsWith, endsWith
 * - Type checks: isEmpty, isNotEmpty, isArray, isNumber, isObject, isBoolean
 * - Logical: AND, OR, NOT (also &&, ||, !, case-insensitive)
 * - Parentheses for grouping
 */
export function evaluateCondition(
  condition: string,
  variables: VariableMap
): boolean {
  const trimmed = condition.trim();

  // Handle parentheses for grouping - only if they're matching outer parens
  const unwrapped = unwrapParens(trimmed);
  if (unwrapped !== null) return evaluateCondition(unwrapped, variables);

  // Handle logical operators (AND, OR)
  const logicalResult = tryEvaluateLogical(trimmed, variables);
  if (logicalResult !== null) return logicalResult;

  // Handle negation: NOT x, NOT (x), !x
  const negated = splitNegation(trimmed);
  if (negated !== null) return !evaluateCondition(negated, variables);

  // Handle comparison operators
  const comparisonResult = tryEvaluateComparison(trimmed, variables);
  if (comparisonResult !== null) return comparisonResult;

  // Handle string operators
  const stringResult = tryEvaluateStringOp(trimmed, variables);
  if (stringResult !== null) return stringResult;

  // Handle type checks
  const typeResult = tryEvaluateTypeCheck(trimmed, variables);
  if (typeResult !== null) return typeResult;

  if (!variables.has(trimmed) && hasBareWhitespace(trimmed)) {
    throw new TypeError(
      `Unrecognized condition: ${trimmed}`,
      1,
      1,
      "Use a supported operator: ==, !=, >, <, >=, <=, contains, startsWith, endsWith, AND, OR, NOT"
    );
  }

  // Simple truthiness check
  const value = resolveValue(trimmed, variables);
  return isTruthy(value);
}

/**
 * Check if parentheses in a string are balanced
 */
function isBalancedParens(str: string): boolean {
  let depth = 0;
  for (const char of str) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth < 0) return false; // More closing than opening
  }
  return depth === 0;
}

/**
 * The inner text when the whole expression is wrapped in matching parentheses,
 * otherwise null
 */
export function unwrapParens(expr: string): string | null {
  if (expr.startsWith("(") && expr.endsWith(")")) {
    const inner = expr.slice(1, -1);
    if (isBalancedParens(inner)) return inner;
  }
  return null;
}

/**
 * The negated operand of NOT x, NOT (x) or !x, otherwise null
 */
export function splitNegation(expr: string): string | null {
  const negated = expr.match(/^(?:NOT\b|!(?!=))\s*([\s\S]+)$/i);
  return negated ? negated[1] : null;
}

/**
 * Split on the lowest-precedence logical operator (AND/&&, OR/||) outside
 * parentheses and quotes: the rightmost OR first, then the rightmost AND
 */
export function splitLogical(
  expr: string
): { op: "or" | "and"; left: string; right: string } | null {
  let depth = 0;
  let quoteChar: string | null = null;
  let orPos = -1;
  let orLen = 0;
  let andPos = -1;
  let andLen = 0;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (quoteChar !== null) {
      if (char === quoteChar && expr[i - 1] !== "\\") quoteChar = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quoteChar = char;
      continue;
    }
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth !== 0) continue;

    if (expr.startsWith("||", i)) {
      orPos = i;
      orLen = 2;
    } else if (expr.startsWith("&&", i)) {
      andPos = i;
      andLen = 2;
    } else if (/\s/.test(char)) {
      const word = expr.slice(i).match(/^\s+(and|or)\s/i);
      if (word) {
        const len = word[0].length - 1;
        if (word[1].toLowerCase() === "or") {
          orPos = i;
          orLen = len;
        } else {
          andPos = i;
          andLen = len;
        }
      }
    }
  }

  if (orPos !== -1) {
    return {
      op: "or",
      left: expr.slice(0, orPos).trim(),
      right: expr.slice(orPos + orLen).trim(),
    };
  }

  if (andPos !== -1) {
    return {
      op: "and",
      left: expr.slice(0, andPos).trim(),
      right: expr.slice(andPos + andLen).trim(),
    };
  }

  return null;
}

/**
 * Try to evaluate logical operators (AND/&&, OR/||) outside parentheses and quotes
 */
function tryEvaluateLogical(
  expr: string,
  variables: VariableMap
): boolean | null {
  const split = splitLogical(expr);
  if (split === null) return null;
  const left = evaluateCondition(split.left, variables);
  return split.op === "or"
    ? left || evaluateCondition(split.right, variables)
    : left && evaluateCondition(split.right, variables);
}

/**
 * True when the expression has whitespace outside quotes, meaning it holds
 * more than one bare word
 */
export function hasBareWhitespace(expr: string): boolean {
  let quoteChar: string | null = null;
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (quoteChar !== null) {
      if (char === quoteChar && expr[i - 1] !== "\\") quoteChar = null;
    } else if (char === '"' || char === "'") {
      quoteChar = char;
    } else if (/\s/.test(char)) {
      return true;
    }
  }
  return false;
}

/**
 * Numeric value of a number or numeric string, otherwise null
 */
function numericOf(value: TemplateValue): number | null {
  return typeof value === "number" || typeof value === "string"
    ? tryCoerceToNumber(value)
    : null;
}

function valuesEqual(left: TemplateValue, right: TemplateValue): boolean {
  const l = left === undefined ? null : left;
  const r = right === undefined ? null : right;
  const leftNum = numericOf(l);
  const rightNum = numericOf(r);
  if (leftNum !== null && rightNum !== null) return leftNum === rightNum;
  return String(l) == String(r);
}

/**
 * Split on the first comparison operator (==, !=, >=, <=, >, <) outside quotes
 */
export function splitComparison(
  expr: string
): { op: string; left: string; right: string } | null {
  const operators = ["==", "!=", ">=", "<=", ">", "<"];

  let inQuotes = false;
  let quoteChar: string | null = null;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    // -------- Operator detection (MUST come before quote tracking) --------
    if (!inQuotes) {
      for (const op of operators) {
        if (expr.startsWith(op, i)) {
          return {
            op,
            left: expr.slice(0, i).trim(),
            right: expr.slice(i + op.length).trim(),
          };
        }
      }
    }

    // -------- Quote tracking --------
    if (char === '"' || char === "'") {
      const escaped = i > 0 && expr[i - 1] === "\\";

      if (!escaped) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
        }
      }
    }
  }

  return null;
}

/**
 * Try to evaluate comparison operators (==, !=, >, <, >=, <=)
 */
function tryEvaluateComparison(
  expr: string,
  variables: VariableMap
): boolean | null {
  const split = splitComparison(expr);
  if (split === null) return null;

  const left = resolveValue(split.left, variables);
  const right = resolveValue(split.right, variables);

  switch (split.op) {
    case "==":
      return valuesEqual(left, right);
    case "!=":
      return !valuesEqual(left, right);
    default:
      return evaluateNumericComparison(left, right, split.op);
  }
}

/**
 * Evaluate numeric comparison (>, <, >=, <=)
 */
function evaluateNumericComparison(
  left: TemplateValue,
  right: TemplateValue,
  op: string
): boolean {
  const leftNum = tryCoerceToNumber(left);
  const rightNum = tryCoerceToNumber(right);

  if (leftNum === null || rightNum === null) {
    throw new TypeError(
      `Cannot use operator '${op}' with non-numeric values: ${JSON.stringify(left)} ${op} ${JSON.stringify(right)}`,
      1,
      1,
      "Use isNumber check first: {{IF age isNumber AND age > 18}}"
    );
  }

  switch (op) {
    case ">":
      return leftNum > rightNum;
    case "<":
      return leftNum < rightNum;
    case ">=":
      return leftNum >= rightNum;
    case "<=":
      return leftNum <= rightNum;
    default:
      return false;
  }
}

/**
 * Split on the first string operator (contains, startsWith, endsWith)
 */
export function splitStringOp(
  expr: string
): { op: string; left: string; right: string } | null {
  const operators = ["contains", "startsWith", "endsWith"];

  for (const op of operators) {
    const regex = new RegExp(`(.+?)\\s+${op}\\s+(.+)`, "i");
    const match = expr.match(regex);
    if (match) return { op, left: match[1].trim(), right: match[2].trim() };
  }

  return null;
}

/**
 * Try to evaluate string operators (contains, startsWith, endsWith)
 */
function tryEvaluateStringOp(
  expr: string,
  variables: VariableMap
): boolean | null {
  const split = splitStringOp(expr);
  if (split === null) return null;

  const leftValue = resolveValue(split.left, variables);
  const rightValue = tryCoerceToString(resolveValue(split.right, variables));
  if (rightValue === null) return false;

  const leftStr = tryCoerceToString(leftValue);
  if (leftStr === null) return false;

  switch (split.op) {
    case "contains":
      return leftStr.includes(rightValue);
    case "startsWith":
      return leftStr.startsWith(rightValue);
    default:
      return leftStr.endsWith(rightValue);
  }
}

/**
 * Split a trailing type-check operator (isEmpty, isNotEmpty, isArray,
 * isNumber, isObject, isBoolean) from its operand
 */
export function splitTypeCheck(
  expr: string
): { check: string; operand: string } | null {
  const checks = [
    "isEmpty",
    "isNotEmpty",
    "isArray",
    "isNumber",
    "isObject",
    "isBoolean",
  ];

  for (const check of checks) {
    const regex = new RegExp(`(.+?)\\s+${check}$`, "i");
    const match = expr.match(regex);
    if (match) return { check, operand: match[1].trim() };
  }

  return null;
}

/**
 * Try to evaluate type check operators
 */
function tryEvaluateTypeCheck(
  expr: string,
  variables: VariableMap
): boolean | null {
  const split = splitTypeCheck(expr);
  if (split === null) return null;

  const value = resolveValue(split.operand, variables);

  switch (split.check) {
    case "isEmpty": {
      if (value == null) return true;
      if (typeof value === "string") return value.trim() === "";
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "object") return Object.keys(value).length === 0;
      return false;
    }
    case "isNotEmpty": {
      if (value == null) return false;
      if (typeof value === "string") return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    }
    case "isArray":
      return tryCoerceToArray(value) !== null;
    case "isNumber":
      return tryCoerceToNumber(value) !== null;
    case "isObject":
      return tryCoerceToObject(value) !== null;
    default:
      return tryCoerceToBoolean(value) !== null;
  }
}

/**
 * The value of a literal operand (true, false, null, a number or a quoted
 * string), or null when the operand is not a literal
 */
export function parseLiteral(expr: string): { value: TemplateValue } | null {
  if (expr === "true") return { value: true };
  if (expr === "false") return { value: false };
  if (expr === "null") return { value: null };

  if (/^-?\d+(\.\d+)?$/.test(expr)) return { value: Number(expr) };

  const first = expr[0];
  const last = expr[expr.length - 1];
  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
    return { value: expr.substring(1, expr.length - 1) };
  }

  return null;
}

/**
 * The operand expressions a condition reads, in source order. Mirrors the
 * structure evaluateCondition walks: grouping, logical operators, negation,
 * comparisons, string operators and type checks split the text; whatever is
 * left is an operand (a literal or a variable path).
 */
export function conditionOperands(condition: string): string[] {
  const trimmed = condition.trim();

  const unwrapped = unwrapParens(trimmed);
  if (unwrapped !== null) return conditionOperands(unwrapped);

  const logical = splitLogical(trimmed);
  if (logical !== null) {
    return [
      ...conditionOperands(logical.left),
      ...conditionOperands(logical.right),
    ];
  }

  const negated = splitNegation(trimmed);
  if (negated !== null) return conditionOperands(negated);

  const comparison = splitComparison(trimmed);
  if (comparison !== null) return [comparison.left, comparison.right];

  const stringOp = splitStringOp(trimmed);
  if (stringOp !== null) return [stringOp.left, stringOp.right];

  const typeCheck = splitTypeCheck(trimmed);
  if (typeCheck !== null) return [typeCheck.operand];

  return [trimmed];
}

/**
 * True when the text is an arithmetic expression rather than a plain path
 */
export function isMathExpression(expr: string): boolean {
  return (
    /[+*/%()]/.test(expr) ||
    [...expr].some((char, i) => char === "-" && !joinsName(expr, i))
  );
}

const ASCII_LETTER = /[a-zA-Z]/;
const NAME_CHAR = /[a-zA-Z0-9_@.]/;

/**
 * True when the hyphen at index i is part of a name: an ASCII letter sits on
 * both sides of it (first-name), so a-b is one name while a - b, n-1 and
 * x1-y are subtractions
 */
function joinsName(expr: string, i: number): boolean {
  return (
    expr[i] === "-" &&
    ASCII_LETTER.test(expr[i - 1] ?? "") &&
    ASCII_LETTER.test(expr[i + 1] ?? "")
  );
}

/**
 * The index just past the name that starts at index start
 */
function nameEnd(expr: string, start: number): number {
  let i = start;
  while (i < expr.length && (NAME_CHAR.test(expr[i]) || joinsName(expr, i))) {
    i++;
  }
  return i;
}

/**
 * The variable names in a math expression, using the same name characters
 * the math tokenizer reads
 */
export function mathVariableNames(expr: string): string[] {
  const names: string[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    if (/\s/.test(char) || ["+", "-", "*", "/", "%", "(", ")"].includes(char)) {
      i++;
      continue;
    }

    const end = nameEnd(expr, i);
    const name = expr.slice(i, end);
    i = Math.max(end, i + 1);
    if (name !== "" && !/^[\d.]+$/.test(name)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Resolve variable value (supports dot notation)
 */
function resolveValue(expr: string, variables: VariableMap): TemplateValue {
  if (!expr) return null;

  // Normalize whitespace everywhere
  expr = expr.trim();

  const literal = parseLiteral(expr);
  if (literal) return literal.value;

  // Variable path resolution
  const path = expr.split(".");
  let current: TemplateValue = variables.get(path[0]);

  for (let i = 1; i < path.length; i++) {
    if (current == null) return null;

    // Parse as JSON if the variable is a string
    if (typeof current === "string") {
      let parsed: TemplateValue = tryCoerceStringForPathSegment(
        current,
        path[i]
      );
      if (!parsed) {
        try {
          parsed = JSON.parse(current);
        } catch {
          return null;
        }
      }
      current = parsed;
    }

    if (
      typeof current === "object" &&
      current !== null &&
      !Array.isArray(current)
    ) {
      current = current[path[i]];
    } else if (Array.isArray(current)) {
      const index = Number(path[i]);
      current = current[index];
    } else {
      return null;
    }
  }

  return current;
}

/**
 * Evaluate expression (alias for evaluateCondition for API consistency)
 */
export function evaluateExpression(
  expression: string,
  variables: VariableMap
): boolean {
  return evaluateCondition(expression, variables);
}

/**
 * Evaluate math expression
 *
 * Supports: +, -, *, /, %, parentheses
 * Operator precedence: *, /, % > +, -
 */
export function evaluateMathExpression(
  expression: string,
  variables: VariableMap,
  options?: { zeroIsError?: boolean }
): number {
  const tokens = tokenizeMath(expression, variables);
  return evaluateMathTokens(tokens, options?.zeroIsError ?? false);
}

/**
 * Division or modulo by zero where zero is an error (render)
 */
export class DivisionByZeroError extends TypeError {
  constructor(operator: string) {
    super(
      `Cannot ${operator === "/" ? "divide" : "take a remainder"} by zero in math expression`,
      1,
      1,
      "Check the divisor is not zero before the math runs"
    );
    this.name = "DivisionByZeroError";
    Object.setPrototypeOf(this, DivisionByZeroError.prototype);
  }
}

/**
 * A math result as text with at most 15 significant digits, so binary float
 * noise (0.1 + 0.2) does not print
 */
export function formatNumber(n: number): string {
  return Number.isFinite(n) ? String(Number(n.toPrecision(15))) : String(n);
}

/**
 * True when the last token ends an operand (a number or a closing parenthesis)
 */
function endsOperand(tokens: (number | string)[]): boolean {
  const last = tokens[tokens.length - 1];
  return typeof last === "number" || last === ")";
}

/**
 * Tokenize math expression
 */
function tokenizeMath(
  expr: string,
  variables: VariableMap
): (number | string)[] {
  const tokens: (number | string)[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers; a minus right before a digit is a sign when no operand precedes it
    const signed =
      char === "-" && /\d/.test(expr[i + 1] ?? "") && !endsOperand(tokens);
    if (/\d/.test(char) || signed) {
      let num = signed ? "-" : "";
      i += num.length;
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push(Number(num));
      continue;
    }

    // Operators and parentheses
    if (["+", "-", "*", "/", "%", "(", ")"].includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // Variables
    const end = nameEnd(expr, i);
    const varName = expr.slice(i, end);
    i = end;

    if (!varName) {
      throw new MathSyntaxError(
        `Unexpected character ${JSON.stringify(char)} in math expression`,
        1,
        1
      );
    }

    const value = resolveValue(varName, variables);
    const num = tryCoerceToNumber(value);
    if (num === null) {
      throw new TypeError(
        `Cannot use non-numeric value in math expression: ${varName} = ${JSON.stringify(value)}`,
        1,
        1,
        "Ensure all variables in math expressions are numbers"
      );
    }
    tokens.push(num);
  }

  return tokens;
}

/**
 * Evaluate math tokens with proper operator precedence
 */
function evaluateMathTokens(
  tokens: (number | string)[],
  zeroIsError: boolean
): number {
  // Handle parentheses first
  while (tokens.includes("(")) {
    const openIdx = tokens.lastIndexOf("(");
    const closeIdx = tokens.indexOf(")", openIdx);

    if (closeIdx === -1) {
      throw new MathSyntaxError("Unmatched parentheses in math expression", 1, 1);
    }

    const subTokens = tokens.slice(openIdx + 1, closeIdx);
    const result = evaluateMathTokens(subTokens, zeroIsError);

    tokens.splice(openIdx, closeIdx - openIdx + 1, result);
  }

  // Handle *, /, % (higher precedence)
  for (let i = 1; i < tokens.length - 1; i++) {
    const op = tokens[i];
    if (op === "*" || op === "/" || op === "%") {
      const left = tokens[i - 1] as number;
      const right = tokens[i + 1] as number;

      if (zeroIsError && op !== "*" && right === 0) {
        throw new DivisionByZeroError(op);
      }

      let result: number;
      switch (op) {
        case "*":
          result = left * right;
          break;
        case "/":
          result = left / right;
          break;
        case "%":
          result = left % right;
          break;
        default:
          result = 0;
      }

      tokens.splice(i - 1, 3, result);
      i -= 1;
    }
  }

  // Handle +, - (lower precedence)
  for (let i = 1; i < tokens.length - 1; i++) {
    const op = tokens[i];
    if (op === "+" || op === "-") {
      const left = tokens[i - 1] as number;
      const right = tokens[i + 1] as number;

      const result = op === "+" ? left + right : left - right;

      tokens.splice(i - 1, 3, result);
      i -= 1;
    }
  }

  if (tokens.length !== 1 || typeof tokens[0] !== "number") {
    throw new MathSyntaxError("Invalid math expression", 1, 1);
  }

  return tokens[0];
}
