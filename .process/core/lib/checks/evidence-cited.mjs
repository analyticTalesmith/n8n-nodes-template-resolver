import { toLf } from '../files.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { fileAtCommit, isAncestorCommit, isCitedCommit, isCommitId, pathChangedSince, assertTopLevel, runGit } from '../git.mjs';
import { readFrontmatter, readRecovered } from '../frontmatter.mjs';
import { LIVING_DIR } from '../layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

export const RECOVERED_SECTIONS = Object.freeze({ purpose: '## Purpose', scope: '## Scope read', open: '## Open questions', answered: '## Answered' });
export const EVIDENCE_RULES = Object.freeze(['evidence-commit', 'evidence-path', 'evidence-line', 'evidence-untagged', 'evidence-question', 'evidence-format']);
export const STALE_RULE = 'evidence-stale';
const CITATION = /^([^:\s]+):(\d+)(?:-(\d+))?(?:@([^\s;]+))?$/;
const QUESTION = /^- Q([1-9]\d*)\.\s/;
const unsafePath = (path) => !path || path.startsWith('-') || path.startsWith('/') || path.includes('\\') || path.includes(':') || /[\u0000-\u001f]/.test(path) || path.split('/').some((part) => part === '' || part === '.' || part === '..');
const byName = (a, b) => a.name.localeCompare(b.name, 'en');

function livingFiles(roots, rel = LIVING_DIR) {
  let entries;
  try { entries = readdirSync(resolveProjectPath(roots, rel), { withFileTypes: true }).sort(byName); }
  catch (cause) {
    if (cause.code === 'ENOENT' && rel === LIVING_DIR) return [];
    throw cause;
  }
  return entries.flatMap((entry) => {
    const next = `${rel}/${entry.name}`;
    if (entry.isDirectory()) return [...(next.endsWith('.md') ? [next] : []), ...livingFiles(roots, next)];
    return entry.isFile() && next.endsWith('.md') ? [next] : [];
  });
}

function readDoc(roots, path) {
  try { return readFileSync(resolveProjectPath(roots, path), 'utf8'); }
  catch { return null; }
}

/** Recovered planned or built documents with no open or applied modify delta. Reads no git. */
export function recoveredInScope({ projectDir, records }) {
  const roots = resolveProjectRoots(projectDir);
  const modified = new Set((records ?? []).filter((r) => r.op === 'modify' && ['open', 'applied'].includes(r.status)).map((r) => r.target));
  return livingFiles(roots).filter((path) => {
    if (modified.has(path)) return false;
    const source = readDoc(roots, path);
    if (source === null) return true; // Its provenance cannot be trusted until the entry is readable.
    const data = readFrontmatter(source);
    return readRecovered(data).recovered && ['planned', 'built'].includes(data.state);
  });
}

/** Blank fenced code and HTML comments before section and question parsing. */
function visibleLines(lines) {
  let fence = null;
  let comment = false;
  return lines.map((line) => {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence !== null) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      return '';
    }
    if (comment) {
      const end = line.indexOf('-->');
      if (end === -1) return '';
      line = line.slice(end + 3);
      comment = false;
    }
    if (marker) { fence = marker; return ''; }
    while (line.includes('<!--')) {
      const start = line.indexOf('<!--');
      const end = line.indexOf('-->', start + 4);
      if (end === -1) { comment = true; return line.slice(0, start); }
      line = line.slice(0, start) + line.slice(end + 3);
    }
    return line;
  });
}

function questionNumbers(lines, heading) {
  const numbers = [];
  let current = '';
  for (const line of lines) {
    if (line.startsWith('## ')) { current = line.trim(); continue; }
    const match = QUESTION.exec(line);
    if (current === heading && match) numbers.push(match[1]);
  }
  return numbers;
}

