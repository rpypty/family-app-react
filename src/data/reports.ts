import { apiFetch } from '../api/client'

export type ReportsMonthlyRow = {
  month: string
  total: number
  count: number
}

export type ReportsComparePeriod = {
  from: string
  to: string
  total: number
  count: number
}

export type ReportsDelta = {
  amount: number
  percent: number
}

export type ReportsCompareResponse = {
  periodA: ReportsComparePeriod
  periodB: ReportsComparePeriod
  delta: ReportsDelta
}

type ReportsMonthlyResponse = {
  month: string
  total: number
  count: number
}

type ReportsCompareResponseApi = {
  period_a: ReportsComparePeriodApi
  period_b: ReportsComparePeriodApi
  delta: ReportsDeltaApi
}

type ReportsComparePeriodApi = {
  from: string
  to: string
  total: number
  count: number
}

type ReportsDeltaApi = {
  amount: number
  percent: number
}

type ReportsMonthlyQuery = {
  fromMonth: string
  toMonth: string
  currency?: string
  tagIds?: string[]
}

type ReportsCompareQuery = {
  fromA: string
  toA: string
  fromB: string
  toB: string
  currency?: string
  tagIds?: string[]
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

const toTagIdsParam = (tagIds?: string[]) => (tagIds && tagIds.length > 0 ? tagIds.join(',') : undefined)

export const getReportsMonthly = async (
  params: ReportsMonthlyQuery,
): Promise<ReportsMonthlyRow[]> => {
  const query = buildQuery({
    from_month: params.fromMonth,
    to_month: params.toMonth,
    currency: params.currency,
    tag_ids: toTagIdsParam(params.tagIds),
  })
  const response = await apiFetch<ReportsMonthlyResponse[]>(`/reports/monthly${query}`)
  return response.map((row) => ({
    month: row.month,
    total: row.total,
    count: row.count,
  }))
}

export const getReportsCompare = async (
  params: ReportsCompareQuery,
): Promise<ReportsCompareResponse> => {
  const query = buildQuery({
    from_a: params.fromA,
    to_a: params.toA,
    from_b: params.fromB,
    to_b: params.toB,
    currency: params.currency,
    tag_ids: toTagIdsParam(params.tagIds),
  })
  const response = await apiFetch<ReportsCompareResponseApi>(`/reports/compare${query}`)
  return {
    periodA: response.period_a,
    periodB: response.period_b,
    delta: response.delta,
  }
}
