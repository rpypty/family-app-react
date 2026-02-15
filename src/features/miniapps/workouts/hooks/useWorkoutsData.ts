import { useEffect, useMemo, useState } from 'react'
import type { ExerciseMeta, Workout, WorkoutTemplate, TemplateExercise } from '../types'
import {
  createWorkout as createWorkoutApi,
  deleteWorkout as deleteWorkoutApi,
  listExercises as listExercisesApi,
  listWorkouts as listWorkoutsApi,
  updateWorkout as updateWorkoutApi,
  listTemplates as listTemplatesApi,
  createTemplate as createTemplateApi,
  updateTemplate as updateTemplateApi,
  deleteTemplate as deleteTemplateApi,
} from '../api/workoutsApi'
import { loadExerciseMeta, saveExerciseMeta } from '../store/exerciseMetaStore'
import {
  addLocalExercise,
  loadLocalExercises,
  replaceLocalExercise,
  saveLocalExercises,
} from '../store/exerciseListStore'
import { loadTemplates, saveTemplates } from '../store/templateStore'
import { loadWorkouts as loadWorkoutsStore, saveWorkouts as saveWorkoutsStore, createWorkoutLocal } from '../store/workoutsStore'
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
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Always load from local storage first for instant UI
      const localWorkouts = loadWorkoutsStore()
      const localTemplates = loadTemplates()
      if (localWorkouts.length > 0) {
        setWorkouts(sortWorkouts(localWorkouts))
      }
      if (localTemplates.length > 0) {
        setTemplates(localTemplates)
      }

      try {
        const [workoutsResponse, exerciseResponse, templatesResponse] = await Promise.all([
          listWorkoutsApi(),
          listExercisesApi(),
          listTemplatesApi(),
        ])
        if (!alive) return
        
        // Update with server data and save to local storage
        setWorkouts(sortWorkouts(workoutsResponse))
        saveWorkoutsStore(workoutsResponse)
        
        setBackendExercises(Array.isArray(exerciseResponse) ? exerciseResponse : [])
        
        const validTemplates = Array.isArray(templatesResponse) ? templatesResponse : []
        setTemplates(validTemplates)
        saveTemplates(validTemplates)
      } catch (error) {
        console.warn('Workouts load failed, using local data', error)
        // Load from local storage as fallback
        if (!alive) return
        if (localWorkouts.length === 0) {
          setWorkouts(loadWorkoutsStore())
        }
        if (localTemplates.length === 0) {
          setTemplates(loadTemplates())
        }
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
    // Create workout locally first for instant UI feedback
    const localWorkout = createWorkoutLocal({
      date: (date || todayISO()).trim(),
      name: (name || 'Тренировка').trim() || 'Тренировка',
      sets: [],
    })
    
    const newWorkouts = sortWorkouts([localWorkout, ...workouts])
    setWorkouts(newWorkouts)
    saveWorkoutsStore(newWorkouts)
    
    // Try to sync with server in background
    try {
      const serverWorkout = await createWorkoutApi({
        date: localWorkout.date,
        name: localWorkout.name,
        sets: [],
      })
      
      // Replace local workout with server workout
      const updatedWorkouts = sortWorkouts(
        newWorkouts.map((w) => (w.id === localWorkout.id ? serverWorkout : w))
      )
      setWorkouts(updatedWorkouts)
      saveWorkoutsStore(updatedWorkouts)
      return serverWorkout
    } catch (error) {
      console.warn('Failed to sync workout with server, keeping local copy', error)
      return localWorkout
    }
  }

  const updateWorkout = async (workout: Workout) => {
    // Update locally first
    const updatedWorkouts = sortWorkouts(workouts.map((w) => (w.id === workout.id ? workout : w)))
    setWorkouts(updatedWorkouts)
    saveWorkoutsStore(updatedWorkouts)
    
    // Try to sync with server
    try {
      const serverWorkout = await updateWorkoutApi(workout)
      const syncedWorkouts = sortWorkouts(updatedWorkouts.map((w) => (w.id === serverWorkout.id ? serverWorkout : w)))
      setWorkouts(syncedWorkouts)
      saveWorkoutsStore(syncedWorkouts)
      return serverWorkout
    } catch (error) {
      console.warn('Failed to sync workout update with server, keeping local copy', error)
      return workout
    }
  }

  const deleteWorkout = async (workoutId: string) => {
    // Delete locally first
    const updatedWorkouts = workouts.filter((w) => w.id !== workoutId)
    setWorkouts(updatedWorkouts)
    saveWorkoutsStore(updatedWorkouts)
    
    // Try to sync with server
    try {
      await deleteWorkoutApi(workoutId)
    } catch (error) {
      console.warn('Failed to sync workout deletion with server, kept local deletion', error)
    }
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

  const createTemplate = async (name: string, exercises: TemplateExercise[]) => {
    try {
      const template = await createTemplateApi({ name, exercises })
      const newTemplates = [template, ...templates]
      setTemplates(newTemplates)
      saveTemplates(newTemplates)
      return template
    } catch (error) {
      console.warn('Failed to create template on server, saving locally', error)
      // Fallback to local storage
      const localTemplate = {
        id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name,
        exercises,
        createdAt: Date.now(),
      }
      const newTemplates = [localTemplate, ...templates]
      setTemplates(newTemplates)
      saveTemplates(newTemplates)
      return localTemplate
    }
  }

  const updateTemplate = async (template: WorkoutTemplate) => {
    const updatedTemplates = templates.map((t) => (t.id === template.id ? template : t))
    try {
      const updated = await updateTemplateApi(template)
      const serverTemplates = templates.map((t) => (t.id === updated.id ? updated : t))
      setTemplates(serverTemplates)
      saveTemplates(serverTemplates)
      return updated
    } catch (error) {
      console.warn('Failed to update template on server, saving locally', error)
      setTemplates(updatedTemplates)
      saveTemplates(updatedTemplates)
      return template
    }
  }

  const deleteTemplate = async (templateId: string) => {
    const filteredTemplates = templates.filter((t) => t.id !== templateId)
    try {
      await deleteTemplateApi(templateId)
      setTemplates(filteredTemplates)
      saveTemplates(filteredTemplates)
    } catch (error) {
      console.warn('Failed to delete template on server, deleting locally', error)
      setTemplates(filteredTemplates)
      saveTemplates(filteredTemplates)
    }
  }

  return {
    loading,
    workouts,
    exercises,
    exerciseMeta,
    templates,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    addExercise,
    upsertExerciseMeta,
    renameExercise,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
