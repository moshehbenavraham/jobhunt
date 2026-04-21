import { pathToFileURL } from 'node:url';
import { DEFAULT_BOOT_HOST, DEFAULT_BOOT_PORT, STARTUP_SERVICE_NAME } from '../index.js';
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

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_BOOT_PORT;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    throw new Error(`Invalid JOBHUNT_API_PORT value: ${value}`);
  }

  return parsedValue;
}

export async function runStartupHttpServer(): Promise<StartupHttpServerHandle> {
  const options = {
    host: process.env.JOBHUNT_API_HOST ?? DEFAULT_BOOT_HOST,
    port: parsePort(process.env.JOBHUNT_API_PORT),
  };
  const repoRoot = process.env.JOBHUNT_API_REPO_ROOT;

  if (!repoRoot) {
    return startStartupHttpServer(options);
  }

  return startStartupHttpServer({
    ...options,
    repoRoot,
  });
}

async function main(): Promise<void> {
  const handle = await runStartupHttpServer();

  console.log(`${STARTUP_SERVICE_NAME} listening on ${handle.url}`);

  const shutdown = async (): Promise<void> => {
    await handle.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${STARTUP_SERVICE_NAME} server failed: ${message}`);
    process.exitCode = 1;
  });
}
