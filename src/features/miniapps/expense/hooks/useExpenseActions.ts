import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AuthSession } from '../../../auth/api/auth'
import {
  createExpense,
  deleteExpense,
  listExpensePage,
  updateExpense,
} from '../expenses/api/expenses'
import {
  createTag,
  deleteTag,
  updateTag,
} from '../expenses/api/tags'
import type { SyncOperation } from '../../../sync/api/sync'
import {
  createOperationId,
  resolvePendingCreateIds,
  type OfflineOutboxOperation,
} from '../../../sync/model/offlineOutbox'
import { findTagByName } from '../../../../shared/lib/tagUtils'
import type { Expense, StorageState, Tag } from '../../../../shared/types'
import { EXPENSES_PAGE_SIZE } from '../../../../app/sync/constants'
import { isNetworkLikeError } from '../../../../app/sync/network'
import type { DataSyncStatus } from '../../../../app/sync/types'
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
    onManualRefresh: () => Promise<void>
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
          tag_ids: localExpense.tagIds,
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

  const handleCreateTag = async (name: string): Promise<Tag> => {
    if (guardReadOnly()) {
      const trimmed = name.trim()
      const existing = findTagByName(state.tags, trimmed)
      if (existing) return existing
      throw new Error('read_only')
    }
    const trimmed = name.trim()
    const existing = findTagByName(state.tags, trimmed)
    if (existing) return existing
    const created = await createTag(trimmed)
    updateState((prev) => ({
      ...prev,
      tags: [...prev.tags, created],
    }))
    return created
  }

  const handleUpdateTag = async (tagId: string, name: string): Promise<Tag> => {
    if (guardReadOnly()) {
      throw new Error('read_only')
    }
    const trimmed = name.trim()
    const existing = findTagByName(state.tags, trimmed)
    if (existing && existing.id !== tagId) {
      return existing
    }
    const updated = await updateTag(tagId, trimmed)
    updateState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag) => (tag.id === updated.id ? updated : tag)),
    }))
    return updated
  }

  const handleDeleteTag = async (tagId: string): Promise<void> => {
    if (guardReadOnly()) return
    await deleteTag(tagId)
    updateState((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag.id !== tagId),
      expenses: prev.expenses.map((expense) => ({
        ...expense,
        tagIds: expense.tagIds.filter((id) => id !== tagId),
      })),
    }))
  }

  const handleRefreshExpenses = async () => {
    if (!authSession || !familyId || isExpensesRefreshing) return
    setExpensesRefreshing(true)
    try {
      await onManualRefresh()
    } finally {
      setExpensesRefreshing(false)
    }
  }

  return {
    handleCreateExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleLoadMoreExpenses,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
    handleRefreshExpenses,
  }
}
