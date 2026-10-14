export interface CliIo {
  readStdin(): Promise<string>;
  stdout(text: string): void;
  stderr(text: string): void;
  signal?: AbortSignal;
}

/** Signature-only stub: the real command line replaces it. */
export async function main(_argv: string[], _io: CliIo): Promise<number> {
  return 99;
}
