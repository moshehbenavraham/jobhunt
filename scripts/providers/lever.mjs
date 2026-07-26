function tenant(entry) {
  const url = new URL(entry.careers_url || '');
  if (
    url.protocol !== 'https:' ||
    !['jobs.lever.co', 'jobs.eu.lever.co'].includes(url.hostname)
  ) {
    return null;
  }
  return {
    slug: url.pathname.split('/').filter(Boolean)[0],
    region: url.hostname === 'jobs.eu.lever.co' ? 'eu.' : '',
  };
}

export default {
  id: 'lever',
  kind: 'ats',
  detect(entry) {
    try {
      const value = tenant(entry);
      return value
        ? {
            url: `https://api.${value.region}lever.co/v0/postings/${value.slug}`,
          }
        : null;
    } catch {
      return null;
    }
  },
  async fetch(entry, context) {
    const value = tenant(entry);
    if (!value) throw new Error('lever: invalid careers URL');
    const jobs = await context.fetchJson(
      `https://api.${value.region}lever.co/v0/postings/${value.slug}`,
      { redirect: 'error' },
    );
    return (Array.isArray(jobs) ? jobs : []).map((job) => ({
      title: job.text,
      url: job.hostedUrl,
      company: entry.name,
      location: job.categories?.location,
      description: job.descriptionPlain,
      postedAt: Number(job.createdAt),
    }));
  },
};
