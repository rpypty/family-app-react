import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AuthSession } from '../../../auth/api/auth'
import {
  createExpense,
  deleteExpense,
  listExpensePage,
  updateExpense,
} from '../expenses/api/expenses'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../expenses/api/categories'
import type { SyncOperation } from '../../../sync/api/sync'
import {
  createOperationId,
  resolvePendingCreateIds,
  type OfflineOutboxOperation,
} from '../../../sync/model/offlineOutbox'
import { findCategoryByName } from '../../../../shared/lib/categoryUtils'
import type { Expense, StorageState, Category } from '../../../../shared/types'
import type { CategoryAppearanceInput } from '../../../../shared/lib/categoryAppearance'
import { EXPENSES_PAGE_SIZE } from '../../../../app/sync/constants'
import { isNetworkLikeError } from '../../../../app/sync/network'
import type { DataSyncScope, DataSyncStatus } from '../../../../app/sync/types'
import { sortExpensesByDateDesc } from '../../../../app/sync/stateTransforms'

type UseExpenseActionsParams = {
  state: {
    state: StorageState
    stateRef: MutableRefObject<StorageState>
    authSession: AuthSession | null
    familyId: string | null
    isOfflineLike: boolean
    isExpensesLoadingMore: boolean
    isExpensesRefreshing: boolean
    expensesTotal: number
    expensesOffset: number
  }
  mutators: {
    guardReadOnly: () => boolean
    updateState: (updater: (prev: StorageState) => StorageState) => void
    setDataSyncStatus: Dispatch<SetStateAction<DataSyncStatus>>
    setDataStale: Dispatch<SetStateAction<boolean>>
    setExpensesTotal: Dispatch<SetStateAction<number>>
    setExpensesOffset: Dispatch<SetStateAction<number>>
    setExpensesLoadingMore: Dispatch<SetStateAction<boolean>>
    setExpensesRefreshing: Dispatch<SetStateAction<boolean>>
  }
  sync: {
    getOutboxOperationsForFamily: () => OfflineOutboxOperation[]
    enqueueOfflineOperation: (operation: SyncOperation) => void
    onManualRefresh: (scope?: DataSyncScope) => Promise<void>
  }
}

