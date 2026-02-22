import type { Dispatch, SetStateAction } from 'react'
import type { AuthSession, AuthUser } from '../../../auth/api/auth'
import {
  createTodoItem,
  createTodoList,
  deleteTodoItem,
  deleteTodoList,
  updateTodoItem,
  updateTodoList,
} from '../api/todos'
import type { SyncOperation } from '../../../sync/api/sync'
import { createOperationId } from '../../../sync/model/offlineOutbox'
import { createId } from '../../../../shared/lib/uuid'
import type { StorageState, TodoItem, TodoList } from '../../../../shared/types'
import { isNetworkLikeError } from '../../../../app/sync/network'
import type { DataSyncStatus } from '../../../../app/sync/types'

type UseTodoActionsParams = {
  state: {
    state: StorageState
    authSession: AuthSession | null
    authUser: AuthUser | null
    familyId: string | null
    isOfflineLike: boolean
    isReadOnly: boolean
    isTodoRefreshing: boolean
  }
  mutators: {
    guardReadOnly: () => boolean
    updateTodoLists: (updater: (prev: TodoList[]) => TodoList[]) => void
    setDataSyncStatus: Dispatch<SetStateAction<DataSyncStatus>>
    setDataStale: Dispatch<SetStateAction<boolean>>
    setTodoRefreshing: Dispatch<SetStateAction<boolean>>
  }
  sync: {
    enqueueOfflineOperation: (operation: SyncOperation) => void
    onManualRefresh: () => Promise<void>
  }
}

