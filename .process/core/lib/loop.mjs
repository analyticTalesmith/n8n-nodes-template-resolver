import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approverProblem } from './approval.mjs';
import { analyzeCycle } from './analyze.mjs';
import { listCards } from './board.mjs';
import { cycleEvidence, readCycle } from './cycle.mjs';
import { designApprovalState, readDesignApproval } from './design-approval.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { cyclePaths } from './layout.mjs';
import { readPosture } from './posture.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { readRounds, roundsReport } from './rounds.mjs';
import { next } from '../scripts/next.mjs';

export const LOOP_FILE = 'loop.md';
export const STATUSES = Object.freeze(['running', 'paused', 'stopped', 'done']);
const OUTCOMES = ['ok', 'fail', 'blocked', 'waiting'];
const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', LOOP_FILE);
const FIELDS = ['summary', 'status', 'iteration', 'spawns', 'cost', 'sweep_round', 'stop_reason', 'waiting_on'];

export class LoopError extends Error {
  constructor(message, rule, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'LoopError';
    this.rule = rule;
  }
}

const refuse = (message, rule = 'loop-ledger-invalid') => { throw new LoopError(message, rule); };
const integer = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
const number = (value) => {
  const text = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && !(parsed === 0 && /[1-9]/.test(text.split(/e/i)[0])) ? parsed : null;
};
const lineSafe = (value, field) => {
  if (typeof value !== 'string' || !value.trim() || /[|\r\n]/.test(value)) refuse(`${field} must be non-empty and contain no pipe or line break.`, 'loop-entry-refused');
  return value.trim();
};
const listSafe = (value, field) => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) refuse(`${field} must be a list.`, 'loop-entry-refused');
  return value.map((item) => lineSafe(item, field));
};

function ledgerPath(projectDir, cycle) {
  return resolveProjectPath(resolveProjectRoots(projectDir), `${cyclePaths(cycle).root}/${LOOP_FILE}`);
}

function parseLine(text, lineNumber) {
  const parts = text.slice(2).split(' | ');
  if (parts.length === 3 && parts[1] === 'resume' && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) && parts[2]) {
    return { date: parts[0], resume: parts[2] };
  }
  if (parts.length < 8 || !/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) refuse(`Invalid iteration line ${lineNumber} in ${LOOP_FILE}.`);
  const [date, iterationText, unit, action, outcome, progressText, failureText, spawnsText, ...extras] = parts;
  const iteration = integer(iterationText);
  const progress = /^progress (\d+)$/.exec(progressText)?.[1];
  const spawns = /^spawns (\d+)$/.exec(spawnsText)?.[1];
  if (!iteration || !unit || !action || !OUTCOMES.includes(outcome) || progress === undefined || spawns === undefined || !failureText.startsWith('failure ') || integer(progress) === null || integer(spawns) === null) {
    refuse(`Invalid iteration line ${lineNumber} in ${LOOP_FILE}.`);
  }
  const entry = { date, iteration, unit, action, outcome, progress: Number(progress), failure: failureText.slice(8) === 'none' ? null : failureText.slice(8), spawns: Number(spawns) };
  const seen = new Set();
  for (const extra of extras) {
    const space = extra.indexOf(' ');
    if (space < 1) refuse(`Invalid iteration line ${lineNumber} in ${LOOP_FILE}.`);
    const key = extra.slice(0, space);
    if (seen.has(key) || !['cost', 'sweep', 'wait', 'clear', 'decided'].includes(key)) refuse(`Invalid iteration line ${lineNumber} in ${LOOP_FILE}.`);
    seen.add(key);
    const raw = extra.slice(space + 1);
    if (key === 'cost') entry.cost = number(raw);
    else if (key === 'sweep') entry.sweepRound = integer(raw);
    else {
      try { entry[key] = JSON.parse(raw); } catch { refuse(`Invalid iteration line ${lineNumber} in ${LOOP_FILE}.`); }
      if (!Array.isArray(entry[key]) || entry[key].some((item) => typeof item !== 'string' || !item || /[|\r\n]/.test(item))) refuse(`Invalid iteration line ${lineNumber} in ${LOOP_FILE}.`);
    }
    if (entry[key === 'sweep' ? 'sweepRound' : key] === null) refuse(`Invalid iteration line ${lineNumber} in ${LOOP_FILE}.`);
  }
  return entry;
}

