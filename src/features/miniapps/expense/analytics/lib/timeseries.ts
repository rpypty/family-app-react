import { dateOnly, formatDate, parseDate } from '../../../../../shared/lib/formatters'

export type CompleteTimeseriesRow<Breakdown = never> = {
  period: string
  total: number
  count: number
  breakdown?: Breakdown[]
}

export const resolveWeekStart = (value: Date): Date => {
  const start = dateOnly(value)
  const day = start.getDay()
  const offset = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + offset)
  return start
}

export const resolveTimeseriesPeriod = (date: string, groupBy: 'week' | 'day'): string => {
  if (groupBy === 'day') return date
  return formatDate(resolveWeekStart(parseDate(date)))
}

const addDays = (value: Date, days: number): Date => {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

const buildTimeseriesPeriodRange = (from: string, to: string, groupBy: 'week' | 'day'): string[] => {
  const periods: string[] = []
  const end = dateOnly(parseDate(to))
  let cursor = groupBy === 'week' ? resolveWeekStart(parseDate(from)) : dateOnly(parseDate(from))

  while (cursor.getTime() <= end.getTime()) {
    periods.push(formatDate(cursor))
    cursor = addDays(cursor, groupBy === 'week' ? 7 : 1)
  }

  return periods
}

export const resolveTimeseriesCompletionBounds = (
  rows: Array<{ period: string }>,
  range: { from: string; to: string },
  hasExplicitFrom: boolean,
  hasExplicitTo: boolean,
): { from: string; to: string } | null => {
  const sortedPeriods = rows.map((row) => row.period).sort((a, b) => a.localeCompare(b))
  if (sortedPeriods.length === 0 && !hasExplicitFrom && !hasExplicitTo) return null

  return {
    from: hasExplicitFrom ? range.from : sortedPeriods[0] ?? range.from,
    to: hasExplicitTo ? range.to : sortedPeriods[sortedPeriods.length - 1] ?? range.to,
  }
}

export const buildCompleteTimeseriesRows = <Breakdown>(
  rows: Array<CompleteTimeseriesRow<Breakdown>>,
  range: { from: string; to: string },
  groupBy: 'week' | 'day',
): Array<CompleteTimeseriesRow<Breakdown>> => {
  const rowsByPeriod = new Map(rows.map((row) => [row.period, row]))
  return buildTimeseriesPeriodRange(range.from, range.to, groupBy).map(
    (period) => rowsByPeriod.get(period) ?? { period, total: 0, count: 0, breakdown: [] },
  )
}
