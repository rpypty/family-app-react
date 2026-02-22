import type { SyncEntityMapping } from '../../features/sync/api/sync'
import {
  resolvePendingCreateIds,
  resolvePendingTodoItemIds,
  type OfflineOutboxOperation,
} from '../../features/sync/model/offlineOutbox'
import type { Expense, StorageState, TodoItem } from '../../shared/types'

export const sortExpensesByDateDesc = (expenses: Expense[]) =>
  [...expenses].sort((left, right) => {
    if (left.date === right.date) return 0
    return left.date < right.date ? 1 : -1
  })

export const applySyncEntityMappingsToState = (
  state: StorageState,
  mappings: SyncEntityMapping[],
): StorageState => {
  if (mappings.length === 0) return state

  const expenseMappings = new Map<string, string>()
  const todoMappings = new Map<string, string>()

  mappings.forEach((mapping) => {
    if (mapping.entity === 'expense') {
      expenseMappings.set(mapping.local_id, mapping.server_id)
      return
    }
    if (mapping.entity === 'todo_item') {
      todoMappings.set(mapping.local_id, mapping.server_id)
    }
  })

  if (expenseMappings.size === 0 && todoMappings.size === 0) {
    return state
  }

  const expenses = expenseMappings.size > 0
    ? state.expenses.map((expense) => ({
        ...expense,
        id: expenseMappings.get(expense.id) ?? expense.id,
      }))
    : state.expenses

  const todoLists = todoMappings.size > 0
    ? state.todoLists.map((list) => ({
        ...list,
        items: list.items.map((item) => ({
          ...item,
          id: todoMappings.get(item.id) ?? item.id,
        })),
      }))
    : state.todoLists

  return {
    ...state,
    expenses,
    todoLists,
  }
}

export const applyPendingSyncState = (
  state: StorageState,
  operations: OfflineOutboxOperation[],
): StorageState => {
  const pendingCreateIds = resolvePendingCreateIds(operations)
  const pendingTodoItemIds = resolvePendingTodoItemIds(operations)

  const expenses = state.expenses.map((expense) => {
    if (pendingCreateIds.expenseIds.has(expense.id)) {
      if (expense.syncState === 'pending') return expense
      return {
        ...expense,
        syncState: 'pending' as const,
      }
    }
    if (expense.syncState !== undefined) {
      const { syncState, ...rest } = expense
      void syncState
      return rest
    }
    return expense
  })

  const todoLists = state.todoLists.map((list) => ({
    ...list,
    items: list.items.map((item) => {
      if (pendingTodoItemIds.has(item.id)) {
        if (item.syncState === 'pending') return item
        return {
          ...item,
          syncState: 'pending' as const,
        }
      }
      if (item.syncState !== undefined) {
        const { syncState, ...rest } = item
        void syncState
        return rest
      }
      return item
    }),
  }))

  return {
    ...state,
    expenses,
    todoLists,
  }
}

export const mergeFetchedStateWithPendingCreates = (
  fetchedState: Pick<StorageState, 'expenses' | 'tags' | 'todoLists'>,
  previousState: StorageState,
  operations: OfflineOutboxOperation[],
): Pick<StorageState, 'expenses' | 'tags' | 'todoLists'> => {
  const pendingCreateIds = resolvePendingCreateIds(operations)
  if (pendingCreateIds.expenseIds.size === 0 && pendingCreateIds.todoIds.size === 0) {
    return fetchedState
  }

  const pendingExpenses = previousState.expenses.filter((expense) =>
    pendingCreateIds.expenseIds.has(expense.id),
  )
  const mergedExpenseIds = new Set(fetchedState.expenses.map((expense) => expense.id))
  const mergedExpenses = sortExpensesByDateDesc([
    ...pendingExpenses.filter((expense) => !mergedExpenseIds.has(expense.id)),
    ...fetchedState.expenses,
  ])

  const pendingTodoByList = new Map<string, TodoItem[]>()
  previousState.todoLists.forEach((list) => {
    const pendingItems = list.items.filter((item) => pendingCreateIds.todoIds.has(item.id))
    if (pendingItems.length > 0) {
      pendingTodoByList.set(list.id, pendingItems)
    }
  })

  const mergedTodoLists = fetchedState.todoLists.map((list) => {
    const pendingItems = pendingTodoByList.get(list.id)
    if (!pendingItems || pendingItems.length === 0) {
      return list
    }
    const existingIds = new Set(list.items.map((item) => item.id))
    return {
      ...list,
      items: [
        ...pendingItems.filter((item) => !existingIds.has(item.id)),
        ...list.items,
      ],
    }
  })

  const fetchedListIds = new Set(fetchedState.todoLists.map((list) => list.id))
  const pendingOnlyLists = previousState.todoLists
    .filter((list) => !fetchedListIds.has(list.id))
    .map((list) => ({
      ...list,
      items: list.items.filter((item) => pendingCreateIds.todoIds.has(item.id)),
    }))
    .filter((list) => list.items.length > 0)

  return {
    expenses: mergedExpenses,
    tags: fetchedState.tags,
    todoLists: [...pendingOnlyLists, ...mergedTodoLists],
  }
}