export function useExpenseActions({
  state: {
    state,
    stateRef,
    authSession,
    familyId,
    isOfflineLike,
    isExpensesLoadingMore,
    isExpensesRefreshing,
    expensesTotal,
    expensesOffset,
  },
  mutators: {
    guardReadOnly,
    updateState,
    setDataSyncStatus,
    setDataStale,
    setExpensesTotal,
    setExpensesOffset,
    setExpensesLoadingMore,
    setExpensesRefreshing,
  },
  sync: {
    getOutboxOperationsForFamily,
    enqueueOfflineOperation,
    onManualRefresh,
  },
}: UseExpenseActionsParams) {
  const handleCreateExpense = async (expense: Expense) => {
    const addPendingExpense = () => {
      const hasExisting = stateRef.current.expenses.some((item) => item.id === expense.id)
      const localExpense: Expense = {
        ...expense,
        syncState: 'pending',
      }
      updateState((prev) => ({
        ...prev,
        expenses: sortExpensesByDateDesc(
          hasExisting
            ? prev.expenses.map((item) => (item.id === localExpense.id ? localExpense : item))
            : [localExpense, ...prev.expenses],
        ),
      }))
      if (!hasExisting) {
        setExpensesTotal((prev) => prev + 1)
        setExpensesOffset((prev) => prev + 1)
      }
      enqueueOfflineOperation({
        operation_id: createOperationId(),
        type: 'create_expense',
        local_id: localExpense.id,
        payload: {
          date: localExpense.date,
          amount: localExpense.amount,
          currency: localExpense.currency,
          title: localExpense.title,
          category_ids: localExpense.categoryIds,
        },
      })
      setDataStale(true)
    }

    if (isOfflineLike) {
      addPendingExpense()
      return
    }

    try {
      const created = await createExpense(expense)
      updateState((prev) => ({
        ...prev,
        expenses: sortExpensesByDateDesc([created, ...prev.expenses]),
      }))
      setExpensesTotal((prev) => prev + 1)
      setExpensesOffset((prev) => prev + 1)
    } catch (error) {
      if (!isNetworkLikeError(error)) {
        throw error
      }
      setDataSyncStatus('offline')
      addPendingExpense()
    }
  }

  const handleUpdateExpense = async (expense: Expense) => {
    if (guardReadOnly()) {
      throw new Error('read_only')
    }
    const updated = await updateExpense(expense)
    updateState((prev) => ({
      ...prev,
      expenses: sortExpensesByDateDesc(
        prev.expenses.map((item) => (item.id === updated.id ? updated : item)),
      ),
    }))
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (guardReadOnly()) {
      throw new Error('read_only')
    }
    await deleteExpense(expenseId)
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== expenseId),
    }))
    setExpensesTotal((prev) => Math.max(0, prev - 1))
    setExpensesOffset((prev) => Math.max(0, prev - 1))
  }

  const handleLoadMoreExpenses = async () => {
    if (guardReadOnly()) return
    if (isExpensesLoadingMore) return
    if (state.expenses.length >= expensesTotal) return
    setExpensesLoadingMore(true)
    try {
      const page = await listExpensePage({
        limit: EXPENSES_PAGE_SIZE,
        offset: expensesOffset,
      })
      updateState((prev) => ({
        ...prev,
        expenses: [...prev.expenses, ...page.items],
      }))
      const pendingCreateCount = resolvePendingCreateIds(
        getOutboxOperationsForFamily(),
      ).expenseIds.size
      setExpensesTotal((prev) =>
        Math.max(prev, page.total + pendingCreateCount),
      )
      setExpensesOffset((prev) => prev + page.items.length)
    } finally {
      setExpensesLoadingMore(false)
    }
  }

  const handleCreateCategory = async (name: string, payload?: CategoryAppearanceInput): Promise<Category> => {
    if (guardReadOnly()) {
      const trimmed = name.trim()
      const existing = findCategoryByName(state.categories, trimmed)
      if (existing) return existing
      throw new Error('read_only')
    }
    const trimmed = name.trim()
    const existing = findCategoryByName(state.categories, trimmed)
    if (existing) return existing
    const created = await createCategory(trimmed, payload)
    updateState((prev) => ({
      ...prev,
      categories: [...prev.categories, created],
    }))
    return created
  }

  const handleUpdateCategory = async (
    categoryId: string,
    name: string,
    payload?: CategoryAppearanceInput,
  ): Promise<Category> => {
    if (guardReadOnly()) {
      throw new Error('read_only')
    }
    const trimmed = name.trim()
    const existing = findCategoryByName(state.categories, trimmed)
    if (existing && existing.id !== categoryId) {
      return existing
    }
    const updated = await updateCategory(categoryId, trimmed, payload)
    updateState((prev) => ({
      ...prev,
      categories: prev.categories.map((category) => (category.id === updated.id ? updated : category)),
    }))
    return updated
  }

  const handleDeleteCategory = async (categoryId: string): Promise<void> => {
    if (guardReadOnly()) return
    await deleteCategory(categoryId)
    updateState((prev) => ({
      ...prev,
      categories: prev.categories.filter((category) => category.id !== categoryId),
      expenses: prev.expenses.map((expense) => ({
        ...expense,
        categoryIds: expense.categoryIds.filter((id) => id !== categoryId),
      })),
    }))
  }

  const handleRefreshExpenses = async () => {
    if (!authSession || !familyId || isExpensesRefreshing) return
    setExpensesRefreshing(true)
    try {
      await onManualRefresh('expenses')
    } finally {
      setExpensesRefreshing(false)
    }
  }

  const handleRefreshExpenseCategories = async () => {
    if (!authSession || !familyId) return
    try {
      const categories = await listCategories()
      updateState((prev) => ({
        ...prev,
        categories,
      }))
    } catch (error) {
      if (isNetworkLikeError(error)) {
        setDataSyncStatus('offline')
      }
      setDataStale(true)
    }
  }

  return {
    handleCreateExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleLoadMoreExpenses,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleRefreshExpenses,
    handleRefreshExpenseCategories,
  }
}
