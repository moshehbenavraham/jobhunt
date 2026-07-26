export default {
  id: 'remoteok',
  kind: 'source',
  async fetch(entry, context) {
    const payload = await context.fetchJson('https://remoteok.com/api', {
      redirect: 'error',
    });
    if (!Array.isArray(payload)) throw new Error('remoteok: expected an array');
    return payload.map((job) => ({
      title: job.position,
      url: job.url,
      company: job.company || entry.name,
      location: job.location,
      description: job.description,
      postedAt: Number(job.epoch) * 1000,
    }));
  },
};
