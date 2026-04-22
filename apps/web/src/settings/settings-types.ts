import type {
  OperationalStoreStatus,
  StartupHealthStatus,
  StartupStatus,
} from '../boot/startup-types';

export type SettingsApiErrorStatus =
  | 'bad-request'
  | 'error'
  | 'method-not-allowed'
  | 'not-found'
  | 'rate-limited';

export type SettingsViewStatus =
  | 'empty'
  | 'error'
  | 'loading'
  | 'offline'
  | StartupStatus;

export type SettingsUpdateCheckState =
  | 'dismissed'
  | 'error'
  | 'offline'
  | 'up-to-date'
  | 'update-available';

export type SettingsCurrentSession = {
  id: string;
  monorepo: boolean | null;
  packagePath: string | null;
  phase: number | null;
  source: 'fallback' | 'state-file';
  stateFilePath: string;
};

export type SettingsHealth = {
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
    status: OperationalStoreStatus;
  };
  service: string;
  sessionId: string;
  startupStatus: StartupStatus;
  status: StartupHealthStatus;
};

export type SettingsUpdateCheck = {
  changelogExcerpt: string | null;
  checkedAt: string;
  command: string;
  localVersion: string | null;
  message: string;
  remoteVersion: string | null;
  state: SettingsUpdateCheckState;
};

export type SettingsMaintenanceCommand = {
  category: 'auth' | 'backup' | 'diagnostics' | 'updates';
  command: string;
  description: string;
  id:
    | 'auth-login'
    | 'auth-refresh'
    | 'auth-status'
    | 'backup-run'
    | 'doctor'
    | 'quick-regression'
    | 'update-apply'
    | 'update-check'
    | 'update-rollback';
  label: string;
};

export type SettingsAuthSummary = {
  auth: {
    accountId: string | null;
    authPath: string;
    expiresAt: number | null;
    message: string;
    nextSteps: string[];
    state: 'auth-required' | 'expired-auth' | 'invalid-auth' | 'ready';
    updatedAt: string | null;
  };
  config: {
    authPath: string;
    baseUrl: string;
    model: string;
    originator: string;
    overrides: {
      authPath: boolean;
      baseUrl: boolean;
      model: boolean;
      originator: boolean;
    };
  };
  message: string;
  status:
    | 'auth-required'
    | 'expired-auth'
    | 'invalid-auth'
    | 'prompt-failure'
    | 'ready';
};

export type SettingsToolPreview = {
  description: string;
  jobTypes: string[];
  mutationTargets: string[];
  name: string;
  requiresApproval: boolean;
  scripts: string[];
};

export type SettingsWorkflowSupportItem = {
  description: string;
  intent: string;
  message: string;
  missingCapabilities: string[];
  modeExists: boolean;
  modeRepoRelativePath: string;
  specialist: {
    description: string;
    id: string;
    label: string;
  } | null;
  status: 'missing-route' | 'ready' | 'tooling-gap';
  toolPreview: string[];
};

export type SettingsSupportSummary = {
  prompt: {
    cacheMode: string;
    sourceOrder: string[];
    sources: Array<{
      key: string;
      label: string;
      optional: boolean;
      precedence: number;
      role: string;
    }>;
    supportedWorkflowCount: number;
  };
  tools: {
    hasMore: boolean;
    previewLimit: number;
    tools: SettingsToolPreview[];
    totalCount: number;
  };
  workflows: {
    hasMore: boolean;
    previewLimit: number;
    totalCount: number;
    workflows: SettingsWorkflowSupportItem[];
  };
};

export type SettingsWorkspaceSummary = {
  agentsGuidePath: string;
  apiPackagePath: string;
  appStateRootPath: string;
  currentSession: SettingsCurrentSession & {
    packageAbsolutePath: string | null;
    specDirectoryPath: string;
  };
  dataContractPath: string;
  protectedOwners: Array<'system' | 'user'>;
  repoRoot: string;
  specSystemPath: string;
  webPackagePath: string;
  writableRoots: string[];
};

export type SettingsSummaryPayload = {
  auth: SettingsAuthSummary;
  currentSession: SettingsCurrentSession;
  generatedAt: string;
  health: SettingsHealth;
  maintenance: {
    commands: SettingsMaintenanceCommand[];
    updateCheck: SettingsUpdateCheck;
  };
  message: string;
  ok: true;
  operationalStore: {
    databasePath: string;
    message: string;
    reason: string | null;
    rootExists: boolean;
    rootPath: string;
    status: OperationalStoreStatus;
  };
  service: string;
  sessionId: string;
  status: StartupStatus;
  support: SettingsSupportSummary;
  workspace: SettingsWorkspaceSummary;
};

