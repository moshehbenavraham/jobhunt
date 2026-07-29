#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { reconcilePipeline } from './reconcile-pipeline.mjs';
import { acquireTrackerLock, trackerLockDirFor } from './tracker-utils.mjs';

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

const root = mkdtempSync(join(tmpdir(), 'jobhunt-reconcile-pipeline-'));
const pipelinePath = join(root, 'data', 'pipeline.md');
const trackerPath = join(root, 'data', 'applications.md');
write(
  trackerPath,
  [
    '| Company | Notes | Status | # | Role | Date | Report | Score | PDF |',
    '|---------|-------|--------|---|------|------|--------|-------|-----|',
    '| Acme | | Evaluated | 1 | Platform Engineer | 2026-07-20 | [001](reports/001-acme.md) | 4.5/5 | ✅ |',
    '| Beta | | Evaluated | 2 | Data Engineer | 2026-07-21 | [002](reports/002-beta.md) | 4.2/5 | |',
    '| SkipCo | | SKIP | 5 | Analyst | 2026-07-22 | [005](reports/005-skip.md) | 3.1/5 | |',
    '| DupCo | | Applied | 6 | Security Engineer | 2026-07-23 | [006](reports/006-dup.md) | 4.0/5 | |',
    '| Different Co | | Evaluated | 7 | AI Engineer | 2026-07-24 | [007](reports/007-different.md) | 4.4/5 | |',
    '',
  ].join('\n'),
);
for (const report of [
  '001-acme',
  '002-beta',
  '003-orphan',
  '004-failed',
  '005-skip',
  '006-dup',
  '007-different',
]) {
  write(join(root, 'reports', `${report}.md`), `# ${report}\n`);
}
write(
  join(root, 'batch', 'batch-state.tsv'),
  [
    'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries',
    '1\thttps://jobs.example.com/one\tcompleted\t-\t-\t001\t4.5\t-\t0',
    '2\thttps://jobs.example.com/two\tpartial\t-\t-\t002\t4.2\twarning\t0',
    '3\thttps://jobs.example.com/three\tcompleted\t-\t-\t003\t4.0\t-\t0',
    '4\thttps://jobs.example.com/four\tfailed\t-\t-\t004\t-\terror\t1',
    '5\thttps://jobs.example.com/five\tskipped\t-\t-\t005\t3.1\tbelow-min-score\t0',
    '6\thttps://jobs.example.com/dup\tcompleted\t-\t-\t006\t4.0\t-\t0',
    '7\thttps://jobs.example.com/mismatch\tcompleted\t-\t-\t007\t4.4\t-\t0',
    '',
  ].join('\n'),
);
write(
  pipelinePath,
  [
    '# Pipeline',
    '',
    '## Pending',
    '',
    '- [ ] https://jobs.example.com/one | Acme | Platform Engineer',
    '- [ ] https://jobs.example.com/two | Beta | Data Engineer',
    '- [ ] https://jobs.example.com/three | Orphan | Engineer',
    '- [ ] https://jobs.example.com/four | Failed Co | Engineer',
    '- [ ] https://jobs.example.com/five | SkipCo | Analyst',
    '- [ ] https://jobs.example.com/dup | DupCo | Security Engineer',
    '- [ ] https://jobs.example.com/mismatch | Expected Co | AI Engineer',
    '- [ ] https://jobs.example.com/unprocessed | Waiting | Engineer',
    '',
    '## Processed',
    '',
    '- [x] [006](../reports/006-dup.md) | https://jobs.example.com/dup | DupCo | Security Engineer | 4.0/5 | PDF ❌',
    '',
  ].join('\n'),
);

const before = readFileSync(pipelinePath, 'utf8');
const preview = await reconcilePipeline({ root, dryRun: true });
assert.equal(preview.changed, true);
assert.equal(preview.moved.length, 3);
assert.equal(preview.droppedDuplicates.length, 1);
assert.deepEqual(preview.moved.map((entry) => entry.status).sort(), [
  'completed',
  'partial',
  'skipped',
]);
assert.equal(preview.skipped.length, 3);
assert.equal(readFileSync(pipelinePath, 'utf8'), before);

const applied = await reconcilePipeline({ root });
assert.equal(applied.changed, true);
assert.equal(applied.remainingPending, 4);
const after = readFileSync(pipelinePath, 'utf8');
assert.doesNotMatch(after, /- \[ \] https:\/\/jobs\.example\.com\/one/);
assert.doesNotMatch(after, /- \[ \] https:\/\/jobs\.example\.com\/dup/);
assert.match(
  after,
  /\[001\]\(\.\.\/reports\/001-acme\.md\) \| https:\/\/jobs\.example\.com\/one/,
);
assert.match(
  after,
  /\[002\]\(\.\.\/reports\/002-beta\.md\) \| https:\/\/jobs\.example\.com\/two/,
);
assert.match(after, /- \[ \] https:\/\/jobs\.example\.com\/three/);
assert.match(after, /- \[ \] https:\/\/jobs\.example\.com\/four/);
assert.match(after, /- \[ \] https:\/\/jobs\.example\.com\/mismatch/);
assert.match(after, /- \[ \] https:\/\/jobs\.example\.com\/unprocessed/);
assert.equal(after.match(/https:\/\/jobs\.example\.com\/dup/g)?.length, 1);

const idempotent = await reconcilePipeline({ root });
assert.equal(idempotent.changed, false);

write(join(root, 'reports', '008-gamma.md'), '# gamma\n');
const trackerBeforeGamma = readFileSync(trackerPath, 'utf8');
const firstLineEnd = trackerBeforeGamma.indexOf('\n') + 1;
write(
  trackerPath,
  `${trackerBeforeGamma.slice(0, firstLineEnd)}| Gamma | | Evaluated | 8 | ML Engineer | 2026-07-26 | [008](reports/008-gamma.md) | 4.6/5 | |${trackerBeforeGamma.slice(firstLineEnd)}`,
);
write(
  join(root, 'batch', 'batch-state.tsv'),
  `${readFileSync(join(root, 'batch', 'batch-state.tsv'), 'utf8').trim()}\n8\thttps://jobs.example.com/eight\tcompleted\t-\t-\t008\t4.6\t-\t0\n`,
);
write(
  pipelinePath,
  readFileSync(pipelinePath, 'utf8').replace(
    '## Processed',
    '- [ ] https://jobs.example.com/eight | Gamma | ML Engineer\n\n## Processed',
  ),
);

const pipelineLock = await acquireTrackerLock(trackerLockDirFor(pipelinePath), {
  tracker: pipelinePath,
  timeoutMs: 200,
  retryMs: 5,
});
const waitingReconcile = reconcilePipeline({
  root,
  pipelineLock: { timeoutMs: 1_000, retryMs: 5 },
});
await new Promise((resolvePromise) => setTimeout(resolvePromise, 30));
write(
  pipelinePath,
  readFileSync(pipelinePath, 'utf8').replace(
    '## Processed',
    '- [ ] https://jobs.example.com/concurrent | NewCo | Engineer\n\n## Processed',
  ),
);
pipelineLock.release();
const concurrentResult = await waitingReconcile;
assert.equal(concurrentResult.moved.length, 1);
const concurrentAfter = readFileSync(pipelinePath, 'utf8');
assert.match(concurrentAfter, /jobs\.example\.com\/concurrent/);
assert.match(concurrentAfter, /\[008\]\(\.\.\/reports\/008-gamma\.md\)/);

rmSync(root, { recursive: true, force: true });
console.log('proof-gated pipeline reconciliation tests pass');
