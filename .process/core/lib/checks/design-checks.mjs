import { readAtoms } from '../atom.mjs';
import { readDeliverables } from '../deliverable.mjs';
import { checkActorHasAction } from './actor-has-action.mjs';
import { checkAtomSize } from './atom-size.mjs';
import { checkBoundaryCovered } from './boundary-covered.mjs';
import { checkDeliverableCites } from './deliverable-cites.mjs';
import { checkDeliverableFreshness } from './deliverable-fresh.mjs';
import { readDesignAtoms } from './design-atoms.mjs';
import { checkEfvOrphans } from './efv-orphans.mjs';
import { checkInterfaceHasContractTest } from './interface-has-contract-test.mjs';
import { checkRuleHasTest } from './rule-has-test.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('../git.mjs').GitRunner} GitRunner */

/** The finding rule that is only advice: the gate lists it as a warning and never blocks on it. */
export const DESIGN_WARNING_RULES = Object.freeze(['atom-size']);

/**
 * The design-document gate checks, each run over the whole project's atoms or composed deliverables. All are quiet on
 * a project with none.
 * @type {Readonly<Record<string, (input: { projectDir: string, run?: GitRunner }) => Finding[]>>}
 */
export const DESIGN_DOC_CHECKS = Object.freeze({
  'efv-orphans': ({ projectDir }) => checkEfvOrphans({ atoms: readDesignAtoms(projectDir) }),
  'rule-has-test': ({ projectDir }) => checkRuleHasTest({ atoms: readDesignAtoms(projectDir) }),
  'actor-has-action': ({ projectDir }) => checkActorHasAction({ atoms: readDesignAtoms(projectDir) }),
  'interface-has-contract-test': ({ projectDir }) => checkInterfaceHasContractTest({ atoms: readDesignAtoms(projectDir) }),
  'boundary-covered': ({ projectDir }) => checkBoundaryCovered({ atoms: readDesignAtoms(projectDir) }),
  'atom-size': ({ projectDir }) => checkAtomSize({ atoms: readDesignAtoms(projectDir) }),
  'deliverable-cites': ({ projectDir }) => checkDeliverableCites({ deliverables: readDeliverables(projectDir), atoms: readAtoms(projectDir).atoms }),
  'deliverable-fresh': ({ projectDir, run }) => checkDeliverableFreshness({ projectDir, run }),
});