export type SettingsErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: string;
  sessionId: string;
  status: SettingsApiErrorStatus;
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

function readNullableNumber(record: JsonRecord, key: string): number | null {
  const value = record[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected ${key} to be a number or null.`);
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

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Expected ${key} to be a string array.`);
  }

  return [...value];
}

function readApiErrorStatus(
  record: JsonRecord,
  key: string,
): SettingsApiErrorStatus {
  const value = readString(record, key);

  if (
    value !== 'bad-request' &&
    value !== 'error' &&
    value !== 'method-not-allowed' &&
    value !== 'not-found' &&
    value !== 'rate-limited'
  ) {
    throw new Error(`Unsupported API error status: ${value}`);
  }

  return value;
}

function readHealthStatus(
  record: JsonRecord,
  key: string,
): StartupHealthStatus {
  const value = readString(record, key);

  if (value !== 'degraded' && value !== 'error' && value !== 'ok') {
    throw new Error(`Unsupported health status: ${value}`);
  }

  return value;
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

function readStartupStatus(record: JsonRecord, key: string): StartupStatus {
  const value = readString(record, key);

  if (
    value !== 'auth-required' &&
    value !== 'expired-auth' &&
    value !== 'invalid-auth' &&
    value !== 'missing-prerequisites' &&
    value !== 'prompt-failure' &&
    value !== 'ready' &&
    value !== 'runtime-error'
  ) {
    throw new Error(`Unsupported startup status: ${value}`);
  }

  return value;
}

function readUpdateCheckState(
  record: JsonRecord,
  key: string,
): SettingsUpdateCheckState {
  const value = readString(record, key);

  if (
    value !== 'dismissed' &&
    value !== 'error' &&
    value !== 'offline' &&
    value !== 'up-to-date' &&
    value !== 'update-available'
  ) {
    throw new Error(`Unsupported update-check state: ${value}`);
  }

  return value;
}

function parseCurrentSession(value: unknown): SettingsCurrentSession {
  const record = assertRecord(value, 'currentSession');
  const source = readString(record, 'source');

  if (source !== 'fallback' && source !== 'state-file') {
    throw new Error(`Unsupported current-session source: ${source}`);
  }

  return {
    id: readString(record, 'id'),
    monorepo: readNullableBoolean(record, 'monorepo'),
    packagePath: readNullableString(record, 'packagePath'),
    phase: readNullableNumber(record, 'phase'),
    source,
    stateFilePath: readString(record, 'stateFilePath'),
  };
}

function parseHealth(value: unknown): SettingsHealth {
  const record = assertRecord(value, 'health');
  const agentRuntime = assertRecord(record.agentRuntime, 'health.agentRuntime');
  const missing = assertRecord(record.missing, 'health.missing');
  const operationalStore = assertRecord(
    record.operationalStore,
    'health.operationalStore',
  );
  const startupStatus = readStartupStatus(record, 'startupStatus');

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
    startupStatus,
    status: readHealthStatus(record, 'status'),
  };
}

function parseUpdateCheck(value: unknown): SettingsUpdateCheck {
  const record = assertRecord(value, 'updateCheck');

  return {
    changelogExcerpt: readNullableString(record, 'changelogExcerpt'),
    checkedAt: readString(record, 'checkedAt'),
    command: readString(record, 'command'),
    localVersion: readNullableString(record, 'localVersion'),
    message: readString(record, 'message'),
    remoteVersion: readNullableString(record, 'remoteVersion'),
    state: readUpdateCheckState(record, 'state'),
  };
}

function parseMaintenanceCommand(
  value: unknown,
): SettingsMaintenanceCommand {
  const record = assertRecord(value, 'maintenance command');
  const category = readString(record, 'category');
  const id = readString(record, 'id');

  if (
    category !== 'auth' &&
    category !== 'backup' &&
    category !== 'diagnostics' &&
    category !== 'updates'
  ) {
    throw new Error(`Unsupported maintenance command category: ${category}`);
  }

  if (
    id !== 'auth-login' &&
    id !== 'auth-refresh' &&
    id !== 'auth-status' &&
    id !== 'backup-run' &&
    id !== 'doctor' &&
    id !== 'quick-regression' &&
    id !== 'update-apply' &&
    id !== 'update-check' &&
    id !== 'update-rollback'
  ) {
    throw new Error(`Unsupported maintenance command id: ${id}`);
  }

  return {
    category,
    command: readString(record, 'command'),
    description: readString(record, 'description'),
    id,
    label: readString(record, 'label'),
  };
}

