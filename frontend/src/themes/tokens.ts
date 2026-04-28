import type { ThemeDefinition } from './types';

export function resolveToken(theme: ThemeDefinition, path: string): string {
  const [category, ...rest] = path.split('.');
  if (category === 'tokens') {
    const [key, subkey] = rest;
    const tokens = theme.tokens as Record<string, Record<string, string>>;
    return tokens[key]?.[subkey] ?? '';
  }
  return '';
}

export function themeToCSSVars(theme: ThemeDefinition): Record<string, string> {
  const vars: Record<string, string> = {};

  const toKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

  // Colors
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--theme-${toKebab(key)}`] = value;
  }

  // Typography
  for (const [key, value] of Object.entries(theme.typography)) {
    vars[`--theme-${toKebab(key)}`] = value;
  }

  // Border radius
  for (const [key, value] of Object.entries(theme.borderRadius)) {
    vars[`--theme-radius-${key}`] = value;
  }

  // Spacing
  for (const [key, value] of Object.entries(theme.spacing)) {
    vars[`--theme-spacing-${toKebab(key)}`] = value;
  }

  // Semantic tokens
  if (theme.tokens) {
    for (const [category, values] of Object.entries(theme.tokens)) {
      for (const [key, value] of Object.entries(values as Record<string, string>)) {
        vars[`--theme-${toKebab(category)}-${toKebab(key)}`] = value;
      }
    }
  }

  return vars;
}
