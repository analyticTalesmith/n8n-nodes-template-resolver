import { tryCoerceToArray, tryCoerceToString } from "./coercion";
import { FilterDefinition, TemplateValue } from "./types";

const MISSING = Symbol("missing");

/** A value as the output step prints it (the same rule as `valueToText` in filters.ts) */
function textOf(value: unknown): string {
  if (value == null) return "";
  return tryCoerceToString(value as TemplateValue) || "";
}

/** The input of a list filter: coerced as FOR coerces it; null is the empty list */
function toList(filter: string, input: unknown): unknown[] {
  const list = tryCoerceToArray(input as TemplateValue);
  if (list) return list;
  if (typeof input === "object" && input !== null) {
    throw new Error(`${filter} needs a list, got an object`);
  }
  return [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Compact JSON with object keys sorted by code unit at every depth. Walks with
 * an explicit stack so a deep nest cannot overflow the call stack, and tracks
 * only the current path so a shared, non-cyclic reference is fine.
 */
function stableJson(value: unknown): string {
  interface Frame {
    node: unknown[] | Record<string, unknown>;
    keys: string[] | null;
    size: number;
    next: number;
  }
  const parts: string[] = [];
  const path = new Set<object>();
  const stack: Frame[] = [];

  const enter = (v: unknown): void => {
    if (typeof v !== "object" || v === null) {
      parts.push(JSON.stringify(v) ?? "null");
      return;
    }
    if (path.has(v)) throw new Error("Cannot serialize a cyclic value");
    path.add(v);
    if (Array.isArray(v)) {
      parts.push("[");
      stack.push({ node: v, keys: null, size: v.length, next: 0 });
    } else {
      const keys = Object.keys(v).sort();
      parts.push("{");
      stack.push({ node: v as Record<string, unknown>, keys, size: keys.length, next: 0 });
    }
  };

  enter(value);
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.next === frame.size) {
      parts.push(frame.keys ? "}" : "]");
      path.delete(frame.node);
      stack.pop();
      continue;
    }
    if (frame.next > 0) parts.push(",");
    let child: unknown;
    if (frame.keys) {
      const key = frame.keys[frame.next];
      parts.push(JSON.stringify(key) + ":");
      child = (frame.node as Record<string, unknown>)[key];
    } else {
      child = (frame.node as unknown[])[frame.next];
    }
    frame.next++;
    enter(child);
  }
  return parts.join("");
}

/** Numbers, then strings, then the rest, then what has no sort value at all */
function rank(v: unknown): number {
  if (v === MISSING) return 3;
  if (typeof v === "number") return 0;
  if (typeof v === "string") return 1;
  return 2;
}

function compare(a: unknown, b: unknown): number {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return (a as number) - (b as number);
  if (ra === 1) return (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0;
  return 0;
}

function toBound(name: string, text: string | undefined): number | undefined {
  if (text === undefined) return undefined;
  if (!/^[+-]?\d+$/.test(text)) {
    throw new Error(`slice ${name} must be a whole number, got "${text}"`);
  }
  return parseInt(text, 10);
}

export const COLLECTION_FILTERS: FilterDefinition[] = [
  {
    name: "join",
    params: "join=SEP",
    description: "Items joined with SEP, each as the output step prints it",
    paramNames: ["value"],
    apply(input, params) {
      const sep = params.value;
      if (sep === undefined) throw new Error("join needs a separator, as join=SEP");
      return toList("join", input).map(textOf).join(sep);
    },
  },
  {
    name: "length",
    params: "",
    description: "Items of a list, characters of a text, keys of an object",
    paramNames: [],
    apply(input) {
      if (input == null) return 0;
      if (typeof input === "string" || Array.isArray(input)) return input.length;
      if (typeof input === "object") return Object.keys(input).length;
      return String(input).length;
    },
  },
  {
    name: "first",
    params: "",
    description: "First item of a list, empty when there is none",
    paramNames: [],
    apply(input) {
      const list = toList("first", input);
      return list.length > 0 ? list[0] : null;
    },
  },
  {
    name: "last",
    params: "",
    description: "Last item of a list, empty when there is none",
    paramNames: [],
    apply(input) {
      const list = toList("last", input);
      return list.length > 0 ? list[list.length - 1] : null;
    },
  },
  {
    name: "sort",
    params: "sort[=key]",
    description:
      "Stable sort: numbers, then strings, then the rest; sort=key orders objects by that key",
    paramNames: ["value"],
    apply(input, params) {
      const key = params.value;
      const keyed = toList("sort", input).map((item) => ({
        item,
        by:
          key === undefined
            ? item
            : isPlainObject(item) && Object.prototype.hasOwnProperty.call(item, key)
              ? item[key]
              : MISSING,
      }));
      return keyed.sort((a, b) => compare(a.by, b.by)).map((entry) => entry.item);
    },
  },
  {
    name: "unique",
    params: "",
    description: "List with the first occurrence of each value, order kept",
    paramNames: [],
    apply(input) {
      const seen = new Set<string>();
      return toList("unique", input).filter((item) => {
        const id = typeof item + ":" + (typeof item === "object" ? stableJson(item) : String(item));
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },
  },
  {
    name: "slice",
    params: "slice[:start=N,end=N]",
    description: "Part of a list from start up to end; negative counts from the end",
    paramNames: ["start", "end"],
    apply(input, params) {
      return toList("slice", input).slice(toBound("start", params.start), toBound("end", params.end));
    },
  },
  {
    name: "lines",
    params: "",
    description: "Text split on line breaks into a list",
    paramNames: [],
    apply(input) {
      const text = textOf(input);
      if (text === "") return [];
      const items = text.split(/\r\n|\r|\n/);
      if (items[items.length - 1] === "") items.pop();
      return items;
    },
  },
  {
    name: "json",
    params: "",
    description: "Compact JSON text with object keys in stable order",
    paramNames: [],
    apply: (input) => stableJson(input),
  },
];
