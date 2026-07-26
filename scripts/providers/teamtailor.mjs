import { xmlBlocks, xmlTag } from './_xml.mjs';

const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.teamtailor\.com$/;

function feed(entry) {
  try {
    const url = new URL(entry.api || entry.careers_url || '');
    const explicit = entry.provider === 'teamtailor';
    return url.protocol === 'https:' && (explicit || HOST.test(url.hostname))
      ? `https://${url.hostname}/jobs.rss`
      : null;
  } catch {
    return null;
  }
}

export default {
  id: 'teamtailor',
  kind: 'ats',
  detect(entry) {
    const url = feed({ ...entry, provider: undefined });
    return url ? { url } : null;
  },
  async fetch(entry, context) {
    const url = feed(entry);
    if (!url) throw new Error('teamtailor: invalid careers URL');
    const xml = await context.fetchText(url, { redirect: 'error' });
    return xmlBlocks(xml, 'item').map((item) => ({
      title: xmlTag(item, 'title'),
      url: xmlTag(item, 'link'),
      company: entry.name,
      location:
        [xmlTag(item, 'tt:city'), xmlTag(item, 'tt:country')]
          .filter(Boolean)
          .join(', ') ||
        (/fully|temporary/i.test(xmlTag(item, 'remoteStatus')) ? 'Remote' : ''),
      postedAt: Date.parse(xmlTag(item, 'pubDate')),
    }));
  },
};
