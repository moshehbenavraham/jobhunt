#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createSkillGapReport,
  extractJdRequirements,
  runSkillGapCli,
  splitCvSkillsSection,
} from './jd-skill-gap.mjs';

const jd = `# Senior Engineer

## Requirements
- Python, PostgreSQL, C++, C#, and Node.js for production services
- Experience with Kubernetes and distributed systems
- Bachelor's degree required

## Nice to have
- Familiarity with GCP and RAG
`;
const cv = `# Experience
Built Kubernetes platforms and retrieval augmented generation workflows.

# Skills
Python, PostgreSQL, Docker, C++
`;

const requirements = extractJdRequirements(jd);
assert.ok(requirements.some((item) => item.skill === 'C++'));
assert.ok(requirements.some((item) => item.skill === 'C#'));
assert.ok(requirements.some((item) => item.skill === 'Node.js'));
assert.ok(requirements.some((item) => item.skill === 'distributed systems'));
assert.ok(requirements.some((item) => item.skill === 'RAG'));
assert.equal(
  requirements.some((item) => item.skill === 'Bachelor'),
  false,
);
assert.equal(
  requirements.find((item) => item.skill === 'GCP').importance,
  'nice-to-have',
);

const split = splitCvSkillsSection(cv);
assert.match(split.namedSkillsText, /C\+\+/);
assert.doesNotMatch(split.proseText, /^Python/m);

const report = createSkillGapReport({
  jdText: jd,
  cvText: cv,
  jdPath: 'jds/acme.md',
  cvPath: 'profile/cv.md',
});
const bySkill = new Map(
  report.requirements.map((item) => [item.skill, item.classification]),
);
assert.equal(bySkill.get('Python'), 'existing');
assert.equal(bySkill.get('Kubernetes'), 'supported-by-resume');
assert.equal(bySkill.get('GCP'), 'gap');
assert.equal(bySkill.get('RAG'), 'supported-by-resume');
assert.equal(report.policy.autoAddClaims, false);

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-skill-gap-'));
try {
  mkdirSync(join(sandbox, 'jds'));
  mkdirSync(join(sandbox, 'profile'));
  writeFileSync(join(sandbox, 'jds', 'acme.md'), jd);
  writeFileSync(join(sandbox, 'profile', 'cv.md'), cv);
  const exitCode = runSkillGapCli([
    'jds/acme.md',
    `--root=${sandbox}`,
    '--output=reports/acme-skill-gap.json',
    '--json',
  ]);
  assert.equal(exitCode, 0);
  const output = join(sandbox, 'reports', 'acme-skill-gap.json');
  assert.equal(existsSync(output), true);
  assert.equal(JSON.parse(readFileSync(output, 'utf8')).schemaVersion, 1);
  assert.throws(
    () =>
      runSkillGapCli([
        'jds/acme.md',
        `--root=${sandbox}`,
        '--output=../escape.json',
      ]),
    /escapes/,
  );
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('JD skill-gap preflight tests passed');
