import { FilterDefinition } from "./types";

function neutral(): unknown {
  return null;
}

function stub(
  name: string,
  params: string,
  description: string,
  paramNames: string[]
): FilterDefinition {
  return { name, params, description, paramNames, apply: neutral };
}

export const COLLECTION_FILTERS: FilterDefinition[] = [
  stub("join", "join=SEP", "Items joined with SEP, each as the output step prints it", ["value"]),
  stub("length", "", "Items of a list, characters of a text, keys of an object", []),
  stub("first", "", "First item of a list, empty when there is none", []),
  stub("last", "", "Last item of a list, empty when there is none", []),
  stub("sort", "sort[=key]", "Stable sort: numbers, then strings, then the rest; sort=key orders objects by that key", ["value"]),
  stub("unique", "", "List with the first occurrence of each value, order kept", []),
  stub("slice", "slice[:start=N,end=N]", "Part of a list from start up to end; negative counts from the end", ["start", "end"]),
  stub("lines", "", "Text split on line breaks into a list", []),
  stub("json", "", "Compact JSON text with object keys in stable order", []),
];
