#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishArtifactSet, resolveArtifactPath } from './artifact-policy.mjs';
import { parseEvaluationSummary } from './evaluation-summary.mjs';
import { createSkillGapReport } from './jd-skill-gap.mjs';
import { assertContainedPath } from './path-policy.mjs';
import { writeFileAtomic } from './tracker-utils.mjs';

export const UPSKILL_REPORT_SCHEMA_VERSION = 1;

function normalizedRequirement(value) {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function regularFiles(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter(predicate)
    .map((name) => resolve(directory, name))
    .filter((path) => {
      const stat = lstatSync(path);
      return stat.isFile() && !stat.isSymbolicLink();
    })
    .sort();
}

export function aggregateGapEvidence(evidence) {
  const grouped = new Map();
  for (const item of evidence) {
    const key = normalizedRequirement(item.requirement);
    if (!key) continue;
    if (!grouped.has(key)) {
      grouped.set(key, {
        requirement: item.requirement.trim(),
        hardMentions: 0,
        softMentions: 0,
        mustHaveMentions: 0,
        weightedPriority: 0,
        sources: [],
      });
    }
    const entry = grouped.get(key);
    const sourceKey = `${item.sourcePath}:${item.kind}`;
    if (entry.sources.some((source) => source.key === sourceKey)) continue;
    entry.sources.push({
      key: sourceKey,
      path: item.sourcePath,
      url: item.sourceUrl || null,
      kind: item.kind,
      score: item.score ?? null,
    });
    if (item.kind === 'hard_stop') entry.hardMentions++;
    if (item.kind === 'soft_gap') entry.softMentions++;
    if (item.kind === 'must_have_gap') entry.mustHaveMentions++;
    entry.weightedPriority += item.weight;
  }
  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      weightedPriority: Math.round(entry.weightedPriority * 100) / 100,
      tier:
        entry.hardMentions + entry.mustHaveMentions >= 3
          ? 'critical'
          : entry.hardMentions + entry.mustHaveMentions >= 2
            ? 'high'
            : entry.sources.length >= 2
              ? 'medium'
              : 'low',
      sources: entry.sources.map(({ key: _key, ...source }) => source),
    }))
    .sort(
      (a, b) =>
        b.weightedPriority - a.weightedPriority ||
        b.sources.length - a.sources.length ||
        a.requirement.localeCompare(b.requirement),
    );
}

function collectMachineSummaries(root) {
  const reportsRoot = resolve(root, 'reports');
  const evidence = [];
  const quality = { reportsRead: 0, machineSummaries: 0, invalidReports: [] };
  for (const path of regularFiles(reportsRoot, (name) =>
    /^\d{3,}-.+\.md$/i.test(name),
  )) {
    quality.reportsRead++;
    const sourcePath = relative(root, path).replaceAll('\\', '/');
    try {
      const summary = parseEvaluationSummary(readFileSync(path, 'utf8'));
      quality.machineSummaries++;
      for (const requirement of summary.hard_stops) {
        evidence.push({
          requirement,
          kind: 'hard_stop',
          sourcePath,
          sourceUrl: summary.url,
          score: summary.score,
          weight: Math.max(1, 6 - summary.score),
        });
      }
      for (const requirement of summary.soft_gaps) {
        evidence.push({
          requirement,
          kind: 'soft_gap',
          sourcePath,
          sourceUrl: summary.url,
          score: summary.score,
          weight: Math.max(0.5, (6 - summary.score) / 2),
        });
      }
    } catch (error) {
      quality.invalidReports.push({
        path: sourcePath,
        reason: error.issues?.[0]?.message || error.message,
      });
    }
  }
  return { evidence, quality };
}

