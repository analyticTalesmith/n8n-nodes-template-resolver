/** An ISO 8601 timestamp with a time zone, such as `2026-10-14T01:02:03Z`. */
export const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** A calendar date written `YYYY-MM-DD`; the pattern alone, not whether the day exists. */
export const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {unknown} value
 * @returns {boolean} true when value is a string in the timestamp pattern
 */
export const isIsoTimestamp = (value) => typeof value === 'string' && ISO_TIMESTAMP.test(value);

/**
 * @param {unknown} value
 * @returns {boolean} true when value matches DATE and names a day that exists on the calendar
 */
export function isRealDate(value) {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * @param {Date} [now]
 * @returns {string} the UTC day, YYYY-MM-DD
 */
export const isoDate = (now = new Date()) => now.toISOString().slice(0, 10);
