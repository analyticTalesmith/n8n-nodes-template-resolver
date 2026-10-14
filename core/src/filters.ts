import { FilterCall } from "./types";
import { UnknownFilterError } from "./errors";

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
 * Every filter applyFilter accepts
 */
export const FILTERS: { name: string; params: string; description: string }[] =
  [
    {
      name: "head",
      params: "head=N",
      description:
        "First N characters; a negative N drops the last |N| characters",
    },
    {
      name: "tail",
      params: "tail=N",
      description:
        "Last N characters; a negative N drops the first |N| characters",
    },
    {
      name: "trim",
      params: "",
      description: "Leading and trailing whitespace removed",
    },
    {
      name: "escape_md",
      params: "escape_md[=inline|block]",
      description:
        "Markdown special characters escaped with a backslash (inline, the default); block also escapes line starts that would read as structure: headings, quotes, list markers, tables, rules and fences",
    },
    {
      name: "fence",
      params: "fence[=lang]",
      description:
        "The value in a code fence of at least three backticks, longer than any backtick run inside it, with the optional language; one leading and one trailing line break of the value are removed",
    },
    {
      name: "heading_offset",
      params: "heading_offset=N",
      description:
        "Markdown ATX headings shifted by N levels (negative N shifts up), clamped to 1-6; headings inside fenced code are untouched",
    },
  ];

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
      return applyEscapeMdFilter(text, filter.params);
    case "fence":
      return fenced(text, filter.params.value ?? "");
    case "heading_offset":
      return applyHeadingOffsetFilter(text, filter.params);
    default:
      throw new UnknownFilterError(
        filter.name,
        1,
        1,
        FILTERS.map((f) => f.name)
      );
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
 * Apply escape_md filter: inline escaping by default, block mode adds
 * line-start escaping
 */
function applyEscapeMdFilter(
  text: string,
  params: Record<string, string>
): string {
  const mode = params.value ?? "inline";
  if (mode === "inline") return escapeInline(text);
  if (mode === "block") {
    return escapeInline(text).split("\n").map(escapeLineStart).join("\n");
  }
  throw new Error(
    `Invalid escape_md mode: ${mode} (must be inline or block)`
  );
}

/**
 * Backslash before a line start that inline escaping leaves able to read as
 * structure: a list marker, an ordered list number or a setext underline.
 * Digits cannot be escaped, so an ordered list escapes the dot after them.
 */
function escapeLineStart(line: string): string {
  return line
    .replace(/^([ \t]*)([-+]|={3,}[ \t]*\r?$)/, "$1\\$2")
    .replace(/^([ \t]*\d+)\./, "$1\\.");
}

/**
 * Wrap text in a code fence of at least three backticks, longer than any
 * backtick run in it, after removing one leading and one trailing line break
 */
export function fenced(text: string, lang: string): string {
  checkFenceLang(lang);
  const body = text.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
  let longestRun = 0;
  for (const run of body.matchAll(/`+/g)) {
    longestRun = Math.max(longestRun, run[0].length);
  }
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${lang}\n${body}\n${fence}\n`;
}

/**
 * Reject a fence language that would break the opening fence line: a line
 * break ends it and a backtick makes it no longer a fence
 */
export function checkFenceLang(lang: string): void {
  if (/[\r\n`]/.test(lang)) {
    throw new Error(
      `Fence lang must not contain a line break or a backtick, got ${JSON.stringify(lang)}`
    );
  }
}

/**
 * Apply heading_offset filter: shift ATX headings outside fenced code by N
 * levels, clamped to 1-6
 */
function applyHeadingOffsetFilter(
  text: string,
  params: Record<string, string>
): string {
  const value = params.value;
  if (value === undefined || !/^[+-]?\d+$/.test(value)) {
    throw new Error(
      `heading_offset requires an integer parameter (e.g., heading_offset=1), got ${value ?? "none"}`
    );
  }
  const offset = Number(value);
  let openFence: string | null = null;

  return text
    .split("\n")
    .map((line) => {
      const [, fence, info] = /^ {0,3}(`{3,}|~{3,})([^\n]*)/.exec(line) ?? [];
      if (openFence !== null) {
        const closes =
          fence !== undefined &&
          fence[0] === openFence[0] &&
          fence.length >= openFence.length &&
          info.trim() === "";
        if (closes) openFence = null;
        return line;
      }
      if (fence !== undefined && !(fence[0] === "`" && info.includes("`"))) {
        openFence = fence;
        return line;
      }
      return line.replace(/^(#{1,6}) /, (_, hashes: string) => {
        const level = Math.min(6, Math.max(1, hashes.length + offset));
        return `${"#".repeat(level)} `;
      });
    })
    .join("\n");
}

/**
 * Inline markdown escaping: a backslash before each markdown special character
 */
function escapeInline(text: string): string {
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
