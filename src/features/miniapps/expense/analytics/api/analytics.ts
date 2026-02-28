import { apiFetch } from '../../../../../shared/api/client'

export type AnalyticsSummary = {
  totalAmount: number
  currency: string
  count: number
  avgPerDay: number
  from: string
  to: string
}

export type AnalyticsTimeseriesPoint = {
  period: string
  total: number
  count: number
}

export type AnalyticsByCategoryRow = {
  categoryId: string
  categoryName: string
  total: number
  count: number
}

type AnalyticsSummaryResponse = {
  total_amount: number
  currency: string
  count: number
  avg_per_day: number
  from: string
  to: string
}

type AnalyticsTimeseriesResponse = {
  period: string
  total: number
  count: number
}

type AnalyticsByCategoryResponse = {
  category_id: string
  category_name: string
  total: number
  count: number
}

type AnalyticsQuery = {
  from: string
  to: string
  currency?: string
  categoryIds?: string[]
  timezone?: string
}

type AnalyticsTimeseriesQuery = AnalyticsQuery & {
  groupBy: 'day' | 'week' | 'month'
}

type AnalyticsByCategoryQuery = AnalyticsQuery & {
  limit?: number
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

const toCategoryIdsParam = (categoryIds?: string[]) => (categoryIds && categoryIds.length > 0 ? categoryIds.join(',') : undefined)

export const getAnalyticsSummary = async (params: AnalyticsQuery): Promise<AnalyticsSummary | null> => {
  const query = buildQuery({
    from: params.from,
    to: params.to,
    currency: params.currency,
    category_ids: toCategoryIdsParam(params.categoryIds),
    timezone: params.timezone,
  })
  const response = await apiFetch<AnalyticsSummaryResponse | null>(`/analytics/summary${query}`)
  if (!response) return null
  return {
    totalAmount: response.total_amount,
    currency: response.currency,
    count: response.count,
    avgPerDay: response.avg_per_day,
    from: response.from,
    to: response.to,
  }
}

export const getAnalyticsTimeseries = async (
  params: AnalyticsTimeseriesQuery,
): Promise<AnalyticsTimeseriesPoint[]> => {
  const query = buildQuery({
    from: params.from,
    to: params.to,
    group_by: params.groupBy,
    currency: params.currency,
    category_ids: toCategoryIdsParam(params.categoryIds),
    timezone: params.timezone,
  })
  const response = await apiFetch<AnalyticsTimeseriesResponse[] | null>(`/analytics/timeseries${query}`)
  if (!response) return []
  return response.map((item) => ({
    period: item.period,
    total: item.total,
    count: item.count,
  }))
}

export const getAnalyticsByCategory = async (
  params: AnalyticsByCategoryQuery,
): Promise<AnalyticsByCategoryRow[]> => {
  const query = buildQuery({
    from: params.from,
    to: params.to,
    currency: params.currency,
    category_ids: toCategoryIdsParam(params.categoryIds),
    limit: params.limit,
  })
  const response = await apiFetch<AnalyticsByCategoryResponse[] | null>(`/analytics/by-category${query}`)
  if (!response) return []
  return response.map((item) => ({
    categoryId: item.category_id,
    categoryName: item.category_name,
    total: item.total,
    count: item.count,
  }))
}
