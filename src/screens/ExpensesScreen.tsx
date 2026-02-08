import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  Chip,
  Fab,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import type { Expense, Tag } from '../data/types'
import {
  aggregateByCurrency,
  formatDayHeader,
  formatTotals,
  parseDate,
  formatAmount,
} from '../utils/formatters'
import { ExpenseFormModal } from '../components/ExpenseFormModal'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

type ExpensesScreenProps = {
  expenses: Expense[]
  tags: Tag[]
  total: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => Promise<void>
  onCreateExpense: (expense: Expense) => Promise<void>
  onUpdateExpense: (expense: Expense) => Promise<void>
  onDeleteExpense: (expenseId: string) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
  onUpdateTag: (tagId: string, name: string) => Promise<Tag>
  onDeleteTag: (tagId: string) => Promise<void>
}

export function ExpensesScreen({
  expenses,
  tags,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: ExpensesScreenProps) {
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))
  const maxTagVisible = isSmall ? 2 : 3
  const sentinelRef = useInfiniteScroll({
    enabled: hasMore,
    loading: isLoadingMore,
    onLoadMore,
    rootMargin: '240px',
  })

  const { groupedByDay, dayKeys } = useMemo(() => {
    const grouped: Record<string, Expense[]> = {}
    const keys: string[] = []
    expenses.forEach((expense) => {
      if (!grouped[expense.date]) {
        grouped[expense.date] = []
        keys.push(expense.date)
      }
      grouped[expense.date].push(expense)
    })
    return { groupedByDay: grouped, dayKeys: keys }
  }, [expenses])

  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags])

  const openCreate = () => {
    setEditingExpense(null)
    setFormOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormOpen(true)
  }

  const handleSave = async (expense: Expense) => {
    if (editingExpense) {
      await onUpdateExpense(expense)
    } else {
      await onCreateExpense(expense)
    }
  }

  const handleDelete = async (expenseId: string) => {
    await onDeleteExpense(expenseId)
    setFormOpen(false)
  }

  return (
    <>
      <Card elevation={0}>
        <CardContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {expenses.length === 0 ? (
              <Stack spacing={2} alignItems="flex-start">
                <Typography>Пока нет расходов</Typography>
                <Typography variant="body2" color="text.secondary">
                  Нажмите на кнопку “+” внизу справа, чтобы добавить запись.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={2}>
                {dayKeys.map((dateKey) => {
                  const dayExpenses = groupedByDay[dateKey]
                  const totals = aggregateByCurrency(dayExpenses)
                  return (
                    <Stack key={dateKey} spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography variant="subtitle1" fontWeight={700}>
                          {formatDayHeader(parseDate(dateKey))}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {formatTotals(totals)}
                        </Typography>
                      </Stack>
                      <Stack spacing={1}>
                      {dayExpenses.map((expense) => {
                        const tagNames = expense.tagIds
                          .map((id) => tagMap.get(id))
                          .filter((name): name is string => Boolean(name))
                        const visibleTags = tagNames.slice(0, maxTagVisible)
                        const remainingTags = tagNames.length - visibleTags.length
                          return (
                            <Paper
                              key={expense.id}
                              variant="outlined"
                              role="button"
                              tabIndex={0}
                              onClick={() => openEdit(expense)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  openEdit(expense)
                                }
                              }}
                              sx={{
                                p: 1.5,
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                justifyContent: 'space-between',
                                gap: 1.5,
                                cursor: 'pointer',
                                transition: 'box-shadow 0.2s, border-color 0.2s',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  boxShadow: 2,
                                },
                              }}
                            >
                              <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Typography
                                    fontWeight={500}
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                    sx={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis' }}
                                  >
                                    {expense.title}
                                  </Typography>
                                  <Typography
                                    fontWeight={600}
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ whiteSpace: 'nowrap' }}
                                  >
                                    {formatAmount(expense.amount)} {expense.currency}
                                  </Typography>
                                </Stack>
                                {tagNames.length > 0 ? (
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                      flexWrap: 'nowrap',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {visibleTags.map((name) => (
                                      <Chip
                                        key={name}
                                        label={name}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          flexShrink: 0,
                                          maxWidth: 140,
                                          color: 'text.secondary',
                                          borderColor: 'divider',
                                          '& .MuiChip-label': {
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          },
                                        }}
                                      />
                                    ))}
                                    {remainingTags > 0 ? (
                                      <Chip
                                        label={`${remainingTags}+ тегов`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          flexShrink: 0,
                                          color: 'text.secondary',
                                          borderColor: 'divider',
                                          '& .MuiChip-label': { whiteSpace: 'nowrap' },
                                        }}
                                      />
                                    ) : null}
                                  </Stack>
                                ) : null}
                              </Stack>
                            </Paper>
                          )
                        })}
                      </Stack>
                    </Stack>
                  )
                })}
                <Stack spacing={0.5} alignItems="center" sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Показано {expenses.length} из {total}
                  </Typography>
                  {hasMore ? (
                    <Typography variant="caption" color="text.secondary">
                      {isLoadingMore ? 'Загружаем…' : 'Прокрутите вниз для загрузки'}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Все записи загружены
                    </Typography>
                  )}
                  <div ref={sentinelRef} />
                </Stack>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <ExpenseFormModal
        isOpen={isFormOpen}
        expense={editingExpense}
        tags={tags}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onCreateTag={onCreateTag}
        onUpdateTag={onUpdateTag}
        onDeleteTag={onDeleteTag}
      />

      <Fab
        color="primary"
        aria-label="Добавить расход"
        onClick={openCreate}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          zIndex: 10,
        }}
      >
        <AddIcon />
      </Fab>
    </>
  )
}
