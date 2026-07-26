function feed(entry) {
  try {
    const url = new URL(entry.careers_url || '');
    const company = url.pathname.split('/').filter(Boolean)[0];
    return url.protocol === 'https:' &&
      url.hostname === 'apply.workable.com' &&
      company
      ? `https://apply.workable.com/${company}/jobs.md`
      : null;
  } catch {
    return null;
  }
}

export function parseWorkableMarkdown(text, company) {
  const jobs = [];
  for (const line of String(text || '').split('\n')) {
    if (!line.startsWith('|') || !line.includes('[View]')) continue;
    const columns = line.split('|').map((value) => value.trim());
    const match = line.match(
      /\[View\]\((https:\/\/apply\.workable\.com\/[^)]+)\)/,
    );
    if (!match || !columns[1] || columns[1] === 'Title') continue;
    jobs.push({
      title: columns[1],
      url: match[1].replace(/\.md$/, ''),
      company,
      location: columns[3],
    });
  }
  return jobs;
}

export default {
  id: 'workable',
  kind: 'ats',
  detect(entry) {
    const url = feed(entry);
    return url ? { url } : null;
  },
  async fetch(entry, context) {
    const url = feed(entry);
    if (!url) throw new Error('workable: invalid careers URL');
    return parseWorkableMarkdown(
      await context.fetchText(url, { redirect: 'error' }),
      entry.name,
    );
  },
};
