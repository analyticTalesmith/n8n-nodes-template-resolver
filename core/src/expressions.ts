import {
  VariableMap,
  TemplateValue,
  WhenItem,
  WhenMatch,
  WhenOperator,
} from "./types";
import { TypeError, MathSyntaxError, SyntaxError } from "./errors";
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
 * - Membership and range: in, not in, between [lo, hi]
 * - String ops: contains, startsWith, endsWith
 * - Type checks: isEmpty, isNotEmpty, isArray, isNumber, isObject, isBoolean
 * - Logical: AND, OR, NOT (also &&, ||, !, case-insensitive)
 * - Parentheses for grouping
 *
 * Every operand is checked before anything runs, so text the language cannot
 * read is an error even in a branch a short-circuit would skip.
 */
export function evaluateCondition(
  condition: string,
  variables: VariableMap
): boolean {
  for (const operand of conditionOperands(condition)) {
    readableOperand(operand, variables);
  }
  return evaluateConditionText(condition, variables);
}

function evaluateConditionText(
  condition: string,
  variables: VariableMap
): boolean {
  const trimmed = condition.trim();

  // Handle parentheses for grouping - only if they're matching outer parens
  const unwrapped = unwrapParens(trimmed);
  if (unwrapped !== null) return evaluateConditionText(unwrapped, variables);

  // Handle logical operators (AND, OR)
  const logicalResult = tryEvaluateLogical(trimmed, variables);
  if (logicalResult !== null) return logicalResult;

  // Handle negation: NOT x, NOT (x), !x
  const negated = splitNegation(trimmed);
  if (negated !== null) return !evaluateConditionText(negated, variables);

  // Handle comparison operators
  const comparisonResult = tryEvaluateComparison(trimmed, variables);
  if (comparisonResult !== null) return comparisonResult;

  // Handle membership and range operators
  const membershipResult = tryEvaluateMembership(trimmed, variables);
  if (membershipResult !== null) return membershipResult;
  const betweenResult = tryEvaluateBetween(trimmed, variables);
  if (betweenResult !== null) return betweenResult;

  // Handle string operators
  const stringResult = tryEvaluateStringOp(trimmed, variables);
  if (stringResult !== null) return stringResult;

  // Handle type checks
  const typeResult = tryEvaluateTypeCheck(trimmed, variables);
  if (typeResult !== null) return typeResult;

  // Simple truthiness check
  return isTruthy(readOperand(trimmed, variables).value);
}

const UNRECOGNIZED_HINT =
  "Use a supported operator: ==, !=, >, <, >=, <=, contains, startsWith, endsWith, in, not in, between, AND, OR, NOT";

function unrecognizedCondition(text: string): TypeError {
  return new TypeError(`Unrecognized condition: ${text}`, 1, 1, UNRECOGNIZED_HINT);
}

function safeString(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "[unprintable]";
  }
}

const DESCRIBE_TEXT_LIMIT = 40;

/**
 * A bounded description of a value for an error message: never serializes a
 * structure and never throws (cycles, BigInt, hostile toString)
 */
function describeOperand(value: unknown): string {
  if (typeof value === "string") {
    const shown =
      value.length > DESCRIBE_TEXT_LIMIT
        ? `${value.slice(0, DESCRIBE_TEXT_LIMIT)}...`
        : value;
    return `"${shown}"`;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    value === null ||
    value === undefined
  ) {
    return String(value);
  }
  if (Array.isArray(value)) return `an array of ${value.length} items`;
  return "an object";
}

/** An operand read from a condition: its value, and how it was written */
export interface Operand {
  value: TemplateValue;
  /** True when written as a quoted literal */
  quoted: boolean;
  /** The written text of a number literal */
  text?: string;
}

/**
 * Read one operand: a literal or a variable path. Text that is neither, is
 * not a variable key and holds a bare space is not a condition we can read.
 */
function readOperand(expr: string, variables: VariableMap): Operand {
  const text = expr.trim();
  if (text === "") return { value: null, quoted: false };

  const literal = parseLiteral(text);
  if (literal) {
    return { value: literal.value, quoted: literal.quoted, text: literal.text };
  }
  readableOperand(text, variables);
  return { value: resolveValue(text, variables), quoted: false };
}

