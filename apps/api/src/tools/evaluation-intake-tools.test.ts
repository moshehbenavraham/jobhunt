import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvaluationIntakeTools } from './evaluation-intake-tools.js';
import { createToolHarness } from './test-utils.js';

type AtsUrlEvaluationInput = {
  applyUrl: string;
  ats: string;
  company: string;
  compensation: unknown;
  datePosted: string | null;
  department: string;
  descriptionHtml: string;
  descriptionText: string;
  employmentType: string;
  kind: 'ats-url';
  location: string;
  sourceUrl: string;
  team: string;
  title: string;
  url: string;
  workplaceType: string;
};

type RawJobDescriptionEvaluationInput = {
  applyUrl: string | null;
  ats: null;
  company: string;
  compensation: null;
  datePosted: null;
  department: string;
  descriptionHtml: string;
  descriptionText: string;
  employmentType: string;
  kind: 'raw-jd';
  location: string;
  sourceUrl: string | null;
  team: string;
  title: string;
  url: string | null;
  workplaceType: string;
};

type AtsEvaluationInput =
  | AtsUrlEvaluationInput
  | RawJobDescriptionEvaluationInput;

type AtsIntakeOutput = {
  evaluationInput?: AtsEvaluationInput;
  message?: string;
  status: string;
};

function getOutput<T>(result: unknown): T {
  return (result as { output?: unknown }).output as T;
}

function createCorrelation() {
  return {
    jobId: 'job-evaluation-intake',
    requestId: 'request-evaluation-intake',
    sessionId: 'session-evaluation-intake',
    traceId: 'trace-evaluation-intake',
  };
}

test('ATS intake tool returns normalized evaluation input for supported URLs', async () => {
  const harness = await createToolHarness({
    fixtureFiles: {
      'scripts/extract-job.mjs': [
        'const payload = {',
        "  apiUrl: 'https://api.example.com/jobs/123',",
        "  applyUrl: 'https://jobs.example.com/apply/123',",
        "  ats: 'greenhouse',",
        "  company: 'Example Co',",
        "  companyKey: 'example-co',",
        '  compensation: null,',
        "  datePosted: '2026-04-21T00:00:00.000Z',",
        "  department: 'Engineering',",
        "  descriptionHtml: '<p>Hello</p>',",
        "  descriptionText: 'Hello',",
        "  employmentType: 'Full-time',",
        "  jobId: '123',",
        "  location: 'Remote',",
        "  sourceUrl: 'https://jobs.example.com/123',",
        "  team: 'Platform',",
        "  title: 'Platform Engineer',",
        "  url: 'https://jobs.example.com/123',",
        "  workplaceType: 'remote'",
        '};',
        "process.stdout.write(JSON.stringify(payload) + '\\n');",
      ].join('\n'),
    },
    scriptDefinitions: [
      {
        command: process.execPath,
        description: 'Extract ATS job',
        name: 'extract-job',
        timeoutMs: 5_000,
      },
    ],
    tools: createEvaluationIntakeTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        sourceUrl: 'https://jobs.example.com/123',
      },
      toolName: 'extract-ats-job',
    });

    assert.equal(result.status, 'completed');
    const output = getOutput<AtsIntakeOutput>(result);
    assert.ok(output.evaluationInput);
    const evaluationInput = output.evaluationInput!;

    assert.equal(output.status, 'ready');
    assert.equal(evaluationInput.kind, 'ats-url');
    assert.equal(evaluationInput.company, 'Example Co');
    assert.equal(evaluationInput.ats, 'greenhouse');
  } finally {
    await harness.cleanup();
  }
});

test('ATS intake tool maps unsupported URLs onto a typed completed envelope', async () => {
  const harness = await createToolHarness({
    fixtureFiles: {
      'scripts/extract-job.mjs': [
        "process.stderr.write('Fatal: Unsupported ATS URL: https://example.com/role\\n');",
        'process.exit(1);',
      ].join('\n'),
    },
    scriptDefinitions: [
      {
        command: process.execPath,
        description: 'Extract ATS job',
        name: 'extract-job',
        timeoutMs: 5_000,
      },
    ],
    tools: createEvaluationIntakeTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        sourceUrl: 'https://example.com/role',
      },
      toolName: 'extract-ats-job',
    });

    assert.equal(result.status, 'completed');
    const output = getOutput<AtsIntakeOutput>(result);

    assert.equal(output.status, 'unsupported-ats');
    assert.match(String(output.message), /Unsupported ATS URL/);
  } finally {
    await harness.cleanup();
  }
});

test('ATS intake tool rejects invalid script JSON explicitly', async () => {
  const harness = await createToolHarness({
    fixtureFiles: {
      'scripts/extract-job.mjs': "process.stdout.write('not-json\\n');\n",
    },
    scriptDefinitions: [
      {
        command: process.execPath,
        description: 'Extract ATS job',
        name: 'extract-job',
        timeoutMs: 5_000,
      },
    ],
    tools: createEvaluationIntakeTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        sourceUrl: 'https://jobs.example.com/123',
      },
      toolName: 'extract-ats-job',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error.code, 'tool-invalid-config');
  } finally {
    await harness.cleanup();
  }
});

test('raw JD intake tool normalizes pasted text without script dispatch', async () => {
  const harness = await createToolHarness({
    tools: createEvaluationIntakeTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        company: 'Raw Co',
        descriptionText: 'Build resilient agents.',
        location: 'Tel Aviv',
        sourceUrl: null,
        title: 'Solutions Engineer',
      },
      toolName: 'normalize-raw-job-description',
    });

    assert.equal(result.status, 'completed');
    const output = getOutput<AtsIntakeOutput>(result);
    assert.ok(output.evaluationInput);
    const evaluationInput = output.evaluationInput!;

    assert.equal(output.status, 'ready');
    assert.equal(evaluationInput.kind, 'raw-jd');
    assert.equal(evaluationInput.company, 'Raw Co');
    assert.equal(evaluationInput.descriptionText, 'Build resilient agents.');
  } finally {
    await harness.cleanup();
  }
});
