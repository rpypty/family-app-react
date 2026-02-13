import type { GymEntry, Workout, WorkoutTemplate } from '../types'
import { apiFetch } from '../../../../shared/api/client'

// API types
type ApiGymEntry = {
  id: string
  family_id: string
  user_id: string
  date: string
  exercise: string
  weight_kg: number
  reps: number
  created_at: string
  updated_at: string
}

type ApiWorkoutSet = {
  id: string
  exercise: string
  weight_kg: number
  reps: number
}

type ApiWorkout = {
  id: string
  family_id: string
  user_id: string
  date: string
  name: string
  sets: ApiWorkoutSet[]
  created_at: string
  updated_at: string
}

type ApiTemplateExercise = {
  id: string
  name: string
  reps: number
  sets: number
  weights?: number[]
}

type ApiWorkoutTemplate = {
  id: string
  family_id: string
  user_id: string
  name: string
  exercises: ApiTemplateExercise[]
  created_at: string
  updated_at: string
}

type GymEntryListResponse = {
  items: ApiGymEntry[]
  total: number
}

type WorkoutListResponse = {
  items: ApiWorkout[]
  total: number
}

type TemplateListResponse = {
  items: ApiWorkoutTemplate[]
}

type ExerciseListResponse = {
  exercises: string[]
}

export type GymEntryListParams = {
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export type WorkoutListParams = {
  from?: string
  to?: string
  limit?: number
  offset?: number
}

// Mappers
const mapGymEntry = (entry: ApiGymEntry): GymEntry => ({
  id: entry.id,
  date: entry.date,
  exercise: entry.exercise,
  weightKg: entry.weight_kg,
  reps: entry.reps,
  createdAt: new Date(entry.created_at).getTime(),
})

const mapWorkout = (workout: ApiWorkout): Workout => ({
  id: workout.id,
  date: workout.date,
  name: workout.name,
  sets: workout.sets.map((set) => ({
    id: set.id,
    exercise: set.exercise,
    weightKg: set.weight_kg,
    reps: set.reps,
    createdAt: new Date(workout.created_at).getTime(),
  })),
  createdAt: new Date(workout.created_at).getTime(),
})

const mapTemplate = (template: ApiWorkoutTemplate): WorkoutTemplate => ({
  id: template.id,
  name: template.name,
  exercises: template.exercises.map((ex) => ({
    name: ex.name,
    reps: ex.reps,
    sets: ex.sets,
    weights: Array.isArray((ex as any).weights) ? (ex as any).weights.map((w: any) => Number(w) || 0) : undefined,
  })),
  createdAt: new Date(template.created_at).getTime(),
})

// Query builder
const buildQuery = (params: GymEntryListParams | WorkoutListParams): string => {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  const query = search.toString()
  return query ? `?${query}` : ''
}

// GymEntry API
export const listGymEntriesPage = async (
  params: GymEntryListParams = {},
): Promise<{ items: GymEntry[]; total: number }> => {
  const response = await apiFetch<GymEntryListResponse>(`/gym/entries${buildQuery(params)}`)
  return {
    items: response.items.map(mapGymEntry),
    total: response.total,
  }
}

export const listGymEntries = async (params: GymEntryListParams = {}): Promise<GymEntry[]> => {
  const response = await listGymEntriesPage(params)
  return response.items
}

export const createGymEntry = async (entry: Omit<GymEntry, 'id' | 'createdAt'>): Promise<GymEntry> => {
  const response = await apiFetch<ApiGymEntry>('/gym/entries', {
    method: 'POST',
    body: JSON.stringify({
      date: entry.date,
      exercise: entry.exercise,
      weight_kg: entry.weightKg,
      reps: entry.reps,
    }),
  })
  return mapGymEntry(response)
}

export const updateGymEntry = async (entry: GymEntry): Promise<GymEntry> => {
  const response = await apiFetch<ApiGymEntry>(`/gym/entries/${entry.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: entry.date,
      exercise: entry.exercise,
      weight_kg: entry.weightKg,
      reps: entry.reps,
    }),
  })
  return mapGymEntry(response)
}

export const deleteGymEntry = async (entryId: string): Promise<void> => {
  await apiFetch<void>(`/gym/entries/${entryId}`, { method: 'DELETE' })
}

// Workout API
export const listWorkoutsPage = async (
  params: WorkoutListParams = {},
): Promise<{ items: Workout[]; total: number }> => {
  const response = await apiFetch<WorkoutListResponse>(`/gym/workouts${buildQuery(params)}`)
  return {
    items: response.items.map(mapWorkout),
    total: response.total,
  }
}

export const listWorkouts = async (params: WorkoutListParams = {}): Promise<Workout[]> => {
  const response = await listWorkoutsPage(params)
  return response.items
}

export const getWorkout = async (workoutId: string): Promise<Workout> => {
  const response = await apiFetch<ApiWorkout>(`/gym/workouts/${workoutId}`)
  return mapWorkout(response)
}

export const createWorkout = async (
  workout: Omit<Workout, 'id' | 'createdAt'>,
): Promise<Workout> => {
  const response = await apiFetch<ApiWorkout>('/gym/workouts', {
    method: 'POST',
    body: JSON.stringify({
      date: workout.date,
      name: workout.name,
      sets: workout.sets.map((set) => ({
        exercise: set.exercise,
        weight_kg: set.weightKg,
        reps: set.reps,
      })),
    }),
  })
  return mapWorkout(response)
}

export const updateWorkout = async (workout: Workout): Promise<Workout> => {
  const response = await apiFetch<ApiWorkout>(`/gym/workouts/${workout.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: workout.date,
      name: workout.name,
      sets: workout.sets.map((set) => ({
        exercise: set.exercise,
        weight_kg: set.weightKg,
        reps: set.reps,
      })),
    }),
  })
  return mapWorkout(response)
}

export const deleteWorkout = async (workoutId: string): Promise<void> => {
  await apiFetch<void>(`/gym/workouts/${workoutId}`, { method: 'DELETE' })
}

// WorkoutTemplate API
export const listTemplates = async (): Promise<WorkoutTemplate[]> => {
  const response = await apiFetch<TemplateListResponse>('/gym/templates')
  return response.items.map(mapTemplate)
}

export const createTemplate = async (
  template: Omit<WorkoutTemplate, 'id' | 'createdAt'>,
): Promise<WorkoutTemplate> => {
  const response = await apiFetch<ApiWorkoutTemplate>('/gym/templates', {
    method: 'POST',
    body: JSON.stringify({
      name: template.name,
      exercises: template.exercises,
    }),
  })
  return mapTemplate(response)
}

export const updateTemplate = async (template: WorkoutTemplate): Promise<WorkoutTemplate> => {
  const response = await apiFetch<ApiWorkoutTemplate>(`/gym/templates/${template.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: template.name,
      exercises: template.exercises,
    }),
  })
  return mapTemplate(response)
}

export const deleteTemplate = async (templateId: string): Promise<void> => {
  await apiFetch<void>(`/gym/templates/${templateId}`, { method: 'DELETE' })
}

// Exercise list API
export const listExercises = async (): Promise<string[]> => {
  const response = await apiFetch<ExerciseListResponse>('/gym/exercises')
  return response.exercises
}
