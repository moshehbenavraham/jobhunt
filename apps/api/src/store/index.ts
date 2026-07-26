import type { RepoPathOptions } from '../config/repo-paths.js';
import { createApprovalRepository } from './approval-repository.js';
import { createJobRepository } from './job-repository.js';
import { createRuntimeEventRepository } from './runtime-event-repository.js';
import { createRunMetadataRepository } from './run-metadata-repository.js';
import { createSessionRepository } from './session-repository.js';
import {
  createSqliteStore,
  inspectOperationalStoreStatus,
  OperationalStoreError,
} from './sqlite-store.js';
import type { OperationalStore } from './store-contract.js';

export * from './approval-repository.js';
export * from './job-repository.js';
export * from './runtime-event-repository.js';
export * from './run-metadata-repository.js';
export * from './session-repository.js';
export * from './sqlite-schema.js';
export * from './sqlite-store.js';
export * from './store-contract.js';

export async function createOperationalStore(
  options: RepoPathOptions = {},
): Promise<OperationalStore> {
  const store = await createSqliteStore(options);

  return {
    approvals: createApprovalRepository(store),
    close: store.close,
    databasePath: store.databasePath,
    events: createRuntimeEventRepository(store),
    getStatus: store.getStatus,
    jobs: createJobRepository(store),
    runMetadata: createRunMetadataRepository(store),
    sessions: createSessionRepository(store),
  };
}

export { inspectOperationalStoreStatus, OperationalStoreError };
