import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../git.mjs').AddedLine} AddedLine */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

export const STYLE_EXTENSIONS = Object.freeze(['.css', '.scss', '.sass', '.less', '.pcss']);
export const MARKUP_EXTENSIONS = Object.freeze(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);
export const DEFAULT_TOKEN_FILES = Object.freeze(['docs/living/ux/tokens/']);
/** A line holding this marker is skipped by every rule here. */
export const ALLOW_RAW_MARKER = 'aperture-allow-raw';
export const ALLOWED_TRANSITION_PROPERTIES = Object.freeze(['transform', 'translate', 'scale', 'rotate', 'opacity']);
export const FRONT_END_CSS_RULES = Object.freeze([
  'front-end-config-invalid',
  'front-end-raw-value',
  'front-end-transition-all',
  'front-end-transition-property',
  'front-end-reduced-motion-missing',
]);

const MOTION_PROPERTIES = ['transform', 'translate', 'scale', 'rotate', 'all'];
const TIMING_WORDS = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end', 'allow-discrete', 'normal']);
const TIME = /^[\d.]+m?s$/i;
const REDUCED_MOTION = /prefers-reduced-motion/;

const forward = (path) => path.replaceAll('\\', '/');
const isStyle = (path) => STYLE_EXTENSIONS.includes(extname(path).toLowerCase());
const isMarkup = (path) => MARKUP_EXTENSIONS.includes(extname(path).toLowerCase());
const isTestFile = (path) => {
  const parts = forward(path).split('/');
  const name = parts[parts.length - 1];
  return name.includes('.test.') || name.includes('.spec.') || parts.includes('__tests__');
};

/**
 * Whether a path is a token file: an entry ending in "/" matches every path under it, any other entry matches exactly.
 * @param {string} path
 * @param {readonly string[]} tokenFiles
 */
export function isTokenFile(path, tokenFiles) {
  const normal = forward(path);
  return tokenFiles.some((entry) => (entry.endsWith('/') ? normal.startsWith(entry) : normal === entry));
}

const isNonEmptyString = (value) => typeof value === 'string' && value !== '';
const invalid = (message) => ({ rule: 'front-end-config-invalid', message });

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth = Math.max(0, depth - 1);
    else if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * The transition declarations on one line, as the property each comma-separated segment names. An omitted property is
 * "all" (the CSS default); a segment that is only a var() is trusted and yields nothing.
 * @param {string} text
 * @returns {string[]}
 */
function transitionProperties(text) {
  const properties = [];
  for (const match of text.matchAll(/(?<![\w-])(transition|transition-property)\s*:\s*([^;}]*)/gi)) {
    // A Svelte directive (`transition:fade={{...}}`, `transition:fade|local`) or an object-form value (`transition: { ... }`)
    // names no CSS property.
    if (/^\s*(?:\{|[^\s;}]*[=|>])/.test(match[2])) continue;
    const bare = match[2].replace(/['"`]/g, '');
    for (const segment of splitTopLevel(bare)) {
      if (segment.trim() === '') continue;
      const tokens = segment
        .replace(/[\w-]+\([^)]*\)?/g, ' ')
        .split(/\s+/)
        .filter((token) => token !== '' && !TIME.test(token) && !TIMING_WORDS.has(token.toLowerCase()));
      if (tokens.length > 0) properties.push(tokens[0].toLowerCase());
      else if (!segment.includes('var(')) properties.push('all');
    }
  }
  return properties;
}

/** Raw colour and pixel values on one line, in order of appearance, each once. */
function rawValues(text) {
  const hits = [];
  const collect = (pattern, keep = () => true) => {
    for (const match of text.matchAll(pattern)) if (keep(match)) hits.push({ index: match.index, value: match[0] });
  };
  collect(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?!\w)/g);
  collect(/(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(([^)]*)\)?/g, (m) => /\d/.test(m[1]) && !m[1].includes('var('));
  collect(/(?<![\w.])-?\d*\.?\d+px(?!\w)/g, (m) => parseFloat(m[0]) !== 0);
  const seen = new Set();
  return hits
    .sort((a, b) => a.index - b.index)
    .map((hit) => hit.value)
    .filter((value) => !seen.has(value) && seen.add(value));
}

function readSetting(settings, key, problems) {
  const value = settings[key];
  if (value !== undefined && !isNonEmptyString(value)) problems.push(invalid(`gate.front_end.${key} must be a non-empty string. Fix it in .process/aperture.json.`));
  return value;
}