function parseAuthSummary(value: unknown): SettingsAuthSummary {
  const record = assertRecord(value, 'auth summary');
  const auth = assertRecord(record.auth, 'auth summary.auth');
  const config = assertRecord(record.config, 'auth summary.config');
  const overrides = assertRecord(config.overrides, 'auth config overrides');
  const state = readString(auth, 'state');
  const status = readString(record, 'status');

  if (
    state !== 'auth-required' &&
    state !== 'expired-auth' &&
    state !== 'invalid-auth' &&
    state !== 'ready'
  ) {
    throw new Error(`Unsupported auth state: ${state}`);
  }

  if (
    status !== 'auth-required' &&
    status !== 'expired-auth' &&
    status !== 'invalid-auth' &&
    status !== 'prompt-failure' &&
    status !== 'ready'
  ) {
    throw new Error(`Unsupported auth summary status: ${status}`);
  }

  return {
    auth: {
      accountId: readNullableString(auth, 'accountId'),
      authPath: readString(auth, 'authPath'),
      expiresAt: readNullableNumber(auth, 'expiresAt'),
      message: readString(auth, 'message'),
      nextSteps: readStringArray(auth, 'nextSteps'),
      state,
      updatedAt: readNullableString(auth, 'updatedAt'),
    },
    config: {
      authPath: readString(config, 'authPath'),
      baseUrl: readString(config, 'baseUrl'),
      model: readString(config, 'model'),
      originator: readString(config, 'originator'),
      overrides: {
        authPath: readBoolean(overrides, 'authPath'),
        baseUrl: readBoolean(overrides, 'baseUrl'),
        model: readBoolean(overrides, 'model'),
        originator: readBoolean(overrides, 'originator'),
      },
    },
    message: readString(record, 'message'),
    status,
  };
}

function parseToolPreview(value: unknown): SettingsToolPreview {
  const record = assertRecord(value, 'tool preview');

  return {
    description: readString(record, 'description'),
    jobTypes: readStringArray(record, 'jobTypes'),
    mutationTargets: readStringArray(record, 'mutationTargets'),
    name: readString(record, 'name'),
    requiresApproval: readBoolean(record, 'requiresApproval'),
    scripts: readStringArray(record, 'scripts'),
  };
}

function parseWorkflowSupportItem(
  value: unknown,
): SettingsWorkflowSupportItem {
  const record = assertRecord(value, 'workflow support item');
  const specialistValue = record.specialist;
  const status = readString(record, 'status');
  let specialist: SettingsWorkflowSupportItem['specialist'] = null;

  if (
    status !== 'missing-route' &&
    status !== 'ready' &&
    status !== 'tooling-gap'
  ) {
    throw new Error(`Unsupported workflow support status: ${status}`);
  }

  if (specialistValue !== null) {
    const specialistRecord = assertRecord(
      specialistValue,
      'workflow support specialist',
    );

    specialist = {
      description: readString(specialistRecord, 'description'),
      id: readString(specialistRecord, 'id'),
      label: readString(specialistRecord, 'label'),
    };
  }

  return {
    description: readString(record, 'description'),
    intent: readString(record, 'intent'),
    message: readString(record, 'message'),
    missingCapabilities: readStringArray(record, 'missingCapabilities'),
    modeExists: readBoolean(record, 'modeExists'),
    modeRepoRelativePath: readString(record, 'modeRepoRelativePath'),
    specialist,
    status,
    toolPreview: readStringArray(record, 'toolPreview'),
  };
}

function parseWorkspaceSummary(value: unknown): SettingsWorkspaceSummary {
  const record = assertRecord(value, 'workspace summary');
  const currentSession = assertRecord(record.currentSession, 'workspace currentSession');

  return {
    agentsGuidePath: readString(record, 'agentsGuidePath'),
    apiPackagePath: readString(record, 'apiPackagePath'),
    appStateRootPath: readString(record, 'appStateRootPath'),
    currentSession: {
      ...parseCurrentSession(currentSession),
      packageAbsolutePath: readNullableString(
        currentSession,
        'packageAbsolutePath',
      ),
      specDirectoryPath: readString(currentSession, 'specDirectoryPath'),
    },
    dataContractPath: readString(record, 'dataContractPath'),
    protectedOwners: readStringArray(record, 'protectedOwners').map((owner) => {
      if (owner !== 'system' && owner !== 'user') {
        throw new Error(`Unsupported protected owner: ${owner}`);
      }

      return owner;
    }),
    repoRoot: readString(record, 'repoRoot'),
    specSystemPath: readString(record, 'specSystemPath'),
    webPackagePath: readString(record, 'webPackagePath'),
    writableRoots: readStringArray(record, 'writableRoots'),
  };
}

