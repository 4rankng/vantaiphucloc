export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgGlass: string;

  // Brand
  brandPrimary: string;
  brandPrimaryLight: string;
  brandPrimaryDark: string;
  brandSecondary: string;
  brandGradient: string;
  brandGradientFrom: string;
  brandGradientTo: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textOnBrand: string;

  // Borders
  borderDefault: string;
  borderLight: string;
  borderGlass: string;

  // Status
  statusSuccess: string;
  statusSuccessLight: string;
  statusSuccessText: string;
  statusWarning: string;
  statusWarningLight: string;
  statusWarningText: string;
  statusError: string;
  statusErrorLight: string;
  statusErrorText: string;
  statusInfo: string;
  statusInfoLight: string;
  statusInfoText: string;

  // Sidebar (desktop)
  sidebar: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarTextMuted: string;
  sidebarActive: string;
  sidebarActiveText: string;
  sidebarHover: string;

  // Bottom nav (mobile)
  bottomNav: string;
  bottomNavBorder: string;
  bottomNavActive: string;
  bottomNavInactive: string;

  // Header
  header: string;
  headerBorder: string;

  // Shadows
  shadowCard: string;
  shadowElevated: string;
  shadowSm: string;

  // Glass
  glassBg: string;
  glassBorder: string;
  glassBlur: string;

  // Skeleton
  skeletonBase: string;
  skeletonShine: string;

  // Badge
  badgeFrom: string;
  badgeTo: string;
}

export interface ThemeTypography {
  fontFamilyDisplay: string;
  fontFamilyBody: string;
  fontFamilyMono: string;
}

export interface ThemeBorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeSpacing {
  pagePadding: string;
  cardPadding: string;
  sectionGap: string;
}

export interface ThemeDefinition {
  name: string;
  label: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  borderRadius: ThemeBorderRadius;
  spacing: ThemeSpacing;
}
