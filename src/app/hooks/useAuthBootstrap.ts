import { useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { AuthSession, AuthUser } from '../../features/auth/api/auth'
import { getSession, onAuthStateChange } from '../../features/auth/api/auth'
import type { Family } from '../../features/family/api/families'
import { getCurrentFamily } from '../../features/family/api/families'
import { clearCacheMeta } from '../../shared/storage/cacheMeta'
import type { OfflineCache } from '../../shared/storage/offlineCache'
import { toOfflineAuthUser, toOfflineFamily, toOfflineSession } from '../offline/adapters'
import { ROUTES } from '../routing/routes'
import { INITIAL_SYNC_TIMEOUT_MS } from '../sync/constants'
import type { DataSyncSetters } from '../sync/contracts'
import { logDataSync } from '../sync/logging'
import { isNetworkLikeError, withTimeout } from '../sync/network'
import type { DataSyncStatus } from '../sync/types'
import type { AuthFamilySetters } from './contracts'

type UseAuthBootstrapParams = {
  navigate: NavigateFunction
  isOfflineRef: MutableRefObject<boolean>
  offlineSnapshotRef: MutableRefObject<OfflineCache | null>
  persistOfflineSnapshot: (payload: {
    lastUser?: AuthUser | null
    lastFamily?: Family | null
    lastSyncAt?: string | null
  }) => void
  onMenuClose: () => void
  onResetOfflineOutbox: () => void
  sessionSetters: AuthFamilySetters
  syncSetters: Pick<
    DataSyncSetters,
    | 'setDataStale'
    | 'setDataSyncStatus'
    | 'setSyncErrorMessage'
    | 'setLastSyncAt'
    | 'setOfflineSyncNoticeOpen'
  >
  setBootstrapping: Dispatch<SetStateAction<boolean>>
}

export function useAuthBootstrap({
  navigate,
  isOfflineRef,
  offlineSnapshotRef,
  persistOfflineSnapshot,
  onMenuClose,
  onResetOfflineOutbox,
  sessionSetters,
  syncSetters,
  setBootstrapping,
}: UseAuthBootstrapParams) {
  const { setAuthSession, setAuthUser, setFamilyId, setFamily } = sessionSetters
  const {
    setDataStale,
    setDataSyncStatus,
    setSyncErrorMessage,
    setLastSyncAt,
    setOfflineSyncNoticeOpen,
  } = syncSetters
  const persistOfflineSnapshotRef = useRef(persistOfflineSnapshot)
  const onMenuCloseRef = useRef(onMenuClose)
  const onResetOfflineOutboxRef = useRef(onResetOfflineOutbox)

  useEffect(() => {
    persistOfflineSnapshotRef.current = persistOfflineSnapshot
  }, [persistOfflineSnapshot])

  useEffect(() => {
    onMenuCloseRef.current = onMenuClose
  }, [onMenuClose])

  useEffect(() => {
    onResetOfflineOutboxRef.current = onResetOfflineOutbox
  }, [onResetOfflineOutbox])

  useEffect(() => {
    let isActive = true

    const applySnapshot = async (session: AuthSession | null, user: AuthUser | null) => {
      if (!isActive) return
      const offline = isOfflineRef.current
      const cached = offlineSnapshotRef.current

      if (!session || !user) {
        if (offline && cached?.lastUser && cached?.lastFamily) {
          const offlineUser = toOfflineAuthUser(cached.lastUser)
          const offlineFamily = toOfflineFamily(cached.lastFamily, offlineUser.id)
          setAuthSession(toOfflineSession(offlineUser))
          setAuthUser(offlineUser)
          setFamily(offlineFamily)
          setFamilyId(offlineFamily.id)
          onMenuCloseRef.current()
          setDataStale(true)
          setDataSyncStatus('offline')
          setSyncErrorMessage(null)
          setLastSyncAt(cached.lastSyncAt ?? null)
          return
        }

        setAuthSession(session)
        setAuthUser(user)
        setFamilyId(null)
        setFamily(null)
        onMenuCloseRef.current()
        navigate(ROUTES.home, { replace: true })
        setDataStale(false)
        if (offline) {
          setDataSyncStatus('offline')
          setSyncErrorMessage('Не удалось установить соединение, попробуйте позже.')
        } else {
          setDataSyncStatus('loading')
          setSyncErrorMessage(null)
        }
        setLastSyncAt(null)
        clearCacheMeta()
        onResetOfflineOutboxRef.current()
        setOfflineSyncNoticeOpen(false)
        return
      }

      setAuthSession(session)
      setAuthUser(user)
      setSyncErrorMessage(null)

      if (offline) {
        const cachedFamily = cached?.lastFamily ? toOfflineFamily(cached.lastFamily, user.id) : null
        setFamily(cachedFamily)
        setFamilyId(cachedFamily?.id ?? null)
        setDataSyncStatus('offline')
        if (cachedFamily) {
          persistOfflineSnapshotRef.current({ lastUser: user, lastFamily: cachedFamily })
        }
        return
      }

      let currentFamily: Family | null = null
      try {
        currentFamily = await getCurrentFamily({ timeoutMs: INITIAL_SYNC_TIMEOUT_MS })
      } catch (error) {
        if (!isActive) return
        const cachedFamily = cached?.lastFamily ? toOfflineFamily(cached.lastFamily, user.id) : null
        setFamily(cachedFamily)
        setFamilyId(cachedFamily?.id ?? null)
        setDataStale(true)
        const status: DataSyncStatus = isNetworkLikeError(error) ? 'offline' : 'error'
        setDataSyncStatus(status)
        setSyncErrorMessage(status === 'error' ? 'Не удалось загрузить данные семьи.' : null)
        logDataSync('family_load_failed', {
          status,
          hasCachedFamily: Boolean(cachedFamily),
        })
        return
      }

      if (!isActive) return
      setFamily(currentFamily)
      setFamilyId(currentFamily?.id ?? null)
      setDataSyncStatus('loading')
      if (currentFamily) {
        persistOfflineSnapshotRef.current({ lastUser: user, lastFamily: currentFamily })
      }
    }

    const bootstrap = async () => {
      try {
        const snapshot = await withTimeout(getSession(), INITIAL_SYNC_TIMEOUT_MS)
        await applySnapshot(snapshot.session, snapshot.user)
      } catch (error) {
        if (!isActive) return
        const cached = offlineSnapshotRef.current
        const status: DataSyncStatus = isNetworkLikeError(error) ? 'offline' : 'error'
        if (cached?.lastUser && cached?.lastFamily) {
          const offlineUser = toOfflineAuthUser(cached.lastUser)
          const offlineFamily = toOfflineFamily(cached.lastFamily, offlineUser.id)
          setAuthSession(toOfflineSession(offlineUser))
          setAuthUser(offlineUser)
          setFamily(offlineFamily)
          setFamilyId(offlineFamily.id)
          setDataStale(true)
          setDataSyncStatus(status)
          setLastSyncAt(cached.lastSyncAt ?? null)
        } else {
          setDataSyncStatus(status)
          if (status === 'offline') {
            setSyncErrorMessage('Не удалось установить соединение, попробуйте позже.')
          }
        }
        logDataSync('bootstrap_failed', {
          status,
          hasOfflineSnapshot: Boolean(cached?.lastUser && cached?.lastFamily),
        })
      } finally {
        if (isActive) {
          setBootstrapping(false)
        }
      }
    }

    void bootstrap()
    const unsubscribe = onAuthStateChange((_event, session, user) => {
      void applySnapshot(session, user)
    })

    return () => {
      isActive = false
      unsubscribe()
    }
    // This bootstrap effect should run once and keep internal callback refs up to date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])
}
