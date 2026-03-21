import { RONIN }      from './ronin';
import { VALKYRIE }   from './valkyrie';
import { IRON }       from './iron';
import { FORM }       from './form';
import { FORGE }      from './forge';
import { ARCANE }     from './arcane';
import { DRAGONFIRE } from './dragonfire';
import { VOID }       from './void';
import { VERDANT }    from './verdant';

export type ThemeTokens = {
  bg:        string;
  dark:      string;
  card:      string;
  border:    string;
  accent:    string;
  accentDim: string;
  accentBg:  string;
  gold:      string;
  text:      string;
  muted:     string;
  green:     string;
  red:       string;
  blue:      string;
  mode:      'dark' | 'light';
  name:      string;
};

export function getTheme(themeName: string): ThemeTokens {
  switch (themeName) {
    case 'ronin':      return RONIN;
    case 'valkyrie':   return VALKYRIE;
    case 'form':       return FORM;
    case 'forge':      return FORGE;
    case 'arcane':     return ARCANE;
    case 'dragonfire': return DRAGONFIRE;
    case 'void':       return VOID;
    case 'verdant':    return VERDANT;
    default:           return IRON;
  }
}

export { IRON, FORM, RONIN, VALKYRIE, FORGE, ARCANE, DRAGONFIRE, VOID, VERDANT };
