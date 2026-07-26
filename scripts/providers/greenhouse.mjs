const HOSTS = new Set([
  'boards-api.greenhouse.io',
  'boards.greenhouse.io',
  'job-boards.eu.greenhouse.io',
  'job-boards.greenhouse.io',
]);

function endpoint(entry) {
  if (entry.api) {
    const url = new URL(entry.api);
    if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) {
      throw new Error('greenhouse: API must use an official HTTPS host');
    }
    return url.toString();
  }
  const match = String(entry.careers_url || '').match(
    /job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/,
  );
  return match
    ? `https://boards-api.greenhouse.io/v1/boards/${match[1]}/jobs`
    : null;
}

export default {
  id: 'greenhouse',
  kind: 'ats',
  detect(entry) {
    try {
      const url = endpoint(entry);
      return url ? { url } : null;
    } catch {
      return null;
    }
  },
  async fetch(entry, context) {
    const url = endpoint(entry);
    if (!url) throw new Error('greenhouse: cannot derive board endpoint');
    const payload = await context.fetchJson(url, { redirect: 'error' });
    return (Array.isArray(payload?.jobs) ? payload.jobs : []).map((job) => ({
      title: job.title,
      url: job.absolute_url,
      company: entry.name,
      location: job.location?.name,
      postedAt: Date.parse(job.first_published),
    }));
  },
};