/** Claim units in body sections. Fences and comments are removed before grouping. */
function claimUnits(lines) {
  const units = [];
  let section = '';
  let fence = null;
  let comment = false;
  let current = [];
  const flush = () => { if (current.length) units.push(current.join(' ').trim()); current = []; };
  let tableRows = 0;
  for (let raw of lines) {
    if (raw.startsWith('## ')) { flush(); section = raw.trim(); tableRows = 0; continue; }
    if (!section || Object.values(RECOVERED_SECTIONS).includes(section)) { flush(); continue; }
    if (comment) {
      if (raw.includes('-->')) { raw = raw.slice(raw.indexOf('-->') + 3); comment = false; }
      else continue;
    }
    if (raw.includes('<!--')) {
      const start = raw.indexOf('<!--');
      const end = raw.indexOf('-->', start + 4);
      raw = end === -1 ? raw.slice(0, start) : raw.slice(0, start) + raw.slice(end + 3);
      comment = end === -1;
    }
    if (/^\s*(```|~~~)/.test(raw)) { flush(); const marker = raw.trim().slice(0, 3); fence = fence === null ? marker : null; continue; }
    if (fence !== null || /^###\s/.test(raw) || /^\s*$/.test(raw)) { flush(); continue; }
    if (/^\s*\|/.test(raw)) {
      flush();
      tableRows += 1;
      if (tableRows > 2 && !/^\s*\|[\s|:-]+\|?\s*$/.test(raw)) units.push(raw.trim().replace(/\|\s*$/, '').trim());
      continue;
    }
    tableRows = 0;
    if (/^\s*(?:[-*]|[0-9]+\.)\s/.test(raw)) { flush(); current.push(raw.trim()); continue; }
    if (current.length && /^\s+/.test(raw)) { current.push(raw.trim()); continue; }
    if (current.length && /^\s*(?:[-*]|[0-9]+\.)\s/.test(current[0])) flush();
    current.push(raw.trim());
  }
  flush();
  return units;
}

function tokensOf(unit) {
  const withoutCode = unit.replace(/`+[^`]*`+/g, '');
  const trailing = [];
  let rest = withoutCode.trim();
  while (/\[[^\]\r\n]*\]$/.test(rest)) {
    const start = rest.lastIndexOf('[');
    trailing.unshift(rest.slice(start));
    rest = rest.slice(0, start).trimEnd();
  }
  return trailing;
}

function countLines(text) {
  if (text === '') return 0;
  const normalized = toLf(text);
  return normalized.split('\n').length - (normalized.endsWith('\n') ? 1 : 0);
}

/** Deterministic findings and stale notes. Bad document text and git failures are reported, never thrown. */
export function evidenceReport({ projectDir, records, only, run = runGit }) {
  const findings = [];
  const notes = [];
  let roots;
  try { roots = resolveProjectRoots(projectDir); }
  catch { return { findings: [{ rule: 'evidence-format', path: only ?? LIVING_DIR, message: 'Living documents cannot be read. Repair the project docs store.' }], notes }; }
  let paths;
  try { paths = only ? [only] : recoveredInScope({ projectDir, records }); }
  catch { return { findings: [{ rule: 'evidence-format', path: only ?? LIVING_DIR, message: 'Living documents cannot be inventoried. Repair the project docs store.' }], notes }; }
  if (paths.length === 0) return { findings, notes };
  try { assertTopLevel(projectDir, { run }); }
  catch { return { findings: paths.map((path) => ({ rule: 'evidence-commit', path, message: 'Recovered documents need a git repository at the project root.' })), notes }; }
  const files = new Map();
  const commits = new Map();
  const changed = new Map();
  const stale = new Set();
  const validCommit = (hash) => {
    if (commits.has(hash)) return commits.get(hash);
    let valid = false;
    try { valid = isAncestorCommit(projectDir, hash, run); } catch { valid = false; }
    commits.set(hash, valid);
    return valid;
  };
  for (const path of paths) {
    const findingStart = findings.length;
    const add = (rule, message) => findings.push({ rule, path, message });
    let gitFailure = false;
    const source = readDoc(roots, path);
    if (source === null) { add('evidence-format', 'Recovered document cannot be read. Restore the document.'); continue; }
    const data = readFrontmatter(source);
    const hash = readRecovered(data).recoveredAt;
    if (hash === null || !isCommitId(hash, { full: true }) || !validCommit(hash)) {
      add('evidence-commit', 'recovered_at must name a reachable full lowercase commit in the project git repository.');
      continue;
    }
    const lines = visibleLines(toLf(source).split('\n'));
    const open = questionNumbers(lines, RECOVERED_SECTIONS.open);
    const answered = questionNumbers(lines, RECOVERED_SECTIONS.answered);
    const referenced = { open: new Set(), answer: new Set() };
    for (const unit of claimUnits(lines)) {
      const trailing = tokensOf(unit);
      if (!trailing.length) { add('evidence-untagged', 'A claim unit needs a trailing [src:], [open:] or [answer:] tag.'); continue; }
      for (const raw of trailing) {
        const token = /^\[([a-z]+): ([^\]]*)\]$/.exec(raw);
        if (!token || !['src', 'open', 'answer'].includes(token[1])) { add('evidence-format', 'A trailing tag must use src, open or answer with the required form.'); continue; }
        const [, kind, value] = token;
        if (kind !== 'src') {
          if (!/^Q[1-9]\d*$/.test(value)) { add('evidence-format', 'An open or answer tag must name Q followed by a positive integer.'); continue; }
          referenced[kind].add(value.slice(1));
          if (!(kind === 'open' ? open : answered).includes(value.slice(1))) add('evidence-question', `Tag ${raw} names no matching question in ${kind === 'open' ? 'Open questions' : 'Answered'}.`);
          continue;
        }
        const citations = value.split('; ');
        if (!citations.length || citations.some((part) => part === '')) { add('evidence-format', 'A src tag needs a path and line citation.'); continue; }
        for (const citation of citations) {
          const match = CITATION.exec(citation);
          if (!match || unsafePath(match[1]) || (match[4] !== undefined && !isCitedCommit(match[4]))) { add('evidence-format', 'A citation needs a project-relative path and positive line or range.'); continue; }
          const [, file, fromText, toText, override] = match;
          const commit = override ?? hash;
          if (override && !validCommit(override)) { add('evidence-commit', `Citation ${citation} names a commit not reachable from HEAD.`); continue; }
          const key = `${commit}:${file}`;
          if (!files.has(key)) {
            try { files.set(key, fileAtCommit(projectDir, commit, file, run)); }
            catch { gitFailure = true; break; }
          }
          const content = files.get(key);
          if (content === null) { add('evidence-path', `Citation ${citation} has no file at its cited commit. Correct the path or commit.`); continue; }
          const from = Number(fromText), to = Number(toText ?? fromText);
          if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to < from || to > countLines(content)) add('evidence-line', `Citation ${citation} names a line outside the file at its cited commit. Correct the range.`);
          if (!changed.has(key)) {
            try { changed.set(key, pathChangedSince(projectDir, commit, file, run)); }
            catch { gitFailure = true; break; }
          }
          const staleKey = `${path}\0${key}`;
          if (changed.get(key) && !stale.has(staleKey)) {
            stale.add(staleKey);
            notes.push({ rule: STALE_RULE, path, message: `Citation ${citation} points to a path changed since its cited commit; re-check the claim.` });
          }
        }
        if (gitFailure) break;
      }
      if (gitFailure) break;
    }
    if (gitFailure) {
      findings.splice(findingStart);
      notes.splice(0, notes.length, ...notes.filter((item) => item.path !== path));
      add('evidence-commit', 'Git could not read a cited commit or path. Repair the project git repository and retry.');
      continue;
    }
    for (const [kind, numbers] of [['open', open], ['answer', answered]]) {
      for (const number of numbers) if (!referenced[kind].has(number)) add('evidence-question', `Q${number} in ${kind === 'open' ? 'Open questions' : 'Answered'} has no ${kind} tag in a claim.`);
    }
    for (const number of new Set([...open, ...answered])) {
      if (open.filter((n) => n === number).length + answered.filter((n) => n === number).length > 1) add('evidence-question', `Q${number} appears more than once; use each question number once.`);
    }
  }
  return { findings, notes };
}

export function checkEvidenceCited({ projectDir, records, run }) {
  return evidenceReport({ projectDir, records, run }).findings;
}