function derived(lines) {
  let iteration = 0, spawns = 0, cost = null, sweepRound = 0;
  let waiting = [], decided = [];
  for (const line of lines) {
    if (line.resume) continue;
    if (line.iteration !== iteration + 1) refuse(`Iteration ${line.iteration} follows ${iteration}; expected ${iteration + 1} in ${LOOP_FILE}.`);
    iteration += 1;
    spawns += line.spawns;
    if (line.cost !== undefined) {
      cost = (cost ?? 0) + line.cost;
      if (!Number.isFinite(cost)) refuse(`Aggregate cost must remain finite in ${LOOP_FILE}.`);
    }
    if (line.sweepRound !== undefined) {
      if (line.sweepRound < sweepRound) refuse(`Sweep round decreases in ${LOOP_FILE}.`);
      sweepRound = line.sweepRound;
    }
    waiting = waiting.filter((item) => !(line.clear ?? []).includes(item));
    for (const item of line.wait ?? []) if (!waiting.includes(item)) waiting.push(item);
    for (const item of line.decided ?? []) if (!decided.includes(item)) decided.push(item);
  }
  return { iteration, spawns, cost, sweep_round: sweepRound, waiting_on: waiting, decided };
}

function parseLedger(text) {
  const data = readFrontmatter(text);
  if (!data || FIELDS.some((key) => !Object.hasOwn(data, key))) refuse(`${LOOP_FILE} needs all ledger frontmatter fields.`);
  const lines = text.split(/\r?\n/);
  const headings = ['## Iterations', '## Decided alone', '## Waiting on the human'];
  const positions = headings.map((heading) => lines.indexOf(heading));
  if (positions.some((position) => position < 0) || positions[0] >= positions[1] || positions[1] >= positions[2]) refuse(`${LOOP_FILE} has missing or reordered sections.`);
  const entries = lines.slice(positions[0] + 1, positions[1]).flatMap((line, offset) => line.startsWith('- ') ? [parseLine(line, positions[0] + offset + 2)] : line.trim() ? refuse(`Invalid iteration line ${positions[0] + offset + 2} in ${LOOP_FILE}.`) : []);
  const values = derived(entries);
  const bodyList = (start, end) => lines.slice(start + 1, end).filter((line) => line.trim()).map((line) => {
    if (!line.startsWith('- ') || !line.slice(2).trim()) refuse(`Invalid list under ${lines[start]} in ${LOOP_FILE}.`);
    return line.slice(2);
  });
  const decided = bodyList(positions[1], positions[2]);
  const waitingBody = bodyList(positions[2], lines.length);
  const frontWaiting = data.waiting_on;
  const frontCost = data.cost === '' ? null : number(data.cost);
  if (!STATUSES.includes(data.status) || integer(data.iteration) !== values.iteration || integer(data.spawns) !== values.spawns || integer(data.sweep_round) !== values.sweep_round || frontCost !== values.cost || !Array.isArray(frontWaiting) || JSON.stringify(frontWaiting) !== JSON.stringify(values.waiting_on) || JSON.stringify(decided) !== JSON.stringify(values.decided) || JSON.stringify(waitingBody) !== JSON.stringify(values.waiting_on)) {
    refuse(`${LOOP_FILE} counters or waiting_on disagree with its iteration lines. Repair the ledger before continuing.`);
  }
  return { summary: data.summary, status: data.status, iteration: values.iteration, spawns: values.spawns, cost: values.cost, sweep_round: values.sweep_round, stop_reason: data.stop_reason, waiting_on: values.waiting_on, lines: entries, decided: values.decided };
}

export function readLedger(projectDir, cycle) {
  const path = ledgerPath(projectDir, cycle);
  if (!existsSync(path)) refuse(`No ${LOOP_FILE} for cycle ${cycle}. Run loop start first.`, 'loop-not-started');
  return parseLedger(readFileSync(path, 'utf8'));
}

