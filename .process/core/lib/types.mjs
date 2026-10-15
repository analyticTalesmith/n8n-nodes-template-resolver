/**
 * Not null, an object and not an array. A Date counts, as it did in every copy this replaces.
 * @param {unknown} value
 * @returns {boolean}
 */
export const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
