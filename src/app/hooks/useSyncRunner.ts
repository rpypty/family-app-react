import { useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { AuthSession } from '../../features/auth/api/auth'
import { listExpensePage } from '../../features/miniapps/expense/expenses/api/expenses'
import { listTags } from '../../features/miniapps/expense/expenses/api/tags'
import { listTodoLists } from '../../features/miniapps/todo/api/todos'
import type { OfflineOutboxOperation } from '../../features/sync/model/offlineOutbox'
import { resolvePendingCreateIds } from '../../features/sync/model/offlineOutbox'
import { isApiError, isApiTimeoutError } from '../../shared/api/client'
import { saveCacheMeta } from '../../shared/storage/cacheMeta'
import type { StorageState } from '../../shared/types'
import type { DataSyncSetters } from '../sync/contracts'
import { EXPENSES_PAGE_SIZE, MANUAL_RETRY_TIMEOUT_MS } from '../sync/constants'
import { logDataSync } from '../sync/logging'
import { isNetworkLikeError } from '../sync/network'
import type { DataSyncStatus, DataSyncTrigger } from '../sync/types'
import { applyPendingSyncState, mergeFetchedStateWithPendingCreates } from '../sync/stateTransforms'
import type { OfflineFlushResult } from './useOfflineOutbox'

type UseSyncRunnerParams = {
  familyId: string | null
  authSession: AuthSession | null
  isOfflineRef: MutableRefObject<boolean>
  stateRef: MutableRefObject<StorageState>
  updateState: (updater: (prev: StorageState) => StorageState) => void
  persistOfflineSnapshot: (payload: {
    lastSyncAt?: string | null
  }) => void
  setters: Pick<
    DataSyncSetters,
    | 'setDataSyncStatus'
    | 'setSyncInFlight'
    | 'setManualRetrying'
    | 'setSyncErrorMessage'
    | 'setDataStale'
    | 'setLastSyncAt'
    | 'setExpensesTotal'
    | 'setExpensesOffset'
  >
  getOutboxOperationsForFamily: () => OfflineOutboxOperation[]
  flushOfflineOutbox: (params: { timeoutMs: number }) => Promise<OfflineFlushResult>
}

export function useSyncRunner({
  familyId,
  authSession,
  isOfflineRef,
  stateRef,
  updateState,
  persistOfflineSnapshot,
  setters,
  getOutboxOperationsForFamily,
  flushOfflineOutbox,
}: UseSyncRunnerParams) {
  const syncInFlightRef = useRef(false)
  const {
    setDataSyncStatus,
    setSyncInFlight,
    setManualRetrying,
    setSyncErrorMessage,
    setDataStale,
    setLastSyncAt,
    setExpensesTotal,
    setExpensesOffset,
  } = setters

  const syncAllData = useCallback(
    async ({
      timeoutMs,
      trigger,
    }: {
      timeoutMs: number
      trigger: DataSyncTrigger
    }): Promise<boolean> => {
      if (!familyId) return false
      if (!authSession && !isOfflineRef.current) return false
      if (syncInFlightRef.current) return false
      const hasLocalData =
        stateRef.current.expenses.length > 0 ||
        stateRef.current.tags.length > 0 ||
        stateRef.current.todoLists.length > 0

      syncInFlightRef.current = true
      setSyncInFlight(true)
      if (trigger === 'manual') {
        setManualRetrying(true)
      }
      if (trigger !== 'auto-retry') {
        setDataSyncStatus('loading')
      }
      setSyncErrorMessage(null)

      const startedAt = performance.now()
      logDataSync('sync_started', {
        trigger,
        timeoutMs,
        hasLocalData,
      })

      try {
        let flushResult: OfflineFlushResult = {
          syncedOperations: 0,
          remainingOperations: getOutboxOperationsForFamily().length,
        }

        try {
          flushResult = await flushOfflineOutbox({ timeoutMs })
        } catch (flushError) {
          if (isNetworkLikeError(flushError)) {
            throw flushError
          }
          logDataSync('offline_flush_failed', {
            trigger,
            timeoutMs,
            message:
              isApiError(flushError) || isApiTimeoutError(flushError)
                ? flushError.message
                : flushError instanceof Error
                  ? flushError.message
                  : 'unknown_flush_error',
          })
        }

        const [expensePage, tags, todoListPage] = await Promise.all([
          listExpensePage(
            { limit: EXPENSES_PAGE_SIZE, offset: 0 },
            { timeoutMs },
          ),
          listTags({ timeoutMs }),
          listTodoLists(
            { includeItems: true, itemsArchived: 'all' },
            { timeoutMs },
          ),
        ])

        const pendingOperations = getOutboxOperationsForFamily()
        const pendingCreateIds = resolvePendingCreateIds(pendingOperations)
        const nextSlices = mergeFetchedStateWithPendingCreates(
          {
            expenses: expensePage.items,
            tags,
            todoLists: todoListPage.items,
          },
          stateRef.current,
          pendingOperations,
        )

        updateState((prev) =>
          applyPendingSyncState(
            {
              ...prev,
              expenses: nextSlices.expenses,
              tags: nextSlices.tags,
              todoLists: nextSlices.todoLists,
            },
            pendingOperations,
          ),
        )
        setExpensesTotal(
          Math.max(
            expensePage.total + pendingCreateIds.expenseIds.size,
            nextSlices.expenses.length,
          ),
        )
        setExpensesOffset(expensePage.items.length)
        const now = new Date().toISOString()
        setLastSyncAt(now)
        saveCacheMeta({ familyId, lastSyncAt: now })
        persistOfflineSnapshot({ lastSyncAt: now })
        setDataSyncStatus('updated')
        setDataStale(false)
        setSyncErrorMessage(null)
        logDataSync('sync_succeeded', {
          trigger,
          timeoutMs,
          durationMs: Math.round(performance.now() - startedAt),
          expensesCount: expensePage.items.length,
          expensesTotal: expensePage.total,
          syncedOfflineOperations: flushResult.syncedOperations,
          pendingOfflineOperations: flushResult.remainingOperations,
        })
        return true
      } catch (error) {
        const status: DataSyncStatus = isNetworkLikeError(error) ? 'offline' : 'error'
        setDataSyncStatus(status)
        setSyncErrorMessage(
          status === 'error'
            ? isApiError(error)
              ? error.message
              : 'Не удалось обновить данные.'
            : null,
        )
        if (hasLocalData) {
          setDataStale(true)
        }
        logDataSync('sync_failed', {
          trigger,
          timeoutMs,
          status,
          durationMs: Math.round(performance.now() - startedAt),
          hasLocalData,
          message:
            isApiError(error) || isApiTimeoutError(error)
              ? error.message
              : error instanceof Error
                ? error.message
                : 'unknown_error',
        })
        return false
      } finally {
        syncInFlightRef.current = false
        setSyncInFlight(false)
        if (trigger === 'manual') {
          setManualRetrying(false)
        }
      }
    },
    [
      familyId,
      authSession,
      isOfflineRef,
      stateRef,
      setSyncInFlight,
      setManualRetrying,
      setDataSyncStatus,
      setSyncErrorMessage,
      getOutboxOperationsForFamily,
      flushOfflineOutbox,
      updateState,
      setExpensesTotal,
      setExpensesOffset,
      setLastSyncAt,
      persistOfflineSnapshot,
      setDataStale,
    ],
  )

  const performManualRefresh = useCallback(async () => {
    if (!authSession || !familyId) return
    await syncAllData({
      timeoutMs: MANUAL_RETRY_TIMEOUT_MS,
      trigger: 'manual',
    })
  }, [authSession, familyId, syncAllData])

  const resetSyncInFlight = useCallback(() => {
    syncInFlightRef.current = false
    setSyncInFlight(false)
    setManualRetrying(false)
  }, [setManualRetrying, setSyncInFlight])

  return {
    syncAllData,
    performManualRefresh,
    resetSyncInFlight,
  }
}