function render(ledger) {
  const waiting = ledger.waiting_on.length ? `\n${ledger.waiting_on.map((item) => `- ${item}`).join('\n')}` : ' []';
  const header = `---\nsummary: ${ledger.summary ?? ''}\nstatus: ${ledger.status}\niteration: ${ledger.iteration}\nspawns: ${ledger.spawns}\ncost: ${ledger.cost ?? ''}\nsweep_round: ${ledger.sweep_round}\nstop_reason: ${ledger.stop_reason ?? ''}\nwaiting_on:${waiting}\n---`;
  const entries = ledger.lines.map((line) => {
    if (line.resume) return `- ${line.date} | resume | ${line.resume}`;
    const parts = [line.date, line.iteration, line.unit, line.action, line.outcome, `progress ${line.progress}`, `failure ${line.failure ?? 'none'}`, `spawns ${line.spawns}`];
    if (line.cost !== undefined) parts.push(`cost ${line.cost}`);
    if (line.sweepRound !== undefined) parts.push(`sweep ${line.sweepRound}`);
    for (const key of ['wait', 'clear', 'decided']) if (line[key]?.length) parts.push(`${key} ${JSON.stringify(line[key])}`);
    return `- ${parts.join(' | ')}`;
  });
  return `${header}\n\n# Loop ledger\n\n<!-- Written by loop.mjs record and resume only. Begin each iteration by reading this ledger, CYCLE.md, design-approval.md, the latest handoff and next.mjs. -->\n\n## Iterations\n${entries.length ? `${entries.join('\n')}\n` : ''}\n## Decided alone\n${ledger.decided.length ? `${ledger.decided.map((item) => `- ${item}`).join('\n')}\n` : ''}\n## Waiting on the human\n${ledger.waiting_on.length ? `${ledger.waiting_on.map((item) => `- ${item}`).join('\n')}\n` : ''}`;
}

function writeLedger(projectDir, cycle, ledger) {
  const path = ledgerPath(projectDir, cycle);
  const temp = `${path}.tmp`;
  writeFileSync(temp, render(ledger), { flag: 'w' });
  renameSync(temp, path);
}

function limits(projectDir, cycle) {
  const approval = readDesignApproval(projectDir, cycle);
  const posture = readPosture(projectDir);
  if (posture.findings.length) refuse(posture.findings[0].message, 'loop-entry-refused');
  return { approval, loop: posture.preset.loop };
}

function approvalVerdict(projectDir, cycle) {
  const approval = designApprovalState(projectDir, cycle);
  if (approval.state === 'fresh') return null;
  return { verdict: 'waiting', detail: `design approval ${approval.state}${approval.stale.length ? ` (${approval.stale.join(', ')})` : ''}`, notes: ['Ask a person to approve the current design before continuing.'] };
}

function latestWindow(lines) {
  const resumeIndex = lines.findLastIndex((line) => line.resume);
  return lines.slice(resumeIndex + 1).filter((line) => !line.resume);
}

function failureWait(failure, count) {
  const [card, ...rest] = failure.split(':');
  return `blocked: ${card.trim()} (${rest.join(':').trim() || 'failure'}, ${count} times)`;
}

function failureWaits(lines, count) {
  const tally = new Map();
  for (const line of latestWindow(lines)) {
    for (const item of line.clear ?? []) {
      for (const failure of tally.keys()) if (failureWait(failure, count) === item) tally.delete(failure);
    }
    if (line.failure) tally.set(line.failure, (tally.get(line.failure) ?? 0) + 1);
  }
  return [...tally].filter(([, n]) => n >= count).map(([failure]) => failureWait(failure, count));
}

function openFixRequests(projectDir, cards) {
  return cards.flatMap(({ card }) => {
    const rounds = readRounds(projectDir, card.id);
    if (!rounds.rounds.length) return [];
    return roundsReport(rounds, projectDir).fixRequests.map((label) => `${card.id}: ${label}`);
  });
}

