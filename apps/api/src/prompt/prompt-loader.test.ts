import assert from 'node:assert/strict';
import test from 'node:test';
import { getPromptSourceOrder } from './prompt-source-policy.js';
import {
  createPromptLoader,
  createPromptLoadingState,
} from './prompt-loader.js';
import type {
  PromptBundleSource,
  PromptLoaderResult,
} from './prompt-types.js';
import { createPromptFixture } from './test-utils.js';

function getSource(
  result: PromptLoaderResult,
  key: PromptBundleSource['key'],
): PromptBundleSource {
  if (result.state === 'unsupported-workflow' || result.state === 'loading') {
    throw new Error('Unsupported workflow results do not expose prompt sources.');
  }

  const source = result.bundle.sources.find(
    (item: PromptBundleSource) => item.key === key,
  );

  if (!source) {
    throw new Error(`Expected prompt source ${key} to exist in bundle.`);
  }

  return source;
}

test('prompt loader returns a ready bundle with the declared source order', async () => {
  const fixture = await createPromptFixture({
    files: {
      'profile/article-digest.md': '# Article Digest\n- Metric: 20\n',
    },
  });

  try {
    const loader = createPromptLoader({ repoRoot: fixture.repoRoot });
    const result = await loader.load('scan-portals');

    if (result.state !== 'ready') {
      throw new Error(`Expected ready state, received ${result.state}.`);
    }

    assert.equal(result.bundle.workflow.modeRepoRelativePath, 'modes/scan.md');
    assert.deepEqual(result.bundle.sourceOrder, getPromptSourceOrder());
    assert.deepEqual(
      result.bundle.sources.map((source) => source.key),
      getPromptSourceOrder(),
    );
    assert.equal(
      getSource(result, 'workflow-mode').matchedRepoRelativePath,
      'modes/scan.md',
    );
    assert.equal(
      getSource(result, 'article-digest').matchedRepoRelativePath,
      'profile/article-digest.md',
    );
  } finally {
    await fixture.cleanup();
  }
});

test('prompt loader exposes explicit loading and unsupported-workflow states', async () => {
  const fixture = await createPromptFixture();

  try {
    const loader = createPromptLoader({ repoRoot: fixture.repoRoot });
    const loadingState = createPromptLoadingState(
      'single-evaluation',
      'single-evaluation',
      loader.cache,
    );
    const unsupported = await loader.load('not-a-real-workflow');

    assert.equal(loadingState.state, 'loading');
    assert.equal(loadingState.workflow, 'single-evaluation');
    assert.equal(unsupported.state, 'unsupported-workflow');
    assert.match(
      unsupported.issues[0] ?? '',
      /Unsupported workflow "not-a-real-workflow"/,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('prompt loader honors legacy CV fallback while keeping article digest optional', async () => {
  const fixture = await createPromptFixture({
    files: {
      'cv.md': '# Legacy CV\n- Legacy metric: 10\n',
    },
  });

  try {
    await fixture.deleteText('profile/cv.md');

    const result = await createPromptLoader({
      repoRoot: fixture.repoRoot,
    }).load('single-evaluation');

    if (result.state !== 'ready') {
      throw new Error(`Expected ready state, received ${result.state}.`);
    }

    assert.equal(getSource(result, 'profile-cv').matchedRepoRelativePath, 'cv.md');
    assert.equal(getSource(result, 'article-digest').status, 'missing');
  } finally {
    await fixture.cleanup();
  }
});

test('prompt loader returns missing when a required workflow mode file is absent', async () => {
  const fixture = await createPromptFixture();

  try {
    await fixture.deleteText('modes/deep.md');

    const result = await createPromptLoader({
      repoRoot: fixture.repoRoot,
    }).load('deep-company-research');

    assert.equal(result.state, 'missing');
    assert.deepEqual(
      result.missingSources.map((source) => source.key),
      ['workflow-mode'],
    );
  } finally {
    await fixture.cleanup();
  }
});

test('prompt loader returns empty when a required source exists but has no content', async () => {
  const fixture = await createPromptFixture();

  try {
    await fixture.updateText('modes/_shared.md', ' \n');

    const result = await createPromptLoader({
      repoRoot: fixture.repoRoot,
    }).load('tracker-status');

    assert.equal(result.state, 'empty');
    assert.deepEqual(
      result.emptySources.map((source) => source.key),
      ['shared-mode'],
    );
  } finally {
    await fixture.cleanup();
  }
});

test('prompt cache invalidates after a local prompt edit', async () => {
  const fixture = await createPromptFixture();

  try {
    const loader = createPromptLoader({ repoRoot: fixture.repoRoot });
    const firstResult = await loader.load('application-help');

    if (firstResult.state !== 'ready') {
      throw new Error(`Expected ready state, received ${firstResult.state}.`);
    }

    assert.equal(loader.cache.size(), 6);
    assert.match(
      getSource(firstResult, 'workflow-mode').content ?? '',
      /live application flow/i,
    );

    await fixture.updateText(
      'modes/apply.md',
      '# application-help\nUpdated workflow content.\n',
    );

    const secondResult = await loader.load('application-help');

    if (secondResult.state !== 'ready') {
      throw new Error(`Expected ready state, received ${secondResult.state}.`);
    }

    assert.equal(loader.cache.size(), 6);
    assert.match(
      getSource(secondResult, 'workflow-mode').content ?? '',
      /Updated workflow content\./,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('article-digest sections load after the CV and carry the precedence note', async () => {
  const fixture = await createPromptFixture({
    files: {
      'profile/article-digest.md': '# Article Digest\n- Metric: 20\n',
      'profile/cv.md': '# CV\n- Metric: 10\n',
    },
  });

  try {
    const result = await createPromptLoader({
      repoRoot: fixture.repoRoot,
    }).load('single-evaluation');

    if (result.state !== 'ready') {
      throw new Error(`Expected ready state, received ${result.state}.`);
    }

    const cvIndex = result.bundle.sourceOrder.indexOf('profile-cv');
    const digestIndex = result.bundle.sourceOrder.indexOf('article-digest');
    const cvMarker = result.bundle.composedText.indexOf('[[SOURCE profile-cv]]');
    const digestMarker = result.bundle.composedText.indexOf(
      '[[SOURCE article-digest]]',
    );

    assert.ok(cvIndex < digestIndex);
    assert.ok(cvMarker < digestMarker);
    assert.match(
      getSource(result, 'article-digest').notes.join(' '),
      /take precedence over conflicting CV metrics/,
    );
  } finally {
    await fixture.cleanup();
  }
});
