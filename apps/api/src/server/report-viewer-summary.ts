import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  STARTUP_SERVICE_NAME,
  STARTUP_SESSION_ID,
} from '../index.js';
import {
  normalizeRepoRelativePath,
  resolveRepoRelativePath,
  type RepoPathOptions,
  RepoRelativePathError,
} from '../config/repo-paths.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';
import {
  DEFAULT_REPORT_VIEWER_ARTIFACT_LIMIT,
  MAX_REPORT_VIEWER_ARTIFACT_LIMIT,
  type ReportViewerArtifactGroup,
  type ReportViewerArtifactItem,
  type ReportViewerLegitimacy,
  type ReportViewerReportHeader,
  type ReportViewerSelectedReport,
  type ReportViewerSummaryOptions,
  type ReportViewerSummaryPayload,
  reportViewerLegitimacyValues,
} from './report-viewer-contract.js';
import {
  getStartupMessage,
  getStartupStatus,
} from './startup-status.js';

const REPORT_FILE_NAME_PATTERN =
  /^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}\.md$/;
const OUTPUT_FILE_NAME_PATTERN = /^[^/]+\.pdf$/i;

type ArtifactSeed = {
  artifactDate: string | null;
  fileName: string;
  kind: 'pdf' | 'report';
  repoRelativePath: string;
  reportNumber: string | null;
};

export class ReportViewerInputError extends Error {
  readonly code: string;

  constructor(message: string, code = 'invalid-report-viewer-query') {
    super(message);
    this.code = code;
    this.name = 'ReportViewerInputError';
  }
}

function clampLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_REPORT_VIEWER_ARTIFACT_LIMIT;
  }

  return Math.max(1, Math.min(value, MAX_REPORT_VIEWER_ARTIFACT_LIMIT));
}

function clampOffset(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  return Math.max(0, value);
}

function parseReportNumber(candidate: string): string | null {
  const match = candidate.match(/(?:^|\/)(\d{3})-/);
  return match?.[1] ?? null;
}

function parseArtifactDate(candidate: string): string | null {
  const match = candidate.match(/(\d{4}-\d{2}-\d{2})(?=\.[^.]+$)/);
  return match?.[1] ?? null;
}

