const ATS_FETCH_TIMEOUT_MS = 10_000;
const GREENHOUSE_HOSTS = new Set([
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
  'job-boards.eu.greenhouse.io',
]);
const HTML_ENTITY_MAP = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function canonicalizeJobUrl(value) {
  const parsed = safeUrl(value);
  if (!parsed) return '';

  parsed.hash = '';
  parsed.search = '';
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  return parsed.toString().replace(/\/$/, '');
}

function sameCanonicalUrl(left, right) {
  return canonicalizeJobUrl(left) === canonicalizeJobUrl(right);
}

function prettifySlug(slug) {
  return String(slug || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}

function decodeHtmlEntities(text) {
  return String(text || '').replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (_match, entity) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith('#x')) {
        return String.fromCodePoint(parseInt(lower.slice(2), 16));
      }
      if (lower.startsWith('#')) {
        return String.fromCodePoint(parseInt(lower.slice(1), 10));
      }
      return HTML_ENTITY_MAP[lower] ?? `&${entity};`;
    },
  );
}

function stripHtmlToText(html) {
  const decoded = decodeHtmlEntities(html);
  return normalizeWhitespace(
    decoded
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<(\/p|\/div|\/section|\/article|\/ul|\/ol|\/h[1-6])>/gi, '\n\n')
      .replace(/<li\b[^>]*>/gi, '\n\n- ')
      .replace(/<\/li>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u00a0/g, ' '),
  );
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractMetaContent(html, attrValue) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${attrValue}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${attrValue}["'][^>]*>`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]).trim();
    }
  }

  return '';
}

function extractHtmlTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? stripHtmlToText(match[1]) : '';
}

function cleanCompanyCandidate(candidate, roleTitle) {
  let value = normalizeWhitespace(candidate);
  if (!value) return '';

  if (roleTitle) {
    const separators = [' at ', ' @ ', ' - ', ' | ', ': '];
    const lowerValue = value.toLowerCase();
    const lowerTitle = roleTitle.toLowerCase();

    for (const separator of separators) {
      const prefix = `${lowerTitle}${separator}`;
      const suffix = `${separator}${lowerTitle}`;
      if (lowerValue.startsWith(prefix)) {
        value = value.slice(prefix.length);
        break;
      }
      if (lowerValue.endsWith(suffix)) {
        value = value.slice(0, value.length - suffix.length);
        break;
      }
    }
  }

  return value
    .replace(/\s+(careers|jobs|job board)$/i, '')
    .replace(/\s+[|:-]\s+(careers|jobs)$/i, '')
    .trim();
}

async function inferCompanyNameFromPage({
  title,
  url,
  fallbackSlug,
  fetchTextImpl,
}) {
  if (typeof fetchTextImpl !== 'function') {
    return prettifySlug(fallbackSlug);
  }

  try {
    const html = await fetchTextImpl(url);
    const candidates = [
      extractMetaContent(html, 'og:site_name'),
      extractMetaContent(html, 'twitter:site'),
      extractMetaContent(html, 'og:title'),
      extractMetaContent(html, 'twitter:title'),
      extractHtmlTitle(html),
    ];

    for (const candidate of candidates) {
      const cleaned = cleanCompanyCandidate(candidate, title);
      if (cleaned && cleaned.toLowerCase() !== title.toLowerCase()) {
        return cleaned;
      }
    }
  } catch {
    // Fall back to slug prettification below.
  }

  return prettifySlug(fallbackSlug);
}

function flattenGreenhouseMetadata(metadata, values = []) {
  if (!metadata) return values;

  if (Array.isArray(metadata)) {
    for (const item of metadata) {
      flattenGreenhouseMetadata(item, values);
    }
    return values;
  }

  if (typeof metadata === 'object') {
    if (
      typeof metadata.name === 'string' &&
      typeof metadata.value === 'string' &&
      /(salary|compensation|pay|range|ote)/i.test(metadata.name)
    ) {
      values.push(metadata.value);
      return values;
    }

    for (const [key, value] of Object.entries(metadata)) {
      if (
        typeof value === 'string' &&
        /(salary|compensation|pay|range|ote)/i.test(key)
      ) {
        values.push(value);
      } else {
        flattenGreenhouseMetadata(value, values);
      }
    }
    return values;
  }

  return values;
}