function missingCostIterations(ledger) {
  return ledger.lines.filter((line) => line.iteration && line.cost === undefined).map((line) => line.iteration);
}

function missingCostMessage(ledger) {
  return `Cost missing for iteration ${missingCostIterations(ledger).join(', ')}; a person must repair the ledger before continuing.`;
}

function nonPassingEvidence(projectDir, cycle, ledger, required) {
  if (!required.levels.length && !required.lenses.length) return [];
  const roots = resolveProjectRoots(projectDir);
  const folder = cyclePaths(cycle).verification;
  return readdirSync(resolveProjectPath(roots, folder), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'close-review.md' && entry.name !== 'INDEX.md')
    .flatMap((entry) => {
      const data = readFrontmatter(readFileSync(resolveProjectPath(roots, `${folder}/${entry.name}`), 'utf8')) ?? {};
      const selectedLevel = required.levels.includes(data.level);
      const selectedLens = required.lenses.includes(data.lens) && Number(data.sweep_round) === ledger.sweep_round;
      if (!selectedLevel && !selectedLens) return [];
      return data.result === 'pass' && data.verdict === 'accept' ? [] : [{ kind: selectedLens ? 'lens' : 'level', name: selectedLens ? data.lens : data.level, file: entry.name, result: data.result || 'no result', verdict: data.verdict || 'no verdict' }];
    });
}

