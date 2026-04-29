/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { ThemeDefinition } from './types';
import { grabTheme } from './grab';
import { applyThemeToDOM } from './css';

export const themes: ThemeDefinition[] = [grabTheme];
const themeMap = new Map(themes.map(t => [t.name, t]));

const STORAGE_KEY = 'ttransport-theme';

interface ThemeContextValue {
  theme: ThemeDefinition;
  setThemeByName: (name: string) => void;
  allThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

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
