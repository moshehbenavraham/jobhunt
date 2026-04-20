#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function withCapturedLogs(fn) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => {
    lines.push(args.join(' '));
  };
  try {
    const result = fn();
    return { result, output: lines.join('\n') };
  } finally {
    console.log = original;
  }
}

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-analyze-patterns-'));
process.env.JOBHUNT_ROOT = sandbox;

writeFile(
  join(sandbox, 'data', 'applications.md'),
  [
    '# Applications Tracker',
    '',
    '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
    '| 1 | 2026-04-01 | Acme | Platform Engineer | 4.8 | Offer | ✅ | [001](reports/001-acme.md) | global remote note |',
    '| 2 | 2026-04-02 | Beta | Full Stack Engineer | 4.2 | Interview |  | [002](reports/002-beta.md) | remote |',
    '| 3 | 2026-04-03 | Gamma | Data Engineer | 3.1 | Rejected |  | [003](reports/003-gamma.md) | office |',
    '| 4 | 2026-04-04 | Delta | Backend Engineer | 2.8 | No aplicar |  | [004](reports/004-delta.md) | latam remote |',
    '| 5 | 2026-04-05 | Echo | ML Engineer | 3.9 | Evaluada |  | [005](reports/005-echo.md) | global remote |',
    '',
  ].join('\n'),
);

writeFile(
  join(sandbox, 'reports', '001-acme.md'),
  [
    '| Archetype | Platform Builder |',
    '| Seniority | Senior |',
    '| Remote | Global remote |',
    '| Team size | 10-50 employees |',
    '| Comp | $180k |',
    '| Domain | AI tooling |',
    '| CV Match | 4.7/5 |',
    '| North Star | 4.9/5 |',
    '| Comp | 4.0/5 |',
    '| Cultural signals | 4.5/5 |',
    '| Red flags | -0.5 |',
    '| Global | 4.8/5 |',
    '',
    '| Gap | Severity | Mitigation |',
    '| --- | --- | --- |',
    '| TypeScript depth | hard | build a stronger TS project |',
    '',
  ].join('\n'),
);

writeFile(
  join(sandbox, 'reports', '002-beta.md'),
  [
    '| Arquetipo | Platform Builder |',
    '| Nivel | Senior |',
    '| Remote | work from anywhere |',
    '| Team | 30 people |',
    '| Domain | Infrastructure |',
    '| CV Match | 4.0/5 |',
    '| Global | 4.2/5 |',
    '',
    '| Gap | Severity | Mitigation |',
    '| --- | --- | --- |',
    '| React depth | hard | add frontend examples |',
    '',
  ].join('\n'),
);

writeFile(
  join(sandbox, 'reports', '003-gamma.md'),
  [
    '| Archetype | Data Specialist |',
    '| Remote | Hybrid office |',
    '| Team size | 1200 employees |',
    '| Global | 3.1/5 |',
    '',
    '| Gap | Severity | Mitigation |',
    '| --- | --- | --- |',
    '| US residency required | hard | relocate |',
    '',
  ].join('\n'),
);

writeFile(
  join(sandbox, 'reports', '004-delta.md'),
  [
    '| Archetype | Data Specialist |',
    '| Remote | Argentina remote only |',
    '| Team size | founding team of 6 |',
    '| Global | 2.8/5 |',
    '',
    '| Gap | Severity | Mitigation |',
    '| --- | --- | --- |',
    '| JavaScript stack | hard | retrain |',
    '',
  ].join('\n'),
);

writeFile(
  join(sandbox, 'reports', '005-echo.md'),
  [
    '| Archetype | Advisor |',
    '| Remote | Residents only |',
    '| Team size | enterprise |',
    '| Global | 3.9/5 |',
    '',
  ].join('\n'),
);

const analyzeModule = await import(
  pathToFileURL(join(ROOT, 'scripts', 'analyze-patterns.mjs')).href
);

assert.equal(analyzeModule.normalizeStatus('Aplicada 2026-04-01'), 'applied');
assert.equal(analyzeModule.classifyOutcome('Offer'), 'positive');
assert.equal(analyzeModule.classifyOutcome('Rechazada'), 'negative');
assert.equal(
  analyzeModule.classifyRemote('US only remote role'),
  'geo-restricted',
);
assert.equal(
  analyzeModule.classifyRemote('hybrid office in Columbus'),
  'hybrid/onsite',
);
assert.equal(
  analyzeModule.classifyRemote('work from anywhere worldwide'),
  'global remote',
);
assert.equal(
  analyzeModule.classifyRemote('LATAM fully remote'),
  'regional remote',
);
assert.equal(
  analyzeModule.classifyCompanySize('founding team of 6'),
  'startup',
);
assert.equal(analyzeModule.classifyCompanySize('team of 150'), 'scaleup');
assert.equal(
  analyzeModule.classifyCompanySize('enterprise org of 1200'),
  'enterprise',
);
assert.equal(
  analyzeModule.extractBlockerType({
    description: 'US residency required',
    severity: 'hard',
  }),
  'geo-restriction',
);
assert.equal(
  analyzeModule.extractBlockerType({
    description: 'React experience',
    severity: 'hard',
  }),
  'stack-mismatch',
);
assert.equal(
  analyzeModule.extractBlockerType({
    description: 'Principal-level leadership',
    severity: 'hard',
  }),
  'seniority-mismatch',
);
assert.equal(
  analyzeModule.extractBlockerType({
    description: 'Hybrid office schedule',
    severity: 'hard',
  }),
  'onsite-requirement',
);
assert.equal(
  analyzeModule.extractBlockerType({
    description: 'Soft communication gap',
    severity: 'soft',
  }),
  null,
);

const parsedReport = analyzeModule.parseReport(
  join(sandbox, 'reports', '001-acme.md'),
);
assert.equal(parsedReport.archetype, 'Platform Builder');
assert.equal(parsedReport.remote, 'Global remote');
assert.equal(parsedReport.scores.global, 4.8);
assert.equal(parsedReport.gaps[0].severity, 'hard');

const result = analyzeModule.analyze(2);
assert.equal(result.metadata.total, 5);
assert.deepEqual(result.metadata.byOutcome, {
  positive: 2,
  negative: 1,
  self_filtered: 1,
  pending: 1,
});
assert.equal(result.funnel.offer, 1);
assert.equal(result.funnel.interview, 1);
assert.equal(result.scoreComparison.positive.count, 2);
assert.equal(result.archetypeBreakdown[0].archetype, 'Platform Builder');
assert.equal(result.blockerAnalysis[0].blocker, 'stack-mismatch');
assert.equal(result.remotePolicy[0].policy, 'global remote');
assert.equal(result.companySizeBreakdown[0].size, 'startup');
assert.equal(result.scoreThreshold.recommended, 4.2);
assert.ok(result.techStackGaps.some((gap) => gap.skill === 'JavaScript'));
assert.ok(
  result.recommendations.some((rec) =>
    rec.action.includes('Set minimum score threshold'),
  ),
);

const summary = withCapturedLogs(() =>
  analyzeModule.runAnalysisCli(['--summary', '--min-threshold', '2']),
);
assert.equal(summary.result.metadata.total, 5);
assert.match(summary.output, /Pattern Analysis/);
assert.match(summary.output, /RECOMMENDATIONS/);

const insufficient = withCapturedLogs(() =>
  analyzeModule.runAnalysisCli(['--min-threshold', '10']),
);
assert.match(insufficient.output, /Not enough data/);
assert.equal(insufficient.result.threshold, 10);

rmSync(sandbox, { recursive: true, force: true });
console.log('analyze-patterns regression tests pass');
