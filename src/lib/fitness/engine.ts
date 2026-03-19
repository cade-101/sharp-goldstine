import {
  FitnessSessionState,
  Exercise,
  EffortRating,
  SetPlan,
  Goal,
  CompletedSet,
} from './types';

const MS = {
  second: 1000,
  minute: 60_000,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundTo(n: number, step: number) {
  if (!Number.isFinite(n)) return n;
  if (step <= 0) return n;
  return Math.round(n / step) * step;
}

function getTargetReps(goal: Goal, exercise: Exercise): number {
  if (goal === 'strength') {
    if (exercise.type === 'compound') return 5;
    if (exercise.type === 'accessory') return 8;
    return 12;
  }

  if (goal === 'conditioning') {
    if (exercise.type === 'compound') return 10;
    if (exercise.type === 'accessory') return 15;
    return 20;
  }

  // hypertrophy
  if (exercise.type === 'compound') return 8;
  if (exercise.type === 'accessory') return 12;
  return 15;
}

function estimateAvgSetTimeMs(goal: Goal) {
  // A deliberately conservative, goal-agnostic set+rest envelope.
  // Used only to cap set count so plans can always fit in time.
  if (goal === 'strength') return 2.5 * MS.minute;
  if (goal === 'conditioning') return 1.75 * MS.minute;
  return 2.0 * MS.minute;
}

function computeCapacitySets(params: {
  goal: Goal;
  timeRemainingMs: number;
}) {
  const avg = estimateAvgSetTimeMs(params.goal);
  return Math.max(0, Math.floor(params.timeRemainingMs / avg));
}

function pickExerciseOrder(exercises: Exercise[]) {
  const byType = (t: Exercise['type']) => exercises.filter(e => e.type === t);
  return [...byType('compound'), ...byType('accessory'), ...byType('pump')];
}

function buildPlannedSets(params: {
  goal: Goal;
  availableExercises: Exercise[];
  totalSets: number;
}) {
  const ordered = pickExerciseOrder(params.availableExercises);
  if (ordered.length === 0 || params.totalSets <= 0) return [];

  // Round-robin the ordered list so the plan is distributed across exercises.
  const planned: SetPlan[] = [];
  for (let i = 0; i < params.totalSets; i++) {
    const ex = ordered[i % ordered.length];
    planned.push({
      exerciseId: ex.id,
      targetReps: getTargetReps(params.goal, ex),
      targetWeight: 0,
    });
  }
  return planned;
}

function desiredTotalSetsForGoal(goal: Goal) {
  if (goal === 'strength') return 12;
  if (goal === 'conditioning') return 15;
  return 18; // hypertrophy
}

export function createInitialPlan(params: {
  hardStopTime: Date;
  startTime: Date;
  goal: Goal;
  availableExercises: Exercise[];
}): FitnessSessionState {
  const timeRemainingMs = Math.max(0, params.hardStopTime.getTime() - params.startTime.getTime());
  const capacity = computeCapacitySets({ goal: params.goal, timeRemainingMs });

  const desired = desiredTotalSetsForGoal(params.goal);
  const totalSets = clamp(desired, 0, capacity);

  return {
    hardStopTime: params.hardStopTime,
    startTime: params.startTime,
    goal: params.goal,
    plannedSets: buildPlannedSets({
      goal: params.goal,
      availableExercises: params.availableExercises,
      totalSets,
    }),
    completedSets: [],
  };
}

function removeOnePlannedSet(plannedSets: SetPlan[], exerciseId: string) {
  const idx = plannedSets.findIndex(s => s.exerciseId === exerciseId);
  if (idx === -1) return plannedSets;
  return [...plannedSets.slice(0, idx), ...plannedSets.slice(idx + 1)];
}

function bumpNextPlannedWeight(plannedSets: SetPlan[], exerciseId: string) {
  const idx = plannedSets.findIndex(s => s.exerciseId === exerciseId);
  if (idx === -1) return plannedSets;

  const next = plannedSets[idx];
  const current = next.targetWeight || 0;
  const bumped = current <= 0 ? current : roundTo(current * 1.025, 0.5);
  const updated: SetPlan = { ...next, targetWeight: bumped };

  const out = [...plannedSets];
  out[idx] = updated;
  return out;
}

function trimToCapacity(params: {
  state: FitnessSessionState;
  now: Date;
  plannedSets: SetPlan[];
}) {
  const timeRemainingMs = Math.max(0, params.state.hardStopTime.getTime() - params.now.getTime());
  const capacity = computeCapacitySets({ goal: params.state.goal, timeRemainingMs });
  return params.plannedSets.slice(0, capacity);
}

export function logSetAndReplan(params: {
  state: FitnessSessionState;
  completed: CompletedSet;
}): FitnessSessionState {
  const completedSets = [...params.state.completedSets, params.completed];

  // Consume one planned set for this exercise if present.
  let plannedSets = removeOnePlannedSet(params.state.plannedSets, params.completed.exerciseId);

  // Replan based on effort.
  const effort: EffortRating = params.completed.effort;

  if (effort === 'too_easy') {
    // Add one extra set for the same exercise unless time is very tight.
    // (We enforce the time constraint later via trimToCapacity.)
    const next = plannedSets.find(s => s.exerciseId === params.completed.exerciseId);
    const fallback: SetPlan = {
      exerciseId: params.completed.exerciseId,
      targetReps: next?.targetReps ?? params.completed.reps,
      targetWeight: next?.targetWeight ?? params.completed.weight,
    };
    plannedSets = [...plannedSets, fallback];
  }

  if (effort === 'grind_good') {
    plannedSets = bumpNextPlannedWeight(plannedSets, params.completed.exerciseId);
  }

  if (effort === 'keep_coming') {
    // If time allows, add a "finisher" as one more set.
    // Without exercise metadata here, we treat finisher as an extra set
    // on the current exercise (or last planned exercise if none remain).
    const finisherExerciseId =
      plannedSets[plannedSets.length - 1]?.exerciseId ?? params.completed.exerciseId;
    plannedSets = [
      ...plannedSets,
      {
        exerciseId: finisherExerciseId,
        targetReps: Math.max(8, params.completed.reps),
        targetWeight: params.completed.weight,
      },
    ];
  }

  plannedSets = trimToCapacity({
    state: params.state,
    now: params.completed.completedAt,
    plannedSets,
  });

  return {
    ...params.state,
    plannedSets,
    completedSets,
  };
}

export function getRestDurationForSet(params: {
  exercise: Exercise;
  timeRemainingMs: number;
}): number {
  const baseMs =
    params.exercise.type === 'compound' ? 105 * MS.second : 45 * MS.second;

  // If time remaining is small (< 10 min), linearly compress down toward 50–70% of base.
  const threshold = 10 * MS.minute;
  if (params.timeRemainingMs >= threshold) return baseMs;

  const minFactor = 0.6; // inside the 50–70% window, leaning conservative for recovery
  const t = clamp(params.timeRemainingMs / threshold, 0, 1);
  const factor = minFactor + (1 - minFactor) * t;
  return Math.round(baseMs * factor);
}