function buildCompensation(summary, fields = {}) {
  const normalizedSummary = normalizeWhitespace(summary);
  const min = Number.isFinite(fields.min) ? fields.min : null;
  const max = Number.isFinite(fields.max) ? fields.max : null;
  const currency = fields.currency || null;
  const interval = fields.interval || null;

  if (
    !normalizedSummary &&
    min === null &&
    max === null &&
    !currency &&
    !interval
  ) {
    return null;
  }

  return {
    summary: normalizedSummary || null,
    currency,
    min,
    max,
    interval,
  };
}

function normalizeAshbyCompensation(job) {
  const firstTier =
    Array.isArray(job.compensationTiers) &&
    job.compensationTiers[0] &&
    typeof job.compensationTiers[0] === 'object'
      ? job.compensationTiers[0]
      : {};

  return buildCompensation(job.compensationTierSummary || firstTier.summary, {
    currency: firstTier.currencyCode || firstTier.currency,
    min: firstTier.minAmount ?? firstTier.minimum ?? firstTier.min,
    max: firstTier.maxAmount ?? firstTier.maximum ?? firstTier.max,
    interval:
      firstTier.interval || firstTier.compensationInterval || firstTier.period,
  });
}

function normalizeGreenhouseCompensation(job) {
  const values = flattenGreenhouseMetadata(job.metadata);
  return buildCompensation(values[0] || null);
}

function normalizeLeverCompensation(job) {
  const range = job.salaryRange || {};
  return buildCompensation(
    job.salaryDescriptionPlain || job.salaryDescription,
    {
      currency: range.currency,
      min: range.min,
      max: range.max,
      interval: range.interval,
    },
  );
}

function buildLeverDescriptionHtml(job) {
  const sections = [];

  if (job.description) {
    sections.push(job.description);
  } else if (job.descriptionBody) {
    sections.push(job.descriptionBody);
  }

  for (const list of job.lists || []) {
    if (list.text) {
      sections.push(`<h2>${escapeHtml(list.text)}</h2>`);
    }
    if (list.content) {
      sections.push(list.content);
    }
  }

  if (job.additional) {
    sections.push(job.additional);
  }

  return sections.join('\n').trim();
}

function buildLeverDescriptionText(job) {
  const parts = [];

  if (job.descriptionPlain) {
    parts.push(job.descriptionPlain);
  } else if (job.descriptionBodyPlain) {
    parts.push(job.descriptionBodyPlain);
  } else if (job.description) {
    parts.push(stripHtmlToText(job.description));
  }

  for (const list of job.lists || []) {
    if (list.text) {
      parts.push(list.text);
    }
    if (list.content) {
      parts.push(stripHtmlToText(list.content));
    }
  }

  if (job.additionalPlain) {
    parts.push(job.additionalPlain);
  } else if (job.additional) {
    parts.push(stripHtmlToText(job.additional));
  }

  return normalizeWhitespace(parts.filter(Boolean).join('\n\n'));
}

async function fetchWithTimeout(
  url,
  { fetchImpl = fetch, timeoutMs = ATS_FETCH_TIMEOUT_MS } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  return response.json();
}

export async function fetchText(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  return response.text();
}

