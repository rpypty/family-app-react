import type { ExerciseMeta } from '../types'
import { exerciseKey } from '../utils/workout'

const STORAGE_KEY = 'workouts:exercise-meta:v1'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isExerciseMeta = (value: unknown): value is ExerciseMeta => {
  if (!isPlainObject(value)) return false
  return (
    typeof value.name === 'string' &&
    typeof value.note === 'string' &&
    typeof value.isWeightless === 'boolean' &&
    typeof value.updatedAt === 'number'
  )
}

export const loadExerciseMeta = (): Record<string, ExerciseMeta> => {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!isPlainObject(parsed)) return {}
    const out: Record<string, ExerciseMeta> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (isExerciseMeta(value)) out[key] = value
    }
    return out
  } catch {
    return {}
  }
}

export const saveExerciseMeta = (meta: Record<string, ExerciseMeta>) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // ignore
  }
}

export const upsertMeta = (meta: Record<string, ExerciseMeta>, item: ExerciseMeta) => {
  const key = exerciseKey(item.name)
  return {
    ...meta,
    [key]: { ...item, updatedAt: Date.now() },
  }
}
