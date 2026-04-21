import {
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import { createHealthPayload, getHealthHttpStatus } from '../startup-status.js';

export function createHealthRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ services }) {
      const diagnostics = await services.startupDiagnostics.getDiagnostics();
      const payload = createHealthPayload(diagnostics);

      return createJsonRouteResponse(
        getHealthHttpStatus(payload.status),
        payload,
      );
    },
    methods: ['GET', 'HEAD'],
    path: '/health',
  });
}
