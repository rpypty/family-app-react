import { useAppNavigation } from './useAppNavigation'
import { useDataSync } from './useDataSync'
import { useAppControllerActions } from './useAppControllerActions'
import { useAppControllerState } from './useAppControllerState'
import { useShellMeta } from './useShellMeta'
import type { AuthFamilySetters } from './contracts'
import type { DataSyncSetters } from '../sync/contracts'

export type { DataSyncStatus } from '../sync/types'

export function useAppController() {
  const {
    state,
    stateRef,
    updateState,
    updateTodoLists,
    theme,
    themeMode,
    isOffline,
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
  } = useAppControllerState()
  const {
    navigate,
    activeApp,
    activeTab,
    navigateHome,
    navigateExpenseTab,
    navigateTodo,
    navigateWorkouts,
    handleBackNavigation,
  } = useAppNavigation()
  const isReadOnly = isOffline || dataSyncStatus === 'offline'
  const isOfflineLike = isOffline || dataSyncStatus === 'offline'
  const hasResolvedAppContext = Boolean(authSession && authUser && familyId)

  const authFamilySetters: AuthFamilySetters = {
    setAuthSession,
    setAuthUser,
    setFamilyId,
    setFamily,
  }

  const dataSyncSetters: DataSyncSetters = {
    setDataSyncStatus,
    setSyncInFlight,
    setManualRetrying,
    setSyncErrorMessage,
    setDataStale,
    setLastSyncAt,
    setExpensesTotal,
    setExpensesOffset,
    setExpensesLoadingMore,
    setOfflineSyncNoticeOpen,
  }

  const {
    enqueueOfflineOperation,
    getOutboxOperationsForFamily,
    performManualRefresh,
    resetOfflineOutboxStorage,
    resetSyncInFlight,
  } = useDataSync({
    familyId,
    authSession,
    dataSyncStatus,
    isOffline,
    isOfflineRef,
    stateRef,
    updateState,
    persistOfflineSnapshot,
    setters: dataSyncSetters,
    offlineSnapshotRef,
  })

  const {
    headerTitle,
    formattedLastSyncAt,
    canRefreshTodo,
    canRefreshExpenses,
    canRefresh,
    isRefreshing,
    themeLabel,
    isOwner,
    isBackgroundSyncVisible,
    canRetrySync,
  } = useShellMeta({
    activeApp,
    activeTab,
    lastSyncAt,
    isReadOnly,
    isSyncInFlight,
    isExpensesRefreshing,
    isTodoRefreshing,
    themeMode,
    family,
    authUser,
    authSession,
    familyId,
  })

  const {
    handleSignIn,
    handleFamilyComplete,
    familyUi,
    shellActions,
  } = useAppControllerActions({
    state: {
      state,
      stateRef,
      authSession,
      authUser,
      family,
      familyId,
      isReadOnly,
      isOfflineLike,
      isExpensesLoadingMore,
      isExpensesRefreshing,
      expensesTotal,
      expensesOffset,
      isTodoRefreshing,
    },
    mutators: {
      updateState,
      updateTodoLists,
      setExpensesRefreshing,
      setTodoRefreshing,
    },
    navigation: {
      navigate,
      navigateHome,
      navigateExpenseTab,
      navigateTodo,
      navigateWorkouts,
      handleBackNavigation,
    },
    bootstrap: {
      persistOfflineSnapshot,
      clearOfflineSnapshot,
      isOfflineRef,
      offlineSnapshotRef,
      setBootstrapping,
    },
    sync: {
      enqueueOfflineOperation,
      getOutboxOperationsForFamily,
      performManualRefresh,
      resetOfflineOutboxStorage,
      resetSyncInFlight,
    },
    shellMeta: {
      canRefreshTodo,
      canRefreshExpenses,
    },
    setters: {
      sessionSetters: authFamilySetters,
      syncSetters: dataSyncSetters,
    },
  })

  return {
    theme,
    gate: {
      isBootstrapping,
      hasResolvedAppContext,
      authSession,
      authUser,
      isOffline,
      dataSyncStatus,
      familyId,
      onSignIn: handleSignIn,
      onFamilyComplete: handleFamilyComplete,
    },
    shell: {
      activeApp,
      activeTab,
      headerTitle,
      authUser,
      menuAnchorEl: familyUi.menuAnchorEl,
      family,
      isCopyingFamilyCode: familyUi.isCopyingFamilyCode,
      themeMode,
      themeLabel,
      isReadOnly,
      isBackgroundSyncVisible,
      dataSyncStatus,
      isFamilyDialogOpen: familyUi.isFamilyDialogOpen,
      familyMembersError: familyUi.familyMembersError,
      familyMembersLoading: familyUi.familyMembersLoading,
      familyMembers: familyUi.familyMembers,
      isOwner,
      removingMemberId: familyUi.removingMemberId,
      formattedLastSyncAt,
      isDataStale,
      syncErrorMessage,
      canRetrySync,
      isManualRetrying,
      state,
      expensesTotal,
      isExpensesLoadingMore,
      isOfflineLike,
      isOfflineSyncNoticeOpen,
      canRefresh,
      isRefreshing,
      ...shellActions,
    },
  }
}

export type AppControllerResult = ReturnType<typeof useAppController>
export type AppGateModel = AppControllerResult['gate']
export type AppShellModel = AppControllerResult['shell']
