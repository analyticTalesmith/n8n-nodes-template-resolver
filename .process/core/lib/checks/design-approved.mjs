import { ApprovalError } from '../approval.mjs';
import { BoardError, cardPath } from '../board.mjs';
import { blastRadiusOf } from '../card.mjs';
import { CycleError, readCycle } from '../cycle.mjs';
import { DesignApprovalError, designApprovalState, readDesignApproval } from '../design-approval.mjs';
import { PathError } from '../files.mjs';
import { ProjectRootsError } from '../project-roots.mjs';

/** A front cycle admits its planned cards and narrowly scoped bug or security fixes. */
export function checkDesignApproved({ projectDir, card }) {
  try {
    return inspectDesignApproval(projectDir, card);
  } catch (cause) {
    if (!(cause instanceof ApprovalError || cause instanceof BoardError || cause instanceof CycleError ||
      cause instanceof DesignApprovalError || cause instanceof PathError || cause instanceof ProjectRootsError ||
      cause?.code === 'ENOENT' || cause?.code === 'EACCES' || cause?.code === 'EPERM')) throw cause;
    return { findings: [{ rule: 'design-approval-unverifiable', message: `Cannot verify the cycle design approval: ${cause.message}. Repair the cycle or approval record before moving this card.` }], skipped: null };
  }
}

function inspectDesignApproval(projectDir, card) {
  const location = cardPath(projectDir, card.id);
  if (!location?.cycle) return { findings: [], skipped: 'the card is not in a cycle' };
  const cycle = readCycle(projectDir, location.cycle);
  if (cycle.approvals !== 'front') return { findings: [], skipped: "the cycle's approvals are not front" };
  const state = designApprovalState(projectDir, location.cycle);
  if (state.state === 'absent' || state.state === 'unapproved') {
    return { findings: [{ rule: 'design-not-approved', message: `Create ${location.cycle}/design-approval.md and have a person run approve-design.mjs before moving cards to ready.` }], skipped: null };
  }
  if (state.state === 'stale') {
    return { findings: [{ rule: 'design-approval-stale', message: `Design approval changed at ${state.stale.join(', ')}. A person must review the change and run approve-design.mjs again.` }], skipped: null };
  }
  const approval = readDesignApproval(projectDir, location.cycle);
  if (approval.cards.includes(card.id)) return { findings: [], skipped: null };
  const findings = [];
  if (!['bug', 'security'].includes(card.type)) {
    findings.push({ rule: 'card-not-approved', message: `Card ${card.id} is not listed in design-approval.md cards. A person must approve it.` });
  }
  const outside = blastRadiusOf(card).filter((module) => !approval.modules.includes(module));
  if (outside.length || blastRadiusOf(card).length === 0) {
    findings.push({ rule: 'card-not-approved', message: `Card ${card.id} reaches ${outside.length ? outside.join(', ') : 'an unspecified module'} outside the approved modules.` });
  }
  const portablePath = (path) => typeof path === 'string' ? path.replaceAll('\\', '/').toLowerCase() : '';
  const approvedPaths = new Set(approval.approves.map((entry) => portablePath(entry.path)));
  for (const path of ['add', 'edit', 'remove'].flatMap((kind) => card.manifest?.[kind] ?? [])) {
    if (approvedPaths.has(portablePath(path))) findings.push({ rule: 'card-not-approved', message: `Card ${card.id} changes approved document ${path}; a person must approve it.` });
  }
  return { findings, skipped: null };
}
