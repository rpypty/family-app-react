import { useMemo } from 'react'
import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { formatAmount, formatMonthHeader, parseDate } from '../../../../../shared/lib/formatters'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const MONTH_SHORT_LABELS = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д']

type ReportsMonthlyRow = {
  month: string
  total: number
  count: number
}

type ReportsMonthlyBarChartProps = {
  rows: ReportsMonthlyRow[]
}

export function ReportsMonthlyBarChart({ rows }: ReportsMonthlyBarChartProps) {
  const theme = useTheme()

  const chartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month))
    const dates = sorted.map((row) => parseDate(row.month.length === 7 ? `${row.month}-01` : row.month))
    const values = sorted.map((row) => row.total)
    const maxLabels = 10
    const labelStep = Math.max(1, Math.ceil(sorted.length / maxLabels))
    const labels = dates.map((date, index) => {
      const short = MONTH_SHORT_LABELS[date.getMonth()] ?? ''
      return index % labelStep === 0 || index === dates.length - 1 ? short : ''
    })
    return { sorted, dates, values, labels }
  }, [rows])

  const option = useMemo<EChartsCoreOption>(() => {
    return {
      grid: {
        left: 40,
        right: 10,
        top: 16,
        bottom: 26,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params]
          const first = list[0] as { dataIndex?: number } | undefined
          const index = first?.dataIndex ?? 0
          const row = chartData.sorted[index]
          const date = chartData.dates[index]
          if (!row || !date) return ''
          return `${formatMonthHeader(date)}<br/><strong>${formatAmount(row.total)} BYN</strong>`
        },
      },
      xAxis: {
        type: 'category',
        data: chartData.labels,
        axisTick: { show: false },
        axisLine: {
          lineStyle: {
            color: alpha(theme.palette.text.secondary, 0.35),
          },
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
      series: [
        {
          type: 'bar',
          data: chartData.values,
          // Use relative width so bars spread across available chart width.
          barWidth: '68%',
          itemStyle: {
            color: alpha(theme.palette.primary.main, 0.85),
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: theme.palette.primary.dark,
            },
          },
        },
      ],
      animationDuration: 250,
    }
  }, [chartData.sorted, chartData.dates, chartData.values, chartData.labels, theme])

  return (
    <Box sx={{ width: '100%' }}>
      <ReactEChartsCore echarts={echarts} option={option} style={{ width: '100%', height: 180 }} notMerge />
    </Box>
  )
}