function verdictFor(projectDir, cycle, ledger) {
  const stale = approvalVerdict(projectDir, cycle);
  if (stale) return stale;
  const { approval, loop } = limits(projectDir, cycle);
  if (approval.max_cost !== null && missingCostIterations(ledger).length) {
    return { verdict: 'waiting', detail: missingCostMessage(ledger), notes: [] };
  }
  const evidence = cycleEvidence(projectDir, cycle, { sweepRound: ledger.sweep_round });
  const nonPassing = nonPassingEvidence(projectDir, cycle, ledger, evidence.required);
  const cards = listCards(projectDir).filter((item) => item.cycle === cycle);
  const unfinished = cards.filter((item) => item.column !== '06_done');
  const missingApproved = approval.cards.filter((id) => !cards.some(({ card }) => card.id === id));
  const fixRequests = openFixRequests(projectDir, cards);
  const waiting = [...new Set([...ledger.waiting_on, ...failureWaits(ledger.lines, loop.repeat_failure_limit)])];
  const notes = evidence.gaps.map((gap) => `${gap.kind} ${gap.name}: ${gap.problem}${gap.files.length ? ` (${gap.files.join(', ')})` : ''}`);
  notes.push(...missingApproved.map((id) => `approved card ${id} is missing`), ...fixRequests.map((request) => `open fix request ${request}`), ...nonPassing.map((record) => `non-passing evidence ${record.file}: ${record.result} / ${record.verdict}`));
  if (unfinished.length === 0 && missingApproved.length === 0 && fixRequests.length === 0 && evidence.gaps.length === 0 && nonPassing.length === 0 && waiting.length === 0) return { verdict: 'done', detail: '', notes };
  const maxIterations = approval.max_iterations ?? loop.max_iterations;
  const maxSpawns = approval.max_spawns ?? loop.max_spawns;
  for (const [name, used, max] of [['iterations', ledger.iteration, maxIterations], ['spawns', ledger.spawns, maxSpawns], ['cost', ledger.cost, approval.max_cost]]) {
    if (max !== null && used !== null && used >= max) return { verdict: 'stop', detail: `budget (${name} ${used} of ${max})`, notes };
    if (max !== null && used !== null && used >= max * 0.8) notes.push(`${name} at ${Math.floor(used / max * 100)}% of budget (${used} of ${max})`);
  }
  const failingLenses = [...evidence.gaps.filter((gap) => gap.kind === 'lens').map((gap) => gap.name), ...nonPassing.filter((record) => record.kind === 'lens').map((record) => record.name)];
  if (evidence.required.lenses.length && ledger.sweep_round >= approval.sweep_rounds && failingLenses.length) {
    return { verdict: 'stop', detail: `not converging (${failingLenses.join(', ')})`, notes };
  }
  const window = latestWindow(ledger.lines);
  const tail = window.slice(-loop.no_progress_limit);
  if (tail.length === loop.no_progress_limit && tail.every((line, index) => index === 0 || line.progress <= tail[index - 1].progress)) {
    return { verdict: 'stop', detail: 'no progress', notes };
  }
  if (waiting.length) {
    const blockedCards = new Set(waiting.map((item) => /^blocked: (\d{4}-[a-z0-9-]+) \(/.exec(item)?.[1]).filter(Boolean));
    const runnable = next(projectDir, cycle).ready.filter((card) => !blockedCards.has(card.id));
    if (!runnable.length && !evidence.gaps.length) return { verdict: 'waiting', detail: waiting.join('; '), notes };
    notes.push(`waiting on ${waiting.join('; ')}`);
  }
  if (unfinished.length && next(projectDir, cycle).ready.length === 0 && unfinished.every((item) => item.column === '02_ready')) return { verdict: 'waiting', detail: waiting.length ? waiting.join('; ') : 'nothing runnable', notes };
  return { verdict: 'continue', detail: '', notes };
}

export function loopStatus(projectDir, cycle) {
  const ledger = readLedger(projectDir, cycle);
  return verdictFor(projectDir, cycle, ledger);
}

export function startLoop(projectDir, cycle, { now } = {}) {
  const selected = readCycle(projectDir, cycle);
  if (selected.status !== 'open' || selected.approvals !== 'front') refuse(`Cycle ${cycle} needs an open front approval placement; found ${selected.status}/${selected.approvals}.`, 'loop-entry-refused');
  const posture = readPosture(projectDir);
  if (posture.findings.length || !posture.preset.loop.allowed) refuse(`Posture ${posture.name} does not allow the goal loop.`, 'loop-entry-refused');
  const approval = designApprovalState(projectDir, cycle);
  if (approval.state !== 'fresh') refuse(`Design approval ${approval.state}${approval.stale.length ? `: ${approval.stale.join(', ')}` : ''}. Ask a person to approve it.`, 'loop-entry-refused');
  const findings = analyzeCycle(projectDir, cycle);
  if (findings.length) refuse(`Analyze ${cycle} reports ${findings.map((item) => item.rule).join(', ')}. Fix these before starting.`, 'loop-entry-refused');
  const path = ledgerPath(projectDir, cycle);
  if (existsSync(path)) refuse(`${LOOP_FILE} already exists. Read it or resume instead of restarting.`, 'loop-entry-refused');
  const template = readFileSync(TEMPLATE, 'utf8');
  const ledger = parseLedger(template);
  writeLedger(projectDir, cycle, ledger);
  return ledger;
}

function normalizeEntry(entry, now) {
  if (!entry || typeof entry !== 'object') refuse('An iteration entry is required.', 'loop-entry-refused');
  const date = typeof now === 'function' ? now() : now ?? new Date();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) refuse('Iteration date is invalid.', 'loop-entry-refused');
  const iteration = integer(entry.iteration), progress = integer(entry.progress), spawns = integer(entry.spawns ?? 0);
  if (!iteration || progress === null || spawns === null || !OUTCOMES.includes(entry.outcome)) refuse('iteration must be positive; progress and spawns non-negative; outcome must be ok, fail, blocked or waiting.', 'loop-entry-refused');
  const normalized = { date: date.toISOString().slice(0, 10), iteration, unit: lineSafe(entry.unit, 'unit'), action: lineSafe(entry.action, 'action'), outcome: entry.outcome, progress, failure: entry.failure == null ? null : lineSafe(entry.failure, 'failure'), spawns };
  for (const key of ['wait', 'clear', 'decided']) normalized[key] = listSafe(entry[key], key);
  if (entry.cost !== undefined) {
    normalized.cost = number(entry.cost);
    if (normalized.cost === null) refuse('cost must be non-negative.', 'loop-entry-refused');
  }
  if (entry.sweepRound !== undefined) {
    normalized.sweepRound = integer(entry.sweepRound);
    if (normalized.sweepRound === null) refuse('sweepRound must be a non-negative integer.', 'loop-entry-refused');
  }
  return normalized;
}

