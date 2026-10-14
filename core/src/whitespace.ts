import { Token, TokenType, WhitespaceOptions } from "./types";

/** Tags whose own line vanishes under the standalone rule */
const STANDALONE_TAGS = new Set<TokenType>([
  TokenType.IF,
  TokenType.ELSEIF,
  TokenType.ELSE,
  TokenType.END_IF,
  TokenType.CASE,
  TokenType.WHEN,
  TokenType.END_WHEN,
  TokenType.DEFAULT,
  TokenType.END_DEFAULT,
  TokenType.END_CASE,
  TokenType.FOR,
  TokenType.END_FOR,
  TokenType.SECTION,
  TokenType.END_SECTION,
  TokenType.FENCE,
  TokenType.END_FENCE,
  TokenType.RAW,
  TokenType.END_RAW,
  TokenType.COMMENT,
]);

const isText = (token: Token | undefined) => token?.type === TokenType.TEXT;
const isBlank = (token: Token) => isText(token) && /^[ \t]*$/.test(token.value);
/** The lexer emits RAW content as one text token right after the RAW tag */
const isRawContent = (tokens: Token[], index: number) =>
  isText(tokens[index]) && tokens[index - 1]?.type === TokenType.RAW;

/**
 * Apply trim markers, then (when standaloneLines is on) remove the lines that
 * hold only block tags and whitespace. Text tokens left empty are dropped.
 */
export function applyWhitespace(tokens: Token[], options: WhitespaceOptions): Token[] {
  const result = tokens.map((t) => ({ ...t }));
  applyTrimMarkers(result);
  if (options.standaloneLines) removeStandaloneLines(result);
  return result.filter((t) => !(isText(t) && t.value === ""));
}

function applyTrimMarkers(tokens: Token[]): void {
  tokens.forEach((token, i) => {
    const before = tokens[i - 1];
    const after = tokens[i + 1];
    if (token.trimBefore && isText(before)) before.value = before.value.replace(/[ \t\n]+$/, "");
    if (token.trimAfter && isText(after)) after.value = after.value.replace(/^[ \t\n]+/, "");
  });
}

/**
 * Find each run of standalone tags sharing one line (separated only by
 * spaces and tabs), decide on the unchanged text whether that line holds
 * nothing else, then cut the line's indentation, the whitespace between the
 * tags and the line break after them. RAW content is literal: only a line
 * break right after the RAW tag can go.
 */
function removeStandaloneLines(tokens: Token[]): void {
  const cuts = new Map<Token, { start: number; end: number }>();
  const cut = (token: Token) => {
    let c = cuts.get(token);
    if (!c) {
      c = { start: 0, end: token.value.length };
      cuts.set(token, c);
    }
    return c;
  };

  let i = 0;
  while (i < tokens.length) {
    if (!STANDALONE_TAGS.has(tokens[i].type)) {
      i++;
      continue;
    }
    const first = i;
    let last = i;
    let j = i + 1;
    while (j < tokens.length) {
      if (STANDALONE_TAGS.has(tokens[j].type)) last = j;
      else if (!isBlank(tokens[j]) || isRawContent(tokens, j)) break;
      j++;
    }

    const lineStart = indentationStart(tokens, first);
    const lineEnd = lineBreakEnd(tokens, last);
    if (lineStart !== null && lineEnd !== null) {
      if (first > 0) cut(tokens[first - 1]).end = lineStart;
      for (let k = first + 1; k < last; k++) {
        if (isText(tokens[k])) cut(tokens[k]).end = 0;
      }
      if (last + 1 < tokens.length) cut(tokens[last + 1]).start = lineEnd;
    }
    i = last + 1;
  }

  for (const [token, { start, end }] of cuts) {
    token.value = token.value.slice(start, Math.max(start, end));
  }
}

/**
 * Where the indentation before the tag at index starts in the preceding
 * text, or null when the line holds something else before the tag
 */
function indentationStart(tokens: Token[], index: number): number | null {
  if (index === 0) return 0;
  const before = tokens[index - 1];
  if (!isText(before)) return null;
  if (isRawContent(tokens, index - 1)) {
    return before.value.endsWith("\n") ? before.value.length : null;
  }
  const match = /(^|\n)[ \t]*$/.exec(before.value);
  if (!match) return null;
  if (match[1] === "" && index - 1 > 0) return null;
  return match.index + match[1].length;
}

/**
 * Where the text after the tag at index continues past the line break, or
 * null when the line holds something else after the tag
 */
function lineBreakEnd(tokens: Token[], index: number): number | null {
  const after = tokens[index + 1];
  if (!after || after.type === TokenType.EOF) return 0;
  if (!isText(after)) return null;
  if (isRawContent(tokens, index + 1)) return after.value.startsWith("\n") ? 1 : null;
  const match = /^[ \t]*(\n|$)/.exec(after.value);
  if (!match) return null;
  if (match[1] === "" && tokens[index + 2]?.type !== TokenType.EOF) return null;
  return match[0].length;
}
