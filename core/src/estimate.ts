/**
 * Estimated token count of a text: one token per four characters, rounded up.
 * An estimate, roughly +/-30 percent for English prose.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
