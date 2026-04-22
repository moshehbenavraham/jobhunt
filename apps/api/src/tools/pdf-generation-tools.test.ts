import assert from 'node:assert/strict';
import test from 'node:test';
import { createPdfGenerationTools } from './pdf-generation-tools.js';
import { createToolHarness } from './test-utils.js';

type PdfGenerationOutput = {
  pageCount: number;
  status: string;
};

function getOutput<T>(result: unknown): T {
  return (result as { output?: unknown }).output as T;
}

function createCorrelation() {
  return {
    jobId: 'job-pdf-generation',
    requestId: 'request-pdf-generation',
    sessionId: 'session-pdf-generation',
    traceId: 'trace-pdf-generation',
  };
}

test('PDF generation tool validates output ownership and dispatches the allowlisted script', async () => {
  const harness = await createToolHarness({
    fixtureFiles: {
      'scripts/generate-pdf.mjs': [
        "import { mkdir, writeFile } from 'node:fs/promises';",
        "import { dirname } from 'node:path';",
        'const outputPath = process.argv[3];',
        'await mkdir(dirname(outputPath), { recursive: true });',
        "await writeFile(outputPath, 'pdf-bytes', 'utf8');",
        "process.stdout.write('Pages: 2\\n');",
      ].join('\n'),
      'tmp/input.html': '<html><body>PDF</body></html>\n',
    },
    scriptDefinitions: [
      {
        command: process.execPath,
        description: 'Generate PDF',
        name: 'generate-pdf',
        timeoutMs: 5_000,
      },
    ],
    tools: createPdfGenerationTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        format: 'letter',
        htmlPath: 'tmp/input.html',
        outputRepoRelativePath: 'output/generated.pdf',
      },
      toolName: 'generate-ats-pdf',
    });

    assert.equal(result.status, 'completed');
    const output = getOutput<PdfGenerationOutput>(result);

    assert.equal(output.status, 'generated');
    assert.equal(output.pageCount, 2);
    assert.equal(
      await harness.fixture.readText('output/generated.pdf'),
      'pdf-bytes',
    );
  } finally {
    await harness.cleanup();
  }
});

test('PDF generation tool rejects output paths outside output/', async () => {
  const harness = await createToolHarness({
    fixtureFiles: {
      'scripts/generate-pdf.mjs': "process.stdout.write('ok\\n');\n",
      'tmp/input.html': '<html><body>PDF</body></html>\n',
    },
    scriptDefinitions: [
      {
        command: process.execPath,
        description: 'Generate PDF',
        name: 'generate-pdf',
        timeoutMs: 5_000,
      },
    ],
    tools: createPdfGenerationTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        format: 'a4',
        htmlPath: 'tmp/input.html',
        outputRepoRelativePath: 'reports/not-allowed.pdf',
      },
      toolName: 'generate-ats-pdf',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error.code, 'tool-workspace-denied');
  } finally {
    await harness.cleanup();
  }
});
