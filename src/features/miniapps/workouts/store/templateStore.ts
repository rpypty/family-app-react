import type { WorkoutTemplate, TemplateExercise } from '../types'
import { exerciseKey } from '../utils/workout'

const STORAGE_KEY = 'workouts:templates:v1'

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function uniqueTemplateExercisesInOrder(
  items: Array<{ name: string; reps: number; sets: number; weight?: number }>
): TemplateExercise[] {
  const seen = new Set<string>()
  const out: TemplateExercise[] = []
  for (const it of items || []) {
    const name = String(it?.name || '').trim()
    if (!name) continue
    const k = exerciseKey(name)
    if (seen.has(k)) continue
    seen.add(k)
    const reps = Math.max(1, Number(it?.reps) || 0) || 8
    const sets = Math.max(1, Number(it?.sets) || 0) || 3
    const weight = Number(it?.weight) || 0
    out.push({ name, reps, sets, weight })
  }
  return out
}

function coerceTemplateExercises(raw: unknown): TemplateExercise[] {
  if (!Array.isArray(raw)) return []

  // Legacy: string[]
  if (raw.every((x) => typeof x === 'string')) {
    return uniqueTemplateExercisesInOrder(
      (raw as string[]).map((name) => ({
        name,
        reps: 8,
        sets: 3,
      }))
    )
  }

  // Current: {name,reps,sets,weight?}[]
  return uniqueTemplateExercisesInOrder(
    (raw as any[]).map((x) => ({
      name: String(x?.name || x?.exercise || ''),
      reps: Number(x?.reps) || 0,
      sets: Number(x?.sets) || 0,
      weight: Number(x?.weight) || 0,
    }))
  )
}

export const loadTemplates = (): WorkoutTemplate[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((t) => ({
        id: (t as any)?.id || randomId(),
        name: String((t as any)?.name || '').trim(),
        exercises: coerceTemplateExercises((t as any)?.exercises),
        createdAt: Number((t as any)?.createdAt) || Date.now(),
      }))
      .filter((t) => t.name)
  } catch {
    return []
  }
}

export const saveTemplates = (templates: WorkoutTemplate[]): void => {
  if (typeof localStorage === 'undefined') return
  try {
    const normalized = (templates || []).map((t) => ({
      id: t.id,
      name: (t.name || '').trim(),
      exercises: uniqueTemplateExercisesInOrder(t.exercises || []),
      createdAt: t.createdAt || Date.now(),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // ignore
  }
}

export const createTemplateLocal = (input: {
  name: string
  exercises: TemplateExercise[]
}): WorkoutTemplate => {
  return {
    id: randomId(),
    name: (input.name || '').trim(),
    exercises: uniqueTemplateExercisesInOrder(input.exercises || []),
    createdAt: Date.now(),
  }
}