export function recordIteration(projectDir, cycle, entry, { now } = {}) {
  const ledger = readLedger(projectDir, cycle);
  const normalized = normalizeEntry(entry, now);
  const repeatLimit = limits(projectDir, cycle).loop.repeat_failure_limit;
  const prior = ledger.lines.filter((line) => line.iteration !== normalized.iteration);
  for (const item of failureWaits([...prior, normalized], repeatLimit)) if (!ledger.waiting_on.includes(item) && !normalized.wait.includes(item)) normalized.wait.push(item);
  const existing = ledger.lines.find((line) => line.iteration === normalized.iteration);
  if (existing) {
    const comparable = (line) => ({ iteration: line.iteration, unit: line.unit, action: line.action, outcome: line.outcome, progress: line.progress, failure: line.failure, spawns: line.spawns, cost: line.cost, sweepRound: line.sweepRound, wait: line.wait ?? [], clear: line.clear ?? [], decided: line.decided ?? [] });
    if (JSON.stringify(comparable(existing)) === JSON.stringify(comparable(normalized))) return { ledger, written: false };
    refuse(`Iteration ${normalized.iteration} is already recorded with different details.`, 'loop-iteration-mismatch');
  }
  if (normalized.iteration !== ledger.iteration + 1) refuse(`Expected iteration ${ledger.iteration + 1}, got ${normalized.iteration}.`, 'loop-iteration-mismatch');
  if (ledger.status !== 'running') refuse(`${LOOP_FILE} status is ${ledger.status}; a person must resume before recording.`, 'loop-entry-refused');
  if (approvalVerdict(projectDir, cycle)) refuse('Design approval is stale or missing. Ask a person to re-approve before recording.', 'loop-entry-refused');
  const { approval } = limits(projectDir, cycle);
  if (approval.max_cost !== null) {
    if (missingCostIterations(ledger).length) refuse(missingCostMessage(ledger), 'loop-entry-refused');
    if (normalized.cost === undefined) refuse('This approved max_cost requires a recorded cost for every iteration.', 'loop-entry-refused');
    if (ledger.cost !== null && ledger.cost >= approval.max_cost) refuse(`Approved budget (cost ${ledger.cost} of ${approval.max_cost}) is exhausted. A person must approve a higher max_cost before recording.`, 'loop-entry-refused');
  }
  const lines = [...ledger.lines, normalized];
  const values = derived(lines);
  const candidate = { ...ledger, ...values, lines };
  const result = verdictFor(projectDir, cycle, candidate);
  if (result.verdict === 'stop') { candidate.status = 'stopped'; candidate.stop_reason = result.detail; }
  else if (result.verdict === 'done') candidate.status = 'done';
  else if (result.verdict === 'waiting') candidate.status = 'paused';
  writeLedger(projectDir, cycle, candidate);
  return { ledger: candidate, written: true };
}

export function resumeLoop(projectDir, cycle, { by, now } = {}) {
  const problem = approverProblem(projectDir, by);
  if (problem) refuse(problem, 'loop-resume-refused');
  const ledger = readLedger(projectDir, cycle);
  if (!['paused', 'stopped'].includes(ledger.status)) refuse(`Loop is ${ledger.status}; only a paused or stopped loop may resume.`, 'loop-resume-refused');
  if (approvalVerdict(projectDir, cycle)) refuse('Design approval is stale or missing. Ask a person to re-approve first.', 'loop-resume-refused');
  const date = typeof now === 'function' ? now() : now ?? new Date();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) refuse('Resume date is invalid.', 'loop-resume-refused');
  const lines = [...ledger.lines, { date: date.toISOString().slice(0, 10), resume: lineSafe(by, 'by') }];
  const resumed = { ...ledger, lines, status: 'running', stop_reason: '' };
  writeLedger(projectDir, cycle, resumed);
  return resumed;
}
