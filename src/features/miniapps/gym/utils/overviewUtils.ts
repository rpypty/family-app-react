import type { GymEntry } from '../types'
import { parseISODate } from './dateUtils'
import { pct, volumeFromNumbers } from './metricsUtils'

export interface OverviewKpis {
  workouts: number
  liftedKg: number
  reps: number
  sets: number
  heaviestKg: number
}

export interface OverviewDelta {
  workouts: { abs: number; pct: number | null }
  liftedKg: { abs: number; pct: number | null }
  reps: { abs: number; pct: number | null }
  sets: { abs: number; pct: number | null }
  heaviestKg: { abs: number; pct: number | null }
}

export interface OverviewPoint {
  [key: string]: unknown
  date: Date
  dateISO: string
  workouts: number
  liftedTons: number
  cumulativeWorkouts: number
  cumulativeLiftedTons: number
}

export interface OverviewResult {
  chartDays: number
  current: OverviewKpis
  previous: OverviewKpis
  delta: OverviewDelta
  series: OverviewPoint[]
}

function dayKey(iso: string): string {
  return (iso || '').slice(0, 10)
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function computeKpis(entries: GymEntry[], from: Date | null, to: Date | null): OverviewKpis {
  const workoutIds = new Set<string>()
  let liftedKg = 0
  let reps = 0
  let sets = 0
  let heaviestKg = 0

  for (const e of entries) {
    const dt = parseISODate(e.date)
    if (!dt) continue
    if (from && dt < from) continue
    if (to && dt >= to) continue

    const [workoutId] = String(e.id || '').split(':')
    if (workoutId) workoutIds.add(workoutId)

    const w = Number(e.weightKg) || 0
    const r = Number(e.reps) || 0
    sets += 1
    reps += r
    liftedKg += volumeFromNumbers(w, r)
    heaviestKg = Math.max(heaviestKg, w)
  }

  return {
    workouts: workoutIds.size,
    liftedKg,
    reps,
    sets,
    heaviestKg,
  }
}

export function computeOverview(entries: GymEntry[], periodDays: number): OverviewResult {
  const now = new Date()

  const rangeDays = periodDays === 0 ? 90 : periodDays
  const start = startOfDay(new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000))
  const end = startOfDay(now)

  const prevStart = startOfDay(new Date(now.getTime() - 2 * rangeDays * 24 * 60 * 60 * 1000))
  const prevEnd = start

  const current = computeKpis(entries, start, addDays(end, 1))
  const previous = computeKpis(entries, prevStart, prevEnd)

  const delta: OverviewDelta = {
    workouts: { abs: current.workouts - previous.workouts, pct: pct(current.workouts, previous.workouts) },
    liftedKg: { abs: current.liftedKg - previous.liftedKg, pct: pct(current.liftedKg, previous.liftedKg) },
    reps: { abs: current.reps - previous.reps, pct: pct(current.reps, previous.reps) },
    sets: { abs: current.sets - previous.sets, pct: pct(current.sets, previous.sets) },
    heaviestKg: { abs: current.heaviestKg - previous.heaviestKg, pct: pct(current.heaviestKg, previous.heaviestKg) },
  }

  const daily = new Map<string, { workoutIds: Set<string>; liftedKg: number }>()

  for (const e of entries) {
    const dt = parseISODate(e.date)
    if (!dt) continue
    if (dt < start || dt > addDays(end, 1)) continue

    const iso = dayKey(e.date)
    const existing = daily.get(iso) || { workoutIds: new Set<string>(), liftedKg: 0 }

    const [workoutId] = String(e.id || '').split(':')
    if (workoutId) existing.workoutIds.add(workoutId)

    existing.liftedKg += volumeFromNumbers(Number(e.weightKg) || 0, Number(e.reps) || 0)

    daily.set(iso, existing)
  }

  const series: OverviewPoint[] = []
  let cumulativeWorkouts = 0
  let cumulativeLiftedKg = 0

  for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const day = daily.get(iso)
    const workouts = day ? day.workoutIds.size : 0
    const liftedKgDay = day ? day.liftedKg : 0

    cumulativeWorkouts += workouts
    cumulativeLiftedKg += liftedKgDay

    series.push({
      date: d,
      dateISO: iso,
      workouts,
      liftedTons: liftedKgDay / 1000,
      cumulativeWorkouts,
      cumulativeLiftedTons: cumulativeLiftedKg / 1000,
    })
  }

  return {
    chartDays: rangeDays,
    current,
    previous,
    delta: periodDays === 0 ? { ...delta, workouts: { abs: delta.workouts.abs, pct: null }, liftedKg: { abs: delta.liftedKg.abs, pct: null }, reps: { abs: delta.reps.abs, pct: null }, sets: { abs: delta.sets.abs, pct: null }, heaviestKg: { abs: delta.heaviestKg.abs, pct: null } } : delta,
    series,
  }
}
