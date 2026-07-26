export default {
  id: 'remotive',
  kind: 'source',
  async fetch(entry, context) {
    const payload = await context.fetchJson(
      'https://remotive.com/api/remote-jobs',
      { redirect: 'error' },
    );
    if (!Array.isArray(payload?.jobs)) {
      throw new Error('remotive: expected a jobs array');
    }
    return payload.jobs.map((job) => ({
      title: job.title,
      url: job.url,
      company: job.company_name || entry.name,
      location: job.candidate_required_location,
      description: job.description,
      postedAt: Date.parse(job.publication_date),
    }));
  },
};
