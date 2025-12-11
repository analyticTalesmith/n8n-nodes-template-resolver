import { VariableMap, TemplateValue } from "./types";
import { TypeError } from "./errors";
import {
  tryCoerceToNumber,
  tryCoerceToArray,
  tryCoerceToObject,
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
 * - Logical: AND, OR, NOT()
 * - Parentheses for grouping
 */
export function evaluateCondition(
  condition: string,
  variables: VariableMap
): boolean {
  const trimmed = condition.trim();

  // Handle NOT() wrapper - verify the closing paren matches NOT(
  if (trimmed.startsWith("NOT(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(4, -1);
    if (isBalancedParens(inner)) {
      return !evaluateCondition(inner, variables);
    }
  }

  // Handle parentheses for grouping - only if they're matching outer parens
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(1, -1);
    // Check if the inner content is balanced - if so, these are wrapping parens
    if (isBalancedParens(inner)) {
      return evaluateCondition(inner, variables);
    }
  }

  // Handle logical operators (AND, OR)
  const logicalResult = tryEvaluateLogical(trimmed, variables);
  if (logicalResult !== null) return logicalResult;

  // Handle comparison operators
  const comparisonResult = tryEvaluateComparison(trimmed, variables);
  if (comparisonResult !== null) return comparisonResult;

  // Handle string operators
  const stringResult = tryEvaluateStringOp(trimmed, variables);
  if (stringResult !== null) return stringResult;

  // Handle type checks
  const typeResult = tryEvaluateTypeCheck(trimmed, variables);
  if (typeResult !== null) return typeResult;

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
 * Try to evaluate logical operators (AND, OR)
 */
/**
 * Try to evaluate logical operators (AND, OR)
 */
function tryEvaluateLogical(
  expr: string,
  variables: VariableMap
): boolean | null {
  // Find AND/OR not inside parentheses
  let depth = 0;
  let orPos = -1;
  let andPos = -1;

  for (let i = 0; i < expr.length - 3; i++) {
    // -3 to allow for " OR " or "AND"
    if (expr[i] === "(") depth++;
    if (expr[i] === ")") depth--;

    if (depth === 0) {
      // Check for OR (lower precedence, evaluate last)
      if (expr.slice(i, i + 4) === " OR ") {
        orPos = i;
        // Don't break - keep looking for rightmost OR
      }
      // Check for AND (higher precedence)
      if (expr.slice(i, i + 5) === " AND ") {
        if (orPos === -1) {
          // Only record AND if no OR found yet
          andPos = i;
        }
      }
    }
  }

  // OR has lower precedence - split on rightmost OR first
  if (orPos !== -1) {
    const left = expr.slice(0, orPos).trim();
    const right = expr.slice(orPos + 4).trim();
    return (
      evaluateCondition(left, variables) || evaluateCondition(right, variables)
    );
  }

  // Then split on rightmost AND
  if (andPos !== -1) {
    const left = expr.slice(0, andPos).trim();
    const right = expr.slice(andPos + 5).trim();
    return (
      evaluateCondition(left, variables) && evaluateCondition(right, variables)
    );
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
  const operators = ["==", "!=", ">=", "<=", ">", "<"];

  let inQuotes = false;
  let quoteChar: string | null = null;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    // -------- Operator detection (MUST come before quote tracking) --------
    if (!inQuotes) {
      for (const op of operators) {
        if (expr.startsWith(op, i)) {
          const leftExpr = expr.slice(0, i).trim();
          const rightExpr = expr.slice(i + op.length).trim();

          const left = resolveValue(leftExpr, variables);
          const right = resolveValue(rightExpr, variables);

          switch (op) {
            case "==":
              return String(left) == String(right);

            case "!=":
              return String(left) != String(right);

            case ">":
            case "<":
            case ">=":
            case "<=":
              return evaluateNumericComparison(left, right, op);
          }
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
 * Try to evaluate string operators (contains, startsWith, endsWith)
 */
function tryEvaluateStringOp(
  expr: string,
  variables: VariableMap
): boolean | null {
  const operators = ["contains", "startsWith", "endsWith"];

  for (const op of operators) {
    const regex = new RegExp(`(.+?)\\s+${op}\\s+(.+)`, "i");
    const match = expr.match(regex);

    if (match) {
      const leftValue = resolveValue(match[1].trim(), variables);
      const rightValue = match[2].trim().replace(/^["']|["']$/g, "");

      const leftStr = tryCoerceToString(leftValue);
      if (leftStr === null) return false;

      switch (op) {
        case "contains":
          return leftStr.includes(rightValue);
        case "startsWith":
          return leftStr.startsWith(rightValue);
        case "endsWith":
          return leftStr.endsWith(rightValue);
      }
    }
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

    if (match) {
      const value = resolveValue(match[1].trim(), variables);

      switch (check) {
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
        case "isBoolean":
          return tryCoerceToBoolean(value) !== null;
      }
    }
  }

  return null;
}

/**
 * Resolve variable value (supports dot notation)
 */
function resolveValue(expr: string, variables: VariableMap): TemplateValue {
  if (!expr) return null;

  // Normalize whitespace everywhere
  expr = expr.trim();

  // Literal booleans
  if (expr === "true") return true;
  if (expr === "false") return false;
  if (expr === "null") return null;

  // Numeric literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);

  // Robust string-literal detection
  const first = expr[0];
  const last = expr[expr.length - 1];
  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
    return expr.substring(1, expr.length - 1);
  }

  // Variable path resolution
  const path = expr.split(".");
  let current: TemplateValue = variables.get(path[0]);

  for (let i = 1; i < path.length; i++) {
    if (current == null) return null;

    // Parse as JSON if the variable is a string
    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
      } catch {
        return null;
      }
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
  variables: VariableMap
): number {
  const tokens = tokenizeMath(expression, variables);
  return evaluateMathTokens(tokens);
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

    // Operators and parentheses
    if (["+", "-", "*", "/", "%", "(", ")"].includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === "-" && /\d/.test(expr[i + 1]))) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push(Number(num));
      continue;
    }

    // Variables
    let varName = "";
    while (i < expr.length && /[a-zA-Z0-9_@.]/.test(expr[i])) {
      varName += expr[i];
      i++;
    }

    if (varName) {
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
  }

  return tokens;
}

/**
 * Evaluate math tokens with proper operator precedence
 */
function evaluateMathTokens(tokens: (number | string)[]): number {
  // Handle parentheses first
  while (tokens.includes("(")) {
    const openIdx = tokens.lastIndexOf("(");
    const closeIdx = tokens.indexOf(")", openIdx);

    if (closeIdx === -1) {
      throw new TypeError("Unmatched parentheses in math expression", 1, 1);
    }

    const subTokens = tokens.slice(openIdx + 1, closeIdx);
    const result = evaluateMathTokens(subTokens);

    tokens.splice(openIdx, closeIdx - openIdx + 1, result);
  }

  // Handle *, /, % (higher precedence)
  for (let i = 1; i < tokens.length - 1; i++) {
    const op = tokens[i];
    if (op === "*" || op === "/" || op === "%") {
      const left = tokens[i - 1] as number;
      const right = tokens[i + 1] as number;

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
    throw new TypeError("Invalid math expression", 1, 1);
  }

  return tokens[0];
}
