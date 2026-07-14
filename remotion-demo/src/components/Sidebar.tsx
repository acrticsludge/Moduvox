import React from 'react';
import { theme } from '../styles/theme';
import { Button } from './Button';

interface SidebarProps {
  activeItem?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

const navItems = [
  { label: 'All Projects', icon: 'LayoutGrid', href: '/dashboard' },
  { label: 'My Voices', icon: 'Mic', href: '/dashboard/voices' },
  { label: 'Archived', icon: 'Archive', href: '/dashboard/archived' },
  { label: 'Settings', icon: 'Settings', href: '/dashboard/settings' },
];

// Lucide icon components (inline to avoid extra deps)
const IconLayoutGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconMic = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const IconArchive = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 21.47a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.65 9 1.65 1.65 0 0 0 3 10.51V15a2 2 0 0 1-2 2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 3 17.47a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0 1.51-1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const Icons = {
  LayoutGrid: IconLayoutGrid,
  Mic: IconMic,
  Archive: IconArchive,
  Settings: IconSettings,
} as const;

type NavItem = typeof navItems[number];
type IconKey = NavItem['icon'];

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem = 'All Projects',
  isMobile = false,
  onClose,
}) => {
  const isActive = (label: string) => label === activeItem;

  return (
    <aside
      style={{
        width: theme.spacing.sidebarWidth,
        background: theme.colors.surface,
        borderRight: `1px solid ${theme.colors.borderFaint}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        gap: 4,
        ...(isMobile
          ? {
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 50,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }
          : {}),
      }}
    >
      {navItems.map((item) => {
        const Icon = Icons[item.icon as IconKey];
        return (
          <a
            key={item.label}
            href={item.href}
            onClick={isMobile ? onClose : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: theme.radius.lg,
              background: isActive(item.label) ? theme.colors.zinc100 : 'transparent',
              color: isActive(item.label) ? theme.colors.charcoal : theme.colors.mutedSteel,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: theme.fonts.sans,
              transition: `background ${theme.animation.fast}ms, color ${theme.animation.fast}ms`,
              minHeight: theme.touchTarget.default,
              minWidth: theme.touchTarget.default,
            }}
          >
            <Icon />
            {item.label}
          </a>
        );
      })}
    </aside>
  );
};