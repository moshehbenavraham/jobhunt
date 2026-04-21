import type { ApiRouteDefinition } from '../route-contract.js';
import { createHealthRoute } from './health-route.js';
import { createRuntimeApprovalsRoute } from './runtime-approvals-route.js';
import { createRuntimeDiagnosticsRoute } from './runtime-diagnostics-route.js';
import { createStartupRoute } from './startup-route.js';

function assertUniqueRouteSignatures(
  routes: readonly ApiRouteDefinition[],
): void {
  const seenSignatures = new Set<string>();

  for (const route of routes) {
    for (const method of route.methods) {
      const signature = `${method} ${route.path}`;

      if (seenSignatures.has(signature)) {
        throw new Error(`Duplicate route registration detected: ${signature}`);
      }

      seenSignatures.add(signature);
    }
  }
}

export function createApiRouteRegistry(): ApiRouteDefinition[] {
  const routes = [
    createHealthRoute(),
    createStartupRoute(),
    createRuntimeApprovalsRoute(),
    createRuntimeDiagnosticsRoute(),
  ];

  assertUniqueRouteSignatures(routes);
  return routes;
}
