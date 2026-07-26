import {
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import {
  createStartupPayload,
  getStartupHttpStatus,
} from '../startup-status.js';

export function createStartupRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ services }) {
      const diagnostics = await services.startupDiagnostics.getDiagnostics();
      const payload = createStartupPayload(diagnostics);

      return createJsonRouteResponse(
        getStartupHttpStatus(payload.status),
        payload,
      );
    },
    methods: ['GET', 'HEAD'],
    path: '/startup',
  });
}
