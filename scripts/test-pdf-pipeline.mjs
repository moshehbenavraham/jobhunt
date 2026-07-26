#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCv } from './build-cv.mjs';
import { validatePdf } from './pdf-validation-core.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const FIXTURE_PATH = join(
  ROOT,
  'scripts',
  'test-fixtures',
  'cv-build-letter.json',
);
const SNAPSHOT_DIR = join(ROOT, 'scripts', 'test-fixtures', 'pdf-snapshots');
const BASELINE_PATH = join(
  ROOT,
  'scripts',
  'test-fixtures',
  'pdf-visual-baselines.json',
);
const UPDATE_SNAPSHOTS =
  process.argv.includes('--update-snapshots') ||
  process.env.UPDATE_PDF_SNAPSHOTS === '1';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function copyFixtureRoot(destination) {
  for (const directory of ['templates', 'profile', 'config', 'modes']) {
    await mkdir(join(destination, directory), { recursive: true });
  }
  await cp(join(ROOT, 'fonts'), join(destination, 'fonts'), {
    recursive: true,
  });
  for (const path of [
    'templates/cv-template.html',
    'templates/cv-template.cjk-minimal.html',
    'profile/cv.example.md',
    'config/profile.example.yml',
    'modes/_profile.template.md',
    'VERSION',
  ]) {
    await copyFile(join(ROOT, path), join(destination, path));
  }
}

function makeA4Fixture(letterFixture) {
  const fixture = structuredClone(letterFixture);
  delete fixture.candidate.phone;
  fixture.candidate.location = 'Madrid, España | Trabajo remoto';
  fixture.job.company =
    'Compañía Internacional de Sistemas de Inteligencia Artificial';
  fixture.job.role = 'Ingeniera sénior de IA aplicada';
  fixture.job.location = 'España';
  fixture.job.language = 'es';
  fixture.job.format = 'a4';
  fixture.job.jdText =
    'Buscamos una ingeniera sénior con ML pipelines, fast prototyping, stakeholder management, observability y Kubernetes.';
  fixture.labels = {
    summary: 'Resumen profesional',
    competencies: 'Competencias principales',
    experience: 'Experiencia profesional',
    projects: 'Proyectos',
    education: 'Educación',
    certifications: 'Certificaciones',
    skills: 'Habilidades',
  };
  return fixture;
}

function makeCjkFixture(letterFixture) {
  const fixture = structuredClone(letterFixture);
  fixture.candidate.name = '测试候选人';
  fixture.candidate.location = '中国 · 杭州 | 日本語対応';
  fixture.job.company = '示例智能系统';
  fixture.job.role = '高级人工智能工程师';
  fixture.job.location = '杭州';
  fixture.job.language = 'zh-CN';
  fixture.job.format = 'a4';
  fixture.labels = {
    summary: '个人简介',
    competencies: '核心能力',
    experience: '工作经历',
    projects: '精选项目',
    education: '教育经历',
    certifications: '专业认证',
    skills: '技术栈',
  };
  fixture.summary = `全栈工程师，负责 AI Agent 工作流与生产部署。${fixture.summary}`;
  return fixture;
}

function parsePbm(buffer) {
  let offset = 0;
  const tokens = [];
  while (tokens.length < 3) {
    while (
      offset < buffer.length &&
      /\s/.test(String.fromCharCode(buffer[offset]))
    ) {
      offset++;
    }
    if (buffer[offset] === 0x23) {
      while (offset < buffer.length && buffer[offset] !== 0x0a) offset++;
      continue;
    }
    const start = offset;
    while (
      offset < buffer.length &&
      !/\s/.test(String.fromCharCode(buffer[offset]))
    ) {
      offset++;
    }
    tokens.push(buffer.subarray(start, offset).toString('ascii'));
  }
  assert.ok(
    offset < buffer.length && /\s/.test(String.fromCharCode(buffer[offset])),
    'PBM header must end with whitespace',
  );
  if (buffer[offset] === 0x0d && buffer[offset + 1] === 0x0a) {
    offset += 2;
  } else {
    offset++;
  }
  assert.equal(tokens[0], 'P4');
  const width = Number.parseInt(tokens[1], 10);
  const height = Number.parseInt(tokens[2], 10);
  const rowBytes = Math.ceil(width / 8);
  const pixels = buffer.subarray(offset);
  assert.ok(pixels.length >= rowBytes * height);
  return { width, height, rowBytes, pixels };
}

