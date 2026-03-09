import { useMemo } from 'react'
import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { formatAmount, formatDateDots, parseDate } from '../../../../../shared/lib/formatters'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

type TimeseriesRow = {
  period: string
  total: number
  count: number
  breakdown?: CategoryRow[]
}

type CategoryRow = {
  id?: string
  label: string
  value: number
  color?: string
}

export type AnalyticsBarClickPayload =
  | { mode: 'time'; period: string; groupBy: 'week' | 'day'; total: number }
  | { mode: 'category'; id?: string; label: string; value: number }

type TimeseriesBarChartProps = {
  mode: 'time' | 'category'
  rows?: TimeseriesRow[]
  categoryRows?: CategoryRow[]
  groupBy?: 'week' | 'day'
  currency?: string
  compact?: boolean
  onBarClick?: (payload: AnalyticsBarClickPayload) => void
}

export function TimeseriesBarChart({
  mode,
  rows = [],
  categoryRows = [],
  groupBy,
  currency,
  compact = false,
  onBarClick,
}: TimeseriesBarChartProps) {
  const theme = useTheme()

  const timeChartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period))
    const maxLabels = compact ? 6 : 10
    const labelStep = Math.max(1, Math.ceil(sorted.length / maxLabels))
    const categories = sorted.map((item, index) => {
      const periodDate = parseDate(item.period)
      const shortLabel = formatDateDots(periodDate).slice(0, 5)
      const show = index % labelStep === 0 || index === sorted.length - 1
      return show ? shortLabel : ''
    })
    const values = sorted.map((item) => item.total)
    const rowBreakdownMaps = sorted.map((item) => {
      const map = new Map<string, number>()
      item.breakdown?.forEach((slice) => {
        const key = slice.id ? `id:${slice.id}` : `label:${slice.label}`
        map.set(key, slice.value)
      })
      return map
    })
    const totalsByKey = new Map<string, number>()
    const labelsByKey = new Map<string, string>()
    const colorsByKey = new Map<string, string>()
    sorted.forEach((item) => {
      item.breakdown?.forEach((slice) => {
        const key = slice.id ? `id:${slice.id}` : `label:${slice.label}`
        totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + slice.value)
        if (!labelsByKey.has(key)) {
          labelsByKey.set(key, slice.label)
        }
        if (slice.color && !colorsByKey.has(key)) {
          colorsByKey.set(key, slice.color)
        }
      })
    })
    const stackedSeries = Array.from(totalsByKey.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => ({
        key,
        label: labelsByKey.get(key) ?? key,
        color: colorsByKey.get(key),
        values: rowBreakdownMaps.map((rowMap) => rowMap.get(key) ?? 0),
      }))
    return {
      sorted,
      categories,
      values,
      stackedSeries,
      hasBreakdown: stackedSeries.length > 0,
    }
  }, [rows, compact])

  const categoryChartData = useMemo(() => {
    const sorted = [...categoryRows].sort((a, b) => b.value - a.value)
    return {
      sorted,
      labels: sorted.map((item) => item.label),
      values: sorted.map((item) => item.value),
    }
  }, [categoryRows])

  const option = useMemo<EChartsCoreOption>(() => {
    if (mode === 'category') {
      return {
        grid: {
          left: compact ? 78 : 104,
          right: 14,
          top: 14,
          bottom: 12,
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: unknown) => {
            const item = params as { dataIndex?: number } | undefined
            const dataIndex = item?.dataIndex ?? 0
            const row = categoryChartData.sorted[dataIndex]
            if (!row) return ''
            const amount = currency ? `${formatAmount(row.value)} ${currency}` : formatAmount(row.value)
            return `${row.label}<br/><strong>${amount}</strong>`
          },
        },
        xAxis: {
          type: 'value',
          splitLine: {
            lineStyle: {
              color: alpha(theme.palette.text.secondary, 0.2),
              type: 'dashed',
            },
          },
          axisLabel: {
            color: alpha(theme.palette.text.primary, 0.65),
            fontSize: 10,
            formatter: (value: number) => String(Math.round(value)),
          },
        },
        yAxis: {
          type: 'category',
          data: categoryChartData.labels,
          inverse: true,
          axisTick: { show: false },
          axisLine: {
            lineStyle: { color: alpha(theme.palette.text.secondary, 0.3) },
          },
          axisLabel: {
            color: alpha(theme.palette.text.primary, 0.82),
            fontSize: 11,
          },
        },
        series: [
          {
            type: 'bar',
            data: categoryChartData.sorted.map((row) => ({
              value: row.value,
              itemStyle: {
                color: row.color || alpha(theme.palette.primary.main, 0.82),
                borderRadius: [0, 4, 4, 0],
              },
            })),
            // Use relative width so bars fill available category space.
            barWidth: '72%',
          },
        ],
        animationDuration: 250,
      }
    }

    const resolvedGroupBy = groupBy === 'week' ? 'week' : 'day'
    const useStackedTimeSeries = timeChartData.hasBreakdown
    return {
      grid: {
        left: 36,
        right: 14,
        top: 20,
        bottom: 30,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params]
          const first = list[0] as { dataIndex?: number; value?: number } | undefined
          const dataIndex = first?.dataIndex ?? 0
          const row = timeChartData.sorted[dataIndex]
          if (!row) return ''
          const periodLabel =
            resolvedGroupBy === 'week'
              ? `Неделя с ${formatDateDots(parseDate(row.period))}`
              : formatDateDots(parseDate(row.period))
          const amount = currency ? `${formatAmount(row.total)} ${currency}` : formatAmount(row.total)
          if (useStackedTimeSeries && row.breakdown && row.breakdown.length > 0) {
            const sortedBreakdown = [...row.breakdown].sort((a, b) => b.value - a.value)
            const details = sortedBreakdown
              .slice(0, 6)
              .map((slice) => {
                const part = currency ? `${formatAmount(slice.value)} ${currency}` : formatAmount(slice.value)
                const share = row.total > 0 ? ((slice.value / row.total) * 100).toFixed(0) : '0'
                return `${slice.label}: ${part} (${share}%)`
              })
              .join('<br/>')
            const restCount = sortedBreakdown.length - 6
            const restLine = restCount > 0 ? `<br/>И ещё ${restCount} кат.` : ''
            return `${periodLabel}<br/><strong>${amount}</strong><br/>${details}${restLine}`
          }
          return `${periodLabel}<br/><strong>${amount}</strong>`
        },
      },
      xAxis: {
        type: 'category',
        data: timeChartData.categories,
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: alpha(theme.palette.text.secondary, 0.35) },
        },
        axisLabel: {
          color: alpha(theme.palette.text.primary, 0.72),
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: alpha(theme.palette.text.secondary, 0.2),
            type: 'dashed',
          },
        },
        axisLabel: {
          color: alpha(theme.palette.text.primary, 0.65),
          fontSize: 10,
          formatter: (value: number) => String(Math.round(value)),
        },
      },
      series: useStackedTimeSeries
        ? timeChartData.stackedSeries.map((series) => ({
            type: 'bar',
            name: series.label,
            stack: 'total',
            data: series.values,
            barWidth: compact ? '74%' : '68%',
            itemStyle: {
              color: series.color || alpha(theme.palette.primary.main, 0.82),
            },
          }))
        : [
            {
              type: 'bar',
              data: timeChartData.values,
              // Use relative width so bars spread across the full chart width.
              barWidth: compact ? '74%' : '68%',
              itemStyle: {
                color: alpha(theme.palette.primary.main, 0.82),
                borderRadius: [4, 4, 0, 0],
              },
              emphasis: {
                itemStyle: {
                  color: theme.palette.primary.main,
                },
              },
            },
          ],
      animationDuration: 250,
    }
  }, [
    mode,
    timeChartData.sorted,
    timeChartData.categories,
    timeChartData.values,
    timeChartData.stackedSeries,
    timeChartData.hasBreakdown,
    categoryChartData.sorted,
    categoryChartData.labels,
    groupBy,
    currency,
    compact,
    theme,
  ])

  const chartHeight =
    mode === 'category'
      ? Math.max(compact ? 220 : 250, categoryChartData.sorted.length * (compact ? 28 : 30))
      : compact
        ? 230
        : 270

  const onEvents = useMemo(() => {
    return {
      click: (params: { dataIndex?: number }) => {
        const index = params?.dataIndex ?? -1
        if (index < 0) return
        if (mode === 'category') {
          const row = categoryChartData.sorted[index]
          if (!row) return
          onBarClick?.({
            mode: 'category',
            id: row.id,
            label: row.label,
            value: row.value,
          })
          return
        }
        const row = timeChartData.sorted[index]
        if (!row) return
        onBarClick?.({
          mode: 'time',
          period: row.period,
          groupBy: groupBy === 'week' ? 'week' : 'day',
          total: row.total,
        })
      },
    }
  }, [mode, categoryChartData.sorted, timeChartData.sorted, groupBy, onBarClick])

  return (
    <Box sx={{ width: '100%' }}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ width: '100%', height: chartHeight }}
        notMerge
        lazyUpdate
        onEvents={onEvents}
      />
    </Box>
  )
}
