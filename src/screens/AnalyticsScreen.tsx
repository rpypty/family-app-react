import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  Divider,
  Stack,
  TextField,
  Typography,
  Checkbox,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Expense, Tag } from '../data/types'
import {
  dateOnly,
  formatAmount,
  formatDate,
  formatDateDots,
  formatPercent,
  latestDayOfMonth,
  parseDate,
} from '../utils/formatters'
import { selectedTags } from '../utils/tagUtils'
import { PieChart } from '../components/PieChart'
import { QuickFilterChip } from '../components/QuickFilterChip'
import { TagPickerInput } from '../components/TagPickerInput'
import { TagRow } from '../components/TagRow'
import { TagSearchDialog } from '../components/TagSearchDialog'
import { getAnalyticsByTag, getAnalyticsSummary } from '../data/analytics'
import { listExpensePage } from '../data/expenses'

type AnalyticsScreenProps = {
  tags: Tag[]
}

const PALETTE = [
  '#1f6b63',
  '#1976d2',
  '#f57c00',
  '#d81b60',
  '#2e7d32',
  '#3949ab',
  '#e53935',
  '#00838f',
]

const FALLBACK_FROM = '2000-01-01'

export function AnalyticsScreen({ tags }: AnalyticsScreenProps) {
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set())
  const [isTagDialogOpen, setTagDialogOpen] = useState(false)
  const [showAllTagBreakdown, setShowAllTagBreakdown] = useState(false)
  const [onlySelectedTags, setOnlySelectedTags] = useState(false)
  const [summary, setSummary] = useState<{
    totalAmount: number
    currency: string
    count: number
    avgPerDay: number
    from: string
    to: string
  } | null>(null)
  const [byTagRows, setByTagRows] = useState<
    Array<{ tagId: string; tagName: string; total: number; count: number }>
  >([])
  const [isLoading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [isListLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const hasFilters = fromDate !== null || toDate !== null || filterTagIds.size > 0

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

  const tagIds = useMemo(() => Array.from(filterTagIds), [filterTagIds])
  const tagIdsKey = tagIds.join(',')
  const tagIdsForApi = tagIds.length > 0 ? tagIds : undefined

  const applyQuickRange = (days: number) => {
    const today = dateOnly(new Date())
    const start = new Date(today)
    start.setDate(today.getDate() - (days - 1))
    setFromDate(formatDate(start))
    setToDate(formatDate(today))
  }

  const applyFromDay = (dayOfMonth: number) => {
    const today = dateOnly(new Date())
    const start = latestDayOfMonth(dayOfMonth, today)
    setFromDate(formatDate(start))
    setToDate(formatDate(today))
  }

  const resetFilters = () => {
    setFromDate(null)
    setToDate(null)
    setFilterTagIds(new Set())
  }

  useEffect(() => {
    setShowAllTagBreakdown(false)
  }, [fromDate, toDate, filterTagIds])

  useEffect(() => {
    let isActive = true
    const loadAnalytics = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [summaryResponse, byTagResponse] = await Promise.all([
          getAnalyticsSummary({
            from: range.from,
            to: range.to,
            tagIds: tagIdsForApi,
          }),
          getAnalyticsByTag({
            from: range.from,
            to: range.to,
            tagIds: tagIdsForApi,
            limit: 50,
          }),
        ])
        if (!isActive) return
        setSummary(summaryResponse)
        setByTagRows(byTagResponse)
      } catch {
        if (!isActive) return
        setLoadError('Не удалось загрузить аналитику. Попробуйте ещё раз.')
        setSummary(null)
        setByTagRows([])
      } finally {
        if (isActive) setLoading(false)
      }
    }

    void loadAnalytics()
    return () => {
      isActive = false
    }
  }, [range.from, range.to, tagIdsKey])

  useEffect(() => {
    let isActive = true
    if (!hasFilters) {
      setFilteredExpenses([])
      setListError(null)
      return () => {
        isActive = false
      }
    }

    if (tagIds.length > 1) {
      setFilteredExpenses([])
      setListError('Для списка выберите один тег.')
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
          tagId: tagIds.length === 1 ? tagIds[0] : undefined,
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
  }, [hasFilters, range.from, range.to, tagIds, tagIdsKey])

  const filteredSorted = useMemo(
    () =>
      [...filteredExpenses].sort((a, b) => {
        const dateDiff = parseDate(b.date).getTime() - parseDate(a.date).getTime()
        if (dateDiff !== 0) return dateDiff
        return (b.id ?? '').localeCompare(a.id ?? '')
      }),
    [filteredExpenses],
  )

  const rowsForBreakdown = useMemo(() => {
    if (onlySelectedTags && filterTagIds.size > 0) {
      return byTagRows.filter((row) => filterTagIds.has(row.tagId))
    }
    return byTagRows
  }, [byTagRows, filterTagIds, onlySelectedTags])

  const slices = useMemo(() => {
    const entries = [...rowsForBreakdown].sort((a, b) => b.total - a.total)
    return entries.map((row, index) => ({
      label: row.tagName || tags.find((tag) => tag.id === row.tagId)?.name || 'Без тега',
      value: row.total,
      color: PALETTE[index % PALETTE.length],
    }))
  }, [rowsForBreakdown, tags])

  const totalByTags = slices.reduce((sum, slice) => sum + slice.value, 0)
  const currencyLabel = summary?.currency ?? ''
  const breakdownVisible = showAllTagBreakdown ? slices : slices.slice(0, 5)
  const breakdownRemaining = slices.length - breakdownVisible.length

  const selectedTagList = selectedTags(tags, filterTagIds)

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
            <Typography variant="subtitle1" fontWeight={600}>
              Фильтры
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Дата от"
                type="date"
                value={fromDate ?? ''}
                onChange={(event) => setFromDate(event.target.value || null)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Дата до"
                type="date"
                value={toDate ?? ''}
                onChange={(event) => setToDate(event.target.value || null)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <QuickFilterChip label="За неделю" onClick={() => applyQuickRange(7)} />
              <QuickFilterChip label="За месяц" onClick={() => applyQuickRange(30)} />
              <QuickFilterChip label="От 5 числа" onClick={() => applyFromDay(5)} />
              <QuickFilterChip label="От 20 числа" onClick={() => applyFromDay(20)} />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Теги
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <Box sx={{ flex: 1, width: '100%' }}>
                  <TagPickerInput label="Выбрать тег" onClick={() => setTagDialogOpen(true)} />
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={onlySelectedTags}
                      onChange={(event) => setOnlySelectedTags(event.target.checked)}
                    />
                  }
                  label="Только выбранные теги"
                />
              </Stack>
              {selectedTagList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Теги не выбраны
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedTagList.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      size="small"
                      variant="outlined"
                      onDelete={() =>
                        setFilterTagIds((prev) => {
                          const next = new Set(prev)
                          next.delete(tag.id)
                          return next
                        })
                      }
                    />
                  ))}
                </Stack>
              )}
            </Stack>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={resetFilters}>Сбросить фильтры</Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {loadError ? <Alert severity="error">{loadError}</Alert> : null}

      <Card
        elevation={0}
        sx={{
          border: 1,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
          bgcolor: 'background.paper',
          backgroundImage: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(
              theme.palette.primary.main,
              0.04,
            )} 60%, transparent 100%)`,
          boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
      >
        <CardContent sx={{ px: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
          {isLoading ? (
            <Stack spacing={1} alignItems="center">
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                Загружаем аналитику…
              </Typography>
            </Stack>
          ) : summary ? (
            <Stack spacing={0.75} alignItems="center">
              <Chip
                label="Итого"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="h4" fontWeight={800}>
                {formatAmount(summary.totalAmount)} {summary.currency}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={0.5} alignItems="center">
              <Chip
                label="Итого"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="h5" fontWeight={700}>
                0
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardContent>
          <Stack spacing={2}>
            {slices.length === 0 ? (
              <Typography color="text.secondary">Нет данных для диаграммы</Typography>
            ) : (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <PieChart slices={slices} size={180} />
                </Box>
                <Stack spacing={1}>
                  {breakdownVisible.map((slice) => (
                    <Stack
                      key={slice.label}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      justifyContent="space-between"
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
                      <Stack direction="row" spacing={2}>
                        <Typography fontWeight={600}>
                          {formatPercent(slice.value, totalByTags)}%
                        </Typography>
                        <Typography fontWeight={600}>
                          {currencyLabel
                            ? `${formatAmount(slice.value)} ${currencyLabel}`
                            : formatAmount(slice.value)}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                  {breakdownRemaining > 0 ? (
                    <Button size="small" onClick={() => setShowAllTagBreakdown(true)}>
                      Показать еще {breakdownRemaining} {pluralCategory(breakdownRemaining)}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {hasFilters ? (
        <Card elevation={0}>
          <CardContent>
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
                    const tagNames = expense.tagIds
                      .map((id) => tags.find((tag) => tag.id === id)?.name)
                      .filter((name): name is string => Boolean(name))
                    return (
                      <Box key={expense.id}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                            <Typography fontWeight={600} noWrap>
                              {expense.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateDots(parseDate(expense.date))}
                            </Typography>
                            {tagNames.length > 0 ? <TagRow tagNames={tagNames} maxVisible={3} /> : null}
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
          </CardContent>
        </Card>
      ) : null}

      <TagSearchDialog
        isOpen={isTagDialogOpen}
        tags={tags}
        initialSelected={Array.from(filterTagIds)}
        onClose={() => setTagDialogOpen(false)}
        onConfirm={(selected) => {
          setFilterTagIds(new Set(selected))
          setTagDialogOpen(false)
        }}
      />
    </Stack>
  )
}
