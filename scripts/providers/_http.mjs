import { safeFetchJson, safeFetchText } from '../network-policy.mjs';

export function makeHttpContext(overrides = {}) {
  const context = {
    transport: 'http',
    fetchJson: overrides.fetchJson || safeFetchJson,
    fetchText: overrides.fetchText || safeFetchText,
    sleep:
      overrides.sleep ||
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds))),
  };
  if (overrides.browserExtract) {
    context.browserExtract = overrides.browserExtract;
  }
  return Object.freeze(context);
}
