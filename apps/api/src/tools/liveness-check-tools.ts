import { z } from 'zod';
import type { JsonValue } from '../workspace/workspace-types.js';
import { ToolExecutionError } from './tool-errors.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';

const livenessResultValues = ['active', 'expired', 'uncertain'] as const;
const livenessViewStateValues = ['empty', 'error', 'offline', 'ready'] as const;

type LivenessResult = (typeof livenessResultValues)[number];
type LivenessViewState = (typeof livenessViewStateValues)[number];

const checkJobLivenessInputSchema = z.object({
  url: z.string().url(),
});

const checkJobLivenessBatchInputSchema = z.object({
  urls: z.array(z.string().url()).max(10).default([]),
});

type ParsedLivenessSummary = {
  reason: string | null;
  result: LivenessResult;
  url: string;
};

function parseLivenessStdout(stdout: string): ParsedLivenessSummary[] {
  const lines = stdout.replace(/\r\n/g, '\n').split('\n');
  const results: ParsedLivenessSummary[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trimEnd() ?? '';
    const match = line.match(
      /\b(active|expired|uncertain)\b\s+(https?:\/\/\S+)/,
    );

    if (!match) {
      continue;
    }

    const nextLine = lines[index + 1] ?? '';
    const reason =
      nextLine.trim().length > 0 &&
      !/\b(active|expired|uncertain)\b\s+(https?:\/\/\S+)/.test(nextLine)
        ? nextLine.trim()
        : null;

    results.push({
      reason,
      result: match[1] as LivenessResult,
      url: match[2] ?? '',
    });
  }

  return results;
}

function classifyScriptFailure(error: unknown): {
  message: string;
  state: Exclude<LivenessViewState, 'empty' | 'ready'>;
} {
  if (error instanceof ToolExecutionError) {
    if (error.code === 'tool-script-timeout') {
      return {
        message: error.message,
        state: 'offline',
      };
    }

    return {
      message: error.message,
      state: 'error',
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      state: 'error',
    };
  }

  return {
    message: String(error),
    state: 'error',
  };
}

async function runLivenessCheck(
  url: string,
  context: Parameters<ToolDefinition['execute']>[1],
): Promise<JsonValue> {
  try {
    const dispatch = await context.runScript({
      args: [url],
      scriptName: 'check-liveness',
    });
    const parsedResults = parseLivenessStdout(dispatch.stdout);
    const parsed = parsedResults.find((entry) => entry.url === url);

    if (!parsed) {
      return {
        message:
          'Liveness output did not include a result for the requested URL.',
        rawExitCode: dispatch.exitCode,
        state: 'error',
        url,
      };
    }

    return {
      liveness: {
        exitCode: dispatch.exitCode,
        reason: parsed.reason,
        result: parsed.result,
        url: parsed.url,
      },
      state: 'ready',
    };
  } catch (error) {
    const failure = classifyScriptFailure(error);

    return {
      message: failure.message,
      state: failure.state,
      url,
    };
  }
}

function summarizeBatchStates(items: readonly JsonValue[]): {
  active: number;
  error: number;
  expired: number;
  offline: number;
  uncertain: number;
} {
  const summary = {
    active: 0,
    error: 0,
    expired: 0,
    offline: 0,
    uncertain: 0,
  };

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      summary.error += 1;
      continue;
    }

    if (item.state === 'offline') {
      summary.offline += 1;
      continue;
    }

    if (item.state === 'error') {
      summary.error += 1;
      continue;
    }

    if (
      item.state === 'ready' &&
      item.liveness &&
      typeof item.liveness === 'object' &&
      !Array.isArray(item.liveness)
    ) {
      const result = item.liveness.result;

      if (result === 'active') {
        summary.active += 1;
      } else if (result === 'expired') {
        summary.expired += 1;
      } else if (result === 'uncertain') {
        summary.uncertain += 1;
      } else {
        summary.error += 1;
      }

      continue;
    }

    summary.error += 1;
  }

  return summary;
}

function resolveBatchState(items: readonly JsonValue[]): LivenessViewState {
  if (items.length === 0) {
    return 'empty';
  }

  if (
    items.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        item.state === 'error',
    )
  ) {
    return 'error';
  }

  if (
    items.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        item.state === 'offline',
    )
  ) {
    return 'offline';
  }

  return 'ready';
}

export function createLivenessCheckTools(): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Run a typed liveness check for one job URL without exposing raw Playwright script output.',
      async execute(input, context) {
        return {
          output: await runLivenessCheck(input.url, context),
        };
      },
      inputSchema: checkJobLivenessInputSchema,
      name: 'check-job-liveness',
      policy: {
        permissions: {
          scripts: ['check-liveness'],
        },
      },
    } satisfies ToolDefinition<
      z.output<typeof checkJobLivenessInputSchema>,
      JsonValue
    >,
    {
      description:
        'Run sequential typed liveness checks for a batch of URLs and summarize the resulting active, expired, uncertain, offline, or error states.',
      async execute(input, context) {
        if (input.urls.length === 0) {
          return {
            output: {
              items: [],
              state: 'empty',
              summary: {
                active: 0,
                error: 0,
                expired: 0,
                offline: 0,
                uncertain: 0,
              },
            },
          };
        }

        const items: JsonValue[] = [];

        for (const url of input.urls) {
          items.push(await runLivenessCheck(url, context));
        }

        return {
          output: {
            items,
            state: resolveBatchState(items),
            summary: summarizeBatchStates(items),
          },
        };
      },
      inputSchema: checkJobLivenessBatchInputSchema,
      name: 'check-job-liveness-batch',
      policy: {
        permissions: {
          scripts: ['check-liveness'],
        },
      },
    } satisfies ToolDefinition<
      z.output<typeof checkJobLivenessBatchInputSchema>,
      JsonValue
    >,
  ];
}