/** Whether a whole style file animates: keyframes, a live animation declaration, or a motion-property transition. */
function animates(text) {
  if (/@keyframes\b/.test(text)) return true;
  for (const match of text.matchAll(/(?<![\w-])animation(?:-name)?\s*:\s*([^;}]*)/gi)) {
    if (match[1].trim().toLowerCase() !== 'none') return true;
  }
  return transitionProperties(text).some((property) => MOTION_PROPERTIES.includes(property));
}

const readText = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};

/**
 * Judges the lines a change added to front-end files (raw colour and pixel values, `transition: all`, transitions of
 * layout properties) and the changed style files as wholes (a reduced-motion query wherever animation exists). The
 * rules are line-based on purpose; a multi-line transition is judged on the line that holds the property name.
 * @param {{ projectDir: string, changes: Change[], addedLines: AddedLine[], settings: Record<string, unknown> }} input
 * @returns {Finding[]}
 */
export function checkFrontEndCss({ projectDir, changes, addedLines, settings }) {
  const problems = [];
  const tokenFiles = settings.token_files === undefined ? DEFAULT_TOKEN_FILES : settings.token_files;
  if (!Array.isArray(tokenFiles) || !tokenFiles.every(isNonEmptyString)) {
    problems.push(invalid('gate.front_end.token_files must be a list of non-empty path strings (an entry ending in "/" is a folder). Fix it in .process/aperture.json.'));
  }
  const reset = readSetting(settings, 'motion_reset', problems);
  if (problems.length > 0) return problems;

  const judged = (path) => (isStyle(path) || isMarkup(path)) && !isTestFile(path) && !isTokenFile(path, tokenFiles);
  const findings = [];
  for (const { path, line, text } of addedLines ?? []) {
    if (!judged(path) || typeof text !== 'string' || text.includes(ALLOW_RAW_MARKER)) continue;
    const where = `${path} line ${line}`;
    const selector = isStyle(path) && text.trimEnd().endsWith('{');
    const query = text.includes('@media') || text.includes('@container');
    if (!selector && !query) {
      const values = rawValues(text);
      if (values.length > 0) {
        findings.push({
          rule: 'front-end-raw-value',
          message: `${where} holds raw value${values.length > 1 ? 's' : ''} ${values.join(', ')}. Use a token from a token file, or end the line with ${ALLOW_RAW_MARKER} if the value is deliberate.`,
          path,
        });
      }
    }
    const properties = transitionProperties(text);
    if (properties.includes('all') || (isMarkup(path) && /(?<![\w-])transition-all(?![\w-])/.test(text))) {
      findings.push({
        rule: 'front-end-transition-all',
        message: `${where} transitions "all". Name the properties and animate only transform and opacity, or end the line with ${ALLOW_RAW_MARKER} if it is deliberate.`,
        path,
      });
    }
    const others = [...new Set(properties.filter((p) => p !== 'all' && p !== 'none' && !ALLOWED_TRANSITION_PROPERTIES.includes(p)))];
    if (others.length > 0) {
      findings.push({
        rule: 'front-end-transition-property',
        message: `${where} transitions ${others.join(', ')}. Animate only ${ALLOWED_TRANSITION_PROPERTIES.join(', ')}, or end the line with ${ALLOW_RAW_MARKER} if it is deliberate.`,
        path,
      });
    }
  }

  let resetState = null;
  if (reset !== undefined) {
    const text = readText(resolveProjectPath(resolveProjectRoots(projectDir), reset));
    resetState = text === null ? 'missing' : REDUCED_MOTION.test(text) ? 'covers' : 'bare';
  }
  for (const { status, path } of changes ?? []) {
    if (status === 'D' || !isStyle(path) || !judged(path)) continue;
    const text = readText(resolveProjectPath(resolveProjectRoots(projectDir), path));
    if (text === null || !animates(text) || REDUCED_MOTION.test(text) || resetState === 'covers') continue;
    const reason =
      resetState === 'missing'
        ? ` The configured motion_reset file ${reset} is missing.`
        : resetState === 'bare'
          ? ` The configured motion_reset file ${reset} has no prefers-reduced-motion query either.`
          : '';
    findings.push({
      rule: 'front-end-reduced-motion-missing',
      message: `${path} animates but holds no prefers-reduced-motion query.${reason} Add a @media (prefers-reduced-motion: reduce) block that stops or shortens the motion, or point gate.front_end.motion_reset at a stylesheet that holds one.`,
      path,
    });
  }
  return findings;
}
