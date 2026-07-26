export default {
  id: 'browser',
  kind: 'ats',
  async fetch(entry, context) {
    if (typeof context.browserExtract !== 'function') {
      throw new Error('browser: browser extraction context is unavailable');
    }
    return context.browserExtract(entry);
  },
};
