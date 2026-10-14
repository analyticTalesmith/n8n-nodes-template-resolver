export interface Spec {
  version: string;
  blocks: { name: string; closes?: string; args: string; description: string }[];
  filters: { name: string; params: string; description: string }[];
  operators: string[];
  limits: { maxIterations: number; maxOutputChars: number; maxDepth: number };
  syntax: { variable: string; comment: string };
}

/** Signature-only stub: describe the template language. */
export function spec(): Spec {
  return {
    version: "",
    blocks: [],
    filters: [],
    operators: [],
    limits: { maxIterations: 0, maxOutputChars: 0, maxDepth: 0 },
    syntax: { variable: "", comment: "" },
  };
}
