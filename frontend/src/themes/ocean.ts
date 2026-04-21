import type { ThemeDefinition } from './types';

export const oceanTheme: ThemeDefinition = {
  name: 'ocean',
  label: 'Biển Xanh',
  colors: {
    bgPrimary: '#f0f9ff',
    bgSecondary: '#ffffff',
    bgTertiary: '#e0f2fe',
    bgGlass: 'rgba(255, 255, 255, 0.88)',

    brandPrimary: '#0369a1',
    brandPrimaryLight: '#e0f2fe',
    brandPrimaryDark: '#075985',
    brandSecondary: '#06b6d4',
    brandGradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
    brandGradientFrom: '#0369a1',
    brandGradientTo: '#0284c7',

    textPrimary: '#0c4a6e',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',
    textOnBrand: '#ffffff',

    borderDefault: '#bae6fd',
    borderLight: '#e0f2fe',
    borderGlass: 'rgba(255, 255, 255, 0.95)',

    statusSuccess: '#10b981',
    statusSuccessLight: '#d1fae5',
    statusSuccessText: '#065f46',
    statusWarning: '#f59e0b',
    statusWarningLight: '#fef3c7',
    statusWarningText: '#92400e',
    statusError: '#ef4444',
    statusErrorLight: '#fee2e2',
    statusErrorText: '#991b1b',
    statusInfo: '#0ea5e9',
    statusInfoLight: '#e0f2fe',
    statusInfoText: '#0369a1',

    sidebar: '#0369a1',
    sidebarBorder: 'rgba(255, 255, 255, 0.12)',
    sidebarText: 'rgba(255, 255, 255, 0.60)',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.30)',
    sidebarActive: 'rgba(255, 255, 255, 0.15)',
    sidebarActiveText: '#ffffff',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',

    bottomNav: 'rgba(255, 255, 255, 0.94)',
    bottomNavBorder: 'rgba(186, 230, 253, 0.50)',
    bottomNavActive: '#0369a1',
    bottomNavInactive: '#94a3b8',

    header: 'rgba(255, 255, 255, 0.85)',
    headerBorder: 'rgba(186, 230, 253, 0.50)',

    shadowCard: '0 4px 6px -1px rgba(3, 105, 161, 0.08), 0 2px 4px -2px rgba(3, 105, 161, 0.06)',
    shadowElevated: '0 10px 15px -3px rgba(3, 105, 161, 0.10), 0 4px 6px -4px rgba(3, 105, 161, 0.08)',
    shadowSm: '0 1px 2px 0 rgba(3, 105, 161, 0.05)',

    glassBg: 'rgba(255, 255, 255, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.95)',
    glassBlur: 'blur(20px) saturate(1.5)',

    skeletonBase: 'rgba(3, 105, 161, 0.04)',
    skeletonShine: 'rgba(3, 105, 161, 0.08)',

    badgeFrom: '#06b6d4',
    badgeTo: '#0891b2',
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
