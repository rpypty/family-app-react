import type { Workout } from '../types'

const STORAGE_KEY = 'workouts:workouts:v1'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const toNumberValue = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const loadWorkouts = (): Workout[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((rawWorkout): Workout => {
      const workout = isPlainObject(rawWorkout) ? rawWorkout : {}
      const rawSets = Array.isArray(workout.sets) ? workout.sets : []

      return {
        id: toStringValue(workout.id, randomId()),
        date: toStringValue(workout.date),
        name: toStringValue(workout.name, 'Тренировка'),
        sets: rawSets.map((rawSet) => {
          const set = isPlainObject(rawSet) ? rawSet : {}
          return {
            id: toStringValue(set.id, randomId()),
            exercise: toStringValue(set.exercise),
            reps: toNumberValue(set.reps, 0),
            weightKg: toNumberValue(set.weightKg, 0),
            createdAt: toNumberValue(set.createdAt, Date.now()),
          }
        }),
        createdAt: toNumberValue(workout.createdAt, Date.now()),
      }
    })
  } catch {
    return []
  }
}

export const saveWorkouts = (workouts: Workout[]): void => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
  } catch {
    // ignore
  }
}

export const createWorkoutLocal = (input: {
  date: string
  name: string
  sets: Workout['sets']
}): Workout => {
  return {
    id: randomId(),
    date: input.date,
    name: input.name,
    sets: input.sets || [],
    createdAt: Date.now(),
  }
}
