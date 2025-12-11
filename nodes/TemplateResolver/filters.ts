import { FilterCall } from "./types";

/**
 * Parse filter string into FilterCall object
 *
 * Formats:
 * - Simple: "trim" â†’ { name: "trim", params: {} }
 * - Shorthand: "head=100" â†’ { name: "head", params: { value: "100" } }
 * - Named params: 'replace:find="old",with="new"' â†’ { name: "replace", params: { find: "old", with: "new" } }
 */
export function parseFilter(filterString: string): FilterCall {
  const trimmed = filterString.trim();

  // Simple filter (no params)
  if (!trimmed.includes("=") && !trimmed.includes(":")) {
    return { name: trimmed, params: {} };
  }

  // Shorthand single param: head=100
  if (trimmed.includes("=") && !trimmed.includes(":")) {
    const [name, value] = trimmed.split("=").map((s) => s.trim());
    return {
      name,
      params: { value: value.replace(/^["']|["']$/g, "") },
    };
  }

  // Named params: replace:find="old",with="new"
  const colonIdx = trimmed.indexOf(":");
  const name = trimmed.slice(0, colonIdx).trim();
  const paramsStr = trimmed.slice(colonIdx + 1);

  const params: Record<string, string> = {};

  // Parse comma-separated params (handle quoted commas)
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < paramsStr.length; i++) {
    const char = paramsStr[i];

    if ((char === '"' || char === "'") && paramsStr[i - 1] !== "\\") {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
    }

    if (char === "," && !inQuotes) {
      parseParam(current.trim(), params);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parseParam(current.trim(), params);
  }

  return { name, params };
}

/**
 * Parse single parameter: key="value" â†’ { key: "value" }
 */
function parseParam(param: string, params: Record<string, string>): void {
  const eqIdx = param.indexOf("=");
  if (eqIdx === -1) return;

  const key = param.slice(0, eqIdx).trim();
  let value = param.slice(eqIdx + 1).trim();

  // Remove quotes
  value = value.replace(/^["']|["']$/g, "");

  // Unescape quotes
  value = value.replace(/\\["']/g, (match) => match[1]);

  params[key] = value;
}

/**
 * Apply single filter to text
 */
export function applyFilter(text: string, filter: FilterCall): string {
  switch (filter.name) {
    case "head":
      return applyHeadFilter(text, filter.params);
    case "tail":
      return applyTailFilter(text, filter.params);
    case "trim":
      return text.trim();
    case "escape_md":
      return applyEscapeMdFilter(text);
    default:
      throw new Error(`Unknown filter: ${filter.name}`);
  }
}

/**
 * Apply head filter: take first N characters
 */
function applyHeadFilter(text: string, params: Record<string, string>): string {
  if (!params.value) {
    throw new Error("head filter requires parameter (e.g., head=100)");
  }

  const length = Number(params.value);
  if (isNaN(length)) {
    throw new Error(
      `Invalid head parameter: ${params.value} (must be a number)`
    );
  }

  if (length < 0) {
    // Negative: all but last N
    return text.slice(0, text.length + length);
  }

  return text.slice(0, length);
}

/**
 * Apply tail filter: take last N characters
 */
function applyTailFilter(text: string, params: Record<string, string>): string {
  if (!params.value) {
    throw new Error("tail filter requires parameter (e.g., tail=50)");
  }

  const length = Number(params.value);
  if (isNaN(length)) {
    throw new Error(
      `Invalid tail parameter: ${params.value} (must be a number)`
    );
  }

  if (length === 0) {
    return "";
  }

  if (length < 0) {
    // Negative: all but first N (skip first N characters)
    return text.slice(Math.abs(length));
  }

  // Positive: last N characters
  return text.slice(-length);
}

/**
 * Apply escape_md filter: escape markdown special characters
 */
function applyEscapeMdFilter(text: string): string {
  const specialChars = [
    "\\",
    "*",
    "_",
    "[",
    "]",
    "(",
    ")",
    "#",
    "`",
    ">",
    "~",
    "|",
  ];

  let result = text;

  // Escape backslash first to avoid double-escaping
  result = result.replace(/\\/g, "\\\\");

  // Then escape other characters
  for (const char of specialChars.slice(1)) {
    // Skip backslash (already done)
    result = result.replace(new RegExp(`\\${char}`, "g"), `\\${char}`);
  }

  return result;
}

/**
 * Apply chain of filters to text (left to right)
 */
export function applyFilters(text: string, filters: FilterCall[]): string {
  let result = text;

  for (const filter of filters) {
    result = applyFilter(result, filter);
  }

  return result;
}
