import { useEffect } from 'react'
import type { AuthSession } from '../../features/auth/api/auth'
import { loadCacheMeta } from '../../shared/storage/cacheMeta'
import type { MutableRefObject } from 'react'
import type { StorageState } from '../../shared/types'
import type { AppId } from '../routing/routes'
import { AUTO_RETRY_INTERVAL_MS, INITIAL_SYNC_TIMEOUT_MS } from '../sync/constants'
import type { DataSyncSetters } from '../sync/contracts'
import type { DataSyncScope, DataSyncStatus, DataSyncTrigger } from '../sync/types'

type UseSyncRetryEffectsParams = {
  activeApp: AppId
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
  syncAllData: (params: {
    timeoutMs: number
    trigger: DataSyncTrigger
    scope?: DataSyncScope
  }) => Promise<boolean>
}

export function useSyncRetryEffects({
  activeApp,
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
  const syncScope: DataSyncScope | null =
    activeApp === 'todo' ? 'todo' : activeApp === 'expenses' ? 'expenses' : null

  useEffect(() => {
    if (!familyId) return
    if (!authSession && !isOfflineRef.current) return
    if (!syncScope) return
    const hasLocalData =
      stateRef.current.expenses.length > 0 ||
      stateRef.current.categories.length > 0 ||
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
      scope: syncScope,
    })
  }, [
    activeApp,
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
    syncScope,
    offlineSnapshotRef,
  ])

  useEffect(() => {
    if (!authSession || !familyId) return
    if (!isOffline) return
    if (!syncScope) return
    if (dataSyncStatus !== 'offline' && dataSyncStatus !== 'error') return
    if (typeof window === 'undefined') return

    const intervalId = window.setInterval(() => {
      void syncAllData({
        timeoutMs: INITIAL_SYNC_TIMEOUT_MS,
        trigger: 'auto-retry',
        scope: syncScope,
      })
    }, AUTO_RETRY_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isOffline, authSession, familyId, dataSyncStatus, syncAllData, syncScope])

  useEffect(() => {
    if (isOffline) return
    if (!syncScope) return
    if (dataSyncStatus !== 'offline' && dataSyncStatus !== 'error') return
    if (!authSession || !familyId) return
    void syncAllData({
      timeoutMs: INITIAL_SYNC_TIMEOUT_MS,
      trigger: 'auto-retry',
      scope: syncScope,
    })
  }, [isOffline, dataSyncStatus, authSession, familyId, syncAllData, syncScope])
}
