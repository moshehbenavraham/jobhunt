import type { CSSProperties } from 'react';
import { NavLink } from 'react-router';
import {
  type OperatorShellSummaryPayload,
  PRIMARY_SHELL_SURFACE_IDS,
  SHELL_SURFACES,
  type ShellSurfaceDefinition,
  type ShellSurfaceId,
} from './shell-types';
import { SurfaceIcon } from './surface-icon';
import type { NavigationRailVariant } from './use-responsive-layout';

type NavigationRailProps = {
  onDrawerClose?: () => void;
  summary: OperatorShellSummaryPayload | null;
  variant?: NavigationRailVariant;
};

const SURFACES_BY_ID = new Map<ShellSurfaceId, ShellSurfaceDefinition>(
  SHELL_SURFACES.map((surface) => [surface.id, surface]),
);

const PRIMARY_SURFACES = PRIMARY_SHELL_SURFACE_IDS.map((id) => {
  const surface = SURFACES_BY_ID.get(id);
  if (!surface) {
    throw new Error(`Missing shell surface definition: ${id}`);
  }
  return surface;
});

const railStyle: CSSProperties = {
  background: 'var(--jh-color-nav-bg)',
  color: 'var(--jh-color-nav-text)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--jh-space-6)',
  height: '100%',
  minHeight: '100vh',
  padding: '1.6rem 1rem 1rem',
};

