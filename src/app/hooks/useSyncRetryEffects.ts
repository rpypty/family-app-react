import { useEffect } from 'react'
import type { AuthSession } from '../../features/auth/api/auth'
import { loadCacheMeta } from '../../shared/storage/cacheMeta'
import type { MutableRefObject } from 'react'
import type { StorageState } from '../../shared/types'
import { AUTO_RETRY_INTERVAL_MS, INITIAL_SYNC_TIMEOUT_MS } from '../sync/constants'
import type { DataSyncSetters } from '../sync/contracts'
import type { DataSyncStatus, DataSyncTrigger } from '../sync/types'

type UseSyncRetryEffectsParams = {
  familyId: string | null
  authSession: AuthSession | null
  dataSyncStatus: DataSyncStatus
  isOffline: boolean
  isOfflineRef: MutableRefObject<boolean>
  stateRef: MutableRefObject<StorageState>
  offlineSnapshotRef: MutableRefObject<{ lastSyncAt?: string | null } | null>
  setters: Pick<
    DataSyncSetters,
    | 'setLastSyncAt'
    | 'setSyncErrorMessage'
    | 'setExpensesTotal'
    | 'setExpensesOffset'
    | 'setExpensesLoadingMore'
    | 'setDataSyncStatus'
    | 'setDataStale'
  >
  syncAllData: (params: { timeoutMs: number; trigger: DataSyncTrigger }) => Promise<boolean>
}

export function useSyncRetryEffects({
  familyId,
  authSession,
  dataSyncStatus,
  isOffline,
  isOfflineRef,
  stateRef,
  offlineSnapshotRef,
  setters,
  syncAllData,
}: UseSyncRetryEffectsParams) {
  const {
    setLastSyncAt,
    setSyncErrorMessage,
    setExpensesTotal,
    setExpensesOffset,
    setExpensesLoadingMore,
    setDataSyncStatus,
    setDataStale,
  } = setters

  useEffect(() => {
    if (!familyId) return
    if (!authSession && !isOfflineRef.current) return
    const hasLocalData =
      stateRef.current.expenses.length > 0 ||
      stateRef.current.tags.length > 0 ||
      stateRef.current.todoLists.length > 0
    const cacheMeta = loadCacheMeta(familyId)
    setLastSyncAt(cacheMeta?.lastSyncAt ?? offlineSnapshotRef.current?.lastSyncAt ?? null)
    setSyncErrorMessage(null)
    const hasCache = Boolean(cacheMeta) || hasLocalData
    if (hasCache) {
      setExpensesTotal((prev) => Math.max(prev, stateRef.current.expenses.length))
      setExpensesOffset(stateRef.current.expenses.length)
    } else {
      setExpensesTotal(0)
      setExpensesOffset(0)
    }
    setExpensesLoadingMore(false)

    if (isOfflineRef.current) {
      setDataSyncStatus('offline')
      if (hasCache) {
        setDataStale(true)
      }
      return
    }

    void syncAllData({
      timeoutMs: INITIAL_SYNC_TIMEOUT_MS,
      trigger: 'initial',
    })
  }, [
    familyId,
    authSession,
    isOfflineRef,
    stateRef,
    setLastSyncAt,
    setSyncErrorMessage,
    setExpensesTotal,
    setExpensesOffset,
    setExpensesLoadingMore,
    setDataSyncStatus,
    setDataStale,
    syncAllData,
    offlineSnapshotRef,
  ])

  useEffect(() => {
    if (!authSession || !familyId) return
    if (dataSyncStatus !== 'offline' && dataSyncStatus !== 'error') return
    if (typeof window === 'undefined') return

    const intervalId = window.setInterval(() => {
      void syncAllData({
        timeoutMs: INITIAL_SYNC_TIMEOUT_MS,
        trigger: 'auto-retry',
      })
    }, AUTO_RETRY_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [authSession, familyId, dataSyncStatus, syncAllData])

  useEffect(() => {
    if (isOffline) return
    if (dataSyncStatus !== 'offline' && dataSyncStatus !== 'error') return
    if (!authSession || !familyId) return
    void syncAllData({
      timeoutMs: INITIAL_SYNC_TIMEOUT_MS,
      trigger: 'auto-retry',
    })
  }, [isOffline, dataSyncStatus, authSession, familyId, syncAllData])
}
