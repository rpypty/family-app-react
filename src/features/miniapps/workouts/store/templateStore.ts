import type { WorkoutTemplate, TemplateSet } from '../types'

const STORAGE_KEY = 'workouts:templates:v1'

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

// Coerce raw data into TemplateSet[] - support legacy format
function coerceTemplateSets(raw: unknown): TemplateSet[] {
  if (!Array.isArray(raw)) return []

  const out: TemplateSet[] = []

  for (const rawItem of raw) {
    if (!isPlainObject(rawItem)) continue

    // Current format: {id?, exercise, reps, weightKg}
    if ('exercise' in rawItem) {
      const exercise = toStringValue(rawItem.exercise).trim()
      const set: TemplateSet = {
        id: toStringValue(rawItem.id, randomId()),
        exercise,
        reps: Math.max(1, toNumberValue(rawItem.reps, 8)),
        weightKg: toNumberValue(rawItem.weightKg, 0),
      }
      if (set.exercise) out.push(set)
    }
    // Legacy format: {name, sets, reps, weight} - expand to multiple sets
    else if ('name' in rawItem && 'sets' in rawItem) {
      const name = toStringValue(rawItem.name).trim()
      const setCount = Math.max(1, toNumberValue(rawItem.sets, 3))
      const reps = Math.max(1, toNumberValue(rawItem.reps, 8))
      const weight = toNumberValue(rawItem.weight, 0)
      if (name) {
        for (let i = 0; i < setCount; i++) {
          out.push({
            id: randomId(),
            exercise: name,
            reps,
            weightKg: weight,
          })
        }
      }
    }
  }

  return out
}

export const loadTemplates = (): WorkoutTemplate[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((rawTemplate) => {
        if (!isPlainObject(rawTemplate)) return null
        const name = toStringValue(rawTemplate.name).trim()
        const setsSource = rawTemplate.sets ?? rawTemplate.exercises
        return {
          id: toStringValue(rawTemplate.id, randomId()),
          name,
          sets: coerceTemplateSets(setsSource), // Handle both formats
          createdAt: toNumberValue(rawTemplate.createdAt, Date.now()),
        }
      })
      .filter((template): template is WorkoutTemplate => template !== null)
      .filter((t) => t.name && t.sets.length > 0)
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
      sets: (t.sets || []).map((s) => ({
        id: s.id || randomId(),
        exercise: s.exercise,
        reps: s.reps,
        weightKg: s.weightKg,
      })),
      createdAt: t.createdAt || Date.now(),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // ignore
  }
}

export const createTemplateLocal = (input: {
  name: string
  sets: TemplateSet[]
}): WorkoutTemplate => {
  return {
    id: randomId(),
    name: (input.name || '').trim(),
    sets: input.sets.map((s) => ({
      ...s,
      id: s.id || randomId(),
    })),
    createdAt: Date.now(),
  }
}
