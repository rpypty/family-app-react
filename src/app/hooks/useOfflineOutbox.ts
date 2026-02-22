import { useCallback, useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { syncOfflineBatch, type SyncOperation, type SyncOperationResult } from '../../features/sync/api/sync'
import {
  applyTodoMappingsToOperations,
  clearOfflineOutbox,
  loadOfflineOutbox,
  saveOfflineOutbox,
  upsertTodoToggleOperation,
  type OfflineOutboxOperation,
} from '../../features/sync/model/offlineOutbox'
import type { StorageState } from '../../shared/types'
import { applyPendingSyncState, applySyncEntityMappingsToState } from '../sync/stateTransforms'

export type OfflineFlushResult = {
  syncedOperations: number
  remainingOperations: number
}

type UseOfflineOutboxParams = {
  familyId: string | null
  updateState: (updater: (prev: StorageState) => StorageState) => void
  setOfflineSyncNoticeOpen: Dispatch<SetStateAction<boolean>>
}

const shouldKeepFailedOperationForRetry = (result: SyncOperationResult): boolean => {
  if (result.status !== 'failed') return false
  return result.error?.retryable !== false
}

export function useOfflineOutbox({
  familyId,
  updateState,
  setOfflineSyncNoticeOpen,
}: UseOfflineOutboxParams) {
  const offlineOutboxRef = useRef(loadOfflineOutbox())

  const getOutboxOperationsForFamily = useCallback((): OfflineOutboxOperation[] => {
    if (!familyId) return []

    const current = offlineOutboxRef.current
    if (current.family_id && current.family_id !== familyId) {
      const reset = {
        family_id: familyId,
        operations: [] as OfflineOutboxOperation[],
      }
      offlineOutboxRef.current = reset
      saveOfflineOutbox(reset)
      return []
    }

    if (current.family_id === null) {
      const adopted = {
        family_id: familyId,
        operations: current.operations,
      }
      offlineOutboxRef.current = adopted
      saveOfflineOutbox(adopted)
      return adopted.operations
    }

    return current.operations
  }, [familyId])

  const setOutboxOperations = useCallback((operations: OfflineOutboxOperation[]) => {
    const next = {
      family_id: familyId ?? offlineOutboxRef.current.family_id ?? null,
      operations,
    }
    offlineOutboxRef.current = next
    saveOfflineOutbox(next)
  }, [familyId])

  const enqueueOfflineOperation = useCallback(
    (operation: SyncOperation) => {
      if (!familyId) return

      const currentOperations = getOutboxOperationsForFamily()
      const nextOperations = operation.type === 'set_todo_completed'
        ? upsertTodoToggleOperation(currentOperations, operation)
        : [
            ...currentOperations,
            {
              ...operation,
              created_at: new Date().toISOString(),
            },
          ]

      setOutboxOperations(nextOperations)
      updateState((prev) => applyPendingSyncState(prev, nextOperations))
    },
    [familyId, getOutboxOperationsForFamily, setOutboxOperations, updateState],
  )

  const flushOfflineOutbox = useCallback(
    async ({ timeoutMs }: { timeoutMs: number }): Promise<OfflineFlushResult> => {
      if (!familyId) {
        return { syncedOperations: 0, remainingOperations: 0 }
      }

      const operations = getOutboxOperationsForFamily()
      if (operations.length === 0) {
        return { syncedOperations: 0, remainingOperations: 0 }
      }

      const requestOperations = operations.map((operation) => {
        const { created_at, ...requestOperation } = operation
        void created_at
        return requestOperation
      })
      const response = await syncOfflineBatch(
        {
          operations: requestOperations,
        },
        { timeoutMs },
      )

      const resultsMap = new Map<string, SyncOperationResult>(
        response.results.map((result) => [result.operation_id, result]),
      )
      const mappedOperations = applyTodoMappingsToOperations(operations, response.mappings)
      const nextOperations = mappedOperations.filter((operation) => {
        const result = resultsMap.get(operation.operation_id)
        if (!result) return true
        return shouldKeepFailedOperationForRetry(result)
      })

      const syncedOperations = response.results.filter(
        (result) => result.status === 'applied' || result.status === 'duplicate',
      ).length
      setOutboxOperations(nextOperations)
      updateState((prev) =>
        applyPendingSyncState(
          applySyncEntityMappingsToState(prev, response.mappings),
          nextOperations,
        ),
      )

      if (syncedOperations > 0 && nextOperations.length === 0) {
        setOfflineSyncNoticeOpen(true)
      }

      return {
        syncedOperations,
        remainingOperations: nextOperations.length,
      }
    },
    [familyId, getOutboxOperationsForFamily, setOutboxOperations, updateState, setOfflineSyncNoticeOpen],
  )

  useEffect(() => {
    if (!familyId) return
    const operations = getOutboxOperationsForFamily()
    if (operations.length === 0) return
    updateState((prev) => applyPendingSyncState(prev, operations))
  }, [familyId, getOutboxOperationsForFamily, updateState])

  const resetOfflineOutboxStorage = useCallback(() => {
    offlineOutboxRef.current = { family_id: null, operations: [] }
    clearOfflineOutbox()
  }, [])

  return {
    getOutboxOperationsForFamily,
    enqueueOfflineOperation,
    flushOfflineOutbox,
    resetOfflineOutboxStorage,
  }
}
