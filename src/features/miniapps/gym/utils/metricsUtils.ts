import type { GymEntry, WorkoutSet } from '../types'

export function volume(entry: Pick<GymEntry, 'weightKg' | 'reps'>): number {
  const w = Number.isFinite(entry.weightKg) ? entry.weightKg : 0
  const r = Number.isFinite(entry.reps) ? entry.reps : 0
  return w * r
}

export function volumeFromNumbers(weightKg: number, reps: number): number {
  const w = Number.isFinite(weightKg) ? weightKg : 0
  const r = Number.isFinite(reps) ? reps : 0
  return w * r
}

export function pct(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (b === 0) return a === 0 ? 0 : 100
  return ((a - b) / Math.abs(b)) * 100
}

export function formatWorkoutSet(s: WorkoutSet): string {
  const w = s.weightKg ? `${s.weightKg} kg` : 'BW'
  return `${s.reps} reps · ${w}`
}
