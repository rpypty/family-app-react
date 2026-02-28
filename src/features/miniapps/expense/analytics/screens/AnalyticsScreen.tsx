import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material'
import BarChartIcon from '@mui/icons-material/BarChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import { alpha, useTheme } from '@mui/material/styles'
import type { Expense, Category } from '../../../../../shared/types'
import {
  dateOnly,
  formatAmount,
  formatDate,
  formatDateDots,
  formatPercent,
  parseDate,
} from '../../../../../shared/lib/formatters'
import { selectedCategories } from '../../../../../shared/lib/categoryUtils'
import {
  DEFAULT_CATEGORY_COLOR,
  getFirstCategoryColor,
  getFirstCategoryEmoji,
  normalizeCategoryColor,
  normalizeCategoryEmoji,
  withCategoryEmoji,
  type CategoryAppearanceInput,
} from '../../../../../shared/lib/categoryAppearance'
import { PieChart as BreakdownChart } from '../components/PieChart'
import { TimeseriesBarChart, type AnalyticsBarClickPayload } from '../components/TimeseriesBarChart'
import { QuickFilterChip } from '../../../../../shared/ui/QuickFilterChip'
import { CategoryRow } from '../../../../../shared/ui/CategoryRow'
import { CategorySearchDialog } from '../../../../../shared/ui/CategorySearchDialog'
import { ExpenseIcon } from '../../../../../shared/ui/ExpenseIcon'
import { getAnalyticsByCategory, getAnalyticsSummary, getAnalyticsTimeseries } from '../api/analytics'
import { listExpensePage } from '../../expenses/api/expenses'

type AnalyticsScreenProps = {
  categories: Category[]
  readOnly?: boolean
  onCreateCategory?: (name: string, payload?: CategoryAppearanceInput) => Promise<Category>
  onUpdateCategory?: (categoryId: string, name: string, payload?: CategoryAppearanceInput) => Promise<Category>
  onDeleteCategory?: (categoryId: string) => Promise<void>
}

const FALLBACK_FROM = '2000-01-01'
const FILTER_STORAGE_KEY = 'expense:analytics:filters:v1'

type DayRange = {
  from: Date
  to: Date
}

type StoredAnalyticsFilters = {
  fromDate: string | null
  toDate: string | null
  categoryIds: string[]
}

type ChartType = 'donut' | 'bar'
type BarGroupBy = 'week' | 'day' | 'category'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStoredFilters = (value: unknown): value is StoredAnalyticsFilters => {
  if (!isPlainObject(value)) return false
  const fromDate = value.fromDate
  const toDate = value.toDate
  const categoryIds = value.categoryIds
  if (fromDate !== null && typeof fromDate !== 'string') return false
  if (toDate !== null && typeof toDate !== 'string') return false
  if (!Array.isArray(categoryIds)) return false
  return categoryIds.every((id) => typeof id === 'string')
}

const loadStoredFilters = (): StoredAnalyticsFilters | null => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isStoredFilters(parsed) ? parsed : null
  } catch {
    return null
  }
}

const saveStoredFilters = (filters: StoredAnalyticsFilters) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // Ignore storage errors to avoid blocking UI updates.
  }
}

const resolveSameMonthRange = (startDay: number, endDay: number, today: Date): DayRange => {
  const monthOffset = today.getDate() < startDay ? -1 : 0
  const baseMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const from = dateOnly(new Date(baseMonth.getFullYear(), baseMonth.getMonth(), startDay))
  const to = dateOnly(new Date(baseMonth.getFullYear(), baseMonth.getMonth(), endDay))
  return { from, to }
}

const resolveCrossMonthRange = (startDay: number, endDay: number, today: Date): DayRange => {
  if (today.getDate() >= startDay) {
    const from = dateOnly(new Date(today.getFullYear(), today.getMonth(), startDay))
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const to = dateOnly(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), endDay))
    return { from, to }
  }
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const from = dateOnly(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), startDay))
  const to = dateOnly(new Date(today.getFullYear(), today.getMonth(), endDay))
  return { from, to }
}

