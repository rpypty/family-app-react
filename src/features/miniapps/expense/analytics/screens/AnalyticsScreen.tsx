import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
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
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { Expense, Tag } from '../../../../../shared/types'
import {
  dateOnly,
  formatAmount,
  formatDate,
  formatDateDots,
  formatPercent,
  parseDate,
} from '../../../../../shared/lib/formatters'
import { selectedTags } from '../../../../../shared/lib/tagUtils'
import { PieChart } from '../components/PieChart'
import { QuickFilterChip } from '../../../../../shared/ui/QuickFilterChip'
import { TagPickerInput } from '../../../../../shared/ui/TagPickerInput'
import { TagRow } from '../../../../../shared/ui/TagRow'
import { TagSearchDialog } from '../../../../../shared/ui/TagSearchDialog'
import { ExpenseIcon } from '../../../../../shared/ui/ExpenseIcon'
import { getAnalyticsByTag, getAnalyticsSummary } from '../api/analytics'
import { listExpensePage } from '../../expenses/api/expenses'

type AnalyticsScreenProps = {
  tags: Tag[]
  onUpdateTag?: (tagId: string, name: string) => Promise<Tag>
  onDeleteTag?: (tagId: string) => Promise<void>
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

type DayRange = {
  from: Date
  to: Date
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

export function AnalyticsScreen({ tags, onUpdateTag, onDeleteTag }: AnalyticsScreenProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set())
  const [isTagDialogOpen, setTagDialogOpen] = useState(false)
  const [showAllTagBreakdown, setShowAllTagBreakdown] = useState(false)
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
  const [drilldownTag, setDrilldownTag] = useState<{ id: string; name: string } | null>(null)
  const [drilldownExpenses, setDrilldownExpenses] = useState<Expense[]>([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const [drilldownError, setDrilldownError] = useState<string | null>(null)

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

    const loadList = async () => {
      setListLoading(true)
      setListError(null)
      try {
        const response = await listExpensePage({
          from: range.from,
          to: range.to,
          tagIds: tagIds.length > 0 ? tagIds : undefined,
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

  const filteredSorted = useMemo(() => filteredExpenses, [filteredExpenses])

  const rowsForBreakdown = useMemo(() => {
    return byTagRows
  }, [byTagRows])

  const slices = useMemo(() => {
    const entries = [...rowsForBreakdown].sort((a, b) => b.total - a.total)
    return entries.map((row, index) => ({
      id: row.tagId,
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
  const activeSliceId = drilldownTag?.id ?? null

  useEffect(() => {
    if (!drilldownTag) return
    let isActive = true
    const loadDrilldown = async () => {
      setDrilldownLoading(true)
      setDrilldownError(null)
      try {
        const response = await listExpensePage({
          from: range.from,
          to: range.to,
          tagIds: [drilldownTag.id],
          limit: 50,
          offset: 0,
        })
        if (!isActive) return
        setDrilldownExpenses(response.items)
      } catch {
        if (!isActive) return
        setDrilldownError('Не удалось загрузить список по тегу.')
        setDrilldownExpenses([])
      } finally {
        if (isActive) setDrilldownLoading(false)
      }
    }

    void loadDrilldown()
    return () => {
      isActive = false
    }
  }, [drilldownTag, range.from, range.to])

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
              <QuickFilterChip label="От 5 до 19" onClick={() => applyDayRange(5, 19)} />
              <QuickFilterChip label="От 20 до 4" onClick={() => applyDayRange(20, 4)} />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Теги
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <Box sx={{ flex: 1, width: '100%' }}>
                  <TagPickerInput label="Выбрать тег" onClick={() => setTagDialogOpen(true)} />
                </Box>
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
                  <PieChart
                    slices={slices}
                    size={180}
                    activeSliceId={activeSliceId}
                    onSliceClick={(slice) => {
                      if (!slice.id) return
                      setDrilldownTag({ id: slice.id, name: slice.label })
                      setDrilldownExpenses([])
                      setDrilldownError(null)
                    }}
                  />
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
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ minWidth: 0, flex: 1 }}
                          >
                            <ExpenseIcon size={32} />
                            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                              <Typography fontWeight={600} noWrap>
                                {expense.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatDateDots(parseDate(expense.date))}
                              </Typography>
                              {tagNames.length > 0 ? <TagRow tagNames={tagNames} maxVisible={3} /> : null}
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
        onUpdateTag={onUpdateTag}
        onDeleteTag={onDeleteTag}
        enableSelectAll
      />

      <Dialog
        open={Boolean(drilldownTag)}
        onClose={() => {
          setDrilldownTag(null)
          setDrilldownExpenses([])
          setDrilldownError(null)
        }}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {drilldownTag ? `Траты по тегу: ${drilldownTag.name}` : 'Траты'}
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
              Нет трат по выбранному тегу.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {drilldownExpenses.map((expense) => {
                const tagNames = expense.tagIds
                  .map((id) => tags.find((tag) => tag.id === id)?.name)
                  .filter((name): name is string => Boolean(name))
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
                      <ExpenseIcon size={32} />
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
                        {tagNames.length > 0 ? <TagRow tagNames={tagNames} maxVisible={3} /> : null}
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDrilldownTag(null)
              setDrilldownExpenses([])
              setDrilldownError(null)
            }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
