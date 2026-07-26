const HOST =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.wd\d+)?\.myworkdayjobs\.com$/;

function endpoint(entry) {
  try {
    const url = new URL(entry.careers_url || '');
    const site = url.pathname.split('/').filter(Boolean)[0];
    const tenant = url.hostname.split('.')[0];
    if (
      url.protocol !== 'https:' ||
      !HOST.test(url.hostname) ||
      !site ||
      !/^[a-z0-9_-]+$/i.test(site)
    ) {
      return null;
    }
    return {
      api: `https://${url.hostname}/wday/cxs/${tenant}/${site}/jobs`,
      origin: url.origin,
      site,
    };
  } catch {
    return null;
  }
}

export default {
  id: 'workday',
  kind: 'ats',
  detect(entry) {
    const value = endpoint(entry);
    return value ? { url: value.api } : null;
  },
  async fetch(entry, context) {
    const value = endpoint(entry);
    if (!value) throw new Error('workday: invalid careers URL');
    const jobs = [];
    const limit = 20;
    const maxPages = Math.min(Number(entry.max_pages) || 5, 50);
    for (let page = 0; page < maxPages; page++) {
      const payload = await context.fetchJson(value.api, {
        method: 'POST',
        redirect: 'error',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          origin: value.origin,
          referer: `${value.origin}/${value.site}/`,
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit,
          offset: page * limit,
          searchText: '',
        }),
      });
      const postings = Array.isArray(payload?.jobPostings)
        ? payload.jobPostings
        : [];
      jobs.push(
        ...postings.map((job) => ({
          title: job.title,
          url: new URL(job.externalPath || '', value.origin).toString(),
          company: entry.name,
          location: job.locationsText,
        })),
      );
      if (postings.length < limit || jobs.length >= Number(payload.total))
        break;
    }
    return jobs;
  },
};
