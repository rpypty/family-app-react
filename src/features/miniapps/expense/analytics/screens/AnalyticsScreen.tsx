import { useEffect, useMemo, useRef, useState } from 'react'
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
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material'
import BarChartIcon from '@mui/icons-material/BarChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import { alpha, useTheme } from '@mui/material/styles'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, normalizePathname } from '../../../../../app/routing/routes'
import { DEFAULT_CURRENCY, type Expense, type Category } from '../../../../../shared/types'
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
import { listCurrencies, type CurrencyItem } from '../../api/currencies'
import { formatExpenseBaseApproxAmount } from '../../expenses/lib/expenseBaseEquivalent'

type AnalyticsScreenProps = {
  categories: Category[]
  familyDefaultCurrency?: string | null
  readOnly?: boolean
  onCreateCategory?: (name: string, payload?: CategoryAppearanceInput) => Promise<Category>
  onUpdateCategory?: (categoryId: string, name: string, payload?: CategoryAppearanceInput) => Promise<Category>
  onDeleteCategory?: (categoryId: string) => Promise<void>
  onRefreshCategories?: () => void
}

const FALLBACK_FROM = '2000-01-01'
const FILTER_STORAGE_KEY = 'expense:analytics:filters:v2'
const ANALYTICS_PAGE_SIZE = 50
const BASE_CURRENCY_FILTER_VALUE = '__BASE__'
const FALLBACK_CURRENCIES: CurrencyItem[] = [
  { code: 'BYN', name: 'Belarusian Ruble' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'RUB', name: 'Russian Ruble' },
]
const formatCurrencyOptionLabel = (item: Pick<CurrencyItem, 'code' | 'icon'>): string =>
  item.icon ? `${item.icon} ${item.code}` : item.code

type DayRange = {
  from: Date
  to: Date
}

type StoredAnalyticsFilters = {
  fromDate: string | null
  toDate: string | null
  categoryIds: string[]
  currency: string | null
}

