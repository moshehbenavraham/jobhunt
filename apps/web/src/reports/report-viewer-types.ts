import type { StartupStatus } from '../boot/startup-types';

export const REPORT_VIEWER_ARTIFACT_GROUPS = [
  'all',
  'output',
  'reports',
] as const;

export type ReportViewerArtifactGroup =
  (typeof REPORT_VIEWER_ARTIFACT_GROUPS)[number];

export const REPORT_VIEWER_ARTIFACT_KINDS = ['pdf', 'report'] as const;

export type ReportViewerArtifactKind =
  (typeof REPORT_VIEWER_ARTIFACT_KINDS)[number];

export const REPORT_VIEWER_SELECTION_ORIGINS = [
  'latest',
  'none',
  'selected',
] as const;

export type ReportViewerSelectionOrigin =
  (typeof REPORT_VIEWER_SELECTION_ORIGINS)[number];

export const REPORT_VIEWER_SELECTION_STATES = [
  'empty',
  'missing',
  'ready',
] as const;

export type ReportViewerSelectionState =
  (typeof REPORT_VIEWER_SELECTION_STATES)[number];

export const REPORT_VIEWER_LEGITIMACY_VALUES = [
  'High Confidence',
  'Proceed with Caution',
  'Suspicious',
] as const;

export type ReportViewerLegitimacy =
  (typeof REPORT_VIEWER_LEGITIMACY_VALUES)[number];

export type ReportViewerArtifactItem = {
  artifactDate: string | null;
  fileName: string;
  kind: ReportViewerArtifactKind;
  repoRelativePath: string;
  reportNumber: string | null;
  selected: boolean;
};

export type ReportViewerLinkedPdf = {
  exists: boolean;
  repoRelativePath: string | null;
};

export type ReportViewerReportHeader = {
  archetype: string | null;
  date: string | null;
  legitimacy: ReportViewerLegitimacy | null;
  pdf: ReportViewerLinkedPdf;
  score: number | null;
  title: string | null;
  url: string | null;
  verification: string | null;
};

export type ReportViewerSelectedReport = {
  body: string | null;
  header: ReportViewerReportHeader | null;
  message: string;
  origin: ReportViewerSelectionOrigin;
  repoRelativePath: string | null;
  reportNumber: string | null;
  requestedRepoRelativePath: string | null;
  state: ReportViewerSelectionState;
};

export type ReportViewerSummaryPayload = {
  filters: {
    group: ReportViewerArtifactGroup;
    limit: number;
    offset: number;
    reportPath: string | null;
  };
  generatedAt: string;
  message: string;
  ok: true;
  recentArtifacts: {
    group: ReportViewerArtifactGroup;
    hasMore: boolean;
    items: ReportViewerArtifactItem[];
    limit: number;
    offset: number;
    totalCount: number;
  };
  selectedReport: ReportViewerSelectedReport;
  service: string;
  sessionId: string;
  status: StartupStatus;
};

export type ReportViewerApiErrorStatus =
  | 'bad-request'
  | 'error'
  | 'method-not-allowed'
  | 'not-found'
  | 'rate-limited';

export type ReportViewerErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: string;
  sessionId: string;
  status: ReportViewerApiErrorStatus;
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object.`);
  }

  return value as JsonRecord;
}

function readBoolean(record: JsonRecord, key: string): boolean {
  const value = record[key];

  if (typeof value !== 'boolean') {
    throw new Error(`Expected ${key} to be a boolean.`);
  }

  return value;
}

function readExactBoolean<TExpected extends boolean>(
  record: JsonRecord,
  key: string,
  expected: TExpected,
): TExpected {
  const value = readBoolean(record, key);

  if (value !== expected) {
    throw new Error(`Expected ${key} to be ${String(expected)}.`);
  }

  return expected;
}

function readNumber(record: JsonRecord, key: string): number {
  const value = record[key];

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function readString(record: JsonRecord, key: string): string {
  const value = record[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string.`);
  }

  return value;
}

