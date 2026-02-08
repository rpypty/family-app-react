import { useEffect, useMemo, useState } from 'react'
import {
  createWorkoutSet,
  exerciseKey,
  flattenWorkoutsToEntries,
  loadExercises,
  loadGymEntries,
  loadWorkoutTemplates,
  loadWorkouts,
  migrateEntriesToWorkouts,
  saveExercises,
  saveWorkouts,
  syncWithBackend,
  createWorkoutWithSync,
  updateWorkoutWithSync,
  deleteWorkoutWithSync,
  createTemplateWithSync,
  updateTemplateWithSync,
  deleteTemplateWithSync,
} from '../api/gymStore'
import type { TemplateExercise, Workout, WorkoutSet, WorkoutTemplate } from '../types'
import { parseISODate } from '../utils/dateUtils'
import { volume } from '../utils/metricsUtils'

export function useGymData() {
  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [exercises, setExercises] = useState<string[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Try to sync with backend first
      try {
        await syncWithBackend()
      } catch (error) {
        console.warn('Failed to sync with backend, using local data:', error)
      }

      const [loadedWorkouts, loadedEntries, loadedExercises, loadedTemplates] = await Promise.all([
        loadWorkouts(),
        loadGymEntries(),
        loadExercises(),
        loadWorkoutTemplates(),
      ])
      if (!alive) return

      const w = Array.isArray(loadedWorkouts) ? loadedWorkouts : []
      if (w.length > 0) {
        setWorkouts(w)
        setSelectedWorkoutId(w[0]?.id || '')
      } else {
        const legacyEntries = Array.isArray(loadedEntries) ? loadedEntries : []
        if (legacyEntries.length > 0) {
          const migrated = migrateEntriesToWorkouts(legacyEntries)
          setWorkouts(migrated)
          setSelectedWorkoutId(migrated[0]?.id || '')
          await saveWorkouts(migrated)
        } else {
          setWorkouts([])
          setSelectedWorkoutId('')
        }
      }

      setExercises(Array.isArray(loadedExercises) ? loadedExercises : [])
      setTemplates(Array.isArray(loadedTemplates) ? loadedTemplates : [])
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const sortedWorkouts = useMemo(() => {
    const copy = [...workouts]
    copy.sort((a, b) => {
      const da = parseISODate(a.date)?.getTime() ?? 0
      const db = parseISODate(b.date)?.getTime() ?? 0
      if (db !== da) return db - da
      return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    })
    return copy
  }, [workouts])

  const selectedWorkout = useMemo(() => {
    return workouts.find((w) => w.id === selectedWorkoutId) || null
  }, [workouts, selectedWorkoutId])

  const entries = useMemo(() => flattenWorkoutsToEntries(workouts), [workouts])

  const exerciseOptions = useMemo(() => {
    const merged = [...exercises, ...entries.map((e) => e.exercise)]
    const seen = new Set<string>()
    const out: string[] = []
    for (const n of merged) {
      const trimmed = (n || '').trim()
      if (!trimmed) continue
      const k = exerciseKey(trimmed)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(trimmed)
    }
    out.sort((a, b) => a.localeCompare(b))
    return out
  }, [exercises, entries])

  const selectedWorkoutGroups = useMemo(() => {
    const sets = workouts.find((w) => w.id === selectedWorkoutId)?.sets || []
    const map = new Map<
      string,
      {
        key: string
        exercise: string
        sets: WorkoutSet[]
        totalVolume: number
      }
    >()

    for (const s of sets) {
      const display = (s.exercise || '').trim()
      if (!display) continue
      const k = exerciseKey(display)
      const existing = map.get(k) || {
        key: k,
        exercise: display,
        sets: [],
        totalVolume: 0,
      }
      existing.exercise = display
      existing.sets = [...existing.sets, s]
      existing.totalVolume += volume(s)
      map.set(k, existing)
    }

    const groups = Array.from(map.values())
    for (const g of groups) {
      g.sets.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    }
    groups.sort((a, b) => b.totalVolume - a.totalVolume)
    return groups
  }, [selectedWorkoutId, workouts])

  const selectedWorkoutTotalVolume = useMemo(() => {
    const sets = workouts.find((w) => w.id === selectedWorkoutId)?.sets || []
    return sets.reduce((sum, s) => sum + volume(s), 0)
  }, [selectedWorkoutId, workouts])

  const addWorkout = async (date: string, name: string) => {
    const sets: WorkoutSet[] = []
    const w = await createWorkoutWithSync({ date, name, sets })
    const next = [w, ...workouts]
    setWorkouts(next)
    setSelectedWorkoutId(w.id)
    return w
  }

  const addSets = async (workoutId: string, exercise: string, weightKg: number, reps: number, count: number) => {
    const now = Date.now()
    const newSets = Array.from({ length: count }, (_, i) => {
      const s = createWorkoutSet({ exercise, weightKg, reps })
      return { ...s, createdAt: now + i }
    })

    const targetWorkout = workouts.find((w) => w.id === workoutId)
    if (!targetWorkout) return

    const updatedWorkout = {
      ...targetWorkout,
      sets: [...(targetWorkout.sets || []), ...newSets],
    }

    await updateWorkoutWithSync(updatedWorkout)

    const nextWorkouts = workouts.map((w) => (w.id === workoutId ? updatedWorkout : w))
    setWorkouts(nextWorkouts)
  }

  const updateWorkoutDate = async (workoutId: string, date: string) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId)
    if (!targetWorkout) return

    const updatedWorkout = { ...targetWorkout, date }
    await updateWorkoutWithSync(updatedWorkout)

    const nextWorkouts = workouts.map((w) => (w.id === workoutId ? updatedWorkout : w))
    setWorkouts(nextWorkouts)
  }

  const deleteWorkout = async (workoutId: string) => {
    await deleteWorkoutWithSync(workoutId)
    const next = workouts.filter((w) => w.id !== workoutId)
    setWorkouts(next)
    if (selectedWorkoutId === workoutId) {
      setSelectedWorkoutId(next[0]?.id || '')
    }
  }

  const deleteWorkoutSet = async (workoutId: string, setId: string) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId)
    if (!targetWorkout) return

    const updatedWorkout = {
      ...targetWorkout,
      sets: (targetWorkout.sets || []).filter((s) => s.id !== setId),
    }

    await updateWorkoutWithSync(updatedWorkout)

    const next = workouts.map((w) => (w.id === workoutId ? updatedWorkout : w))
    setWorkouts(next)
  }

  const deleteOneWorkoutSetBySignature = async (
    workoutId: string,
    exerciseName: string,
    repsValue: number,
    weightValue: number
  ) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId)
    if (!targetWorkout) return

    const exKey = exerciseKey(exerciseName)
    const sets = [...(targetWorkout.sets || [])]
    
    for (let i = sets.length - 1; i >= 0; i -= 1) {
      const s = sets[i]
      if (exerciseKey(s.exercise) !== exKey) continue
      if ((Number(s.reps) || 0) !== repsValue) continue
      if ((Number(s.weightKg) || 0) !== weightValue) continue
      sets.splice(i, 1)
      break
    }

    const updatedWorkout = { ...targetWorkout, sets }
    await updateWorkoutWithSync(updatedWorkout)

    const next = workouts.map((w) => (w.id === workoutId ? updatedWorkout : w))
    setWorkouts(next)
  }

  const addExercise = async (exercise: string) => {
    const k = exerciseKey(exercise)
    const exists = exercises.some((x) => exerciseKey(x) === k)
    if (!exists) {
      const next = [...exercises, exercise]
      setExercises(next)
      await saveExercises(next)
    }
  }

  const addTemplate = async (name: string, templateExercises: TemplateExercise[]) => {
    const t = await createTemplateWithSync({ name, exercises: templateExercises as any })
    const next = [t, ...templates]
    setTemplates(next)
    return t
  }

  const updateTemplate = async (templateId: string, name: string, templateExercises: TemplateExercise[]) => {
    const targetTemplate = templates.find((t) => t.id === templateId)
    if (!targetTemplate) return

    const updatedTemplate = {
      ...targetTemplate,
      name: (name || '').trim(),
      exercises: templateExercises,
    }

    await updateTemplateWithSync(updatedTemplate)

    const next = templates.map((t) => (t.id === templateId ? updatedTemplate : t))
    setTemplates(next)
  }

  const deleteTemplate = async (templateId: string) => {
    await deleteTemplateWithSync(templateId)
    const next = templates.filter((t) => t.id !== templateId)
    setTemplates(next)
  }

  return {
    loading,
    workouts,
    exercises,
    templates,
    selectedWorkoutId,
    setSelectedWorkoutId,
    sortedWorkouts,
    selectedWorkout,
    entries,
    exerciseOptions,
    selectedWorkoutGroups,
    selectedWorkoutTotalVolume,
    addWorkout,
    addSets,
    updateWorkoutDate,
    deleteWorkout,
    deleteWorkoutSet,
    deleteOneWorkoutSetBySignature,
    addExercise,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
