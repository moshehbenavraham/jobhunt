import { detectAtsJobUrl, extractAtsJob } from './ats-core.mjs';

const DEFINITIVE_MISSING =
  /\bHTTP (404|410)\b|no matching (ashby|lever|greenhouse) job found|job not found|posting not found/i;

export async function checkApiLiveness(
  url,
  { extractAtsJobImpl = extractAtsJob } = {},
) {
  const detection = detectAtsJobUrl(url);
  if (!detection) return null;
  try {
    const job = await extractAtsJobImpl(url);
    if (!job?.title || !(job.descriptionText || job.descriptionHtml)) {
      return null;
    }
    return {
      result: 'active',
      reason: `${detection.type} API returned the posting and JD content`,
      strategy: 'api',
    };
  } catch (error) {
    const message = String(error?.message || error);
    if (
      [404, 410].includes(Number(error?.status)) ||
      DEFINITIVE_MISSING.test(message)
    ) {
      return {
        result: 'expired',
        reason: `${detection.type} API no longer exposes the posting`,
        strategy: 'api',
      };
    }
    return null;
  }
}
