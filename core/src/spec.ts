import { DEFAULT_LIMITS, Limits } from "./types";
import { listFilters } from "./filters";

export interface Spec {
  version: string;
  blocks: { name: string; closes?: string; args: string; description: string }[];
  filters: { name: string; params: string; description: string }[];
  operators: string[];
  limits: Limits;
  options: { name: string; default: string; description: string }[];
  syntax: { variable: string; comment: string; trim: string; escape: string };
}

const LANGUAGE_VERSION = "1.0";

const BLOCKS: Spec["blocks"] = [
  {
    name: "IF",
    closes: "END_IF",
    args: "condition",
    description: "Renders its body when the condition is true",
  },
  {
    name: "ELSEIF",
    args: "condition",
    description: "Inside IF: renders when earlier conditions were false and this one is true",
  },
  {
    name: "ELSE",
    args: "",
    description:
      "Inside IF: renders when every condition was false. Directly inside FOR: starts the empty branch, which renders when the loop renders no item",
  },
  {
    name: "CASE",
    closes: "END_CASE",
    args: "variable",
    description: "Renders the first WHEN that matches the variable, else DEFAULT",
  },
  {
    name: "WHEN",
    closes: "END_WHEN",
    args: 'value[, value...] | variable | operator value',
    description:
      'Inside CASE: renders when the CASE variable equals any value in a list ("a", "b"), equals another variable, or passes a comparison (== != > < >= <=) such as >= 10',
  },
  {
    name: "DEFAULT",
    closes: "END_DEFAULT",
    args: "",
    description: "Inside CASE: renders when no WHEN matched",
  },
  {
    name: "FOR",
    closes: "END_FOR",
    args: "array AS item [limit=N] [offset=N]",
    description:
      "Renders its body once per array element, with @index0, @index1, @first, @last, @notFirst, @notLast and @total (the number of items rendered). limit=N renders at most N items and offset=N skips the first N; each is a whole number or a variable path. {{ELSE}} inside the loop starts a branch that renders when no item does",
  },
  {
    name: "LIST",
    closes: "END_LIST",
    args: "",
    description:
      "A numbered list of LIST_ITEM entries; lists nest. FOR and IF (with ELSEIF and ELSE) inside it build items, numbered in one sequence",
  },
  {
    name: "LIST_ITEM",
    closes: "END_LIST_ITEM",
    args: '[condition] [| fallback="text"]',
    description:
      "Inside LIST: one numbered item, skipped or replaced by its fallback when the condition is false. Without END_LIST_ITEM it ends at the next item, END_LIST, END_FOR, ELSE, ELSEIF or END_IF",
  },
  {
    name: "TABLE",
    closes: "END_TABLE",
    args: '[align="left|center|right"]',
    description:
      "A markdown table of an optional HEADER and rows; ROW, FOR and IF (with ELSEIF and ELSE) build the rows, and align takes one alignment per column",
  },
  {
    name: "HEADER",
    closes: "END_HEADER",
    args: "",
    description: "Inside TABLE: header cells separated by |",
  },
  {
    name: "ROW",
    closes: "END_ROW",
    args: "",
    description:
      "Inside TABLE, or a FOR or IF that builds rows: row cells separated by |. Without END_ROW it ends at the next ROW, END_TABLE, END_FOR, ELSE, ELSEIF or END_IF",
  },
  {
    name: "SECTION",
    closes: "END_SECTION",
    args: '"Title" | path [level=1-6] [skip_empty=true|false]',
    description:
      "A markdown heading at level (default 2, clamped to 1-6), a blank line and the body with its leading and trailing blank lines trimmed; omitted entirely when the body renders empty, unless skip_empty=false keeps the heading",
  },
  {
    name: "FENCE",
    closes: "END_FENCE",
    args: '[lang="language" | lang=path]',
    description:
      "A code fence of at least three backticks, longer than any backtick run in the rendered body, with the optional language; one leading and one trailing line break of the body are removed",
  },
  {
    name: "SET",
    args: "name = expression",
    description:
      "Binds a local for the rest of its block: the value of a path, arithmetic, a quoted text, number, true, false or null, with ?? default and | filters, kept as it is (an array stays an array). A single tag with no closer; it prints nothing",
  },
  {
    name: "RAW",
    closes: "END_RAW",
    args: "",
    description:
      "Outputs its content literally: tags, variables and comments inside are not interpreted",
  },
];

const OPTIONS: Spec["options"] = [
  {
    name: "standaloneLines",
    default: "true for render, false for resolveTemplate",
    description:
      "Removes a line holding only block tags and whitespace, with its line break; LIST, TABLE and their parts keep their own spacing",
  },
];

const OPERATORS = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "contains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
  "isArray",
  "isNumber",
  "isObject",
  "isBoolean",
  "AND",
  "OR",
  "NOT",
  "in",
  "not in",
  "between",
  ".length",
];

/**
 * The template language: blocks, filters, condition operators, default
 * limits and syntax
 */
export function spec(): Spec {
  return {
    version: LANGUAGE_VERSION,
    blocks: BLOCKS.map((b) => ({ ...b })),
    filters: listFilters(),
    operators: [...OPERATORS],
    limits: { ...DEFAULT_LIMITS },
    options: OPTIONS.map((o) => ({ ...o })),
    syntax: {
      variable: "${{path.to.value ?? \"default\" | filter=arg}}",
      comment: "{{# comment #}}",
      trim: "{{- TAG}} trims whitespace before a tag and {{TAG -}} after it; comments take {{-# comment #-}}",
      escape: "\\{{ outputs {{ literally",
    },
  };
}
