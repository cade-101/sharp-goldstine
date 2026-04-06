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
// New themes
import hearthTheme     from './hearth';
import copperTheme     from './copper';
import duskTheme       from './dusk';
import cedarTheme      from './cedar';
import emberTheme      from './ember';
import parchmentTheme  from './parchment';
import bloomTheme      from './bloom';
import nebulaTheme     from './nebula';
import auroraTheme     from './aurora';
import slateTheme      from './slate';
import spartanTheme    from './spartan';
import centurionTheme  from './centurion';
import vikingTheme     from './viking';
import shogunTheme     from './shogun';
import dynastyTheme    from './dynasty';
import krakenTheme     from './kraken';
import leviathanTheme  from './leviathan';
import wendigoTheme    from './wendigo';
import phoenixTheme    from './phoenix';
import templarTheme    from './templar';
import sanctumTheme    from './sanctum';
import pharaohTheme    from './pharaoh';
import oasisTheme      from './oasis';
import wraithTheme     from './wraith';
import solsticeTheme   from './solstice';
import druidTheme      from './druid';
import groveTheme      from './grove';

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
  // New themes
  HEARTH:     hearthTheme,
  COPPER:     copperTheme,
  DUSK:       duskTheme,
  CEDAR:      cedarTheme,
  EMBER:      emberTheme,
  PARCHMENT:  parchmentTheme,
  BLOOM:      bloomTheme,
  NEBULA:     nebulaTheme,
  AURORA:     auroraTheme,
  SLATE:      slateTheme,
  SPARTAN:    spartanTheme,
  CENTURION:  centurionTheme,
  VIKING:     vikingTheme,
  SHOGUN:     shogunTheme,
  DYNASTY:    dynastyTheme,
  KRAKEN:     krakenTheme,
  LEVIATHAN:  leviathanTheme,
  WENDIGO:    wendigoTheme,
  PHOENIX:    phoenixTheme,
  TEMPLAR:    templarTheme,
  SANCTUM:    sanctumTheme,
  PHARAOH:    pharaohTheme,
  OASIS:      oasisTheme,
  WRAITH:     wraithTheme,
  SOLSTICE:   solsticeTheme,
  DRUID:      druidTheme,
  GROVE:      groveTheme,
};

export const getTheme = (themeName?: string | null): ThemeTokens => {
  if (!themeName) return shadowTheme;
  return themeRegistry[themeName.toUpperCase()] ?? shadowTheme;
};

// SHADOW = default (not selectable in picker, always available)
// VALKYRIE = admin-granted
// All others are selectable
export const SELECTABLE_THEMES = [
  'IRON', 'COPPER', 'SPARTAN', 'CENTURION', 'VIKING',
  'SHOGUN', 'DYNASTY', 'PHARAOH', 'OASIS', 'TEMPLAR', 'SANCTUM',
  'VOID', 'DUSK', 'RONIN', 'CEDAR',
  'DRAGONFIRE', 'EMBER', 'PHOENIX',
  'KRAKEN', 'LEVIATHAN',
  'WRAITH', 'SOLSTICE',
  'DRUID', 'GROVE',
  'ARCANE', 'PARCHMENT',
  'VERDANT', 'BLOOM',
  'NEBULA', 'AURORA',
  'SLATE', 'FORM',
  'FORGE',
  'WENDIGO',
  'SHADOW', 'HEARTH',
] as const;

export type SelectableTheme = typeof SELECTABLE_THEMES[number];

export interface ThemePairEntry {
  dark?: string;
  warm?: string;
  standalone?: string;
  label: string;
}

