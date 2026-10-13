/**
 * The concerns a tier is split into. Each concern resolves on its own, card then cycle then project, and the nearest
 * layer that sets it wins in both directions.
 */
export const CONCERNS = Object.freeze(['code-hygiene', 'test-depth', 'documentation', 'review', 'approvals', 'release']);

/** The words used when a concern is printed. */
export const CONCERN_WORDS = Object.freeze({
  'code-hygiene': 'code hygiene',
  'test-depth': 'test depth',
  documentation: 'docs',
  review: 'review',
  approvals: 'approvals',
  release: 'release handling',
});

/** The concern each gate check belongs to. A check runs when its concern resolves at or above the check's minimum. */
export const CHECK_CONCERN = Object.freeze({
  'no-ids': 'code-hygiene',
  spec: 'documentation',
  'design-approved': 'approvals',
  'reviewer-brief': 'review',
  frozen: 'approvals',
  manifest: 'code-hygiene',
  'card-contract': 'documentation',
  'test-levels': 'test-depth',
  'docs-impact': 'documentation',
  boundary: 'code-hygiene',
  secrets: 'code-hygiene',
  'review-recorded': 'review',
  'review-clear': 'review',
  ownership: 'code-hygiene',
  'tests-fail-first': 'test-depth',
  'card-gate': 'test-depth',
  'test-amendments': 'test-depth',
  'front-end-css': 'code-hygiene',
  'front-end-contrast': 'code-hygiene',
  'front-end-tools': 'code-hygiene',
  baselines: 'test-depth',
  'index-fresh': 'documentation',
  'living-state': 'documentation',
  'living-via-delta': 'documentation',
  'verification-recorded': 'test-depth',
  'evidence-cited': 'review',
  'claim-checked': 'review',
  'stance-hardened': 'code-hygiene',
  'cycle-shape-recorded': 'documentation',
  'efv-orphans': 'documentation',
  'rule-has-test': 'test-depth',
  'actor-has-action': 'documentation',
  'interface-has-contract-test': 'test-depth',
  'boundary-covered': 'review',
  'atom-size': 'documentation',
  'deliverable-cites': 'documentation',
  'deliverable-fresh': 'documentation',
  'user-docs-updated': 'documentation',
});

export const concernKey = (concern) => `concern_${concern.replaceAll('-', '_')}`;
