const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.pinpointhq\.com$/;

function endpoint(entry) {
  try {
    const url = new URL(entry.careers_url || '');
    return url.protocol === 'https:' && HOST.test(url.hostname)
      ? `https://${url.hostname}/postings.json`
      : null;
  } catch {
    return null;
  }
}

export default {
  id: 'pinpoint',
  kind: 'ats',
  detect(entry) {
    const url = endpoint(entry);
    return url ? { url } : null;
  },
  async fetch(entry, context) {
    const url = endpoint(entry);
    if (!url) throw new Error('pinpoint: invalid careers URL');
    const payload = await context.fetchJson(url, { redirect: 'error' });
    return (Array.isArray(payload?.data) ? payload.data : []).map((job) => ({
      title: job.title,
      url: job.url,
      company: entry.name,
      location:
        job.location?.name ||
        [job.location?.city, job.location?.province].filter(Boolean).join(', '),
    }));
  },
};
