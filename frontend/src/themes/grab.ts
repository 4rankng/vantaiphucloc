import type { ThemeDefinition } from './types';

/**
 * Modern SaaS theme — Linear / Vercel inspired.
 * Neutral zinc palette, single emerald accent, hairline borders, tight radii.
 * (File name kept as `grab.ts` for backward compatibility with all import sites.)
 */
export const grabTheme: ThemeDefinition = {
  name: 'grab',
  label: 'Modern',
  colors: {
    // ─── Backgrounds ─────────────────────────────────────
    bgPrimary: '#FAFAFA',        // page background — very subtle gray (zinc-50)
    bgSecondary: '#FFFFFF',      // cards, sheets, dialogs
    bgTertiary: '#F4F4F5',       // muted surfaces (input bg, hover row, chip bg)
    bgGlass: 'rgba(255, 255, 255, 0.85)',

    // ─── Brand (single emerald accent) ───────────────────
    brandPrimary: '#059669',     // emerald-600
    brandPrimaryLight: '#ECFDF5', // emerald-50
    brandPrimaryDark: '#047857', // emerald-700
    brandSecondary: '#10B981',   // emerald-500 (subtle variation)
    brandGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    brandGradientFrom: '#059669',
    brandGradientTo: '#047857',

    // ─── Text (zinc neutral scale) ───────────────────────
    textPrimary: '#09090B',      // zinc-950 — nearly black, max contrast
    textSecondary: '#52525B',    // zinc-600 — body / secondary
    textMuted: '#A1A1AA',        // zinc-400 — labels, hints
    textInverse: '#FFFFFF',
    textOnBrand: '#FFFFFF',

    // ─── Borders (hairline) ──────────────────────────────
    borderDefault: '#E4E4E7',    // zinc-200 — default 1px hairline
    borderLight: '#F4F4F5',      // zinc-100 — softer divider
    borderGlass: 'rgba(0, 0, 0, 0.06)',

    // ─── Status (semantic, muted) ────────────────────────
    statusSuccess: '#059669',
    statusSuccessLight: '#ECFDF5',
    statusSuccessText: '#065F46',
    statusWarning: '#D97706',    // amber-600
    statusWarningLight: '#FFFBEB',
    statusWarningText: '#92400E',
    statusError: '#DC2626',      // red-600
    statusErrorLight: '#FEF2F2',
    statusErrorText: '#991B1B',
    statusInfo: '#2563EB',       // blue-600
    statusInfoLight: '#EFF6FF',
    statusInfoText: '#1E40AF',

    // ─── Sidebar (desktop) — dark slate Linear style ─────
    sidebar: '#18181B',                              // zinc-900
    sidebarBorder: 'rgba(255, 255, 255, 0.06)',
    sidebarText: '#D4D4D8',                          // zinc-300
    sidebarTextMuted: 'rgba(212, 212, 216, 0.55)',
    sidebarActive: 'rgba(255, 255, 255, 0.08)',
    sidebarActiveText: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.04)',

    // ─── Bottom nav (mobile) ─────────────────────────────
    bottomNav: 'rgba(255, 255, 255, 0.92)',
    bottomNavBorder: 'rgba(0, 0, 0, 0.06)',
    bottomNavActive: '#059669',
    bottomNavInactive: '#71717A',                    // zinc-500

    // ─── Header (translucent + hairline) ────────────────
    header: 'rgba(255, 255, 255, 0.85)',
    headerBorder: 'rgba(0, 0, 0, 0.06)',

    // ─── Shadows (soft, sparingly used) ─────────────────
    shadowCard: '0 1px 2px 0 rgba(9, 9, 11, 0.04)',
    shadowElevated: '0 4px 16px -4px rgba(9, 9, 11, 0.08), 0 0 0 1px rgba(9, 9, 11, 0.03)',
    shadowSm: '0 1px 1px 0 rgba(9, 9, 11, 0.03)',

    // ─── Glass ──────────────────────────────────────────
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(0, 0, 0, 0.06)',
    glassBlur: 'blur(12px) saturate(1.4)',

    // ─── Skeleton shimmer ───────────────────────────────
    skeletonBase: 'rgba(9, 9, 11, 0.04)',
    skeletonShine: 'rgba(9, 9, 11, 0.08)',

    // ─── Badge (kept for legacy, mapped to brand) ───────
    badgeFrom: '#059669',
    badgeTo: '#047857',
  },
  typography: {
    fontFamilyDisplay: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    fontFamilyBody: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  borderRadius: {
    sm: '6px',     // chips, small badges
    md: '8px',     // inputs, buttons
    lg: '10px',    // cards
    xl: '14px',    // dialogs, sheets
    full: '9999px',
  },
  spacing: {
    pagePadding: '16px',
    cardPadding: '16px',
    sectionGap: '16px',
    topBarHeight: '3rem',
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
