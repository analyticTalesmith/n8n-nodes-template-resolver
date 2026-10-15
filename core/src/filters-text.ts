import { FilterDefinition, TemplateValue } from "./types";
import { valueToText } from "./filters";
import { isTruthy } from "./expressions";

type Params = Record<string, string>;

/**
 * A row whose input is coerced to text exactly as the output step prints it.
 * valueToText is read inside apply only: filters.ts imports this file, so it
 * is not yet defined at load.
 */
function textRow(
  name: string,
  params: string,
  description: string,
  paramNames: string[],
  apply: (text: string, params: Params) => string
): FilterDefinition {
  return {
    name,
    params,
    description,
    paramNames,
    apply: (input, given) => apply(valueToText(input as TemplateValue), given),
  };
}

/**
 * A whole-number parameter within min..max; an absent one gives the fallback
 * when there is one, otherwise an error
 */
function integerParam(
  filter: string,
  value: string | undefined,
  min: number,
  max: number,
  fallback?: number
): number {
  if (value === undefined && fallback !== undefined) return fallback;
  const n = value !== undefined && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!(n >= min && n <= max)) {
    throw new Error(
      `${filter} requires a whole number from ${min} to ${max} (e.g., ${filter}=2), got ${value ?? "none"}`
    );
  }
  return n;
}

function titleCase(text: string): string {
  return text.replace(/\S+/g, (word) => {
    const [first, ...rest] = word;
    return first.toUpperCase() + rest.join("").toLowerCase();
  });
}

/** Literal replacement: no pattern is compiled and `with` has no special forms */
function replaceLiteral(text: string, params: Params): string {
  const { find, with: replacement = "" } = params;
  if (!find) {
    throw new Error("replace requires a non-empty find parameter (e.g., replace:find=\"a\",with=\"b\")");
  }
  return text.split(find).join(replacement);
}

function indentLines(text: string, params: Params): string {
  const pad = " ".repeat(integerParam("indent", params.value, 0, 100, 2));
  return text
    .split("\n")
    .map((line) => (line === "" || line === "\r" ? line : pad + line))
    .join("\n");
}

/**
 * Round a decimal number given as text to `places` places, half away from
 * zero, working on its digits so 1.005 gives 1.01; text that is not a plain
 * decimal number (optionally with an exponent) is returned as null
 */
function roundDecimal(text: string, places: number): string | null {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
  if (!match || !/\d/.test(match[2] + (match[3] ?? ""))) return null;
  const [, sign, whole, fraction = "", exponent = "0"] = match;
  const point = whole.length + Number(exponent);
  let digits = whole + fraction;
  if (point < 0) digits = "0".repeat(-point) + digits;
  digits = digits.padEnd(Math.max(point, 0), "0");
  const cut = Math.max(point, 0);
  const afterPoint = digits.slice(cut).padEnd(places + 1, "0");
  const kept = (digits.slice(0, cut) || "0") + afterPoint.slice(0, places);
  const scaled = BigInt(kept) + BigInt(afterPoint[places] >= "5" ? 1 : 0);
  const padded = scaled.toString().padStart(places + 1, "0");
  const intPart = padded.slice(0, padded.length - places);
  const result = places > 0 ? `${intPart}.${padded.slice(-places)}` : intPart;
  return sign === "-" && scaled !== BigInt(0) ? `-${result}` : result;
}

function roundText(text: string, params: Params): string {
  const places = integerParam("round", params.value, 0, 20, 0);
  return roundDecimal(text, places) ?? text;
}

function defaultTo(input: unknown, params: Params): unknown {
  if (params.value === undefined) {
    throw new Error('default requires a value (e.g., default="n/a")');
  }
  return isTruthy(input) ? input : params.value;
}

export const TEXT_FILTERS: FilterDefinition[] = [
  textRow("upper", "upper", "Text in upper case", [], (text) => text.toUpperCase()),
  textRow("lower", "lower", "Text in lower case", [], (text) => text.toLowerCase()),
  textRow(
    "title",
    "title",
    "First letter of each whitespace-separated word in upper case, the rest in lower case",
    [],
    titleCase
  ),
  textRow(
    "replace",
    'replace:find="a",with="b"',
    "Every occurrence of the literal text find replaced by with (empty when omitted); find is required and never read as a pattern",
    ["find", "with"],
    replaceLiteral
  ),
  textRow(
    "indent",
    "indent[=N]",
    "N spaces (default 2, from 0 to 100) added at the start of every non-empty line; line breaks are kept",
    ["value"],
    indentLines
  ),
  textRow("quote", "quote", "Text as a JSON double-quoted string, with quotes, backslashes and control characters escaped", [], (text) =>
    JSON.stringify(text)
  ),
  textRow(
    "round",
    "round[=N]",
    "A number rounded half away from zero to exactly N decimal places (default 0, up to 20); anything that is not a finite number is left as it is",
    ["value"],
    roundText
  ),
  {
    name: "default",
    params: 'default="x"',
    description: "The given value when the input is missing, empty, 0, false, an empty list or an empty object; otherwise the input",
    paramNames: ["value"],
    apply: defaultTo,
  },
];
