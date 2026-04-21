import { pathToFileURL } from 'node:url';
import { STARTUP_SERVICE_NAME } from '../index.js';
import { createJobhuntLogger } from '../logger.js';
import { readRuntimeConfigFromEnv } from '../runtime/runtime-config.js';
import {
  startStartupHttpServer,
  type StartupHttpServerHandle,
} from './http-server.js';

function isMainModule(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

export async function runStartupHttpServer(): Promise<StartupHttpServerHandle> {
  const runtimeConfig = readRuntimeConfigFromEnv();
  const repoRoot = process.env.JOBHUNT_API_REPO_ROOT;

  if (!repoRoot) {
    return startStartupHttpServer(runtimeConfig);
  }

  return startStartupHttpServer({
    ...runtimeConfig,
    repoRoot,
  });
}

async function main(): Promise<void> {
  const handle = await runStartupHttpServer();
  const logger = createJobhuntLogger({
    repoRoot: process.env.JOBHUNT_API_REPO_ROOT ?? process.cwd(),
    service: STARTUP_SERVICE_NAME,
  });
  let shuttingDown = false;

  logger.info({ url: handle.url }, `${STARTUP_SERVICE_NAME} listening`);

  const shutdown = async (signal: 'SIGINT' | 'SIGTERM'): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    try {
      await handle.close();
      process.exit(0);
    } catch (error) {
      logger.error(
        error,
        `${STARTUP_SERVICE_NAME} shutdown failed after ${signal}`,
      );
      process.exit(1);
    }
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const logger = createJobhuntLogger({
      repoRoot: process.env.JOBHUNT_API_REPO_ROOT ?? process.cwd(),
      service: STARTUP_SERVICE_NAME,
    });
    logger.error(error, `${STARTUP_SERVICE_NAME} server failed`);
    process.exitCode = 1;
  });
}
