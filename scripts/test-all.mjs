#!/usr/bin/env node

/**
 * test-all.mjs - Comprehensive test suite for career-ops
 *
 * Run before merging any PR or pushing changes.
 * Tests: syntax, scripts, dashboard, data contract, personal data, paths.
 *
 * Usage:
 *   node scripts/test-all.mjs           # Run all tests
 *   node scripts/test-all.mjs --quick   # Skip dashboard build (faster)
 */

import { execSync, execFileSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const QUICK = process.argv.includes('--quick');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
  passed++;
}
function fail(msg) {
  console.log(`  [FAIL] ${msg}`);
  failed++;
}
function warn(msg) {
  console.log(`  [WARN] ${msg}`);
  warnings++;
}

function run(cmd, args = [], opts = {}) {
  try {
    if (Array.isArray(args) && args.length > 0) {
      return execFileSync(cmd, args, {
        cwd: ROOT,
        encoding: 'utf-8',
        timeout: 30000,
        ...opts,
      }).trim();
    }
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30000,
      ...opts,
    }).trim();
  } catch (e) {
    return null;
  }
}

function fileExists(path) {
  return existsSync(join(ROOT, path));
}
function readFile(path) {
  return readFileSync(join(ROOT, path), 'utf-8');
}
function readJson(path) {
  return JSON.parse(readFile(path));
}
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

console.log('\ncareer-ops test suite\n');

// -- 1. SYNTAX CHECKS --------------------------------------------

console.log('1. Syntax checks');

const mjsFiles = readdirSync(join(ROOT, 'scripts')).filter((f) =>
  f.endsWith('.mjs'),
);
for (const f of mjsFiles) {
  const result = run('node', ['--check', join('scripts', f)]);
  if (result !== null) {
    pass(`${f} syntax OK`);
  } else {
    fail(`${f} has syntax errors`);
  }
}

// -- 2. SCRIPT EXECUTION -----------------------------------------

console.log('\n2. Script execution (graceful on empty data)');

const scripts = [
  { name: 'cv-sync-check.mjs', expectExit: 1, allowFail: true }, // fails without cv.md (normal in repo)
  { name: 'verify-pipeline.mjs', expectExit: 0 },
  { name: 'normalize-statuses.mjs', expectExit: 0 },
  { name: 'dedup-tracker.mjs', expectExit: 0 },
  { name: 'merge-tracker.mjs', expectExit: 0 },
  { name: 'update-system.mjs check', expectExit: 0 },
];

for (const { name, allowFail } of scripts) {
  const parts = name.split(' ');
  parts[0] = join('scripts', parts[0]);
  const result = run('node', parts, { stdio: ['pipe', 'pipe', 'pipe'] });
  if (result !== null) {
    pass(`${name} runs OK`);
  } else if (allowFail) {
    warn(`${name} exited with error (expected without user data)`);
  } else {
    fail(`${name} crashed`);
  }
}

// -- 3. LIVENESS CLASSIFICATION ----------------------------------

console.log('\n3. Liveness classification');

try {
  const { classifyLiveness } = await import(
    pathToFileURL(join(ROOT, 'scripts', 'liveness-core.mjs')).href
  );

  const expiredChromeApply = classifyLiveness({
    finalUrl: 'https://example.com/jobs/closed-role',
    bodyText:
      'Company Careers\nApply\nThe job you are looking for is no longer open.',
    applyControls: [],
  });
  if (expiredChromeApply.result === 'expired') {
    pass('Expired pages are not revived by nav/footer "Apply" text');
  } else {
    fail(`Expired page misclassified as ${expiredChromeApply.result}`);
  }

  const activeWorkdayPage = classifyLiveness({
    finalUrl: 'https://example.workday.com/job/123',
    bodyText: [
      '663 JOBS FOUND',
      'Senior AI Engineer',
      'Join our applied AI team to ship production systems, partner with customers, and own delivery across evaluation, deployment, and reliability.',
    ].join('\n'),
    applyControls: ['Apply for this Job'],
  });
  if (activeWorkdayPage.result === 'active') {
    pass('Visible apply controls still keep real job pages active');
  } else {
    fail(`Active job page misclassified as ${activeWorkdayPage.result}`);
  }
} catch (e) {
  fail(`Liveness classification tests crashed: ${e.message}`);
}

