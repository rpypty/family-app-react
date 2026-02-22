import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthSession, AuthUser } from '../../features/auth/api/auth'
import type { Family } from '../../features/family/api/families'
import { toOfflineAuthUser, toOfflineFamily, toOfflineSession } from '../offline/adapters'
import { clearOfflineCache, loadOfflineCache, saveOfflineCache } from '../../shared/storage/offlineCache'
import { loadState, saveState } from '../../shared/storage/storage'
import type { StorageState, TodoList } from '../../shared/types'
import { createAppTheme } from '../theme/createAppTheme'
import type { DataSyncStatus } from '../sync/types'

export function useAppControllerState() {
  const initialOfflineSnapshot = useMemo(() => loadOfflineCache(), [])
  const initialOfflineUser =
    initialOfflineSnapshot?.lastUser && initialOfflineSnapshot?.lastFamily
      ? toOfflineAuthUser(initialOfflineSnapshot.lastUser)
      : null
  const initialOfflineFamily =
    initialOfflineSnapshot?.lastFamily && initialOfflineUser
      ? toOfflineFamily(initialOfflineSnapshot.lastFamily, initialOfflineUser.id)
      : null

  const [state, setState] = useState<StorageState>(() => loadState())
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator === 'undefined') return false
    return !navigator.onLine
  })
  const isOfflineRef = useRef(isOffline)
  const offlineSnapshotRef = useRef(initialOfflineSnapshot)
  const [authSession, setAuthSession] = useState<AuthSession | null>(
    initialOfflineUser ? toOfflineSession(initialOfflineUser) : null,
  )
  const [authUser, setAuthUser] = useState<AuthUser | null>(initialOfflineUser)
  const [familyId, setFamilyId] = useState<string | null>(initialOfflineFamily?.id ?? null)
  const [family, setFamily] = useState<Family | null>(initialOfflineFamily)
  const [isBootstrapping, setBootstrapping] = useState(true)
  const [dataSyncStatus, setDataSyncStatus] = useState<DataSyncStatus>('loading')
  const [isSyncInFlight, setSyncInFlight] = useState(false)
  const [isManualRetrying, setManualRetrying] = useState(false)
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null)
  const [isDataStale, setDataStale] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesOffset, setExpensesOffset] = useState(0)
  const [isExpensesLoadingMore, setExpensesLoadingMore] = useState(false)
  const [isExpensesRefreshing, setExpensesRefreshing] = useState(false)
  const [isTodoRefreshing, setTodoRefreshing] = useState(false)
  const [isOfflineSyncNoticeOpen, setOfflineSyncNoticeOpen] = useState(false)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const handleOnline = () => {
      isOfflineRef.current = false
      setIsOffline(false)
    }
    const handleOffline = () => {
      isOfflineRef.current = true
      setIsOffline(true)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  const themeMode = state.settings.themeMode
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  const persistOfflineSnapshot = useCallback((payload: {
    lastUser?: AuthUser | null
    lastFamily?: Family | null
    lastSyncAt?: string | null
  }) => {
    const current = offlineSnapshotRef.current ?? {}
    const next = {
      lastUser: payload.lastUser ?? current.lastUser ?? undefined,
      lastFamily: payload.lastFamily ?? current.lastFamily ?? undefined,
      lastSyncAt:
        payload.lastSyncAt !== undefined ? payload.lastSyncAt : current.lastSyncAt ?? null,
    }
    if (!next.lastUser || !next.lastFamily) return
    saveOfflineCache(next)
    offlineSnapshotRef.current = next
  }, [])

  const clearOfflineSnapshot = useCallback(() => {
    clearOfflineCache()
    offlineSnapshotRef.current = null
  }, [])

  const updateState = useCallback((updater: (prev: StorageState) => StorageState) => {
    setState((prev) => {
      const next = updater(prev)
      saveState(next)
      return next
    })
  }, [setState])

  const updateTodoLists = useCallback((updater: (prev: TodoList[]) => TodoList[]) => {
    updateState((prev) => ({
      ...prev,
      todoLists: updater(prev.todoLists),
    }))
  }, [updateState])

  return {
    state,
    stateRef,
    updateState,
    updateTodoLists,
    theme,
    themeMode,

    isOffline,
    setIsOffline,
    isOfflineRef,
    offlineSnapshotRef,
    persistOfflineSnapshot,
    clearOfflineSnapshot,

    authSession,
    setAuthSession,
    authUser,
    setAuthUser,
    familyId,
    setFamilyId,
    family,
    setFamily,

    isBootstrapping,
    setBootstrapping,
    dataSyncStatus,
    setDataSyncStatus,
    isSyncInFlight,
    setSyncInFlight,
    isManualRetrying,
    setManualRetrying,
    syncErrorMessage,
    setSyncErrorMessage,
    isDataStale,
    setDataStale,
    lastSyncAt,
    setLastSyncAt,
    expensesTotal,
    setExpensesTotal,
    expensesOffset,
    setExpensesOffset,
    isExpensesLoadingMore,
    setExpensesLoadingMore,
    isExpensesRefreshing,
    setExpensesRefreshing,
    isTodoRefreshing,
    setTodoRefreshing,
    isOfflineSyncNoticeOpen,
    setOfflineSyncNoticeOpen,
  }
}

export type AppControllerState = ReturnType<typeof useAppControllerState>
