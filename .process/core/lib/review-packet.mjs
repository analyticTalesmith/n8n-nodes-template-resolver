import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { BoardError, cardPath, isCardId, readCard } from './board.mjs';
import { CARD_FILES, WORK_ROOT, cardFile, deltaDeliverables, workFile } from './card-files.mjs';
import { validateFreeze, freezeHashes } from './freeze.mjs';
import { gateFindings } from './gate.mjs';
import { fileAtCommit, headCommit, reviewPatch, runGit } from './git.mjs';
import { CONTRACT_FILES, parseScopeExceptions, readContractFile, sectionBody } from './contract.mjs';
import { TIERS } from './layout.mjs';
import { humanColumn } from './moves.mjs';
import { parseObjective } from './checks/reviewer-brief.mjs';
import { PACKET_MAX_BYTES, contractAtBase, contractBlocks, fenced, lf, readBriefText, readDesignContexts, secretFindings, frozenTestsSection } from './packet-parts.mjs';
import { effectiveConcerns, effectiveTier } from './tier.mjs';
import { RoundsError, readRounds, renderEarlierFindings } from './rounds.mjs';
import { FINDING_CLASSES, GOAL_TARGETS, RESPONSE_VERDICTS, isEvidenceEntry } from './review-schema.mjs';
import { localDocsHashes, localLivingHashes } from './local-docs-attestation.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./gate.mjs').GateOptions} GateOptions */
/** @typedef {import('./review-schema.mjs').Chain} Chain */
/** @typedef {import('./review-schema.mjs').ValidReview} ValidReview */
/** @typedef {import('./review-schema.mjs').ReviewFinding} ReviewFinding */
/** @typedef {import('./review-schema.mjs').ReviewResponse} ReviewResponse */
/**
 * @typedef {{
 *   path: string, text: string, sha256: string, diff_sha256: string, tier: string, chain: Chain, frozen: boolean,
 *   omitted: number, stageBytes: Record<string, number>,
 *   frozenTests: { shown: string[], truncated: string[], missing: string[], notShown: string[] }, deltas: string[]
 * }} PacketResult
 */

export { FROZEN_TESTS_MAX_BYTES, PACKET_MAX_BYTES, designContextPaths, frozenTestPaths, readBriefText } from './packet-parts.mjs';

const REVIEW_INVALID = 'review-output-invalid';
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

export const REVIEW_OUTPUT_INSTRUCTIONS = `Answer with one JSON object and nothing else, in this shape:

\`\`\`json
{
  "restatement": "the objective in your own words, one short paragraph",
  "brief_mismatch": null,
  "verification_plan": ["each check you will make, written from section 1 alone"],
  "findings": [{
    "title": "one line",
    "class": "defect | goal-risk | drift | simplification",
    "serves": { "target": "c1 | m1 | card-goal | cycle-goal | project-goal", "scenario": "the concrete failure against that target" },
    "rubric": "the rubric item or criterion cited",
    "reproduction": "falsifiable steps that show the failure",
    "evidence": ["doc:<path>", "code:<path>:<line>", "test:<name>", "diff:<path>"],
    "location": "path:line or null"
  }],
  "responses": [{ "finding": "f1", "verdict": "sustain | withdraw", "evidence": ["code:src/a.mjs:12"] }]
}
\`\`\`

Rules:

- Judge the diff against section 1 and the goals it names, never against how the work was done. Write \`restatement\` before you read section 3.
- Product tier and up: write \`verification_plan\` from section 1 alone, before you read section 3.
- \`brief_mismatch\`: a string when the brief, the criteria and the goals contradict each other; otherwise null.
- Every finding names what it serves in \`serves.target\`: a criterion (c1, c2, ...), a must-not (m1, m2, ...) or a goal (card-goal, cycle-goal, project-goal). A finding that serves nothing in the objective chain is dropped.
- \`defect\` and \`goal-risk\` need a rubric item and falsifiable reproduction steps; \`goal-risk\` also needs evidence. Every evidence entry is \`<kind>:<ref>\` with a kind of doc, code, test or diff.
- Answer each question in the reviewer brief. A weak answer to a goal-critical question is a \`goal-risk\` finding serving that question's goal (a fix request: revise and resubmit). A weak answer to a polish question is a \`drift\` finding (noted for the lead, never a fix request). Strong and adequate answers need no finding.
- \`responses\` answers earlier findings by label when you are asked to; otherwise leave it empty.`;