// -- 3b. BATCH RUNNER CONTRACT ----------------------------------

console.log('\n3b. Batch runner contract');

const batchContract = run('node', ['scripts/test-batch-runner-contract.mjs']);
if (batchContract !== null) {
  pass('Batch runner contract tests pass');
} else {
  fail('Batch runner contract tests failed');
}

// -- 3c. BATCH RUNNER STATE SEMANTICS ---------------------------

console.log('\n3c. Batch runner state semantics');

const batchStateSemantics = run('node', ['scripts/test-batch-runner-state-semantics.mjs']);
if (batchStateSemantics !== null) {
  pass('Batch runner state-semantics tests pass');
} else {
  fail('Batch runner state-semantics tests failed');
}

// -- 3d. BATCH RUNNER CLOSEOUT ----------------------------------

console.log('\n3d. Batch runner closeout');

const batchCloseout = run('node', ['scripts/test-batch-runner-closeout.mjs']);
if (batchCloseout !== null) {
  pass('Batch runner closeout tests pass');
} else {
  fail('Batch runner closeout tests failed');
}

// -- 4. DASHBOARD BUILD ------------------------------------------

if (!QUICK) {
  console.log('\n4. Dashboard build');
  const goBuild = run(
    'cd dashboard && go build -o /tmp/career-dashboard-test . 2>&1',
  );
  if (goBuild !== null) {
    pass('Dashboard compiles');
  } else {
    fail('Dashboard build failed');
  }
} else {
  console.log('\n4. Dashboard build (skipped --quick)');
}

// -- 5. DATA CONTRACT --------------------------------------------

console.log('\n5. Data contract validation');

// Check system files exist
const systemFiles = [
  'AGENTS.md',
  '.codex/skills/career-ops/SKILL.md',
  'VERSION',
  'docs/DATA_CONTRACT.md',
  'modes/_shared.md',
  'modes/_profile.template.md',
  'modes/oferta.md',
  'modes/pdf.md',
  'modes/scan.md',
  'templates/states.yml',
  'templates/cv-template.html',
];

for (const f of systemFiles) {
  if (fileExists(f)) {
    pass(`System file exists: ${f}`);
  } else {
    fail(`Missing system file: ${f}`);
  }
}

// Check user files are NOT tracked (gitignored)
const userFiles = ['config/profile.yml', 'modes/_profile.md', 'portals.yml'];
for (const f of userFiles) {
  const tracked = run('git', ['ls-files', f]);
  if (tracked === '') {
    pass(`User file gitignored: ${f}`);
  } else if (tracked === null) {
    pass(`User file gitignored: ${f}`);
  } else {
    fail(`User file IS tracked (should be gitignored): ${f}`);
  }
}

// -- 6. PERSONAL DATA LEAK CHECK ---------------------------------

console.log('\n6. Personal data leak check');

const leakPatterns = [
  'Santiago',
  'santifer.io',
  'Santifer iRepair',
  'Zinkee',
  'ALMAS',
  'hi@santifer.io',
  '688921377',
  '/Users/santifer/',
];

const scanExtensions = ['md', 'yml', 'html', 'mjs', 'sh', 'go', 'json'];
const allowedFiles = [
  // English README + localized translations (all legitimately credit Santiago)
  'README.md',
  'docs/README.es.md',
  'docs/README.ja.md',
  'docs/README.ko-KR.md',
  'docs/README.pt-BR.md',
  'docs/README.ru.md',
  'docs/README.zh-TW.md',
  // Standard project files
  'LICENSE',
  'docs/CITATION.cff',
  'docs/CONTRIBUTING.md',
  'docs/CREDITS.md',
  'package.json',
  '.github/FUNDING.yml',
  'AGENTS.md',
  'go.mod',
  'scripts/test-all.mjs',
  // Community / governance files (added in v1.3.0, all legitimately reference the maintainer)
  'docs/CODE_OF_CONDUCT.md',
  'docs/GOVERNANCE.md',
  'docs/SECURITY.md',
  'docs/SUPPORT.md',
  '.github/SECURITY.md',
  // Dashboard credit string
  'dashboard/internal/ui/screens/pipeline.go',
  'dashboard/internal/ui/screens/progress.go',
];

