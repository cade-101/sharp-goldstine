export type Goal = 'strength' | 'hypertrophy' | 'conditioning';

export type ExerciseType = 'compound' | 'accessory' | 'pump';

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
}

export interface SetPlan {
  exerciseId: string;
  targetReps: number;
  targetWeight: number;
}

export interface CompletedSet {
  exerciseId: string;
  weight: number;
  reps: number;
  effort: EffortRating;
  completedAt: Date;
}

export interface FitnessSessionState {
  hardStopTime: Date;
  startTime: Date;
  goal: Goal;
  plannedSets: SetPlan[];
  completedSets: CompletedSet[];
}
export type EffortRating =
  | 'too_easy'
  | 'shaky'
  | 'grind_good'
  | 'felt_like_shit';

export const EFFORT_OPTIONS: { value: EffortRating; label: string }[] = [
  { value: 'too_easy', label: 'Too easy' },
  { value: 'shaky', label: 'Shaky' },
  { value: 'grind_good', label: 'Grind but good' },
  { value: 'felt_like_shit', label: 'That felt like shit' },
];

