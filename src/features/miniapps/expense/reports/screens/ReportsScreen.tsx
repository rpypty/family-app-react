import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { percentChange } from '../../../../../shared/lib/analytics'
import { formatAmount, formatMonthHeader, parseDate } from '../../../../../shared/lib/formatters'
import { getReportsMonthly } from '../api/reports'
import { ReportsMonthlyBarChart } from '../components/ReportsMonthlyBarChart'

type RangeOption = '3m' | '6m' | '1y' | 'all'

type MonthRange = {
  fromMonth: string
  toMonth: string
}

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
  const [range, setRange] = useState<RangeOption>('6m')
  const [rows, setRows] = useState<Array<{ month: string; total: number; count: number }>>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const hasData = months.length > 0
  const isInitialLoading = isLoading && !hasData && !error
  const hasBackgroundError = Boolean(error && hasData)

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
                    onClick={() => setRange(option.value)}
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
              <ReportsMonthlyBarChart rows={rows} />
            )}
          </Stack>
        </CardContent>
      </Card>

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
