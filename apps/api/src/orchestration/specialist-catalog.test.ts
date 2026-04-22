import assert from "node:assert/strict";
import test from "node:test";
import { WORKFLOW_INTENTS } from "../prompt/index.js";
import {
	getSpecialistDefinition,
	getWorkflowSpecialistRoute,
	listSpecialists,
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
});
