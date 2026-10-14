export interface RenderOptions {
  strictMode?: boolean;
  limits?: {
    maxIterations?: number;
    maxOutputChars?: number;
    maxDepth?: number;
  };
  tokenEstimator?: (text: string) => number;
}

export interface Diagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

export interface RenderResult {
  ok: boolean;
  output: string;
  messages: unknown[];
  stats: {
    chars: number;
    estTokens: number;
    sectionsOmitted: number;
    iterations: number;
  };
  diagnostics: Diagnostic[];
}

/** Signature-only stub: render a template to a structured result. */
export function render(
  _template: string,
  _data: Record<string, unknown>,
  _options?: RenderOptions
): RenderResult {
  return {
    ok: false,
    output: "",
    messages: [],
    stats: { chars: 0, estTokens: 0, sectionsOmitted: 0, iterations: 0 },
    diagnostics: [],
  };
}

/** Signature-only stub: check a template without data. */
export function validate(_template: string): {
  ok: boolean;
  diagnostics: Diagnostic[];
} {
  return { ok: false, diagnostics: [] };
}