/**
 * Checks a returned review. A finding that fails is dropped with a reason; a problem in the rest of the review makes
 * `review` null. Never throws.
 * @param {unknown} value
 * @param {{ tier: string, chain: Chain }} options
 * @returns {{ review: ValidReview | null, dropped: Array<{ index: number, title: string, reason: string }>, problems: Finding[] }}
 */
export function validateReview(value, { tier, chain }) {
  /** @type {Finding[]} */
  const problems = [];
  const problem = (path, expected) =>
    problems.push({ rule: REVIEW_INVALID, message: `${path} must be ${expected}. Correct that part of the review and return it again.`, path });
  const dropped = [];
  if (!isPlainObject(value)) {
    problem('the review', 'a JSON object');
    return { review: null, dropped, problems };
  }
  const input = /** @type {Record<string, any>} */ (value);

  if (!isNonEmptyString(input.restatement)) problem('restatement', 'a non-empty string');
  if (input.brief_mismatch !== null && typeof input.brief_mismatch !== 'string') problem('brief_mismatch', 'null or a string');

  const needsPlan = TIERS.indexOf(tier) >= TIERS.indexOf('product');
  const plan = input.verification_plan;
  const planOk = Array.isArray(plan) && plan.every(isNonEmptyString);
  if (plan === undefined ? needsPlan : !planOk || (needsPlan && plan.length === 0)) {
    problem('verification_plan', needsPlan ? 'a non-empty list of strings at this tier' : 'a list of strings');
  }

  const rawFindings = input.findings;
  if (!Array.isArray(rawFindings)) problem('findings', 'a list (empty when there are none)');
  const rawResponses = input.responses ?? [];
  /** @type {ReviewResponse[]} */
  const responses = [];
  if (!Array.isArray(rawResponses)) {
    problem('responses', 'a list');
  } else {
    rawResponses.forEach((entry, index) => {
      const ok =
        isPlainObject(entry) &&
        typeof entry.finding === 'string' &&
        /^f\d+$/.test(entry.finding) &&
        RESPONSE_VERDICTS.includes(entry.verdict) &&
        Array.isArray(entry.evidence) &&
        entry.evidence.every(isEvidenceEntry);
      if (ok) responses.push({ finding: entry.finding, verdict: entry.verdict, evidence: [...entry.evidence] });
      else problem(`responses[${index}]`, 'an object with finding f<number>, verdict sustain or withdraw, and evidence entries like code:<path>:<line>');
    });
  }

  /** @type {ReviewFinding[]} */
  const findings = [];
  (Array.isArray(rawFindings) ? rawFindings : []).forEach((raw, index) => {
    const title = isPlainObject(raw) && typeof raw.title === 'string' ? raw.title : '';
    const reason = findingProblem(raw, chain);
    if (reason !== null) {
      dropped.push({ index, title, reason });
      return;
    }
    findings.push({
      title,
      class: raw.class,
      serves: { target: raw.serves.target, scenario: raw.serves.scenario },
      rubric: typeof raw.rubric === 'string' ? raw.rubric : '',
      reproduction: typeof raw.reproduction === 'string' ? raw.reproduction : '',
      evidence: raw.evidence === undefined ? [] : [...raw.evidence],
      location: typeof raw.location === 'string' ? raw.location : null,
    });
  });

  if (problems.length) return { review: null, dropped, problems };
  return {
    review: {
      restatement: input.restatement,
      brief_mismatch: input.brief_mismatch,
      verification_plan: Array.isArray(plan) ? [...plan] : [],
      findings,
      responses,
    },
    dropped,
    problems,
  };
}

/** @returns {string | null} why the finding is dropped, or null when it is kept */
function findingProblem(raw, chain) {
  if (!isPlainObject(raw) || !isPlainObject(raw.serves) || !isNonEmptyString(raw.serves.scenario)) return 'no serves';
  if (!servesChain(raw.serves.target, chain)) return 'serves names nothing in the objective chain';
  if (!FINDING_CLASSES.includes(raw.class)) return `class must be one of ${FINDING_CLASSES.join(', ')}`;
  const blocking = raw.class === 'defect' || raw.class === 'goal-risk';
  if (blocking && (!isNonEmptyString(raw.rubric) || !isNonEmptyString(raw.reproduction))) return `a ${raw.class} needs a rubric and a reproduction`;
  const evidence = raw.evidence;
  if (evidence !== undefined && !(Array.isArray(evidence) && evidence.every(isEvidenceEntry))) return 'evidence entries must look like <kind>:<ref> with a kind of doc, code, test or diff';
  if (raw.class === 'goal-risk' && (evidence === undefined || evidence.length === 0)) return 'a goal-risk needs evidence';
  return null;
}

