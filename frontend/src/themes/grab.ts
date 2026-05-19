import type { ThemeDefinition } from './types';

/**
 * NEPO theme — palette + scale ported from
 * `nepocorp/wireframe/nepo-accountant-wireframe.html`.
 * Green accent (#00B14F), neutral ink/line scale, dark-green sidebar.
 * (File name kept as `grab.ts` for backward compatibility with all import sites.)
 */
export const grabTheme: ThemeDefinition = {
  name: 'grab',
  label: 'NEPO',
  colors: {
    // ─── Backgrounds ─────────────────────────────────────
    bgPrimary: '#F7F8FA',        // page background
    bgSecondary: '#FFFFFF',      // cards, sheets, dialogs
    bgTertiary: '#EFF1F5',       // muted surfaces (hover row, chip bg, surface-3)
    bgGlass: 'rgba(255, 255, 255, 0.70)',

    // ─── Brand (NEPO green) ───────────────────────────────
    brandPrimary: '#00B14F',     // accent
    brandPrimaryLight: '#E6F7EE', // accent-soft
    brandPrimaryDark: '#008B3E', // accent-2 (hover)
    brandSecondary: '#00B14F',
    brandGradient: 'linear-gradient(135deg, #00B14F 0%, #008B3E 100%)',
    brandGradientFrom: '#00B14F',
    brandGradientTo: '#008B3E',

    // ─── Text (ink scale) ────────────────────────────────
    textPrimary: '#0A0A0A',      // ink
    textSecondary: '#535963',    // ink-2
    textMuted: '#8B919B',        // ink-3
    textInverse: '#FFFFFF',
    textOnBrand: '#FFFFFF',

    // ─── Borders (hairline) ──────────────────────────────
    borderDefault: '#EAECEF',    // line
    borderLight: '#EAECEF',
    borderGlass: 'rgba(0, 0, 0, 0.06)',

    // ─── Status (semantic) ───────────────────────────────
    statusSuccess: '#00B14F',
    statusSuccessLight: '#E6F7EE',
    statusSuccessText: '#004D22',
    statusWarning: '#F5A623',
    statusWarningLight: '#FFF4E0',
    statusWarningText: '#92400E',
    statusError: '#E32434',
    statusErrorLight: '#FFEAEC',
    statusErrorText: '#991B1B',
    statusInfo: '#1E5BB8',
    statusInfoLight: '#DCE9FC',
    statusInfoText: '#1E40AF',

    // ─── Sidebar — dark green per wireframe ──────────────
    sidebar: '#005A2D',
    sidebarBorder: 'rgba(255, 255, 255, 0.12)',
    sidebarText: 'rgba(255, 255, 255, 0.85)',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.55)',
    sidebarActive: 'rgba(255, 255, 255, 0.15)',
    sidebarActiveText: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.10)',

    // ─── Bottom nav (mobile) ─────────────────────────────
    bottomNav: 'rgba(255, 255, 255, 0.92)',
    bottomNavBorder: 'rgba(0, 0, 0, 0.06)',
    bottomNavActive: '#00B14F',
    bottomNavInactive: '#535963',

    // ─── Header (translucent + hairline) ────────────────
    header: 'rgba(255, 255, 255, 0.70)',
    headerBorder: '#EAECEF',

    // ─── Shadows (per wireframe --sh-* scale) ───────────
    shadowCard: '0 1px 2px rgba(10, 10, 10, 0.04)',
    shadowElevated: '0 4px 14px rgba(10, 10, 10, 0.06), 0 1px 2px rgba(10, 10, 10, 0.03)',
    shadowSm: '0 1px 2px rgba(10, 10, 10, 0.04)',

    // ─── Glass ──────────────────────────────────────────
    glassBg: 'rgba(255, 255, 255, 0.70)',
    glassBorder: '#EAECEF',
    glassBlur: 'blur(14px) saturate(140%)',

    // ─── Skeleton shimmer ───────────────────────────────
    skeletonBase: 'rgba(10, 10, 10, 0.04)',
    skeletonShine: 'rgba(10, 10, 10, 0.08)',

    // ─── Badge (kept for legacy, mapped to brand) ───────
    badgeFrom: '#00B14F',
    badgeTo: '#008B3E',
  },
  typography: {
    fontFamilyDisplay: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    fontFamilyBody: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  borderRadius: {
    sm: '8px',     // --r-sm — buttons, chips
    md: '8px',     // inputs, buttons
    lg: '12px',    // --r — standard cards
    xl: '18px',    // --r-lg — large panels
    full: '9999px',
  },
  spacing: {
    pagePadding: '16px',
    cardPadding: '16px',
    sectionGap: '16px',
    topBarHeight: '4rem',
    bottomNavHeight: '3.5rem',
  },
  tokens: {
    space: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '48px',
    },
    sizing: {
      iconSm: '14px',
      iconMd: '18px',
      iconLg: '22px',
      avatarSm: '28px',
      avatarMd: '36px',
      avatarLg: '44px',
    },
    opacity: {
      disabled: '0.45',
      hover: '0.85',
      focus: '1.0',
      background: '0.92',
    },
    zIndex: {
      base: '0',
      dropdown: '50',
      sticky: '100',
      overlay: '200',
      modal: '300',
      popover: '400',
      toast: '500',
      tooltip: '600',
    },
    transition: {
      fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
      normal: '180ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '240ms cubic-bezier(0.4, 0, 0.2, 1)',
      spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
};