function readNullableString(record: JsonRecord, key: string): string | null {
  const value = record[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string or null.`);
  }

  return value;
}

function readNullableObject<TValue>(
  record: JsonRecord,
  key: string,
  parser: (value: unknown) => TValue,
): TValue | null {
  const value = record[key];
  return value === null ? null : parser(value);
}

function readEnum<TValue extends string>(
  record: JsonRecord,
  key: string,
  values: readonly TValue[],
  label: string,
): TValue {
  const value = readString(record, key);

  if (!values.includes(value as TValue)) {
    throw new Error(`Unsupported ${label}: ${value}`);
  }

  return value as TValue;
}

function readStartupStatus(record: JsonRecord, key: string): StartupStatus {
  return readEnum(
    record,
    key,
    [
      'auth-required',
      'expired-auth',
      'invalid-auth',
      'missing-prerequisites',
      'prompt-failure',
      'ready',
      'runtime-error',
    ] as const,
    'report-viewer startup status',
  );
}

function parseArtifactItem(value: unknown): ReportViewerArtifactItem {
  const record = assertRecord(value, 'report-viewer artifact item');

  return {
    artifactDate: readNullableString(record, 'artifactDate'),
    fileName: readString(record, 'fileName'),
    kind: readEnum(
      record,
      'kind',
      REPORT_VIEWER_ARTIFACT_KINDS,
      'report-viewer artifact kind',
    ),
    repoRelativePath: readString(record, 'repoRelativePath'),
    reportNumber: readNullableString(record, 'reportNumber'),
    selected: readBoolean(record, 'selected'),
  };
}

function parseLinkedPdf(value: unknown): ReportViewerLinkedPdf {
  const record = assertRecord(value, 'report-viewer linked pdf');

  return {
    exists: readBoolean(record, 'exists'),
    repoRelativePath: readNullableString(record, 'repoRelativePath'),
  };
}

function parseReportHeader(value: unknown): ReportViewerReportHeader {
  const record = assertRecord(value, 'report-viewer report header');
  const legitimacy = record.legitimacy;

  if (
    legitimacy !== null &&
    !REPORT_VIEWER_LEGITIMACY_VALUES.includes(
      legitimacy as ReportViewerLegitimacy,
    )
  ) {
    throw new Error(
      `Unsupported report-viewer legitimacy value: ${legitimacy}`,
    );
  }

  return {
    archetype: readNullableString(record, 'archetype'),
    date: readNullableString(record, 'date'),
    legitimacy:
      legitimacy === null ? null : (legitimacy as ReportViewerLegitimacy),
    pdf: parseLinkedPdf(record.pdf),
    score: record.score === null ? null : readNumber(record, 'score'),
    title: readNullableString(record, 'title'),
    url: readNullableString(record, 'url'),
    verification: readNullableString(record, 'verification'),
  };
}

function parseSelectedReport(value: unknown): ReportViewerSelectedReport {
  const record = assertRecord(value, 'report-viewer selected report');

  return {
    body: readNullableString(record, 'body'),
    header: readNullableObject(record, 'header', parseReportHeader),
    message: readString(record, 'message'),
    origin: readEnum(
      record,
      'origin',
      REPORT_VIEWER_SELECTION_ORIGINS,
      'report-viewer selection origin',
    ),
    repoRelativePath: readNullableString(record, 'repoRelativePath'),
    reportNumber: readNullableString(record, 'reportNumber'),
    requestedRepoRelativePath: readNullableString(
      record,
      'requestedRepoRelativePath',
    ),
    state: readEnum(
      record,
      'state',
      REPORT_VIEWER_SELECTION_STATES,
      'report-viewer selection state',
    ),
  };
}

export function parseReportViewerSummaryPayload(
  value: unknown,
): ReportViewerSummaryPayload {
  const record = assertRecord(value, 'report-viewer payload');
  const filters = assertRecord(record.filters, 'report-viewer filters');
  const recentArtifacts = assertRecord(
    record.recentArtifacts,
    'report-viewer recent artifacts',
  );
  const items = recentArtifacts.items;

  if (!Array.isArray(items)) {
    throw new Error('Expected recentArtifacts.items to be an array.');
  }

  return {
    filters: {
      group: readEnum(
        filters,
        'group',
        REPORT_VIEWER_ARTIFACT_GROUPS,
        'report-viewer artifact group',
      ),
      limit: readNumber(filters, 'limit'),
      offset: readNumber(filters, 'offset'),
      reportPath: readNullableString(filters, 'reportPath'),
    },
    generatedAt: readString(record, 'generatedAt'),
    message: readString(record, 'message'),
    ok: readExactBoolean(record, 'ok', true),
    recentArtifacts: {
      group: readEnum(
        recentArtifacts,
        'group',
        REPORT_VIEWER_ARTIFACT_GROUPS,
        'report-viewer artifact group',
      ),
      hasMore: readBoolean(recentArtifacts, 'hasMore'),
      items: items.map((entry) => parseArtifactItem(entry)),
      limit: readNumber(recentArtifacts, 'limit'),
      offset: readNumber(recentArtifacts, 'offset'),
      totalCount: readNumber(recentArtifacts, 'totalCount'),
    },
    selectedReport: parseSelectedReport(record.selectedReport),
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readStartupStatus(record, 'status'),
  };
}

export function parseReportViewerErrorPayload(
  value: unknown,
): ReportViewerErrorPayload {
  const record = assertRecord(value, 'report-viewer error payload');
  const error = assertRecord(record.error, 'report-viewer error');

  return {
    error: {
      code: readString(error, 'code'),
      message: readString(error, 'message'),
    },
    ok: readExactBoolean(record, 'ok', false),
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readEnum(
      record,
      'status',
      ['bad-request', 'error', 'method-not-allowed', 'not-found', 'rate-limited'] as const,
      'report-viewer API error status',
    ),
  };
}