export function AnalyticsScreen({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  readOnly = false,
}: AnalyticsScreenProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const storedFilters = useMemo(() => loadStoredFilters(), [])
  const [fromDate, setFromDate] = useState<string | null>(storedFilters?.fromDate ?? null)
  const [toDate, setToDate] = useState<string | null>(storedFilters?.toDate ?? null)
  const [filterCategoryIds, setFilterCategoryIds] = useState<Set<string>>(
    () => new Set(storedFilters?.categoryIds ?? [])
  )
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [showAllCategoryBreakdown, setShowAllCategoryBreakdown] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('donut')
  const [barGroupBy, setBarGroupBy] = useState<BarGroupBy>('week')
  const [summary, setSummary] = useState<{
    totalAmount: number
    currency: string
    count: number
    avgPerDay: number
    from: string
    to: string
  } | null>(null)
  const [byCategoryRows, setByCategoryRows] = useState<
    Array<{ categoryId: string; categoryName: string; total: number; count: number }>
  >([])
  const [isLoading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [timeseriesRows, setTimeseriesRows] = useState<
    Array<{ period: string; total: number; count: number }>
  >([])
  const [timeseriesLoading, setTimeseriesLoading] = useState(false)
  const [timeseriesError, setTimeseriesError] = useState<string | null>(null)
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [isListLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null)
  const [drilldownTitle, setDrilldownTitle] = useState<string | null>(null)
  const [drilldownQuery, setDrilldownQuery] = useState<{
    from: string
    to: string
    categoryIds?: string[]
  } | null>(null)
  const [drilldownExpenses, setDrilldownExpenses] = useState<Expense[]>([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const [drilldownError, setDrilldownError] = useState<string | null>(null)

  const hasFilters = fromDate !== null || toDate !== null || filterCategoryIds.size > 0

  const range = useMemo(() => {
    const today = dateOnly(new Date())
    const fallbackFrom = dateOnly(parseDate(FALLBACK_FROM))
    let from = fromDate ? dateOnly(parseDate(fromDate)) : fallbackFrom
    let to = toDate ? dateOnly(parseDate(toDate)) : today
    if (from.getTime() > to.getTime()) {
      const temp = from
      from = to
      to = temp
    }
    return { from: formatDate(from), to: formatDate(to) }
  }, [fromDate, toDate])

  const categoryIds = useMemo(() => Array.from(filterCategoryIds), [filterCategoryIds])
  const categoryIdsKey = categoryIds.join(',')
  const categoryIdsForApi = categoryIds.length > 0 ? categoryIds : undefined
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])

  const applyQuickRange = (days: number) => {
    const today = dateOnly(new Date())
    const start = new Date(today)
    start.setDate(today.getDate() - (days - 1))
    setFromDate(formatDate(start))
    setToDate(formatDate(today))
  }

  const applyDayRange = (startDay: number, endDay: number) => {
    const today = dateOnly(new Date())
    const range =
      startDay <= endDay
        ? resolveSameMonthRange(startDay, endDay, today)
        : resolveCrossMonthRange(startDay, endDay, today)
    setFromDate(formatDate(range.from))
    setToDate(formatDate(range.to))
  }

  const resetFilters = () => {
    setFromDate(null)
    setToDate(null)
    setFilterCategoryIds(new Set())
  }

  useEffect(() => {
    saveStoredFilters({
      fromDate,
      toDate,
      categoryIds: Array.from(filterCategoryIds),
    })
  }, [fromDate, toDate, filterCategoryIds])

  useEffect(() => {
    setShowAllCategoryBreakdown(false)
  }, [fromDate, toDate, filterCategoryIds])

  useEffect(() => {
    let isActive = true
    if (readOnly) {
      setLoading(false)
      setLoadError('Оффлайн: аналитика недоступна.')
      setSummary(null)
      setByCategoryRows([])
      return () => {
        isActive = false
      }
    }
    const loadAnalytics = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [summaryResponse, byCategoryResponse] = await Promise.all([
          getAnalyticsSummary({
            from: range.from,
            to: range.to,
            categoryIds: categoryIdsForApi,
          }),
          getAnalyticsByCategory({
            from: range.from,
            to: range.to,
            categoryIds: categoryIdsForApi,
            limit: 50,
          }),
        ])
        if (!isActive) return
        setSummary(summaryResponse)
        setByCategoryRows(byCategoryResponse)
      } catch {
        if (!isActive) return
        setLoadError('Не удалось загрузить аналитику. Попробуйте ещё раз.')
        setSummary(null)
        setByCategoryRows([])
      } finally {
        if (isActive) setLoading(false)
      }
    }

    void loadAnalytics()
    return () => {
      isActive = false
    }
  }, [readOnly, range.from, range.to, categoryIdsForApi])

  useEffect(() => {
    let isActive = true
    if (chartType !== 'bar') {
      setTimeseriesLoading(false)
      setTimeseriesError(null)
      return () => {
        isActive = false
      }
    }
    if (barGroupBy === 'category') {
      setTimeseriesLoading(false)
      setTimeseriesError(null)
      return () => {
        isActive = false
      }
    }
    if (readOnly) {
      setTimeseriesLoading(false)
      setTimeseriesError('Оффлайн: столбчатая диаграмма недоступна.')
      setTimeseriesRows([])
      return () => {
        isActive = false
      }
    }

    const loadTimeseries = async () => {
      setTimeseriesLoading(true)
      setTimeseriesError(null)
      try {
        const response = await getAnalyticsTimeseries({
          from: range.from,
          to: range.to,
          categoryIds: categoryIdsForApi,
          groupBy: barGroupBy,
        })
        if (!isActive) return
        setTimeseriesRows(response)
      } catch {
        if (!isActive) return
        setTimeseriesError('Не удалось загрузить столбчатую диаграмму.')
        setTimeseriesRows([])
      } finally {
        if (isActive) setTimeseriesLoading(false)
      }
    }

    void loadTimeseries()
    return () => {
      isActive = false
    }
  }, [chartType, barGroupBy, readOnly, range.from, range.to, categoryIdsForApi])

  useEffect(() => {
    let isActive = true
    if (!hasFilters) {
      setFilteredExpenses([])
      setListError(null)
      return () => {
        isActive = false
      }
    }
    if (readOnly) {
      setFilteredExpenses([])
      setListError('Оффлайн: список недоступен.')
      setListLoading(false)
      return () => {
        isActive = false
      }
    }

    const loadList = async () => {
      setListLoading(true)
      setListError(null)
      try {
        const response = await listExpensePage({
          from: range.from,
          to: range.to,
          categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
          limit: 50,
          offset: 0,
        })
        if (!isActive) return
        setFilteredExpenses(response.items)
      } catch {
        if (!isActive) return
        setListError('Не удалось загрузить список по фильтрам.')
        setFilteredExpenses([])
      } finally {
        if (isActive) setListLoading(false)
      }
    }

    void loadList()
    return () => {
      isActive = false
    }
  }, [readOnly, hasFilters, range.from, range.to, categoryIds, categoryIdsKey])

  const filteredSorted = useMemo(() => filteredExpenses, [filteredExpenses])

  const rowsForBreakdown = useMemo(() => {
    return byCategoryRows
  }, [byCategoryRows])

  const slices = useMemo(() => {
    const entries = [...rowsForBreakdown].sort((a, b) => b.total - a.total)
    return entries.map((row) => {
      const linkedCategory = categoryMap.get(row.categoryId)
      const baseLabel = linkedCategory?.name || row.categoryName || 'Без категории'
      const label = linkedCategory ? withCategoryEmoji(linkedCategory) : baseLabel
      return {
        id: row.categoryId,
        label,
        emoji: normalizeCategoryEmoji(linkedCategory?.emoji),
        value: row.total,
        color: normalizeCategoryColor(linkedCategory?.color) ?? DEFAULT_CATEGORY_COLOR,
      }
    })
  }, [rowsForBreakdown, categoryMap])

  const totalByCategories = slices.reduce((sum, slice) => sum + slice.value, 0)
  const currencyLabel = summary?.currency ?? ''
  const breakdownVisible = showAllCategoryBreakdown ? slices : slices.slice(0, 5)
  const breakdownRemaining = slices.length - breakdownVisible.length

  const selectedCategoryList = selectedCategories(categories, filterCategoryIds)
  const pieChartSize = fullScreen ? 220 : 260

  const closeDrilldown = () => {
    setActiveSliceId(null)
    setDrilldownTitle(null)
    setDrilldownQuery(null)
    setDrilldownExpenses([])
    setDrilldownError(null)
  }

  const openDrilldown = (slice: { id?: string; label: string }) => {
    if (readOnly) return
    if (!slice.id) return
    const linkedCategory = categoryMap.get(slice.id)
    setActiveSliceId(slice.id)
    setDrilldownTitle(`Траты по категории: ${linkedCategory?.name ?? slice.label}`)
    setDrilldownQuery({
      from: range.from,
      to: range.to,
      categoryIds: [slice.id],
    })
    setDrilldownExpenses([])
    setDrilldownError(null)
  }

  const openBarDrilldown = (payload: AnalyticsBarClickPayload) => {
    if (readOnly) return
    setActiveSliceId(null)
    if (payload.mode === 'category') {
      setDrilldownTitle(`Траты по категории: ${payload.label}`)
      setDrilldownQuery({
        from: range.from,
        to: range.to,
        categoryIds: payload.id ? [payload.id] : categoryIdsForApi,
      })
      setDrilldownExpenses([])
      setDrilldownError(null)
      return
    }

    const periodStart = dateOnly(parseDate(payload.period))
    const periodEnd = new Date(periodStart)
    if (payload.groupBy === 'week') {
      periodEnd.setDate(periodEnd.getDate() + 6)
    }
    const rangeStart = dateOnly(parseDate(range.from))
    const rangeEnd = dateOnly(parseDate(range.to))
    const fromDate = periodStart.getTime() < rangeStart.getTime() ? rangeStart : periodStart
    const toDate = periodEnd.getTime() > rangeEnd.getTime() ? rangeEnd : periodEnd
    const from = formatDate(fromDate)
    const to = formatDate(toDate)
    const fromLabel = formatDateDots(fromDate)
    const toLabel = formatDateDots(toDate)
    setDrilldownTitle(
      payload.groupBy === 'week' ? `Траты за период ${fromLabel} — ${toLabel}` : `Траты за ${fromLabel}`
    )
    setDrilldownQuery({
      from,
      to,
      categoryIds: categoryIdsForApi,
    })
    setDrilldownExpenses([])
    setDrilldownError(null)
  }

  useEffect(() => {
    if (!drilldownQuery) return
    let isActive = true
    if (readOnly) {
      setDrilldownLoading(false)
      setDrilldownError('Оффлайн: данные недоступны.')
      setDrilldownExpenses([])
      return () => {
        isActive = false
      }
    }
    const loadDrilldown = async () => {
      setDrilldownLoading(true)
      setDrilldownError(null)
      try {
        const response = await listExpensePage({
          from: drilldownQuery.from,
          to: drilldownQuery.to,
          categoryIds: drilldownQuery.categoryIds,
          limit: 50,
          offset: 0,
        })
        if (!isActive) return
        setDrilldownExpenses(response.items)
      } catch {
        if (!isActive) return
        setDrilldownError('Не удалось загрузить список по категории.')
        setDrilldownExpenses([])
      } finally {
        if (isActive) setDrilldownLoading(false)
      }
    }

    void loadDrilldown()
    return () => {
      isActive = false
    }
  }, [readOnly, drilldownQuery])

  const pluralCategory = (count: number) => {
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod10 === 1 && mod100 !== 11) return 'категорию'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'категории'
    }
    return 'категорий'
  }

  return (
    <Stack spacing={1}>
      <Card elevation={0} sx={{ mt: 0.25 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight={600}>
                Фильтры
              </Typography>
              <Button size="small" onClick={resetFilters}>
                Сброс
              </Button>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Дата от"
                type="date"
                value={fromDate ?? ''}
                onChange={(event) => setFromDate(event.target.value || null)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <TextField
                label="Дата до"
                type="date"
                value={toDate ?? ''}
                onChange={(event) => setToDate(event.target.value || null)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 0 }}
              />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <QuickFilterChip label="За неделю" onClick={() => applyQuickRange(7)} />
              <QuickFilterChip label="За месяц" onClick={() => applyQuickRange(30)} />
              <QuickFilterChip label="От 5 до 19" onClick={() => applyDayRange(5, 19)} />
              <QuickFilterChip label="От 20 до 4" onClick={() => applyDayRange(20, 4)} />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Категории
              </Typography>
              {selectedCategoryList.length === 0 ? (
                <ButtonBase
                  onClick={() => setCategoryDialogOpen(true)}
                  sx={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    borderRadius: 1.5,
                    border: 1,
                    borderStyle: 'dashed',
                    borderColor: 'divider',
                    px: 1.25,
                    py: 1,
                    textAlign: 'left',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Выбрать категории
                  </Typography>
                </ButtonBase>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
                    {selectedCategoryList.map((category) => {
                      const categoryColor = normalizeCategoryColor(category.color) ?? DEFAULT_CATEGORY_COLOR
                      return (
                        <Chip
                          key={category.id}
                          label={withCategoryEmoji(category)}
                          size="small"
                          variant="outlined"
                          onDelete={() =>
                            setFilterCategoryIds((prev) => {
                              const next = new Set(prev)
                              next.delete(category.id)
                              return next
                            })
                          }
                          sx={{
                            borderColor: alpha(categoryColor, 0.55),
                            bgcolor: alpha(categoryColor, 0.14),
                          }}
                        />
                      )
                    })}
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setCategoryDialogOpen(true)}
                    sx={{ minWidth: 64, minHeight: 28, px: 1, fontWeight: 600, lineHeight: 1 }}
                  >
                    Выбрать
                  </Button>
                </Stack>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loadError ? <Alert severity="error">{loadError}</Alert> : null}

      <Card elevation={0}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight={600}>
                Диаграмма
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={chartType}
                onChange={(_, value: ChartType | null) => {
                  if (value) setChartType(value)
                }}
              >
                <ToggleButton value="donut" title="Бублик" aria-label="Бублик">
                  <DonutLargeIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="bar" title="Столбчатая" aria-label="Столбчатая">
                  <BarChartIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {chartType === 'bar' ? (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label="По неделям"
                    size="small"
                    color={barGroupBy === 'week' ? 'primary' : 'default'}
                    variant={barGroupBy === 'week' ? 'filled' : 'outlined'}
                    onClick={() => setBarGroupBy('week')}
                  />
                  <Chip
                    label="По дням"
                    size="small"
                    color={barGroupBy === 'day' ? 'primary' : 'default'}
                    variant={barGroupBy === 'day' ? 'filled' : 'outlined'}
                    onClick={() => setBarGroupBy('day')}
                  />
                  <Chip
                    label="По категориям"
                    size="small"
                    color={barGroupBy === 'category' ? 'primary' : 'default'}
                    variant={barGroupBy === 'category' ? 'filled' : 'outlined'}
                    onClick={() => setBarGroupBy('category')}
                  />
                </Stack>
                {barGroupBy === 'category' ? (
                  isLoading ? (
                    <Stack spacing={1} alignItems="center">
                      <CircularProgress size={24} />
                      <Typography variant="body2" color="text.secondary">
                        Загружаем диаграмму по категориям…
                      </Typography>
                    </Stack>
                  ) : slices.length === 0 ? (
                    <Typography color="text.secondary">Нет данных для диаграммы</Typography>
                  ) : (
                    <TimeseriesBarChart
                      mode="category"
                      categoryRows={slices.map((slice) => ({
                        id: slice.id,
                        label: slice.label,
                        value: slice.value,
                        color: slice.color,
                      }))}
                      currency={currencyLabel || undefined}
                      compact={fullScreen}
                      onBarClick={openBarDrilldown}
                    />
                  )
                ) : timeseriesLoading ? (
                  <Stack spacing={1} alignItems="center">
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      Загружаем столбчатую диаграмму…
                    </Typography>
                  </Stack>
                ) : timeseriesError ? (
                  <Typography color="error">{timeseriesError}</Typography>
                ) : timeseriesRows.length === 0 ? (
                  <Typography color="text.secondary">Нет данных для диаграммы</Typography>
                ) : (
                  <TimeseriesBarChart
                    mode="time"
                    rows={timeseriesRows}
                    groupBy={barGroupBy}
                    currency={currencyLabel || undefined}
                    compact={fullScreen}
                    onBarClick={openBarDrilldown}
                  />
                )}
              </Stack>
            ) : isLoading ? (
              <Stack spacing={1} alignItems="center">
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Загружаем аналитику…
                </Typography>
              </Stack>
            ) : slices.length === 0 ? (
              <Typography color="text.secondary">Нет данных для диаграммы</Typography>
            ) : (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <BreakdownChart
                    slices={slices}
                    size={pieChartSize}
                    holeRatio={0.58}
                    centerValue={formatAmount(totalByCategories)}
                    centerLabel={currencyLabel || undefined}
                    activeSliceId={activeSliceId}
                    onSliceClick={(slice) => {
                      openDrilldown(slice)
                    }}
                  />
                </Box>
                <Stack spacing={1}>
                  {breakdownVisible.map((slice) => (
                    <ButtonBase
                      key={slice.id || slice.label}
                      onClick={() => openDrilldown(slice)}
                      disabled={readOnly || !slice.id}
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        px: 0.5,
                        py: 0.35,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        '&:hover': {
                          bgcolor:
                            readOnly || !slice.id
                              ? 'transparent'
                              : alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: slice.color,
                          }}
                        />
                        <Typography noWrap>{slice.label}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {formatPercent(slice.value, totalByCategories)}%
                        </Typography>
                        <Typography fontWeight={600}>
                          {currencyLabel
                            ? `${formatAmount(slice.value)} ${currencyLabel}`
                            : formatAmount(slice.value)}
                        </Typography>
                      </Stack>
                    </ButtonBase>
                  ))}
                  {breakdownRemaining > 0 ? (
                    <Button size="small" onClick={() => setShowAllCategoryBreakdown(true)}>
                      Показать еще {breakdownRemaining} {pluralCategory(breakdownRemaining)}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardContent>
          {hasFilters ? (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" fontWeight={600}>
                Список по фильтрам
              </Typography>
              {listError ? (
                <Typography color="error">{listError}</Typography>
              ) : isListLoading ? (
                <Typography color="text.secondary">Загружаем список…</Typography>
              ) : filteredSorted.length === 0 ? (
                <Typography color="text.secondary">Нет подходящих записей</Typography>
              ) : (
                <Stack spacing={1}>
                  {filteredSorted.map((expense, index) => {
                    const expenseCategories = expense.categoryIds
                      .map((id) => categoryMap.get(id))
                      .filter((category): category is Category => Boolean(category))
                    const categoryItems = expenseCategories.map((category) => ({
                      id: category.id,
                      label: withCategoryEmoji(category),
                      color: normalizeCategoryColor(category.color) ?? DEFAULT_CATEGORY_COLOR,
                    }))
                    const iconEmoji = getFirstCategoryEmoji(expenseCategories)
                    const iconColor = getFirstCategoryColor(expenseCategories)
                    return (
                      <Box key={expense.id}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ minWidth: 0, flex: 1 }}
                          >
                            <ExpenseIcon size={32} emoji={iconEmoji} color={iconColor} />
                            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                              <Typography fontWeight={600} noWrap>
                                {expense.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatDateDots(parseDate(expense.date))}
                              </Typography>
                              {categoryItems.length > 0 ? <CategoryRow categories={categoryItems} maxVisible={3} /> : null}
                            </Stack>
                          </Stack>
                          <Typography fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                            {formatAmount(expense.amount)} {expense.currency}
                          </Typography>
                        </Stack>
                        {index < filteredSorted.length - 1 ? <Divider sx={{ mt: 1.5 }} /> : null}
                      </Box>
                    )
                  })}
                </Stack>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Для отображения списка трат активируйте фильтр
            </Typography>
          )}
        </CardContent>
      </Card>

      <CategorySearchDialog
        isOpen={isCategoryDialogOpen}
        categories={categories}
        initialSelected={Array.from(filterCategoryIds)}
        onClose={() => setCategoryDialogOpen(false)}
        onConfirm={(selected) => {
          setFilterCategoryIds(new Set(selected))
          setCategoryDialogOpen(false)
        }}
        onCreateCategory={readOnly ? undefined : onCreateCategory}
        onUpdateCategory={readOnly ? undefined : onUpdateCategory}
        onDeleteCategory={readOnly ? undefined : onDeleteCategory}
        enableSelectAll
      />

      <Dialog
        open={Boolean(drilldownQuery)}
        onClose={closeDrilldown}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{drilldownTitle || 'Траты'}</DialogTitle>
        <DialogContent dividers>
          {drilldownLoading ? (
            <Stack alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : drilldownError ? (
            <Alert severity="error">{drilldownError}</Alert>
          ) : drilldownExpenses.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Нет трат по выбранному периоду или категории.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {drilldownExpenses.map((expense) => {
                const expenseCategories = expense.categoryIds
                  .map((id) => categoryMap.get(id))
                  .filter((category): category is Category => Boolean(category))
                const categoryItems = expenseCategories.map((category) => ({
                  id: category.id,
                  label: withCategoryEmoji(category),
                  color: normalizeCategoryColor(category.color) ?? DEFAULT_CATEGORY_COLOR,
                }))
                const iconEmoji = getFirstCategoryEmoji(expenseCategories)
                const iconColor = getFirstCategoryColor(expenseCategories)
                return (
                  <Box
                    key={expense.id}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <ExpenseIcon size={32} emoji={iconEmoji} color={iconColor} />
                      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {expense.title}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {formatAmount(expense.amount)} {expense.currency}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateDots(parseDate(expense.date))}
                        </Typography>
                        {categoryItems.length > 0 ? <CategoryRow categories={categoryItems} maxVisible={3} /> : null}
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDrilldown}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
