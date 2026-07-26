const HOST = 'jobs.ashbyhq.com';

function slug(entry) {
  const url = new URL(entry.careers_url || '');
  return url.protocol === 'https:' && url.hostname === HOST
    ? url.pathname.split('/').filter(Boolean)[0]
    : null;
}

export default {
  id: 'ashby',
  kind: 'ats',
  detect(entry) {
    try {
      const company = slug(entry);
      return company
        ? {
            url: `https://api.ashbyhq.com/posting-api/job-board/${company}`,
          }
        : null;
    } catch {
      return null;
    }
  },
  async fetch(entry, context) {
    const company = slug(entry);
    if (!company) throw new Error('ashby: invalid careers URL');
    const payload = await context.fetchJson(
      `https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`,
      { redirect: 'error', timeoutMs: 30_000 },
    );
    return (Array.isArray(payload?.jobs) ? payload.jobs : []).map((job) => ({
      title: job.title,
      url: job.jobUrl,
      company: entry.name,
      location: job.location,
      description: job.descriptionPlain,
      postedAt: Date.parse(job.publishedAt),
    }));
  },
};
