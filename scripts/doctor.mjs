#!/usr/bin/env node

/**
 * doctor.mjs - Setup validation for jobhunt
 * Checks all prerequisites and prints a pass/fail checklist.
 */

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const projectRoot = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');

// ANSI colors (only on TTY)
const isTTY = process.stdout.isTTY;
const green = (s) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s);
const red = (s) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s);
const dim = (s) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s);

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major >= 18) {
    return { pass: true, label: `Node.js >= 18 (v${process.versions.node})` };
  }
  return {
    pass: false,
    label: `Node.js >= 18 (found v${process.versions.node})`,
    fix: 'Install Node.js 18 or later from https://nodejs.org',
  };
}

function checkDependencies() {
  if (existsSync(join(projectRoot, 'node_modules'))) {
    return { pass: true, label: 'Dependencies installed' };
  }
  return {
    pass: false,
    label: 'Dependencies not installed',
    fix: 'Run: npm install',
  };
}

async function checkPlaywright() {
  try {
    const { chromium } = await import('playwright');
    const execPath = chromium.executablePath();
    if (existsSync(execPath)) {
      return { pass: true, label: 'Playwright chromium installed' };
    }
    return {
      pass: false,
      label: 'Playwright chromium not installed',
      fix: 'Run: npx playwright install chromium',
    };
  } catch {
    return {
      pass: false,
      label: 'Playwright chromium not installed',
      fix: 'Run: npx playwright install chromium',
    };
  }
}

async function checkOpenAIAccountAuth() {
  let getStoredCredentialsStatus;
  try {
    ({ getStoredCredentialsStatus } =
      await import('./lib/openai-account-auth/storage.mjs'));
  } catch (error) {
    if (
      error?.code === 'ERR_MODULE_NOT_FOUND' ||
      /Cannot find module|Cannot find package/i.test(String(error?.message))
    ) {
      return {
        kind: 'next',
        label: 'OpenAI account auth runtime not available yet',
        fix: [
          'Run: npm install',
          'If this repo was updated partially, run: node scripts/update-system.mjs apply',
        ],
      };
    }
    throw error;
  }

  const status = await getStoredCredentialsStatus();

  if (!status.authenticated) {
    if (status.reason === 'invalid') {
      return {
        kind: 'next',
        label: 'OpenAI account auth needs repair',
        fix: [
          'Run: npm run auth:openai -- logout',
          'Then run: npm run auth:openai -- login',
        ],
      };
    }

    return {
      kind: 'next',
      label: 'OpenAI account auth not set up yet',
      fix: [
        'Run: npm run auth:openai -- login',
        'Then validate with: npm run agents:codex:smoke -- --json',
      ],
    };
  }

  if (status.expired) {
    return {
      kind: 'next',
      label: `OpenAI account auth expired for ${status.accountId}`,
      fix: [
        'Run: npm run auth:openai -- refresh',
        'If refresh fails, run: npm run auth:openai -- reauth',
      ],
    };
  }

  return {
    kind: 'pass',
    label: `OpenAI account auth ready (${status.accountId})`,
  };
}

function checkCv() {
  const preferred = join(projectRoot, 'profile', 'cv.md');
  if (existsSync(preferred)) {
    return { pass: true, label: 'profile/cv.md found' };
  }

  const legacy = join(projectRoot, 'cv.md');
  if (existsSync(legacy)) {
    return { pass: true, label: 'cv.md found (legacy path)' };
  }

  return {
    pass: false,
    label: 'profile/cv.md not found (legacy root cv.md also accepted)',
    fix: [
      'Run: cp profile/cv.example.md profile/cv.md',
      'Then edit profile/cv.md with your CV in markdown',
      'If you already have a legacy root cv.md, you can keep using it during migration or move it to profile/cv.md',
    ],
  };
}

function checkProfile() {
  if (existsSync(join(projectRoot, 'config', 'profile.yml'))) {
    return { pass: true, label: 'config/profile.yml found' };
  }
  return {
    pass: false,
    label: 'config/profile.yml not found',
    fix: [
      'Run: cp config/profile.example.yml config/profile.yml',
      'Then edit it with your details',
    ],
  };
}

function checkPortals() {
  if (existsSync(join(projectRoot, 'config', 'portals.yml'))) {
    return { pass: true, label: 'config/portals.yml found' };
  }
  return {
    pass: false,
    label: 'config/portals.yml not found',
    fix: [
      'Run: cp config/portals.example.yml config/portals.yml',
      'Then customize with your target companies',
    ],
  };
}

function checkFonts() {
  const fontsDir = join(projectRoot, 'fonts');
  if (!existsSync(fontsDir)) {
    return {
      pass: false,
      label: 'fonts/ directory not found',
      fix: 'The fonts/ directory is required for PDF generation',
    };
  }
  try {
    const files = readdirSync(fontsDir);
    if (files.length === 0) {
      return {
        pass: false,
        label: 'fonts/ directory is empty',
        fix: 'The fonts/ directory must contain font files for PDF generation',
      };
    }
  } catch {
    return {
      pass: false,
      label: 'fonts/ directory not readable',
      fix: 'Check permissions on the fonts/ directory',
    };
  }
  return { pass: true, label: 'Fonts directory ready' };
}

function checkAutoDir(name) {
  const dirPath = join(projectRoot, name);
  if (existsSync(dirPath)) {
    return { pass: true, label: `${name}/ directory ready` };
  }
  try {
    mkdirSync(dirPath, { recursive: true });
    return { pass: true, label: `${name}/ directory ready (auto-created)` };
  } catch {
    return {
      pass: false,
      label: `${name}/ directory could not be created`,
      fix: `Run: mkdir ${name}`,
    };
  }
}

async function main() {
  console.log('\njobhunt doctor');
  console.log('================\n');

  const checks = [
    checkNodeVersion(),
    checkDependencies(),
    await checkPlaywright(),
    checkCv(),
    checkProfile(),
    checkPortals(),
    checkFonts(),
    checkAutoDir('data'),
    checkAutoDir('output'),
    checkAutoDir('reports'),
    await checkOpenAIAccountAuth(),
  ];

  let failures = 0;

  for (const result of checks) {
    if (result.pass || result.kind === 'pass') {
      console.log(`${green('[PASS]')} ${result.label}`);
    } else if (result.kind === 'next') {
      console.log(`${yellow('[NEXT]')} ${result.label}`);
      const fixes = Array.isArray(result.fix) ? result.fix : [result.fix];
      for (const hint of fixes) {
        console.log(`  ${dim(`-> ${hint}`)}`);
      }
    } else {
      failures++;
      console.log(`${red('[FAIL]')} ${result.label}`);
      const fixes = Array.isArray(result.fix) ? result.fix : [result.fix];
      for (const hint of fixes) {
        console.log(`  ${dim(`-> ${hint}`)}`);
      }
    }
  }

  console.log('');
  if (failures > 0) {
    console.log(
      `Result: ${failures} issue${failures === 1 ? '' : 's'} found. Fix them and run \`npm run doctor\` again.`,
    );
    process.exit(1);
  } else {
    console.log(
      "Result: All checks passed. You're ready to go! Run `codex` to start.",
    );
    console.log(
      'For OpenAI-backed runtime checks, use `npm run auth:openai -- status` and `npm run agents:codex:smoke -- --json`.',
    );
    console.log('');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('doctor.mjs failed:', err.message);
  process.exit(1);
});
