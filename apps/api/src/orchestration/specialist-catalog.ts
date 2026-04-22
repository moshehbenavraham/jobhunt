import { WORKFLOW_INTENTS, type WorkflowIntent } from "../prompt/index.js";
import type {
	OrchestrationRouteStatus,
	SpecialistId,
} from "./orchestration-contract.js";

export type SpecialistToolPolicy = {
	allowedToolNames: readonly string[];
	deniedToolNames?: readonly string[];
	fallbackToolNames?: readonly string[];
	restrictedToolNames?: readonly string[];
	revokedToolNames?: readonly string[];
};

export type SpecialistDefinition = {
	description: string;
	id: SpecialistId;
	label: string;
};

export const SPECIALIST_WORKSPACE_FAMILY_VALUES = [
	"application-history",
	"research-and-narrative",
] as const;

export type SpecialistWorkspaceFamily =
	(typeof SPECIALIST_WORKSPACE_FAMILY_VALUES)[number];

export const SPECIALIST_WORKSPACE_INTAKE_KIND_VALUES = [
	"company-role",
	"offer-set",
	"project-idea",
	"report-context",
	"tracker-history",
	"training-topic",
] as const;

export type SpecialistWorkspaceIntakeKind =
	(typeof SPECIALIST_WORKSPACE_INTAKE_KIND_VALUES)[number];

export const SPECIALIST_WORKSPACE_SUMMARY_AVAILABILITY_VALUES = [
	"dedicated-detail",
	"pending",
] as const;

export type SpecialistWorkspaceSummaryAvailability =
	(typeof SPECIALIST_WORKSPACE_SUMMARY_AVAILABILITY_VALUES)[number];

export type WorkflowSpecialistWorkspaceMetadata = {
	detailSurface: {
		label: string;
		path: string;
	} | null;
	enabled: boolean;
	family: SpecialistWorkspaceFamily | null;
	intake: {
		kind: SpecialistWorkspaceIntakeKind;
		message: string;
		requiresSavedState: boolean;
	} | null;
	summaryAvailability: SpecialistWorkspaceSummaryAvailability | null;
	workspaceLabel: string | null;
	workspacePath: string | null;
};

export type WorkflowSpecialistRoute = {
	message: string;
	missingCapabilities: readonly string[];
	specialistId: SpecialistId;
	status: Exclude<
		OrchestrationRouteStatus,
		"session-not-found" | "unsupported-workflow"
	>;
	toolPolicy: SpecialistToolPolicy;
	workflow: WorkflowIntent;
	workspace: WorkflowSpecialistWorkspaceMetadata;
};

const EVALUATION_TOOLS = [
	"check-job-liveness",
	"check-job-liveness-batch",
	"extract-ats-job",
	"generate-ats-pdf",
	"list-evaluation-artifacts",
	"merge-tracker-additions",
	"normalize-raw-job-description",
	"reserve-report-artifact",
	"stage-tracker-addition",
	"verify-tracker-pipeline",
	"write-report-artifact",
] as const;

const SCAN_TOOLS = [
	"check-job-liveness-batch",
	"enqueue-pipeline-processing",
	"enqueue-portal-scan",
	"list-workspace-artifacts",
	"summarize-profile-sources",
] as const;

const BATCH_TOOLS = [
	"dry-run-batch-evaluation",
	"list-evaluation-artifacts",
	"merge-tracker-additions",
	"retry-batch-evaluation-failures",
	"start-batch-evaluation",
	"verify-tracker-pipeline",
] as const;

const TRACKER_FALLBACK_TOOLS = [
	"list-evaluation-artifacts",
	"list-workspace-artifacts",
	"summarize-profile-sources",
	"summarize-workflow-support",
] as const;

const COMPARE_OFFERS_TOOLS = [
	"resolve-compare-offers-context",
	"list-evaluation-artifacts",
	"summarize-profile-sources",
] as const;

const FOLLOW_UP_CADENCE_TOOLS = [
	"analyze-follow-up-cadence",
	"list-evaluation-artifacts",
	"summarize-profile-sources",
] as const;

