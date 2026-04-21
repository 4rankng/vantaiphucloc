import type { ThemeDefinition } from './types';

export const navyGoldTheme: ThemeDefinition = {
  name: 'navy-gold',
  label: 'Xanh Navy & Vàng',
  colors: {
    bgPrimary: '#f8f9fa',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f3f5',
    bgGlass: 'rgba(255, 255, 255, 0.85)',

    brandPrimary: '#0a1f33',
    brandPrimaryLight: '#e0edf8',
    brandPrimaryDark: '#040d1a',
    brandSecondary: '#d4a839',
    brandGradient: 'linear-gradient(135deg, #0a1f33 0%, #0d2b45 100%)',
    brandGradientFrom: '#0a1f33',
    brandGradientTo: '#0d2b45',

    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#9ca3af',
    textInverse: '#ffffff',
    textOnBrand: '#ffffff',

    borderDefault: '#e5e7eb',
    borderLight: '#f3f4f6',
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
    statusInfo: '#3b82f6',
    statusInfoLight: '#dbeafe',
    statusInfoText: '#1e40af',

    sidebar: '#040d1a',
    sidebarBorder: 'rgba(255, 255, 255, 0.06)',
    sidebarText: 'rgba(255, 255, 255, 0.55)',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.25)',
    sidebarActive: 'rgba(255, 255, 255, 0.08)',
    sidebarActiveText: '#ffffff',
    sidebarHover: 'rgba(255, 255, 255, 0.04)',

    bottomNav: 'rgba(255, 255, 255, 0.92)',
    bottomNavBorder: 'rgba(0, 0, 0, 0.06)',
    bottomNavActive: '#0a1f33',
    bottomNavInactive: '#9ca3af',

    header: 'rgba(255, 255, 255, 0.85)',
    headerBorder: 'rgba(0, 0, 0, 0.06)',

    shadowCard: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
    shadowElevated: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
    shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',

    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.95)',
    glassBlur: 'blur(20px) saturate(1.5)',

    skeletonBase: 'rgba(0, 0, 0, 0.04)',
    skeletonShine: 'rgba(0, 0, 0, 0.08)',

    badgeFrom: '#d4a839',
    badgeTo: '#b8922e',
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
  },
};
