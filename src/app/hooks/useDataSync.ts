import type { MutableRefObject } from 'react'
import type { AuthSession } from '../../features/auth/api/auth'
import type { StorageState } from '../../shared/types'
import type { DataSyncSetters } from '../sync/contracts'
import type { DataSyncStatus } from '../sync/types'
import type { AppId } from '../routing/routes'
import { useOfflineOutbox } from './useOfflineOutbox'
import { useSyncRetryEffects } from './useSyncRetryEffects'
import { useSyncRunner } from './useSyncRunner'

type UseDataSyncParams = {
  activeApp: AppId
  familyId: string | null
  authSession: AuthSession | null
  dataSyncStatus: DataSyncStatus
  isOffline: boolean
  isOfflineRef: MutableRefObject<boolean>
  stateRef: MutableRefObject<StorageState>
  updateState: (updater: (prev: StorageState) => StorageState) => void
  persistOfflineSnapshot: (payload: {
    lastSyncAt?: string | null
  }) => void
  setters: DataSyncSetters
  offlineSnapshotRef: MutableRefObject<{ lastSyncAt?: string | null } | null>
}

export function useDataSync({
  activeApp,
  familyId,
  authSession,
  dataSyncStatus,
  isOffline,
  isOfflineRef,
  stateRef,
  updateState,
  persistOfflineSnapshot,
  setters,
  offlineSnapshotRef,
}: UseDataSyncParams) {
  const {
    getOutboxOperationsForFamily,
    enqueueOfflineOperation,
    flushOfflineOutbox,
    resetOfflineOutboxStorage,
  } = useOfflineOutbox({
    familyId,
    updateState,
    setOfflineSyncNoticeOpen: setters.setOfflineSyncNoticeOpen,
  })

  const {
    syncAllData,
    performManualRefresh,
    resetSyncInFlight,
  } = useSyncRunner({
    familyId,
    authSession,
    isOfflineRef,
    stateRef,
    updateState,
    persistOfflineSnapshot,
    setters,
    getOutboxOperationsForFamily,
    flushOfflineOutbox,
  })

  useSyncRetryEffects({
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
  })

  return {
    enqueueOfflineOperation,
    getOutboxOperationsForFamily,
    performManualRefresh,
    resetOfflineOutboxStorage,
    resetSyncInFlight,
  }
}