const REJECTION_PATTERN_TOOLS = [
	"analyze-rejection-patterns",
	"list-evaluation-artifacts",
	"summarize-profile-sources",
] as const;

const RESEARCH_FALLBACK_TOOLS = [
	"inspect-prompt-contract",
	"list-workspace-artifacts",
	"summarize-profile-sources",
] as const;

const APPLICATION_HELP_TOOLS = [
	"resolve-application-help-context",
	"stage-application-help-draft",
	"list-evaluation-artifacts",
	"summarize-profile-sources",
] as const;

const DISABLED_WORKSPACE_METADATA = {
	detailSurface: null,
	enabled: false,
	family: null,
	intake: null,
	summaryAvailability: null,
	workspaceLabel: null,
	workspacePath: null,
} as const satisfies WorkflowSpecialistWorkspaceMetadata;

function createWorkspaceMetadata(
	workflow: WorkflowIntent,
	input: {
		detailSurface?: {
			label: string;
			path: string;
		} | null;
		family: SpecialistWorkspaceFamily;
		intake: {
			kind: SpecialistWorkspaceIntakeKind;
			message: string;
			requiresSavedState: boolean;
		};
		summaryAvailability: SpecialistWorkspaceSummaryAvailability;
		workspaceLabel: string;
	},
): WorkflowSpecialistWorkspaceMetadata {
	return {
		detailSurface: input.detailSurface ?? null,
		enabled: true,
		family: input.family,
		intake: input.intake,
		summaryAvailability: input.summaryAvailability,
		workspaceLabel: input.workspaceLabel,
		workspacePath: `/workflows/${workflow}`,
	};
}

const specialistDefinitions = [
	{
		description:
			"Owns job-description intake, live evaluation, report artifacts, and PDF-oriented evaluation follow-through.",
		id: "evaluation-specialist",
		label: "Evaluation Specialist",
	},
	{
		description:
			"Owns portal scans and queued pipeline execution through durable backend workflows.",
		id: "scan-specialist",
		label: "Scan Specialist",
	},
	{
		description:
			"Owns tracker review, offer comparison, follow-up analysis, and other application-history workflows.",
		id: "tracker-specialist",
		label: "Tracker Specialist",
	},
	{
		description:
			"Owns application-help, research, interview, training, project, and outreach workflows once typed tooling exists.",
		id: "research-specialist",
		label: "Research Specialist",
	},
	{
		description:
			"Owns batch-evaluation supervision and batch closeout through durable workflow controls.",
		id: "batch-supervisor",
		label: "Batch Supervisor",
	},
] as const satisfies readonly SpecialistDefinition[];

