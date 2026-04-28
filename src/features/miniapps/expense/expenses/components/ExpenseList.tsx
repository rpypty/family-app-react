import { useMemo, useState, type RefObject } from 'react'
import { Button, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import CloudOffRounded from '@mui/icons-material/CloudOffRounded'
import { DEFAULT_CURRENCY, type Category, type Expense } from '../../../../../shared/types'
import {
  formatAmountWithCurrency,
  formatDayHeader,
  parseDate,
  type CurrencyLabels,
} from '../../../../../shared/lib/formatters'
import {
  getFirstCategoryColor,
  getFirstCategoryEmoji,
  normalizeCategoryColor,
} from '../../../../../shared/lib/categoryAppearance'
import { ExpenseIcon } from '../../../../../shared/ui/ExpenseIcon'
import { formatExpenseBaseApproxAmount } from '../lib/expenseBaseEquivalent'
import {
  buildExpenseDaySummaryMemoKey,
  createDayExpenseSummary,
} from '../lib/dayExpenseSummary'

type ExpenseListProps = {
  expenses: Expense[]
  categories: Category[]
  currencyLabels?: CurrencyLabels
  familyDefaultCurrency?: string | null
  total?: number
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  sentinelRef?: RefObject<HTMLDivElement | null>
  onExpenseClick?: (expense: Expense) => void
  emptyTitle?: string
  emptyDescription?: string
  stickyHeaders?: boolean
  showFooter?: boolean
  loadMoreMode?: 'scroll' | 'button'
}

type ExpenseListItemProps = {
  expense: Expense
  categories: Category[]
  currencyLabels?: CurrencyLabels
  onClick?: (expense: Expense) => void
}

export function ExpenseList({
  expenses,
  categories,
  currencyLabels = {},
  familyDefaultCurrency,
  total = expenses.length,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  sentinelRef,
  onExpenseClick,
  emptyTitle = 'Пока нет расходов',
  emptyDescription,
  stickyHeaders = true,
  showFooter = true,
  loadMoreMode = 'scroll',
}: ExpenseListProps) {
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(() => new Set())
  const normalizedFamilyCurrency = useMemo(
    () => familyDefaultCurrency?.trim().toUpperCase() || DEFAULT_CURRENCY,
    [familyDefaultCurrency],
  )
  const expenseDaySummaryMemoKey = buildExpenseDaySummaryMemoKey(expenses)

  const { groupedByDay, dayKeys, daySummaries } = useMemo(() => {
    void expenseDaySummaryMemoKey
    const grouped: Record<string, Expense[]> = {}
    const keys: string[] = []
    expenses.forEach((expense) => {
      if (!grouped[expense.date]) {
        grouped[expense.date] = []
        keys.push(expense.date)
      }
      grouped[expense.date].push(expense)
    })
    const summaries = Object.fromEntries(
      keys.map((dateKey) => [
        dateKey,
        createDayExpenseSummary(grouped[dateKey], normalizedFamilyCurrency),
      ]),
    )
    return { groupedByDay: grouped, dayKeys: keys, daySummaries: summaries }
  }, [expenseDaySummaryMemoKey, expenses, normalizedFamilyCurrency])

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])

  const toggleDayBreakdown = (dateKey: string) => {
    setExpandedDayKeys((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
  }

  if (expenses.length === 0) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Typography>{emptyTitle}</Typography>
        {emptyDescription ? (
          <Typography variant="body2" color="text.secondary">
            {emptyDescription}
          </Typography>
        ) : null}
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      {dayKeys.map((dateKey) => {
        const dayExpenses = groupedByDay[dateKey]
        const daySummary = daySummaries[dateKey]
        const isBreakdownExpanded = expandedDayKeys.has(dateKey)
        return (
          <Stack key={dateKey} spacing={1.5}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              role="button"
              tabIndex={0}
              aria-expanded={isBreakdownExpanded}
              onClick={() => toggleDayBreakdown(dateKey)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggleDayBreakdown(dateKey)
                }
              }}
              sx={(themeValue) => ({
                position: stickyHeaders ? 'sticky' : 'static',
                top: stickyHeaders ? `calc(env(safe-area-inset-top) + ${themeValue.spacing(6.5)})` : undefined,
                zIndex: stickyHeaders ? themeValue.zIndex.appBar - 1 : undefined,
                py: 0.75,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
                cursor: 'pointer',
              })}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {formatDayHeader(parseDate(dateKey))}
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                {formatAmountWithCurrency(daySummary.convertedTotal, daySummary.currency, currencyLabels)}
              </Typography>
            </Stack>
            {isBreakdownExpanded ? (
              <Stack
                spacing={0.75}
                sx={{
                  px: 0.5,
                  pb: 0.5,
                }}
              >
                {daySummary.breakdown.map((item) => (
                  <Stack
                    key={item.currency}
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {currencyLabels[item.currency] ?? item.currency}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatAmountWithCurrency(item.amount, item.currency, currencyLabels)}
                    </Typography>
                  </Stack>
                ))}
                {daySummary.hasUnconverted ? (
                  <Typography variant="caption" color="warning.main">
                    Часть расходов не включена в сумму: нет amount_in_base.
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
            <Stack spacing={1}>
              {dayExpenses.map((expense) => {
                const expenseCategories = expense.categoryIds
                  .map((id) => categoryMap.get(id))
                  .filter((category): category is Category => Boolean(category))
                return (
                  <ExpenseListItem
                    key={expense.id}
                    expense={expense}
                    categories={expenseCategories}
                    currencyLabels={currencyLabels}
                    onClick={onExpenseClick}
                  />
                )
              })}
            </Stack>
          </Stack>
        )
      })}
      {showFooter ? (
        <Stack spacing={0.5} alignItems="center" sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Показано {expenses.length} из {total}
          </Typography>
          {hasMore && loadMoreMode === 'button' ? (
            <Button
              size="small"
              variant="text"
              onClick={isLoadingMore ? undefined : onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Загружаем...' : 'Показать ещё'}
            </Button>
          ) : hasMore ? (
            <Typography variant="caption" color="text.secondary">
              {isLoadingMore ? 'Загружаем…' : 'Прокрутите вниз для загрузки'}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Все записи загружены
            </Typography>
          )}
          {sentinelRef ? <div ref={sentinelRef} /> : null}
        </Stack>
      ) : null}
    </Stack>
  )
}

export function ExpenseListItem({
  expense,
  categories,
  currencyLabels = {},
  onClick,
}: ExpenseListItemProps) {
  const theme = useTheme()
  const canEdit = Boolean(onClick)
  const expenseTitle = expense.title.trim() || categories[0]?.name || ''
  const iconEmoji = getFirstCategoryEmoji(categories)
  const iconColor = getFirstCategoryColor(categories)
  const baseApprox = formatExpenseBaseApproxAmount(expense, currencyLabels)

  return (
    <Paper
      variant="outlined"
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={canEdit ? () => onClick?.(expense) : undefined}
      onKeyDown={
        canEdit
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.(expense)
              }
            }
          : undefined
      }
      sx={{
        p: 1.5,
        display: 'grid',
        gridTemplateColumns: '40px minmax(0, 1fr) auto',
        alignItems: 'center',
        columnGap: 1.1,
        borderRadius: 1,
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
      <Stack justifyContent="center" alignItems="center" sx={{ width: 40 }}>
        <ExpenseIcon
          size={45}
          emoji={iconEmoji}
          color={iconColor}
          showBorder={false}
          showBackground={false}
        />
      </Stack>
      <Stack spacing={0.25} sx={{ minWidth: 0, justifyContent: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography
            fontWeight={400}
            variant="body1"
            color={theme.palette.mode === 'dark' ? 'common.white' : 'text.primary'}
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
        </Stack>
        {categories.length > 0 ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              minWidth: 0,
              pr: 0.5,
              pb: 0.25,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
            }}
          >
            {categories.map((category) => {
              const categoryColor = normalizeCategoryColor(category.color)
              return (
                <Chip
                  key={category.id}
                  label={category.name}
                  size="small"
                  variant="outlined"
                  sx={(themeValue) => ({
                    flexShrink: 0,
                    maxWidth: 150,
                    height: 20,
                    borderRadius: '6px',
                    color: categoryColor ?? themeValue.palette.text.secondary,
                    border: 'solid 0.5px',
                    bgcolor: categoryColor
                      ? alpha(
                          categoryColor,
                          themeValue.palette.mode === 'dark' ? 0.28 : 0.12,
                        )
                      : 'transparent',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      px: 0.8,
                      fontSize: '0.75rem',
                    },
                  })}
                />
              )
            })}
          </Stack>
        ) : null}
      </Stack>
      <Stack
        spacing={0.125}
        justifyContent="center"
        alignItems="flex-end"
        sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        <Typography
          fontWeight={400}
          variant={baseApprox ? 'body2' : 'body1'}
          color={theme.palette.mode === 'dark' ? 'common.white' : 'text.primary'}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {formatAmountWithCurrency(expense.amount, expense.currency, currencyLabels)}
        </Typography>
        {baseApprox ? (
          <Typography variant="body2" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
            {baseApprox}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  )
}
