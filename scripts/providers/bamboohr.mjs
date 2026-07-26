const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.bamboohr\.com$/;

function origin(entry) {
  for (const raw of [entry.api, entry.careers_url]) {
    try {
      const url = new URL(raw || '');
      if (url.protocol === 'https:' && HOST.test(url.hostname)) {
        return `https://${url.hostname}`;
      }
    } catch {
      // Try the next URL.
    }
  }
  return null;
}

export default {
  id: 'bamboohr',
  kind: 'ats',
  detect(entry) {
    const tenant = origin(entry);
    return tenant ? { url: `${tenant}/careers/list` } : null;
  },
  async fetch(entry, context) {
    const tenant = origin(entry);
    if (!tenant) throw new Error('bamboohr: invalid careers URL');
    const payload = await context.fetchJson(`${tenant}/careers/list`, {
      redirect: 'error',
    });
    return (Array.isArray(payload?.result) ? payload.result : [])
      .filter((job) => String(job?.id ?? '').trim())
      .map((job) => ({
        title: job.jobOpeningName,
        url: `${tenant}/careers/${encodeURIComponent(job.id)}`,
        company: entry.name,
        location: [
          job.location?.city,
          job.location?.state,
          job.isRemote ? 'Remote' : '',
        ]
          .filter(Boolean)
          .join(', '),
      }));
  },
};
