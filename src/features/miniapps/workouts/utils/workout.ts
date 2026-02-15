import type { Workout, WorkoutEntry, WorkoutSet } from '../types'

export const exerciseKey = (name: string): string => (name || '').trim().toLowerCase()

export const createWorkoutSet = (input: { exercise: string; reps: number; weightKg: number }): WorkoutSet => ({
  id: `set_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  exercise: (input.exercise || '').trim(),
  reps: Math.max(0, Number(input.reps) || 0),
  weightKg: Number.isFinite(input.weightKg) ? input.weightKg : 0,
  createdAt: Date.now(),
})

export const workoutEntries = (workouts: Workout[]): WorkoutEntry[] => {
  const entries: WorkoutEntry[] = []
  for (const workout of workouts) {
    for (const set of workout.sets || []) {
      entries.push({
        id: `${workout.id}:${set.id}`,
        date: workout.date,
        exercise: set.exercise,
        reps: set.reps,
        weightKg: set.weightKg,
        createdAt: set.createdAt,
      })
    }
  }
  return entries
}

export const sortWorkouts = (workouts: Workout[]): Workout[] => {
  const copy = [...workouts]
  copy.sort((a, b) => {
    const da = Date.parse(a.date)
    const db = Date.parse(b.date)
    if (db !== da) return db - da
    return (b.createdAt ?? 0) - (a.createdAt ?? 0)
  })
  return copy
}

export const volumeForSet = (set: WorkoutSet, isWeightless: boolean): number => {
  if (isWeightless) {
    return Math.max(0, Number(set.reps) || 0)
  }
  return Math.max(0, (Number(set.weightKg) || 0) * (Number(set.reps) || 0))
}
