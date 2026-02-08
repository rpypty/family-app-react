import { exerciseKey } from '../api/gymStore'
import type { AnalyticsResult, ExerciseAgg, GymEntry } from '../types'
import { parseISODate } from './dateUtils'
import { pct, volume } from './metricsUtils'

export function computeAnalytics(entries: GymEntry[], periodDays: number): AnalyticsResult {
  const now = new Date()
  const start = periodDays === 0 ? null : new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const prevStart = periodDays === 0 ? null : new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000)
  const prevEnd = start

  const inRange = (dt: Date | null) => {
    if (!dt) return false
    if (!start) return true
    return dt >= start && dt <= now
  }

  const inPrevRange = (dt: Date | null) => {
    if (!dt) return false
    if (!prevStart || !prevEnd) return false
    return dt >= prevStart && dt < prevEnd
  }

  const byExercise = new Map<string, ExerciseAgg>()

  for (const e of entries) {
    const display = (e.exercise || '').trim()
    if (!display) continue
    const key = exerciseKey(display)
    const dt = parseISODate(e.date)

    const agg: ExerciseAgg =
      byExercise.get(key) ||
      ({
        exercise: display,
        key,
        sets: 0,
        totalVolume: 0,
        bestSet: null,
        lastDate: null,
        prevSets: 0,
        prevVolume: 0,
        setsDeltaPct: null,
        deltaPct: null,
      } satisfies ExerciseAgg)

    if (dt && (!agg.lastDate || dt > agg.lastDate)) agg.lastDate = dt

    const v = volume(e)
    if (inRange(dt)) {
      agg.sets += 1
      agg.totalVolume += v

      const w = Number(e.weightKg) || 0
      const r = Number(e.reps) || 0
      if (!agg.bestSet) {
        agg.bestSet = { weightKg: w, reps: r }
      } else {
        const betterWeight = w > agg.bestSet.weightKg
        const sameWeightBetterReps = w === agg.bestSet.weightKg && r > agg.bestSet.reps
        if (betterWeight || sameWeightBetterReps) {
          agg.bestSet = { weightKg: w, reps: r }
        }
      }
    } else if (inPrevRange(dt)) {
      agg.prevSets += 1
      agg.prevVolume += v
    }

    agg.exercise = display
    agg.setsDeltaPct = periodDays === 0 ? null : pct(agg.sets, agg.prevSets)
    agg.deltaPct = periodDays === 0 ? null : pct(agg.totalVolume, agg.prevVolume)
    byExercise.set(key, agg)
  }

  const list = Array.from(byExercise.values())
    .filter((a) => a.sets > 0 || periodDays === 0)
    .sort((a, b) => b.totalVolume - a.totalVolume)

  const totalSets = list.reduce((sum, a) => sum + a.sets, 0)
  const prevTotalSets = list.reduce((sum, a) => sum + a.prevSets, 0)
  const totalVolume = list.reduce((sum, a) => sum + a.totalVolume, 0)
  const prevTotal = list.reduce((sum, a) => sum + a.prevVolume, 0)

  return {
    list,
    totalSets,
    prevTotalSets,
    totalVolume,
    prevTotal,
    totalDeltaPct: periodDays === 0 ? null : pct(totalVolume, prevTotal),
    totalSetsDeltaPct: periodDays === 0 ? null : pct(totalSets, prevTotalSets),
  }
}