function visualFingerprint(pbm) {
  const columns = 12;
  const rows = 16;
  const grid = Array.from({ length: rows * columns }, () => ({
    black: 0,
    total: 0,
  }));
  for (let y = 0; y < pbm.height; y++) {
    for (let x = 0; x < pbm.width; x++) {
      const byte = pbm.pixels[y * pbm.rowBytes + Math.floor(x / 8)];
      const black = (byte >> (7 - (x % 8))) & 1;
      const column = Math.min(
        columns - 1,
        Math.floor((x / pbm.width) * columns),
      );
      const row = Math.min(rows - 1, Math.floor((y / pbm.height) * rows));
      const cell = grid[row * columns + column];
      cell.black += black;
      cell.total++;
    }
  }
  const density = grid.map((cell) =>
    Number((cell.black / cell.total).toFixed(4)),
  );
  return {
    width: pbm.width,
    height: pbm.height,
    density,
    totalInk: Number(
      (
        grid.reduce((sum, cell) => sum + cell.black, 0) /
        grid.reduce((sum, cell) => sum + cell.total, 0)
      ).toFixed(4),
    ),
  };
}

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function renderSnapshots(pdfPath, prefix, workDirectory) {
  const pngPattern = join(workDirectory, `${prefix}-page-%d.png`);
  const pbmPattern = join(workDirectory, `${prefix}-page-%d.pbm`);
  execFileSync('mutool', ['draw', '-q', '-r', '72', '-o', pngPattern, pdfPath]);
  execFileSync('mutool', [
    'draw',
    '-q',
    '-r',
    '36',
    '-F',
    'pbm',
    '-o',
    pbmPattern,
    pdfPath,
  ]);
  const files = (await readdir(workDirectory))
    .filter(
      (file) => file.startsWith(`${prefix}-page-`) && file.endsWith('.png'),
    )
    .sort();
  const pages = [];
  for (const pngFile of files) {
    const page = Number.parseInt(pngFile.match(/page-(\d+)\.png$/)[1], 10);
    const png = await readFile(join(workDirectory, pngFile));
    const pbm = parsePbm(
      await readFile(join(workDirectory, `${prefix}-page-${page}.pbm`)),
    );
    pages.push({
      page,
      pngFile: join(workDirectory, pngFile),
      pngSha256: sha256(png),
      pngDimensions: pngDimensions(png),
      fingerprint: visualFingerprint(pbm),
    });
  }
  return pages;
}

function assertFingerprintClose(actual, expected, label) {
  assert.equal(actual.width, expected.width, `${label} PBM width`);
  assert.equal(actual.height, expected.height, `${label} PBM height`);
  assert.equal(actual.density.length, expected.density.length);
  for (let index = 0; index < actual.density.length; index++) {
    assert.ok(
      Math.abs(actual.density[index] - expected.density[index]) <= 0.025,
      `${label} visual cell ${index} drifted: ${actual.density[index]} vs ${expected.density[index]}`,
    );
  }
  assert.ok(
    Math.abs(actual.totalInk - expected.totalInk) <= 0.01,
    `${label} total ink drifted: ${actual.totalInk} vs ${expected.totalInk}`,
  );
}

