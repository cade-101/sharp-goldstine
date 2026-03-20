export type EffortRating = 'too_easy' | 'shaky' | 'grind_good' | 'felt_like_shit';

export interface Exercise {
  id: string;
  name: string;
  type: 'compound' | 'accessory' | 'pump';
  sets: number;
  targetReps: string;
  targetWeight?: number | null;
  note?: string;
  restSeconds: number;
}

export interface CompletedSet {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  effort: EffortRating;
  isPR: boolean;
  timestamp: Date;
}

export interface SessionState {
  sessionId: string;
  userId: string;
  hardStopTime: Date;
  startTime: Date;
  plannedExercises: Exercise[];
  completedSets: CompletedSet[];
  currentExerciseIndex: number;
  isComplete: boolean;
}

// What the Edge Function returns for set_completed / exercise_skipped
export interface PlanDiff {
  restSeconds: number;
  nextExercise: Exercise | null;
  adjustments: string[];
  sneakyCardio: { label: string; durationSeconds: number } | null;
}

// What the Edge Function returns for session_start
export interface SessionPlan {
  label: string;
  exercises: Exercise[];
}