// Build pathspec for git grep - only scan tracked files matching these
// extensions. This is what `grep -rn` was trying to do, but git-aware:
// untracked files (debate artifacts, AI tool scratch, local plans/) and
// gitignored files can't trigger false positives because they were never
// going to reach a commit anyway.
const grepPathspec = scanExtensions.map((e) => `'*.${e}'`).join(' ');

let leakFound = false;
for (const pattern of leakPatterns) {
  const result = run(`git grep -n "${pattern}" -- ${grepPathspec} 2>/dev/null`);
  if (result) {
    for (const line of result.split('\n')) {
      const file = line.split(':')[0];
      if (allowedFiles.some((a) => file.includes(a))) continue;
      if (file.includes('dashboard/go.mod')) continue;
      warn(`Possible personal data in ${file}: "${pattern}"`);
      leakFound = true;
    }
  }
}
if (!leakFound) {
  pass('No personal data leaks outside allowed files');
}

// -- 7. ABSOLUTE PATH CHECK --------------------------------------

console.log('\n7. Absolute path check');

// Same git grep approach: only scans tracked files. Untracked AI tool
// outputs, local debate artifacts, etc. can't false-positive here.
const absPathResult = run(
  `git grep -n "/Users/" -- '*.mjs' '*.sh' '*.md' '*.go' '*.yml' 2>/dev/null | grep -v README.md | grep -v LICENSE | grep -v scripts/test-all.mjs`,
);
if (!absPathResult) {
  pass('No absolute paths in code files');
} else {
  for (const line of absPathResult.split('\n').filter(Boolean)) {
    fail(`Absolute path: ${line.slice(0, 100)}`);
  }
}

// -- 8. MODE FILE INTEGRITY --------------------------------------

console.log('\n8. Mode file integrity');

const expectedModes = [
  '_shared.md',
  '_profile.template.md',
  'oferta.md',
  'pdf.md',
  'scan.md',
  'batch.md',
  'apply.md',
  'auto-pipeline.md',
  'contacto.md',
  'deep.md',
  'ofertas.md',
  'pipeline.md',
  'project.md',
  'tracker.md',
  'training.md',
];

for (const mode of expectedModes) {
  if (fileExists(`modes/${mode}`)) {
    pass(`Mode exists: ${mode}`);
  } else {
    fail(`Missing mode: ${mode}`);
  }
}

// Check _shared.md references _profile.md
const shared = readFile('modes/_shared.md');
if (shared.includes('_profile.md')) {
  pass('_shared.md references _profile.md');
} else {
  fail('_shared.md does NOT reference _profile.md');
}

// -- 9. CODEX-PRIMARY INSTRUCTION SURFACE ------------------------

console.log('\n9. Codex-primary instruction surface');

if (fileExists('AGENTS.md')) {
  pass('AGENTS.md exists');
} else {
  fail('AGENTS.md missing');
}

const agents = readFile('AGENTS.md');
if (agents.includes('Startup Checklist (every session)')) {
  pass('AGENTS.md includes the startup checklist');
} else {
  fail('AGENTS.md missing the startup checklist');
}

const skillPath = '.codex/skills/career-ops/SKILL.md';
if (fileExists(skillPath)) {
  pass('career-ops skill exists');
  const careerOpsSkill = readFile(skillPath);

  if (careerOpsSkill.includes('1. `AGENTS.md`')) {
    pass('career-ops skill reads AGENTS.md first');
  } else {
    fail('career-ops skill does not read AGENTS.md first');
  }

  const bootstrapMarkers = [
    'node scripts/update-system.mjs check',
    '`cv.md`',
    '`config/profile.yml`',
    '`modes/_profile.md`',
    '`portals.yml`',
  ];
  const missingBootstrapMarkers = bootstrapMarkers.filter(
    (marker) => !careerOpsSkill.includes(marker),
  );
  if (missingBootstrapMarkers.length === 0) {
    pass('career-ops skill bootstrap matches the startup checklist');
  } else {
    fail(
      `career-ops skill missing startup checklist markers: ${missingBootstrapMarkers.join(', ')}`,
    );
  }

  if (
    !careerOpsSkill.includes('docs/CODEX.md') &&
    !careerOpsSkill.includes('docs/CLAUDE.md')
  ) {
    pass('career-ops skill has no legacy instruction-doc dependency');
  } else {
    fail('career-ops skill still references legacy instruction docs');
  }
} else {
  fail('career-ops skill missing');
}