function servesChain(target, { criteria, mustNots }) {
  if (typeof target !== 'string') return false;
  if (GOAL_TARGETS.includes(target)) return true;
  const label = /^([cm])([1-9]\d*)$/.exec(target);
  return label !== null && Number(label[2]) <= (label[1] === 'c' ? criteria : mustNots);
}

export class PacketError extends Error {
  /** @param {string} rule @param {Finding[]} findings */
  constructor(rule, findings) {
    super(findings.map((f) => `${f.rule}: ${f.message}`).join('\n'));
    this.name = 'PacketError';
    this.rule = rule;
    this.findings = findings;
  }
}

const refuse = (rule, message, path) => new PacketError(rule, [{ rule, message, ...(path === undefined ? {} : { path }) }]);

/**
 * The delta documents a card lists that sit in the local docs store, read as the packet shows them. A delta absent from
 * the store is left out (the local manifest records it as null). One that is a link, not a regular file or unreadable is
 * refused by name, never skipped.
 * @param {ReturnType<typeof resolveProjectRoots>} roots
 * @param {string[]} paths logical paths from deltaDeliverables
 * @returns {Array<{ path: string, text: string }>}
 */
function localDeltaTexts(roots, paths) {
  const found = [];
  for (const path of paths) {
    const target = resolveProjectPath(roots, path);
    let info;
    try {
      info = lstatSync(target);
    } catch (cause) {
      if (cause.code === 'ENOENT') continue;
      throw refuse('packet-delta-unreadable', `Delta document ${path} cannot be read from the local store (${cause.message}). Repair local-store access.`, path);
    }
    if (!info.isFile()) {
      throw refuse('packet-delta-unreadable', `Delta document ${path} in the local store is not a regular file (a folder or a link). Replace it with the delta file.`, path);
    }
    try {
      found.push({ path, text: lf(readFileSync(target, 'utf8')) });
    } catch (cause) {
      throw refuse('packet-delta-unreadable', `Delta document ${path} cannot be read from the local store (${cause.message}). Repair local-store access.`, path);
    }
  }
  return found;
}

/** A document that is not in Git, written as the new-file block Git would print for it. */
function newFileBlock({ path, text }) {
  const rows = text === '' ? [] : text.replace(/\n$/, '').split('\n');
  return [
    `diff --git a/${path} b/${path}`,
    'new file mode 100644',
    ...(rows.length === 0 ? [] : ['--- /dev/null', `+++ b/${path}`, `@@ -0,0 +1,${rows.length} @@`, ...rows.map((row) => `+${row}`), ...(text.endsWith('\n') ? [] : ['\\ No newline at end of file'])]),
  ].join('\n');
}

/**
 * One line per brief-only re-freeze: the brief's Design context list changed after the card was built.
 * @param {Array<{ at: string, reason: string }> | undefined} amendments
 * @returns {string[]}
 */
const amendmentLines = (amendments) =>
  (amendments ?? []).map(({ at, reason }) => `Reviewer brief amended after the freeze (Design context list only) at ${at}: ${reason.replace(/\s+/g, ' ')}`);

const READING_ORDER = `Read the sections in order. Write \`restatement\` before you read section 3. At product tier and up, write \`verification_plan\` from section 1 alone before you read section 3.`;

const VERIFICATION_PLAN_SECTION = `Before you read section 3, write \`verification_plan\`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.`;

/**
 * Builds the one file the reviewer receives and writes it to the card folder, only after every refusal check passed.
 * @param {string} projectDir
 * @param {string} id
 * @param {GateOptions & { now?: Date }} [options]
 * @returns {PacketResult}
 */
