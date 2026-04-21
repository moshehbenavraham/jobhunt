export type StartupHealthStatus = 'degraded' | 'error' | 'ok';
export type OperationalStoreStatus = 'absent' | 'corrupt' | 'ready';
export type StartupStatus =
  | 'auth-required'
  | 'expired-auth'
  | 'invalid-auth'
  | 'missing-prerequisites'
  | 'prompt-failure'
  | 'ready'
  | 'runtime-error';

export type StartupMissingItem = {
  candidates: readonly string[];
  canonicalRepoRelativePath: string;
  description: string;
  missingBehavior: 'onboarding-required' | 'optional' | 'runtime-error';
  owner: 'system' | 'user';
  surfaceKey: string;
};

export type StartupPromptSource = {
  key: string;
  label: string;
  notes: readonly string[];
  optional: boolean;
  precedence: number;
  role: string;
};

export type StartupWorkflowRoute = {
  description: string;
  intent: string;
  modeRepoRelativePath: string;
};

export type StartupPayload = {
  appStateRoot: {
    exists: boolean;
    path: string;
  };
  bootSurface: {
    defaultHost: string;
    defaultPort: number;
    healthPath: string;
    startupPath: string;
  };
  diagnostics: {
    onboardingMissing: StartupMissingItem[];
    optionalMissing: StartupMissingItem[];
    promptContract: {
      cacheMode: string;
      sourceOrder: string[];
      sources: StartupPromptSource[];
      supportedWorkflows: string[];
      workflowRoutes: StartupWorkflowRoute[];
    };
    runtimeMissing: StartupMissingItem[];
    workspace: {
      protectedOwners: Array<'system' | 'user'>;
      writableRoots: string[];
    };
  };
  health: {
    message: string;
    missing: {
      onboarding: number;
      optional: number;
      runtime: number;
    };
    ok: boolean;
    operationalStore: {
      message: string;
      status: OperationalStoreStatus;
    };
    service: string;
    sessionId: string;
    startupStatus: StartupStatus;
    status: StartupHealthStatus;
  };
  message: string;
  mutationPolicy: 'app-owned-only';
  operationalStore: {
    databasePath: string;
    message: string;
    reason: string | null;
    rootExists: boolean;
    rootPath: string;
    status: OperationalStoreStatus;
  };
  repoRoot: string;
  service: string;
  sessionId: string;
  status: StartupStatus;
  userLayerWrites: 'disabled';
};

export type StartupErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: string;
  sessionId: string;
  status: 'error';
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object.`);
  }

  return value as JsonRecord;
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

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Expected ${key} to be a string array.`);
  }

  return [...value];
}

function readOperationalStoreStatus(
  record: JsonRecord,
  key: string,
): OperationalStoreStatus {
  const value = readString(record, key);

  if (value !== 'absent' && value !== 'corrupt' && value !== 'ready') {
    throw new Error(`Unsupported operational-store status: ${value}`);
  }

  return value;
}

function parseMissingItem(value: unknown): StartupMissingItem {
  const record = assertRecord(value, 'missing item');
  const owner = readString(record, 'owner');
  const missingBehavior = readString(record, 'missingBehavior');

  if (owner !== 'system' && owner !== 'user') {
    throw new Error(`Unsupported missing item owner: ${owner}`);
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

function parseMissingItems(
  record: JsonRecord,
  key: string,
): StartupMissingItem[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`Expected ${key} to be an array.`);
  }

  return value.map((item) => parseMissingItem(item));
}

function parsePromptSource(value: unknown): StartupPromptSource {
  const record = assertRecord(value, 'prompt source');

  return {
    key: readString(record, 'key'),
    label: readString(record, 'label'),
    notes: readStringArray(record, 'notes'),
    optional: readBoolean(record, 'optional'),
    precedence: readNumber(record, 'precedence'),
    role: readString(record, 'role'),
  };
}

function parseWorkflowRoute(value: unknown): StartupWorkflowRoute {
  const record = assertRecord(value, 'workflow route');

  return {
    description: readString(record, 'description'),
    intent: readString(record, 'intent'),
    modeRepoRelativePath: readString(record, 'modeRepoRelativePath'),
  };
}

