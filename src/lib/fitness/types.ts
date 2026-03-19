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

export type EffortRating = 'too_easy' | 'shaky' | 'grind_good' | 'keep_coming';

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

