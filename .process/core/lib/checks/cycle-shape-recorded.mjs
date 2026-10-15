import { cardPath } from '../board.mjs';
import { CycleError } from '../cycle.mjs';
import { shapeFindings } from '../cycle-shape.mjs';
import { STAGE, cyclePaths, edgeKey } from '../layout.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The stage phases a card must have recorded before it moves, by the edge it takes. */
const PHASES_BY_EDGE = Object.freeze({ [edgeKey(STAGE.shaping, STAGE.ready)]: ['down'] });

/**
 * A card in a cycle may move to ready only when its cycle records why it has its shape and every down-leg spine stage is
 * done, recorded with evidence or derived from its artifact. A suggested or available stage nobody touched does not block
 * it, and every recorded stage line must be valid. A backlog card has no cycle and is not held to this.
 * @param {{ projectDir: string, card: { id: string }, from: string, to: string }} context
 * @returns {Finding[]}
 */
export function checkCycleShapeRecorded({ projectDir, card, from, to }) {
  const cycle = cardPath(projectDir, card.id)?.cycle ?? null;
  if (cycle === null) return [];
  const phases = PHASES_BY_EDGE[`${from}>${to}`];
  if (phases === undefined) return [];
  try {
    return shapeFindings(projectDir, cycle, { phases });
  } catch (cause) {
    if (cause instanceof CycleError) {
      return [{ rule: 'cycle-shape-unreadable', path: cyclePaths(cycle).brief, message: `Cycle ${cycle} cannot be read, so its shape cannot be checked: ${cause.message} Repair the cycle brief.` }];
    }
    if (cause.code === 'ENOENT') return [];
    throw cause;
  }
}