/**
 * Throw the Unrecognized condition error for an operand that is not a
 * literal, not a variable key and holds a bare space
 */
function readableOperand(text: string, variables: VariableMap): void {
  if (
    text !== "" &&
    parseLiteral(text) === null &&
    !variables.has(text) &&
    hasBareWhitespace(text)
  ) {
    throw unrecognizedCondition(text);
  }
}

/**
 * Check if parentheses in a string are balanced; parentheses inside quotes
 * do not count
 */
function isBalancedParens(str: string): boolean {
  let depth = 0;
  let quoteChar: string | null = null;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (quoteChar !== null) {
      if (char === quoteChar && str[i - 1] !== "\\") quoteChar = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quoteChar = char;
      continue;
    }
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
  const left = evaluateConditionText(split.left, variables);
  return split.op === "or"
    ? left || evaluateConditionText(split.right, variables)
    : left && evaluateConditionText(split.right, variables);
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

/**
 * The one equality rule behind ==, != and in: when either side was written
 * as a quoted literal both compare as text, otherwise numbers compare
 * numerically and anything else as text
 */
export function valuesEqual(left: Operand, right: Operand): boolean {
  const l = left.value === undefined ? null : left.value;
  const r = right.value === undefined ? null : right.value;
  if (!left.quoted && !right.quoted) {
    const leftNum = numericOf(l);
    const rightNum = numericOf(r);
    if (leftNum !== null && rightNum !== null) return leftNum === rightNum;
  }
  return safeString(l) === safeString(r);
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

  const left = readOperand(split.left, variables);
  const right = readOperand(split.right, variables);

  switch (split.op) {
    case "==":
      return valuesEqual(left, right);
    case "!=":
      return !valuesEqual(left, right);
    default:
      return evaluateNumericComparison(left.value, right.value, split.op);
  }
}

/**
 * Evaluate numeric comparison (>, <, >=, <=)
 */
export function evaluateNumericComparison(
  left: TemplateValue,
  right: TemplateValue,
  op: string
): boolean {
  const leftNum = tryCoerceToNumber(left);
  const rightNum = tryCoerceToNumber(right);

  if (leftNum === null || rightNum === null) {
    throw new TypeError(
      `Cannot use operator '${op}' with non-numeric values: ${describeOperand(left)} ${op} ${describeOperand(right)}`,
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
 * Split on the first whitespace-delimited operator word that matches the
 * pattern, found outside quotes, brackets and parentheses
 */
function splitOnWord(
  expr: string,
  pattern: RegExp
): { word: string; left: string; right: string } | null {
  let depth = 0;
  let quoteChar: string | null = null;

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
    if (char === "(" || char === "[") depth++;
    if (char === ")" || char === "]") depth--;
    if (depth !== 0 || !/\s/.test(char)) continue;

    const match = expr.slice(i).match(pattern);
    if (match) {
      return {
        word: match[1].toLowerCase().replace(/\s+/g, " "),
        left: expr.slice(0, i).trim(),
        right: expr.slice(i + match[0].length).trim(),
      };
    }
  }

  return null;
}

/**
 * Split on the first `in` or `not in` (any case) outside quotes, brackets
 * and parentheses
 */
export function splitMembership(
  expr: string
): { op: "in" | "not in"; left: string; right: string } | null {
  const split = splitOnWord(expr, /^\s+(not\s+in|in)\s+/i);
  if (split === null) return null;
  return {
    op: split.word === "in" ? "in" : "not in",
    left: split.left,
    right: split.right,
  };
}

/**
 * Split on the first `between` (any case) outside quotes, brackets and
 * parentheses
 */
export function splitBetween(
  expr: string
): { left: string; right: string } | null {
  const split = splitOnWord(expr, /^\s+(between)\s+/i);
  return split === null ? null : { left: split.left, right: split.right };
}

/**
 * The items of a list literal such as [a, "b", 3], each trimmed, or null
 * when the text is not one list: a missing bracket, a nested bracket, an
 * empty item or text after the closing bracket. [] is the empty list.
 */
function parseListLiteral(text: string): string[] | null {
  const list = text.trim();
  if (list.length < 2 || !list.startsWith("[") || !list.endsWith("]")) {
    return null;
  }

  const items = splitCommas(
    list.slice(1, -1),
    (char) => char === "[" || char === "]"
  );
  if (items === null) return null;
  if (items.length === 1 && items[0] === "") return [];
  return items.includes("") ? null : items;
}

/**
 * Split text on the commas outside quotes, each part trimmed. Null when a
 * quote is never closed or when reject returns true for a character outside
 * quotes. Empty text gives one empty part.
 */
export function splitCommas(
  text: string,
  reject?: (char: string) => boolean
): string[] | null {
  const parts: string[] = [];
  let quoteChar: string | null = null;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoteChar !== null) {
      if (char === quoteChar && text[i - 1] !== "\\") quoteChar = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quoteChar = char;
      continue;
    }
    if (reject?.(char)) return null;
    if (char === ",") {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }

  if (quoteChar !== null) return null;
  parts.push(text.slice(start).trim());
  return parts;
}

const WHEN_HINT =
  'Write {{WHEN "a", "b"}}, {{WHEN variable}} or {{WHEN >= 10}}';
const WHEN_PATH = /^[\p{L}_@][\p{L}\p{N}_@-]*(\.[\p{L}\p{N}_@-]+)*$/u;
const WHEN_OPERATOR = /^(==|!=|>=|<=|>|<)/;

function whenItem(text: string, fail: (message: string) => never): WhenItem {
  if (text === "") fail("Empty value in {{WHEN}}");
  const literal = parseLiteral(text);
  if (literal) {
    if (literal.quoted) {
      return { kind: "literal", text: String(literal.value), quoted: true };
    }
    return {
      kind: "literal",
      text: literal.value === null ? "" : (literal.text ?? String(literal.value)),
      quoted: false,
    };
  }
  if (WHEN_PATH.test(text)) return { kind: "path", path: text.split(".") };
  return fail(`Cannot read {{WHEN}} value: ${text}`);
}

/**
 * Read the text after WHEN: a list of values and variables, or one comparison
 * (an operator and one value). Throws the SyntaxError for text that is
 * neither, located at the tag.
 */
export function parseWhenMatch(
  text: string,
  line: number,
  column: number
): WhenMatch {
  const fail = (message: string): never => {
    throw new SyntaxError(message, line, column, WHEN_HINT);
  };
  const written = text.trim();
  if (written === "") return fail("{{WHEN}} needs a value to match");

  const comparison = written.match(WHEN_OPERATOR);
  if (comparison) {
    const operator = comparison[1] as WhenOperator;
    const rest = written.slice(operator.length).trim();
    if (rest === "") return fail(`'${operator}' in {{WHEN}} needs a value`);
    const parts = splitCommas(rest);
    if (parts === null) return fail("Unclosed quote in {{WHEN}}");
    if (parts.length !== 1) {
      return fail(`'${operator}' in {{WHEN}} takes exactly one value`);
    }
    return { kind: "comparison", operator, item: whenItem(parts[0], fail) };
  }

  const parts = splitCommas(written);
  if (parts === null) return fail("Unclosed quote in {{WHEN}}");
  return { kind: "list", items: parts.map((part) => whenItem(part, fail)) };
}

/**
 * True when the CASE value (as text) matches the WHEN. A list matches when
 * any item equals it; a comparison uses the equality or numeric rules of
 * conditions. lookup gives the text of a variable path and throws for a
 * missing or unprintable value.
 */
export function evaluateWhen(
  match: WhenMatch,
  subject: string,
  lookup: (path: string[]) => string
): boolean {
  const left: Operand = { value: subject, quoted: false };
  const read = (item: WhenItem): Operand =>
    item.kind === "literal"
      ? { value: item.text, quoted: item.quoted }
      : { value: lookup(item.path), quoted: false };

  if (match.kind === "list") {
    return match.items.some((item) => valuesEqual(left, read(item)));
  }
  const right = read(match.item);
  switch (match.operator) {
    case "==":
      return valuesEqual(left, right);
    case "!=":
      return !valuesEqual(left, right);
    default:
      return evaluateNumericComparison(
        left.value,
        right.value,
        match.operator
      );
  }
}

function isScalar(value: TemplateValue): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Try to evaluate `x in right` and `x not in right`; the right side is a
 * list literal, a list variable or a text
 */
function tryEvaluateMembership(
  expr: string,
  variables: VariableMap
): boolean | null {
  const split = splitMembership(expr);
  if (split === null) return null;

  const left = readOperand(split.left, variables);

  let items: Operand[] | null = null;
  let text: string | null = null;
  if (split.right.startsWith("[")) {
    const written = parseListLiteral(split.right);
    if (written === null) throw unrecognizedCondition(expr);
    items = written.map((item) => readOperand(item, variables));
  } else {
    const right = readOperand(split.right, variables).value;
    if (Array.isArray(right)) {
      items = right.map((value) => ({ value, quoted: false }));
    } else if (typeof right === "string") {
      text = right;
    } else if (right != null) {
      throw new TypeError(
        `Cannot use '${split.op}' with a right side that is not a list or text: ${describeOperand(right)}`,
        1,
        1,
        "Use a list such as [\"a\", \"b\"], a list variable or a text"
      );
    }
  }

  const found = isMember(left, items, text, split.op);
  return split.op === "in" ? found : !found;
}

/**
 * True when the left operand is in the list or text; missing data (a null
 * left side or no right side) is not a member
 */
function isMember(
  left: Operand,
  items: Operand[] | null,
  text: string | null,
  op: string
): boolean {
  if (left.value != null && !isScalar(left.value)) {
    throw new TypeError(
      `Cannot use '${op}' with a left side that is not a text, number or boolean: ${describeOperand(left.value)}`,
      1,
      1,
      "Test one value at a time, for example inside a FOR loop"
    );
  }

  if (items === null && text === null) return false;
  if (left.value == null) return false;
  if (text !== null) return text.includes(safeString(left.value));
  return (items ?? []).some(
    (item) => isScalar(item.value) && valuesEqual(left, item)
  );
}

/**
 * Try to evaluate `x between [lo, hi]`: inclusive, numeric
 */
function tryEvaluateBetween(
  expr: string,
  variables: VariableMap
): boolean | null {
  const split = splitBetween(expr);
  if (split === null) return null;

  const bounds = parseListLiteral(split.right);
  if (bounds === null || bounds.length !== 2) throw unrecognizedCondition(expr);

  const [value, low, high] = [split.left, ...bounds].map((operand) => {
    const read = readOperand(operand, variables).value;
    const number = typeof read === "boolean" ? null : tryCoerceToNumber(read);
    if (number === null) {
      throw new TypeError(
        `Cannot use 'between' with a non-numeric value: ${describeOperand(read)}`,
        1,
        1,
        "Use isNumber check first: {{IF age isNumber AND age between [18, 65]}}"
      );
    }
    return number;
  });
  return value >= low && value <= high;
}

/**
 * The built-in .length of an array or a string, as { value }; null when the
 * built-in does not apply and the segment reads as an ordinary key. A string
 * that is a JSON object with its own key length gives that key.
 */
export function builtInLength(
  current: TemplateValue
): { value: TemplateValue } | null {
  if (Array.isArray(current)) return { value: current.length };
  if (typeof current === "string") {
    const object = tryCoerceToObject(current);
    if (object && Object.prototype.hasOwnProperty.call(object, "length")) {
      return { value: object.length };
    }
    return { value: current.length };
  }
  return null;
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

  const left = readOperand(split.left, variables);
  const right = readOperand(split.right, variables);
  // A number written without quotes keeps its written text (007, 1.50)
  const rightValue =
    right.text !== undefined ? right.text : tryCoerceToString(right.value);
  if (rightValue === null) return false;

  const leftStr = tryCoerceToString(left.value);
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

  const value = readOperand(split.operand, variables).value;

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

/** True when the quote character appears inside the text without a backslash before it */
function hasUnescapedChar(text: string, quote: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === quote && text[i - 1] !== "\\") return true;
  }
  return false;
}

/**
 * The value of a literal operand (true, false, null, a number or a quoted
 * string), or null when the operand is not a literal. A quoted string is
 * marked quoted; a number carries its written text.
 */
export function parseLiteral(
  expr: string
): { value: TemplateValue; quoted: boolean; text?: string } | null {
  if (expr === "true") return { value: true, quoted: false };
  if (expr === "false") return { value: false, quoted: false };
  if (expr === "null") return { value: null, quoted: false };

  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return { value: Number(expr), quoted: false, text: expr };
  }

  const first = expr[0];
  const last = expr[expr.length - 1];
  if (
    expr.length >= 2 &&
    ((first === `"` && last === `"`) || (first === `'` && last === `'`)) &&
    !hasUnescapedChar(expr.slice(1, -1), first)
  ) {
    return { value: expr.substring(1, expr.length - 1), quoted: true };
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

  const membership = splitMembership(trimmed);
  if (membership !== null) {
    if (!membership.right.startsWith("[")) {
      return [membership.left, membership.right];
    }
    const items = parseListLiteral(membership.right);
    return items === null ? [trimmed] : [membership.left, ...items];
  }

  const between = splitBetween(trimmed);
  if (between !== null) {
    const bounds = parseListLiteral(between.right);
    return bounds === null || bounds.length !== 2
      ? [trimmed]
      : [between.left, ...bounds];
  }

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
  if (/[+*/%()]/.test(expr)) return true;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "-" && !joinsName(expr, i)) return true;
  }
  return false;
}

