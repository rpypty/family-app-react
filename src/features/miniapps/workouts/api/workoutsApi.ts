import type { Workout, WorkoutSet, WorkoutTemplate } from '../types'
import { apiFetch } from '../../../../shared/api/client'

type ApiWorkoutSet = {
  id: string
  exercise: string
  weight_kg: number
  reps: number
}

type ApiWorkout = {
  id: string
  date: string
  name: string
  sets: ApiWorkoutSet[]
  created_at: string
  updated_at: string
}

type ApiTemplateExercise = {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
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

const mapSet = (set: ApiWorkoutSet, createdAt: number): WorkoutSet => ({
  id: set.id,
  exercise: set.exercise,
  weightKg: set.weight_kg,
  reps: set.reps,
  createdAt,
})

const mapWorkout = (workout: ApiWorkout): Workout => {
  const createdAt = new Date(workout.created_at).getTime()
  return {
    id: workout.id,
    date: workout.date,
    name: workout.name,
    createdAt,
    sets: workout.sets.map((set) => mapSet(set, createdAt)),
  }
}

const mapTemplate = (template: ApiWorkoutTemplate): WorkoutTemplate => ({
  id: template.id,
  name: template.name,
  exercises: template.exercises.map((ex) => ({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    weight: Number(ex.weight) || 0,
  })),
  createdAt: new Date(template.created_at).getTime(),
})

// Workout API
export const listWorkouts = async (): Promise<Workout[]> => {
  const response = await apiFetch<WorkoutListResponse>('/gym/workouts')
  return response.items.map(mapWorkout)
}

export const createWorkout = async (workout: Omit<Workout, 'id' | 'createdAt'>): Promise<Workout> => {
  const payload = {
    date: workout.date,
    name: workout.name,
    sets: workout.sets.map((set) => ({
      exercise: set.exercise,
      weight_kg: set.weightKg,
      reps: set.reps,
    })),
  }
  const response = await apiFetch<ApiWorkout>('/gym/workouts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapWorkout(response)
}

export const updateWorkout = async (workout: Workout): Promise<Workout> => {
  const payload = {
    date: workout.date,
    name: workout.name,
    sets: workout.sets.map((set) => ({
      exercise: set.exercise,
      weight_kg: set.weightKg,
      reps: set.reps,
    })),
  }
  const response = await apiFetch<ApiWorkout>(`/gym/workouts/${workout.id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return mapWorkout(response)
}

export const deleteWorkout = async (workoutId: string): Promise<void> => {
  await apiFetch<void>(`/gym/workouts/${workoutId}`, { method: 'DELETE' })
}

// Template API
export const listTemplates = async (): Promise<WorkoutTemplate[]> => {
  const response = await apiFetch<TemplateListResponse>('/gym/templates')
  return response.items.map(mapTemplate)
}

export const createTemplate = async (
  template: Omit<WorkoutTemplate, 'id' | 'createdAt'>
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

// Exercise API
export const listExercises = async (): Promise<string[]> => {
  const response = await apiFetch<ExerciseListResponse>('/gym/exercises')
  return response.exercises
}
