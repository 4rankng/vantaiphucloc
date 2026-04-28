import type { ThemeDefinition } from './types';
import { themeToCSSVars } from './tokens';

export function applyThemeToDOM(theme: ThemeDefinition): void {
  const root = document.documentElement;
  const vars = themeToCSSVars(theme);

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  root.setAttribute('data-theme', theme.name);

  const c = theme.colors;
  document.body.style.color = c.textPrimary;
  document.body.style.background = c.bgPrimary;
  document.body.style.fontFamily = theme.typography.fontFamilyBody;
}
