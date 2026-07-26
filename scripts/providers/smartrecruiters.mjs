const CAREER_HOSTS = new Set([
  'careers.smartrecruiters.com',
  'jobs.smartrecruiters.com',
]);

function slug(entry) {
  for (const raw of [entry.api, entry.careers_url]) {
    try {
      const url = new URL(raw || '');
      if (url.protocol === 'https:' && CAREER_HOSTS.has(url.hostname)) {
        return url.pathname.split('/').filter(Boolean)[0] || null;
      }
    } catch {
      // Try the next configured URL.
    }
  }
  return null;
}

export default {
  id: 'smartrecruiters',
  kind: 'ats',
  detect(entry) {
    const company = slug(entry);
    return company
      ? {
          url: `https://api.smartrecruiters.com/v1/companies/${company}/postings`,
        }
      : null;
  },
  async fetch(entry, context) {
    const company = slug(entry);
    if (!company) throw new Error('smartrecruiters: invalid careers URL');
    const jobs = [];
    const maxPages = Math.min(Number(entry.max_pages) || 5, 50);
    for (let page = 0; page < maxPages; page++) {
      const payload = await context.fetchJson(
        `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100&offset=${page * 100}&status=PUBLIC`,
        { redirect: 'error' },
      );
      const content = Array.isArray(payload?.content) ? payload.content : [];
      jobs.push(
        ...content.map((job) => ({
          title: job.name,
          url: `https://jobs.smartrecruiters.com/${company}/${job.id}`,
          company: entry.name,
          location:
            job.location?.fullLocation ||
            [
              job.location?.city,
              job.location?.region,
              job.location?.country,
              job.location?.remote ? 'Remote' : '',
            ]
              .filter(Boolean)
              .join(', '),
          postedAt: Date.parse(job.releasedDate),
        })),
      );
      if (content.length < 100) break;
    }
    return jobs;
  },
};