export function parseSettingsSummaryPayload(
  value: unknown,
): SettingsSummaryPayload {
  const record = assertRecord(value, 'settings payload');
  const maintenance = assertRecord(record.maintenance, 'maintenance');
  const support = assertRecord(record.support, 'support');
  const prompt = assertRecord(support.prompt, 'support.prompt');
  const tools = assertRecord(support.tools, 'support.tools');
  const workflows = assertRecord(support.workflows, 'support.workflows');
  const maintenanceCommands = maintenance.commands;
  const promptSources = prompt.sources;
  const toolItems = tools.tools;
  const workflowItems = workflows.workflows;
  const health = parseHealth(record.health);
  const status = readStartupStatus(record, 'status');

  if (
    !Array.isArray(maintenanceCommands) ||
    !Array.isArray(promptSources) ||
    !Array.isArray(toolItems) ||
    !Array.isArray(workflowItems)
  ) {
    throw new Error('Settings arrays are missing.');
  }

  if (health.startupStatus !== status) {
    throw new Error('Health startup status does not match payload status.');
  }

  if (!readBoolean(record, 'ok')) {
    throw new Error('Settings summary payload must set ok=true.');
  }

  return {
    auth: parseAuthSummary(record.auth),
    currentSession: parseCurrentSession(record.currentSession),
    generatedAt: readString(record, 'generatedAt'),
    health,
    maintenance: {
      commands: maintenanceCommands.map((entry) => parseMaintenanceCommand(entry)),
      updateCheck: parseUpdateCheck(maintenance.updateCheck),
    },
    message: readString(record, 'message'),
    ok: true,
    operationalStore: {
      databasePath: readString(
        assertRecord(record.operationalStore, 'operationalStore'),
        'databasePath',
      ),
      message: readString(
        assertRecord(record.operationalStore, 'operationalStore'),
        'message',
      ),
      reason: readNullableString(
        assertRecord(record.operationalStore, 'operationalStore'),
        'reason',
      ),
      rootExists: readBoolean(
        assertRecord(record.operationalStore, 'operationalStore'),
        'rootExists',
      ),
      rootPath: readString(
        assertRecord(record.operationalStore, 'operationalStore'),
        'rootPath',
      ),
      status: readOperationalStoreStatus(
        assertRecord(record.operationalStore, 'operationalStore'),
        'status',
      ),
    },
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status,
    support: {
      prompt: {
        cacheMode: readString(prompt, 'cacheMode'),
        sourceOrder: readStringArray(prompt, 'sourceOrder'),
        sources: promptSources.map((entry) => {
          const source = assertRecord(entry, 'prompt source');

          return {
            key: readString(source, 'key'),
            label: readString(source, 'label'),
            optional: readBoolean(source, 'optional'),
            precedence: readNumber(source, 'precedence'),
            role: readString(source, 'role'),
          };
        }),
        supportedWorkflowCount: readNumber(prompt, 'supportedWorkflowCount'),
      },
      tools: {
        hasMore: readBoolean(tools, 'hasMore'),
        previewLimit: readNumber(tools, 'previewLimit'),
        tools: toolItems.map((entry) => parseToolPreview(entry)),
        totalCount: readNumber(tools, 'totalCount'),
      },
      workflows: {
        hasMore: readBoolean(workflows, 'hasMore'),
        previewLimit: readNumber(workflows, 'previewLimit'),
        totalCount: readNumber(workflows, 'totalCount'),
        workflows: workflowItems.map((entry) => parseWorkflowSupportItem(entry)),
      },
    },
    workspace: parseWorkspaceSummary(record.workspace),
  };
}

export function parseSettingsErrorPayload(
  value: unknown,
): SettingsErrorPayload {
  const record = assertRecord(value, 'settings error payload');
  const error = assertRecord(record.error, 'error');

  if (readBoolean(record, 'ok')) {
    throw new Error('Settings error payload must set ok=false.');
  }

  return {
    error: {
      code: readString(error, 'code'),
      message: readString(error, 'message'),
    },
    ok: false,
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readApiErrorStatus(record, 'status'),
  };
}
