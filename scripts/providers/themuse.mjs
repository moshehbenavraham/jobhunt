export default {
  id: 'themuse',
  kind: 'source',
  async fetch(entry, context) {
    const payload = await context.fetchJson(
      'https://www.themuse.com/api/public/jobs?page=0',
      { redirect: 'error' },
    );
    if (!Array.isArray(payload?.results)) {
      throw new Error('themuse: expected a results array');
    }
    return payload.results.map((job) => ({
      title: job.name,
      url: job.refs?.landing_page,
      company: job.company?.name || entry.name,
      location: job.locations?.[0]?.name,
      description: job.contents,
    }));
  },
};
