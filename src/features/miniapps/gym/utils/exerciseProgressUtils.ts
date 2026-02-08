import { exerciseKey } from '../api/gymStore'
import type { GymEntry } from '../types'
import { parseISODate } from './dateUtils'
import { volumeFromNumbers } from './metricsUtils'

export interface ExerciseProgressPoint {
  [key: string]: unknown
  date: Date
  dateISO: string
  sets: number
  volume: number
  bestSet: { weightKg: number; reps: number } | null
  bestWeightKg: number
}

function inLastNDays(dt: Date, days: number): boolean {
  if (days <= 0) return true
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return dt >= start && dt <= now
}

export function computeExerciseProgress(entries: GymEntry[], exercise: string, periodDays: number): ExerciseProgressPoint[] {
  const k = exerciseKey(exercise)

  const byDate = new Map<string, ExerciseProgressPoint>()

  for (const e of entries) {
    if (exerciseKey((e.exercise || '').trim()) !== k) continue
    const dt = parseISODate(e.date)
    if (!dt) continue
    if (!inLastNDays(dt, periodDays)) continue

    const iso = e.date
    const existing = byDate.get(iso) || {
      date: dt,
      dateISO: iso,
      sets: 0,
      volume: 0,
      bestSet: null,
      bestWeightKg: 0,
    }

    const w = Number(e.weightKg) || 0
    const r = Number(e.reps) || 0

    existing.sets += 1
    existing.volume += volumeFromNumbers(w, r)

    if (!existing.bestSet) {
      existing.bestSet = { weightKg: w, reps: r }
      existing.bestWeightKg = w
    } else {
      const betterWeight = w > existing.bestSet.weightKg
      const sameWeightBetterReps = w === existing.bestSet.weightKg && r > existing.bestSet.reps
      if (betterWeight || sameWeightBetterReps) {
        existing.bestSet = { weightKg: w, reps: r }
        existing.bestWeightKg = w
      }
    }

    byDate.set(iso, existing)
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function formatBestSet(bestSet: { weightKg: number; reps: number } | null): string {
  if (!bestSet) return '—'
  const w = bestSet.weightKg ? `${bestSet.weightKg} kg` : 'BW'
  return `${bestSet.reps} reps · ${w}`
}
