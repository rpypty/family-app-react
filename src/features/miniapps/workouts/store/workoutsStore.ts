import type { Workout } from '../types'

const STORAGE_KEY = 'workouts:workouts:v1'

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
    return parsed.map((w: any) => ({
      id: w.id || randomId(),
      date: w.date || '',
      name: w.name || 'Тренировка',
      sets: Array.isArray(w.sets) ? w.sets.map((s: any) => ({
        id: s.id || randomId(),
        exercise: s.exercise || '',
        reps: Number(s.reps) || 0,
        weightKg: Number(s.weightKg) || 0,
        createdAt: Number(s.createdAt) || Date.now(),
      })) : [],
      createdAt: Number(w.createdAt) || Date.now(),
    }))
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