function collectSkillGapSidecars(root) {
  const reportsRoot = resolve(root, 'reports');
  const evidence = [];
  const quality = { sidecarsRead: 0, invalidSidecars: [] };
  for (const path of regularFiles(reportsRoot, (name) =>
    /skill-gap.*\.json$|\.skill-gap\.json$/i.test(name),
  )) {
    const sourcePath = relative(root, path).replaceAll('\\', '/');
    try {
      const report = JSON.parse(readFileSync(path, 'utf8'));
      if (
        report.schemaVersion !== 1 ||
        !Array.isArray(report.requirements) ||
        typeof report.sources?.jdPath !== 'string'
      ) {
        throw new Error('unsupported JD skill-gap contract');
      }
      quality.sidecarsRead++;
      for (const item of report.requirements) {
        if (item.classification !== 'gap') continue;
        evidence.push({
          requirement: item.skill,
          kind:
            item.importance === 'must-have'
              ? 'must_have_gap'
              : 'nice_to_have_gap',
          sourcePath,
          sourceUrl: null,
          score: null,
          weight: item.importance === 'must-have' ? 2 : 0.75,
        });
      }
    } catch (error) {
      quality.invalidSidecars.push({
        path: sourcePath,
        reason: error.message,
      });
    }
  }
  return { evidence, quality };
}

export function buildAggregateUpskillReport(root) {
  const machine = collectMachineSummaries(root);
  const sidecars = collectSkillGapSidecars(root);
  const evidence = [...machine.evidence, ...sidecars.evidence];
  return {
    schemaVersion: UPSKILL_REPORT_SCHEMA_VERSION,
    mode: 'aggregate',
    generatedAt: new Date().toISOString(),
    gaps: aggregateGapEvidence(evidence),
    dataQuality: {
      ...machine.quality,
      ...sidecars.quality,
      evidenceItems: evidence.length,
      extraction:
        'exact Machine Summary requirements plus structured JD skill-gap sidecars; no semantic expansion',
    },
  };
}

export function buildTargetedUpskillReport({
  root,
  jdPath,
  cvPath = 'profile/cv.md',
}) {
  const projectRoot = resolve(root);
  const jd = assertContainedPath(projectRoot, resolve(projectRoot, jdPath), {
    mustExist: true,
    label: 'Target JD',
  });
  const cv = assertContainedPath(projectRoot, resolve(projectRoot, cvPath), {
    mustExist: true,
    label: 'CV',
  });
  for (const [label, path] of [
    ['Target JD', jd],
    ['CV', cv],
  ]) {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`${label} must be a regular non-symlink file`);
    }
  }
  const skillGap = createSkillGapReport({
    jdText: readFileSync(jd, 'utf8'),
    cvText: readFileSync(cv, 'utf8'),
    jdPath: relative(projectRoot, jd).replaceAll('\\', '/'),
    cvPath: relative(projectRoot, cv).replaceAll('\\', '/'),
  });
  return {
    schemaVersion: UPSKILL_REPORT_SCHEMA_VERSION,
    mode: 'targeted',
    generatedAt: new Date().toISOString(),
    source: skillGap.sources,
    gaps: skillGap.requirements
      .filter((item) => item.classification === 'gap')
      .map((item) => ({
        requirement: item.skill,
        importance: item.importance,
        jdLine: item.line,
        evidence: item.context,
      })),
    knownOrSupported: skillGap.requirements
      .filter((item) => item.classification !== 'gap')
      .map((item) => ({
        requirement: item.skill,
        classification: item.classification,
      })),
    policy: skillGap.policy,
  };
}

