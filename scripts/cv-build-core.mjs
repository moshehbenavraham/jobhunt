import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import * as z from 'zod';

export const CV_BUILD_SCHEMA_VERSION = 1;

export const DEFAULT_SECTION_LABELS = {
  summary: 'Professional Summary',
  competencies: 'Core Competencies',
  experience: 'Work Experience',
  projects: 'Projects',
  education: 'Education',
  certifications: 'Certifications',
  skills: 'Skills',
};

export const DEFAULT_SOURCE_FILES = [
  'profile/cv.md',
  'config/profile.yml',
  'modes/_profile.md',
];

const evidenceIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/i,
    'evidence IDs may contain letters, numbers, dots, underscores, and dashes',
  );

const relativeSourcePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !isAbsolute(value) &&
      !value.split(/[\\/]+/).some((part) => part === '..'),
    'source paths must stay inside the project',
  );

const evidenceRefsSchema = z.array(evidenceIdSchema).min(1);

const labelsSchema = z
  .object({
    summary: z.string().min(1),
    competencies: z.string().min(1),
    experience: z.string().min(1),
    projects: z.string().min(1),
    education: z.string().min(1),
    certifications: z.string().min(1),
    skills: z.string().min(1),
  })
  .strict()
  .default(DEFAULT_SECTION_LABELS);

const evidenceSchema = z
  .object({
    id: evidenceIdSchema,
    source: relativeSourcePathSchema,
    locator: z.string().min(1).optional(),
    sourceText: z.string().min(1),
  })
  .strict();

const requirementSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9._-]*$/i),
    text: z.string().min(1),
    importance: z.enum(['must-have', 'nice-to-have']),
    status: z.enum(['supported', 'unsupported']),
    terms: z.array(z.string().min(1)).min(1),
    evidenceIds: z.array(evidenceIdSchema).default([]),
    includedSections: z
      .array(
        z.enum([
          'summary',
          'competencies',
          'experience',
          'projects',
          'education',
          'certifications',
          'skills',
        ]),
      )
      .default([]),
  })
  .strict()
  .superRefine((requirement, ctx) => {
    if (requirement.status === 'supported') {
      if (requirement.evidenceIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['evidenceIds'],
          message: 'supported requirements need at least one evidence ID',
        });
      }
      if (requirement.includedSections.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['includedSections'],
          message: 'supported requirements need an included section',
        });
      }
    } else if (
      requirement.evidenceIds.length > 0 ||
      requirement.includedSections.length > 0
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'unsupported requirements cannot claim evidence or included sections',
      });
    }
  });

const bulletSchema = z
  .object({
    text: z.string().min(1),
    evidenceIds: evidenceRefsSchema,
  })
  .strict();

const competencySchema = z
  .object({
    label: z.string().min(1),
    evidenceIds: evidenceRefsSchema,
  })
  .strict();

const experienceSchema = z
  .object({
    company: z.string().min(1),
    role: z.string().min(1),
    period: z.string().min(1),
    location: z.string().min(1).optional(),
    bullets: z.array(bulletSchema).min(1),
  })
  .strict();

const projectSchema = z
  .object({
    name: z.string().min(1),
    url: z.string().url().optional(),
    badge: z.string().min(1).optional(),
    description: z.string().min(1),
    technologies: z.array(z.string().min(1)).default([]),
    evidenceIds: evidenceRefsSchema,
  })
  .strict();

const educationSchema = z
  .object({
    degree: z.string().min(1),
    institution: z.string().min(1),
    year: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    evidenceIds: evidenceRefsSchema,
  })
  .strict();

const certificationSchema = z
  .object({
    name: z.string().min(1),
    issuer: z.string().min(1).optional(),
    year: z.string().min(1).optional(),
    evidenceIds: evidenceRefsSchema,
  })
  .strict();

const skillGroupSchema = z
  .object({
    category: z.string().min(1),
    items: z.array(z.string().min(1)).min(1),
    evidenceIds: evidenceRefsSchema,
  })
  .strict();