const collapsedRailStyle: CSSProperties = {
  ...railStyle,
  alignItems: 'center',
  padding: '1rem 0.55rem',
  width: 'var(--jh-zone-rail-collapsed-width)',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: '2px',
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const fullItemBase: CSSProperties = {
  alignItems: 'center',
  borderLeft: '2px solid transparent',
  color: 'var(--jh-color-nav-text)',
  display: 'grid',
  fontSize: 'var(--jh-text-body-sm-size)',
  fontWeight: 'var(--jh-font-weight-medium)',
  gap: '0.65rem',
  gridTemplateColumns: '1.2rem minmax(0, 1fr) auto',
  minHeight: '2.5rem',
  padding: '0.45rem 0.65rem',
  textDecoration: 'none',
};

const collapsedItemBase: CSSProperties = {
  alignItems: 'center',
  borderLeft: '2px solid transparent',
  color: 'var(--jh-color-nav-text)',
  display: 'flex',
  height: '2.5rem',
  justifyContent: 'center',
  textDecoration: 'none',
  width: '2.5rem',
};

const activeItemOverrides: CSSProperties = {
  background: 'var(--jh-color-nav-item-selected-bg)',
  borderLeft: '2px solid var(--jh-color-nav-item-selected-border)',
  color: 'var(--jh-color-accent)',
};

const attentionBadgeStyle: CSSProperties = {
  alignItems: 'center',
  background: 'var(--jh-color-status-warning-bg)',
  border: '1px solid var(--jh-color-status-warning-border)',
  borderRadius: 'var(--jh-radius-pill)',
  color: 'var(--jh-color-amber)',
  display: 'inline-flex',
  fontSize: '0.68rem',
  fontWeight: 'var(--jh-font-weight-bold)',
  justifyContent: 'center',
  minWidth: '1.35rem',
  padding: '0.05rem 0.35rem',
};

function attentionCount(
  summary: OperatorShellSummaryPayload | null,
  surfaceId: ShellSurfaceId,
): number {
  if (!summary) return 0;

  if (surfaceId === 'approvals') {
    return summary.activity.pendingApprovalCount;
  }

  if (surfaceId === 'home') {
    return (
      summary.activity.pendingApprovalCount +
      summary.activity.recentFailureCount
    );
  }

  return 0;
}

function auxiliarySurfaces(
  summary: OperatorShellSummaryPayload | null,
): readonly ShellSurfaceDefinition[] {
  const ids: ShellSurfaceId[] = ['approvals'];

  if (summary && summary.health.missing.onboarding > 0) {
    ids.unshift('onboarding', 'startup');
  }

  return ids.flatMap((id) => {
    const surface = SURFACES_BY_ID.get(id);
    return surface ? [surface] : [];
  });
}

function FullNavItem({
  onDrawerClose,
  summary,
  surface,
}: {
  onDrawerClose?: (() => void) | undefined;
  summary: OperatorShellSummaryPayload | null;
  surface: ShellSurfaceDefinition;
}) {
  const count = attentionCount(summary, surface.id);

  return (
    <li>
      <NavLink
        end={surface.path === '/'}
        onClick={onDrawerClose}
        style={({ isActive }) => ({
          ...fullItemBase,
          ...(isActive ? activeItemOverrides : undefined),
        })}
        to={surface.path}
      >
        <SurfaceIcon surface={surface.id} />
        <span>{surface.label}</span>
        {count > 0 ? (
          <span
            aria-label={`${count} need attention`}
            style={attentionBadgeStyle}
          >
            {count}
          </span>
        ) : null}
      </NavLink>
    </li>
  );
}

export function NavigationRail({
  onDrawerClose,
  summary,
  variant = 'full',
}: NavigationRailProps) {
  if (variant === 'hidden') return null;

  const auxiliary = auxiliarySurfaces(summary);
  const allVisible = [...PRIMARY_SURFACES, ...auxiliary];

  if (variant === 'collapsed') {
    return (
      <nav aria-label="Job-Hunt navigation" style={collapsedRailStyle}>
        <strong
          aria-label="Job-Hunt"
          style={{
            color: 'var(--jh-color-accent)',
            fontFamily: 'var(--jh-font-heading)',
            fontSize: '1.4rem',
            fontWeight: 'var(--jh-font-weight-regular)',
          }}
        >
          jh
        </strong>
        <ul style={listStyle}>
          {allVisible.map((surface) => (
            <li key={surface.id}>
              <NavLink
                aria-label={surface.label}
                end={surface.path === '/'}
                onClick={onDrawerClose}
                style={({ isActive }) => ({
                  ...collapsedItemBase,
                  ...(isActive ? activeItemOverrides : undefined),
                })}
                title={surface.label}
                to={surface.path}
              >
                <SurfaceIcon surface={surface.id} />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Job-Hunt navigation" style={railStyle}>
      <header>
        <p
          style={{
            color: 'var(--jh-color-accent)',
            fontFamily: 'var(--jh-font-heading)',
            fontSize: '1.72rem',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          jobhunt
        </p>
        <p
          style={{
            color: 'var(--jh-color-nav-muted)',
            fontSize: 'var(--jh-text-caption-size)',
            marginTop: '0.45rem',
          }}
        >
          Local operator workspace
        </p>
      </header>

      <ul style={listStyle}>
        {PRIMARY_SURFACES.map((surface) => (
          <FullNavItem
            key={surface.id}
            onDrawerClose={onDrawerClose}
            summary={summary}
            surface={surface}
          />
        ))}
      </ul>

      {auxiliary.length > 0 ? (
        <div
          style={{
            borderTop: 'var(--jh-border-subtle)',
            marginTop: 'auto',
            paddingTop: 'var(--jh-space-3)',
          }}
        >
          <p
            style={{
              color: 'var(--jh-color-nav-muted)',
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              margin: '0 0 var(--jh-space-2) 0.65rem',
              textTransform: 'uppercase',
            }}
          >
            Attention
          </p>
          <ul style={listStyle}>
            {auxiliary.map((surface) => (
              <FullNavItem
                key={surface.id}
                onDrawerClose={onDrawerClose}
                summary={summary}
                surface={surface}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <p
        style={{
          color: 'var(--jh-color-nav-muted)',
          fontSize: '0.68rem',
          marginTop: auxiliary.length > 0 ? 0 : 'auto',
          padding: '0 0.65rem',
        }}
      >
        ⌘/Ctrl K · No send · No submit
      </p>
    </nav>
  );
}
