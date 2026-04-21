import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { captureLastError, createJobhuntLogger } from './logger.js';

test('captureLastError writes structured JSON to the repo logs directory', async () => {
  const logsDir = await mkdtemp(join(tmpdir(), 'jobhunt-logs-'));

  try {
    const result = await captureLastError({
      context: {
        jobId: 'job-123',
      },
      error: new TypeError('boom'),
      logsDir,
      message: 'startup failed',
      timestamp: '2026-04-21T07:24:00.000Z',
    });

    assert.equal(
      result.filePath,
      join(logsDir, 'last_error_2026-04-21T07:24:00.000Z.json'),
    );
    assert.equal(result.record.context.jobId, 'job-123');
    assert.equal(result.record.error.type, 'TypeError');
    assert.equal(result.record.error.message, 'boom');
    assert.match(result.record.error.stack, /^TypeError: boom/);
    assert.equal(result.record.level, 'error');
    assert.equal(result.record.msg, 'startup failed');
    assert.equal(result.record.timestamp, '2026-04-21T07:24:00.000Z');

    const written = JSON.parse(await readFile(result.filePath, 'utf8'));
    assert.equal(written.msg, 'startup failed');
    assert.equal(written.error.type, 'TypeError');
    assert.equal(written.context.jobId, 'job-123');
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});

test('createJobhuntLogger captures error logs through the pino hook', async () => {
  const logsDir = await mkdtemp(join(tmpdir(), 'jobhunt-logger-'));
  const timestamp = '2026-04-21T07:24:01.000Z';
  const logger = createJobhuntLogger({
    logsDir,
    service: 'jobhunt-api-scaffold',
    timestamp: () => timestamp,
  });

  try {
    logger.error(new Error('hooked failure'), 'server failed');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const written = JSON.parse(
      await readFile(join(logsDir, `last_error_${timestamp}.json`), 'utf8'),
    );

    assert.equal(written.msg, 'server failed');
    assert.equal(written.error.type, 'Error');
    assert.equal(written.error.message, 'hooked failure');
  } finally {
    await rm(logsDir, { recursive: true, force: true });
  }
});