export function detectApi(company) {
  if (company.api?.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const url = company.careers_url || '';

  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  const ghEuMatch = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (ghEuMatch && !company.api) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${ghEuMatch[1]}/jobs`,
    };
  }

  return null;
}

export function parseGreenhouse(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map((job) => ({
    title: job.title || '',
    url: job.absolute_url || '',
    company: companyName,
    location: job.location?.name || '',
  }));
}

export function parseAshby(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map((job) => ({
    title: job.title || '',
    url: job.jobUrl || '',
    company: companyName,
    location: job.location || '',
  }));
}

export function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map((job) => ({
    title: job.text || '',
    url: job.hostedUrl || '',
    company: companyName,
    location: job.categories?.location || '',
  }));
}

export const PARSERS = {
  greenhouse: parseGreenhouse,
  ashby: parseAshby,
  lever: parseLever,
};

export function detectAtsJobUrl(url) {
  const parsed = safeUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  const parts = parsed.pathname.split('/').filter(Boolean);

  if (host === 'jobs.ashbyhq.com') {
    const normalizedParts = [...parts];
    if (normalizedParts.at(-1) === 'application') {
      normalizedParts.pop();
    }
    if (normalizedParts.length < 2) return null;

    const companyKey = normalizedParts[0];
    const jobId = normalizedParts[1];
    return {
      type: 'ashby',
      companyKey,
      jobId,
      canonicalUrl: `https://jobs.ashbyhq.com/${companyKey}/${jobId}`,
    };
  }

  if (host === 'jobs.lever.co') {
    const normalizedParts = [...parts];
    if (normalizedParts.at(-1) === 'apply') {
      normalizedParts.pop();
    }
    if (normalizedParts.length < 2) return null;

    const companyKey = normalizedParts[0];
    const jobId = normalizedParts[1];
    return {
      type: 'lever',
      companyKey,
      jobId,
      canonicalUrl: `https://jobs.lever.co/${companyKey}/${jobId}`,
    };
  }

  if (GREENHOUSE_HOSTS.has(host)) {
    if (parts.length >= 3 && parts[1] === 'jobs') {
      const companyKey = parts[0];
      const jobId = parts[2];
      return {
        type: 'greenhouse',
        companyKey,
        jobId,
        canonicalUrl: `https://${host}/${companyKey}/jobs/${jobId}`,
      };
    }
  }

  return null;
}

async function extractAshbyJob(
  detection,
  sourceUrl,
  { fetchJsonImpl, fetchTextImpl },
) {
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${detection.companyKey}?includeCompensation=true`;
  const json = await fetchJsonImpl(apiUrl);
  const jobs = Array.isArray(json.jobs) ? json.jobs : [];
  const match = jobs.find(
    (job) =>
      String(job.id || '') === detection.jobId ||
      sameCanonicalUrl(job.jobUrl, detection.canonicalUrl),
  );

  if (!match) {
    throw new Error(`No matching ashby job found for ${sourceUrl}`);
  }

  const company = await inferCompanyNameFromPage({
    title: match.title || '',
    url: detection.canonicalUrl,
    fallbackSlug: detection.companyKey,
    fetchTextImpl,
  });
  const descriptionHtml = String(match.descriptionHtml || '').trim();

  return {
    ats: detection.type,
    sourceUrl,
    url: detection.canonicalUrl,
    applyUrl: match.applyUrl || `${detection.canonicalUrl}/application`,
    companyKey: detection.companyKey,
    jobId: detection.jobId,
    apiUrl,
    title: match.title || '',
    company,
    location: match.location || '',
    team: match.team || '',
    department: match.department || '',
    employmentType: match.employmentType || '',
    workplaceType: match.workplaceType || '',
    datePosted: match.publishedAt || null,
    compensation: normalizeAshbyCompensation(match),
    descriptionHtml,
    descriptionText: stripHtmlToText(descriptionHtml),
  };
}

async function extractGreenhouseJob(
  detection,
  sourceUrl,
  { fetchJsonImpl, fetchTextImpl },
) {
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${detection.companyKey}/jobs/${detection.jobId}`;
  const job = await fetchJsonImpl(apiUrl);
  const descriptionHtml = decodeHtmlEntities(job.content || '');
  const company = await inferCompanyNameFromPage({
    title: job.title || '',
    url: detection.canonicalUrl,
    fallbackSlug: detection.companyKey,
    fetchTextImpl,
  });
  const department =
    Array.isArray(job.departments) && job.departments[0]?.name
      ? job.departments[0].name
      : '';

  return {
    ats: detection.type,
    sourceUrl,
    url: detection.canonicalUrl,
    applyUrl: job.absolute_url || detection.canonicalUrl,
    companyKey: detection.companyKey,
    jobId: detection.jobId,
    apiUrl,
    title: job.title || '',
    company: job.company_name || company,
    location: job.location?.name || '',
    team: '',
    department,
    employmentType: '',
    workplaceType: '',
    datePosted: job.first_published || job.updated_at || null,
    compensation: normalizeGreenhouseCompensation(job),
    descriptionHtml,
    descriptionText: stripHtmlToText(descriptionHtml),
  };
}

