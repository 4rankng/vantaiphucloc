import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { ThemeDefinition } from './types';
import { grabTheme } from './grab';

export const themes: ThemeDefinition[] = [grabTheme];
const themeMap = new Map(themes.map(t => [t.name, t]));

const STORAGE_KEY = 'ttransport-theme';

interface ThemeContextValue {
  theme: ThemeDefinition;
  setThemeByName: (name: string) => void;
  allThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDOM(theme: ThemeDefinition) {
  const root = document.documentElement;
  const c = theme.colors;

  const map: Record<string, string> = {
    'bg-primary': c.bgPrimary,
    'bg-secondary': c.bgSecondary,
    'bg-tertiary': c.bgTertiary,
    'bg-glass': c.bgGlass,
    'brand-primary': c.brandPrimary,
    'brand-primary-light': c.brandPrimaryLight,
    'brand-primary-dark': c.brandPrimaryDark,
    'brand-secondary': c.brandSecondary,
    'brand-gradient': c.brandGradient,
    'brand-gradient-from': c.brandGradientFrom,
    'brand-gradient-to': c.brandGradientTo,
    'text-primary': c.textPrimary,
    'text-secondary': c.textSecondary,
    'text-muted': c.textMuted,
    'text-inverse': c.textInverse,
    'text-on-brand': c.textOnBrand,
    'border-default': c.borderDefault,
    'border-light': c.borderLight,
    'border-glass': c.borderGlass,
    'status-success': c.statusSuccess,
    'status-success-light': c.statusSuccessLight,
    'status-success-text': c.statusSuccessText,
    'status-warning': c.statusWarning,
    'status-warning-light': c.statusWarningLight,
    'status-warning-text': c.statusWarningText,
    'status-error': c.statusError,
    'status-error-light': c.statusErrorLight,
    'status-error-text': c.statusErrorText,
    'status-info': c.statusInfo,
    'status-info-light': c.statusInfoLight,
    'status-info-text': c.statusInfoText,
    'sidebar': c.sidebar,
    'sidebar-border': c.sidebarBorder,
    'sidebar-text': c.sidebarText,
    'sidebar-text-muted': c.sidebarTextMuted,
    'sidebar-active': c.sidebarActive,
    'sidebar-active-text': c.sidebarActiveText,
    'sidebar-hover': c.sidebarHover,
    'bottom-nav': c.bottomNav,
    'bottom-nav-border': c.bottomNavBorder,
    'bottom-nav-active': c.bottomNavActive,
    'bottom-nav-inactive': c.bottomNavInactive,
    'header': c.header,
    'header-border': c.headerBorder,
    'shadow-card': c.shadowCard,
    'shadow-elevated': c.shadowElevated,
    'shadow-sm': c.shadowSm,
    'glass-bg': c.glassBg,
    'glass-border': c.glassBorder,
    'glass-blur': c.glassBlur,
    'skeleton-base': c.skeletonBase,
    'skeleton-shine': c.skeletonShine,
    'badge-from': c.badgeFrom,
    'badge-to': c.badgeTo,
  };

  for (const [key, value] of Object.entries(map)) {
    root.style.setProperty(`--theme-${key}`, value);
  }

  root.style.setProperty('--theme-font-display', theme.typography.fontFamilyDisplay);
  root.style.setProperty('--theme-font-body', theme.typography.fontFamilyBody);
  root.style.setProperty('--theme-font-mono', theme.typography.fontFamilyMono);

  for (const [key, value] of Object.entries(theme.borderRadius)) {
    root.style.setProperty(`--theme-radius-${key}`, value);
  }
  for (const [key, value] of Object.entries(theme.spacing)) {
    root.style.setProperty(`--theme-spacing-${key}`, value);
  }

  document.body.style.color = c.textPrimary;
  document.body.style.background = c.bgPrimary;
  document.body.style.fontFamily = theme.typography.fontFamilyBody;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || grabTheme.name; }
    catch { return grabTheme.name; }
  });

  const theme = useMemo(() => themeMap.get(themeName) || grabTheme, [themeName]);

  useEffect(() => {
    applyThemeToDOM(theme);
    try { localStorage.setItem(STORAGE_KEY, theme.name); } catch { /* */ }
  }, [theme]);

  const setThemeByName = useCallback((name: string) => {
    if (themeMap.has(name)) setThemeName(name);
  }, []);

  const value = useMemo(() => ({ theme, setThemeByName, allThemes: themes }), [theme, setThemeByName]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
