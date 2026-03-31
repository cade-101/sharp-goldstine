import { ThemeTokens } from '../themes';

export type IntensityState =
  | 'baseline' | 'streak'    | 'pr_ready'
  | 'recovery' | 'beast_mode'| 'ghost_protocol'
  | 'on_track' | 'breach'    | 'survival'
  | 'locked_in'| 'toast';

export type ThemeModifier = {
  accentOpacity: number;
  cardOpacity:   number;
  borderOpacity: number;
  textOpacity:   number;
  glowActive:    boolean;
  desaturate:    boolean;
  label?:        string;
};

const modifiers: Record<IntensityState, ThemeModifier> = {
  baseline:       { accentOpacity:1.0, cardOpacity:1.0,  borderOpacity:1.0, textOpacity:1.0,  glowActive:false, desaturate:false },
  streak:         { accentOpacity:1.0, cardOpacity:1.05, borderOpacity:1.2, textOpacity:1.0,  glowActive:false, desaturate:false, label:'ON A STREAK' },
  pr_ready:       { accentOpacity:1.0, cardOpacity:1.0,  borderOpacity:1.0, textOpacity:1.0,  glowActive:true,  desaturate:false, label:'CONDITIONS OPTIMAL' },
  recovery:       { accentOpacity:0.7, cardOpacity:0.92, borderOpacity:0.6, textOpacity:0.88, glowActive:false, desaturate:true,  label:'RECOVERY' },
  beast_mode:     { accentOpacity:1.0, cardOpacity:1.1,  borderOpacity:1.4, textOpacity:1.0,  glowActive:true,  desaturate:false, label:'BEAST MODE' },
  ghost_protocol: { accentOpacity:0.4, cardOpacity:0.85, borderOpacity:0.5, textOpacity:0.9,  glowActive:false, desaturate:true,  label:'GHOST PROTOCOL' },
  on_track:       { accentOpacity:1.0, cardOpacity:1.0,  borderOpacity:1.0, textOpacity:1.0,  glowActive:false, desaturate:false },
  breach:         { accentOpacity:0.85,cardOpacity:0.95, borderOpacity:1.1, textOpacity:1.0,  glowActive:false, desaturate:false, label:'BREACH DETECTED' },
  survival:       { accentOpacity:0.5, cardOpacity:0.8,  borderOpacity:0.4, textOpacity:0.85, glowActive:false, desaturate:true,  label:'SURVIVAL MODE' },
  locked_in:      { accentOpacity:1.0, cardOpacity:1.08, borderOpacity:1.3, textOpacity:1.0,  glowActive:false, desaturate:false, label:'LOCKED IN' },
  toast:          { accentOpacity:0.6, cardOpacity:0.88, borderOpacity:0.5, textOpacity:0.8,  glowActive:false, desaturate:true,  label:'TOAST' },
};

export const getFitnessIntensity = (p: {
  sessionsThisWeek: number; hrv?: number | null; sleepHours?: number | null; mode?: string;
}): IntensityState => {
  if (p.mode === 'lfg' || p.mode === 'beast') return 'beast_mode';
  if (p.mode === 'ghost_protocol') return 'ghost_protocol';
  if ((p.hrv && p.hrv < 30) || (p.sleepHours && p.sleepHours < 5)) return 'recovery';
  if (p.hrv && p.hrv >= 60 && p.sleepHours && p.sleepHours >= 7) return 'pr_ready';
  if (p.sessionsThisWeek >= 3) return 'streak';
  return 'baseline';
};

export const getBudgetIntensity = (p: { totalSpent: number; totalBudget: number }): IntensityState => {
  const pct = p.totalBudget > 0 ? p.totalSpent / p.totalBudget : 0;
  if (pct >= 1.3) return 'survival';
  if (pct >= 1.0) return 'breach';
  return 'on_track';
};

export const getWorkdayIntensity = (brainState: string): IntensityState => {
  const s = brainState.toLowerCase();
  if (s === 'locked_in' || s === 'locked in') return 'locked_in';
  if (s === 'toast') return 'toast';
  return 'baseline';
};

export const getIntensityStyles = (tokens: ThemeTokens, state: IntensityState) => {
  const mod = modifiers[state];
  return {
    modifier: mod,
    cardStyle:  { backgroundColor: tokens.card, borderColor: tokens.border, opacity: mod.cardOpacity },
    accentStyle:{ color: tokens.accent, opacity: mod.accentOpacity },
    glowStyle: mod.glowActive ? {
      shadowColor: tokens.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    } : {},
    desaturateStyle: mod.desaturate ? { opacity: 0.82 } : {},
  };
};

export { modifiers };