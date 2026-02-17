import type { ExerciseMeta, ExerciseSeriesPoint, ExerciseSummary, WorkoutEntry } from '../types'
import { parseISODate } from './date'
import { exerciseKey } from './workout'

export const buildExerciseSummaries = (
  entries: WorkoutEntry[],
  metaMap: Record<string, ExerciseMeta>
): ExerciseSummary[] => {
  const byExercise = new Map<string, ExerciseSummary>()
  const prTracker = new Map<string, number>()

  for (const entry of entries) {
    const display = (entry.exercise || '').trim()
    if (!display) continue
    const key = exerciseKey(display)
    const meta = metaMap[key]
    const isWeightless = Boolean(meta?.isWeightless)
    const dt = parseISODate(entry.date)

    const existing = byExercise.get(key) || {
      key,
      name: meta?.name || display,
      note: meta?.note || '',
      isWeightless,
      totalSets: 0,
      lastDate: null,
      lastWeight: null,
      bestWeight: null,
      bestReps: null,
      lastReps: null,
      maxVolumeDay: null,
      prCount: 0,
      oneRepMax: null,
    }

    existing.totalSets += 1

    if (dt) {
      if (!existing.lastDate || dt.getTime() > existing.lastDate.getTime()) {
        existing.lastDate = dt
        if (!isWeightless) {
          existing.lastWeight = Number(entry.weightKg) || 0
        }
        existing.lastReps = Number(entry.reps) || 0
      }
    }

    const reps = Number(entry.reps) || 0
    if (existing.bestReps === null || reps > existing.bestReps) {
      existing.bestReps = reps
    }

    if (!isWeightless) {
      const weight = Number(entry.weightKg) || 0
      if (existing.bestWeight === null || weight > existing.bestWeight) {
        existing.bestWeight = weight
      }
      
      // Calculate 1RM using Epley formula: 1RM = weight × (1 + reps / 30)
      if (weight > 0 && reps > 0) {
        const estimated1RM = weight * (1 + reps / 30)
        if (existing.oneRepMax === null || estimated1RM > existing.oneRepMax) {
          existing.oneRepMax = estimated1RM
        }
      }
    }

    const score = isWeightless ? reps : (Number(entry.weightKg) || 0)
    const prevBest = prTracker.get(key) ?? -Infinity
    if (score > prevBest) {
      prTracker.set(key, score)
      existing.prCount += 1
    }

    byExercise.set(key, existing)
  }

  return Array.from(byExercise.values()).sort((a, b) => b.totalSets - a.totalSets)
}

export const computeSeries = (
  entries: WorkoutEntry[],
  exercise: string,
  isWeightless: boolean
): ExerciseSeriesPoint[] => {
  const key = exerciseKey(exercise)
  const byDate = new Map<string, ExerciseSeriesPoint>()

  for (const entry of entries) {
    if (exerciseKey(entry.exercise) !== key) continue
    const dt = parseISODate(entry.date)
    if (!dt) continue
    const iso = entry.date
    const existing = byDate.get(iso) || {
      date: dt,
      dateISO: iso,
      value: 0,
    }

    const value = isWeightless ? Number(entry.reps) || 0 : Number(entry.weightKg) || 0
    if (value > existing.value) {
      existing.value = value
    }

    byDate.set(iso, existing)
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
}

export const computeMaxVolumeByDay = (
  entries: WorkoutEntry[],
  exercise: string,
  isWeightless: boolean
): number | null => {
  const key = exerciseKey(exercise)
  const byDate = new Map<string, number>()
  for (const entry of entries) {
    if (exerciseKey(entry.exercise) !== key) continue
    const iso = entry.date
    const volume = isWeightless
      ? Number(entry.reps) || 0
      : (Number(entry.weightKg) || 0) * (Number(entry.reps) || 0)
    byDate.set(iso, (byDate.get(iso) || 0) + volume)
  }
  const values = Array.from(byDate.values())
  if (values.length === 0) return null
  return Math.max(...values)
}