type ChartType = 'donut' | 'bar'
type BarGroupBy = 'week' | 'day' | 'category'
type DrilldownRouteState = {
  from: string
  to: string
  title: string
  currency?: string
  categoryIds?: string[]
  activeSliceId?: string
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStoredFilters = (value: unknown): value is StoredAnalyticsFilters => {
  if (!isPlainObject(value)) return false
  const fromDate = value.fromDate
  const toDate = value.toDate
  const categoryIds = value.categoryIds
  const currency = value.currency
  if (fromDate !== null && typeof fromDate !== 'string') return false
  if (toDate !== null && typeof toDate !== 'string') return false
  if (currency !== undefined && currency !== null && typeof currency !== 'string') return false
  if (!Array.isArray(categoryIds)) return false
  return categoryIds.every((id) => typeof id === 'string')
}

const loadStoredFilters = (): StoredAnalyticsFilters | null => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isStoredFilters(parsed)) return null
    return {
      fromDate: parsed.fromDate,
      toDate: parsed.toDate,
      categoryIds: parsed.categoryIds,
      currency: typeof parsed.currency === 'string' ? parsed.currency : null,
    }
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
  familyDefaultCurrency,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRefreshCategories,
  readOnly = false,
}: AnalyticsScreenProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const currentPath = normalizePathname(location.pathname)
  const isDrilldownRoute = currentPath === ROUTES.expenseAnalyticsDrilldown
  const isCategoryRoute = currentPath === ROUTES.expenseAnalyticsTags
  const storedFilters = useMemo(() => loadStoredFilters(), [])
  const [fromDate, setFromDate] = useState<string | null>(storedFilters?.fromDate ?? null)
  const [toDate, setToDate] = useState<string | null>(storedFilters?.toDate ?? null)
  const [filterCategoryIds, setFilterCategoryIds] = useState<Set<string>>(
    () => new Set(storedFilters?.categoryIds ?? [])
  )
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(storedFilters?.currency ?? null)
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([])
  const [isCurrenciesLoading, setCurrenciesLoading] = useState(false)
  const [currenciesError, setCurrenciesError] = useState<string | null>(null)
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
  const [filteredTotal, setFilteredTotal] = useState(0)
  const [filteredOffset, setFilteredOffset] = useState(0)
  const [isListLoading, setListLoading] = useState(false)
  const [isListLoadingMore, setListLoadingMore] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null)
  const [drilldownExpenses, setDrilldownExpenses] = useState<Expense[]>([])
  const [drilldownTotal, setDrilldownTotal] = useState(0)
  const [drilldownOffset, setDrilldownOffset] = useState(0)
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const [drilldownLoadingMore, setDrilldownLoadingMore] = useState(false)
  const [drilldownError, setDrilldownError] = useState<string | null>(null)
  const wasCategoryRouteRef = useRef(false)
  const normalizedFamilyCurrency = (familyDefaultCurrency?.trim().toUpperCase() || DEFAULT_CURRENCY)

  const hasFilters =
    fromDate !== null || toDate !== null || filterCategoryIds.size > 0 || selectedCurrency !== null

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
  const selectedCurrencyForApi = selectedCurrency ?? undefined
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const currencyOptions = useMemo(() => {
    const map = new Map<string, CurrencyItem>()
    currencies.forEach((item) => {
      map.set(item.code, item)
    })
    if (selectedCurrency && !map.has(selectedCurrency)) {
      map.set(selectedCurrency, { code: selectedCurrency, name: selectedCurrency })
    }
    return Array.from(map.values())
  }, [currencies, selectedCurrency])
  const drilldownRouteState = useMemo<DrilldownRouteState | null>(() => {
    if (!isDrilldownRoute) return null
    const params = new URLSearchParams(location.search)
    const from = params.get('from')
    const to = params.get('to')
    const title = params.get('title')
    if (!from || !to || !title) return null
    const currency = params.get('currency') || undefined
    const ids = params.getAll('categoryId')
    const categoryIds = ids.length > 0 ? ids : undefined
    const activeSliceId = params.get('activeSliceId') || undefined
    return {
      from,
      to,
      title,
      currency,
      categoryIds,
      activeSliceId,
    }
  }, [isDrilldownRoute, location.search])

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
    setSelectedCurrency(null)
  }

  const openCategoryFilters = () => {
    navigate(ROUTES.expenseAnalyticsTags)
  }

  useEffect(() => {
    let isActive = true
    setCurrenciesLoading(true)
    setCurrenciesError(null)
    ;(async () => {
      try {
        const response = await listCurrencies()
        if (!isActive) return
        setCurrencies(response.length > 0 ? response : FALLBACK_CURRENCIES)
      } catch {
        if (!isActive) return
        setCurrencies(FALLBACK_CURRENCIES)
        setCurrenciesError('Не удалось загрузить справочник валют. Используется базовый набор.')
      } finally {
        if (isActive) {
          setCurrenciesLoading(false)
        }
      }
    })()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (isCategoryRoute && !wasCategoryRouteRef.current) {
      onRefreshCategories?.()
    }
    wasCategoryRouteRef.current = isCategoryRoute
  }, [isCategoryRoute, onRefreshCategories])

  const openDrilldownRoute = (payload: DrilldownRouteState) => {
    const params = new URLSearchParams()
    params.set('from', payload.from)
    params.set('to', payload.to)
    params.set('title', payload.title)
    if (payload.activeSliceId) {
      params.set('activeSliceId', payload.activeSliceId)
    }
    if (payload.currency) {
      params.set('currency', payload.currency)
    }
    payload.categoryIds?.forEach((id) => params.append('categoryId', id))
    navigate(`${ROUTES.expenseAnalyticsDrilldown}?${params.toString()}`)
  }

  useEffect(() => {
    if (!isDrilldownRoute) return
    if (drilldownRouteState) return
    navigate(ROUTES.expenseAnalytics, { replace: true })
  }, [isDrilldownRoute, drilldownRouteState, navigate])

  useEffect(() => {
    setActiveSliceId(drilldownRouteState?.activeSliceId ?? null)
  }, [drilldownRouteState])

  useEffect(() => {
    saveStoredFilters({
      fromDate,
      toDate,
      categoryIds: Array.from(filterCategoryIds),
      currency: selectedCurrency,
    })
  }, [fromDate, toDate, filterCategoryIds, selectedCurrency])

  useEffect(() => {
    setShowAllCategoryBreakdown(false)
  }, [fromDate, toDate, filterCategoryIds, selectedCurrency])

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
            currency: selectedCurrencyForApi,
            categoryIds: categoryIdsForApi,
          }),
          getAnalyticsByCategory({
            from: range.from,
            to: range.to,
            currency: selectedCurrencyForApi,
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
  }, [readOnly, range.from, range.to, selectedCurrencyForApi, categoryIdsForApi])

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
          currency: selectedCurrencyForApi,
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
  }, [chartType, barGroupBy, readOnly, range.from, range.to, selectedCurrencyForApi, categoryIdsForApi])

  useEffect(() => {
    let isActive = true
    if (!hasFilters) {
      setFilteredExpenses([])
      setFilteredTotal(0)
      setFilteredOffset(0)
      setListLoadingMore(false)
      setListError(null)
      return () => {
        isActive = false
      }
    }
    if (readOnly) {
      setFilteredExpenses([])
      setFilteredTotal(0)
      setFilteredOffset(0)
      setListLoadingMore(false)
      setListError('Оффлайн: список недоступен.')
      setListLoading(false)
      return () => {
        isActive = false
      }
    }

    const loadList = async () => {
      setListLoading(true)
      setListLoadingMore(false)
      setListError(null)
      try {
        const response = await listExpensePage({
          from: range.from,
          to: range.to,
          currency: selectedCurrencyForApi,
          categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
          limit: ANALYTICS_PAGE_SIZE,
          offset: 0,
        })
        if (!isActive) return
        setFilteredExpenses(response.items)
        setFilteredTotal(response.total)
        setFilteredOffset(response.items.length)
      } catch {
        if (!isActive) return
        setListError('Не удалось загрузить список по фильтрам.')
        setFilteredExpenses([])
        setFilteredTotal(0)
        setFilteredOffset(0)
      } finally {
        if (isActive) setListLoading(false)
      }
    }

    void loadList()
    return () => {
      isActive = false
    }
  }, [readOnly, hasFilters, range.from, range.to, selectedCurrencyForApi, categoryIds, categoryIdsKey])

  const filteredSorted = useMemo(() => filteredExpenses, [filteredExpenses])
  const hasMoreFilteredExpenses = filteredOffset < filteredTotal
  const hasMoreDrilldownExpenses = drilldownOffset < drilldownTotal

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
    navigate(ROUTES.expenseAnalytics, { replace: true })
    setDrilldownExpenses([])
    setDrilldownTotal(0)
    setDrilldownOffset(0)
    setDrilldownLoadingMore(false)
    setDrilldownError(null)
  }

  const openDrilldown = (slice: { id?: string; label: string }) => {
    if (readOnly) return
    if (!slice.id) return
    const linkedCategory = categoryMap.get(slice.id)
    openDrilldownRoute({
      from: range.from,
      to: range.to,
      title: `Траты по категории: ${linkedCategory?.name ?? slice.label}`,
      currency: selectedCurrencyForApi,
      categoryIds: [slice.id],
      activeSliceId: slice.id,
    })
    setDrilldownExpenses([])
    setDrilldownError(null)
  }

  const openBarDrilldown = (payload: AnalyticsBarClickPayload) => {
    if (readOnly) return
    if (payload.mode === 'category') {
      openDrilldownRoute({
        from: range.from,
        to: range.to,
        title: `Траты по категории: ${payload.label}`,
        currency: selectedCurrencyForApi,
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
    const title =
      payload.groupBy === 'week' ? `Траты за период ${fromLabel} — ${toLabel}` : `Траты за ${fromLabel}`
    openDrilldownRoute({
      from,
      to,
      title,
      currency: selectedCurrencyForApi,
      categoryIds: categoryIdsForApi,
    })
    setDrilldownExpenses([])
    setDrilldownError(null)
  }

  useEffect(() => {
    if (!drilldownRouteState) return
    let isActive = true
    if (readOnly) {
      setDrilldownLoading(false)
      setDrilldownLoadingMore(false)
      setDrilldownError('Оффлайн: данные недоступны.')
      setDrilldownExpenses([])
      setDrilldownTotal(0)
      setDrilldownOffset(0)
      return () => {
        isActive = false
      }
    }
    const loadDrilldown = async () => {
      setDrilldownLoading(true)
      setDrilldownLoadingMore(false)
      setDrilldownError(null)
      try {
        const response = await listExpensePage({
          from: drilldownRouteState.from,
          to: drilldownRouteState.to,
          currency: drilldownRouteState.currency,
          categoryIds: drilldownRouteState.categoryIds,
          limit: ANALYTICS_PAGE_SIZE,
          offset: 0,
        })
        if (!isActive) return
        setDrilldownExpenses(response.items)
        setDrilldownTotal(response.total)
        setDrilldownOffset(response.items.length)
      } catch {
        if (!isActive) return
        setDrilldownError('Не удалось загрузить список по категории.')
        setDrilldownExpenses([])
        setDrilldownTotal(0)
        setDrilldownOffset(0)
      } finally {
        if (isActive) setDrilldownLoading(false)
      }
    }

    void loadDrilldown()
    return () => {
      isActive = false
    }
  }, [readOnly, drilldownRouteState])

  const handleLoadMoreFilteredExpenses = async () => {
    if (readOnly || !hasFilters) return
    if (isListLoading || isListLoadingMore) return
    if (!hasMoreFilteredExpenses) return
    setListLoadingMore(true)
    try {
      const response = await listExpensePage({
        from: range.from,
        to: range.to,
        currency: selectedCurrencyForApi,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        limit: ANALYTICS_PAGE_SIZE,
        offset: filteredOffset,
      })
      setFilteredExpenses((prev) => [...prev, ...response.items])
      setFilteredTotal(response.total)
      setFilteredOffset((prev) => prev + response.items.length)
    } catch {
      setListError('Не удалось загрузить ещё записи.')
    } finally {
      setListLoadingMore(false)
    }
  }

  const handleLoadMoreDrilldownExpenses = async () => {
    if (readOnly || !drilldownRouteState) return
    if (drilldownLoading || drilldownLoadingMore) return
    if (!hasMoreDrilldownExpenses) return
    setDrilldownLoadingMore(true)
    try {
      const response = await listExpensePage({
        from: drilldownRouteState.from,
        to: drilldownRouteState.to,
        currency: drilldownRouteState.currency,
        categoryIds: drilldownRouteState.categoryIds,
        limit: ANALYTICS_PAGE_SIZE,
        offset: drilldownOffset,
      })
      setDrilldownExpenses((prev) => [...prev, ...response.items])
      setDrilldownTotal(response.total)
      setDrilldownOffset((prev) => prev + response.items.length)
    } catch {
      setDrilldownError('Не удалось загрузить ещё записи по категории.')
    } finally {
      setDrilldownLoadingMore(false)
    }
  }

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
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: '10px !important', mb: '16px !important' }}
            >
              <QuickFilterChip label="За неделю" onClick={() => applyQuickRange(7)} />
              <QuickFilterChip label="За месяц" onClick={() => applyQuickRange(30)} />
              <QuickFilterChip label="От 5 до 19" onClick={() => applyDayRange(5, 19)} />
              <QuickFilterChip label="От 20 до 4" onClick={() => applyDayRange(20, 4)} />
            </Stack>
            <TextField
              select
              fullWidth
              label="Валюта аналитики"
              value={selectedCurrency ?? BASE_CURRENCY_FILTER_VALUE}
              onChange={(event) => {
                const next = event.target.value
                setSelectedCurrency(next === BASE_CURRENCY_FILTER_VALUE ? null : next)
              }}
              disabled={isCurrenciesLoading}
              SelectProps={{
                renderValue: (value) => {
                  if (value === BASE_CURRENCY_FILTER_VALUE) {
                    return `Все / ${normalizedFamilyCurrency}`
                  }
                  const selected = currencyOptions.find((item) => item.code === value)
                  return selected ? formatCurrencyOptionLabel(selected) : String(value)
                },
              }}
              helperText={
                isCurrenciesLoading
                  ? 'Загрузка валют...'
                  : selectedCurrency === null
                  ? `Все/${normalizedFamilyCurrency}: суммы агрегируются в базовой валюте.`
                  : `Только траты в ${selectedCurrency}.`
              }
            >
              <MenuItem value={BASE_CURRENCY_FILTER_VALUE}>Все / {normalizedFamilyCurrency}</MenuItem>
              {currencyOptions.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  {formatCurrencyOptionLabel(item)}
                </MenuItem>
              ))}
            </TextField>
            {currenciesError ? <Alert severity="warning">{currenciesError}</Alert> : null}
            <Stack spacing={0} sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Категории"
                value={selectedCategoryList.length > 0 ? '' : 'Выбрать категории'}
                onClick={openCategoryFilters}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openCategoryFilters()
                  }
                }}
                InputProps={{
                  readOnly: true,
                  startAdornment:
                    selectedCategoryList.length > 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 0.75,
                          width: '100%',
                          px: 0.25,
                          py: 0.5,
                        }}
                      >
                        {selectedCategoryList.map((category) => {
                          const categoryColor = normalizeCategoryColor(category.color) ?? DEFAULT_CATEGORY_COLOR
                          return (
                            <Chip
                              key={category.id}
                              label={category.name}
                              size="small"
                              variant="outlined"
                              onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
                              onTouchStart={(touchEvent) => touchEvent.stopPropagation()}
                              onClick={(mouseEvent) => mouseEvent.stopPropagation()}
                              onDelete={() =>
                                setFilterCategoryIds((prev) => {
                                  const next = new Set(prev)
                                  next.delete(category.id)
                                  return next
                                })
                              }
                              sx={{
                                flexShrink: 0,
                                borderColor: alpha(categoryColor, 0.55),
                                bgcolor: alpha(categoryColor, 0.14),
                              }}
                            />
                          )
                        })}
                      </Box>
                    ) : undefined,
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    alignItems: 'center',
                    minHeight: 56,
                    py: selectedCategoryList.length > 0 ? 0.75 : 0,
                  },
                  '& .MuiInputBase-input': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: selectedCategoryList.length > 0 ? 0 : 'auto',
                    width: selectedCategoryList.length > 0 ? 0 : 'auto',
                    padding: selectedCategoryList.length > 0 ? 0 : undefined,
                    cursor: 'pointer',
                  },
                }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loadError ? <Alert severity="error">{loadError}</Alert> : null}

      <Card elevation={0}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Диаграмма
                </Typography>
              </Stack>
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
                        <Typography noWrap variant={fullScreen ? 'body2' : 'body1'}>
                          {slice.label}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={fullScreen ? 1.25 : 2} alignItems="center">
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={fullScreen ? { fontSize: '0.68rem' } : undefined}
                        >
                          {formatPercent(slice.value, totalByCategories)}%
                        </Typography>
                        <Typography
                          fontWeight={600}
                          sx={fullScreen ? { fontSize: '0.8rem', whiteSpace: 'nowrap' } : undefined}
                        >
                          {formatAmount(slice.value)}
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
                    const baseApprox = formatExpenseBaseApproxAmount(expense)
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
                          <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ whiteSpace: 'nowrap' }}>
                            {baseApprox ? (
                              <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                                {baseApprox}
                              </Typography>
                            ) : null}
                            <Typography fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                              {formatAmount(expense.amount)} {expense.currency}
                            </Typography>
                          </Stack>
                        </Stack>
                        {index < filteredSorted.length - 1 ? <Divider sx={{ mt: 1.5 }} /> : null}
                      </Box>
                    )
                  })}
                  {hasMoreFilteredExpenses ? (
                    <Button
                      size="small"
                      onClick={() => void handleLoadMoreFilteredExpenses()}
                      disabled={isListLoadingMore}
                    >
                      {isListLoadingMore ? 'Загружаем...' : 'Показать ещё'}
                    </Button>
                  ) : null}
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
        isOpen={isCategoryRoute}
        categories={categories}
        initialSelected={Array.from(filterCategoryIds)}
        onClose={() => navigate(ROUTES.expenseAnalytics, { replace: true })}
        onConfirm={(selected) => {
          setFilterCategoryIds(new Set(selected))
          navigate(ROUTES.expenseAnalytics, { replace: true })
        }}
        onCreateCategory={readOnly ? undefined : onCreateCategory}
        onUpdateCategory={readOnly ? undefined : onUpdateCategory}
        onDeleteCategory={readOnly ? undefined : onDeleteCategory}
        enableSelectAll
      />

      <Dialog
        open={Boolean(drilldownRouteState)}
        onClose={closeDrilldown}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            bgcolor: 'background.paper',
            color: 'text.secondary',
            borderBottom: 1,
            borderColor: 'divider',
            py: 1.5,
          }}
        >
          <Box sx={{ position: 'relative', textAlign: 'center' }}>
            <IconButton
              color="inherit"
              onClick={closeDrilldown}
              aria-label="Назад"
              sx={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)' }}
            >
              <ArrowBackRounded />
            </IconButton>
            <Typography
              component="span"
              color="inherit"
              sx={{
                display: 'block',
                px: 5,
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                lineHeight: 1.25,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
              }}
            >
              {drilldownRouteState?.title || 'Траты'}
            </Typography>
          </Box>
        </DialogTitle>
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
                const baseApprox = formatExpenseBaseApproxAmount(expense)
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
                          <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ whiteSpace: 'nowrap' }}>
                            {baseApprox ? (
                              <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                                {baseApprox}
                              </Typography>
                            ) : null}
                            <Typography variant="subtitle2" fontWeight={600}>
                              {formatAmount(expense.amount)} {expense.currency}
                            </Typography>
                          </Stack>
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
              {hasMoreDrilldownExpenses ? (
                <Button
                  size="small"
                  onClick={() => void handleLoadMoreDrilldownExpenses()}
                  disabled={drilldownLoadingMore}
                >
                  {drilldownLoadingMore ? 'Загружаем...' : 'Показать ещё'}
                </Button>
              ) : null}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  )
}