export const THEME_PAIRS: ThemePairEntry[] = [
  { dark: 'shadow',     warm: 'hearth',     label: 'Shadow / Hearth' },
  { dark: 'iron',       warm: 'copper',     label: 'Iron / Copper' },
  { dark: 'spartan',    warm: 'centurion',  label: 'Spartan / Centurion' },
  { dark: 'shogun',     warm: 'dynasty',    label: 'Shogun / Dynasty' },
  { dark: 'templar',    warm: 'sanctum',    label: 'Templar / Sanctum' },
  { dark: 'pharaoh',    warm: 'oasis',      label: 'Pharaoh / Oasis' },
  { dark: 'void',       warm: 'dusk',       label: 'Void / Dusk' },
  { dark: 'ronin',      warm: 'cedar',      label: 'Ronin / Cedar' },
  { dark: 'dragonfire', warm: 'ember',      label: 'Dragonfire / Ember' },
  { dark: 'kraken',     warm: 'leviathan',  label: 'Kraken / Leviathan' },
  { dark: 'wraith',     warm: 'solstice',   label: 'Wraith / Solstice' },
  { dark: 'druid',      warm: 'grove',      label: 'Druid / Grove' },
  { dark: 'arcane',     warm: 'parchment',  label: 'Arcane / Parchment' },
  { dark: 'verdant',    warm: 'bloom',      label: 'Verdant / Bloom' },
  { dark: 'nebula',     warm: 'aurora',     label: 'Nebula / Aurora' },
  { dark: 'slate',      warm: 'form',       label: 'Slate / Form' },
  { standalone: 'valkyrie', label: 'Valkyrie' },
  { standalone: 'viking',   label: 'Viking' },
  { standalone: 'wendigo',  label: 'Wendigo' },
  { standalone: 'phoenix',  label: 'Phoenix' },
  { standalone: 'forge',    label: 'Forge' },
];

export const THEME_WARM_PAIRS: Record<string, string | null> = {
  shadow:     'hearth',
  iron:       'copper',
  spartan:    null,
  viking:     null,
  shogun:     'dynasty',
  templar:    'sanctum',
  pharaoh:    'oasis',
  void:       'dusk',
  ronin:      'cedar',
  dragonfire: 'ember',
  kraken:     'leviathan',
  wraith:     'solstice',
  druid:      'grove',
  arcane:     'parchment',
  verdant:    'bloom',
  nebula:     'aurora',
  slate:      'form',
  valkyrie:   null,
  wendigo:    null,
  phoenix:    null,
  forge:      null,
  // warm pairs pointing to their dark counterpart
  hearth:     null,
  copper:     null,
  centurion:  null,
  dynasty:    null,
  sanctum:    null,
  oasis:      null,
  dusk:       null,
  cedar:      null,
  ember:      null,
  leviathan:  null,
  solstice:   null,
  grove:      null,
  parchment:  null,
  bloom:      null,
  aurora:     null,
  form:       null,
};

export const THEME_CATEGORIES: {
  id: string;
  label: string;
  themes: string[];
}[] = [
  { id: 'default',  label: 'DEFAULT',     themes: ['shadow', 'hearth'] },
  { id: 'military', label: 'MILITARY',    themes: ['iron', 'copper', 'spartan', 'centurion', 'viking'] },
  { id: 'imperial', label: 'IMPERIAL',    themes: ['shogun', 'dynasty', 'pharaoh', 'oasis', 'templar', 'sanctum'] },
  { id: 'nature',   label: 'NATURE',      themes: ['verdant', 'bloom', 'cedar', 'druid', 'grove'] },
  { id: 'myth',     label: 'MYTH & LORE', themes: ['dragonfire', 'ember', 'phoenix', 'arcane', 'parchment', 'forge'] },
  { id: 'ocean',    label: 'DEEP OCEAN',  themes: ['kraken', 'leviathan', 'void', 'dusk'] },
  { id: 'spirit',   label: 'SPIRIT',      themes: ['wraith', 'solstice', 'wendigo', 'ronin', 'cedar', 'valkyrie'] },
  { id: 'cosmos',   label: 'COSMOS',      themes: ['nebula', 'aurora', 'void'] },
  { id: 'minimal',  label: 'MINIMAL',     themes: ['slate', 'form', 'iron', 'copper'] },
];

export default themeRegistry;

export const THEME_REQUIREMENTS: Record<string, { label: string; description: string }> = {
  SHADOW: { label: 'Shadow', description: 'Complete 10 workouts' },
  IRON:   { label: 'Iron',   description: 'Log a PR on any lift' },
  RONIN:  { label: 'Ronin',  description: 'Train 7 days in a row' },
  FORM:   { label: 'Form',   description: 'Complete 5 Form sessions' },
};
