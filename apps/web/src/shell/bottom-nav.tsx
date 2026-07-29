import type { CSSProperties, MouseEvent } from 'react';
import { useRef } from 'react';
import { NavLink } from 'react-router';
import type { ShellSurfaceId } from './shell-types';
import { SurfaceIcon } from './surface-icon';

type BottomNavItem = {
  label: string;
  path: string;
  surface: ShellSurfaceId;
};

type BottomNavProps = {
  onMenuTap: () => void;
};

const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
  { label: 'Today', path: '/', surface: 'home' },
  { label: 'Evaluate', path: '/evaluate', surface: 'chat' },
  { label: 'Tracker', path: '/tracker', surface: 'tracker' },
  { label: 'Approvals', path: '/approvals', surface: 'approvals' },
] as const;

const barStyle: CSSProperties = {
  alignItems: 'center',
  background: 'var(--jh-color-nav-bg)',
  borderTop: 'var(--jh-border-width) solid var(--jh-color-nav-border)',
  bottom: 0,
  display: 'grid',
  gridTemplateColumns: `repeat(${BOTTOM_NAV_ITEMS.length + 1}, 1fr)`,
  height: 'var(--jh-zone-bottom-nav-height)',
  left: 0,
  position: 'fixed',
  right: 0,
  zIndex: 800,
};

const itemStyle: CSSProperties = {
  alignItems: 'center',
  background: 'none',
  border: 'none',
  borderTop: '2px solid transparent',
  color: 'var(--jh-color-nav-muted)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'var(--jh-font-body)',
  fontSize: 'var(--jh-text-caption-size)',
  gap: 'var(--jh-space-1)',
  height: '100%',
  justifyContent: 'center',
  letterSpacing: 'var(--jh-text-label-sm-letter-spacing)',
  minWidth: '44px',
  padding: 'var(--jh-space-1) 0',
  textDecoration: 'none',
};

const iconStyle: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  height: '28px',
  justifyContent: 'center',
  width: '28px',
};

const menuButtonStyle: CSSProperties = {
  ...itemStyle,
};

const DEBOUNCE_MS = 300;

export function BottomNav({ onMenuTap }: BottomNavProps) {
  const lastTapRef = useRef(0);

  const handleMenuTap = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastTapRef.current < DEBOUNCE_MS) return;
    lastTapRef.current = now;
    onMenuTap();
  };

  return (
    <nav aria-label="Mobile navigation" style={barStyle}>
      {BOTTOM_NAV_ITEMS.map((item) => (
        <NavLink
          end={item.path === '/'}
          key={item.path}
          style={({ isActive }) => ({
            ...itemStyle,
            color: isActive
              ? 'var(--jh-color-nav-accent)'
              : 'var(--jh-color-nav-muted)',
            borderTopColor: isActive
              ? 'var(--jh-color-nav-accent)'
              : 'transparent',
          })}
          to={item.path}
        >
          {({ isActive }) => (
            <>
              <span
                style={{
                  ...iconStyle,
                }}
              >
                <SurfaceIcon surface={item.surface} />
              </span>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        aria-label="Open navigation menu"
        onClick={handleMenuTap}
        style={menuButtonStyle}
        type="button"
      >
        <span style={iconStyle}>
          <SurfaceIcon surface="menu" />
        </span>
        <span>More</span>
      </button>
    </nav>
  );
}
