/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateValue } from "./types";

/**
 * Attempts to coerce a value to a number.
 * Returns null if coercion is impossible or ambiguous.
 *
 * Rules:
 * - Numbers pass through
 * - String numbers: "42" â†’ 42, "3.14" â†’ 3.14
 * - Booleans: true â†’ 1, false â†’ 0
 * - Trims whitespace before parsing
 * - Fails gracefully on non-numeric strings, arrays, objects
 */
export function tryCoerceToNumber(value: TemplateValue): number | null {
  if (value == null) return null;

  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    const parsed = Number(trimmed);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Attempts to coerce a value to an array.
 * Returns null if coercion is impossible.
 *
 * Rules:
 * - Native arrays pass through
 * - JSON array strings (with trailing/leading comma tolerance)
 * - Comma-separated strings: "a,b,c" â†’ ["a","b","c"]
 * - Single values â†’ single-item arrays: 42 â†’ [42]
 * - Objects fail (ambiguous - keys? values? entries?)
 */
export function tryCoerceToArray(value: TemplateValue): any[] | null {
  // Already an array
  if (Array.isArray(value)) return value;

  // Null/undefined
  if (value == null) return null;

  // Try parsing as JSON array string
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Must start with [ for JSON array
    if (trimmed.startsWith("[")) {
      // Check if properly closed
      if (!trimmed.endsWith("]")) {
        // Malformed JSON - try comma-separated fallback
        return tryCommaSeparated(value);
      }

      // Fix trailing/leading commas before parsing
      const fixed = trimmed
        .replace(/,\s*\]/g, "]") // Remove trailing commas before ]
        .replace(/\[\s*,/g, "["); // Remove leading commas after [

      try {
        const parsed = JSON.parse(fixed);
        if (Array.isArray(parsed)) return parsed;
        return null; // Parsed but not an array
      } catch {
        // Invalid JSON - try comma-separated fallback
        return tryCommaSeparated(value);
      }
    }

    // Must start with { for JSON object - reject immediately
    if (trimmed.startsWith("{")) {
      return null;
    }

    // Try comma-separated (no brackets)
    return tryCommaSeparated(value);
  }

  // Objects cannot be coerced (text-based constraint)
  if (typeof value === "object") return null;

  // Single value â†’ single-item array
  return [value];
}

/**
 * Try parsing as comma-separated string, even if brackets are malformed
 */
function tryCommaSeparated(value: string): string[] | null {
  let content = value.trim();

  // Strip outer brackets { } or [ ] if present (even mismatched)
  if (
    (content.startsWith("[") || content.startsWith("{")) &&
    (content.endsWith("]") || content.endsWith("}"))
  ) {
    content = content.slice(1, -1).trim();
  } else if (content.startsWith("[") || content.startsWith("{")) {
    content = content.slice(1).trim();
  } else if (content.endsWith("]") || content.endsWith("}")) {
    content = content.slice(0, -1).trim();
  }

  // Fast path: no commas â†’ return single item
  if (!content.includes(",")) {
    return content ? [content] : null;
  }

  // --- CSV-style parser supporting quoted commas ---
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      // Toggle quoted state (basic CSV)
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      // Commit token
      if (current.trim() !== "") {
        result.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  // Add final token
  if (current.trim() !== "") {
    result.push(current.trim());
  }

  return result.length > 0 ? result : null;
}

/**
 * Attempts to coerce a value to an object.
 * Returns null if coercion is impossible.
 *
 * Rules:
 * - Native objects pass through
 * - JSON object strings (with trailing/leading comma tolerance)
 * - Arrays fail
 * - Primitives fail
 */
export function tryCoerceToObject(
  value: TemplateValue
): Record<string, any> | null {
  if (value == null) return null;

  // Native objects (but not arrays)
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  // Try JSON parsing for strings
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        // Fix malformed JSON with leading/trailing commas
        const fixed = trimmed
          .replace(/\{,+/g, "{") // Remove leading commas after {
          .replace(/,+\}/g, "}") // Remove trailing commas before }
          .replace(/\[,+/g, "[") // Remove leading commas after [
          .replace(/,+\]/g, "]") // Remove trailing commas before ]
          .replace(/,+/g, ","); // Normalize multiple commas

        const parsed = JSON.parse(fixed);
        if (typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
        return null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Attempts to coerce a value to a boolean.
 * Returns null for ambiguous values (lets truthiness handle them).
 *
 * Rules:
 * - Native booleans pass through
 * - Case-insensitive boolean strings: "true", "false"
 * - Yes/no strings: "yes" â†’ true, "no" â†’ false
 * - 1/0 as numbers or strings: 1 â†’ true, 0 â†’ false
 * - Ambiguous values return null (2, -1, "maybe", [], {})
 */
export function tryCoerceToBoolean(value: TemplateValue): boolean | null {
  if (value == null) return null;

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null; // Ambiguous (2, -1, 3.14, NaN)
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === "true" || trimmed === "yes" || trimmed === "1") {
      return true;
    }

    if (trimmed === "false" || trimmed === "no" || trimmed === "0") {
      return false;
    }

    return null; // Ambiguous ("maybe", "2", "")
  }

  // Arrays, objects â†’ ambiguous
  return null;
}

/**
 * Converts a value to a string for string operations.
 * Returns null if conversion is impossible.
 *
 * Rules:
 * - Strings pass through
 * - Primitives: 42 â†’ "42", true â†’ "true"
 * - Arrays/objects: JSON.stringify()
 * - Null/undefined â†’ null
 */
export function tryCoerceToString(value: TemplateValue): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return null;
}
