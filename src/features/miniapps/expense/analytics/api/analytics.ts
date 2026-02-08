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

export type AnalyticsByTagRow = {
  tagId: string
  tagName: string
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

type AnalyticsByTagResponse = {
  tag_id: string
  tag_name: string
  total: number
  count: number
}

type AnalyticsQuery = {
  from: string
  to: string
  currency?: string
  tagIds?: string[]
  timezone?: string
}

type AnalyticsTimeseriesQuery = AnalyticsQuery & {
  groupBy: 'day' | 'week' | 'month'
}

type AnalyticsByTagQuery = AnalyticsQuery & {
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

const toTagIdsParam = (tagIds?: string[]) => (tagIds && tagIds.length > 0 ? tagIds.join(',') : undefined)

export const getAnalyticsSummary = async (params: AnalyticsQuery): Promise<AnalyticsSummary> => {
  const query = buildQuery({
    from: params.from,
    to: params.to,
    currency: params.currency,
    tag_ids: toTagIdsParam(params.tagIds),
    timezone: params.timezone,
  })
  const response = await apiFetch<AnalyticsSummaryResponse>(`/analytics/summary${query}`)
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
    tag_ids: toTagIdsParam(params.tagIds),
    timezone: params.timezone,
  })
  const response = await apiFetch<AnalyticsTimeseriesResponse[]>(`/analytics/timeseries${query}`)
  return response.map((item) => ({
    period: item.period,
    total: item.total,
    count: item.count,
  }))
}

export const getAnalyticsByTag = async (
  params: AnalyticsByTagQuery,
): Promise<AnalyticsByTagRow[]> => {
  const query = buildQuery({
    from: params.from,
    to: params.to,
    currency: params.currency,
    tag_ids: toTagIdsParam(params.tagIds),
    limit: params.limit,
  })
  const response = await apiFetch<AnalyticsByTagResponse[]>(`/analytics/by-tag${query}`)
  return response.map((item) => ({
    tagId: item.tag_id,
    tagName: item.tag_name,
    total: item.total,
    count: item.count,
  }))
}
