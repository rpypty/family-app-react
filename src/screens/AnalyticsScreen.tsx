import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Divider,
  Stack,
  TextField,
  Typography,
  Checkbox,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Expense, Tag } from '../data/types'
import { aggregateByTag } from '../utils/analytics'
import {
  aggregateByCurrency,
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

type AnalyticsScreenProps = {
  expenses: Expense[]
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

export function AnalyticsScreen({ expenses, tags }: AnalyticsScreenProps) {
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set())
  const [isTagDialogOpen, setTagDialogOpen] = useState(false)
  const [showAllTagBreakdown, setShowAllTagBreakdown] = useState(false)
  const [onlySelectedTags, setOnlySelectedTags] = useState(false)

  const hasFilters = fromDate !== null || toDate !== null || filterTagIds.size > 0

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

  const filtered = useMemo(() => {
    return expenses.filter((expense) => {
      const date = dateOnly(parseDate(expense.date))
      let from = fromDate ? dateOnly(parseDate(fromDate)) : null
      let to = toDate ? dateOnly(parseDate(toDate)) : null
      if (from && to && from.getTime() > to.getTime()) {
        const temp = from
        from = to
        to = temp
      }
      if (from && date < from) return false
      if (to && date > to) return false
      if (filterTagIds.size > 0) {
        const hasAny = expense.tagIds.some((id) => filterTagIds.has(id))
        if (!hasAny) return false
      }
      return true
    })
  }, [expenses, fromDate, toDate, filterTagIds])

  useEffect(() => {
    setShowAllTagBreakdown(false)
  }, [fromDate, toDate, filterTagIds])

  const filteredSorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const dateDiff = parseDate(b.date).getTime() - parseDate(a.date).getTime()
        if (dateDiff !== 0) return dateDiff
        return (b.id ?? '').localeCompare(a.id ?? '')
      }),
    [filtered],
  )

  const totalsByCurrency = useMemo(() => aggregateByCurrency(filtered), [filtered])
  const totalsByTag = useMemo(() => {
    if (!onlySelectedTags || filterTagIds.size === 0) {
      return aggregateByTag(filtered)
    }
    const totals: Record<string, number> = {}
    filtered.forEach((expense) => {
      const eligible = expense.tagIds.filter((id) => filterTagIds.has(id))
      if (eligible.length === 0) return
      eligible.forEach((tagId) => {
        totals[tagId] = (totals[tagId] ?? 0) + expense.amount
      })
    })
    return totals
  }, [filtered, filterTagIds, onlySelectedTags])

  const slices = useMemo(() => {
    const entries = Object.entries(totalsByTag).sort((a, b) => b[1] - a[1])
    return entries.map(([tagId, value], index) => ({
      label: tags.find((tag) => tag.id === tagId)?.name ?? 'Без тега',
      value,
      color: PALETTE[index % PALETTE.length],
    }))
  }, [totalsByTag, tags])

  const totalByTags = slices.reduce((sum, slice) => sum + slice.value, 0)
  const currencyLabel = Object.keys(totalsByCurrency).length === 1 ? Object.keys(totalsByCurrency)[0] : ''
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
          {Object.keys(totalsByCurrency).length === 0 ? (
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
          ) : (
            <Stack spacing={0.75} alignItems="center">
              <Chip
                label="Итого"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              {Object.entries(totalsByCurrency).map(([currency, value]) => (
                <Typography key={currency} variant="h4" fontWeight={800}>
                  {formatAmount(value)} {currency}
                </Typography>
              ))}
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
              {filteredSorted.length === 0 ? (
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
