const DEFAULT_ATS_HOSTS = [
  'ashbyhq.com',
  'bamboohr.com',
  'greenhouse.io',
  'lever.co',
  'myworkdayjobs.com',
  'personio.com',
  'recruitee.com',
  'smartrecruiters.com',
  'teamtailor.com',
  'workable.com',
  'workday.com',
];
const DEFAULT_SUSPICIOUS_HOSTS = [
  'bit.ly',
  'cutt.ly',
  'forms.gle',
  'goo.gl',
  'rebrand.ly',
  'shorturl.at',
  't.co',
  'tinyurl.com',
];

function matchesHost(hostname, domains) {
  return domains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

function companyMatchesHost(company, hostname) {
  const words = String(company || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3);
  return words.length === 0 || words.some((word) => hostname.includes(word));
}

export function assessJobTrust(
  job,
  {
    atsHosts = DEFAULT_ATS_HOSTS,
    suspiciousHosts = DEFAULT_SUSPICIOUS_HOSTS,
  } = {},
) {
  const flags = [];
  let score = 100;
  let parsed;
  try {
    parsed = new URL(job.url);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error('unsafe URL');
    }
  } catch {
    flags.push('invalid_url');
    score -= 60;
  }

  if (parsed) {
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    if (matchesHost(hostname, suspiciousHosts)) {
      flags.push('suspicious_domain');
      score -= 30;
    }
    if (
      !matchesHost(hostname, atsHosts) &&
      !companyMatchesHost(job.company, hostname)
    ) {
      flags.push('company_domain_mismatch');
      score -= 15;
    }
  }
  score = Math.max(0, Math.min(100, score));
  return {
    trustScore: score,
    trustFlags: flags,
    trustLevel: score >= 90 ? 'high' : score >= 60 ? 'medium' : 'low',
  };
}
