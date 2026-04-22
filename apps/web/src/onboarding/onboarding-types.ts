import type { StartupStatus } from '../boot/startup-types';

export const ONBOARDING_REPAIR_TARGETS = [
  'applicationsTracker',
  'portalsConfig',
  'profileConfig',
  'profileCv',
  'profileMode',
] as const;

export type OnboardingRepairTarget = (typeof ONBOARDING_REPAIR_TARGETS)[number];
export type OnboardingHealthStatus = 'degraded' | 'error' | 'ok';
export type OnboardingOperationalStoreStatus = 'absent' | 'corrupt' | 'ready';
export type OnboardingApiErrorStatus =
  | 'bad-request'
  | 'error'
  | 'method-not-allowed'
  | 'not-found'
  | 'rate-limited';

export type OnboardingChecklistItem = {
  candidates: readonly string[];
  canonicalRepoRelativePath: string;
  description: string;
  missingBehavior: 'onboarding-required' | 'optional' | 'runtime-error';
  owner: 'system' | 'user';
  surfaceKey: string;
};

export type OnboardingRepairPreviewItem = {
  description: string;
  destination: {
    canonicalRepoRelativePath: string;
    matchedRepoRelativePath: string | null;
    status: 'found' | 'missing';
    surfaceKey: OnboardingRepairTarget;
  };
  ready: boolean;
  reason: 'already-present' | 'ready' | 'template-missing';
  source: {
    repoRelativePath: string | null;
    status: 'found' | 'missing';
    surfaceKey: string;
  };
};

export type OnboardingSummaryPayload = {
  checklist: {
    optional: OnboardingChecklistItem[];
    required: OnboardingChecklistItem[];
    runtime: OnboardingChecklistItem[];
  };
  currentSession: {
    id: string;
    monorepo: boolean | null;
    packagePath: string | null;
    phase: number | null;
    source: 'fallback' | 'state-file';
    stateFilePath: string;
  };
  generatedAt: string;
  health: {
    agentRuntime: {
      authPath: string;
      message: string;
      promptState: string | null;
      status: string;
    };
    message: string;
    missing: {
      onboarding: number;
      optional: number;
      runtime: number;
    };
    ok: boolean;
    operationalStore: {
      message: string;
      status: OnboardingOperationalStoreStatus;
    };
    service: string;
    sessionId: string;
    startupStatus: StartupStatus;
    status: OnboardingHealthStatus;
  };
  message: string;
  ok: true;
  repairPreview: {
    items: OnboardingRepairPreviewItem[];
    readyTargets: OnboardingRepairTarget[];
    repairableCount: number;
    targetCount: number;
    targets: OnboardingRepairTarget[];
  };
  service: string;
  sessionId: string;
  status: StartupStatus;
};

export type OnboardingRepairPayload = {
  created: Array<{
    repoRelativePath: string;
    target: string;
  }>;
  generatedAt: string;
  health: OnboardingSummaryPayload['health'];
  message: string;
  ok: true;
  repairedCount: number;
  requestedTargets: OnboardingRepairTarget[];
  service: string;
  sessionId: string;
  status: StartupStatus;
};

export type OnboardingErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: string;
  sessionId: string;
  status: OnboardingApiErrorStatus;
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