const workflowRoutes = [
	{
		message:
			"Auto-pipeline can launch with the evaluation specialist and the current typed evaluation artifact toolset.",
		missingCapabilities: [],
		specialistId: "evaluation-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: ["bootstrap-auto-pipeline", ...EVALUATION_TOOLS],
		},
		workflow: "auto-pipeline",
		workspace: DISABLED_WORKSPACE_METADATA,
	},
	{
		message:
			"Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.",
		missingCapabilities: [],
		specialistId: "evaluation-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: ["bootstrap-single-evaluation", ...EVALUATION_TOOLS],
		},
		workflow: "single-evaluation",
		workspace: DISABLED_WORKSPACE_METADATA,
	},
	{
		message:
			"ATS PDF generation is supported directly through the evaluation specialist.",
		missingCapabilities: [],
		specialistId: "evaluation-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: [
				"generate-ats-pdf",
				"list-evaluation-artifacts",
				"summarize-profile-sources",
			],
		},
		workflow: "generate-ats-pdf",
		workspace: DISABLED_WORKSPACE_METADATA,
	},
	{
		message:
			"Scan portals uses the scan specialist and durable workflow enqueue surfaces.",
		missingCapabilities: [],
		specialistId: "scan-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: SCAN_TOOLS,
		},
		workflow: "scan-portals",
		workspace: DISABLED_WORKSPACE_METADATA,
	},
	{
		message:
			"Pipeline processing uses the scan specialist and durable pipeline enqueue surfaces.",
		missingCapabilities: [],
		specialistId: "scan-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: SCAN_TOOLS,
		},
		workflow: "process-pipeline",
		workspace: DISABLED_WORKSPACE_METADATA,
	},
	{
		message:
			"Batch evaluation is supported through the batch supervisor and the durable batch workflow controls.",
		missingCapabilities: [],
		specialistId: "batch-supervisor",
		status: "ready",
		toolPolicy: {
			allowedToolNames: BATCH_TOOLS,
		},
		workflow: "batch-evaluation",
		workspace: DISABLED_WORKSPACE_METADATA,
	},
	{
		message:
			"Tracker status remains blocked until a typed tracker-summary tool is implemented.",
		missingCapabilities: ["typed-tracker-summary"],
		specialistId: "tracker-specialist",
		status: "tooling-gap",
		toolPolicy: {
			allowedToolNames: [],
			fallbackToolNames: TRACKER_FALLBACK_TOOLS,
			restrictedToolNames: ["inspect-prompt-contract"],
		},
		workflow: "tracker-status",
		workspace: DISABLED_WORKSPACE_METADATA,
	},
	{
		message:
			"Offer comparison can launch with the tracker specialist using saved report matching and bounded comparison packets.",
		missingCapabilities: [],
		specialistId: "tracker-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: COMPARE_OFFERS_TOOLS,
		},
		workflow: "compare-offers",
		workspace: createWorkspaceMetadata("compare-offers", {
			detailSurface: {
				label: "Compare Offers",
				path: "/tracker-specialist",
			},
			family: "application-history",
			intake: {
				kind: "offer-set",
				message:
					"Compare-offers expects two or more offer descriptions, saved evaluations, or role references.",
				requiresSavedState: false,
			},
			summaryAvailability: "dedicated-detail",
			workspaceLabel: "Compare Offers",
		}),
	},
	{
		message:
			"Follow-up cadence can launch with the tracker specialist using the bounded cadence-analysis script adapter.",
		missingCapabilities: [],
		specialistId: "tracker-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: FOLLOW_UP_CADENCE_TOOLS,
		},
		workflow: "follow-up-cadence",
		workspace: createWorkspaceMetadata("follow-up-cadence", {
			detailSurface: {
				label: "Follow-Up Cadence",
				path: "/tracker-specialist",
			},
			family: "application-history",
			intake: {
				kind: "tracker-history",
				message:
					"Follow-up cadence reads the tracker, follow-up history, and saved reports to stage next-touch guidance.",
				requiresSavedState: true,
			},
			summaryAvailability: "dedicated-detail",
			workspaceLabel: "Follow-Up Cadence",
		}),
	},
	{
		message:
			"Rejection-pattern analysis can launch with the tracker specialist using the bounded tracker-analysis script adapter.",
		missingCapabilities: [],
		specialistId: "tracker-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: REJECTION_PATTERN_TOOLS,
		},
		workflow: "rejection-patterns",
		workspace: createWorkspaceMetadata("rejection-patterns", {
			detailSurface: {
				label: "Rejection Patterns",
				path: "/tracker-specialist",
			},
			family: "application-history",
			intake: {
				kind: "tracker-history",
				message:
					"Rejection patterns reads tracker history and saved reports to identify outcome trends.",
				requiresSavedState: true,
			},
			summaryAvailability: "dedicated-detail",
			workspaceLabel: "Rejection Patterns",
		}),
	},
	{
		message:
			"Application help can launch with the research specialist using report-backed context lookup and draft staging while keeping submission manual.",
		missingCapabilities: [],
		specialistId: "research-specialist",
		status: "ready",
		toolPolicy: {
			allowedToolNames: APPLICATION_HELP_TOOLS,
			restrictedToolNames: ["inspect-prompt-contract"],
		},
		workflow: "application-help",
		workspace: createWorkspaceMetadata("application-help", {
			detailSurface: {
				label: "Application Help",
				path: "/application-help",
			},
			family: "research-and-narrative",
			intake: {
				kind: "report-context",
				message:
					"Application help launches from saved report context, application questions, or staged draft hints.",
				requiresSavedState: true,
			},
			summaryAvailability: "dedicated-detail",
			workspaceLabel: "Application Help",
		}),
	},
	{
		message:
			"Deep company research remains blocked until typed research tooling is implemented.",
		missingCapabilities: ["typed-company-research"],
		specialistId: "research-specialist",
		status: "tooling-gap",
		toolPolicy: {
			allowedToolNames: [],
			fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
		},
		workflow: "deep-company-research",
		workspace: createWorkspaceMetadata("deep-company-research", {
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"Deep research expects a company and role target, with saved evaluation context when available.",
				requiresSavedState: false,
			},
			summaryAvailability: "pending",
			workspaceLabel: "Deep Research",
		}),
	},
	{
		message:
			"LinkedIn outreach remains blocked until typed outreach tooling is implemented.",
		missingCapabilities: ["typed-linkedin-outreach"],
		specialistId: "research-specialist",
		status: "tooling-gap",
		toolPolicy: {
			allowedToolNames: [],
			fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
		},
		workflow: "linkedin-outreach",
		workspace: createWorkspaceMetadata("linkedin-outreach", {
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"LinkedIn outreach expects a company, role, or contact target to generate a bounded outreach draft.",
				requiresSavedState: false,
			},
			summaryAvailability: "pending",
			workspaceLabel: "LinkedIn Outreach",
		}),
	},
	{
		message:
			"Interview prep remains blocked until typed interview-prep tooling is implemented.",
		missingCapabilities: ["typed-interview-prep"],
		specialistId: "research-specialist",
		status: "tooling-gap",
		toolPolicy: {
			allowedToolNames: [],
			fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
		},
		workflow: "interview-prep",
		workspace: createWorkspaceMetadata("interview-prep", {
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"Interview prep expects a company and role target, with saved report context when available.",
				requiresSavedState: false,
			},
			summaryAvailability: "pending",
			workspaceLabel: "Interview Prep",
		}),
	},
	{
		message:
			"Training review remains blocked until typed training-review tooling is implemented.",
		missingCapabilities: ["typed-training-review"],
		specialistId: "research-specialist",
		status: "tooling-gap",
		toolPolicy: {
			allowedToolNames: [],
			fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
		},
		workflow: "training-review",
		workspace: createWorkspaceMetadata("training-review", {
			family: "research-and-narrative",
			intake: {
				kind: "training-topic",
				message:
					"Training review expects a course, certification, or skill investment to evaluate.",
				requiresSavedState: false,
			},
			summaryAvailability: "pending",
			workspaceLabel: "Training Review",
		}),
	},
	{
		message:
			"Project review remains blocked until typed project-review tooling is implemented.",
		missingCapabilities: ["typed-project-review"],
		specialistId: "research-specialist",
		status: "tooling-gap",
		toolPolicy: {
			allowedToolNames: [],
			fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
		},
		workflow: "project-review",
		workspace: createWorkspaceMetadata("project-review", {
			family: "research-and-narrative",
			intake: {
				kind: "project-idea",
				message:
					"Project review expects a portfolio project concept, brief, or artifact outline.",
				requiresSavedState: false,
			},
			summaryAvailability: "pending",
			workspaceLabel: "Project Review",
		}),
	},
] as const satisfies readonly WorkflowSpecialistRoute[];

