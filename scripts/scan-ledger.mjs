import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  assertContainedPath,
  ensureContainedDirectory,
} from './path-policy.mjs';

export const PORTAL_HEALTH_COLUMNS = [
  'timestamp',
  'run_id',
  'portal',
  'provider',
  'outcome',
  'duration_ms',
  'jobs_found',
  'error',
  'consecutive_failures',
  'health_score',
];
export const SCAN_RUN_COLUMNS = [
  'run_id',
  'started_at',
  'completed_at',
  'mode',
  'configured',
  'targeted',
  'skipped',
  'succeeded',
  'failed',
  'jobs_found',
  'filtered',
  'duplicates',
  'cross_listings',
  'new_offers',
];

function sanitize(value) {
  return String(value ?? '')
    .replace(/[\t\r\n]+/g, ' ')
    .trim();
}

function appendRows(path, columns, rows) {
  mkdirSync(dirname(path), { recursive: true });
  try {
    const descriptor = openSync(path, 'wx', 0o600);
    writeFileSync(descriptor, `${columns.join('\t')}\n`);
    closeSync(descriptor);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const text = rows
    .map((row) => columns.map((column) => sanitize(row[column])).join('\t'))
    .join('\n');
  if (text)
    appendFileSync(path, `${text}\n`, { encoding: 'utf8', mode: 0o600 });
}

export function createScanRunId({
  timestamp = new Date().toISOString(),
  uuid = randomUUID(),
} = {}) {
  return `scan-${timestamp.replace(/[-:.TZ]/g, '')}-${uuid.slice(0, 8)}`;
}

export function readLatestPortalHealth(path) {
  const latest = new Map();
  try {
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    const columns = lines[0].split('\t');
    for (const line of lines.slice(1)) {
      if (!line) continue;
      const values = line.split('\t');
      const row = Object.fromEntries(
        columns.map((column, index) => [column, values[index] || '']),
      );
      latest.set(row.portal, row);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return latest;
}

export function buildPortalHealthRow(event, previous = null) {
  const success = event.outcome === 'success';
  const previousFailures = Number(previous?.consecutive_failures) || 0;
  const previousScore = Number(previous?.health_score);
  const baseline = Number.isFinite(previousScore) ? previousScore : 100;
  const consecutiveFailures = success ? 0 : previousFailures + 1;
  const healthScore = success
    ? Math.min(100, baseline + 10)
    : Math.max(0, baseline - Math.min(40, 15 + previousFailures * 5));
  return {
    ...event,
    consecutive_failures: consecutiveFailures,
    health_score: healthScore,
  };
}

export function recordScanLedgers(
  root,
  { run, portals },
  {
    portalHealthPath = 'data/portal-health.tsv',
    scanRunsPath = 'data/scan-runs.tsv',
  } = {},
) {
  const dataRoot = ensureContainedDirectory(root, 'data', { allowRoot: false });
  const healthPath = assertContainedPath(
    dataRoot,
    join(root, portalHealthPath),
    {
      label: 'Portal health ledger',
    },
  );
  const runsPath = assertContainedPath(dataRoot, join(root, scanRunsPath), {
    label: 'Scan run ledger',
  });
  const latest = readLatestPortalHealth(healthPath);
  const healthRows = [];
  for (const portal of portals) {
    const row = buildPortalHealthRow(portal, latest.get(portal.portal));
    latest.set(portal.portal, row);
    healthRows.push(row);
  }
  appendRows(healthPath, PORTAL_HEALTH_COLUMNS, healthRows);
  appendRows(runsPath, SCAN_RUN_COLUMNS, [run]);
  return { healthPath, runsPath, healthRows };
}
