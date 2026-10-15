/** Lowercase letters and digits in words joined by single hyphens: the shape of every pack, tag and stage name. */
export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @param {unknown} value
 * @returns {boolean} true when value is a kebab-case string
 */
export const isKebab = (value) => typeof value === 'string' && KEBAB.test(value);