function compareNullableDates(
  left: string | null,
  right: string | null,
): number {
  if (left && right && left !== right) {
    return right.localeCompare(left);
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

function compareNullableNumbers(
  left: string | null,
  right: string | null,
): number {
  if (left && right && left !== right) {
    return Number.parseInt(right, 10) - Number.parseInt(left, 10);
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

function compareArtifacts(left: ArtifactSeed, right: ArtifactSeed): number {
  const dateComparison = compareNullableDates(
    left.artifactDate,
    right.artifactDate,
  );

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const reportNumberComparison = compareNullableNumbers(
    left.reportNumber,
    right.reportNumber,
  );

  if (reportNumberComparison !== 0) {
    return reportNumberComparison;
  }

  return left.repoRelativePath.localeCompare(right.repoRelativePath);
}

async function collectSurfaceArtifacts(
  services: ApiServiceContainer,
  surfaceKey: 'outputDirectory' | 'reportsDirectory',
): Promise<ArtifactSeed[]> {
  const result = await services.workspace.readSurface(surfaceKey);

  if (result.status !== 'found') {
    return [];
  }

  const rootRepoRelativePath =
    services.workspace.getSurface(surfaceKey).candidates[0] ??
    (surfaceKey === 'reportsDirectory' ? 'reports' : 'output');

  return (result.directoryEntries ?? [])
    .filter((entry) =>
      surfaceKey === 'reportsDirectory'
        ? REPORT_FILE_NAME_PATTERN.test(entry)
        : OUTPUT_FILE_NAME_PATTERN.test(entry),
    )
    .map((fileName) => {
      const repoRelativePath = `${rootRepoRelativePath}/${fileName}`;

      return {
        artifactDate: parseArtifactDate(repoRelativePath),
        fileName,
        kind: surfaceKey === 'reportsDirectory' ? 'report' : 'pdf',
        repoRelativePath,
        reportNumber:
          surfaceKey === 'reportsDirectory'
            ? parseReportNumber(repoRelativePath)
            : null,
      } satisfies ArtifactSeed;
    });
}

async function listArtifacts(
  services: ApiServiceContainer,
  group: ReportViewerArtifactGroup,
): Promise<ArtifactSeed[]> {
  const [reportArtifacts, outputArtifacts] = await Promise.all([
    group === 'all' || group === 'reports'
      ? collectSurfaceArtifacts(services, 'reportsDirectory')
      : Promise.resolve([]),
    group === 'all' || group === 'output'
      ? collectSurfaceArtifacts(services, 'outputDirectory')
      : Promise.resolve([]),
  ]);

  return [...reportArtifacts, ...outputArtifacts].sort(compareArtifacts);
}

function unwrapMarkdownLink(candidate: string): string {
  const match = candidate.match(/^\[[^\]]+\]\(([^)]+)\)$/);
  return match?.[1]?.trim() ?? candidate;
}

function normalizePdfPath(
  candidate: string | null,
  options: RepoPathOptions,
): {
  exists: boolean;
  repoRelativePath: string | null;
} {
  if (!candidate) {
    return {
      exists: false,
      repoRelativePath: null,
    };
  }

  try {
    const normalizedPath = normalizeRepoRelativePath(
      unwrapMarkdownLink(candidate),
    );

    if (
      !normalizedPath.startsWith('output/') ||
      !normalizedPath.endsWith('.pdf')
    ) {
      return {
        exists: false,
        repoRelativePath: null,
      };
    }

    return {
      exists: existsSync(resolveRepoRelativePath(normalizedPath, options)),
      repoRelativePath: normalizedPath,
    };
  } catch (_error) {
    return {
      exists: false,
      repoRelativePath: null,
    };
  }
}

function normalizeLegitimacy(
  candidate: string | null,
): ReportViewerLegitimacy | null {
  if (
    candidate &&
    reportViewerLegitimacyValues.includes(candidate as ReportViewerLegitimacy)
  ) {
    return candidate as ReportViewerLegitimacy;
  }

  return null;
}

function readHeaderValue(
  lines: readonly string[],
  label: string,
): string | null {
  const prefix = `**${label}:**`;

  for (const line of lines) {
    if (!line.startsWith(prefix)) {
      continue;
    }

    const value = line.slice(prefix.length).trim();
    return value.length > 0 ? value : null;
  }

  return null;
}

function parseScore(candidate: string | null): number | null {
  if (!candidate) {
    return null;
  }

  const match = candidate.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  return Number.parseFloat(match[0]);
}

function normalizeMarkdownDocument(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function parseReportHeader(
  markdown: string,
  options: RepoPathOptions,
): ReportViewerReportHeader {
  const lines = markdown.split('\n');
  const dividerIndex = lines.findIndex((line) => line.trim() === '---');
  const headerLines = dividerIndex >= 0 ? lines.slice(0, dividerIndex) : lines;
  const titleLine = headerLines.find((line) => line.startsWith('# ')) ?? null;

  return {
    archetype: readHeaderValue(headerLines, 'Archetype'),
    date: readHeaderValue(headerLines, 'Date'),
    legitimacy: normalizeLegitimacy(
      readHeaderValue(headerLines, 'Legitimacy'),
    ),
    pdf: normalizePdfPath(readHeaderValue(headerLines, 'PDF'), options),
    score: parseScore(readHeaderValue(headerLines, 'Score')),
    title: titleLine ? titleLine.slice(2).trim() : null,
    url: readHeaderValue(headerLines, 'URL'),
    verification: readHeaderValue(headerLines, 'Verification'),
  };
}

function createEmptySelectedReport(message: string): ReportViewerSelectedReport {
  return {
    body: null,
    header: null,
    message,
    origin: 'none',
    repoRelativePath: null,
    reportNumber: null,
    requestedRepoRelativePath: null,
    state: 'empty',
  };
}

function assertAllowedReportPath(candidate: string): string {
  let normalizedPath: string;

  try {
    normalizedPath = normalizeRepoRelativePath(candidate);
  } catch (error) {
    if (error instanceof RepoRelativePathError) {
      throw new ReportViewerInputError(error.message);
    }

    throw error;
  }

  if (!normalizedPath.startsWith('reports/')) {
    throw new ReportViewerInputError(
      `Report path must stay inside reports/: ${candidate}`,
    );
  }

  const fileName = normalizedPath.slice('reports/'.length);

  if (!REPORT_FILE_NAME_PATTERN.test(fileName)) {
    throw new ReportViewerInputError(
      `Report path must target a canonical numbered markdown report: ${candidate}`,
    );
  }

  return normalizedPath;
}

async function readSelectedReport(
  repoRelativePath: string,
  options: RepoPathOptions,
): Promise<ReportViewerSelectedReport> {
  const reportNumber = parseReportNumber(repoRelativePath);
  const absolutePath = resolveRepoRelativePath(repoRelativePath, options);

  if (!existsSync(absolutePath)) {
    return {
      body: null,
      header: null,
      message: `Selected report ${repoRelativePath} is no longer available.`,
      origin: 'selected',
      repoRelativePath,
      reportNumber,
      requestedRepoRelativePath: repoRelativePath,
      state: 'missing',
    };
  }

  const markdown = normalizeMarkdownDocument(
    await readFile(absolutePath, 'utf8'),
  );

  return {
    body: markdown,
    header: parseReportHeader(markdown, options),
    message: `Showing selected report ${repoRelativePath}.`,
    origin: 'selected',
    repoRelativePath,
    reportNumber,
    requestedRepoRelativePath: repoRelativePath,
    state: 'ready',
  };
}

async function resolveSelectedReport(
  reportArtifacts: ArtifactSeed[],
  options: {
    repoRoot: string;
    requestedReportPath: string | null;
  },
): Promise<ReportViewerSelectedReport> {
  const pathOptions = {
    repoRoot: options.repoRoot,
  };

  if (options.requestedReportPath) {
    return readSelectedReport(
      assertAllowedReportPath(options.requestedReportPath),
      pathOptions,
    );
  }

  const latestReport = reportArtifacts.find((artifact) => artifact.kind === 'report');

  if (!latestReport) {
    return createEmptySelectedReport('No report artifacts are available yet.');
  }

  const selectedReport = await readSelectedReport(
    latestReport.repoRelativePath,
    pathOptions,
  );

  if (selectedReport.state !== 'ready') {
    return {
      ...selectedReport,
      message: `Latest report ${latestReport.repoRelativePath} is no longer available.`,
      origin: 'latest',
      requestedRepoRelativePath: null,
    };
  }

  return {
    ...selectedReport,
    message: `Showing latest report ${latestReport.repoRelativePath}.`,
    origin: 'latest',
    requestedRepoRelativePath: null,
  };
}

function mapArtifactItems(
  artifacts: ArtifactSeed[],
  selectedReportPath: string | null,
): ReportViewerArtifactItem[] {
  return artifacts.map((artifact) => ({
    artifactDate: artifact.artifactDate,
    fileName: artifact.fileName,
    kind: artifact.kind,
    repoRelativePath: artifact.repoRelativePath,
    reportNumber: artifact.reportNumber,
    selected:
      artifact.kind === 'report' &&
      selectedReportPath !== null &&
      artifact.repoRelativePath === selectedReportPath,
  }));
}

export async function createReportViewerSummary(
  services: ApiServiceContainer,
  options: ReportViewerSummaryOptions = {},
): Promise<ReportViewerSummaryPayload> {
  const diagnostics = await services.startupDiagnostics.getDiagnostics();
  const status = getStartupStatus(diagnostics);
  const generatedAt = new Date().toISOString();
  const normalizedFilters = {
    group: options.group ?? 'all',
    limit: clampLimit(options.limit),
    offset: clampOffset(options.offset),
    reportPath: options.reportPath?.trim() || null,
  } satisfies ReportViewerSummaryPayload['filters'];

  const repoRoot = services.workspace.repoPaths.repoRoot;
  const recentArtifacts = await listArtifacts(services, normalizedFilters.group);
  const recentReports = await listArtifacts(services, 'reports');
  const selectedReport = await resolveSelectedReport(recentReports, {
    repoRoot,
    requestedReportPath: normalizedFilters.reportPath,
  });
  const pagedArtifacts = recentArtifacts.slice(
    normalizedFilters.offset,
    normalizedFilters.offset + normalizedFilters.limit,
  );
  const payload: ReportViewerSummaryPayload = {
    filters: normalizedFilters,
    generatedAt,
    message:
      status === 'ready'
        ? selectedReport.message
        : getStartupMessage(diagnostics),
    ok: true,
    recentArtifacts: {
      group: normalizedFilters.group,
      hasMore:
        normalizedFilters.offset + pagedArtifacts.length < recentArtifacts.length,
      items: mapArtifactItems(pagedArtifacts, selectedReport.repoRelativePath),
      limit: normalizedFilters.limit,
      offset: normalizedFilters.offset,
      totalCount: recentArtifacts.length,
    },
    selectedReport,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
  };

  return payload;
}
