import { useEffect, useMemo, useRef } from 'react'
import {
  Card,
  CardContent,
  Chip,
  Fab,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CloudOffRounded from '@mui/icons-material/CloudOffRounded'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  EXPENSES_ROUTES,
  ROUTES,
  normalizePathname,
  resolveExpensesRoute,
} from '../../../../../app/routing/routes'
import type { Expense, Category } from '../../../../../shared/types'
import {
  aggregateByCurrency,
  formatDayHeader,
  formatTotals,
  parseDate,
  formatAmount,
} from '../../../../../shared/lib/formatters'
import {
  getFirstCategoryColor,
  getFirstCategoryEmoji,
  normalizeCategoryColor,
  withCategoryEmoji,
  type CategoryAppearanceInput,
} from '../../../../../shared/lib/categoryAppearance'
import { ExpenseIcon } from '../../../../../shared/ui/ExpenseIcon'
import { ExpenseFormModal } from '../components/ExpenseFormModal'
import { useInfiniteScroll } from '../../../../../shared/hooks/useInfiniteScroll'

type ExpensesScreenProps = {
  expenses: Expense[]
  categories: Category[]
  familyDefaultCurrency?: string | null
  total: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => Promise<void>
  onCreateExpense: (expense: Expense) => Promise<void>
  onUpdateExpense: (expense: Expense) => Promise<void>
  onDeleteExpense: (expenseId: string) => Promise<void>
  onCreateCategory: (name: string, payload?: CategoryAppearanceInput) => Promise<Category>
  onRefreshListData?: () => void
  onRefreshCategories?: () => void
  readOnly?: boolean
  allowOfflineCreate?: boolean
}