if (!shared.includes('docs/CODEX.md') && !shared.includes('docs/CLAUDE.md')) {
  pass('shared mode guidance has no legacy instruction-doc dependency');
} else {
  fail('shared mode guidance still references legacy instruction docs');
}

// -- 10. METADATA PATH ALIGNMENT ---------------------------------

console.log('\n10. Metadata path alignment');

const updaterScript = readFile('scripts/update-system.mjs');
if (
  updaterScript.includes("'.codex/skills/'") &&
  !updaterScript.includes("'.claude/skills/'")
) {
  pass('Updater system paths use .codex/skills/');
} else {
  fail('Updater system paths are not aligned to .codex/skills/');
}

const dataContract = readFile('docs/DATA_CONTRACT.md');
const dataContractLines = dataContract.split('\n');
if (
  dataContractLines.some(
    (line) =>
      line.includes('`.codex/skills/*`') && line.includes('Skill definitions'),
  ) &&
  !dataContract.includes('.claude/skills/*')
) {
  pass('Data contract names .codex/skills/* as the system skill surface');
} else {
  fail('Data contract skill surface is not aligned to .codex/skills/*');
}

const labeler = readFile('.github/labeler.yml');
const labelerLines = labeler.split('\n').map((line) => line.trim());
const requiredLabelerLines = [
  '- AGENTS.md',
  '- docs/DATA_CONTRACT.md',
  '- .codex/skills/**',
  '- docs/CONTRIBUTING.md',
  '- docs/GOVERNANCE.md',
  '- docs/CODE_OF_CONDUCT.md',
  '- docs/SECURITY.md',
  '- docs/SUPPORT.md',
];
const missingLabelerLines = requiredLabelerLines.filter(
  (line) => !labelerLines.includes(line),
);
if (missingLabelerLines.length === 0) {
  pass('Labeler targets the live metadata and docs paths');
} else {
  fail(`Labeler missing live path globs: ${missingLabelerLines.join(', ')}`);
}

const forbiddenLabelerLines = [
  '- CLAUDE.md',
  '- DATA_CONTRACT.md',
  '- .claude/skills/**',
  '- CONTRIBUTING.md',
  '- GOVERNANCE.md',
  '- CODE_OF_CONDUCT.md',
  '- SECURITY.md',
  '- SUPPORT.md',
];
const forbiddenLabelerMatches = forbiddenLabelerLines.filter((line) =>
  labelerLines.includes(line),
);
if (forbiddenLabelerMatches.length === 0) {
  pass('Labeler has no dead metadata or root-doc globs');
} else {
  fail(
    `Labeler still includes dead path globs: ${forbiddenLabelerMatches.join(', ')}`,
  );
}

const contributorMetadataChecks = [
  {
    path: '.github/PULL_REQUEST_TEMPLATE.md',
    required: [
      'https://github.com/santifer/career-ops/blob/main/docs/CONTRIBUTING.md',
    ],
    forbidden: [
      'https://github.com/santifer/career-ops/blob/main/CONTRIBUTING.md',
    ],
  },
  {
    path: '.github/workflows/welcome.yml',
    required: [
      'https://github.com/santifer/career-ops/blob/main/docs/CONTRIBUTING.md',
      'https://github.com/santifer/career-ops/blob/main/docs/SUPPORT.md',
    ],
    forbidden: [
      'https://github.com/santifer/career-ops/blob/main/CONTRIBUTING.md',
      'https://github.com/santifer/career-ops/blob/main/SUPPORT.md',
    ],
  },
  {
    path: '.github/ISSUE_TEMPLATE/bug_report.yml',
    required: [
      'https://github.com/santifer/career-ops/blob/main/docs/CODE_OF_CONDUCT.md',
    ],
    forbidden: [
      'https://github.com/santifer/career-ops/blob/main/CODE_OF_CONDUCT.md',
    ],
  },
  {
    path: '.github/ISSUE_TEMPLATE/feature_request.yml',
    required: [
      'https://github.com/santifer/career-ops/blob/main/docs/CODE_OF_CONDUCT.md',
    ],
    forbidden: [
      'https://github.com/santifer/career-ops/blob/main/CODE_OF_CONDUCT.md',
    ],
  },
];