function render(report) {
  const rows =
    report.mode === 'aggregate'
      ? report.gaps.map(
          (item) =>
            `| ${item.requirement.replaceAll('|', '\\|')} | ${item.tier} | ${item.sources.length} | ${item.hardMentions} | ${item.mustHaveMentions} | ${item.weightedPriority} |`,
        )
      : report.gaps.map(
          (item) =>
            `| ${item.requirement.replaceAll('|', '\\|')} | ${item.importance} | ${item.jdLine} | ${item.evidence.replaceAll('|', '\\|')} |`,
        );
  const header =
    report.mode === 'aggregate'
      ? [
          '| Exact requirement | Tier | Sources | Hard stops | Must-have gaps | Weight |',
          '| --- | --- | ---: | ---: | ---: | ---: |',
        ]
      : [
          '| Exact requirement | Importance | JD line | Evidence |',
          '| --- | --- | ---: | --- |',
        ];
  const sources =
    report.mode === 'aggregate'
      ? [
          '## Sources',
          '',
          ...report.gaps.flatMap((item) =>
            item.sources.map(
              (source) =>
                `- **${item.requirement}:** [${basename(source.path)}](../../${source.path})${source.url ? ` — [posting](${source.url})` : ''}`,
            ),
          ),
          '',
        ]
      : [
          '## Source',
          '',
          `- JD: \`${report.source.jdPath}\``,
          `- CV: \`${report.source.cvPath}\``,
          '',
        ];
  return `${[
    `# Upskill Report — ${report.mode}`,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Gaps',
    '',
    ...header,
    ...rows,
    '',
    ...sources,
    '## Policy',
    '',
    '- Exact structured requirements only; no invented semantic aliases.',
    '- Source links are retained for candidate verification.',
    '- This report does not add skills to the CV.',
    '',
  ]
    .join('\n')
    .trimEnd()}\n`;
}

export async function writeUpskillReport({
  root = process.cwd(),
  report,
  output,
  force = false,
}) {
  const projectRoot = resolve(root);
  const defaultName = `upskill-${report.mode}-${new Date()
    .toISOString()
    .slice(0, 10)}.md`;
  const markdown = resolveArtifactPath({
    root: projectRoot,
    directory: 'reports/upskill',
    requested: output || defaultName,
    extensions: ['.md'],
    label: 'Upskill report',
  });
  const json = resolveArtifactPath({
    root: projectRoot,
    directory: 'reports/upskill',
    requested: markdown.path.replace(/\.md$/i, '.json'),
    extensions: ['.json'],
    label: 'Upskill report JSON',
  });
  const mdStage = `${markdown.path}.${process.pid}.${randomUUID()}.stage`;
  const jsonStage = `${json.path}.${process.pid}.${randomUUID()}.stage`;
  try {
    writeFileAtomic(mdStage, render(report));
    writeFileAtomic(jsonStage, `${JSON.stringify(report, null, 2)}\n`);
    await publishArtifactSet(
      new Map([
        [mdStage, markdown.path],
        [jsonStage, json.path],
      ]),
      { force },
    );
  } catch (error) {
    rmSync(mdStage, { force: true });
    rmSync(jsonStage, { force: true });
    throw error;
  }
  return {
    report: relative(projectRoot, markdown.path).replaceAll('\\', '/'),
    snapshot: relative(projectRoot, json.path).replaceAll('\\', '/'),
    mode: report.mode,
    gaps: report.gaps.length,
  };
}

function argument(argv, name) {
  return argv
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function usage() {
  return [
    'Usage: node scripts/upskill-report.mjs [--jd=jds/role.md] [--cv=profile/cv.md]',
    '  [--output=name.md] [--force] [--json] [--root=.]',
    'Without --jd, aggregates exact requirements from tracked reports and skill-gap sidecars.',
  ].join('\n');
}

export async function runUpskillReportCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const root = resolve(
    argument(argv, '--root') || options.root || process.cwd(),
  );
  const jdPath = argument(argv, '--jd');
  const report = jdPath
    ? buildTargetedUpskillReport({
        root,
        jdPath,
        cvPath: argument(argv, '--cv') || 'profile/cv.md',
      })
    : buildAggregateUpskillReport(root);
  if (argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }
  const result = await writeUpskillReport({
    root,
    report,
    output: argument(argv, '--output'),
    force: argv.includes('--force'),
  });
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  runUpskillReportCli().catch((error) => {
    console.error(`Upskill report failed: ${error.message}`);
    process.exitCode = 1;
  });
}