export function ExpensesScreen({
  expenses,
  categories,
  familyDefaultCurrency,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  onCreateCategory,
  onRefreshListData,
  onRefreshCategories,
  readOnly = false,
  allowOfflineCreate = false,
}: ExpensesScreenProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))
  const currentPath = normalizePathname(location.pathname)
  const isBaseListRoute = currentPath === ROUTES.expenses
  const maxCategoryVisible = isSmall ? 2 : 3
  const canCreate = !readOnly || allowOfflineCreate
  const canEdit = !readOnly
  const expenseRoute = useMemo(() => resolveExpensesRoute(location.pathname), [location.pathname])
  const isNewRoute = expenseRoute.view === 'new' || expenseRoute.view === 'new-category'
  const isEditRoute =
    expenseRoute.view === 'edit' ||
    expenseRoute.view === 'edit-category' ||
    expenseRoute.view === 'edit-delete'
  const isCategoryCreateOpen =
    expenseRoute.view === 'new-category' || expenseRoute.view === 'edit-category'
  const isDeleteConfirmOpen = expenseRoute.view === 'edit-delete'
  const sentinelRef = useInfiniteScroll({
    enabled: hasMore && !readOnly,
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

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const editingExpense = useMemo(() => {
    if (expenseRoute.view === 'edit' || expenseRoute.view === 'edit-category' || expenseRoute.view === 'edit-delete') {
      return expenses.find((expense) => expense.id === expenseRoute.expenseId) ?? null
    }
    return null
  }, [expenseRoute, expenses])
  const isFormOpen = isNewRoute || Boolean(editingExpense)
  const previousRouteViewRef = useRef<typeof expenseRoute.view | null>(null)
  const wasBaseListRouteRef = useRef(false)

  useEffect(() => {
    if (isBaseListRoute && !wasBaseListRouteRef.current) {
      onRefreshListData?.()
    }
    wasBaseListRouteRef.current = isBaseListRoute
  }, [isBaseListRoute, onRefreshListData])

  useEffect(() => {
    const nextView = expenseRoute.view
    const prevView = previousRouteViewRef.current

    const isCategorySearchContext =
      nextView === 'new' ||
      nextView === 'edit' ||
      nextView === 'new-category' ||
      nextView === 'edit-category'
    if (isCategorySearchContext && prevView !== nextView) {
      onRefreshCategories?.()
    }

    previousRouteViewRef.current = nextView
  }, [expenseRoute.view, onRefreshCategories])

  useEffect(() => {
    if (!canCreate && isNewRoute) {
      navigate(ROUTES.expenses, { replace: true })
    }
  }, [canCreate, isNewRoute, navigate])

  useEffect(() => {
    if (!canEdit && isEditRoute) {
      navigate(ROUTES.expenses, { replace: true })
    }
  }, [canEdit, isEditRoute, navigate])

  useEffect(() => {
    if (!isEditRoute || editingExpense) return
    navigate(ROUTES.expenses, { replace: true })
  }, [isEditRoute, editingExpense, navigate])

  const openCreate = () => {
    if (!canCreate) return
    navigate(EXPENSES_ROUTES.new)
  }

  const openEdit = (expense: Expense) => {
    if (readOnly) return
    navigate(EXPENSES_ROUTES.edit(expense.id))
  }

  const closeForm = () => {
    navigate(ROUTES.expenses, { replace: true })
  }

  const openCategoryCreate = () => {
    if (expenseRoute.view === 'new' || expenseRoute.view === 'new-category') {
      navigate(EXPENSES_ROUTES.newCategory)
      return
    }
    if (!editingExpense) return
    navigate(EXPENSES_ROUTES.editCategory(editingExpense.id))
  }

  const closeCategoryCreate = () => {
    if (expenseRoute.view === 'new-category') {
      navigate(EXPENSES_ROUTES.new, { replace: true })
      return
    }
    if (expenseRoute.view === 'edit-category' && editingExpense) {
      navigate(EXPENSES_ROUTES.edit(editingExpense.id), { replace: true })
    }
  }

  const openDeleteConfirm = () => {
    if (!editingExpense) return
    navigate(EXPENSES_ROUTES.editDelete(editingExpense.id))
  }

  const closeDeleteConfirm = () => {
    if (!editingExpense) return
    navigate(EXPENSES_ROUTES.edit(editingExpense.id), { replace: true })
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
  }

  return (
    <>
      <Card elevation={0} sx={{ overflow: 'visible' }}>
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
                        sx={(themeValue) => ({
                          position: 'sticky',
                          top: `calc(env(safe-area-inset-top) + ${themeValue.spacing(6.5)})`,
                          zIndex: themeValue.zIndex.appBar - 1,
                          py: 0.75,
                          bgcolor: 'background.paper',
                          borderBottom: 1,
                          borderColor: 'divider',
                        })}
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
                          const expenseCategories = expense.categoryIds
                            .map((id) => categoryMap.get(id))
                            .filter((category): category is Category => Boolean(category))
                          const expenseTitle = expense.title.trim() || expenseCategories[0]?.name || ''
                          const visibleCategories = expenseCategories.slice(0, maxCategoryVisible)
                          const remainingCategories = expenseCategories.length - visibleCategories.length
                          const iconEmoji = getFirstCategoryEmoji(expenseCategories)
                          const iconColor = getFirstCategoryColor(expenseCategories)
                          return (
                            <Paper
                              key={expense.id}
                              variant="outlined"
                              role={canEdit ? 'button' : undefined}
                              tabIndex={canEdit ? 0 : undefined}
                              onClick={canEdit ? () => openEdit(expense) : undefined}
                              onKeyDown={
                                canEdit
                                  ? (event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        openEdit(expense)
                                      }
                                    }
                                  : undefined
                              }
                              sx={{
                                p: 1.5,
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                justifyContent: 'space-between',
                                gap: 1.5,
                                borderLeft: iconColor ? `3px solid ${alpha(iconColor, 0.85)}` : undefined,
                                cursor: canEdit ? 'pointer' : 'default',
                                transition: 'box-shadow 0.2s, border-color 0.2s',
                                '&:hover': canEdit
                                  ? {
                                      borderColor: 'primary.main',
                                      boxShadow: 2,
                                    }
                                  : undefined,
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                sx={{ flex: 1, minWidth: 0 }}
                              >
                                <ExpenseIcon emoji={iconEmoji} color={iconColor} />
                                <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                                  <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography
                                      fontWeight={500}
                                      variant="body2"
                                      color="text.secondary"
                                      noWrap
                                      sx={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis' }}
                                    >
                                      {expenseTitle}
                                    </Typography>
                                    {expense.syncState && expense.syncState !== 'synced' ? (
                                      <Tooltip title="Изменение сохранено локально и будет отправлено при подключении к сети">
                                        <CloudOffRounded sx={{ fontSize: 16, color: 'warning.main' }} />
                                      </Tooltip>
                                    ) : null}
                                    <Typography
                                      fontWeight={600}
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ whiteSpace: 'nowrap' }}
                                    >
                                      {formatAmount(expense.amount)} {expense.currency}
                                    </Typography>
                                  </Stack>
                                  {expenseCategories.length > 0 ? (
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      sx={{
                                        flexWrap: 'nowrap',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {visibleCategories.map((category) => {
                                        const categoryColor = normalizeCategoryColor(category.color)
                                        return (
                                          <Chip
                                            key={category.id}
                                            label={withCategoryEmoji(category)}
                                            size="small"
                                            variant="outlined"
                                            sx={(theme) => ({
                                              flexShrink: 0,
                                              maxWidth: 150,
                                              color: categoryColor ?? theme.palette.text.secondary,
                                              borderColor: categoryColor
                                                ? alpha(categoryColor, 0.5)
                                                : theme.palette.divider,
                                              bgcolor: categoryColor
                                                ? alpha(
                                                    categoryColor,
                                                    theme.palette.mode === 'dark' ? 0.28 : 0.12,
                                                  )
                                                : 'transparent',
                                              '& .MuiChip-label': {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              },
                                            })}
                                          />
                                        )
                                      })}
                                      {remainingCategories > 0 ? (
                                        <Chip
                                          label={`${remainingCategories}+ категорий`}
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
        defaultCurrency={familyDefaultCurrency}
        isCategoryCreateOpen={isCategoryCreateOpen}
        isDeleteConfirmOpen={isDeleteConfirmOpen}
        categories={categories}
        onClose={closeForm}
        onOpenCategoryCreate={openCategoryCreate}
        onCloseCategoryCreate={closeCategoryCreate}
        onOpenDeleteConfirm={openDeleteConfirm}
        onCloseDeleteConfirm={closeDeleteConfirm}
        onSave={handleSave}
        onDelete={handleDelete}
        onCreateCategory={onCreateCategory}
        onRefreshCategories={onRefreshCategories}
      />

      {canCreate ? (
        <Fab
          color="primary"
          aria-label="Добавить расход"
          onClick={openCreate}
          sx={{
            position: 'fixed',
            right: 16,
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            zIndex: (themeValue) => themeValue.zIndex.appBar + 1,
          }}
        >
          <AddIcon />
        </Fab>
      ) : null}
    </>
  )
}
