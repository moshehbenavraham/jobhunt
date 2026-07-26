import { xmlBlocks, xmlTag } from './_xml.mjs';

const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.jobs\.personio\.(de|com)$/;

function tenant(entry) {
  try {
    const url = new URL(entry.careers_url || '');
    return url.protocol === 'https:' && HOST.test(url.hostname)
      ? url.hostname
      : null;
  } catch {
    return null;
  }
}

export default {
  id: 'personio',
  kind: 'ats',
  detect(entry) {
    const host = tenant(entry);
    return host ? { url: `https://${host}/xml` } : null;
  },
  async fetch(entry, context) {
    const host = tenant(entry);
    if (!host) throw new Error('personio: invalid careers URL');
    const xml = await context.fetchText(`https://${host}/xml`, {
      redirect: 'error',
    });
    return xmlBlocks(
      String(xml).replace(
        /<jobDescriptions\b[^>]*>[\s\S]*?<\/jobDescriptions>/gi,
        '',
      ),
      'position',
    )
      .map((block) => {
        const id = xmlTag(block, 'id');
        return {
          title: xmlTag(block, 'name'),
          url: /^\d+$/.test(id) ? `https://${host}/job/${id}` : '',
          company: entry.name,
          location: [
            ...new Set(
              xmlBlocks(block, 'office')
                .map((office) => xmlTag(office, 'office'))
                .filter(Boolean),
            ),
          ].join(', '),
          postedAt: Date.parse(xmlTag(block, 'createdAt')),
        };
      })
      .filter((job) => job.title && job.url);
  },
};
