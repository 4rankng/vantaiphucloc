import type { ThemeDefinition } from './types';
import { grabTheme } from './grab';

export const themes: ThemeDefinition[] = [grabTheme];
export const themeMap = new Map(themes.map(t => [t.name, t]));