async function extractLeverJob(
  detection,
  sourceUrl,
  { fetchJsonImpl, fetchTextImpl },
) {
  const apiUrl = `https://api.lever.co/v0/postings/${detection.companyKey}?mode=json`;
  const jobs = await fetchJsonImpl(apiUrl);
  const postings = Array.isArray(jobs) ? jobs : [];
  const match = postings.find(
    (job) =>
      String(job.id || '') === detection.jobId ||
      sameCanonicalUrl(job.hostedUrl, detection.canonicalUrl),
  );

  if (!match) {
    throw new Error(`No matching lever job found for ${sourceUrl}`);
  }

  const company = await inferCompanyNameFromPage({
    title: match.text || '',
    url: detection.canonicalUrl,
    fallbackSlug: detection.companyKey,
    fetchTextImpl,
  });
  const descriptionHtml = buildLeverDescriptionHtml(match);

  return {
    ats: detection.type,
    sourceUrl,
    url: detection.canonicalUrl,
    applyUrl: match.applyUrl || `${detection.canonicalUrl}/apply`,
    companyKey: detection.companyKey,
    jobId: detection.jobId,
    apiUrl,
    title: match.text || '',
    company,
    location: match.categories?.location || '',
    team: match.categories?.team || '',
    department: match.categories?.department || '',
    employmentType: match.categories?.commitment || '',
    workplaceType: match.workplaceType || '',
    datePosted: match.createdAt || null,
    compensation: normalizeLeverCompensation(match),
    descriptionHtml,
    descriptionText: buildLeverDescriptionText(match),
  };
}

export async function extractAtsJob(
  sourceUrl,
  {
    fetchJsonImpl = (url) => fetchJson(url),
    fetchTextImpl = (url) => fetchText(url),
  } = {},
) {
  const detection = detectAtsJobUrl(sourceUrl);
  if (!detection) {
    throw new Error(`Unsupported ATS URL: ${sourceUrl}`);
  }

  if (detection.type === 'ashby') {
    return extractAshbyJob(detection, sourceUrl, {
      fetchJsonImpl,
      fetchTextImpl,
    });
  }
  if (detection.type === 'greenhouse') {
    return extractGreenhouseJob(detection, sourceUrl, {
      fetchJsonImpl,
      fetchTextImpl,
    });
  }
  if (detection.type === 'lever') {
    return extractLeverJob(detection, sourceUrl, {
      fetchJsonImpl,
      fetchTextImpl,
    });
  }

  throw new Error(`Unsupported ATS URL: ${sourceUrl}`);
}

export async function extractUrlForAutoPipeline(
  sourceUrl,
  {
    extractAtsJobImpl = (url) => extractAtsJob(url),
    genericExtractImpl = null,
  } = {},
) {
  const detection = detectAtsJobUrl(sourceUrl);

  if (detection) {
    try {
      const job = await extractAtsJobImpl(sourceUrl);
      return {
        strategy: 'ats',
        sourceUrl,
        detection,
        job,
        title: job.title || '',
        company: job.company || '',
        location: job.location || '',
        applyUrl: job.applyUrl || job.url || detection.canonicalUrl,
        datePosted: job.datePosted || null,
        compensation: job.compensation || null,
        descriptionText: job.descriptionText || '',
        descriptionHtml: job.descriptionHtml || '',
      };
    } catch (error) {
      if (typeof genericExtractImpl !== 'function') {
        throw error;
      }

      const fallbackReason = String(error?.message || error);
      const genericResult = await genericExtractImpl(sourceUrl, {
        reason: fallbackReason,
        detection,
      });

      return {
        strategy: 'generic-fallback',
        sourceUrl,
        detection,
        fallbackReason,
        ...genericResult,
      };
    }
  }

  if (typeof genericExtractImpl !== 'function') {
    throw new Error(`No generic extractor provided for ${sourceUrl}`);
  }

  const genericResult = await genericExtractImpl(sourceUrl, {
    reason: null,
    detection: null,
  });

  return {
    strategy: 'generic',
    sourceUrl,
    detection: null,
    ...genericResult,
  };
}

export {
  ATS_FETCH_TIMEOUT_MS,
  buildLeverDescriptionHtml,
  buildLeverDescriptionText,
  canonicalizeJobUrl,
  decodeHtmlEntities,
  stripHtmlToText,
};
