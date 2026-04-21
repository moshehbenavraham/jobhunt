import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvaluationArtifactTools } from './evaluation-artifact-tools.js';
import { createToolHarness } from './test-utils.js';

function getOutput(result: unknown) {
  return (result as { output?: unknown }).output as Record<string, any>;
}

function createCorrelation(toolName: string) {
  return {
    jobId: `job-${toolName}`,
    requestId: `request-${toolName}`,
    sessionId: `session-${toolName}`,
    traceId: `trace-${toolName}`,
  };
}

test('report artifact reservation skips existing files and prior reservations', async () => {
  const harness = await createToolHarness({
    fixtureFiles: {
      '.jobhunt-app/report-reservations/002.json': [
        '{',
        '  "bytesWritten": null,',
        '  "company": "Reserved Co",',
        '  "companySlug": "reserved-co",',
        '  "createdAt": "2026-04-21T08:00:00.000Z",',
        '  "reportNumber": "002",',
        '  "reportRepoRelativePath": "reports/002-reserved-co-2026-04-21.md",',
        '  "reservationId": "002",',
        '  "role": "Reserved Role",',
        '  "status": "reserved",',
        '  "writtenAt": null',
        '}',
      ].join('\n'),
      'reports/001-existing-co-2026-04-21.md': '# Existing report\n',
    },
    tools: createEvaluationArtifactTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('reserve-report-artifact'),
      input: {
        company: 'Example Co',
        companySlug: null,
        date: '2026-04-21',
        role: 'Platform Engineer',
      },
      toolName: 'reserve-report-artifact',
    });

    assert.equal(result.status, 'completed');
    const output = getOutput(result);

    assert.equal(output.status, 'reserved');
    assert.equal(output.reportNumber, '003');
    assert.equal(
      output.reportRepoRelativePath,
      'reports/003-example-co-2026-04-21.md',
    );
  } finally {
    await harness.cleanup();
  }
});

test('report artifact writer persists the reserved report and becomes idempotent on re-entry', async () => {
  const harness = await createToolHarness({
    tools: createEvaluationArtifactTools(),
  });

  try {
    const reserved = await harness.service.execute({
      correlation: createCorrelation('reserve-report-artifact'),
      input: {
        company: 'Writer Co',
        companySlug: null,
        date: '2026-04-21',
        role: 'Solutions Architect',
      },
      toolName: 'reserve-report-artifact',
    });

    assert.equal(reserved.status, 'completed');
    const reservedOutput = getOutput(reserved);

    const written = await harness.service.execute({
      correlation: createCorrelation('write-report-artifact'),
      input: {
        content: '# Evaluation: Writer Co -- Solutions Architect\n',
        reservationId: String(reservedOutput.reservationId),
      },
      toolName: 'write-report-artifact',
    });

    const writtenAgain = await harness.service.execute({
      correlation: {
        ...createCorrelation('write-report-artifact'),
        requestId: 'request-write-report-artifact-repeat',
      },
      input: {
        content: '# Evaluation: Writer Co -- Solutions Architect\n',
        reservationId: String(reservedOutput.reservationId),
      },
      toolName: 'write-report-artifact',
    });

    assert.equal(written.status, 'completed');
    const writtenOutput = getOutput(written);
    const repeatedOutput = getOutput(writtenAgain);

    assert.equal(writtenOutput.status, 'written');
    assert.equal(
      await harness.fixture.readText(
        String(writtenOutput.reportRepoRelativePath),
      ),
      '# Evaluation: Writer Co -- Solutions Architect\n',
    );
    assert.equal(writtenAgain.status, 'completed');
    assert.equal(repeatedOutput.status, 'already-written');
  } finally {
    await harness.cleanup();
  }
});

test('evaluation artifact listing is deterministic across reports and PDFs', async () => {
  const harness = await createToolHarness({
    fixtureFiles: {
      'output/cv-b.pdf': 'pdf-b\n',
      'reports/002-b.md': '# Report B\n',
      'reports/001-a.md': '# Report A\n',
    },
    tools: createEvaluationArtifactTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('list-evaluation-artifacts'),
      input: {
        group: 'all',
        limit: 2,
        offset: 1,
      },
      toolName: 'list-evaluation-artifacts',
    });

    assert.equal(result.status, 'completed');
    const output = getOutput(result);

    assert.equal(output.total, 3);
    assert.deepEqual(
      output.items.map(
        (item: { repoRelativePath: string }) => item.repoRelativePath,
      ),
      ['reports/001-a.md', 'reports/002-b.md'],
    );
  } finally {
    await harness.cleanup();
  }
});
