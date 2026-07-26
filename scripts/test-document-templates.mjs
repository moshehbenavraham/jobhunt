#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listDocumentTemplates,
  loadTemplateDefault,
  resolveDocumentTemplate,
  validateDocumentTemplate,
} from './document-templates.mjs';

const CV_TOKENS = [
  'LANG',
  'PAGE_WIDTH',
  'DOCUMENT_TITLE',
  'NAME',
  'CONTACT_ITEMS',
  'SUMMARY_SECTION',
  'COMPETENCIES_SECTION',
  'EXPERIENCE_SECTION',
  'PROJECTS_SECTION',
  'EDUCATION_SECTION',
  'CERTIFICATIONS_SECTION',
  'SKILLS_SECTION',
];
const COVER_TOKENS = [
  'LANGUAGE',
  'NAME',
  'CONTACT_LINE',
  'ROLE',
  'COMPANY',
  'DATELINE',
  'GREETING',
  'PARAGRAPHS',
  'SIGN_OFF',
];
const template = (tokens) =>
  `<html>${tokens.map((token) => `{{${token}}}`).join('\n')}</html>\n`;

const root = mkdtempSync(join(tmpdir(), 'jobhunt-templates-'));
const outside = mkdtempSync(join(tmpdir(), 'jobhunt-templates-outside-'));
try {
  mkdirSync(join(root, 'templates'));
  mkdirSync(join(root, 'config'));
  writeFileSync(
    join(root, 'templates', 'cv-template.html'),
    template(CV_TOKENS),
  );
  writeFileSync(
    join(root, 'templates', 'cv-template.compact.html'),
    template(CV_TOKENS),
  );
  writeFileSync(
    join(root, 'templates', 'cover-letter-template.html'),
    template(COVER_TOKENS),
  );
  writeFileSync(
    join(root, 'config', 'profile.yml'),
    'documents:\n  cv_template: compact\n  cover_letter_template: standard\n',
  );

  assert.equal(loadTemplateDefault({ root, kind: 'cv' }), 'compact');
  assert.equal(
    resolveDocumentTemplate({ root, kind: 'cv' }).name,
    'compact',
  );
  assert.equal(
    resolveDocumentTemplate({ root, kind: 'cover-letter' }).name,
    'standard',
  );
  assert.equal(
    resolveDocumentTemplate({
      root,
      kind: 'cv',
      explicitPath: 'templates/cv-template.html',
    }).path,
    join(root, 'templates', 'cv-template.html'),
  );
  assert.deepEqual(
    listDocumentTemplates({ root, kind: 'cv' }).map((item) => item.name),
    ['compact', 'standard'],
  );
  assert.equal(
    validateDocumentTemplate(
      join(root, 'templates', 'cv-template.html'),
      'cv',
    ).valid,
    true,
  );

  writeFileSync(
    join(root, 'templates', 'cv-template.broken.html'),
    '{{NAME}}',
  );
  assert.throws(
    () =>
      resolveDocumentTemplate({
        root,
        kind: 'cv',
        name: 'broken',
      }),
    /missing required placeholders/i,
  );
  assert.throws(
    () =>
      resolveDocumentTemplate({
        root,
        kind: 'cv',
        name: '../../outside',
      }),
    /Invalid template name/,
  );

  writeFileSync(join(outside, 'cv-template.escape.html'), template(CV_TOKENS));
  symlinkSync(outside, join(root, 'templates', 'escape'));
  assert.throws(
    () =>
      resolveDocumentTemplate({
        root,
        kind: 'cv',
        explicitPath: 'escape/cv-template.escape.html',
      }),
    /resolves outside|traverses a symlink/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
}

console.log('document template resolver tests passed');
