import { useMemo, useState } from 'react'
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { Expense } from '../data/types'
import { groupByMonth, percentChange } from '../utils/analytics'
import { formatAmount, formatMonthHeader, parseDate } from '../utils/formatters'

type ReportsScreenProps = {
  expenses: Expense[]
}

export function ReportsScreen({ expenses }: ReportsScreenProps) {
  const theme = useTheme()
  const [range, setRange] = useState<'3m' | '6m' | '1y' | 'all'>('all')
  const grouped = groupByMonth(expenses)
  const months = Object.keys(grouped)
    .map((key) => parseDate(key))
    .sort((a, b) => b.getTime() - a.getTime())
  const monthKeysAsc = Object.keys(grouped).sort()
  const chartKeys = useMemo(() => {
    if (range === 'all') return monthKeysAsc
    const count = range === '3m' ? 3 : range === '6m' ? 6 : 12
    return monthKeysAsc.slice(-count)
  }, [monthKeysAsc, range])
  const chartValues = chartKeys.map((key) => grouped[key] ?? 0)
  const chartHeight = 120
  const chartWidth = 320
  const chartPaddingX = 34
  const chartPaddingY = 14
  const maxValue = chartValues.length ? Math.max(...chartValues) : 0
  const minValue = chartValues.length ? Math.min(...chartValues) : 0
  const valueRange = maxValue - minValue || 1
  const step =
    chartValues.length > 1
      ? (chartWidth - chartPaddingX * 2) / (chartValues.length - 1)
      : 0
  const points = chartValues
    .map((value, index) => {
      const x = chartPaddingX + index * step
      const ratio = (value - minValue) / valueRange
      const y = chartHeight - chartPaddingY - ratio * (chartHeight - chartPaddingY * 2)
      return `${x},${y}`
    })
    .join(' ')
  const monthLabels = chartKeys.map((key) => {
    const date = parseDate(key)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${month}.${year}`
  })
  const maxLabelLength = monthLabels.reduce((max, label) => Math.max(max, label.length), 0)
  const approxLabelWidth = maxLabelLength * 7 + 14
  const availableWidth = Math.max(1, chartWidth - chartPaddingX * 2)
  const maxLabels = Math.max(2, Math.floor(availableWidth / approxLabelWidth))
  const labelStep = Math.max(1, Math.ceil(monthLabels.length / maxLabels))
  const legendStep = 100
  const legendMax = Math.ceil(maxValue / legendStep) * legendStep
  const legendMin = Math.floor(minValue / legendStep) * legendStep
  const legendMid = (legendMax + legendMin) / 2
  const legendValues = [legendMax, legendMid, legendMin]
  const areaPath =
    points && chartValues.length > 0
      ? `M ${chartPaddingX} ${chartHeight - chartPaddingY} L ${points.replace(
          / /g,
          ' L ',
        )} L ${chartPaddingX + step * (chartValues.length - 1)} ${
          chartHeight - chartPaddingY
        } Z`
      : ''

  if (months.length === 0) {
    return (
      <Card elevation={0}>
        <CardContent>
          <Typography color="text.secondary">Нет данных для отчета</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={2}>
      {chartKeys.length > 0 ? (
        <Card elevation={0} variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Динамика по месяцам
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {[
                    { value: '3m' as const, label: '3м' },
                    { value: '6m' as const, label: '6м' },
                    { value: '1y' as const, label: '1г' },
                    { value: 'all' as const, label: 'Все' },
                  ].map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      size="small"
                      variant={range === option.value ? 'filled' : 'outlined'}
                      color={range === option.value ? 'primary' : 'default'}
                      onClick={() => setRange(option.value)}
                      sx={{ height: 26, fontSize: 12 }}
                    />
                  ))}
                </Stack>
              </Stack>
              <Box sx={{ width: '100%', overflow: 'hidden' }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  width="100%"
                  height={chartHeight}
                  preserveAspectRatio="none"
                >
                  {legendValues.map((value, index) => {
                    const ratio = (value - minValue) / valueRange
                    const y = chartHeight - chartPaddingY - ratio * (chartHeight - chartPaddingY * 2)
                    return (
                      <g key={`legend-${index}`}>
                        <line
                          x1={chartPaddingX}
                          x2={chartWidth}
                          y1={y}
                          y2={y}
                          stroke={theme.palette.divider}
                          strokeDasharray="3 3"
                        />
                        <text
                          x={8}
                          y={y + 3}
                          fill={theme.palette.text.secondary}
                          fontSize={10}
                        >
                          {Math.round(value)}
                        </text>
                      </g>
                    )
                  })}
                  <path
                    d={areaPath}
                    fill={theme.palette.primary.main}
                    opacity={0.12}
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {monthLabels.map((label, index) => {
                    if (
                      index % labelStep !== 0 &&
                      index !== 0 &&
                      index !== monthLabels.length - 1
                    ) {
                      return null
                    }
                    const x = chartPaddingX + index * step
                    const textAnchor =
                      index === 0 ? 'start' : index === monthLabels.length - 1 ? 'end' : 'middle'
                    return (
                      <text
                        key={label}
                        x={x}
                        y={chartHeight - 4}
                        textAnchor={textAnchor}
                        fill={theme.palette.text.secondary}
                        fontSize={9}
                      >
                        {label}
                      </text>
                    )
                  })}
                </svg>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {months.map((month) => {
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
        const total = grouped[monthKey] ?? 0
        const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)
        const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`
        const prevTotal = grouped[prevKey] ?? 0
        const percent = percentChange(prevTotal, total)
        const isDecrease = percent !== null && percent < 0
        const isIncrease = percent !== null && percent > 0

        let changeText = '—'
        if (percent !== null) {
          changeText = `На ${Math.abs(percent).toFixed(0)}% ${
            percent < 0 ? 'меньше' : 'больше'
          }`
        }

        return (
          <Card key={monthKey} elevation={0} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {formatMonthHeader(month)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Сравнение с прошлым месяцем
                  </Typography>
                </Stack>
                <Stack spacing={0.8} alignItems="flex-end">
                  <Typography fontWeight={700}>{formatAmount(total)} BYN</Typography>
                  <Chip
                    size="small"
                    label={changeText}
                    variant="outlined"
                    sx={{
                      color: isDecrease
                        ? theme.palette.success.main
                        : isIncrease
                          ? theme.palette.error.main
                          : theme.palette.text.secondary,
                      borderColor: alpha(
                        isDecrease
                          ? theme.palette.success.main
                          : isIncrease
                            ? theme.palette.error.main
                            : theme.palette.text.secondary,
                        0.35,
                      ),
                      backgroundColor: alpha(
                        theme.palette.background.paper,
                        theme.palette.mode === 'dark' ? 0.2 : 0.6,
                      ),
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}