export function buildPacket(projectDir, id, options = {}) {
  const { now = new Date(), ...gateOptions } = options;
  const roots = resolveProjectRoots(projectDir);
  const run = gateOptions.run ?? runGit;
  if (!isCardId(id)) throw new BoardError(`"${id}" is not a card id (like 0001-some-title). Check the id with the board listing.`);
  const card = readCard(projectDir, id);
  const located = cardPath(projectDir, id);
  if (located.column !== '04_review') {
    throw refuse('packet-wrong-column', `Card ${id} is in ${humanColumn(located.column)}; a review packet is built for a card in review. Move it to review first.`);
  }

  const resolved = effectiveTier(projectDir, card);
  if (resolved.warning !== null && resolved.source !== 'card') {
    throw refuse(
      'packet-cycle-unreadable',
      `Card ${id} is in cycle ${located.cycle}, which cannot be read, so a stricter cycle tier could be dropped from this review. ${resolved.warning} ` +
        `Fix or recreate the cycle's CYCLE.md, or set a tier on the card.`,
    );
  }
  const concerns = effectiveConcerns(projectDir, card).tiers;
  // The packet is held to the card's review concern; when every concern agrees that is the tier.
  const tier = concerns.review;
  const { findings: gate } = gateFindings({ projectDir, card, from: '03_in_progress', to: '04_review', tier: resolved.tier, concerns }, gateOptions);
  if (gate.length) throw new PacketError('packet-gate-findings', gate);

  // The brief is read once: the objective, the design context, the verbatim copy and the unfrozen hash all use this text.
  const briefText = readBriefText(projectDir, id);
  const { objective, missing } = parseObjective(briefText);
  if (objective === null) {
    throw refuse(
      'packet-objective-missing',
      `The reviewer brief has no complete objective chain: missing ${missing.join(', ')}. Start it with an "## Objective" section (copy .process/core/templates/reviewer-brief.md; in the Aperture checkout it is core/templates/reviewer-brief.md), then freeze it again.`,
      CARD_FILES.reviewerBrief,
    );
  }
  const chain = { criteria: card.criteria.length, mustNots: objective.mustNots.length };

  const record = /** @type {any} */ (card).freeze;
  const frozen = record !== undefined && validateFreeze(record).length === 0;
  const hashes = frozen ? { ...freezeHashes(card, briefText), ...record } : freezeHashes(card, briefText);

  const deltaPaths = deltaDeliverables(projectDir, card);
  const { base: baseSha, patch: gitPatch, omitted, included, sha256: diffHash } = reviewPatch(projectDir, /** @type {string} */ (gateOptions.base ?? /** @type {any} */ (card).base_commit), run, { include: deltaPaths });
  // In local-docs mode the delta files are outside the checkout, so Git cannot show them: they are read from the store and
  // appended as new files. Their bytes are pinned by the local manifest below, not by the diff hash.
  const localDeltas = roots.mode === 'local' ? localDeltaTexts(roots, deltaPaths) : [];
  const deltas = [...new Set([...included, ...localDeltas.map(({ path }) => path)])].sort();
  const patch = localDeltas.length === 0 ? gitPatch : [gitPatch.replace(/\n*$/, ''), ...localDeltas.map(newFileBlock)].filter((part) => part !== '').join('\n') + '\n';
  const shortBase = baseSha.slice(0, 7);
  const frozenTests = frozenTestsSection(projectDir, card, baseSha, run);

  const specPath = `${WORK_ROOT}/${id}/${CARD_FILES.spec}`;
  const specText = roots.mode === 'local' ? (existsSync(workFile(projectDir, id, CARD_FILES.spec)) ? readFileSync(workFile(projectDir, id, CARD_FILES.spec), 'utf8') : null) : fileAtCommit(projectDir, baseSha, specPath, run);
  if (roots.mode !== 'local' && specText === null && existsSync(workFile(projectDir, id, CARD_FILES.spec))) {
    throw refuse(
      'packet-context-missing',
      `${CARD_FILES.spec} exists only in the working tree, not at the base commit ${shortBase}. Commit the shaping documents before the move to in progress.`,
      CARD_FILES.spec,
    );
  }

  // card.md is read as it stood at the base (the card folder may have sat in any column of its cycle then), so the builder
  // cannot change the contract the reviewer judges against. The exceptions log is read as it is now: it is written during the work.
  const cardMdAtBase = contractAtBase({ projectDir, roots, id, cycle: located.cycle, name: CONTRACT_FILES.card, baseSha, run });
  const liveCard = readContractFile(projectDir, id, CONTRACT_FILES.card);
  if (roots.mode !== 'local' && cardMdAtBase === null && liveCard?.text) {
    throw refuse(
      'packet-context-missing',
      `${CONTRACT_FILES.card} exists only in the working tree, not at the base commit ${shortBase}. Commit the ticket before the move to in progress.`,
      CONTRACT_FILES.card,
    );
  }
  const contextText = readContractFile(projectDir, id, CONTRACT_FILES.context)?.text ?? '';
  const exceptionsBody = sectionBody(contextText, 'Scope exceptions') ?? '';
  const accepted = parseScopeExceptions(contextText);
  const rowCell = (text) => String(text).replace(/\s+/g, ' ').replaceAll('|', '\\|');
  const acceptedTable = ['| Date | Path | Kind | Reason | Approved by |', '| --- | --- | --- | --- | --- |', ...accepted.map((e) => `| ${rowCell(e.date)} | \`${rowCell(e.path)}\` | ${e.kind} | ${rowCell(e.reason)} | ${rowCell(e.approvedBy)} |`)].join('\n');
  const otherLines = exceptionsBody.split('\n').filter((row) => row.trim() !== '' && !/^\s*\|?\s*(date\b|:?-{2,})/i.test(row)).length - accepted.length;
  const notShown = otherLines > 0 ? `\n\n${otherLines} other ${otherLines === 1 ? 'line' : 'lines'} in the section ${otherLines === 1 ? 'was' : 'were'} not shown.` : '';
  const exceptionsBlock = `### Scope exceptions log (as of now, written during the work)\n\n${accepted.length === 0 ? 'No scope exceptions are logged.' : `Each row is a change outside the card's scope that its lead approved. A builder who can edit the card folder can add a row, so the human gate is the backstop.\n\n${acceptedTable}`}${notShown}`;

  const { contexts, problems: contextProblems } = readDesignContexts({ projectDir, roots, briefText, baseSha, run });
  if (contextProblems.length) throw new PacketError(contextProblems[0].rule, contextProblems);

  const head = headCommit(projectDir, { short: false, run });
  const localCardRoot = roots.mode === 'local' ? `docs/${relative(roots.docsRoot, located.dir).replaceAll('\\', '/')}` : null;
  const localManifest = roots.mode === 'local' ? {
    ...localLivingHashes(projectDir),
    ...localDocsHashes(projectDir, [
      ...(Array.isArray(card.docs_impact) ? card.docs_impact : []),
      ...contexts.map(({ path }) => path).filter((path) => path.startsWith('docs/')),
      specPath,
      ...deltaPaths,
      `${localCardRoot}/${CONTRACT_FILES.card}`,
      `${localCardRoot}/${CONTRACT_FILES.context}`,
      `${localCardRoot}/${CARD_FILES.reviewerBrief}`,
    ]),
  } : null;
  const localManifestHash = localManifest === null ? null : sha256(JSON.stringify(localManifest));

  let rounds;
  try {
    rounds = readRounds(projectDir, id);
  } catch (err) {
    if (!(err instanceof RoundsError)) throw err;
    throw refuse('packet-rounds-invalid', `The review state for card ${id} cannot be read. ${err.message} Fix or delete ${CARD_FILES.rounds} in the card folder, or run node core/scripts/rounds.mjs status to see its state.`, `${cardPath(projectDir, id).dir}/${CARD_FILES.rounds}`);
  }
  const showPlan = TIERS.indexOf(tier) >= TIERS.indexOf('product');
  const specBlock = specText === null ? 'No spec.md for this card.' : `### spec.md ${roots.mode === 'local' ? '(uncommitted local snapshot)' : `as of base ${shortBase}`}\n\n${fenced(specText)}`;
  const blocks = contractBlocks(card, objective);
  const frontmatter = [
    '---',
    'type: review-packet',
    `card: ${id}`,
    `tier: ${tier}`,
    `built_at: ${now.toISOString()}`,
    `base: ${baseSha}`,
    `head: ${head}`,
    `frozen: ${frozen}`,
    `brief_sha256: ${hashes.brief_sha256}`,
    `manifest_sha256: ${hashes.manifest_sha256}`,
    `criteria_sha256: ${hashes.criteria_sha256}`,
    `scope_sha256: ${hashes.scope_sha256}`,
    `diff_sha256: ${diffHash}`,
    ...(localManifestHash === null ? [] : [`local_docs_sha256: ${localManifestHash}`]),
    `omitted_paths: ${omitted}`,
    `criteria_count: ${chain.criteria}`,
    `must_not_count: ${chain.mustNots}`,
    '---',
  ].join('\n');

  /** @type {Array<{ key: string, number: number | null, text: string }>} */
  const sections = [
    {
      key: 'header',
      number: null,
      text: [frontmatter, `# Review packet: ${id}`, ...(frozen ? [] : [card.type === 'bug' ? 'Reviewer brief not frozen (bug fast path).' : 'Reviewer brief not frozen.']), ...amendmentLines(frozen ? record.brief_amendments : undefined), READING_ORDER].join('\n\n'),
    },
    {
      key: 'objective-and-contract',
      number: 1,
      text: [
        '## 1. Objective and contract',
        blocks.objective,
        blocks.criteria,
        blocks.mustNots,
        `### Reviewer brief\n\n${fenced(briefText)}`,
        specBlock,
        cardMdAtBase === null ? 'No card.md for this card.' : `### card.md ${roots.mode === 'local' ? '(uncommitted local snapshot)' : `as of base ${shortBase}`}\n\n${fenced(cardMdAtBase)}`,
        exceptionsBlock,
        blocks.manifest,
      ].join('\n\n'),
    },
    ...(showPlan ? [{ key: 'verification-plan', number: 2, text: `## 2. Your verification plan\n\n${VERIFICATION_PLAN_SECTION}` }] : []),
    {
      key: 'design-context',
      number: 3,
      text: ['## 3. Design context', ...(contexts.length ? contexts.map(({ path, text }) => `### ${path}${roots.mode === 'local' && path.startsWith('docs/') ? ' (uncommitted local snapshot)' : ''}\n\n${fenced(text)}`) : ['No design context was listed in the reviewer brief.']),
        ...(localManifest === null ? [] : [`### Uncommitted local documents\n\nThese exact byte hashes were present when this packet was built. Local documents are outside Git; a later edit requires a new review.\n\n${fenced(JSON.stringify(localManifest, null, 2), 'json')}`])].join('\n\n'),
    },
    ...(frozenTests.text === null ? [] : [{ key: 'frozen-tests', number: null, text: frozenTests.text }]),
    {
      key: 'diff',
      number: 4,
      text: [
        '## 4. Diff',
        `${omitted} paths under docs/ephemeral/ omitted (process material, not part of the work under review).`,
        ...(deltas.length ? [`Delta documents shown below as the card's own deliverables: ${deltas.join(', ')}.`] : []),
        fenced(patch, 'diff'),
      ].join('\n\n'),
    },
    ...(rounds.rounds.length ? [{ key: 'earlier-findings', number: 5, text: `## 5. Earlier findings and replies

${renderEarlierFindings(rounds)}` }] : []),
    { key: 'output', number: null, text: `## Output\n\n${REVIEW_OUTPUT_INSTRUCTIONS}` },
  ];

  const stageBytes = Object.fromEntries(sections.map(({ key, text }) => [key, Buffer.byteLength(text, 'utf8')]));
  const packetFile = cardFile(projectDir, id, CARD_FILES.packet);

  const secrets = secretFindings(sections, { file: CARD_FILES.packet, noun: 'packet', sources: 'a design context doc, the spec, the brief or the diff' });
  if (secrets.length) throw new PacketError('packet-secret', secrets);

  const text = `${sections.map((section) => section.text).join('\n\n')}\n`;
  if (Buffer.byteLength(text, 'utf8') > PACKET_MAX_BYTES) {
    const sizes = Object.entries(stageBytes).map(([key, bytes]) => `${key} ${bytes}`).join(', ');
    throw refuse(
      'packet-too-large',
      `The packet is ${Buffer.byteLength(text, 'utf8')} bytes, over the ${PACKET_MAX_BYTES} limit a reviewer reads whole. Section sizes in bytes: ${sizes}. Trim the design context list, split the card, or shrink the diff; nothing was written.`,
      CARD_FILES.packet,
    );
  }

  writeFileSync(packetFile, text);
  const { text: _section, ...frozenResult } = frozenTests;
  return { path: packetFile, text, sha256: sha256(text), diff_sha256: diffHash, tier, chain, frozen, omitted, stageBytes, frozenTests: frozenResult, deltas };
}

