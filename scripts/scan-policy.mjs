const UNKNOWN_POLICIES = new Set(['allow', 'reject']);
const VISA_NO_SPONSORSHIP =
  /\b(no|not|unable to|cannot|can't|without)\b.{0,35}\b(sponsor|sponsorship)\b|\bmust\b.{0,30}\b(authorized|right to work)\b/i;
const VISA_SPONSORSHIP =
  /\b(visa|immigration)\s+sponsorship\b|\bsponsor(?:ing|ship)?\s+(?:is\s+)?available\b/i;

function list(value) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalized(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, terms) {
  const haystack = normalized(text);
  return terms.some((term) => haystack.includes(normalized(term)));
}

function unknownPolicy(value, fallback = 'allow') {
  return UNKNOWN_POLICIES.has(value) ? value : fallback;
}

export function inferAnnualSalary(job) {
  const explicitMin = Number(job.salaryMin);
  const explicitMax = Number(job.salaryMax);
  const explicitInterval = normalized(job.salaryInterval || 'year');
  if (
    (Number.isFinite(explicitMin) || Number.isFinite(explicitMax)) &&
    /year|annual|annum/.test(explicitInterval)
  ) {
    return {
      min: Number.isFinite(explicitMin) ? explicitMin : explicitMax,
      max: Number.isFinite(explicitMax) ? explicitMax : explicitMin,
      currency: String(job.salaryCurrency || '').toUpperCase(),
      source: 'provider',
    };
  }

  const text = String(job.description || '');
  const range = text.match(
    /(?:USD|US\$|\$|EUR|€|GBP|£)\s*([\d,.]{5,})\s*(?:-|–|—|to)\s*(?:USD|US\$|\$|EUR|€|GBP|£)?\s*([\d,.]{5,})/i,
  );
  if (!range) return null;
  const symbol = range[0].match(/USD|US\$|\$|EUR|€|GBP|£/i)?.[0] || '';
  const currency = /EUR|€/.test(symbol)
    ? 'EUR'
    : /GBP|£/.test(symbol)
      ? 'GBP'
      : 'USD';
  const min = Number(range[1].replace(/[,.]/g, ''));
  const max = Number(range[2].replace(/[,.]/g, ''));
  return Number.isFinite(min) && Number.isFinite(max)
    ? { min, max, currency, source: 'description' }
    : null;
}

export function validateScanFilters(config = {}) {
  const errors = [];
  const salary = config.salary || {};
  const posting = config.posting || {};
  for (const [label, value] of [
    ['salary.unknown', salary.unknown],
    ['posting.unknown', posting.unknown],
    ['description.unknown', config.description?.unknown],
    ['visa.unknown', config.visa?.unknown],
  ]) {
    if (value !== undefined && !UNKNOWN_POLICIES.has(value)) {
      errors.push(`${label} must be allow or reject`);
    }
  }
  if (
    salary.min_annual !== undefined &&
    (!Number.isFinite(Number(salary.min_annual)) ||
      Number(salary.min_annual) < 0)
  ) {
    errors.push('salary.min_annual must be a non-negative number');
  }
  if (
    posting.max_age_days !== undefined &&
    (!Number.isFinite(Number(posting.max_age_days)) ||
      Number(posting.max_age_days) < 0)
  ) {
    errors.push('posting.max_age_days must be a non-negative number');
  }
  if (
    config.cooldown_days !== undefined &&
    (!Number.isFinite(Number(config.cooldown_days)) ||
      Number(config.cooldown_days) < 0)
  ) {
    errors.push('cooldown_days must be a non-negative number');
  }
  return errors;
}

export function buildScanFilter(config = {}, { now = () => Date.now() } = {}) {
  const validationErrors = validateScanFilters(config);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid scan_filters: ${validationErrors.join('; ')}`);
  }

  const companyBlacklist = list(config.company_blacklist);
  const titleBlacklist = list(config.title_blacklist);
  const seniorityInclude = list(config.seniority?.include);
  const seniorityExclude = list(config.seniority?.exclude);
  const descriptionInclude = list(config.description?.include);
  const descriptionExclude = list(config.description?.exclude);
  const allowedCurrencies = list(config.salary?.currencies).map((value) =>
    value.toUpperCase(),
  );

  return (job) => {
    const reasons = [];
    if (includesAny(job.company, companyBlacklist)) {
      reasons.push('company_blacklist');
    }
    if (includesAny(job.title, titleBlacklist)) reasons.push('title_blacklist');
    if (
      seniorityInclude.length > 0 &&
      !includesAny(job.title, seniorityInclude)
    ) {
      reasons.push('seniority_not_included');
    }
    if (includesAny(job.title, seniorityExclude)) {
      reasons.push('seniority_excluded');
    }

    const description = String(job.description || '').trim();
    if (!description) {
      if (
        (descriptionInclude.length > 0 || descriptionExclude.length > 0) &&
        unknownPolicy(config.description?.unknown) === 'reject'
      ) {
        reasons.push('description_unknown');
      }
    } else {
      if (
        descriptionInclude.length > 0 &&
        !includesAny(description, descriptionInclude)
      ) {
        reasons.push('description_terms_missing');
      }
      if (includesAny(description, descriptionExclude)) {
        reasons.push('description_term_excluded');
      }
    }

    const salary = inferAnnualSalary(job);
    const minimum = Number(config.salary?.min_annual);
    if (Number.isFinite(minimum)) {
      if (!salary) {
        if (unknownPolicy(config.salary?.unknown) === 'reject') {
          reasons.push('salary_unknown');
        }
      } else if (
        allowedCurrencies.length > 0 &&
        !allowedCurrencies.includes(salary.currency)
      ) {
        reasons.push('salary_currency_not_allowed');
      } else if (salary.max < minimum) {
        reasons.push('salary_below_minimum');
      }
    }

    const maxAgeDays = Number(config.posting?.max_age_days);
    const postedAt = Number(job.postedAt);
    if (Number.isFinite(maxAgeDays)) {
      if (!Number.isFinite(postedAt)) {
        if (unknownPolicy(config.posting?.unknown) === 'reject') {
          reasons.push('posting_date_unknown');
        }
      } else if (now() - postedAt > maxAgeDays * 86_400_000) {
        reasons.push('posting_too_old');
      }
    }

    const visa = config.visa || {};
    if (visa.exclude_no_sponsorship && description) {
      if (VISA_NO_SPONSORSHIP.test(description)) {
        reasons.push('visa_sponsorship_unavailable');
      }
    }
    if (visa.require_sponsorship) {
      if (!description) {
        if (unknownPolicy(visa.unknown) === 'reject') {
          reasons.push('visa_sponsorship_unknown');
        }
      } else if (!VISA_SPONSORSHIP.test(description)) {
        reasons.push('visa_sponsorship_not_confirmed');
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      salary,
    };
  };
}