export function useTodoActions({
  state: {
    state,
    authSession,
    authUser,
    familyId,
    isOfflineLike,
    isReadOnly,
    isTodoRefreshing,
  },
  mutators: {
    guardReadOnly,
    updateTodoLists,
    setDataSyncStatus,
    setDataStale,
    setTodoRefreshing,
  },
  sync: {
    enqueueOfflineOperation,
    onManualRefresh,
  },
}: UseTodoActionsParams) {
  const handleRefreshTodoLists = async () => {
    if (!authSession || !familyId || isTodoRefreshing) return
    setTodoRefreshing(true)
    try {
      await onManualRefresh()
    } finally {
      setTodoRefreshing(false)
    }
  }

  const handleCreateTodoList = async (title: string) => {
    if (guardReadOnly()) return
    const created = await createTodoList(title)
    updateTodoLists((prev) => [created, ...prev])
  }

  const handleUpdateTodoListArchiveSetting = async (
    listId: string,
    archiveCompleted: boolean,
  ) => {
    if (guardReadOnly()) return
    const updated = await updateTodoList(listId, {
      settings: { archiveCompleted },
    })
    updateTodoLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list
        const updatedItems = list.items.map((item) => {
          if (!item.isCompleted) return item
          return { ...item, isArchived: archiveCompleted }
        })
        return {
          ...list,
          title: updated.title,
          settings: updated.settings,
          items: updatedItems,
        }
      }),
    )
  }

  const handleToggleTodoListCollapsed = async (listId: string, isCollapsed: boolean) => {
    updateTodoLists((prev) =>
      prev.map((list) => (list.id === listId ? { ...list, isCollapsed } : list)),
    )
    if (isReadOnly) return
    try {
      await updateTodoList(listId, { isCollapsed })
    } catch {
      setDataStale(true)
    }
  }

  const handleMoveTodoList = async (listId: string, direction: 'up' | 'down') => {
    if (guardReadOnly()) return
    const sorted = [...state.todoLists].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.createdAt.localeCompare(b.createdAt)
    })
    const currentIndex = sorted.findIndex((list) => list.id === listId)
    if (currentIndex < 0) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sorted.length) return
    const current = sorted[currentIndex]
    const target = sorted[targetIndex]
    const currentOrder = current.order ?? currentIndex
    const targetOrder = target.order ?? targetIndex

    await Promise.all([
      updateTodoList(current.id, { order: targetOrder }),
      updateTodoList(target.id, { order: currentOrder }),
    ])

    updateTodoLists((prev) =>
      prev.map((list) => {
        if (list.id === current.id) return { ...list, order: targetOrder }
        if (list.id === target.id) return { ...list, order: currentOrder }
        return list
      }),
    )
  }

  const handleDeleteTodoList = async (listId: string) => {
    if (guardReadOnly()) return
    await deleteTodoList(listId)
    updateTodoLists((prev) => prev.filter((list) => list.id !== listId))
  }

  const handleCreateTodoItem = async (listId: string, title: string) => {
    const localId = `local-todo-${createId()}`
    const optimisticItem: TodoItem = {
      id: localId,
      title,
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    }
    updateTodoLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, items: [...list.items, optimisticItem] } : list,
      ),
    )
    if (isOfflineLike) {
      updateTodoLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                items: list.items.map((item) =>
                  item.id === localId ? { ...item, syncState: 'pending' } : item,
                ),
              }
            : list,
        ),
      )
      enqueueOfflineOperation({
        operation_id: createOperationId(),
        type: 'create_todo',
        local_id: localId,
        payload: {
          list_id: listId,
          title,
        },
      })
      setDataStale(true)
      return
    }

    try {
      const created = await createTodoItem(listId, title)
      updateTodoLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                items: list.items.map((item) => (item.id === localId ? created : item)),
              }
            : list,
        ),
      )
    } catch (error) {
      if (isNetworkLikeError(error)) {
        setDataSyncStatus('offline')
        updateTodoLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: list.items.map((item) =>
                    item.id === localId ? { ...item, syncState: 'pending' } : item,
                  ),
                }
              : list,
          ),
        )
        enqueueOfflineOperation({
          operation_id: createOperationId(),
          type: 'create_todo',
          local_id: localId,
          payload: {
            list_id: listId,
            title,
          },
        })
        setDataStale(true)
        return
      }

      setDataStale(true)
      updateTodoLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? { ...list, items: list.items.filter((item) => item.id !== localId) }
            : list,
        ),
      )
    }
  }

  const handleToggleTodoItem = async (
    listId: string,
    itemId: string,
    isCompleted: boolean,
  ) => {
    const list = state.todoLists.find((entry) => entry.id === listId)
    const currentItem = list?.items.find((item) => item.id === itemId) ?? null
    const nextCompleted = !isCompleted
    const optimisticUser = authUser
      ? {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          avatarUrl: authUser.avatarUrl,
        }
      : undefined

    if (currentItem && list) {
      const optimisticItem: TodoItem = {
        ...currentItem,
        isCompleted: nextCompleted,
        isArchived: list.settings.archiveCompleted ? nextCompleted : false,
        completedAt: nextCompleted ? new Date().toISOString() : undefined,
        completedBy: nextCompleted ? optimisticUser : undefined,
      }
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((current) =>
              current.id === itemId ? optimisticItem : current,
            ),
          }
        }),
      )
    }

    const togglePayload =
      currentItem?.syncState === 'pending'
        ? { todo_local_id: itemId, is_completed: nextCompleted }
        : { todo_id: itemId, is_completed: nextCompleted }

    if (isOfflineLike) {
      enqueueOfflineOperation({
        operation_id: createOperationId(),
        type: 'set_todo_completed',
        payload: togglePayload,
      })
      setDataStale(true)
      return
    }

    try {
      const updated = await updateTodoItem(itemId, { isCompleted: nextCompleted })
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((current) => (current.id === itemId ? updated : current)),
          }
        }),
      )
    } catch (error) {
      if (isNetworkLikeError(error)) {
        setDataSyncStatus('offline')
        enqueueOfflineOperation({
          operation_id: createOperationId(),
          type: 'set_todo_completed',
          payload: togglePayload,
        })
        setDataStale(true)
        return
      }

      setDataStale(true)
      if (currentItem) {
        updateTodoLists((prev) =>
          prev.map((entry) => {
            if (entry.id !== listId) return entry
            return {
              ...entry,
              items: entry.items.map((current) =>
                current.id === itemId ? currentItem : current,
              ),
            }
          }),
        )
      }
    }
  }

  const handleUpdateTodoItemTitle = async (
    listId: string,
    itemId: string,
    title: string,
  ) => {
    if (guardReadOnly()) return
    const list = state.todoLists.find((entry) => entry.id === listId)
    const currentItem = list?.items.find((item) => item.id === itemId) ?? null

    if (currentItem) {
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((item) =>
              item.id === itemId ? { ...item, title } : item,
            ),
          }
        }),
      )
    }

    try {
      const updated = await updateTodoItem(itemId, { title })
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((item) => (item.id === itemId ? updated : item)),
          }
        }),
      )
    } catch {
      setDataStale(true)
      if (currentItem) {
        updateTodoLists((prev) =>
          prev.map((entry) => {
            if (entry.id !== listId) return entry
            return {
              ...entry,
              items: entry.items.map((item) =>
                item.id === itemId ? currentItem : item,
              ),
            }
          }),
        )
      }
    }
  }

  const handleDeleteTodoItem = async (listId: string, itemId: string) => {
    if (guardReadOnly()) return
    const list = state.todoLists.find((entry) => entry.id === listId)
    const removedIndex = list ? list.items.findIndex((item) => item.id === itemId) : -1
    const removedItem =
      removedIndex >= 0 && list ? list.items[removedIndex] : null

    if (removedItem) {
      updateTodoLists((prev) =>
        prev.map((entry) =>
          entry.id === listId
            ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
            : entry,
        ),
      )
    }

    try {
      await deleteTodoItem(itemId)
    } catch {
      setDataStale(true)
      if (removedItem) {
        updateTodoLists((prev) =>
          prev.map((entry) => {
            if (entry.id !== listId) return entry
            if (entry.items.some((item) => item.id === itemId)) return entry
            const items = [...entry.items]
            const insertIndex = Math.min(Math.max(removedIndex, 0), items.length)
            items.splice(insertIndex, 0, removedItem)
            return { ...entry, items }
          }),
        )
      }
    }
  }

  return {
    handleRefreshTodoLists,
    handleCreateTodoList,
    handleUpdateTodoListArchiveSetting,
    handleToggleTodoListCollapsed,
    handleMoveTodoList,
    handleDeleteTodoList,
    handleCreateTodoItem,
    handleToggleTodoItem,
    handleUpdateTodoItemTitle,
    handleDeleteTodoItem,
  }
}
