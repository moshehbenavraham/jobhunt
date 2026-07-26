export default {
  id: 'jobicy',
  kind: 'source',
  async fetch(entry, context) {
    const payload = await context.fetchJson(
      'https://jobicy.com/api/v2/remote-jobs?count=50',
      { redirect: 'error' },
    );
    if (!Array.isArray(payload?.jobs)) {
      throw new Error('jobicy: expected a jobs array');
    }
    return payload.jobs.map((job) => ({
      title: job.jobTitle,
      url: job.url,
      company: job.companyName || entry.name,
      location: job.jobGeo,
      description: job.jobExcerpt,
      postedAt: Date.parse(job.pubDate),
    }));
  },
};
