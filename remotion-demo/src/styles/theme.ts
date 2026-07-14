export const theme = {
  colors: {
    // Custom brand colors (from @theme inline in globals.css)
    canvas: '#F9FAFB',
    surface: '#FFFFFF',
    charcoal: '#18181B',
    charcoalHover: '#27272A',
    mutedSteel: '#71717A',
    sectionAlt: '#F3F4F6',
    borderFaint: 'rgba(226, 232, 240, 0.6)',

    // shadcn/ui semantic colors (from :root in globals.css, oklch format)
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.145 0 0)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.145 0 0)',
    popover: 'oklch(1 0 0)',
    popoverForeground: 'oklch(0.145 0 0)',
    primary: 'oklch(0.205 0 0)',
    primaryForeground: 'oklch(0.985 0 0)',
    secondary: 'oklch(0.965 0 0)',
    secondaryForeground: 'oklch(0.205 0 0)',
    muted: 'oklch(0.965 0 0)',
    mutedForeground: 'oklch(0.556 0 0)',
    accent: 'oklch(0.965 0 0)',
    accentForeground: 'oklch(0.205 0 0)',
    destructive: 'oklch(0.577 0.245 27.325)',
    destructiveForeground: 'oklch(0.577 0.245 27.325)',
    border: 'oklch(0.922 0 0)',
    input: 'oklch(0.922 0 0)',
    ring: 'oklch(0.87 0 0)',

    // Zinc scale (used throughout actual codebase via Tailwind)
    zinc50: '#FAFAFA',
    zinc100: '#F4F4F5',
    zinc200: '#E4E4E7',
    zinc300: '#D4D4D8',
    zinc400: '#A1A1AA',
    zinc500: '#71717A',
    zinc600: '#52525B',
    zinc700: '#3F3F46',
    zinc800: '#27272A',
    zinc900: '#18181B',
    zinc950: '#09090B',

    // Status colors
    red50: '#FEF2F2',
    red100: '#FEE2E2',
    red500: '#EF4444',
    red600: '#DC2626',
    red700: '#B91C1C',
    green50: '#F0FDF4',
    green100: '#DCFCE7',
    green500: '#22C55E',
    green600: '#16A34A',
    green700: '#15803D',
    green800: '#166534',
    blue50: '#EFF6FF',
    blue500: '#3B82F6',
    blue600: '#2563EB',
    amber50: '#FFFBEB',
    amber100: '#FEF3C7',
    amber700: '#B45309',
  },
  fonts: {
    // Match actual CSS variables from globals.css (next/font/google Geist)
    sans: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    mono: 'var(--font-geist-mono), monospace',
  },
  spacing: {
    navbarHeight: 64,
    sidebarWidth: 224,
    editorSidebarWidth: 320,
    editorRightPanelWidth: 380,
  },
  radius: {
    // Match --radius: 0.625rem (10px) from globals.css
    DEFAULT: '0.625rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  // Animation curves from actual globals.css
  animation: {
    // Spring curve used ONLY on "Start free" buttons
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    // Slide-up for bottom sheets: 0.25s ease-out
    slideUp: 'ease-out',
    slideUpDuration: 250,
    // Default transitions
    fast: 200,
    normal: 300,
  },
  // Touch targets from actual globals.css
  touchTarget: {
    default: 48,
    sm: 44,
  },
} as const;

export type Theme = typeof theme;