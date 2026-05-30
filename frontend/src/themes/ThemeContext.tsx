import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { ThemeDefinition } from './types';
import { nepoTheme } from './nepo';
import { applyThemeToDOM } from './css';
import { themes, themeMap } from './theme-registry';

const STORAGE_KEY = 'ttransport-theme';

// Apply theme synchronously before first render so CSS vars are available immediately.
const _initialThemeName = (() => {
  try { return localStorage.getItem(STORAGE_KEY) || nepoTheme.name; } catch { return nepoTheme.name; }
})()
applyThemeToDOM(themeMap.get(_initialThemeName) ?? nepoTheme)

interface ThemeContextValue {
  theme: ThemeDefinition;
  setThemeByName: (name: string) => void;
  allThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || nepoTheme.name; }
    catch { return nepoTheme.name; }
  });

  const theme = useMemo(() => themeMap.get(themeName) || nepoTheme, [themeName]);

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

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
