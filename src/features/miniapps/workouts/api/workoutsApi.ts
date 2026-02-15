import type { Workout, WorkoutSet } from '../types'
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

type WorkoutListResponse = {
  items: ApiWorkout[]
  total: number
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

export const listExercises = async (): Promise<string[]> => {
  const response = await apiFetch<ExerciseListResponse>('/gym/exercises')
  return response.exercises
}