function readNumber(record: JsonRecord, key: string): number {
  const value = record[key];

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function readNullableBoolean(record: JsonRecord, key: string): boolean | null {
  const value = record[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Expected ${key} to be a boolean or null.`);
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

function readString(record: JsonRecord, key: string): string {
  const value = record[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string.`);
  }

  return value;
}

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Expected ${key} to be a string array.`);
  }

  return [...value];
}

function readStartupStatus(record: JsonRecord, key: string): StartupStatus {
  const value = readString(record, key);

  switch (value) {
    case 'auth-required':
    case 'expired-auth':
    case 'invalid-auth':
    case 'missing-prerequisites':
    case 'prompt-failure':
    case 'ready':
    case 'runtime-error':
      return value;
    default:
      throw new Error(`Unsupported startup status: ${value}`);
  }
}

function readHealthStatus(
  record: JsonRecord,
  key: string,
): OnboardingHealthStatus {
  const value = readString(record, key);

  if (value !== 'degraded' && value !== 'error' && value !== 'ok') {
    throw new Error(`Unsupported health status: ${value}`);
  }

  return value;
}

function readOperationalStoreStatus(
  record: JsonRecord,
  key: string,
): OnboardingOperationalStoreStatus {
  const value = readString(record, key);

  if (value !== 'absent' && value !== 'corrupt' && value !== 'ready') {
    throw new Error(`Unsupported operational-store status: ${value}`);
  }

  return value;
}

function readRepairTarget(
  record: JsonRecord,
  key: string,
): OnboardingRepairTarget {
  const value = readString(record, key);

  if (!ONBOARDING_REPAIR_TARGETS.includes(value as OnboardingRepairTarget)) {
    throw new Error(`Unsupported onboarding repair target: ${value}`);
  }

  return value as OnboardingRepairTarget;
}

function parseChecklistItem(value: unknown): OnboardingChecklistItem {
  const record = assertRecord(value, 'checklist item');
  const owner = readString(record, 'owner');
  const missingBehavior = readString(record, 'missingBehavior');

  if (owner !== 'system' && owner !== 'user') {
    throw new Error(`Unsupported checklist owner: ${owner}`);
  }

  if (
    missingBehavior !== 'onboarding-required' &&
    missingBehavior !== 'optional' &&
    missingBehavior !== 'runtime-error'
  ) {
    throw new Error(`Unsupported missing behavior: ${missingBehavior}`);
  }

  return {
    candidates: readStringArray(record, 'candidates'),
    canonicalRepoRelativePath: readString(record, 'canonicalRepoRelativePath'),
    description: readString(record, 'description'),
    missingBehavior,
    owner,
    surfaceKey: readString(record, 'surfaceKey'),
  };
}

function parseChecklistItems(
  record: JsonRecord,
  key: string,
): OnboardingChecklistItem[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`Expected ${key} to be an array.`);
  }

  return value.map((item) => parseChecklistItem(item));
}

function parseRepairPreviewItem(value: unknown): OnboardingRepairPreviewItem {
  const record = assertRecord(value, 'repair preview item');
  const destination = assertRecord(record.destination, 'repair destination');
  const source = assertRecord(record.source, 'repair source');
  const destinationStatus = readString(destination, 'status');
  const reason = readString(record, 'reason');
  const sourceStatus = readString(source, 'status');

  if (destinationStatus !== 'found' && destinationStatus !== 'missing') {
    throw new Error(`Unsupported destination status: ${destinationStatus}`);
  }

  if (
    reason !== 'already-present' &&
    reason !== 'ready' &&
    reason !== 'template-missing'
  ) {
    throw new Error(`Unsupported repair preview reason: ${reason}`);
  }

  if (sourceStatus !== 'found' && sourceStatus !== 'missing') {
    throw new Error(`Unsupported source status: ${sourceStatus}`);
  }

  return {
    description: readString(record, 'description'),
    destination: {
      canonicalRepoRelativePath: readString(
        destination,
        'canonicalRepoRelativePath',
      ),
      matchedRepoRelativePath: readNullableString(
        destination,
        'matchedRepoRelativePath',
      ),
      status: destinationStatus,
      surfaceKey: readRepairTarget(destination, 'surfaceKey'),
    },
    ready: readBoolean(record, 'ready'),
    reason,
    source: {
      repoRelativePath: readNullableString(source, 'repoRelativePath'),
      status: sourceStatus,
      surfaceKey: readString(source, 'surfaceKey'),
    },
  };
}

function parseRepairPreviewItems(
  record: JsonRecord,
  key: string,
): OnboardingRepairPreviewItem[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`Expected ${key} to be an array.`);
  }

  return value.map((item) => parseRepairPreviewItem(item));
}

function parseRepairTargets(
  record: JsonRecord,
  key: string,
): OnboardingRepairTarget[] {
  return readStringArray(record, key).map((target) => {
    if (!ONBOARDING_REPAIR_TARGETS.includes(target as OnboardingRepairTarget)) {
      throw new Error(`Unsupported onboarding repair target: ${target}`);
    }

    return target as OnboardingRepairTarget;
  });
}

function parseHealth(value: unknown): OnboardingSummaryPayload['health'] {
  const record = assertRecord(value, 'health payload');
  const agentRuntime = assertRecord(record.agentRuntime, 'agent runtime');
  const missing = assertRecord(record.missing, 'missing counts');
  const operationalStore = assertRecord(
    record.operationalStore,
    'health operational store',
  );

  return {
    agentRuntime: {
      authPath: readString(agentRuntime, 'authPath'),
      message: readString(agentRuntime, 'message'),
      promptState: readNullableString(agentRuntime, 'promptState'),
      status: readString(agentRuntime, 'status'),
    },
    message: readString(record, 'message'),
    missing: {
      onboarding: readNumber(missing, 'onboarding'),
      optional: readNumber(missing, 'optional'),
      runtime: readNumber(missing, 'runtime'),
    },
    ok: readBoolean(record, 'ok'),
    operationalStore: {
      message: readString(operationalStore, 'message'),
      status: readOperationalStoreStatus(operationalStore, 'status'),
    },
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    startupStatus: readStartupStatus(record, 'startupStatus'),
    status: readHealthStatus(record, 'status'),
  };
}

function parseCurrentSession(
  value: unknown,
): OnboardingSummaryPayload['currentSession'] {
  const record = assertRecord(value, 'current session');
  const source = readString(record, 'source');

  if (source !== 'fallback' && source !== 'state-file') {
    throw new Error(`Unsupported session source: ${source}`);
  }

  return {
    id: readString(record, 'id'),
    monorepo: readNullableBoolean(record, 'monorepo'),
    packagePath: readNullableString(record, 'packagePath'),
    phase: record.phase === null ? null : readNumber(record, 'phase'),
    source,
    stateFilePath: readString(record, 'stateFilePath'),
  };
}

export function parseOnboardingSummaryPayload(
  value: unknown,
): OnboardingSummaryPayload {
  const record = assertRecord(value, 'onboarding summary payload');
  const checklist = assertRecord(record.checklist, 'checklist');
  const repairPreview = assertRecord(record.repairPreview, 'repair preview');
  const ok = readBoolean(record, 'ok');

  if (!ok) {
    throw new Error('Expected onboarding summary payload ok=true.');
  }

  return {
    checklist: {
      optional: parseChecklistItems(checklist, 'optional'),
      required: parseChecklistItems(checklist, 'required'),
      runtime: parseChecklistItems(checklist, 'runtime'),
    },
    currentSession: parseCurrentSession(record.currentSession),
    generatedAt: readString(record, 'generatedAt'),
    health: parseHealth(record.health),
    message: readString(record, 'message'),
    ok: true,
    repairPreview: {
      items: parseRepairPreviewItems(repairPreview, 'items'),
      readyTargets: parseRepairTargets(repairPreview, 'readyTargets'),
      repairableCount: readNumber(repairPreview, 'repairableCount'),
      targetCount: readNumber(repairPreview, 'targetCount'),
      targets: parseRepairTargets(repairPreview, 'targets'),
    },
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readStartupStatus(record, 'status'),
  };
}

export function parseOnboardingRepairPayload(
  value: unknown,
): OnboardingRepairPayload {
  const record = assertRecord(value, 'onboarding repair payload');
  const createdValue = record.created;
  const ok = readBoolean(record, 'ok');

  if (!Array.isArray(createdValue)) {
    throw new Error('Expected created to be an array.');
  }

  if (!ok) {
    throw new Error('Expected onboarding repair payload ok=true.');
  }

  return {
    created: createdValue.map((entry) => {
      const item = assertRecord(entry, 'created repair item');

      return {
        repoRelativePath: readString(item, 'repoRelativePath'),
        target: readString(item, 'target'),
      };
    }),
    generatedAt: readString(record, 'generatedAt'),
    health: parseHealth(record.health),
    message: readString(record, 'message'),
    ok: true,
    repairedCount: readNumber(record, 'repairedCount'),
    requestedTargets: parseRepairTargets(record, 'requestedTargets'),
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readStartupStatus(record, 'status'),
  };
}

export function parseOnboardingErrorPayload(
  value: unknown,
): OnboardingErrorPayload {
  const record = assertRecord(value, 'onboarding error payload');
  const error = assertRecord(record.error, 'error payload');
  const status = readString(record, 'status');

  switch (status) {
    case 'bad-request':
    case 'error':
    case 'method-not-allowed':
    case 'not-found':
    case 'rate-limited':
      return {
        error: {
          code: readString(error, 'code'),
          message: readString(error, 'message'),
        },
        ok: false,
        service: readString(record, 'service'),
        sessionId: readString(record, 'sessionId'),
        status,
      };
    default:
      throw new Error(`Unsupported onboarding error status: ${status}`);
  }
}
