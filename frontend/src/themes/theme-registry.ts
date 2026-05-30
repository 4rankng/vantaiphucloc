import type { ThemeDefinition } from './types';
import { nepoTheme } from './nepo';

export const themes: ThemeDefinition[] = [nepoTheme];
export const themeMap = new Map(themes.map(t => [t.name, t]));
