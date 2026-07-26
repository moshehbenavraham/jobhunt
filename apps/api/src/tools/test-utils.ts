import { join } from 'node:path';
import {
  createApprovalRuntimeService,
  type ApprovalRuntimeService,
} from '../approval-runtime/index.js';
import {
  createObservabilityService,
  type ObservabilityService,
} from '../observability/index.js';
import {
  createOperationalStore,
  type OperationalStore,
} from '../store/index.js';
import {
  createWorkspaceAdapter,
  type WorkspaceAdapter,
} from '../workspace/index.js';
import {
  createWorkspaceFixture,
  type WorkspaceFixture,
} from '../workspace/test-utils.js';
import type { AnyToolDefinition } from './tool-contract.js';
import {
  createScriptExecutionAdapter,
  type ScriptExecutionDefinition,
} from './script-execution-adapter.js';
import {
  createToolExecutionService,
  type ToolExecutionServiceOptions,
} from './tool-execution-service.js';
import type { ToolExecutionService } from './tool-contract.js';
import { createWorkspaceMutationAdapter } from './workspace-mutation-adapter.js';

export type ToolTestClock = {
  advanceMs: (ms: number) => void;
  now: () => number;
  nowIso: () => string;
};

export type ToolHarness = {
  approvalRuntime: ApprovalRuntimeService;
  cleanup: () => Promise<void>;
  clock: ToolTestClock;
  fixture: WorkspaceFixture;
  observability: ObservabilityService;
  service: ToolExecutionService;
  store: OperationalStore;
  workspace: WorkspaceAdapter;
};

export function createToolTestClock(
  initialTimestamp = '2026-04-21T08:00:00.000Z',
): ToolTestClock {
  let currentTime = Date.parse(initialTimestamp);

  return {
    advanceMs(ms: number): void {
      currentTime += ms;
    },
    now(): number {
      return currentTime;
    },
    nowIso(): string {
      return new Date(currentTime).toISOString();
    },
  };
}

export async function createToolHarness(
  options: {
    fixtureFiles?: Record<string, string>;
    initialTimestamp?: string;
    scriptDefinitions?: readonly Omit<
      ScriptExecutionDefinition,
      'commandArgs'
    >[];
    tools?: readonly AnyToolDefinition[];
  } & Pick<
    ToolExecutionServiceOptions,
    'getApprovalRuntime' | 'getJobRunner' | 'getObservability'
  > = {},
): Promise<ToolHarness> {
  const clock = createToolTestClock(options.initialTimestamp);
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Tool Tester\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
      ...(options.fixtureFiles ?? {}),
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const store = await createOperationalStore({
    repoRoot: fixture.repoRoot,
  });
  const observability = createObservabilityService({
    getStore: async () => store,
    getStoreStatus: store.getStatus,
  });
  const approvalRuntime = createApprovalRuntimeService({
    getStore: async () => store,
    now: clock.now,
    recordEvent: (input) => observability.recordEvent(input),
  });
  const scriptDefinitions = (options.scriptDefinitions ?? []).map(
    (definition) => ({
      ...definition,
      command: process.execPath,
      commandArgs: [
        join(fixture.repoRoot, 'scripts', `${definition.name}.mjs`),
      ],
    }),
  );
  const service = createToolExecutionService({
    getApprovalRuntime:
      options.getApprovalRuntime ?? (async () => approvalRuntime),
    ...(options.getJobRunner
      ? {
          getJobRunner: options.getJobRunner,
        }
      : {}),
    getObservability: options.getObservability ?? (async () => observability),
    getStore: async () => store,
    now: clock.now,
    registryInput: options.tools ?? [],
    scriptAdapter: createScriptExecutionAdapter({
      allowlist: scriptDefinitions,
      now: clock.now,
      repoRoot: fixture.repoRoot,
    }),
    workspace,
    workspaceMutationAdapter: createWorkspaceMutationAdapter({
      repoRoot: fixture.repoRoot,
    }),
  });

  return {
    approvalRuntime,
    async cleanup(): Promise<void> {
      await store.close();
      await fixture.cleanup();
    },
    clock,
    fixture,
    observability,
    service,
    store,
    workspace,
  };
}
