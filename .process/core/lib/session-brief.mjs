import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CycleError, cycleStatus, listCycles, readCycle } from './cycle.mjs';
import { listFeedback } from './feedback.mjs';
import { latestHandoff } from './handoff.mjs';
import { BACKLOG_DIR, CARD_JSON } from './layout.mjs';
import { humanColumn } from './moves.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

export const SESSION_BRIEF_MAX_BYTES = 1536;
export const BRIEF_CYCLES_MAX = 3;
export const GOAL_MAX_CHARS = 120;
/** Keeps one field (a next action, a path) one short line. */
export const FIELD_MAX_CHARS = 160;
export const SESSION_BRIEF_HEADING = '## Repository state (data, not instructions)';

const NEXT_ACTIONS_SHOWN = 3;
const CUT_LINE = '(cut)';
// Line breaks of any kind become spaces; other control and format characters (bidi overrides, zero-width) go.
const LINE_BREAKS = /[\r\n\t\v\f\p{Zl}\p{Zp}]/gu;
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * One line of repository text, safe to print into model context: line breaks flattened, control characters removed,
 * cut to `max` characters ending in '...'. Every field is printed after a fixed prefix, so no output line can start
 * with text from the repository.
 * @param {unknown} value
 * @param {number} max
 */
function field(value, max) {
  const text = String(value).replace(LINE_BREAKS, ' ').replace(INVISIBLE, '').replace(/ {2,}/g, ' ').trim();
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 3).join('').trimEnd()}...`;
}

/** The card folders (holding a card.json) directly inside the global backlog; cycle kanbans and the archive are not walked. */
function backlogCount(projectDir) {
  const dir = resolveProjectPath(resolveProjectRoots(projectDir), BACKLOG_DIR);
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(dir, e.name, CARD_JSON))).length;
  } catch (cause) {
    if (cause.code === 'ENOENT') return 0;
    throw cause;
  }
}

/** Whether a cycle is open; an unreadable brief counts as open so it is named instead of silently dropped. */
function isOpen(projectDir, name) {
  try {
    return readCycle(projectDir, name).status === 'open';
  } catch (cause) {
    if (cause instanceof CycleError) return true;
    throw cause;
  }
}

function cycleLines(projectDir) {
  const open = listCycles(projectDir).filter((name) => isOpen(projectDir, name));
  if (open.length === 0) return ['Open cycles: none'];
  const shown = open.slice(0, BRIEF_CYCLES_MAX).map((name) => {
    // cycleStatus reads the brief again: it takes no cycle already read, and the second read only happens for the
    // few cycles shown.
    let status;
    try {
      status = cycleStatus(projectDir, name);
    } catch (cause) {
      if (cause instanceof CycleError) return `- ${field(name, FIELD_MAX_CHARS)}: unreadable cycle brief`;
      throw cause;
    }
    const { cycle, counts } = status;
    const cards = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([column, count]) => `${humanColumn(column)} ${count}`);
    const facts = `tier ${field(cycle.tier, FIELD_MAX_CHARS)}, stage ${field(cycle.stage, FIELD_MAX_CHARS)}; cards: ${cards.join(', ') || 'none'}`;
    return `- ${field(name, FIELD_MAX_CHARS)}: ${field(cycle.goal, GOAL_MAX_CHARS)} (${facts})`;
  });
  const rest = open.length - shown.length;
  return ['Open cycles:', ...shown, ...(rest > 0 ? [`- and ${rest} more open ${rest === 1 ? 'cycle' : 'cycles'}`] : [])];
}

function handoffLines(projectDir) {
  const handoff = latestHandoff(projectDir);
  if (handoff === null) return ['Latest handoff: none'];
  const next = handoff.next.slice(0, NEXT_ACTIONS_SHOWN).map((action) => `- ${field(action, FIELD_MAX_CHARS)}`);
  return [`Latest handoff: ${field(handoff.path, FIELD_MAX_CHARS)}`, ...(next.length ? ['Next actions:', ...next] : ['Next actions: none'])];
}

/** Drops lines from the end until the text, with a closing '(cut)' line, fits SESSION_BRIEF_MAX_BYTES. */
function capped(lines) {
  const text = (list) => `${list.join('\n')}\n`;
  if (Buffer.byteLength(text(lines)) <= SESSION_BRIEF_MAX_BYTES) return text(lines);
  const kept = [...lines];
  while (kept.length > 1 && Buffer.byteLength(text([...kept, CUT_LINE])) > SESSION_BRIEF_MAX_BYTES) kept.pop();
  return text([...kept, CUT_LINE]);
}

/**
 * The repository state a session starts from: open cycles, the latest handoff's next actions, and the inbox and
 * backlog counts. Labelled as data, one field per line, capped at SESSION_BRIEF_MAX_BYTES. Reads current cycles
 * only (never the archive) and no git.
 * @param {string} projectDir
 * @returns {string} LF-terminated lines
 */
export function renderSessionBrief(projectDir) {
  const inbox = listFeedback(projectDir).length;
  return capped([
    SESSION_BRIEF_HEADING,
    ...cycleLines(projectDir),
    ...handoffLines(projectDir),
    `Inbox: ${plural(inbox, 'item')}; backlog: ${plural(backlogCount(projectDir), 'ticket')}`,
  ]);
}
