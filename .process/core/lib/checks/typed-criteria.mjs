/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ line: number, type: 'contract' | 'constraint', id: string, kind: string | null, text: string }} RequirementLine */
/** @typedef {{ rule: string, message: string, line: number }} LineFinding */

export const REQUIREMENT_TYPES = Object.freeze(['contract', 'constraint']);
export const CONSTRAINT_KINDS = Object.freeze(['must', 'must-not', 'evidence-required', 'human-decides', 'open-ended']);
export const REQUIREMENT_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const MUST_HAVES = /^must-haves$/i;
const TOP_LEVEL_ITEM = /^(?:[-*]|\d+\.)\s+(.*)$/;
const TYPE = /^`(contract|constraint)`/;
const ID = /^\s*`([^`]*)`/;
const KIND = /^\s*([A-Za-z-]+)\s*:/;

/**
 * The visible text of each line with HTML comments removed, tracking comments that span lines.
 * @param {string} text
 * @returns {string[]}
 */
function visibleLines(text) {
  let inComment = false;
  return text.split(/\r?\n/).map((line) => {
    let visible = '';
    let rest = line;
    while (rest.length > 0) {
      if (inComment) {
        const end = rest.indexOf('-->');
        if (end === -1) break;
        rest = rest.slice(end + 3);
        inComment = false;
      } else {
        const start = rest.indexOf('<!--');
        if (start === -1) {
          visible += rest;
          break;
        }
        visible += rest.slice(0, start);
        rest = rest.slice(start + 4);
        inComment = true;
      }
    }
    return visible;
  });
}

/**
 * The top-level list items under the `## Must-haves` heading, each with its 1-based line number in the original text.
 * @param {string} text
 * @returns {Array<{ line: number, body: string }>}
 */
function mustHaveItems(text) {
  const items = [];
  let inSection = false;
  let fenced = false;
  visibleLines(String(text ?? '')).forEach((line, i) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const heading = HEADING.exec(line);
    if (heading && heading[1].length <= 2) {
      inSection = heading[1].length === 2 && MUST_HAVES.test(heading[2]);
      return;
    }
    const item = inSection ? TOP_LEVEL_ITEM.exec(line) : null;
    if (item) items.push({ line: i + 1, body: item[1].trim() });
  });
  return items;
}

/**
 * Parses the top-level list items under `## Must-haves`. Fenced code and HTML comments are skipped and CRLF is accepted.
 * `lines` holds the well-formed items; `findings` holds one entry per problem, with the item's line number.
 * `kind` is null for a contract. Never throws.
 * @param {string} text
 * @returns {{ lines: RequirementLine[], findings: LineFinding[] }}
 */
export function parseRequirementLines(text) {
  /** @type {RequirementLine[]} */
  const lines = [];
  /** @type {LineFinding[]} */
  const findings = [];
  /** @type {Map<string, number>} */
  const seen = new Map();

  for (const { line, body } of mustHaveItems(text)) {
    const report = (rule, message) => findings.push({ rule, message, line });
    const typed = TYPE.exec(body);
    if (!typed) {
      report('typed-line-untyped', 'this item has no type. Start it with `contract` or `constraint`, then an id, for example "- `contract` `vf-01` text".');
      continue;
    }
    const type = /** @type {'contract' | 'constraint'} */ (typed[1]);
    let rest = body.slice(typed[0].length);

    const idMatch = ID.exec(rest);
    const id = idMatch ? idMatch[1] : '';
    if (!idMatch || !REQUIREMENT_ID.test(id)) {
      report(
        'typed-line-id-invalid',
        idMatch
          ? `the id \`${id}\` is not valid. Use lowercase letters and digits in two or more hyphen-separated parts, such as \`vf-01\`.`
          : `this ${type} item has no id. Put a backticked id after the type, such as \`vf-01\`.`,
      );
      continue;
    }
    rest = rest.slice(idMatch[0].length);

    /** @type {string | null} */
    let kind = null;
    if (type === 'constraint') {
      const kindMatch = KIND.exec(rest);
      kind = kindMatch ? kindMatch[1] : null;
      if (!kindMatch || !kind || !CONSTRAINT_KINDS.includes(kind)) {
        report(
          'typed-line-kind-unknown',
          `this constraint has ${kind ? `the unknown kind "${kind}"` : 'no kind'}. Write one of ${CONSTRAINT_KINDS.join(', ')} and a colon after the id, for example "- \`constraint\` \`${id}\` must: text".`,
        );
        continue;
      }
      rest = rest.slice(kindMatch[0].length);
    }

    const itemText = rest.trim();
    if (itemText === '') {
      report('typed-line-text-empty', `\`${id}\` has no text. Say what must hold after the ${kind ? 'kind' : 'id'}.`);
      continue;
    }
    const earlier = seen.get(id);
    if (earlier === undefined) {
      seen.set(id, line);
    } else {
      report('typed-line-id-duplicate', `the id \`${id}\` is already used on line ${earlier}. Give each requirement line its own id.`);
    }
    lines.push({ line, type, id, kind, text: itemText });
  }
  return { lines, findings };
}

/**
 * True when at least one Must-haves item starts with a backticked `contract` or `constraint`.
 * @param {string} text
 * @returns {boolean}
 */
export function usesTypedLines(text) {
  return mustHaveItems(text).some(({ body }) => TYPE.test(body));
}

/**
 * Findings for the Must-haves lines of one document, as validate findings with a "<path> line N:" message.
 * @param {{ text: string, path: string }} input
 * @returns {Finding[]}
 */
export function checkTypedCriteria({ text, path }) {
  return parseRequirementLines(text).findings.map(({ rule, message, line }) => ({
    rule,
    message: `${path} line ${line}: ${message}`,
    path,
  }));
}
