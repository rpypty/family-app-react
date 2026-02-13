import type { GymEntry, Workout, WorkoutSet, WorkoutTemplate } from '../types'
import * as gymApi from './gymApi'

const ENTRIES_KEY = 'gym:entries:v1'
const WORKOUTS_KEY = 'gym:workouts:v1'
const EXERCISES_KEY = 'gym:exercises:v1'
const TEMPLATES_KEY = 'gym:templates:v1'
const PENDING_SYNC_KEY = 'gym:pendingSync:v1'
const LAST_SYNC_KEY = 'gym:lastSync:v1'

// Offline sync queue
type PendingAction =
  | { type: 'createEntry'; entry: GymEntry }
  | { type: 'updateEntry'; entry: GymEntry }
  | { type: 'deleteEntry'; id: string }
  | { type: 'createWorkout'; workout: Workout }
  | { type: 'updateWorkout'; workout: Workout }
  | { type: 'deleteWorkout'; id: string }
  | { type: 'createTemplate'; template: WorkoutTemplate }
  | { type: 'updateTemplate'; template: WorkoutTemplate }
  | { type: 'deleteTemplate'; id: string }

let syncInProgress = false

export function exerciseKey(name: string): string {
  return (name || '').trim().toLowerCase()
}

function uniqueExercises(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const n of names) {
    const trimmed = (n || '').trim()
    if (!trimmed) continue
    const key = exerciseKey(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  out.sort((a, b) => a.localeCompare(b))
  return out
}

function uniqueTemplateExercisesInOrder(
  items: Array<{ name: string; reps: number; sets: number; weights?: number[] }>
): Array<{ name: string; reps: number; sets: number; weights?: number[] }> {
  const seen = new Set<string>()
  const out: Array<{ name: string; reps: number; sets: number; weights?: number[] }> = []
  for (const it of items || []) {
    const name = String((it as any)?.name || '').trim()
    if (!name) continue
    const k = exerciseKey(name)
    if (seen.has(k)) continue
    seen.add(k)
    const reps = Math.max(1, Number((it as any)?.reps) || 0) || 8
    const sets = Math.max(1, Number((it as any)?.sets) || 0) || 3
    const rawWeights = (it as any)?.weights
    let weights: number[] | undefined
    if (Array.isArray(rawWeights)) {
      weights = rawWeights.map((w: any) => Number(w) || 0).slice(0, sets)
      // If weights shorter than sets, pad with zeros
      while (weights.length < sets) weights.push(0)
    }
    out.push({ name, reps, sets, weights })
  }
  return out
}

function coerceTemplateExercises(raw: unknown): Array<{ name: string; reps: number; sets: number; weights?: number[] }> {
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

  // Current: {name,reps,sets,weights?}[] (or slightly different shapes)
  return uniqueTemplateExercisesInOrder(
    (raw as any[]).map((x) => ({
      name: String(x?.name || x?.exercise || ''),
      reps: Number(x?.reps) || 0,
      sets: Number(x?.sets) || 0,
      weights: Array.isArray(x?.weights) ? x.weights.map((w: any) => Number(w) || 0) : undefined,
    }))
  )
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function getJSON<T>(key: string): Promise<T | null> {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function setJSON(key: string, value: unknown): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

// Pending sync actions
async function loadPendingActions(): Promise<PendingAction[]> {
  const data = await getJSON<PendingAction[]>(PENDING_SYNC_KEY)
  return Array.isArray(data) ? data : []
}

async function savePendingActions(actions: PendingAction[]): Promise<void> {
  await setJSON(PENDING_SYNC_KEY, actions)
}

async function addPendingAction(action: PendingAction): Promise<void> {
  const actions = await loadPendingActions()

  if (action.type === 'updateWorkout') {
    const idx = actions.findIndex(
      (a) => a.type === 'createWorkout' && a.workout.id === action.workout.id
    )
    if (idx >= 0) {
      actions[idx] = { type: 'createWorkout', workout: action.workout }
      await savePendingActions(actions)
      return
    }
  }

  if (action.type === 'deleteWorkout') {
    const createdIdx = actions.findIndex(
      (a) => a.type === 'createWorkout' && a.workout.id === action.id
    )
    if (createdIdx >= 0) {
      actions.splice(createdIdx, 1)
      await savePendingActions(actions)
      return
    }

    const filtered = actions.filter(
      (a) => !(a.type === 'updateWorkout' && a.workout.id === action.id)
    )
    filtered.push(action)
    await savePendingActions(filtered)
    return
  }

  actions.push(action)
  await savePendingActions(actions)
}

// Sync with backend
export async function syncWithBackend(): Promise<void> {
  if (syncInProgress) return
  syncInProgress = true

  try {
    const actions = await loadPendingActions()
    if (actions.length === 0) {
      // Fetch from backend if no pending changes
      try {
        const [entries, workouts, templates] = await Promise.all([
          gymApi.listGymEntries({ limit: 1000 }),
          gymApi.listWorkouts({ limit: 1000 }),
          gymApi.listTemplates(),
        ])
        await saveGymEntries(entries)
        await saveWorkouts(workouts)
        await saveWorkoutTemplates(templates)
        await setJSON(LAST_SYNC_KEY, Date.now())
      } catch (error) {
        console.error('Failed to fetch from backend:', error)
      }
      return
    }

    const needsRefresh = {
      entries: actions.some((a) => a.type === 'createEntry' || a.type === 'updateEntry' || a.type === 'deleteEntry'),
      workouts: actions.some((a) => a.type === 'createWorkout' || a.type === 'updateWorkout' || a.type === 'deleteWorkout'),
      templates: actions.some((a) => a.type === 'createTemplate' || a.type === 'updateTemplate' || a.type === 'deleteTemplate'),
    }

    // Process pending actions
    const remaining: PendingAction[] = []
    for (const action of actions) {
      try {
        await processPendingAction(action)
      } catch (error) {
        console.error('Failed to sync action:', action, error)
        remaining.push(action)
      }
    }

    await savePendingActions(remaining)

    if (remaining.length === 0) {
      try {
        const fetches: Array<Promise<void>> = []
        if (needsRefresh.entries) {
          fetches.push(
            (async () => {
              const entries = await gymApi.listGymEntries({ limit: 1000 })
              await saveGymEntries(entries)
            })()
          )
        }
        if (needsRefresh.workouts) {
          fetches.push(
            (async () => {
              const workouts = await gymApi.listWorkouts({ limit: 1000 })
              await saveWorkouts(workouts)
            })()
          )
        }
        if (needsRefresh.templates) {
          fetches.push(
            (async () => {
              const templates = await gymApi.listTemplates()
              await saveWorkoutTemplates(templates)
            })()
          )
        }
        if (fetches.length > 0) {
          await Promise.all(fetches)
        }
      } catch (error) {
        console.error('Failed to refresh from backend:', error)
      }
    }

    await setJSON(LAST_SYNC_KEY, Date.now())
  } finally {
    syncInProgress = false
  }
}

export async function refreshFromBackend(): Promise<{
  entries: GymEntry[]
  workouts: Workout[]
  templates: WorkoutTemplate[]
  exercises: string[]
} | null> {
  try {
    const [entries, workouts, templates, exercises] = await Promise.all([
      gymApi.listGymEntries({ limit: 1000 }),
      gymApi.listWorkouts({ limit: 1000 }),
      gymApi.listTemplates(),
      gymApi.listExercises(),
    ])
    await saveGymEntries(entries)
    await saveWorkouts(workouts)
    await saveWorkoutTemplates(templates)
    await saveExercises(exercises)
    await setJSON(LAST_SYNC_KEY, Date.now())
    return { entries, workouts, templates, exercises }
  } catch (error) {
    console.error('Failed to refresh from backend:', error)
    return null
  }
}

async function processPendingAction(action: PendingAction): Promise<void> {
  switch (action.type) {
    case 'createEntry': {
      const serverEntry = await gymApi.createGymEntry(action.entry)
      // Replace local entry with server entry
      const entries = await loadGymEntries()
      const index = entries.findIndex((e) => e.id === action.entry.id)
      if (index >= 0) {
        entries[index] = serverEntry
        await saveGymEntries(entries)
      }
      break
    }
    case 'updateEntry': {
      const serverEntry = await gymApi.updateGymEntry(action.entry)
      const entries = await loadGymEntries()
      const index = entries.findIndex((e) => e.id === action.entry.id)
      if (index >= 0) {
        entries[index] = serverEntry
        await saveGymEntries(entries)
      }
      break
    }
    case 'deleteEntry':
      await gymApi.deleteGymEntry(action.id)
      break
    case 'createWorkout': {
      const serverWorkout = await gymApi.createWorkout(action.workout)
      // Replace local workout with server workout
      const workouts = await loadWorkouts()
      const index = workouts.findIndex((w) => w.id === action.workout.id)
      if (index >= 0) {
        workouts[index] = serverWorkout
        await saveWorkouts(workouts)
      }
      break
    }
    case 'updateWorkout': {
      const serverWorkout = await gymApi.updateWorkout(action.workout)
      const workouts = await loadWorkouts()
      const index = workouts.findIndex((w) => w.id === action.workout.id)
      if (index >= 0) {
        workouts[index] = serverWorkout
        await saveWorkouts(workouts)
      }
      break
    }
    case 'deleteWorkout':
      await gymApi.deleteWorkout(action.id)
      break
    case 'createTemplate': {
      const serverTemplate = await gymApi.createTemplate(action.template)
      // Replace local template with server template
      const templates = await loadWorkoutTemplates()
      const index = templates.findIndex((t) => t.id === action.template.id)
      if (index >= 0) {
        templates[index] = serverTemplate
        await saveWorkoutTemplates(templates)
      }
      break
    }
    case 'updateTemplate': {
      const serverTemplate = await gymApi.updateTemplate(action.template)
      const templates = await loadWorkoutTemplates()
      const index = templates.findIndex((t) => t.id === action.template.id)
      if (index >= 0) {
        templates[index] = serverTemplate
        await saveWorkoutTemplates(templates)
      }
      break
    }
    case 'deleteTemplate':
      await gymApi.deleteTemplate(action.id)
      break
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  return await getJSON<number>(LAST_SYNC_KEY)
}

// Local storage operations
export async function loadGymEntries(): Promise<GymEntry[]> {
  const data = await getJSON<GymEntry[]>(ENTRIES_KEY)
  return Array.isArray(data) ? data : []
}

export async function saveGymEntries(entries: GymEntry[]): Promise<boolean> {
  return setJSON(ENTRIES_KEY, entries)
}

export async function loadWorkouts(): Promise<Workout[]> {
  const data = await getJSON<Workout[]>(WORKOUTS_KEY)
  return Array.isArray(data) ? data : []
}

export async function saveWorkouts(workouts: Workout[]): Promise<boolean> {
  return setJSON(WORKOUTS_KEY, workouts)
}

export async function loadExercises(): Promise<string[]> {
  const data = await getJSON<string[]>(EXERCISES_KEY)
  return Array.isArray(data) ? uniqueExercises(data) : []
}

export async function saveExercises(exercises: string[]): Promise<boolean> {
  return setJSON(EXERCISES_KEY, uniqueExercises(exercises))
}

export async function loadWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const data = await getJSON<WorkoutTemplate[]>(TEMPLATES_KEY)
  const list = Array.isArray(data) ? data : []
  return list
    .map((t) => ({
      id: (t as any)?.id || randomId(),
      name: String((t as any)?.name || '').trim(),
      exercises: coerceTemplateExercises((t as any)?.exercises),
      createdAt: Number((t as any)?.createdAt) || Date.now(),
    }))
    .filter((t) => t.name)
}

export async function saveWorkoutTemplates(templates: WorkoutTemplate[]): Promise<boolean> {
  return setJSON(
    TEMPLATES_KEY,
    (templates || []).map((t) => ({
      id: t.id,
      name: (t.name || '').trim(),
      exercises: uniqueTemplateExercisesInOrder((t.exercises || []) as any),
      createdAt: t.createdAt || Date.now(),
    }))
  )
}

// CRUD operations with offline support
export async function createGymEntryWithSync(input: {
  date: string
  exercise: string
  weightKg: number
  reps: number
}): Promise<GymEntry> {
  const entry = createGymEntry(input)
  const entries = await loadGymEntries()
  entries.push(entry)
  await saveGymEntries(entries)
  await addPendingAction({ type: 'createEntry', entry })
  syncWithBackend() // Fire and forget
  return entry
}

export async function updateGymEntryWithSync(entry: GymEntry): Promise<void> {
  const entries = await loadGymEntries()
  const index = entries.findIndex((e) => e.id === entry.id)
  if (index >= 0) {
    entries[index] = entry
    await saveGymEntries(entries)
    await addPendingAction({ type: 'updateEntry', entry })
    syncWithBackend()
  }
}

export async function deleteGymEntryWithSync(id: string): Promise<void> {
  const entries = await loadGymEntries()
  const filtered = entries.filter((e) => e.id !== id)
  await saveGymEntries(filtered)
  await addPendingAction({ type: 'deleteEntry', id })
  syncWithBackend()
}

export async function createWorkoutWithSync(input: {
  date: string
  name: string
  sets: WorkoutSet[]
}): Promise<Workout> {
  const localWorkout: Workout = {
    id: randomId(),
    date: input.date,
    name: input.name,
    sets: input.sets,
    createdAt: Date.now(),
  }
  
  // Try to create on backend immediately
  try {
    const serverWorkout = await gymApi.createWorkout(localWorkout)
    const workouts = await loadWorkouts()
    workouts.push(serverWorkout)
    await saveWorkouts(workouts)
    return serverWorkout
  } catch (error) {
    // If offline, save locally and queue for sync
    console.warn('Failed to create workout on server, saving locally:', error)
    const workouts = await loadWorkouts()
    workouts.push(localWorkout)
    await saveWorkouts(workouts)
    await addPendingAction({ type: 'createWorkout', workout: localWorkout })
    syncWithBackend()
    return localWorkout
  }
}

export async function updateWorkoutWithSync(workout: Workout): Promise<void> {
  const workouts = await loadWorkouts()
  const index = workouts.findIndex((w) => w.id === workout.id)
  if (index >= 0) {
    workouts[index] = workout
    await saveWorkouts(workouts)
    await addPendingAction({ type: 'updateWorkout', workout })
    syncWithBackend()
  }
}

export async function deleteWorkoutWithSync(id: string): Promise<void> {
  const workouts = await loadWorkouts()
  const filtered = workouts.filter((w) => w.id !== id)
  await saveWorkouts(filtered)
  await addPendingAction({ type: 'deleteWorkout', id })
  syncWithBackend()
}

export async function createTemplateWithSync(input: {
  name: string
  exercises: Array<{ name: string; reps: number; sets: number; weights?: number[] }>
}): Promise<WorkoutTemplate> {
  const template = createWorkoutTemplate(input)
  const templates = await loadWorkoutTemplates()
  templates.push(template)
  await saveWorkoutTemplates(templates)
  await addPendingAction({ type: 'createTemplate', template })
  syncWithBackend()
  return template
}

export async function updateTemplateWithSync(template: WorkoutTemplate): Promise<void> {
  const templates = await loadWorkoutTemplates()
  const index = templates.findIndex((t) => t.id === template.id)
  if (index >= 0) {
    templates[index] = template
    await saveWorkoutTemplates(templates)
    await addPendingAction({ type: 'updateTemplate', template })
    syncWithBackend()
  }
}

export async function deleteTemplateWithSync(id: string): Promise<void> {
  const templates = await loadWorkoutTemplates()
  const filtered = templates.filter((t) => t.id !== id)
  await saveWorkoutTemplates(filtered)
  await addPendingAction({ type: 'deleteTemplate', id })
  syncWithBackend()
}

// Helper functions
export function createWorkoutTemplate(input: {
  name: string
  exercises: Array<{ name: string; reps: number; sets: number; weights?: number[] }>
}): WorkoutTemplate {
  return {
    id: randomId(),
    name: (input.name || '').trim(),
    exercises: uniqueTemplateExercisesInOrder((input.exercises || []) as any),
    createdAt: Date.now(),
  }
}

export function createGymEntry(input: {
  date: string
  exercise: string
  weightKg: number
  reps: number
}): GymEntry {
  return {
    id: randomId(),
    date: input.date,
    exercise: (input.exercise || '').trim(),
    weightKg: Number.isFinite(input.weightKg) ? input.weightKg : 0,
    reps: Number.isFinite(input.reps) ? input.reps : 0,
    createdAt: Date.now(),
  }
}

export function createWorkout(input: { date: string; name?: string }): Workout {
  return {
    id: randomId(),
    date: input.date,
    name: (input.name || 'Workout').trim() || 'Workout',
    createdAt: Date.now(),
    sets: [],
  }
}

export function createWorkoutSet(input: {
  exercise: string
  weightKg: number
  reps: number
}): WorkoutSet {
  return {
    id: randomId(),
    exercise: (input.exercise || '').trim(),
    weightKg: Number.isFinite(input.weightKg) ? input.weightKg : 0,
    reps: Number.isFinite(input.reps) ? input.reps : 0,
    createdAt: Date.now(),
  }
}

export function workoutLabel(w: Workout): string {
  const n = (w.name || 'Workout').trim() || 'Workout'
  return `${w.date} · ${n}`
}

export function flattenWorkoutsToEntries(workouts: Workout[]): GymEntry[] {
  const out: GymEntry[] = []
  for (const w of workouts) {
    for (const s of w.sets || []) {
      out.push({
        id: `${w.id}:${s.id}`,
        date: w.date,
        exercise: s.exercise,
        weightKg: s.weightKg,
        reps: s.reps,
        createdAt: s.createdAt,
      })
    }
  }
  return out
}

export function migrateEntriesToWorkouts(entries: GymEntry[]): Workout[] {
  // Group by date, keep stable ordering by createdAt
  const byDate = new Map<string, GymEntry[]>()
  for (const e of entries) {
    const d = (e.date || '').trim()
    if (!d) continue
    const list = byDate.get(d) || []
    list.push(e)
    byDate.set(d, list)
  }

  const dates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  const workouts: Workout[] = []

  for (const date of dates) {
    const list = byDate.get(date) || []
    list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    const w: Workout = {
      id: randomId(),
      date,
      name: 'Workout',
      createdAt: list[0]?.createdAt ?? Date.now(),
      sets: list.map((e) => ({
        id: randomId(),
        exercise: (e.exercise || '').trim(),
        weightKg: Number(e.weightKg) || 0,
        reps: Number(e.reps) || 0,
        createdAt: e.createdAt ?? Date.now(),
      })),
    }
    workouts.push(w)
  }

  return workouts
}

