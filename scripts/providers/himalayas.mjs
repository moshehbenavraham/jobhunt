export default {
  id: 'himalayas',
  kind: 'source',
  async fetch(entry, context) {
    const payload = await context.fetchJson(
      'https://himalayas.app/jobs/api?limit=50',
      { redirect: 'error' },
    );
    if (!Array.isArray(payload?.jobs)) {
      throw new Error('himalayas: expected a jobs array');
    }
    return payload.jobs.map((job) => ({
      title: job.title,
      url: job.applicationLink || job.guid,
      company: job.companyName || entry.name,
      location: Array.isArray(job.locationRestrictions)
        ? job.locationRestrictions.join(', ')
        : '',
      description: job.description,
      postedAt:
        Number(job.pubDate) < 1_000_000_000_000
          ? Number(job.pubDate) * 1000
          : Date.parse(job.pubDate),
    }));
  },
};
