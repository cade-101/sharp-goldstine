import { useMemo } from 'react';
import { useUser } from '../context/UserContext';
import {
  getFitnessIntensity, getBudgetIntensity,
  getWorkdayIntensity, getIntensityStyles, IntensityState,
} from '../lib/themeIntensity';

type ModuleInput =
  | { module: 'fitness'; params: { sessionsThisWeek: number; hrv?: number | null; sleepHours?: number | null; mode?: string } }
  | { module: 'budget';  params: { totalSpent: number; totalBudget: number } }
  | { module: 'workday'; params: { brainState: string } }
  | { module: 'none' };

export const useThemeIntensity = (input: ModuleInput) => {
  const { themeTokens } = useUser();

  const intensityState: IntensityState = useMemo(() => {
    switch (input.module) {
      case 'fitness': return getFitnessIntensity(input.params);
      case 'budget':  return getBudgetIntensity(input.params);
      case 'workday': return getWorkdayIntensity(input.params.brainState);
      default:        return 'baseline';
    }
  }, [input]);

  const intensityStyles = useMemo(
    () => getIntensityStyles(themeTokens, intensityState),
    [themeTokens, intensityState]
  );

  return { intensityStyles, intensityState };
};