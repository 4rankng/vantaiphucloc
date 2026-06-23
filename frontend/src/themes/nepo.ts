import type { ThemeDefinition } from './types';

/**
 * NEPO theme — palette + scale ported from
 * `nepocorp/wireframe/nepo-accountant-wireframe.html`.
 * Green accent (#00B14F), neutral ink/line scale, dark-green sidebar.
 */
export const nepoTheme: ThemeDefinition = {
  name: 'nepo',
  label: 'NEPO',
  colors: {
    bgPrimary: '#EDEFF3',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#E5E8EC',
    bgGlass: 'rgba(255, 255, 255, 0.70)',

    brandPrimary: '#00B14F',
    brandPrimaryLight: '#E6F7EE',
    brandPrimaryDark: '#008B3E',
    brandSecondary: '#00B14F',
    brandGradient: 'linear-gradient(135deg, #00B14F 0%, #008B3E 100%)',
    brandGradientFrom: '#00B14F',
    brandGradientTo: '#008B3E',

    textPrimary: '#0A0A0A',
    textSecondary: '#535963',
    textMuted: '#8B919B',
    textInverse: '#FFFFFF',
    textOnBrand: '#FFFFFF',

    borderDefault: '#D1D6DE',
    borderLight: '#D1D6DE',
    borderGlass: 'rgba(0, 0, 0, 0.06)',

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

    sidebar: '#005A2D',
    sidebarBorder: 'rgba(255, 255, 255, 0.12)',
    sidebarText: 'rgba(255, 255, 255, 0.85)',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.55)',
    sidebarActive: 'rgba(255, 255, 255, 0.15)',
    sidebarActiveText: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.10)',

    bottomNav: 'rgba(255, 255, 255, 0.92)',
    bottomNavBorder: 'rgba(0, 0, 0, 0.06)',
    bottomNavActive: '#00B14F',
    bottomNavInactive: '#535963',

    header: 'rgba(255, 255, 255, 0.70)',
    headerBorder: '#EAECEF',

    shadowCard: '0 2px 8px rgba(10, 10, 10, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02)',
    shadowElevated: '0 12px 28px rgba(10, 10, 10, 0.08), 0 2px 4px rgba(10, 10, 10, 0.04)',
    shadowSm: '0 2px 4px rgba(10, 10, 10, 0.04)',

    glassBg: 'rgba(255, 255, 255, 0.70)',
    glassBorder: '#EAECEF',
    glassBlur: 'blur(14px) saturate(140%)',

    skeletonBase: 'rgba(10, 10, 10, 0.04)',
    skeletonShine: 'rgba(10, 10, 10, 0.08)',

    badgeFrom: '#00B14F',
    badgeTo: '#008B3E',

    aiAccent: '#6366f1',
    aiAccentLight: '#a78bfa',
    aiAccentDark: '#4c1d95',
    aiGradient: 'linear-gradient(135deg, #4c1d95 0%, #6366f1 100%)',
    aiGradientFrom: '#4c1d95',
    aiGradientTo: '#6366f1',

    expressColor: '#6366f1',
    expressColorLight: '#e0e7ff',
  },
  typography: {
    fontFamilyDisplay: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    fontFamilyBody: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  borderRadius: {
    sm: '8px',
    md: '8px',
    lg: '12px',
    xl: '18px',
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
