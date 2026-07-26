import { parseSafeUrl } from '../network-policy.mjs';
import { assessJobTrust } from './_trust.mjs';

function clean(value, maxLength = 20_000) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeUrl(value) {
  try {
    return parseSafeUrl(clean(value, 4_096)).toString();
  } catch {
    return '';
  }
}

export function normalizeProviderJobs(provider, entry, rawJobs) {
  if (!Array.isArray(rawJobs)) {
    throw new Error(`${provider.id}: fetch() must return an array`);
  }

  const normalized = [];
  const seen = new Set();
  for (const raw of rawJobs) {
    if (!raw || typeof raw !== 'object') continue;
    const title = clean(raw.title, 500);
    const url = normalizeUrl(raw.url);
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);
    const postedAt = Number(raw.postedAt);
    const job = {
      title,
      url,
      company: clean(raw.company || entry.name, 500),
      location: clean(raw.location, 1_000),
      provider: provider.id,
      source: clean(entry.name || provider.id, 500),
    };
    if (clean(raw.description)) {
      job.description = clean(raw.description);
    }
    if (Number.isFinite(postedAt) && postedAt >= 0) {
      job.postedAt = postedAt;
    }
    for (const [source, target] of [
      ['salaryMin', 'salaryMin'],
      ['salaryMax', 'salaryMax'],
    ]) {
      const value = Number(raw[source]);
      if (Number.isFinite(value) && value >= 0) job[target] = value;
    }
    if (raw.salaryCurrency) {
      job.salaryCurrency = clean(raw.salaryCurrency, 10).toUpperCase();
    }
    if (raw.salaryInterval) {
      job.salaryInterval = clean(raw.salaryInterval, 30);
    }
    Object.assign(job, assessJobTrust(job));
    normalized.push(job);
  }
  return normalized;
}

export async function fetchNormalized(provider, entry, context) {
  return normalizeProviderJobs(
    provider,
    entry,
    await provider.fetch(entry, context),
  );
}