export const CvBuildSchema = z
  .object({
    schemaVersion: z.literal(CV_BUILD_SCHEMA_VERSION).default(1),
    candidate: z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
        linkedin: z.string().url().optional(),
        linkedinDisplay: z.string().min(1).optional(),
        portfolio: z.string().url().optional(),
        portfolioDisplay: z.string().min(1).optional(),
      })
      .strict(),
    job: z
      .object({
        company: z.string().min(1),
        role: z.string().min(1),
        location: z.string().min(1).optional(),
        language: z.string().min(2).default('en'),
        format: z.enum(['letter', 'a4']),
        jdText: z.string().min(1),
        requirements: z.array(requirementSchema).min(1),
      })
      .strict(),
    labels: labelsSchema,
    summary: z.string().min(1),
    summaryEvidenceIds: evidenceRefsSchema,
    competencies: z.array(competencySchema).min(1),
    experience: z.array(experienceSchema).min(1),
    projects: z.array(projectSchema).min(1),
    education: z.array(educationSchema).min(1),
    certifications: z.array(certificationSchema).default([]),
    skills: z.array(skillGroupSchema).min(1),
    evidence: z.array(evidenceSchema).min(1),
    sourceFiles: z
      .array(relativeSourcePathSchema)
      .min(1)
      .default(DEFAULT_SOURCE_FILES),
  })
  .strict()
  .superRefine((build, ctx) => {
    addDuplicateIssues(
      build.evidence.map((item) => item.id),
      ['evidence'],
      'duplicate evidence ID',
      ctx,
    );
    addDuplicateIssues(
      build.job.requirements.map((item) => item.id),
      ['job', 'requirements'],
      'duplicate requirement ID',
      ctx,
    );

    const evidenceIds = new Set(build.evidence.map((item) => item.id));
    for (const ref of collectEvidenceReferences(build)) {
      if (!evidenceIds.has(ref.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ref.path,
          message: `unknown evidence ID: ${ref.id}`,
        });
      }
    }

    for (const fallback of [
      ['candidate', 'name', build.candidate.name],
      ['job', 'company', build.job.company],
      ['job', 'role', build.job.role],
    ]) {
      if (/\b(?:candidate|unknown|placeholder|todo|tbd)\b/i.test(fallback[2])) {
        ctx.addIssue({
          code: 'custom',
          path: fallback.slice(0, 2),
          message: `fallback value is not allowed: ${fallback[2]}`,
        });
      }
    }

    for (const item of collectDocumentText(build)) {
      if (/\{\{[^}]+\}\}/.test(item.text)) {
        ctx.addIssue({
          code: 'custom',
          path: item.path,
          message: 'unresolved template placeholder found in CV content',
        });
      }
    }
  });

export function createCvBuildJsonSchema() {
  const schema = z.toJSONSchema(CvBuildSchema, {
    target: 'draft-2020-12',
  });
  schema.$id = 'https://jobhunt.local/templates/cv-build.schema.json';
  schema.title = 'jobhunt deterministic CV build';
  return schema;
}

function addDuplicateIssues(values, path, message, ctx) {
  const seen = new Set();
  for (let index = 0; index < values.length; index++) {
    if (seen.has(values[index])) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `${message}: ${values[index]}`,
      });
    }
    seen.add(values[index]);
  }
}

function collectEvidenceReferences(build) {
  const refs = [];
  const add = (ids, path) => {
    for (let index = 0; index < ids.length; index++) {
      refs.push({ id: ids[index], path: [...path, index] });
    }
  };

  add(build.summaryEvidenceIds, ['summaryEvidenceIds']);
  build.competencies.forEach((item, index) => {
    add(item.evidenceIds, ['competencies', index, 'evidenceIds']);
  });
  build.experience.forEach((job, jobIndex) => {
    job.bullets.forEach((bullet, bulletIndex) => {
      add(bullet.evidenceIds, [
        'experience',
        jobIndex,
        'bullets',
        bulletIndex,
        'evidenceIds',
      ]);
    });
  });
  build.projects.forEach((item, index) => {
    add(item.evidenceIds, ['projects', index, 'evidenceIds']);
  });
  build.education.forEach((item, index) => {
    add(item.evidenceIds, ['education', index, 'evidenceIds']);
  });
  build.certifications.forEach((item, index) => {
    add(item.evidenceIds, ['certifications', index, 'evidenceIds']);
  });
  build.skills.forEach((item, index) => {
    add(item.evidenceIds, ['skills', index, 'evidenceIds']);
  });
  build.job.requirements.forEach((item, index) => {
    add(item.evidenceIds, ['job', 'requirements', index, 'evidenceIds']);
  });
  return refs;
}

