import assert from "node:assert/strict";
import test from "node:test";
import { WORKFLOW_INTENTS } from "../prompt/index.js";
import {
	getSpecialistDefinition,
	getWorkflowSpecialistRoute,
	listSpecialists,
	listSpecialistWorkspaceRoutes,
	listWorkflowSpecialistRoutes,
} from "./specialist-catalog.js";

test("specialist catalog covers every supported workflow intent", () => {
	const specialists = listSpecialists();
	const routes = listWorkflowSpecialistRoutes();

	assert.equal(specialists.length, 5);
	assert.equal(routes.length, WORKFLOW_INTENTS.length);

	for (const workflow of WORKFLOW_INTENTS) {
		const route = getWorkflowSpecialistRoute(workflow);

		assert.ok(route, `missing specialist route for ${workflow}`);
		assert.ok(getSpecialistDefinition(route.specialistId));
	}
});

test("ready routes expose specialist-owned tools while tooling-gap routes expose missing capabilities", () => {
	const readyRoute = getWorkflowSpecialistRoute("single-evaluation");
	const blockedRoute = getWorkflowSpecialistRoute("tracker-status");
	const applicationHelpRoute = getWorkflowSpecialistRoute("application-help");
	const compareOffersRoute = getWorkflowSpecialistRoute("compare-offers");
	const followUpRoute = getWorkflowSpecialistRoute("follow-up-cadence");
	const patternsRoute = getWorkflowSpecialistRoute("rejection-patterns");

	assert.equal(readyRoute?.status, "ready");
	assert.equal(readyRoute?.specialistId, "evaluation-specialist");
	assert.ok((readyRoute?.toolPolicy.allowedToolNames.length ?? 0) > 0);
	assert.deepEqual(readyRoute?.missingCapabilities, []);

	assert.equal(blockedRoute?.status, "tooling-gap");
	assert.equal(blockedRoute?.specialistId, "tracker-specialist");
	assert.ok((blockedRoute?.missingCapabilities.length ?? 0) > 0);
	assert.ok((blockedRoute?.toolPolicy.fallbackToolNames?.length ?? 0) > 0);

	assert.equal(applicationHelpRoute?.status, "ready");
	assert.equal(applicationHelpRoute?.specialistId, "research-specialist");
	assert.deepEqual(applicationHelpRoute?.missingCapabilities, []);
	assert.deepEqual(applicationHelpRoute?.toolPolicy.allowedToolNames, [
		"resolve-application-help-context",
		"stage-application-help-draft",
		"list-evaluation-artifacts",
		"summarize-profile-sources",
	]);
	assert.equal(
		applicationHelpRoute?.workspace.summaryAvailability,
		"dedicated-detail",
	);
	assert.equal(
		applicationHelpRoute?.workspace.detailSurface?.path,
		"/application-help",
	);
	assert.equal(compareOffersRoute?.status, "ready");
	assert.deepEqual(compareOffersRoute?.missingCapabilities, []);
	assert.deepEqual(compareOffersRoute?.toolPolicy.allowedToolNames, [
		"resolve-compare-offers-context",
		"list-evaluation-artifacts",
		"summarize-profile-sources",
	]);
	assert.equal(
		compareOffersRoute?.workspace.detailSurface?.path,
		"/tracker-specialist",
	);
	assert.equal(
		compareOffersRoute?.workspace.summaryAvailability,
		"dedicated-detail",
	);
	assert.deepEqual(followUpRoute?.toolPolicy.allowedToolNames, [
		"analyze-follow-up-cadence",
		"list-evaluation-artifacts",
		"summarize-profile-sources",
	]);
	assert.deepEqual(patternsRoute?.toolPolicy.allowedToolNames, [
		"analyze-rejection-patterns",
		"list-evaluation-artifacts",
		"summarize-profile-sources",
	]);
});

test("specialist workspace routes expose shared metadata for remaining specialist workflows", () => {
	const workspaceRoutes = listSpecialistWorkspaceRoutes();
	const workspaceWorkflows = workspaceRoutes.map((route) => route.workflow);
	const compareOffersRoute = getWorkflowSpecialistRoute("compare-offers");
	const interviewPrepRoute = getWorkflowSpecialistRoute("interview-prep");

	assert.deepEqual(workspaceWorkflows, [
		"compare-offers",
		"follow-up-cadence",
		"rejection-patterns",
		"application-help",
		"deep-company-research",
		"linkedin-outreach",
		"interview-prep",
		"training-review",
		"project-review",
	]);
	assert.equal(compareOffersRoute?.workspace.family, "application-history");
	assert.equal(compareOffersRoute?.workspace.intake?.kind, "offer-set");
	assert.equal(
		compareOffersRoute?.workspace.workspacePath,
		"/workflows/compare-offers",
	);
	assert.equal(
		compareOffersRoute?.workspace.summaryAvailability,
		"dedicated-detail",
	);
	assert.equal(
		compareOffersRoute?.workspace.detailSurface?.path,
		"/tracker-specialist",
	);
	assert.equal(interviewPrepRoute?.workspace.family, "research-and-narrative");
	assert.equal(interviewPrepRoute?.workspace.summaryAvailability, "pending");
});
