import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceAdapter } from '../workspace/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createWorkspaceDiscoveryTools } from './workspace-discovery-tools.js';

function createReadOnlyContext(repoRoot: string) {
  const workspace = createWorkspaceAdapter({ repoRoot });

  return {
    correlation: {
      jobId: 'job-workspace-tool',
      requestId: 'request-workspace-tool',
      sessionId: 'session-workspace-tool',
      traceId: 'trace-workspace-tool',
    },
    enqueueJob: async () => {
      throw new Error('discovery tools should not enqueue durable jobs');
    },
    input: {},
    mutateWorkspace: async () => {
      throw new Error('mutateWorkspace should not be called by discovery tools');
    },
    now: () => Date.parse('2026-04-21T08:00:00.000Z'),
    observe: async () => {},
    request: {
      correlation: {
        jobId: 'job-workspace-tool',
        requestId: 'request-workspace-tool',
        sessionId: 'session-workspace-tool',
        traceId: 'trace-workspace-tool',
      },
      input: {},
      toolName: 'workspace-tool',
    },
    runScript: async () => {
      throw new Error('runScript should not be called by discovery tools');
    },
    workspace,
  };
}

test('profile summary uses legacy CV and article-digest fallbacks', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'article-digest.md': '# Digest\n\n## Proof Point\n',
      'config/portals.yml': [
        'title_filter:',
        '  positive:',
        '    - Forward Deployed',
        '  negative:',
        '    - Intern',
        'tracked_companies:',
        '  - name: OpenAI',
        '    enabled: true',
        '  - name: Example',
        '    enabled: false',
        '',
      ].join('\n'),
      'config/profile.yml': [
        'candidate:',
        '  full_name: Test User',
        '  email: test@example.com',
        '  location: Tel Aviv',
        'narrative:',
        '  headline: Built agent systems',
        'target_roles:',
        '  primary:',
        '    - AI Platform Engineer',
        '  archetypes:',
        '    - name: AI Platform',
        '      level: Senior',
        '      fit: primary',
        'discovery:',
        '  remote_policy: remote_or_allowed_locations',
        '  allowed_location_terms:',
        '    - Israel',
        '  blocked_regions:',
        '    - APAC',
        '  allow_unknown_locations: true',
        '  allow_remote_unknown_locations: false',
        'compensation:',
        '  target_range: "$200K"',
        '  minimum: "$150K"',
        '  currency: USD',
        'location:',
        '  timezone: Asia/Jerusalem',
        '',
      ].join('\n'),
      'cv.md': '# Legacy CV\n\n## Experience\n\n## Skills\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createWorkspaceDiscoveryTools({
    workspace,
  }).find((candidate) => candidate.name === 'summarize-profile-sources');

  assert.ok(tool);

  try {
    const result = await tool.execute(
      tool.inputSchema.parse({}),
      createReadOnlyContext(fixture.repoRoot),
    );
    const output = result.output as Record<string, unknown>;
    const cv = output.cv as Record<string, unknown>;
    const cvSource = cv.source as Record<string, unknown>;
    const articleDigest = output.articleDigest as Record<string, unknown>;
    const digestSource = articleDigest.source as Record<string, unknown>;
    const candidate = output.candidate as Record<string, unknown>;
    const portals = output.portals as Record<string, unknown>;

    assert.equal(cvSource.legacyFallback, true);
    assert.equal(cvSource.repoRelativePath, 'cv.md');
    assert.equal(digestSource.legacyFallback, true);
    assert.equal(candidate.fullName, 'Test User');
    assert.equal(candidate.timezone, 'Asia/Jerusalem');
    assert.equal(portals.enabledTrackedCompanies, 1);
    assert.deepEqual(portals.positiveTitles, ['Forward Deployed']);
  } finally {
    await fixture.cleanup();
  }
});

test('required workspace inspection reports repairable missing files in canonical order', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createWorkspaceDiscoveryTools({
    workspace,
  }).find((candidate) => candidate.name === 'inspect-required-workspace-files');

  assert.ok(tool);

  try {
    const result = await tool.execute(
      tool.inputSchema.parse({ includeOptional: false }),
      createReadOnlyContext(fixture.repoRoot),
    );
    const output = result.output as Record<string, unknown>;
    const surfaces = output.surfaces as Array<Record<string, unknown>>;
    const missingSurfaceKeys = surfaces
      .filter((surface) => surface.status === 'missing')
      .map((surface) => surface.surfaceKey);
    const profileConfigSurface = surfaces.find(
      (surface) => surface.surfaceKey === 'profileConfig',
    );
    const profileCvSurface = surfaces.find(
      (surface) => surface.surfaceKey === 'profileCv',
    );

    assert.deepEqual(missingSurfaceKeys, ['profileConfig', 'profileCv']);
    assert.deepEqual(
      surfaces.map((surface) => surface.canonicalRepoRelativePath),
      [
        'AGENTS.md',
        'config/portals.yml',
        'config/profile.yml',
        'docs',
        'docs/DATA_CONTRACT.md',
        'modes',
        'modes/_profile.md',
        'modes/_shared.md',
        'profile/cv.md',
      ],
    );
    assert.equal(profileConfigSurface?.repairableSurfaceKey, 'profileConfig');
    assert.equal(profileCvSurface?.repairableSurfaceKey, 'profileCv');
  } finally {
    await fixture.cleanup();
  }
});

test('artifact listing is deterministic and respects offset pagination', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'jds/role-a.md': '# JD A\n',
      'output/resume-b.pdf': 'pdf\n',
      'reports/report-a.md': '# Report A\n',
      'reports/report-z.md': '# Report Z\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createWorkspaceDiscoveryTools({
    workspace,
  }).find((candidate) => candidate.name === 'list-workspace-artifacts');

  assert.ok(tool);

  try {
    const result = await tool.execute(
      tool.inputSchema.parse({
        group: 'all',
        limit: 2,
        offset: 1,
      }),
      createReadOnlyContext(fixture.repoRoot),
    );
    const output = result.output as Record<string, unknown>;
    const items = output.items as Array<Record<string, unknown>>;

    assert.equal(output.total, 4);
    assert.equal(output.hasMore, true);
    assert.deepEqual(
      items.map((item) => item.repoRelativePath),
      ['output/resume-b.pdf', 'reports/report-a.md'],
    );
  } finally {
    await fixture.cleanup();
  }
});

test('workflow support summary verifies routed mode existence', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'modes/scan.md': '# Scan\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createWorkspaceDiscoveryTools({
    workspace,
  }).find((candidate) => candidate.name === 'summarize-workflow-support');

  assert.ok(tool);

  try {
    const result = await tool.execute(
      tool.inputSchema.parse({
        workflow: 'scan-portals',
      }),
      createReadOnlyContext(fixture.repoRoot),
    );
    const output = result.output as Record<string, unknown>;
    const routes = output.routes as Array<Record<string, unknown>>;

    assert.equal(output.missingModeCount, 0);
    assert.equal(routes.length, 1);
    assert.equal(routes[0]?.intent, 'scan-portals');
    assert.equal(routes[0]?.exists, true);
  } finally {
    await fixture.cleanup();
  }
});
