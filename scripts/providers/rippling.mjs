function slug(entry) {
  try {
    const url = new URL(entry.careers_url || '');
    const tenant = url.pathname.split('/').filter(Boolean)[0] || '';
    return url.protocol === 'https:' &&
      url.hostname === 'ats.rippling.com' &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(tenant)
      ? tenant
      : null;
  } catch {
    return null;
  }
}

export default {
  id: 'rippling',
  kind: 'ats',
  detect(entry) {
    const tenant = slug(entry);
    return tenant
      ? {
          url: `https://api.rippling.com/platform/api/ats/v1/board/${tenant}/jobs`,
        }
      : null;
  },
  async fetch(entry, context) {
    const tenant = slug(entry);
    if (!tenant) throw new Error('rippling: invalid careers URL');
    const payload = await context.fetchJson(
      `https://api.rippling.com/platform/api/ats/v1/board/${tenant}/jobs`,
      { redirect: 'error' },
    );
    return (Array.isArray(payload) ? payload : []).map((job) => ({
      title: job.name,
      url: job.url,
      company: entry.name,
      location: job.workLocation?.label || job.workLocation,
    }));
  },
};
