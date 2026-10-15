import { readFileSync } from 'node:fs';
import { PROCESS_DIR, TOKENS_DIR } from '../layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';
import { isPlainObject } from '../types.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {[number, number, number]} Rgb sRGB channels in 0..1 */
/** @typedef {{ text: string, background: string, kind: 'text' | 'large-text' | 'ui' }} ContrastPair */

/** WCAG 2.2 success criteria 1.4.3 (text, large text) and 1.4.11 (non-text); AA is the floor. */
export const CONTRAST_MINIMUMS = Object.freeze({ text: 4.5, 'large-text': 3, ui: 3 });
export const DEFAULT_TOKENS_PATH = `${TOKENS_DIR}/design-tokens.json`;
export const DEFAULT_PAIRS_PATH = `${TOKENS_DIR}/contrast-pairs.json`;
export const CONTRAST_RULES = Object.freeze(['contrast-tokens-unreadable', 'contrast-pairs-missing', 'contrast-token-invalid', 'contrast-too-low']);

const MAX_ALIAS_DEPTH = 10;
const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

const linear = (channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const encode = (channel) => (channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055);
const clip = (value) => Math.min(1, Math.max(0, value));
const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/**
 * The WCAG 2 contrast ratio of two colours, lighter over darker.
 * @param {Rgb} a
 * @param {Rgb} b
 */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hslToRgb([h, s, l]) {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)].map(clip);
}

/** OKLCH to sRGB through OKLab (Ottosson's published matrices); each linear channel is clipped to the gamut. */
function oklchToRgb([lightness, chroma, hue]) {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => encode(clip(v)));
}

/** @returns {{ rgb: Rgb } | { problem: string }} */
function colorOf(value) {
  if (typeof value === 'string') {
    const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value);
    if (hex === null) return { problem: `has the value ${JSON.stringify(value)}, which is not a hex colour, an alias or a colour object` };
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    return { rgb: /** @type {Rgb} */ ([0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255)) };
  }
  if (!isPlainObject(value)) return { problem: 'has a $value that is not a hex colour, an alias or a colour object' };
  if (value.alpha !== undefined && !(typeof value.alpha === 'number' && value.alpha >= 1)) {
    return { problem: `has alpha ${JSON.stringify(value.alpha)}; contrast cannot be judged on a translucent colour, so use an opaque token` };
  }
  const { colorSpace, components } = value;
  if (!['srgb', 'oklch', 'hsl'].includes(colorSpace)) return { problem: `has colour space ${JSON.stringify(colorSpace)}; only srgb, oklch and hsl are read` };
  if (!Array.isArray(components) || components.length !== 3 || !components.every((c) => typeof c === 'number' && Number.isFinite(c))) {
    return { problem: `has components that are not three numbers (colour space ${colorSpace})` };
  }
  if (colorSpace === 'srgb') return { rgb: /** @type {Rgb} */ (components.map(clip)) };
  if (colorSpace === 'hsl') return { rgb: /** @type {Rgb} */ (hslToRgb(components)) };
  return { rgb: /** @type {Rgb} */ (oklchToRgb(components)) };
}

/**
 * Resolves the token at a dot path in a W3C design-tokens object to an sRGB colour, following aliases ("{a.b}") and
 * inherited group types.
 * @param {unknown} tokens
 * @param {string} path
 * @returns {{ rgb: Rgb } | { problem: string }}
 */
export function resolveColor(tokens, path) {
  const seen = [];
  let current = path;
  for (;;) {
    if (seen.includes(current)) return { problem: `is an alias that loops back (${[...seen, current].join(' -> ')})` };
    if (seen.length > MAX_ALIAS_DEPTH) return { problem: `is an alias chain deeper than ${MAX_ALIAS_DEPTH}` };
    seen.push(current);
    let node = tokens;
    let type;
    for (const key of current.split('.')) {
      if (!isPlainObject(node) || !Object.hasOwn(node, key)) return { problem: seen.length > 1 ? `is an alias to "${current}", which does not exist` : 'does not exist in the tokens file' };
      if (typeof node.$type === 'string') type = node.$type;
      node = node[key];
    }
    if (!isPlainObject(node) || !('$value' in node)) return { problem: seen.length > 1 ? `is an alias to "${current}", which is a group, not a token` : 'is a group or has no $value, so it is not a token' };
    if (typeof node.$type === 'string') type = node.$type;
    if (type !== undefined && type !== 'color') return { problem: `has $type "${type}", not "color"` };
    const alias = typeof node.$value === 'string' ? /^\{([^{}]+)\}$/.exec(node.$value) : null;
    if (alias !== null) {
      current = alias[1];
      continue;
    }
    return colorOf(node.$value);
  }
}

function readJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (err) {
    return { error: err.code === 'ENOENT' ? 'does not exist' : err instanceof SyntaxError ? 'is not valid JSON' : `cannot be read (${err.message})` };
  }
}

const floor2 = (n) => (Math.floor(n * 100) / 100).toFixed(2);

/**
 * Checks each declared token pair against its WCAG 2 AA minimum. Reads the tokens and pairs files under projectDir.
 * @param {{ projectDir: string, settings: Record<string, unknown> }} input
 * @returns {Finding[]}
 */
export function checkContrast({ projectDir, settings }) {
  const problems = [];
  for (const key of ['tokens', 'contrast_pairs']) {
    if (settings[key] !== undefined && !isNonEmptyString(settings[key])) {
      problems.push({ rule: 'front-end-config-invalid', message: `gate.front_end.${key} must be a non-empty path string. Fix it in ${PROCESS_DIR}/aperture.json.` });
    }
  }
  if (problems.length > 0) return problems;

  const tokensPath = /** @type {string} */ (settings.tokens ?? DEFAULT_TOKENS_PATH);
  const pairsPath = /** @type {string} */ (settings.contrast_pairs ?? DEFAULT_PAIRS_PATH);
  const roots = resolveProjectRoots(projectDir);
  const tokens = readJson(resolveProjectPath(roots, tokensPath));
  if ('error' in tokens || !isPlainObject(tokens.value)) {
    const why = 'error' in tokens ? tokens.error : 'is not a JSON object';
    return [
      {
        rule: 'contrast-tokens-unreadable',
        message: `${tokensPath} ${why}. Export W3C design tokens (DTCG) there: Prism with packageFiles ["dtcg"], or the DESIGN.md export command; or set gate.front_end.tokens to where they are.`,
        path: tokensPath,
      },
    ];
  }
  const pairs = readJson(resolveProjectPath(roots, pairsPath));
  if ('error' in pairs && pairs.error === 'does not exist') return [missingPairs(pairsPath)];
  if ('error' in pairs) return [{ rule: 'front-end-config-invalid', message: `${pairsPath} ${pairs.error}. Fix it: a JSON list of { "text", "background", "kind" } token pairs.`, path: pairsPath }];
  if (!Array.isArray(pairs.value)) return [{ rule: 'front-end-config-invalid', message: `${pairsPath} must be a JSON list of { "text", "background", "kind" } token pairs.`, path: pairsPath }];
  if (pairs.value.length === 0) return [missingPairs(pairsPath)];

  const findings = [];
  pairs.value.forEach((pair, index) => {
    const ok = isPlainObject(pair) && isNonEmptyString(pair.text) && isNonEmptyString(pair.background) && Object.hasOwn(CONTRAST_MINIMUMS, pair.kind);
    if (!ok) {
      findings.push({
        rule: 'front-end-config-invalid',
        message: `${pairsPath} entry ${index + 1} must be { "text": "<token path>", "background": "<token path>", "kind": "${Object.keys(CONTRAST_MINIMUMS).join('" | "')}" }. Fix the entry.`,
        path: pairsPath,
      });
      return;
    }
    const resolved = [pair.text, pair.background].map((path) => ({ path, ...resolveColor(tokens.value, path) }));
    const broken = resolved.filter((r) => 'problem' in r);
    for (const r of broken) {
      findings.push({ rule: 'contrast-token-invalid', message: `Token "${r.path}" in ${pairsPath} ${r.problem}. Fix the token or the pair so contrast can be checked.`, path: tokensPath });
    }
    if (broken.length > 0) return;
    const ratio = contrastRatio(resolved[0].rgb, resolved[1].rgb);
    const minimum = CONTRAST_MINIMUMS[pair.kind];
    if (ratio < minimum) {
      findings.push({
        rule: 'contrast-too-low',
        message: `"${pair.text}" on "${pair.background}" has contrast ${floor2(ratio)}:1, below the ${minimum}:1 minimum for kind ${pair.kind} (WCAG 2 AA). Change one of the two tokens.`,
        path: tokensPath,
      });
    }
  });
  return findings;
}

const missingPairs = (path) => ({
  rule: 'contrast-pairs-missing',
  message: `${path} declares no token pairs, so no contrast is checked. List each text and background token pair as { "text", "background", "kind" } there, or set gate.front_end.contrast_pairs.`,
  path,
});
