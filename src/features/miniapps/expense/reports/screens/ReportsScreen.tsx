import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Card, CardContent, Chip, CircularProgress, Popover, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { percentChange } from '../../../../../shared/lib/analytics'
import { formatAmount, formatMonthHeader, parseDate } from '../../../../../shared/lib/formatters'
import { getReportsMonthly } from '../api/reports'

type RangeOption = '3m' | '6m' | '1y' | 'all'

type MonthRange = {
  fromMonth: string
  toMonth: string
}

const MONTH_SHORT_LABELS = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д']

const formatMonthValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const resolveRange = (range: RangeOption): MonthRange => {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  if (range === 'all') {
    return { fromMonth: '2000-01', toMonth: formatMonthValue(currentMonth) }
  }
  const offset = range === '3m' ? 2 : range === '6m' ? 5 : 11
  const fromMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - offset, 1)
  return {
    fromMonth: formatMonthValue(fromMonthDate),
    toMonth: formatMonthValue(currentMonth),
  }
}

type ReportsScreenProps = {
  readOnly?: boolean
}

export function ReportsScreen({ readOnly = false }: ReportsScreenProps) {
  const theme = useTheme()
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const [range, setRange] = useState<RangeOption>('all')
  const [rows, setRows] = useState<Array<{ month: string; total: number; count: number }>>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartWidth, setChartWidth] = useState(320)
  const [chartTooltip, setChartTooltip] = useState<{
    monthKey: string
    top: number
    left: number
  } | null>(null)

  const monthRange = useMemo(() => resolveRange(range), [range])

  useEffect(() => {
    let isActive = true
    if (readOnly) {
      setLoading(false)
      setError('Оффлайн: отчет недоступен.')
      setRows([])
      return () => {
        isActive = false
      }
    }
    const loadReport = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await getReportsMonthly({
          fromMonth: monthRange.fromMonth,
          toMonth: monthRange.toMonth,
        })
        if (!isActive) return
        setRows(response)
      } catch {
        if (!isActive) return
        setError('Не удалось загрузить отчет. Попробуйте ещё раз.')
      } finally {
        if (isActive) setLoading(false)
      }
    }

    void loadReport()
    return () => {
      isActive = false
    }
  }, [readOnly, monthRange.fromMonth, monthRange.toMonth])

  useEffect(() => {
    const element = chartContainerRef.current
    if (!element) return

    const updateWidth = () => {
      const nextWidth = Math.max(280, Math.floor(element.clientWidth))
      setChartWidth((current) => (current !== nextWidth ? nextWidth : current))
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  const grouped = useMemo(() => {
    const result: Record<string, number> = {}
    rows.forEach((row) => {
      const monthKey = row.month.length === 7 ? `${row.month}-01` : row.month
      result[monthKey] = row.total
    })
    return result
  }, [rows])

  const monthKeysAsc = useMemo(() => Object.keys(grouped).sort(), [grouped])
  const months = useMemo(
    () => monthKeysAsc.map((key) => parseDate(key)).sort((a, b) => b.getTime() - a.getTime()),
    [monthKeysAsc],
  )
  const chartValues = useMemo(() => monthKeysAsc.map((key) => grouped[key] ?? 0), [monthKeysAsc, grouped])

  const hasData = months.length > 0
  const isInitialLoading = isLoading && !hasData && !error
  const hasBackgroundError = Boolean(error && hasData)

  const chartHeight = 152
  const chartPaddingX = 34
  const chartPaddingY = 14
  const chartBottomPadding = 24
  const chartRightPadding = 8
  const plotWidth = Math.max(1, chartWidth - chartPaddingX - chartRightPadding)
  const plotHeight = Math.max(1, chartHeight - chartPaddingY - chartBottomPadding)
  const maxValue = chartValues.length ? Math.max(...chartValues, 0) : 0
  const slotWidth = chartValues.length > 0 ? plotWidth / chartValues.length : 0
  const barWidth = chartValues.length > 0 ? Math.min(30, Math.max(8, slotWidth * 0.62)) : 0
  const chartItems = monthKeysAsc.map((key, index) => {
    const date = parseDate(key)
    const value = grouped[key] ?? 0
    const slotX = chartPaddingX + index * slotWidth
    const shortLabel = MONTH_SHORT_LABELS[date.getMonth()] ?? ''
    const rawHeight = maxValue > 0 ? (value / maxValue) * plotHeight : 0
    const barHeight = value > 0 ? Math.max(1, rawHeight) : 0
    const barX = slotX + (slotWidth - barWidth) / 2
    const barY = chartPaddingY + (plotHeight - barHeight)
    return {
      key,
      value,
      date,
      shortLabel,
      fullLabel: formatMonthHeader(date),
      slotX,
      centerX: slotX + slotWidth / 2,
      barX,
      barY,
      barHeight,
    }
  })
  const bars = chartItems
    .map((item) => {
      if (item.barHeight <= 0) return null
      return {
        key: item.key,
        x: item.barX,
        y: item.barY,
        height: item.barHeight,
      }
    })
    .filter((bar): bar is { key: string; x: number; y: number; height: number } => bar !== null)
  const monthLabels = chartItems.map((item) => item.shortLabel)
  const maxLabelLength = monthLabels.reduce((max, label) => Math.max(max, label.length), 0)
  const approxLabelWidth = maxLabelLength > 0 ? maxLabelLength * 7 + 16 : 24
  const maxLabels = Math.max(2, Math.floor(plotWidth / approxLabelWidth))
  const labelStep = Math.max(1, Math.ceil(monthLabels.length / maxLabels))
  const legendValues = maxValue > 0 ? [maxValue, maxValue / 2, 0] : [0]
  const activeTooltipItem = chartTooltip
    ? chartItems.find((item) => item.key === chartTooltip.monthKey) ?? null
    : null

  useEffect(() => {
    if (!chartTooltip) return
    if (!monthKeysAsc.includes(chartTooltip.monthKey)) {
      setChartTooltip(null)
    }
  }, [chartTooltip, monthKeysAsc])

  const onMonthClick =
    (monthKey: string) => (event: ReactMouseEvent<SVGRectElement | SVGTextElement>) => {
      setChartTooltip({
        monthKey,
        top: event.clientY + 10,
        left: event.clientX + 10,
      })
    }

  return (
    <Stack spacing={2}>
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
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
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
                    onClick={() => {
                      setChartTooltip(null)
                      setRange(option.value)
                    }}
                    disabled={readOnly}
                    sx={{ height: 26, fontSize: 12 }}
                  />
                ))}
                {isLoading && hasData ? <CircularProgress size={16} /> : null}
              </Stack>
            </Stack>
            {isInitialLoading ? (
              <Stack spacing={1} alignItems="center" py={1.5}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Загружаем отчет…</Typography>
              </Stack>
            ) : error && !hasData ? (
              <Typography color="error">{error}</Typography>
            ) : !hasData ? (
              <Typography color="text.secondary">Нет данных для отчета</Typography>
            ) : (
              <Box ref={chartContainerRef} sx={{ width: '100%', overflow: 'hidden' }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  width="100%"
                  height={chartHeight}
                  preserveAspectRatio="xMinYMin meet"
                >
                  {legendValues.map((value, index) => {
                    const ratio = maxValue > 0 ? value / maxValue : 0
                    const y = chartPaddingY + (plotHeight - ratio * plotHeight)
                    return (
                      <g key={`legend-${index}`}>
                        <line
                          x1={chartPaddingX}
                          x2={chartWidth - chartRightPadding}
                          y1={y}
                          y2={y}
                          stroke={theme.palette.divider}
                          strokeDasharray="3 3"
                        />
                        <text x={8} y={y + 3} fill={theme.palette.text.secondary} fontSize={10}>
                          {Math.round(value)}
                        </text>
                      </g>
                    )
                  })}
                  {chartItems.map((item) => (
                    <rect
                      key={`hit-${item.key}`}
                      x={item.slotX}
                      y={chartPaddingY}
                      width={slotWidth}
                      height={plotHeight + chartBottomPadding}
                      fill="transparent"
                      onClick={onMonthClick(item.key)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                  {bars.map((bar) => (
                    <rect
                      key={bar.key}
                      x={bar.x}
                      y={bar.y}
                      width={barWidth}
                      height={bar.height}
                      rx={Math.min(4, barWidth / 2)}
                      fill={
                        activeTooltipItem?.key === bar.key
                          ? theme.palette.primary.dark
                          : theme.palette.primary.main
                      }
                      opacity={0.85}
                      onClick={onMonthClick(bar.key)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                  {chartItems.map((item, index) => {
                    if (
                      index % labelStep !== 0 &&
                      index !== 0 &&
                      index !== monthLabels.length - 1
                    ) {
                      return null
                    }
                    return (
                      <text
                        key={`month-label-${item.key}`}
                        x={item.centerX}
                        y={chartHeight - 4}
                        textAnchor="middle"
                        fill={
                          activeTooltipItem?.key === item.key
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary
                        }
                        fontSize={9}
                        fontWeight={activeTooltipItem?.key === item.key ? 700 : 500}
                        onClick={onMonthClick(item.key)}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        {item.shortLabel}
                      </text>
                    )
                  })}
                </svg>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Popover
        open={Boolean(chartTooltip && activeTooltipItem)}
        onClose={() => setChartTooltip(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          chartTooltip
            ? {
                top: chartTooltip.top,
                left: chartTooltip.left,
              }
            : undefined
        }
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
        slotProps={{
          paper: {
            sx: {
              px: 1.25,
              py: 0.75,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[3],
            },
          },
        }}
      >
        {activeTooltipItem ? (
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {activeTooltipItem.fullLabel}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {formatAmount(activeTooltipItem.value)} BYN
            </Typography>
          </Stack>
        ) : null}
      </Popover>

      {hasBackgroundError ? (
        <Card elevation={0}>
          <CardContent>
            <Typography color="error">
              {error} Показаны последние загруженные данные.
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      {hasData
        ? months.map((month) => {
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
              changeText = `На ${Math.abs(percent).toFixed(0)}% ${percent < 0 ? 'меньше' : 'больше'}`
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
          })
        : null}
    </Stack>
  )
}
