/**
 * The shared review vocabulary and the shape of a returned review. Imports nothing, so any module can use it.
 * @typedef {{ title: string, class: string, serves: { target: string, scenario: string }, rubric: string, reproduction: string, evidence: string[], location: string | null }} ReviewFinding
 * @typedef {{ finding: string, verdict: 'sustain' | 'withdraw', evidence: string[] }} ReviewResponse
 * @typedef {{ restatement: string, brief_mismatch: string | null, verification_plan: string[], findings: ReviewFinding[], responses: ReviewResponse[] }} ValidReview
 * @typedef {{ criteria: number, mustNots: number }} Chain
 */

export const FINDING_CLASSES = Object.freeze(['defect', 'goal-risk', 'drift', 'simplification']);
export const GOAL_TARGETS = Object.freeze(['card-goal', 'cycle-goal', 'project-goal']);
export const EVIDENCE_KINDS = Object.freeze(['doc', 'code', 'test', 'diff']);
export const RESPONSE_VERDICTS = Object.freeze(['sustain', 'withdraw']);
export const RULINGS = Object.freeze(['sustain', 'withdraw', 'drift']);

/**
 * True for `<kind>:<ref>` with a kind in EVIDENCE_KINDS and a non-empty ref.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEvidenceEntry(value) {
  if (typeof value !== 'string') return false;
  const colon = value.indexOf(':');
  if (colon === -1) return false;
  return EVIDENCE_KINDS.includes(value.slice(0, colon)) && value.slice(colon + 1).trim() !== '';
}
