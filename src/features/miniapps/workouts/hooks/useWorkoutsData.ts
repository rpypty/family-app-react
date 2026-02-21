import { useEffect, useMemo, useState } from 'react'
import type { ExerciseMeta, Workout, WorkoutTemplate, TemplateSet } from '../types'
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
    void (async () => {
      // Local-first hydration: render UI from cache immediately.
      const localWorkouts = loadWorkoutsStore()
      const localTemplates = loadTemplates()
      if (!alive) return
      if (localWorkouts.length > 0) {
        setWorkouts(sortWorkouts(localWorkouts))
      } else {
        setWorkouts([])
      }
      if (localTemplates.length > 0) {
        setTemplates(localTemplates)
      } else {
        setTemplates([])
      }
      setLocalExercises(loadLocalExercises())
      setExerciseMeta(loadExerciseMeta())
      setLoading(false)

      // Network refresh happens in background and never blocks first paint.
      try {
        const [workoutsResponse, exerciseResponse, templatesResponse] = await Promise.all([
          listWorkoutsApi(),
          listExercisesApi(),
          listTemplatesApi(),
        ])
        if (!alive) return

        setWorkouts(sortWorkouts(workoutsResponse))
        saveWorkoutsStore(workoutsResponse)
        setBackendExercises(Array.isArray(exerciseResponse) ? exerciseResponse : [])

        const validTemplates = Array.isArray(templatesResponse) ? templatesResponse : []
        setTemplates(validTemplates)
        saveTemplates(validTemplates)
      } catch (error) {
        console.warn('Workouts load failed, using local data', error)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const exercises = useMemo(
    () => mergeExerciseLists(backendExercises, localExercises),
    [backendExercises, localExercises]
  )

  const createWorkout = async (date?: string, name?: string, templateId?: string) => {
    // Try to create on server first
    try {
      const serverWorkout = await createWorkoutApi({
        date: (date || todayISO()).trim(),
        name: (name || 'Тренировка').trim() || 'Тренировка',
        sets: [],
      }, templateId)
      
      // Add to state and save locally
      const newWorkouts = sortWorkouts([serverWorkout, ...workouts])
      setWorkouts(newWorkouts)
      saveWorkoutsStore(newWorkouts)
      return serverWorkout
    } catch (error) {
      console.warn('Failed to create workout on server, saving locally', error)
      // Fallback to local-only workout
      const localWorkout = createWorkoutLocal({
        date: (date || todayISO()).trim(),
        name: (name || 'Тренировка').trim() || 'Тренировка',
        sets: [],
      })
      const newWorkouts = sortWorkouts([localWorkout, ...workouts])
      setWorkouts(newWorkouts)
      saveWorkoutsStore(newWorkouts)
      return localWorkout
    }
  }

  const updateWorkout = async (workout: Workout) => {
    // Update locally first for instant UI feedback
    const updatedWorkouts = sortWorkouts(workouts.map((w) => (w.id === workout.id ? workout : w)))
    setWorkouts(updatedWorkouts)
    saveWorkoutsStore(updatedWorkouts)
    
    // Try to sync with server in background
    try {
      await updateWorkoutApi(workout)
      // No need to update state again - data is already current
      return workout
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

  const deleteExercise = (name: string) => {
    const key = exerciseKey(name)
    
    // Remove from local exercises
    const updatedLocal = localExercises.filter((ex) => exerciseKey(ex) !== key)
    setLocalExercises(updatedLocal)
    saveLocalExercises(updatedLocal)
    
    // Remove from backend exercises list (client-side only, backend keeps its data)
    const updatedBackend = backendExercises.filter((ex) => exerciseKey(ex) !== key)
    setBackendExercises(updatedBackend)
    
    // Remove from exercise meta
    setExerciseMeta((prev) => {
      const next = { ...prev }
      delete next[key]
      saveExerciseMeta(next)
      return next
    })
    
    // Remove from templates
    const updatedTemplates = templates.map((template) => ({
      ...template,
      sets: template.sets.filter((set) => exerciseKey(set.exercise) !== key),
    }))
    setTemplates(updatedTemplates)
    saveTemplates(updatedTemplates)
  }

  const createTemplate = async (name: string, sets: TemplateSet[]) => {
    try {
      const template = await createTemplateApi({ name, sets })
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
        sets,
        createdAt: Date.now(),
      }
      const newTemplates = [localTemplate, ...templates]
      setTemplates(newTemplates)
      saveTemplates(newTemplates)
      return localTemplate
    }
  }

  const updateTemplate = async (template: WorkoutTemplate) => {
    // Update locally first for instant UI feedback
    const updatedTemplates = templates.map((t) => (t.id === template.id ? template : t))
    setTemplates(updatedTemplates)
    saveTemplates(updatedTemplates)
    
    // Try to sync with server in background
    try {
      await updateTemplateApi(template)
      // No need to update state again - data is already current
      return template
    } catch (error) {
      console.warn('Failed to update template on server, keeping local copy', error)
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
    deleteExercise,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
