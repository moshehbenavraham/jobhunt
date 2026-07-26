import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
	type AgentRuntimeBootstrap,
	AgentRuntimeBootstrapError,
} from "../agent-runtime/index.js";
import type { DurableJobRunnerService } from "../job-runner/index.js";
import type { EvaluationWorkflowPayload } from "../job-runner/workflow-job-contract.js";
import type { WorkflowIntent } from "../prompt/index.js";
import type { OperationalStore, RuntimeSessionRecord } from "../store/index.js";
import type { ToolRegistry } from "../tools/index.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import {
	isEvaluationLaunchWorkflow,
	readStoredEvaluationLaunchContext,
} from "./evaluation-launch-context.js";
import {
	OrchestrationError,
	type OrchestrationHandoffEnvelope,
	type OrchestrationLaunchRequest,
	type OrchestrationRuntimeBlockedState,
	type OrchestrationRuntimeReadyState,
	type OrchestrationRuntimeState,
	type OrchestrationSessionSummary,
	parseOrchestrationRequest,
} from "./orchestration-contract.js";
import {
	createSessionLifecycle,
	type SessionLifecycle,
} from "./session-lifecycle.js";
import {
	getSpecialistDefinition,
	getWorkflowSpecialistRoute,
} from "./specialist-catalog.js";
import { resolveSpecialistToolScope } from "./tool-scope.js";
import {
	createWorkflowRouter,
	type WorkflowRouter,
} from "./workflow-router.js";

const DEFAULT_BOOTSTRAP_MAX_ATTEMPTS = 2;
const DEFAULT_BOOTSTRAP_RETRY_DELAY_MS = 200;
const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 5_000;

export type OrchestrationService = {
	orchestrate: (input: unknown) => Promise<OrchestrationHandoffEnvelope>;
};

type OrchestrationServiceOptions = {
	bootstrapMaxAttempts?: number;
	bootstrapRetryDelayMs?: number;
	bootstrapTimeoutMs?: number;
	bootstrapWorkflow: (
		workflow: WorkflowIntent,
	) => Promise<AgentRuntimeBootstrap>;
	getJobRunner?: () => Promise<DurableJobRunnerService>;
	getStore: () => Promise<OperationalStore>;
	getToolRegistry: () => ToolRegistry;
	now?: () => number;
	router?: WorkflowRouter;
	sessionLifecycle?: SessionLifecycle;
};

function toIsoTimestamp(now: number): string {
	return new Date(now).toISOString();
}