function collectDocumentText(build) {
  const items = [
    { text: build.summary, path: ['summary'] },
    ...build.competencies.map((item, index) => ({
      text: item.label,
      path: ['competencies', index, 'label'],
    })),
  ];

  build.experience.forEach((job, jobIndex) => {
    job.bullets.forEach((bullet, bulletIndex) => {
      items.push({
        text: bullet.text,
        path: ['experience', jobIndex, 'bullets', bulletIndex, 'text'],
      });
    });
  });
  build.projects.forEach((item, index) => {
    items.push({
      text: item.description,
      path: ['projects', index, 'description'],
    });
  });
  build.education.forEach((item, index) => {
    items.push({
      text: [item.degree, item.institution, item.description]
        .filter(Boolean)
        .join(' '),
      path: ['education', index],
    });
  });
  build.certifications.forEach((item, index) => {
    items.push({
      text: [item.name, item.issuer].filter(Boolean).join(' '),
      path: ['certifications', index],
    });
  });
  build.skills.forEach((item, index) => {
    items.push({
      text: `${item.category}: ${item.items.join(', ')}`,
      path: ['skills', index],
    });
  });
  return items;
}

function contentItemsWithEvidence(build) {
  const items = [
    {
      label: 'summary',
      text: build.summary,
      evidenceIds: build.summaryEvidenceIds,
    },
  ];
  build.experience.forEach((job) => {
    job.bullets.forEach((bullet) => {
      items.push({
        label: `${job.company} bullet`,
        text: bullet.text,
        evidenceIds: bullet.evidenceIds,
      });
    });
  });
  build.projects.forEach((project) => {
    items.push({
      label: `${project.name} project`,
      text: project.description,
      evidenceIds: project.evidenceIds,
    });
  });
  return items;
}

