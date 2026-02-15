import type { WorkoutTemplate, TemplateSet } from '../types'

const STORAGE_KEY = 'workouts:templates:v1'

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
  
  for (const item of raw) {
    // Current format: {id?, exercise, reps, weightKg}
    if (item && typeof item === 'object' && 'exercise' in item) {
      const set: TemplateSet = {
        id: (item as any).id || randomId(),
        exercise: String((item as any).exercise || '').trim(),
        reps: Math.max(1, Number((item as any).reps) || 8),
        weightKg: Number((item as any).weightKg) || 0,
      }
      if (set.exercise) out.push(set)
    }
    // Legacy format: {name, sets, reps, weight} - expand to multiple sets
    else if (item && typeof item === 'object' && 'name' in item && 'sets' in item) {
      const name = String((item as any).name || '').trim()
      const setCount = Math.max(1, Number((item as any).sets) || 3)
      const reps = Math.max(1, Number((item as any).reps) || 8)
      const weight = Number((item as any).weight) || 0
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
      .map((t) => ({
        id: (t as any)?.id || randomId(),
        name: String((t as any)?.name || '').trim(),
        sets: coerceTemplateSets((t as any)?.sets || (t as any)?.exercises), // Handle both formats
        createdAt: Number((t as any)?.createdAt) || Date.now(),
      }))
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
      sets: (t.sets || []).map(s => ({
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
    sets: input.sets.map(s => ({
      ...s,
      id: s.id || randomId(),
    })),
    createdAt: Date.now(),
  }
}
