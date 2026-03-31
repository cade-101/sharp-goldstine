export type ThemeTokens = {
  name: string;
  mode: 'dark' | 'light';
  bg: string;
  dark: string;
  card: string;
  border: string;
  accent: string;
  accentDim: string;
  accentBg: string;
  gold: string;
  text: string;
  muted: string;
  green: string;
  red: string;
  blue: string;
};

import shadowTheme    from './shadow';
import ironTheme      from './iron';
import formTheme      from './form';
import roninTheme     from './ronin';
import valkyrieTheme  from './valkyrie';
import forgeTheme     from './forge';
import arcaneTheme    from './arcane';
import dragonfireTheme from './dragonfire';
import voidTheme      from './void';
import verdantTheme   from './verdant';

const themeRegistry: Record<string, ThemeTokens> = {
  SHADOW:     shadowTheme,
  IRON:       ironTheme,
  FORM:       formTheme,
  RONIN:      roninTheme,
  VALKYRIE:   valkyrieTheme,
  FORGE:      forgeTheme,
  ARCANE:     arcaneTheme,
  DRAGONFIRE: dragonfireTheme,
  VOID:       voidTheme,
  VERDANT:    verdantTheme,
};

export const getTheme = (themeName?: string | null): ThemeTokens => {
  if (!themeName) return shadowTheme;
  return themeRegistry[themeName.toUpperCase()] ?? shadowTheme;
};

// SHADOW = default (not selectable), VALKYRIE = granted (not selectable)
export const SELECTABLE_THEMES = [
  'IRON', 'FORM', 'RONIN', 'FORGE',
  'ARCANE', 'DRAGONFIRE', 'VOID', 'VERDANT',
] as const;

export type SelectableTheme = typeof SELECTABLE_THEMES[number];
export default themeRegistry;