export function parseStartupPayload(value: unknown): StartupPayload {
  const record = assertRecord(value, 'startup payload');
  const appStateRoot = assertRecord(record.appStateRoot, 'appStateRoot');
  const bootSurface = assertRecord(record.bootSurface, 'bootSurface');
  const diagnostics = assertRecord(record.diagnostics, 'diagnostics');
  const promptContract = assertRecord(
    diagnostics.promptContract,
    'promptContract',
  );
  const workspace = assertRecord(diagnostics.workspace, 'workspace');
  const health = assertRecord(record.health, 'health');
  const healthOperationalStore = assertRecord(
    health.operationalStore,
    'health.operationalStore',
  );
  const missingCounts = assertRecord(health.missing, 'health.missing');
  const operationalStore = assertRecord(
    record.operationalStore,
    'operationalStore',
  );
  const healthStatus = readString(health, 'status');
  const startupStatus = readString(record, 'status');
  const healthStartupStatus = readString(health, 'startupStatus');
  const protectedOwners = readStringArray(workspace, 'protectedOwners');

  if (
    healthStatus !== 'ok' &&
    healthStatus !== 'degraded' &&
    healthStatus !== 'error'
  ) {
    throw new Error(`Unsupported health status: ${healthStatus}`);
  }

  if (
    startupStatus !== 'auth-required' &&
    startupStatus !== 'expired-auth' &&
    startupStatus !== 'invalid-auth' &&
    startupStatus !== 'ready' &&
    startupStatus !== 'missing-prerequisites' &&
    startupStatus !== 'prompt-failure' &&
    startupStatus !== 'runtime-error'
  ) {
    throw new Error(`Unsupported startup status: ${startupStatus}`);
  }

  if (healthStartupStatus !== startupStatus) {
    throw new Error('Health startup status does not match payload status.');
  }

  if (protectedOwners.some((owner) => owner !== 'system' && owner !== 'user')) {
    throw new Error('Workspace protected owners include an unsupported value.');
  }

  const sourcesValue = promptContract.sources;
  const workflowRoutesValue = promptContract.workflowRoutes;

  if (!Array.isArray(sourcesValue) || !Array.isArray(workflowRoutesValue)) {
    throw new Error('Prompt contract arrays are missing.');
  }

  return {
    appStateRoot: {
      exists: readBoolean(appStateRoot, 'exists'),
      path: readString(appStateRoot, 'path'),
    },
    bootSurface: {
      defaultHost: readString(bootSurface, 'defaultHost'),
      defaultPort: readNumber(bootSurface, 'defaultPort'),
      healthPath: readString(bootSurface, 'healthPath'),
      startupPath: readString(bootSurface, 'startupPath'),
    },
    diagnostics: {
      onboardingMissing: parseMissingItems(diagnostics, 'onboardingMissing'),
      optionalMissing: parseMissingItems(diagnostics, 'optionalMissing'),
      promptContract: {
        cacheMode: readString(promptContract, 'cacheMode'),
        sourceOrder: readStringArray(promptContract, 'sourceOrder'),
        sources: sourcesValue.map((item) => parsePromptSource(item)),
        supportedWorkflows: readStringArray(
          promptContract,
          'supportedWorkflows',
        ),
        workflowRoutes: workflowRoutesValue.map((item) =>
          parseWorkflowRoute(item),
        ),
      },
      runtimeMissing: parseMissingItems(diagnostics, 'runtimeMissing'),
      workspace: {
        protectedOwners: protectedOwners as Array<'system' | 'user'>,
        writableRoots: readStringArray(workspace, 'writableRoots'),
      },
    },
    health: {
      message: readString(health, 'message'),
      missing: {
        onboarding: readNumber(missingCounts, 'onboarding'),
        optional: readNumber(missingCounts, 'optional'),
        runtime: readNumber(missingCounts, 'runtime'),
      },
      ok: readBoolean(health, 'ok'),
      operationalStore: {
        message: readString(healthOperationalStore, 'message'),
        status: readOperationalStoreStatus(healthOperationalStore, 'status'),
      },
      service: readString(health, 'service'),
      sessionId: readString(health, 'sessionId'),
      startupStatus,
      status: healthStatus,
    },
    message: readString(record, 'message'),
    mutationPolicy: readString(record, 'mutationPolicy') as 'app-owned-only',
    operationalStore: {
      databasePath: readString(operationalStore, 'databasePath'),
      message: readString(operationalStore, 'message'),
      reason: readNullableString(operationalStore, 'reason'),
      rootExists: readBoolean(operationalStore, 'rootExists'),
      rootPath: readString(operationalStore, 'rootPath'),
      status: readOperationalStoreStatus(operationalStore, 'status'),
    },
    repoRoot: readString(record, 'repoRoot'),
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: startupStatus,
    userLayerWrites: readString(record, 'userLayerWrites') as 'disabled',
  };
}

export function parseStartupErrorPayload(value: unknown): StartupErrorPayload {
  const record = assertRecord(value, 'startup error payload');
  const errorRecord = assertRecord(record.error, 'startup error');

  if (readString(record, 'status') !== 'error') {
    throw new Error('Expected an error payload status.');
  }

  if (readBoolean(record, 'ok') !== false) {
    throw new Error('Expected ok=false in the error payload.');
  }

  return {
    error: {
      code: readString(errorRecord, 'code'),
      message: readString(errorRecord, 'message'),
    },
    ok: false,
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: 'error',
  };
}
