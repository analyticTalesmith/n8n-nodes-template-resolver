import { cardPath } from '../board.mjs';
import { shapeFindings } from '../cycle-shape.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The stage phases a card must have recorded before it moves, by the edge it takes. */
const PHASES_BY_EDGE = Object.freeze({ '01_shaping>02_ready': ['down'] });

/**
 * A card in a cycle may move to ready only when its cycle records why it has its shape and every down-leg stage of
 * that shape is done with evidence or skipped with a reason. A backlog card has no cycle and is not held to this.
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
    if (cause.name === 'CycleError' || cause.code === 'ENOENT') return [];
    throw cause;
  }
}