async function updateSnapshots(visuals) {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  const baseline = {};
  for (const [format, pages] of Object.entries(visuals)) {
    baseline[format] = pages.map((page) => ({
      page: page.page,
      pngDimensions: page.pngDimensions,
      fingerprint: page.fingerprint,
    }));
    for (const page of pages) {
      await copyFile(
        page.pngFile,
        join(SNAPSHOT_DIR, `${format}-page-${page.page}.png`),
      );
    }
  }
  await writeFile(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
}

async function assertSnapshots(visuals) {
  const baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
  for (const [format, pages] of Object.entries(visuals)) {
    assert.equal(pages.length, baseline[format].length);
    for (const page of pages) {
      const expected = baseline[format].find((item) => item.page === page.page);
      assert.ok(expected, `${format} page ${page.page} baseline missing`);
      assert.deepEqual(page.pngDimensions, expected.pngDimensions);
      assertFingerprintClose(
        page.fingerprint,
        expected.fingerprint,
        `${format} page ${page.page}`,
      );
      const golden = join(SNAPSHOT_DIR, `${format}-page-${page.page}.png`);
      assert.ok((await stat(golden)).size > 1000, `${golden} is empty`);
    }
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'jobhunt-pdf-pipeline-'));
try {
  await copyFixtureRoot(temporaryRoot);
  await mkdir(join(temporaryRoot, 'output'), { recursive: true });
  const letterFixture = JSON.parse(await readFile(FIXTURE_PATH, 'utf8'));
  const a4Fixture = makeA4Fixture(letterFixture);
  const a4BuildPath = join(temporaryRoot, 'cv-build-a4.json');
  await writeFile(a4BuildPath, `${JSON.stringify(a4Fixture, null, 2)}\n`);
  const cjkFixture = makeCjkFixture(letterFixture);
  const cjkBuildPath = join(temporaryRoot, 'cv-build-cjk.json');
  await writeFile(cjkBuildPath, `${JSON.stringify(cjkFixture, null, 2)}\n`);

  const requireTika = process.env.PDF_VALIDATION_REQUIRE_TIKA === '1';
  const letter = await buildCv({
    root: temporaryRoot,
    buildPath: FIXTURE_PATH,
    pdfPath: join(
      temporaryRoot,
      'output',
      'cv-jane-smith-example-corporation-2026-07-26.pdf',
    ),
    maxPages: 2,
    requireTika,
    tikaJar: process.env.TIKA_APP_JAR,
  });
  const a4 = await buildCv({
    root: temporaryRoot,
    buildPath: a4BuildPath,
    pdfPath: join(
      temporaryRoot,
      'output',
      'cv-jane-smith-compania-internacional-2026-07-26.pdf',
    ),
    maxPages: 2,
    requireTika,
    tikaJar: process.env.TIKA_APP_JAR,
  });
  const cjk = await buildCv({
    root: temporaryRoot,
    buildPath: cjkBuildPath,
    pdfPath: join(
      temporaryRoot,
      'output',
      'cv-li-ming-example-2026-07-26.pdf',
    ),
    templateName: 'cjk-minimal',
    maxPages: 2,
    requireTika,
    tikaJar: process.env.TIKA_APP_JAR,
  });

  for (const result of [letter, a4, cjk]) {
    assert.equal(result.validation.valid, true);
    assert.equal(result.coverage.unsupportedIncludedCount, 0);
    assert.ok((await stat(result.pdfPath)).size > 10_000);
    assert.ok((await stat(result.htmlPath)).size > 5_000);
    assert.ok((await stat(result.buildPath)).size > 1_000);
    assert.ok((await stat(result.manifestPath)).size > 1_000);
    const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
    assert.equal(manifest.validation.valid, true);
    assert.equal(manifest.output.tagged, true);
    assert.equal(manifest.output.outline, true);
    assert.ok(manifest.pipeline.versionSha256);
    assert.ok(
      result.validation.checks.some(
        (check) => check.id === 'exact-page-count' && check.status === 'pass',
      ),
    );
    assert.ok(
      result.validation.checks.some(
        (check) => check.id === 'pdf-outline' && check.status === 'pass',
      ),
    );
    assert.equal(manifest.output.pageCount, 2);
    assert.equal(manifest.coverage.mustHave.supportedCoveragePercent, 100);
    assert.equal(manifest.coverage.unsupportedIncludedCount, 0);
    assert.equal(manifest.inputs.sources.length, 3);
  }

  const cliValidation = JSON.parse(
    execFileSync(
      process.execPath,
      [
        join(ROOT, 'scripts', 'validate-pdf.mjs'),
        letter.pdfPath,
        `--manifest=${letter.manifestPath}`,
        '--json',
      ],
      {
        cwd: temporaryRoot,
        encoding: 'utf8',
        env: process.env,
      },
    ),
  );
  assert.equal(cliValidation.valid, true);
  assert.ok(
    cliValidation.checks.some(
      (check) => check.id === 'exact-page-count' && check.status === 'pass',
    ),
  );

  const incompleteManifestPath = join(
    temporaryRoot,
    'output',
    'incomplete.manifest.json',
  );
  const incompleteManifest = JSON.parse(
    await readFile(letter.manifestPath, 'utf8'),
  );
  incompleteManifest.inputs.sources = [];
  await writeFile(
    incompleteManifestPath,
    `${JSON.stringify(incompleteManifest, null, 2)}\n`,
  );
  const incompleteManifestValidation = await validatePdf({
    pdfPath: letter.pdfPath,
    root: temporaryRoot,
    manifestPath: incompleteManifestPath,
    expectedFormat: 'letter',
    maxPages: 2,
    requireTagged: true,
  });
  assert.equal(incompleteManifestValidation.valid, false);
  assert.ok(
    incompleteManifestValidation.checks.some(
      (check) =>
        check.id === 'manifest-freshness' &&
        check.status === 'fail' &&
        check.details.includes('profile source hashes are missing'),
    ),
  );

  const a4Html = await readFile(a4.htmlPath, 'utf8');
  assert.doesNotMatch(a4Html, /\+1-555-0123/);
  assert.match(a4Html, /Educación/);
  assert.match(a4Html, /Madrid, España/);
  const cjkHtml = await readFile(cjk.htmlPath, 'utf8');
  assert.match(cjkHtml, /测试候选人/);
  assert.match(cjkHtml, /AI Agent 工作流/);
  assert.match(cjkHtml, /Noto Sans CJK SC/);

  const maxPageFailure = await validatePdf({
    pdfPath: letter.pdfPath,
    root: temporaryRoot,
    expectedFormat: 'letter',
    maxPages: 1,
    candidateName: letter.build.candidate.name,
    email: letter.build.candidate.email,
    requiredHeadings: Object.values(letter.build.labels),
    requireTagged: true,
  });
  assert.equal(maxPageFailure.valid, false);
  assert.ok(
    maxPageFailure.checks.some(
      (check) => check.id === 'page-count' && check.status === 'fail',
    ),
  );

  const fallbackPdf = join(
    temporaryRoot,
    'output',
    'cv-candidate-example-2026-07-26.pdf',
  );
  await copyFile(letter.pdfPath, fallbackPdf);
  const fallbackValidation = await validatePdf({
    pdfPath: fallbackPdf,
    root: temporaryRoot,
    expectedFormat: 'letter',
    maxPages: 2,
    requireTagged: true,
  });
  assert.equal(fallbackValidation.valid, false);
  assert.ok(
    fallbackValidation.checks.some(
      (check) => check.id === 'filename-resolved' && check.status === 'fail',
    ),
  );

  const sourcePath = join(temporaryRoot, 'profile', 'cv.example.md');
  await writeFile(
    sourcePath,
    `${await readFile(sourcePath, 'utf8')}\nSource changed after PDF generation.\n`,
  );
  const staleValidation = await validatePdf({
    pdfPath: letter.pdfPath,
    root: temporaryRoot,
    manifestPath: letter.manifestPath,
    expectedFormat: 'letter',
    maxPages: 2,
    candidateName: letter.build.candidate.name,
    email: letter.build.candidate.email,
    requiredHeadings: Object.values(letter.build.labels),
    requireTagged: true,
  });
  assert.equal(staleValidation.valid, false);
  assert.ok(
    staleValidation.checks.some(
      (check) => check.id === 'manifest-freshness' && check.status === 'fail',
    ),
  );

  const visualDirectory = join(temporaryRoot, 'visual');
  await mkdir(visualDirectory, { recursive: true });
  const visuals = {
    letter: await renderSnapshots(letter.pdfPath, 'letter', visualDirectory),
    a4: await renderSnapshots(a4.pdfPath, 'a4', visualDirectory),
  };
  assert.equal(visuals.letter.length, 2);
  assert.equal(visuals.a4.length, 2);
  assert.deepEqual(visuals.letter[0].pngDimensions, {
    width: 612,
    height: 792,
  });
  assert.ok(
    visuals.a4[0].pngDimensions.width >= 595 &&
      visuals.a4[0].pngDimensions.width <= 596,
  );
  assert.ok(
    visuals.a4[0].pngDimensions.height >= 841 &&
      visuals.a4[0].pngDimensions.height <= 843,
  );

  if (UPDATE_SNAPSHOTS) {
    await updateSnapshots(visuals);
  } else {
    await assertSnapshots(visuals);
  }

  console.log('Finished PDF pipeline and visual regressions pass');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