for (const check of contributorMetadataChecks) {
  const fileText = readFile(check.path);
  const missingRequired = check.required.filter(
    (marker) => !fileText.includes(marker),
  );
  const forbiddenPresent = check.forbidden.filter((marker) =>
    fileText.includes(marker),
  );

  if (missingRequired.length === 0 && forbiddenPresent.length === 0) {
    pass(`${check.path} points at live contributor docs`);
  } else {
    const details = [
      missingRequired.length > 0
        ? `missing ${missingRequired.join(', ')}`
        : null,
      forbiddenPresent.length > 0
        ? `contains ${forbiddenPresent.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('; ');
    fail(`${check.path} has metadata path drift: ${details}`);
  }
}

// -- 11. VALIDATOR RUNTIME CONTRACT -------------------------------

console.log('\n11. Validator runtime contract');

const doctorOutput = run('npm', ['run', 'doctor'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});
if (doctorOutput === null) {
  fail('npm run doctor failed');
} else {
  const normalizedDoctorOutput = stripAnsi(doctorOutput);
  const hasCodexFooter = normalizedDoctorOutput.includes(
    'Run `codex` to start.',
  );
  const hasLegacyRuntimeHint =
    normalizedDoctorOutput.includes('`claude`') &&
    normalizedDoctorOutput.includes('to start.');

  if (hasCodexFooter && !hasLegacyRuntimeHint) {
    pass('Doctor success output points to codex');
  } else {
    fail(
      'Doctor success output is not aligned to the Codex-primary runtime contract',
    );
  }
}

// -- 12. VERSION FILE --------------------------------------------

console.log('\n12. Version file');

if (fileExists('VERSION')) {
  const canonicalVersion = readFile('VERSION').trim();
  if (/^\d+\.\d+\.\d+$/.test(canonicalVersion)) {
    pass(`VERSION is valid semver: ${canonicalVersion}`);

    if (fileExists('package.json')) {
      const packageVersion = readJson('package.json').version;
      if (packageVersion === canonicalVersion) {
        pass(`package.json version matches VERSION (${canonicalVersion})`);
      } else {
        fail(
          `package.json version mismatch: expected ${canonicalVersion} from VERSION, found ${packageVersion}`,
        );
      }
    } else {
      fail('package.json missing');
    }

    if (fileExists('package-lock.json')) {
      const lockfile = readJson('package-lock.json');
      const lockVersion = lockfile.version;
      const lockRootVersion =
        lockfile.packages && lockfile.packages['']
          ? lockfile.packages[''].version
          : null;

      if (lockVersion === canonicalVersion) {
        pass(`package-lock.json version matches VERSION (${canonicalVersion})`);
      } else {
        fail(
          `package-lock.json version mismatch: expected ${canonicalVersion} from VERSION, found ${lockVersion}`,
        );
      }

      if (lockRootVersion === canonicalVersion) {
        pass(
          `package-lock.json packages[""] version matches VERSION (${canonicalVersion})`,
        );
      } else {
        fail(
          `package-lock.json packages[""] version mismatch: expected ${canonicalVersion} from VERSION, found ${lockRootVersion}`,
        );
      }
    } else {
      fail('package-lock.json missing');
    }
  } else {
    fail(`VERSION is not valid semver: "${canonicalVersion}"`);
  }
} else {
  fail('VERSION file missing');
}

// -- SUMMARY -----------------------------------------------------

console.log('\n' + '='.repeat(50));
console.log(
  `Results: ${passed} passed, ${failed} failed, ${warnings} warnings`,
);

if (failed > 0) {
  console.log('TESTS FAILED - do NOT push/merge until fixed\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('Tests passed with warnings - review before pushing\n');
  process.exit(0);
} else {
  console.log('All tests passed - safe to push/merge\n');
  process.exit(0);
}