function isJsonObject(
	value: JsonValue | null,
): value is Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readLaunchPromptText(context: JsonValue | null): string | null {
	if (typeof context === "string") {
		const trimmed = context.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	if (!isJsonObject(context)) {
		return null;
	}

	const candidate = context.promptText;

	if (typeof candidate !== "string") {
		return null;
	}

	const trimmed = candidate.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function toStoredSessionSummary(input: {
	reused: boolean;
	session: RuntimeSessionRecord;
	workflow: WorkflowIntent;
}): OrchestrationSessionSummary {
	return {
		activeJobId: input.session.activeJobId,
		createdAt: input.session.createdAt,
		reused: input.reused,
		runnerId: input.session.runnerId,
		sessionId: input.session.sessionId,
		status: input.session.status,
		updatedAt: input.session.updatedAt,
		workflow: input.workflow,
	};
}

function createEvaluationJobId(input: {
	payload: EvaluationWorkflowPayload;
	sessionId: string;
}): string {
	const digest = createHash("sha256")
		.update(
			JSON.stringify({
				input:
					input.payload.input.kind === "job-url"
						? input.payload.input.canonicalUrl
						: input.payload.input.text,
				kind: input.payload.input.kind,
				sessionId: input.sessionId,
				workflow: input.payload.workflow,
			}),
		)
		.digest("hex")
		.slice(0, 16);

	return `${input.payload.workflow}:${input.sessionId}:${digest}`;
}

function createEvaluationWorkflowPayload(input: {
	request: OrchestrationLaunchRequest;
	sessionContext: JsonValue;
	workflow: WorkflowIntent;
}): EvaluationWorkflowPayload | null {
	if (!isEvaluationLaunchWorkflow(input.workflow)) {
		return null;
	}

	const launchContext = readStoredEvaluationLaunchContext(input.sessionContext);

	if (!launchContext) {
		return null;
	}

	if (launchContext.kind === "job-url") {
		return {
			input: {
				canonicalUrl: launchContext.canonicalUrl,
				host: launchContext.host,
				kind: "job-url",
			},
			workflow: input.workflow,
		};
	}

	const promptText = readLaunchPromptText(input.request.context);

	if (!promptText) {
		return null;
	}

	return {
		input: {
			kind: "raw-jd",
			text: promptText,
		},
		workflow: input.workflow,
	};
}

function toReadyRuntimeState(
	bootstrap: AgentRuntimeBootstrap,
): OrchestrationRuntimeReadyState {
	return {
		auth: bootstrap.auth,
		config: bootstrap.config,
		model: bootstrap.model,
		prompt: bootstrap.prompt,
		promptBundle: {
			cacheMode: bootstrap.promptBundle.cacheMode,
			loadedAt: bootstrap.promptBundle.loadedAt,
			modeRepoRelativePath:
				bootstrap.promptBundle.workflow.modeRepoRelativePath,
			sourceCount: bootstrap.promptBundle.sources.length,
			sourceOrder: [...bootstrap.promptBundle.sourceOrder],
		},
		startedAt: bootstrap.startedAt,
		status: "ready",
	};
}

function toBlockedRuntimeState(
	error: AgentRuntimeBootstrapError,
): OrchestrationRuntimeBlockedState {
	return {
		auth: error.auth ?? null,
		code: error.code,
		message: error.message,
		prompt: error.prompt ?? null,
		status: "blocked",
	};
}

async function withTimeout<TValue>(
	promise: Promise<TValue>,
	timeoutMs: number,
	message: string,
): Promise<TValue> {
	return Promise.race([
		promise,
		delay(timeoutMs).then(() => {
			throw new OrchestrationError("orchestration-bootstrap-timeout", message, {
				detail: {
					timeoutMs,
				},
			});
		}),
	]);
}

async function closeProvider(
	bootstrap: AgentRuntimeBootstrap | null,
): Promise<void> {
	if (!bootstrap) {
		return;
	}

	await bootstrap.provider.close();
}

export function createOrchestrationService(
	options: OrchestrationServiceOptions,
): OrchestrationService {
	const now = options.now ?? Date.now;
	const router =
		options.router ??
		createWorkflowRouter({
			getStore: options.getStore,
		});
	const sessionLifecycle =
		options.sessionLifecycle ??
		createSessionLifecycle({
			getStore: options.getStore,
			now,
		});
	const bootstrapTimeoutMs =
		options.bootstrapTimeoutMs ?? DEFAULT_BOOTSTRAP_TIMEOUT_MS;
	const bootstrapRetryDelayMs =
		options.bootstrapRetryDelayMs ?? DEFAULT_BOOTSTRAP_RETRY_DELAY_MS;
	const bootstrapMaxAttempts =
		options.bootstrapMaxAttempts ?? DEFAULT_BOOTSTRAP_MAX_ATTEMPTS;

	if (bootstrapMaxAttempts < 1) {
		throw new OrchestrationError(
			"orchestration-invalid-request",
			"Bootstrap max attempts must be at least 1.",
			{
				detail: {
					bootstrapMaxAttempts,
				},
			},
		);
	}

	async function bootstrapRuntime(
		workflow: WorkflowIntent,
	): Promise<OrchestrationRuntimeState> {
		let lastError: unknown;

		for (let attempt = 1; attempt <= bootstrapMaxAttempts; attempt += 1) {
			let bootstrap: AgentRuntimeBootstrap | null = null;

			try {
				bootstrap = await withTimeout(
					options.bootstrapWorkflow(workflow),
					bootstrapTimeoutMs,
					`Timed out while bootstrapping workflow ${workflow}.`,
				);

				const runtimeState = toReadyRuntimeState(bootstrap);
				await closeProvider(bootstrap);
				return runtimeState;
			} catch (error) {
				lastError = error;

				if (bootstrap) {
					await closeProvider(bootstrap);
				}

				if (error instanceof AgentRuntimeBootstrapError) {
					return toBlockedRuntimeState(error);
				}

				if (attempt < bootstrapMaxAttempts) {
					await delay(bootstrapRetryDelayMs);
				}
			}
		}

		throw new OrchestrationError(
			"orchestration-bootstrap-failed",
			"Workflow bootstrap failed after retry attempts were exhausted.",
			{
				cause: lastError,
				detail: {
					attempts: bootstrapMaxAttempts,
				},
			},
		);
	}

	async function enqueueEvaluationLaunchJob(input: {
		request: OrchestrationLaunchRequest;
		routeWorkflow: WorkflowIntent;
		session: OrchestrationSessionSummary;
	}): Promise<OrchestrationSessionSummary> {
		if (!options.getJobRunner) {
			return input.session;
		}

		if (!isEvaluationLaunchWorkflow(input.routeWorkflow)) {
			return input.session;
		}

		const store = await options.getStore();
		const storedSession = await store.sessions.getById(input.session.sessionId);

		if (!storedSession) {
			return input.session;
		}

		const payload = createEvaluationWorkflowPayload({
			request: input.request,
			sessionContext: storedSession.context,
			workflow: input.routeWorkflow,
		});

		if (!payload) {
			return input.session;
		}

		const runner = await options.getJobRunner();
		const jobId = createEvaluationJobId({
			payload,
			sessionId: input.session.sessionId,
		});

		await runner.enqueue({
			currentRunId: jobId,
			jobId,
			jobType: input.routeWorkflow,
			payload,
			session: {
				context: storedSession.context,
				sessionId: input.session.sessionId,
				workflow: input.routeWorkflow,
			},
		});

		const refreshedSession =
			(await store.sessions.getById(input.session.sessionId)) ?? storedSession;

		return toStoredSessionSummary({
			reused: input.session.reused,
			session: refreshedSession,
			workflow: input.routeWorkflow,
		});
	}

	return {
		async orchestrate(input: unknown): Promise<OrchestrationHandoffEnvelope> {
			const requestedAt = toIsoTimestamp(now());
			const route = await router.route(input);

			if (
				route.status === "session-not-found" ||
				route.status === "unsupported-workflow" ||
				route.workflow === null ||
				route.specialistId === null
			) {
				return {
					job: null,
					pendingApproval: null,
					requestedAt,
					route,
					runtime: {
						message: route.message,
						status: "skipped",
					},
					session: null,
					specialist: null,
					toolingGap: null,
				};
			}

			const request = parseOrchestrationRequest(input);
			const workflowRoute = getWorkflowSpecialistRoute(route.workflow);

			if (!workflowRoute) {
				throw new OrchestrationError(
					"orchestration-invalid-request",
					`Workflow ${route.workflow} is missing a specialist route definition.`,
				);
			}

			let session = await sessionLifecycle.ensureSession({
				request,
				route,
			});

			try {
				const specialist = getSpecialistDefinition(route.specialistId);
				const scope = resolveSpecialistToolScope(
					options.getToolRegistry(),
					workflowRoute.toolPolicy,
				);
				const runtime = await bootstrapRuntime(route.workflow);
				if (
					session &&
					request.kind === "launch" &&
					route.status === "ready" &&
					runtime.status === "ready"
				) {
					session = await enqueueEvaluationLaunchJob({
						request,
						routeWorkflow: route.workflow,
						session,
					});
				}
				const activity = session
					? await sessionLifecycle.summarizeActivity(session.sessionId)
					: {
							job: null,
							pendingApproval: null,
						};

				return {
					job: activity.job,
					pendingApproval: activity.pendingApproval,
					requestedAt,
					route,
					runtime,
					session,
					specialist: {
						description: specialist.description,
						id: specialist.id,
						toolCatalog: scope.catalog,
						workflow: route.workflow,
					},
					toolingGap:
						route.status === "tooling-gap"
							? {
									message: route.message,
									missingCapabilities: [...route.missingCapabilities],
								}
							: null,
				};
			} catch (error) {
				if (session) {
					session =
						(await sessionLifecycle.markSessionFailed({
							code:
								error instanceof OrchestrationError
									? error.code
									: "orchestration-bootstrap-failed",
							message: error instanceof Error ? error.message : String(error),
							sessionId: session.sessionId,
						})) ?? session;
				}

				throw error;
			}
		},
	};
}