const ASCII_LETTER = /[a-zA-Z]/;
const NAME_CHAR = /[a-zA-Z0-9_@.]/;

/**
 * True when the hyphen at index i is part of a name: an ASCII letter sits on
 * both sides of it (first-name), so a-b is one name while a - b, n-1 and
 * x1-y are subtractions
 */
export function joinsName(expr: string, i: number): boolean {
  return (
    expr[i] === "-" &&
    ASCII_LETTER.test(expr[i - 1] ?? "") &&
    ASCII_LETTER.test(expr[i + 1] ?? "")
  );
}

/**
 * True when the text holds a character no name or operator uses and also a
 * standalone number ("2 $ 3"), so it can only be a malformed math expression;
 * without a number ("a:b", "Order #") it is a plain name
 */
export function hasStrayCharacter(text: string): boolean {
  return (
    /[^\p{L}\p{N}_@.\s-]/u.test(text) && /(?<![\p{L}\p{N}_@.])\d/u.test(text)
  );
}

/**
 * How to write a missing hyphenated name as subtraction, when the name reads
 * like one (letter-hyphen-letter, no whitespace)
 */
export function subtractionHint(name: string): string | undefined {
  if (/\s/.test(name)) return undefined;
  let spaced = "";
  for (let i = 0; i < name.length; i++) {
    spaced += joinsName(name, i) ? " - " : name[i];
  }
  if (spaced === name) return undefined;
  return `If you meant subtraction, write '${spaced}'`;
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

    if (path[i] === "length") {
      const built = builtInLength(current);
      if (built) {
        current = built.value;
        continue;
      }
    }

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
  // Shape first, with every name standing in as a number and no variable read
  evaluateMathTokens(tokenizeMath(expression, null), false);
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
 * A math result as text: integers print unchanged, other numbers with at most
 * 15 significant digits, so binary float noise (0.1 + 0.2) does not print
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n) || Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(15)));
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
  variables: VariableMap | null
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

    if (variables === null) {
      tokens.push(1);
      continue;
    }

    const value = resolveValue(varName, variables);
    const num = tryCoerceToNumber(value);
    if (num === null) {
      throw new TypeError(
        `Cannot use non-numeric value in math expression: ${varName} = ${describeOperand(value)}`,
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
