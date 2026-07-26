export default {
  id: 'arbeitnow',
  kind: 'source',
  async fetch(entry, context) {
    const payload = await context.fetchJson(
      'https://www.arbeitnow.com/api/job-board-api',
      { redirect: 'error' },
    );
    if (!Array.isArray(payload?.data)) {
      throw new Error('arbeitnow: expected a data array');
    }
    return payload.data.map((job) => ({
      title: job.title,
      url: job.url,
      company: job.company_name || entry.name,
      location: [job.location, job.remote ? 'Remote' : '']
        .filter(Boolean)
        .join(', '),
      description: job.description,
      postedAt: Number(job.created_at) * 1000,
    }));
  },
};