function normalizeEvidenceText(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeComparableText(value) {
  return normalizeEvidenceText(value)
    .replace(/[^\p{L}\p{N}+#.$%/-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuantity(value) {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '');
}

function extractQuantities(value) {
  const matches = String(value).match(
    /(?:[$€£]\s*)?\d[\d,.]*(?:\s*(?:\+|%|k|m|b))?/gi,
  );
  return [...new Set((matches || []).map(normalizeQuantity))];
}

function resolveProjectPath(root, path) {
  const projectRoot = resolve(root);
  const absolute = resolve(projectRoot, path);
  const rel = relative(projectRoot, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Source path escapes project root: ${path}`);
  }
  return absolute;
}

export async function validateCvBuildEvidence(build, options = {}) {
  const root = options.root || process.cwd();
  const evidenceById = new Map(build.evidence.map((item) => [item.id, item]));
  const sourceCache = new Map();
  const issues = [];

  for (const item of build.evidence) {
    let sourceContent = sourceCache.get(item.source);
    if (sourceContent === undefined) {
      try {
        sourceContent = await readFile(
          resolveProjectPath(root, item.source),
          'utf8',
        );
        sourceCache.set(item.source, sourceContent);
      } catch (error) {
        issues.push(
          `Evidence ${item.id} cannot read ${item.source}: ${error.message}`,
        );
        continue;
      }
    }

    if (
      !normalizeComparableText(sourceContent).includes(
        normalizeComparableText(item.sourceText),
      )
    ) {
      issues.push(
        `Evidence ${item.id} sourceText was not found in ${item.source}`,
      );
    }
  }

  for (const item of contentItemsWithEvidence(build)) {
    const evidenceText = item.evidenceIds
      .map((id) => evidenceById.get(id)?.sourceText || '')
      .join(' ');
    const normalizedEvidence = normalizeQuantity(evidenceText);
    for (const quantity of extractQuantities(item.text)) {
      if (!normalizedEvidence.includes(quantity)) {
        issues.push(
          `${item.label} contains quantity "${quantity}" not present in its evidence`,
        );
      }
    }
  }

  for (const requirement of build.job.requirements) {
    if (requirement.status !== 'supported') continue;
    const evidenceText = requirement.evidenceIds
      .map((id) => evidenceById.get(id)?.sourceText || '')
      .join(' ');
    if (!requirement.terms.some((term) => containsTerm(evidenceText, term))) {
      issues.push(
        `Supported requirement ${requirement.id} has no declared term in its evidence excerpts`,
      );
    }
  }

  return { valid: issues.length === 0, issues };
}

function sectionText(build) {
  return {
    summary: build.summary,
    competencies: build.competencies.map((item) => item.label).join(' '),
    experience: build.experience
      .flatMap((job) => job.bullets.map((item) => item.text))
      .join(' '),
    projects: build.projects.map((item) => item.description).join(' '),
    education: build.education
      .map((item) =>
        [item.degree, item.institution, item.description]
          .filter(Boolean)
          .join(' '),
      )
      .join(' '),
    certifications: build.certifications
      .map((item) => [item.name, item.issuer].filter(Boolean).join(' '))
      .join(' '),
    skills: build.skills
      .map((item) => `${item.category} ${item.items.join(' ')}`)
      .join(' '),
  };
}

function containsTerm(haystack, term) {
  const normalize = (value) =>
    normalizeComparableText(value)
      .replace(/[/-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  return ` ${normalize(haystack)} `.includes(` ${normalize(term)} `);
}

export function calculateRequirementCoverage(build) {
  const sections = sectionText(build);
  const allText = Object.values(sections).join(' ');
  const results = build.job.requirements.map((requirement) => {
    const matchedTerms = requirement.terms.filter((term) =>
      containsTerm(allText, term),
    );
    const matchedSections = requirement.includedSections.filter((section) =>
      requirement.terms.some((term) => containsTerm(sections[section], term)),
    );
    return {
      id: requirement.id,
      text: requirement.text,
      importance: requirement.importance,
      status: requirement.status,
      matchedTerms,
      matchedSections,
      included:
        requirement.status === 'supported' &&
        matchedTerms.length > 0 &&
        matchedSections.length > 0,
      unsupportedTermsIncluded:
        requirement.status === 'unsupported' ? matchedTerms : [],
    };
  });

  const summarize = (importance) => {
    const relevant = results.filter((item) => item.importance === importance);
    const supported = relevant.filter((item) => item.status === 'supported');
    const included = supported.filter((item) => item.included);
    return {
      total: relevant.length,
      supported: supported.length,
      included: included.length,
      coveragePercent:
        relevant.length === 0
          ? 100
          : Number(((included.length / relevant.length) * 100).toFixed(1)),
      supportedCoveragePercent:
        supported.length === 0
          ? 100
          : Number(((included.length / supported.length) * 100).toFixed(1)),
    };
  };

  const unsupportedIncluded = results.flatMap((item) =>
    item.unsupportedTermsIncluded.map((term) => ({
      requirementId: item.id,
      term,
    })),
  );
  const declaredSupportedButMissing = results
    .filter((item) => item.status === 'supported' && !item.included)
    .map((item) => item.id);

  return {
    mustHave: summarize('must-have'),
    niceToHave: summarize('nice-to-have'),
    unsupportedIncluded,
    unsupportedIncludedCount: unsupportedIncluded.length,
    gaps: results
      .filter((item) => item.status === 'unsupported')
      .map((item) => ({ id: item.id, text: item.text })),
    declaredSupportedButMissing,
    requirements: results,
  };
}

export async function parseAndValidateCvBuild(input, options = {}) {
  const build = CvBuildSchema.parse(input);
  const evidence = await validateCvBuildEvidence(build, options);
  if (!evidence.valid) {
    throw new Error(
      `CV evidence validation failed:\n- ${evidence.issues.join('\n- ')}`,
    );
  }
  const coverage = calculateRequirementCoverage(build);
  const coverageIssues = [];
  if (coverage.unsupportedIncludedCount > 0) {
    coverageIssues.push(
      `unsupported terms included: ${coverage.unsupportedIncluded
        .map((item) => `${item.requirementId}:${item.term}`)
        .join(', ')}`,
    );
  }
  if (coverage.declaredSupportedButMissing.length > 0) {
    coverageIssues.push(
      `supported requirements missing from declared sections: ${coverage.declaredSupportedButMissing.join(', ')}`,
    );
  }
  if (coverageIssues.length > 0) {
    throw new Error(
      `CV requirement coverage validation failed:\n- ${coverageIssues.join('\n- ')}`,
    );
  }
  return { build, evidence, coverage };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeHref(value) {
  const url = new URL(value);
  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }
  return escapeHtml(url.toString());
}

export function shortDisplayUrl(value, maxLength = 42) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, '');
  const display = `${host}${url.pathname.replace(/\/$/, '')}`;
  if (display.length <= maxLength) return display;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length > 0) {
    const compact = `${host}/${parts.at(-1)}`;
    if (compact.length <= maxLength) return compact;
  }
  return host;
}

function renderContactItems(candidate) {
  const items = [];
  if (candidate.phone) {
    items.push(
      `<span class="contact-item">${escapeHtml(candidate.phone)}</span>`,
    );
  }
  items.push(
    `<a class="contact-item" href="${safeHref(`mailto:${candidate.email}`)}">${escapeHtml(candidate.email)}</a>`,
  );
  if (candidate.linkedin) {
    items.push(
      `<a class="contact-item" href="${safeHref(candidate.linkedin)}">${escapeHtml(
        candidate.linkedinDisplay || shortDisplayUrl(candidate.linkedin),
      )}</a>`,
    );
  }
  if (candidate.portfolio) {
    items.push(
      `<a class="contact-item" href="${safeHref(candidate.portfolio)}">${escapeHtml(
        candidate.portfolioDisplay || shortDisplayUrl(candidate.portfolio),
      )}</a>`,
    );
  }
  if (candidate.location) {
    for (const part of candidate.location
      .split(/\s*[|•·]\s*/)
      .filter(Boolean)) {
      items.push(`<span class="contact-item">${escapeHtml(part)}</span>`);
    }
  }
  return items.join('\n');
}

function evidenceAttribute(ids) {
  return ` data-evidence-ids="${escapeHtml(ids.join(' '))}"`;
}

function renderSection(label, content, className = '') {
  return `<section class="section ${className}" aria-labelledby="${escapeHtml(
    `section-${className || label.toLowerCase().replace(/\W+/g, '-')}`,
  )}">
  <h2 class="section-title" id="${escapeHtml(
    `section-${className || label.toLowerCase().replace(/\W+/g, '-')}`,
  )}">${escapeHtml(label)}</h2>
  ${content}
</section>`;
}

function renderExperience(build) {
  return build.experience
    .map(
      (
        job,
        index,
      ) => `<article class="job${index === 0 ? ' first-in-section' : ''}">
  <div class="job-header">
    <h3 class="job-company">${escapeHtml(job.company)}</h3>
    <span class="job-period">${escapeHtml(job.period)}</span>
  </div>
  <div class="job-role"><span class="job-role-title">${escapeHtml(job.role)}</span>${
    job.location
      ? `<span class="job-location">${escapeHtml(job.location)}</span>`
      : ''
  }</div>
  <ul>
    ${job.bullets
      .map(
        (bullet) =>
          `<li${evidenceAttribute(bullet.evidenceIds)}>${escapeHtml(bullet.text)}</li>`,
      )
      .join('\n')}
  </ul>
</article>`,
    )
    .join('\n');
}

function renderProjects(build) {
  return build.projects
    .map((project, index) => {
      const title = project.url
        ? `<a href="${safeHref(project.url)}">${escapeHtml(project.name)}</a>`
        : escapeHtml(project.name);
      const badge = project.badge
        ? `<span class="project-badge">${escapeHtml(project.badge)}</span>`
        : '';
      const technologies =
        project.technologies.length > 0
          ? `<div class="project-tech">${escapeHtml(
              project.technologies.join(', '),
            )}</div>`
          : '';
      return `<article class="project${index === 0 ? ' first-in-section' : ''}"${evidenceAttribute(project.evidenceIds)}>
  <h3 class="project-title">${title}${badge}</h3>
  <p class="project-desc">${escapeHtml(project.description)}</p>
  ${technologies}
</article>`;
    })
    .join('\n');
}

function renderEducation(build) {
  return build.education
    .map(
      (
        item,
        index,
      ) => `<article class="edu-item${index === 0 ? ' first-in-section' : ''}"${evidenceAttribute(item.evidenceIds)}>
  <div class="edu-header">
    <h3 class="edu-title">${escapeHtml(item.degree)}, <span class="edu-org">${escapeHtml(
      item.institution,
    )}</span></h3>
    ${item.year ? `<span class="edu-year">${escapeHtml(item.year)}</span>` : ''}
  </div>
  ${item.description ? `<p class="edu-desc">${escapeHtml(item.description)}</p>` : ''}
</article>`,
    )
    .join('\n');
}

function renderCertifications(build) {
  return build.certifications
    .map(
      (
        item,
        index,
      ) => `<article class="cert-item${index === 0 ? ' first-in-section' : ''}"${evidenceAttribute(item.evidenceIds)}>
  <h3 class="cert-title">${escapeHtml(item.name)}${
    item.issuer
      ? `, <span class="cert-org">${escapeHtml(item.issuer)}</span>`
      : ''
  }</h3>
  ${item.year ? `<span class="cert-year">${escapeHtml(item.year)}</span>` : ''}
</article>`,
    )
    .join('\n');
}

function renderSkills(build) {
  return `<div class="skills-grid">${build.skills
    .map(
      (group) =>
        `<p class="skill-item"${evidenceAttribute(group.evidenceIds)}><span class="skill-category">${escapeHtml(
          group.category,
        )}:</span> ${escapeHtml(group.items.join(', '))}</p>`,
    )
    .join('\n')}</div>`;
}

function replaceTemplateStrict(template, replacements) {
  const tokens = [
    ...new Set(
      [...template.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]),
    ),
  ];
  const missing = tokens.filter((token) => !Object.hasOwn(replacements, token));
  if (missing.length > 0) {
    throw new Error(`Missing template replacements: ${missing.join(', ')}`);
  }

  let output = template;
  for (const token of tokens) {
    output = output.replaceAll(`{{${token}}}`, replacements[token]);
  }
  const unresolved = [...output.matchAll(/\{\{([^}]+)\}\}/g)].map(
    (match) => match[1],
  );
  if (unresolved.length > 0) {
    throw new Error(
      `Unresolved template placeholders: ${[...new Set(unresolved)].join(', ')}`,
    );
  }
  return output;
}

export function renderCvBuild(build, template) {
  const competencies = `<div class="competencies-grid">${build.competencies
    .map(
      (item) =>
        `<span class="competency-tag"${evidenceAttribute(item.evidenceIds)}>${escapeHtml(item.label)}</span>`,
    )
    .join('\n')}</div>`;
  const replacements = {
    LANG: escapeHtml(build.job.language),
    PAGE_WIDTH: build.job.format === 'letter' ? '8.5in' : '210mm',
    DOCUMENT_TITLE: escapeHtml(
      `${build.candidate.name} - ${build.job.role} at ${build.job.company}`,
    ),
    NAME: escapeHtml(build.candidate.name),
    CONTACT_ITEMS: renderContactItems(build.candidate),
    SUMMARY_SECTION: renderSection(
      build.labels.summary,
      `<p class="summary-text"${evidenceAttribute(build.summaryEvidenceIds)}>${escapeHtml(build.summary)}</p>`,
      'summary',
    ),
    COMPETENCIES_SECTION: renderSection(
      build.labels.competencies,
      competencies,
      'competencies',
    ),
    EXPERIENCE_SECTION: renderSection(
      build.labels.experience,
      renderExperience(build),
      'experience',
    ),
    PROJECTS_SECTION: renderSection(
      build.labels.projects,
      renderProjects(build),
      'projects',
    ),
    EDUCATION_SECTION: renderSection(
      build.labels.education,
      renderEducation(build),
      'education',
    ),
    CERTIFICATIONS_SECTION:
      build.certifications.length > 0
        ? renderSection(
            build.labels.certifications,
            renderCertifications(build),
            'certifications',
          )
        : '',
    SKILLS_SECTION: renderSection(
      build.labels.skills,
      renderSkills(build),
      'skills',
    ),
  };
  return replaceTemplateStrict(template, replacements);
}

export function canonicalizeCvBuild(build) {
  return `${JSON.stringify(build, null, 2)}\n`;
}

export function getRequiredHeadings(build) {
  return [
    build.labels.summary,
    build.labels.competencies,
    build.labels.experience,
    build.labels.projects,
    build.labels.education,
    ...(build.certifications.length > 0 ? [build.labels.certifications] : []),
    build.labels.skills,
  ];
}
