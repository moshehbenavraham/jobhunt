import { chromium } from 'playwright';
import {
  assertSafeUrl,
  installPlaywrightNetworkGuard,
} from './network-policy.mjs';

export async function extractBrowserJobBoard(
  entry,
  {
    launchBrowser = () => chromium.launch({ headless: true }),
    assertSafeUrlImpl = assertSafeUrl,
    installNetworkGuardImpl = installPlaywrightNetworkGuard,
  } = {},
) {
  const sourceUrl = String(entry.careers_url || '').trim();
  if (!sourceUrl) throw new Error('browser: careers_url is required');
  await assertSafeUrlImpl(sourceUrl);

  const browser = await launchBrowser();
  let removeGuard = async () => {};
  try {
    const page = await browser.newPage();
    removeGuard = await installNetworkGuardImpl(page);
    const response = await page.goto(sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    if (response && response.status() >= 400) {
      throw new Error(`browser: HTTP ${response.status()}`);
    }
    await page.waitForTimeout(1_500);
    await assertSafeUrlImpl(page.url());

    const rows = await page.evaluate(() => {
      const output = [];
      const addPosting = (posting) => {
        if (!posting || typeof posting !== 'object') return;
        const type = Array.isArray(posting['@type'])
          ? posting['@type']
          : [posting['@type']];
        if (!type.includes('JobPosting')) return;
        const location = Array.isArray(posting.jobLocation)
          ? posting.jobLocation[0]
          : posting.jobLocation;
        output.push({
          title: posting.title || posting.name || '',
          url: posting.url || '',
          company: posting.hiringOrganization?.name || '',
          location:
            location?.address?.addressLocality ||
            location?.address?.addressRegion ||
            (posting.jobLocationType === 'TELECOMMUTE' ? 'Remote' : ''),
          description: posting.description || '',
          postedAt: posting.datePosted || '',
        });
      };
      for (const script of document.querySelectorAll(
        'script[type="application/ld+json"]',
      )) {
        try {
          const parsed = JSON.parse(script.textContent || '');
          const values = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.['@graph'])
              ? parsed['@graph']
              : [parsed];
          values.forEach(addPosting);
        } catch {
          // One malformed JSON-LD block must not hide other valid blocks.
        }
      }
      if (output.length === 0) {
        for (const anchor of document.querySelectorAll('a[href]')) {
          const title = (
            anchor.getAttribute('data-job-title') ||
            anchor.textContent ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim();
          const href = anchor.href;
          if (
            title.length >= 3 &&
            /job|career|position|opening|vacanc/i.test(href)
          ) {
            output.push({ title, url: href });
          }
        }
      }
      return output.slice(0, 500);
    });

    return rows.map((row) => ({
      ...row,
      url: new URL(row.url || sourceUrl, page.url()).toString(),
      company: row.company || entry.name,
      postedAt: Date.parse(row.postedAt),
    }));
  } finally {
    await removeGuard();
    await browser.close();
  }
}