const specialistMap = new Map<SpecialistId, SpecialistDefinition>(
	specialistDefinitions.map((definition) => [definition.id, definition]),
);

const workflowRouteMap = new Map<WorkflowIntent, WorkflowSpecialistRoute>(
	workflowRoutes.map((route) => [route.workflow, route]),
);

function cloneToolPolicy(policy: SpecialistToolPolicy): SpecialistToolPolicy {
	return {
		allowedToolNames: [...policy.allowedToolNames],
		...(policy.deniedToolNames
			? {
					deniedToolNames: [...policy.deniedToolNames],
				}
			: {}),
		...(policy.fallbackToolNames
			? {
					fallbackToolNames: [...policy.fallbackToolNames],
				}
			: {}),
		...(policy.restrictedToolNames
			? {
					restrictedToolNames: [...policy.restrictedToolNames],
				}
			: {}),
		...(policy.revokedToolNames
			? {
					revokedToolNames: [...policy.revokedToolNames],
				}
			: {}),
	};
}

function assertUniqueStrings(values: readonly string[], label: string): void {
	const seen = new Set<string>();

	for (const value of values) {
		if (!value.trim()) {
			throw new Error(`${label} must not contain empty tool names.`);
		}

		if (seen.has(value)) {
			throw new Error(`${label} contains duplicate tool name ${value}.`);
		}

		seen.add(value);
	}
}

