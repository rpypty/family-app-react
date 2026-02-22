import { useCallback } from 'react'
import type { AuthUser } from '../../features/auth/api/auth'
import type { Family } from '../../features/family/api/families'
import { clearCacheMeta } from '../../shared/storage/cacheMeta'
import type { StorageState } from '../../shared/types'
import type { DataSyncSetters } from '../sync/contracts'
import type { AuthFamilySetters } from './contracts'

type UseAppSessionResetParams = {
  authUser: AuthUser | null
  navigateHome: (replace?: boolean) => void
  persistOfflineSnapshot: (payload: {
    lastUser?: AuthUser | null
    lastFamily?: Family | null
  }) => void
  clearOfflineSnapshot: () => void
  updateState: (updater: (prev: StorageState) => StorageState) => void
  resetSyncInFlight: () => void
  resetOfflineOutboxStorage: () => void
  sessionSetters: AuthFamilySetters
  syncSetters: Pick<
    DataSyncSetters,
    | 'setDataSyncStatus'
    | 'setSyncErrorMessage'
    | 'setDataStale'
    | 'setLastSyncAt'
    | 'setExpensesTotal'
    | 'setExpensesOffset'
    | 'setExpensesLoadingMore'
    | 'setOfflineSyncNoticeOpen'
  >
}

export function useAppSessionReset({
  authUser,
  navigateHome,
  persistOfflineSnapshot,
  clearOfflineSnapshot,
  updateState,
  resetSyncInFlight,
  resetOfflineOutboxStorage,
  sessionSetters,
  syncSetters,
}: UseAppSessionResetParams) {
  const { setAuthSession, setAuthUser, setFamilyId, setFamily } = sessionSetters
  const {
    setDataSyncStatus,
    setSyncErrorMessage,
    setDataStale,
    setLastSyncAt,
    setExpensesTotal,
    setExpensesOffset,
    setExpensesLoadingMore,
    setOfflineSyncNoticeOpen,
  } = syncSetters

  const resetFamilyScopedState = useCallback(() => {
    resetSyncInFlight()
    resetOfflineOutboxStorage()
    navigateHome(true)
    setDataSyncStatus('loading')
    setSyncErrorMessage(null)
    setDataStale(false)
    setLastSyncAt(null)
    setExpensesTotal(0)
    setExpensesOffset(0)
    setExpensesLoadingMore(false)
    setOfflineSyncNoticeOpen(false)
    updateState((prev) => ({ ...prev, expenses: [], tags: [], todoLists: [] }))
    clearCacheMeta()
    clearOfflineSnapshot()
  }, [
    resetSyncInFlight,
    resetOfflineOutboxStorage,
    navigateHome,
    setDataSyncStatus,
    setSyncErrorMessage,
    setDataStale,
    setLastSyncAt,
    setExpensesTotal,
    setExpensesOffset,
    setExpensesLoadingMore,
    setOfflineSyncNoticeOpen,
    updateState,
    clearOfflineSnapshot,
  ])

  const handleFamilyComplete = useCallback((nextFamily: Family) => {
    setFamily(nextFamily)
    setFamilyId(nextFamily.id)
    setDataSyncStatus('loading')
    setSyncErrorMessage(null)
    if (authUser) {
      persistOfflineSnapshot({ lastUser: authUser, lastFamily: nextFamily })
    }
    navigateHome(true)
  }, [
    setFamily,
    setFamilyId,
    setDataSyncStatus,
    setSyncErrorMessage,
    authUser,
    persistOfflineSnapshot,
    navigateHome,
  ])

  const handleSignedOutStateReset = useCallback(() => {
    setAuthSession(null)
    setAuthUser(null)
    setFamilyId(null)
    setFamily(null)
    resetFamilyScopedState()
  }, [setAuthSession, setAuthUser, setFamilyId, setFamily, resetFamilyScopedState])

  const handleFamilyLeftStateReset = useCallback(() => {
    setFamilyId(null)
    setFamily(null)
    resetFamilyScopedState()
  }, [setFamilyId, setFamily, resetFamilyScopedState])

  return {
    handleFamilyComplete,
    handleSignedOutStateReset,
    handleFamilyLeftStateReset,
  }
}
