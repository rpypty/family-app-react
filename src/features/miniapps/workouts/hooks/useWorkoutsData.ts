import { useEffect, useMemo, useState } from 'react'
import type { ExerciseMeta, Workout } from '../types'
import {
  createWorkout as createWorkoutApi,
  deleteWorkout as deleteWorkoutApi,
  listExercises as listExercisesApi,
  listWorkouts as listWorkoutsApi,
  updateWorkout as updateWorkoutApi,
} from '../api/workoutsApi'
import { loadExerciseMeta, saveExerciseMeta } from '../store/exerciseMetaStore'
import {
  addLocalExercise,
  loadLocalExercises,
  replaceLocalExercise,
  saveLocalExercises,
} from '../store/exerciseListStore'
import { exerciseKey, sortWorkouts } from '../utils/workout'
import { todayISO } from '../utils/date'

const mergeExerciseLists = (backend: string[], local: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const key = exerciseKey(trimmed)
    if (seen.has(key)) return
    seen.add(key)
    out.push(trimmed)
  }
  backend.forEach(push)
  local.forEach(push)
  return out.sort((a, b) => a.localeCompare(b))
}

export function useWorkoutsData() {
  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [backendExercises, setBackendExercises] = useState<string[]>([])
  const [localExercises, setLocalExercises] = useState<string[]>([])
  const [exerciseMeta, setExerciseMeta] = useState<Record<string, ExerciseMeta>>({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [workoutsResponse, exerciseResponse] = await Promise.all([
          listWorkoutsApi(),
          listExercisesApi(),
        ])
        if (!alive) return
        setWorkouts(sortWorkouts(workoutsResponse))
        setBackendExercises(Array.isArray(exerciseResponse) ? exerciseResponse : [])
      } catch (error) {
        console.warn('Workouts load failed', error)
      }

      if (!alive) return
      setLocalExercises(loadLocalExercises())
      setExerciseMeta(loadExerciseMeta())
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const exercises = useMemo(
    () => mergeExerciseLists(backendExercises, localExercises),
    [backendExercises, localExercises]
  )

  const createWorkout = async (date?: string, name?: string) => {
    const workout = await createWorkoutApi({
      date: (date || todayISO()).trim(),
      name: (name || 'Тренировка').trim() || 'Тренировка',
      sets: [],
    })
    setWorkouts((prev) => sortWorkouts([workout, ...prev]))
    return workout
  }

  const updateWorkout = async (workout: Workout) => {
    const updated = await updateWorkoutApi(workout)
    setWorkouts((prev) => sortWorkouts(prev.map((w) => (w.id === updated.id ? updated : w))))
    return updated
  }

  const deleteWorkout = async (workoutId: string) => {
    await deleteWorkoutApi(workoutId)
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId))
  }

  const addExercise = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const existsInBackend = backendExercises.some((item) => exerciseKey(item) === exerciseKey(trimmed))
    if (existsInBackend) return
    const next = addLocalExercise(localExercises, trimmed)
    setLocalExercises(next)
    saveLocalExercises(next)
  }

  const upsertExerciseMeta = (meta: ExerciseMeta) => {
    const key = exerciseKey(meta.name)
    setExerciseMeta((prev) => {
      const next = {
        ...prev,
        [key]: { ...meta, updatedAt: Date.now() },
      }
      saveExerciseMeta(next)
      return next
    })
  }

  const renameExercise = async (from: string, to: string) => {
    const fromKey = exerciseKey(from)
    const toKey = exerciseKey(to)
    const trimmed = to.trim()
    if (!trimmed) return

    setExerciseMeta((prev) => {
      const next = { ...prev }
      const existing = next[fromKey]
      if (existing) {
        delete next[fromKey]
        next[toKey] = { ...existing, name: trimmed, updatedAt: Date.now() }
      }
      saveExerciseMeta(next)
      return next
    })

    setLocalExercises((prev) => {
      const updated = replaceLocalExercise(prev, from, trimmed)
      saveLocalExercises(updated)
      return updated
    })

    const updatedWorkouts = workouts.map((workout) => {
      let touched = false
      const nextSets = workout.sets.map((set) => {
        if (exerciseKey(set.exercise) !== fromKey) return set
        touched = true
        return { ...set, exercise: trimmed }
      })
      return touched ? { ...workout, sets: nextSets } : workout
    })

    setWorkouts(sortWorkouts(updatedWorkouts))

    const changed = updatedWorkouts.filter((w, idx) => w !== workouts[idx])
    if (changed.length === 0) return

    try {
      await Promise.all(changed.map((w) => updateWorkoutApi(w)))
    } catch (error) {
      console.warn('Rename sync failed', error)
    }
  }

  return {
    loading,
    workouts,
    exercises,
    exerciseMeta,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    addExercise,
    upsertExerciseMeta,
    renameExercise,
  }
}
