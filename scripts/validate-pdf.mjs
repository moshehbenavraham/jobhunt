#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatValidationReport,
  inspectHtmlFile,
  loadManifestExpectations,
  manifestPathForPdf,
  validatePdf,
} from './pdf-validation-core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

function usage() {
  return [
    'Usage: node scripts/validate-pdf.mjs <input.pdf> [options]',
    '',
    'Options:',
    '  --manifest=<path>       Validate hashes and load build expectations',
    '  --html=<path>           Compare extracted PDF text with rendered HTML',
    '  --format=letter|a4      Require a specific paper format',
    '  --pages=<n>             Require an exact page count',
    '  --max-pages=<n>         Maximum page count (default: 2)',
    '  --candidate=<name>      Required candidate name',
    '  --email=<address>       Required candidate email',
    '  --heading=<text>        Required heading, repeat in expected order',
    '  --require-tika          Fail when Apache Tika is unavailable or disagrees',
    '  --tika-jar=<path>       Path to tika-app JAR',
    '  --allow-untagged        Do not require a tagged PDF',
    '  --allow-no-outline      Do not require PDF bookmarks/outlines',
    '  --json                  Print the full JSON report',
    '  --quiet                 Print only failures',
  ].join('\n');
}

function parseArgs(args) {
  const options = {
    headings: [],
    requireTagged: true,
    requireOutline: true,
    json: false,
    quiet: false,
  };
  for (const arg of args) {
    if (!arg.startsWith('--') && !options.pdfPath) {
      options.pdfPath = arg;
    } else if (arg.startsWith('--manifest=')) {
      options.manifestPath = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--html=')) {
      options.htmlPath = arg.slice('--html='.length);
    } else if (arg.startsWith('--format=')) {
      options.expectedFormat = arg.slice('--format='.length).toLowerCase();
    } else if (arg.startsWith('--max-pages=')) {
      options.maxPages = Number.parseInt(arg.slice('--max-pages='.length), 10);
    } else if (arg.startsWith('--pages=')) {
      options.expectedPages = Number.parseInt(arg.slice('--pages='.length), 10);
    } else if (arg.startsWith('--candidate=')) {
      options.candidateName = arg.slice('--candidate='.length);
    } else if (arg.startsWith('--email=')) {
      options.email = arg.slice('--email='.length);
    } else if (arg.startsWith('--heading=')) {
      options.headings.push(arg.slice('--heading='.length));
    } else if (arg === '--require-tika') {
      options.requireTika = true;
    } else if (arg.startsWith('--tika-jar=')) {
      options.tikaJar = arg.slice('--tika-jar='.length);
    } else if (arg === '--allow-untagged') {
      options.requireTagged = false;
    } else if (arg === '--allow-no-outline') {
      options.requireOutline = false;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (
    options.maxPages !== undefined &&
    (!Number.isInteger(options.maxPages) || options.maxPages < 1)
  ) {
    throw new Error('--max-pages must be a positive integer');
  }
  if (
    options.expectedPages !== undefined &&
    (!Number.isInteger(options.expectedPages) || options.expectedPages < 1)
  ) {
    throw new Error('--pages must be a positive integer');
  }
  return options;
}

export async function runValidationCli(args = process.argv.slice(2)) {
  const cli = parseArgs(args);
  if (cli.help) {
    console.log(usage());
    return 0;
  }
  if (!cli.pdfPath) {
    console.error(usage());
    return 1;
  }

  const pdfPath = resolve(cli.pdfPath);
  const defaultManifest = manifestPathForPdf(pdfPath);
  const manifestPath =
    cli.manifestPath ||
    (existsSync(defaultManifest) ? defaultManifest : undefined);

  let expectations = {};
  if (manifestPath) {
    expectations = await loadManifestExpectations(
      resolve(manifestPath),
      process.cwd(),
    );
  }
  if (cli.htmlPath) {
    const html = await inspectHtmlFile(resolve(cli.htmlPath), {
      viewportWidth:
        (cli.expectedFormat || expectations.expectedFormat) === 'a4'
          ? 679
          : 701,
      viewportHeight:
        (cli.expectedFormat || expectations.expectedFormat) === 'a4'
          ? 1007
          : 941,
    });
    expectations = {
      ...expectations,
      expectedText: html.bodyText,
      candidateName: expectations.candidateName || html.candidateName,
      email: expectations.email || html.email,
      requiredHeadings:
        expectations.requiredHeadings?.length > 0
          ? expectations.requiredHeadings
          : html.headings,
      domPreflight: html,
    };
  }

  const report = await validatePdf({
    ...expectations,
    pdfPath,
    root: process.cwd(),
    manifestPath,
    expectedFormat: cli.expectedFormat || expectations.expectedFormat,
    expectedPages: cli.expectedPages ?? expectations.expectedPages,
    maxPages: cli.maxPages ?? expectations.maxPages ?? 2,
    candidateName: cli.candidateName || expectations.candidateName,
    email: cli.email || expectations.email,
    requiredHeadings:
      cli.headings.length > 0
        ? cli.headings
        : expectations.requiredHeadings || [],
    requireTagged: cli.requireTagged,
    requireOutline: cli.requireOutline,
    requireTika: cli.requireTika,
    tikaJar: cli.tikaJar,
  });

  if (cli.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (cli.quiet) {
    if (!report.valid) {
      console.error(formatValidationReport(report));
    }
  } else {
    console.log(formatValidationReport(report));
  }
  return report.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runValidationCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(`PDF validation failed: ${error.message}`);
      process.exitCode = 1;
    });
}
