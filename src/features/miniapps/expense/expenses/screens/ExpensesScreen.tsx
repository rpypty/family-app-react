import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  CardContent,
  Fab,
  Stack,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  EXPENSES_ROUTES,
  ROUTES,
  normalizePathname,
  resolveExpensesRoute,
} from '../../../../../app/routing/routes'
import { type Expense, type Category } from '../../../../../shared/types'
import { type CategoryAppearanceInput } from '../../../../../shared/lib/categoryAppearance'
import { ExpenseFormModal } from '../components/ExpenseFormModal'
import { ExpenseList } from '../components/ExpenseList'
import { useInfiniteScroll } from '../../../../../shared/hooks/useInfiniteScroll'
import { listCurrencies } from '../../api/currencies'
import { ReceiptParseAction } from '../../receipts/components/ReceiptParseAction'
import { ReceiptParseDialog } from '../../receipts/components/ReceiptParseDialog'
import { useReceiptParseJob } from '../../receipts/hooks/useReceiptParseJob'
import type {
  ApproveReceiptParseExpense,
  CreateReceiptParseInput,
  UpdateReceiptParseItemInput,
} from '../../receipts/api/receiptParses'

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
  const receiptParseJob = useReceiptParseJob()
  const [currencyLabels, setCurrencyLabels] = useState<Record<string, string>>({})
  const currentPath = normalizePathname(location.pathname)
  const isBaseListRoute = currentPath === ROUTES.expenses
  const canCreate = !readOnly || allowOfflineCreate
  const canEdit = !readOnly
  const expenseRoute = useMemo(() => resolveExpensesRoute(location.pathname), [location.pathname])
  const isNewRoute = expenseRoute.view === 'new' || expenseRoute.view === 'new-category'
  const isReceiptRoute = expenseRoute.view === 'receipt'
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
  const editingExpense = useMemo(() => {
    if (expenseRoute.view === 'edit' || expenseRoute.view === 'edit-category' || expenseRoute.view === 'edit-delete') {
      return expenses.find((expense) => expense.id === expenseRoute.expenseId) ?? null
    }
    return null
  }, [expenseRoute, expenses])
  const isFormOpen = isNewRoute || Boolean(editingExpense)
  const receiptDialogKey = isReceiptRoute
    ? receiptParseJob.parse?.status === 'ready'
      ? receiptParseJob.parse.id
      : receiptParseJob.summary?.id ?? receiptParseJob.parse?.id ?? 'upload'
    : 'closed'
  const previousRouteViewRef = useRef<typeof expenseRoute.view | null>(null)
  const wasBaseListRouteRef = useRef(false)

  useEffect(() => {
    if (isBaseListRoute && !wasBaseListRouteRef.current) {
      onRefreshListData?.()
    }
    wasBaseListRouteRef.current = isBaseListRoute
  }, [isBaseListRoute, onRefreshListData])

  useEffect(() => {
    let isCancelled = false
    ;(async () => {
      try {
        const currencies = await listCurrencies()
        if (isCancelled) return
        const labels: Record<string, string> = {}
        currencies.forEach((item) => {
          if (item.symbol) {
            labels[item.code] = item.symbol
          }
        })
        setCurrencyLabels(labels)
      } catch {
        if (!isCancelled) {
          setCurrencyLabels({})
        }
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [])

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
    if (!canEdit && isReceiptRoute) {
      navigate(ROUTES.expenses, { replace: true })
    }
  }, [canEdit, isReceiptRoute, navigate])

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

  const openReceiptDialog = () => {
    if (!canEdit) return
    navigate(EXPENSES_ROUTES.receipt)
    void receiptParseJob.refreshActive()
  }

  const closeReceiptDialog = () => {
    navigate(ROUTES.expenses, { replace: true })
  }

  const handleCreateReceiptParse = async (input: CreateReceiptParseInput) => {
    await receiptParseJob.create(input)
  }

  const handleApproveReceiptParse = async (items: ApproveReceiptParseExpense[]) => {
    const created = await receiptParseJob.approve(items)
    if (created.length === 0) return
    navigate(ROUTES.expenses, { replace: true })
    onRefreshListData?.()
  }

  const handleUpdateReceiptParseItems = async (items: UpdateReceiptParseItemInput[]) => {
    return receiptParseJob.updateItems(items)
  }

  const handleCancelReceiptParse = async () => {
    await receiptParseJob.cancel()
    navigate(ROUTES.expenses, { replace: true })
  }

  return (
    <>
      <Card elevation={0} sx={{ overflow: 'visible' }}>
        <CardContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <ExpenseList
              expenses={expenses}
              categories={categories}
              currencyLabels={currencyLabels}
              familyDefaultCurrency={familyDefaultCurrency}
              total={total}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              sentinelRef={sentinelRef}
              onExpenseClick={canEdit ? openEdit : undefined}
              emptyDescription="Нажмите на кнопку “+” внизу справа, чтобы добавить запись."
            />
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

      <ReceiptParseDialog
        key={receiptDialogKey}
        open={isReceiptRoute}
        categories={categories}
        defaultCurrency={familyDefaultCurrency}
        parse={receiptParseJob.parse}
        activeStatus={receiptParseJob.summary?.status}
        isLoading={receiptParseJob.isLoading}
        jobError={receiptParseJob.error}
        onClose={closeReceiptDialog}
        onCreate={handleCreateReceiptParse}
        onUpdateItems={handleUpdateReceiptParseItems}
        onApprove={handleApproveReceiptParse}
        onCancel={handleCancelReceiptParse}
        onRefresh={receiptParseJob.refreshCurrent}
      />

      {canEdit ? (
        <ReceiptParseAction
          status={receiptParseJob.parse?.status ?? receiptParseJob.summary?.status}
          disabled={receiptParseJob.isLoading}
          onClick={openReceiptDialog}
        />
      ) : null}

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