function assertCatalogCoverage(): void {
	for (const workflow of WORKFLOW_INTENTS) {
		const route = workflowRouteMap.get(workflow);

		if (!route) {
			throw new Error(
				`Workflow ${workflow} is missing a specialist route definition.`,
			);
		}

		if (!specialistMap.has(route.specialistId)) {
			throw new Error(
				`Workflow ${workflow} references unknown specialist ${route.specialistId}.`,
			);
		}

		assertUniqueStrings(
			route.toolPolicy.allowedToolNames,
			`${workflow} allowedToolNames`,
		);
		assertUniqueStrings(
			route.toolPolicy.deniedToolNames ?? [],
			`${workflow} deniedToolNames`,
		);
		assertUniqueStrings(
			route.toolPolicy.restrictedToolNames ?? [],
			`${workflow} restrictedToolNames`,
		);
		assertUniqueStrings(
			route.toolPolicy.revokedToolNames ?? [],
			`${workflow} revokedToolNames`,
		);
		assertUniqueStrings(
			route.toolPolicy.fallbackToolNames ?? [],
			`${workflow} fallbackToolNames`,
		);
	}
}

assertCatalogCoverage();

export function listSpecialists(): readonly SpecialistDefinition[] {
	return specialistDefinitions.map((definition) => ({ ...definition }));
}

export function getSpecialistDefinition(
	specialistId: SpecialistId,
): SpecialistDefinition {
	const specialist = specialistMap.get(specialistId);

	if (!specialist) {
		throw new Error(`Unknown specialist definition: ${specialistId}.`);
	}

	return {
		...specialist,
	};
}

export function listWorkflowSpecialistRoutes(): readonly WorkflowSpecialistRoute[] {
	return workflowRoutes.map((route) => ({
		...route,
		missingCapabilities: [...route.missingCapabilities],
		toolPolicy: cloneToolPolicy(route.toolPolicy),
		workspace: {
			...route.workspace,
			detailSurface: route.workspace.detailSurface
				? {
						...route.workspace.detailSurface,
					}
				: null,
			intake: route.workspace.intake
				? {
						...route.workspace.intake,
					}
				: null,
		},
	}));
}

export function getWorkflowSpecialistRoute(
	workflow: WorkflowIntent,
): WorkflowSpecialistRoute | null {
	const route = workflowRouteMap.get(workflow);

	if (!route) {
		return null;
	}

	return {
		...route,
		missingCapabilities: [...route.missingCapabilities],
		toolPolicy: cloneToolPolicy(route.toolPolicy),
		workspace: {
			...route.workspace,
			detailSurface: route.workspace.detailSurface
				? {
						...route.workspace.detailSurface,
					}
				: null,
			intake: route.workspace.intake
				? {
						...route.workspace.intake,
					}
				: null,
		},
	};
}

export function listSpecialistWorkspaceRoutes(): readonly WorkflowSpecialistRoute[] {
	return listWorkflowSpecialistRoutes().filter(
		(route) => route.workspace.enabled,
	);
}
