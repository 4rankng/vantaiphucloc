import type { ThemeDefinition } from './types';

export const grabTheme: ThemeDefinition = {
  name: 'grab',
  label: 'Grab Green',
  colors: {
    bgPrimary: '#F7F7F7',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#EEEEEE',
    bgGlass: 'rgba(255, 255, 255, 0.92)',

    brandPrimary: '#00963E',
    brandPrimaryLight: '#E6F9EF',
    brandPrimaryDark: '#008A3D',
    brandSecondary: '#00963E',
    brandGradient: 'linear-gradient(135deg, #00963E 0%, #008A3D 100%)',
    brandGradientFrom: '#00963E',
    brandGradientTo: '#008A3D',

    textPrimary: '#1C1C1C',
    textSecondary: '#6B6B6B',
    textMuted: '#9E9E9E',
    textInverse: '#FFFFFF',
    textOnBrand: '#FFFFFF',

    borderDefault: '#EBEBEB',
    borderLight: '#F3F3F3',
    borderGlass: 'rgba(255, 255, 255, 0.95)',

    statusSuccess: '#00963E',
    statusSuccessLight: '#E6F9EF',
    statusSuccessText: '#00662D',
    statusWarning: '#FF9500',
    statusWarningLight: '#FFF4E6',
    statusWarningText: '#8A5200',
    statusError: '#FF5252',
    statusErrorLight: '#FFECEC',
    statusErrorText: '#B71C1C',
    statusInfo: '#2196F3',
    statusInfoLight: '#E3F2FD',
    statusInfoText: '#0D47A1',

    sidebar: '#1C1C1C',
    sidebarBorder: 'rgba(255, 255, 255, 0.06)',
    sidebarText: 'rgba(255, 255, 255, 0.55)',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.25)',
    sidebarActive: 'rgba(0, 177, 79, 0.15)',
    sidebarActiveText: '#00963E',
    sidebarHover: 'rgba(255, 255, 255, 0.04)',

    bottomNav: 'rgba(255, 255, 255, 0.96)',
    bottomNavBorder: 'rgba(0, 0, 0, 0.06)',
    bottomNavActive: '#00963E',
    bottomNavInactive: '#9E9E9E',

    header: 'rgba(255, 255, 255, 0.96)',
    headerBorder: 'rgba(0, 0, 0, 0.06)',

    shadowCard: '0 2px 8px rgba(0, 0, 0, 0.04)',
    shadowElevated: '0 4px 12px rgba(0, 0, 0, 0.08)',
    shadowSm: '0 1px 3px rgba(0, 0, 0, 0.03)',

    glassBg: 'rgba(255, 255, 255, 0.92)',
    glassBorder: 'rgba(255, 255, 255, 0.95)',
    glassBlur: 'blur(16px) saturate(1.3)',

    skeletonBase: 'rgba(0, 0, 0, 0.04)',
    skeletonShine: 'rgba(0, 0, 0, 0.08)',

    badgeFrom: '#00963E',
    badgeTo: '#008A3D',
  },
  typography: {
    fontFamilyDisplay: '"Be Vietnam Pro", "Inter", ui-sans-serif, system-ui, sans-serif',
    fontFamilyBody: '"Be Vietnam Pro", "Inter", ui-sans-serif, system-ui, sans-serif',
    fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  borderRadius: {
    sm: '12px',
    md: '16px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  spacing: {
    pagePadding: '16px',
    cardPadding: '16px',
    sectionGap: '12px',
    topBarHeight: '3rem',
    bottomNavHeight: '3.5rem',
  },
};
