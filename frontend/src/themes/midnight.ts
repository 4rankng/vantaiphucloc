import type { ThemeDefinition } from './types';

export const midnightTheme: ThemeDefinition = {
  name: 'midnight',
  label: 'Đêm Khuya',
  colors: {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgGlass: 'rgba(30, 41, 59, 0.88)',

    brandPrimary: '#60a5fa',
    brandPrimaryLight: 'rgba(96, 165, 250, 0.15)',
    brandPrimaryDark: '#3b82f6',
    brandSecondary: '#fbbf24',
    brandGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    brandGradientFrom: '#1e293b',
    brandGradientTo: '#0f172a',

    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    textInverse: '#0f172a',
    textOnBrand: '#0f172a',

    borderDefault: '#334155',
    borderLight: '#1e293b',
    borderGlass: 'rgba(30, 41, 59, 0.9)',

    statusSuccess: '#34d399',
    statusSuccessLight: 'rgba(52, 211, 153, 0.15)',
    statusSuccessText: '#34d399',
    statusWarning: '#fbbf24',
    statusWarningLight: 'rgba(251, 191, 36, 0.15)',
    statusWarningText: '#fbbf24',
    statusError: '#f87171',
    statusErrorLight: 'rgba(248, 113, 113, 0.15)',
    statusErrorText: '#f87171',
    statusInfo: '#60a5fa',
    statusInfoLight: 'rgba(96, 165, 250, 0.15)',
    statusInfoText: '#60a5fa',

    sidebar: '#0f172a',
    sidebarBorder: 'rgba(255, 255, 255, 0.06)',
    sidebarText: 'rgba(255, 255, 255, 0.55)',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.25)',
    sidebarActive: 'rgba(96, 165, 250, 0.15)',
    sidebarActiveText: '#60a5fa',
    sidebarHover: 'rgba(255, 255, 255, 0.04)',

    bottomNav: 'rgba(15, 23, 42, 0.95)',
    bottomNavBorder: 'rgba(51, 65, 85, 0.50)',
    bottomNavActive: '#60a5fa',
    bottomNavInactive: '#64748b',

    header: 'rgba(15, 23, 42, 0.90)',
    headerBorder: 'rgba(51, 65, 85, 0.50)',

    shadowCard: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
    shadowElevated: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
    shadowSm: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',

    glassBg: 'rgba(30, 41, 59, 0.88)',
    glassBorder: 'rgba(51, 65, 85, 0.9)',
    glassBlur: 'blur(20px) saturate(1.5)',

    skeletonBase: 'rgba(255, 255, 255, 0.05)',
    skeletonShine: 'rgba(255, 255, 255, 0.10)',

    badgeFrom: '#fbbf24',
    badgeTo: '#f59e0b',
  },
  typography: {
    fontFamilyDisplay: '"Be Vietnam Pro", "Inter", ui-sans-serif, system-ui, sans-serif',
    fontFamilyBody: '"Be Vietnam Pro", "Inter", ui-sans-serif, system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  spacing: {
    pagePadding: '16px',
    cardPadding: '20px',
    sectionGap: '20px',
    topBarHeight: '3.5rem',
    bottomNavHeight: '3.5rem',
  },
};
