/**
 * @typedef {object} Job
 * @property {string} title
 * @property {string} url
 * @property {string} company
 * @property {string} location
 * @property {string} provider
 * @property {string} source
 * @property {number} [postedAt]
 * @property {string} [description]
 * @property {number} trustScore
 * @property {string[]} trustFlags
 * @property {'high'|'medium'|'low'} trustLevel
 */

/**
 * @typedef {object} Provider
 * @property {string} id
 * @property {'ats'|'source'} kind
 * @property {(entry: object) => ({url: string}|null)} [detect]
 * @property {(entry: object, context: object) => Promise<object[]>} fetch
 */

export {};
