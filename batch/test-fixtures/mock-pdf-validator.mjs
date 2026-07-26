#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const pdfPath = process.argv[2];
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = manifestArg?.slice('--manifest='.length);

if (process.env.MOCK_PDF_VALIDATOR_INVOCATION) {
  writeFileSync(
    process.env.MOCK_PDF_VALIDATOR_INVOCATION,
    `${JSON.stringify({ pdfPath, manifestPath })}\n`,
  );
}

if (process.env.MOCK_PDF_VALIDATOR_FAIL === '1') {
  process.exit(1);
}

if (
  !pdfPath ||
  !manifestPath ||
  !existsSync(pdfPath) ||
  !existsSync(manifestPath)
) {
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
process.exit(manifest.validation?.valid === true ? 0 : 1);
