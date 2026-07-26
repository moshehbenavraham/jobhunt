const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.recruitee\.com$/;

function endpoint(entry) {
  try {
    const url = new URL(entry.careers_url || '');
    return url.protocol === 'https:' && HOST.test(url.hostname)
      ? `https://${url.hostname}/api/offers/`
      : null;
  } catch {
    return null;
  }
}

export default {
  id: 'recruitee',
  kind: 'ats',
  detect(entry) {
    const url = endpoint(entry);
    return url ? { url } : null;
  },
  async fetch(entry, context) {
    const url = endpoint(entry);
    if (!url) throw new Error('recruitee: invalid careers URL');
    const payload = await context.fetchJson(url, { redirect: 'error' });
    return (Array.isArray(payload?.offers) ? payload.offers : []).map(
      (job) => ({
        title: job.title,
        url: job.careers_url || job.url,
        company: entry.name,
        location:
          job.location ||
          [job.city, job.country, job.remote ? 'Remote' : '']
            .filter(Boolean)
            .join(', '),
        postedAt: Date.parse(job.published_at),
      }),
    );
  },
};
