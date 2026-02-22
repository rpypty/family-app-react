import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { AuthSession, AuthUser } from '../../features/auth/api/auth'
import { signInWithGoogle } from '../../features/auth/api/auth'
import type { Family } from '../../features/family/api/families'
import type { SyncOperation } from '../../features/sync/api/sync'
import type { OfflineOutboxOperation } from '../../features/sync/model/offlineOutbox'
import type { StorageState, TodoList } from '../../shared/types'
import type { OfflineCache } from '../../shared/storage/offlineCache'
import { useFamilyUiActions } from '../components/hooks/useFamilyUiActions'
import { useAppShellActions } from '../components/hooks/useAppShellActions'
import type { AuthFamilySetters } from './contracts'
import { useAppSessionReset } from './useAppSessionReset'
import { useAuthBootstrap } from './useAuthBootstrap'
import { useExpenseActions } from '../../features/miniapps/expense/hooks/useExpenseActions'
import { useTodoActions } from '../../features/miniapps/todo/hooks/useTodoActions'
import type { DataSyncSetters } from '../sync/contracts'
import type { TabId } from '../routing/routes'

type UseAppControllerActionsParams = {
  state: {
    state: StorageState
    stateRef: MutableRefObject<StorageState>
    authSession: AuthSession | null
    authUser: AuthUser | null
    familyId: string | null
    family: Family | null
    isReadOnly: boolean
    isOfflineLike: boolean
    isExpensesLoadingMore: boolean
    isExpensesRefreshing: boolean
    expensesTotal: number
    expensesOffset: number
    isTodoRefreshing: boolean
  }
  mutators: {
    updateState: (updater: (prev: StorageState) => StorageState) => void
    updateTodoLists: (updater: (prev: TodoList[]) => TodoList[]) => void
    setExpensesRefreshing: Dispatch<SetStateAction<boolean>>
    setTodoRefreshing: Dispatch<SetStateAction<boolean>>
  }
  navigation: {
    navigate: NavigateFunction
    navigateHome: (replace?: boolean) => void
    navigateExpenseTab: (tab: TabId) => void
    navigateTodo: () => void
    navigateWorkouts: () => void
    handleBackNavigation: () => void
  }
  bootstrap: {
    persistOfflineSnapshot: (payload: {
      lastUser?: AuthUser | null
      lastFamily?: Family | null
      lastSyncAt?: string | null
    }) => void
    clearOfflineSnapshot: () => void
    isOfflineRef: MutableRefObject<boolean>
    offlineSnapshotRef: MutableRefObject<OfflineCache | null>
    setBootstrapping: Dispatch<SetStateAction<boolean>>
  }
  sync: {
    enqueueOfflineOperation: (operation: SyncOperation) => void
    getOutboxOperationsForFamily: () => OfflineOutboxOperation[]
    performManualRefresh: () => Promise<void>
    resetOfflineOutboxStorage: () => void
    resetSyncInFlight: () => void
  }
  shellMeta: {
    canRefreshTodo: boolean
    canRefreshExpenses: boolean
  }
  setters: {
    sessionSetters: AuthFamilySetters
    syncSetters: DataSyncSetters
  }
}

export function useAppControllerActions({
  state: {
    state,
    stateRef,
    authSession,
    authUser,
    familyId,
    family,
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
    sessionSetters,
    syncSetters,
  },
}: UseAppControllerActionsParams) {
  const guardReadOnly = () => {
    if (!isReadOnly) return false
    syncSetters.setDataStale(true)
    return true
  }

  const toggleTheme = () => {
    updateState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        themeMode: prev.settings.themeMode === 'dark' ? 'light' : 'dark',
      },
    }))
  }

  const handleSignIn = async () => {
    await signInWithGoogle()
  }

  const {
    handleFamilyComplete,
    handleSignedOutStateReset,
    handleFamilyLeftStateReset,
  } = useAppSessionReset({
    authUser,
    navigateHome,
    persistOfflineSnapshot,
    clearOfflineSnapshot,
    updateState,
    resetSyncInFlight,
    resetOfflineOutboxStorage,
    sessionSetters,
    syncSetters,
  })

  const familyUi = useFamilyUiActions({
    state: {
      authUser,
      family,
      familyId,
      isReadOnly,
    },
    mutators: {
      guardReadOnly,
    },
    callbacks: {
      onSignedOut: handleSignedOutStateReset,
      onFamilyLeft: handleFamilyLeftStateReset,
    },
  })

  useAuthBootstrap({
    navigate,
    isOfflineRef,
    offlineSnapshotRef,
    persistOfflineSnapshot,
    onMenuClose: familyUi.handleMenuClose,
    onResetOfflineOutbox: resetOfflineOutboxStorage,
    sessionSetters,
    syncSetters,
    setBootstrapping,
  })

  const {
    handleCreateExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleLoadMoreExpenses,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
    handleRefreshExpenses,
  } = useExpenseActions({
    state: {
      state,
      stateRef,
      authSession,
      familyId,
      isOfflineLike,
      isExpensesLoadingMore,
      isExpensesRefreshing,
      expensesTotal,
      expensesOffset,
    },
    mutators: {
      guardReadOnly,
      updateState,
      setDataSyncStatus: syncSetters.setDataSyncStatus,
      setDataStale: syncSetters.setDataStale,
      setExpensesTotal: syncSetters.setExpensesTotal,
      setExpensesOffset: syncSetters.setExpensesOffset,
      setExpensesLoadingMore: syncSetters.setExpensesLoadingMore,
      setExpensesRefreshing,
    },
    sync: {
      getOutboxOperationsForFamily,
      enqueueOfflineOperation,
      onManualRefresh: performManualRefresh,
    },
  })

  const {
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
  } = useTodoActions({
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
      setDataSyncStatus: syncSetters.setDataSyncStatus,
      setDataStale: syncSetters.setDataStale,
      setTodoRefreshing,
    },
    sync: {
      enqueueOfflineOperation,
      onManualRefresh: performManualRefresh,
    },
  })

  const shellActions = useAppShellActions({
    refresh: {
      canRefreshTodo,
      canRefreshExpenses,
      handleRefreshTodoLists,
      handleRefreshExpenses,
      performManualRefresh,
      setOfflineSyncNoticeOpen: syncSetters.setOfflineSyncNoticeOpen,
    },
    navigation: {
      handleBackNavigation,
      navigateExpenseTab,
      navigateTodo,
      navigateWorkouts,
    },
    family: {
      handleMenuOpen: familyUi.handleMenuOpen,
      handleMenuClose: familyUi.handleMenuClose,
      handleOpenFamilyDialog: familyUi.handleOpenFamilyDialog,
      handleCopyFamilyCode: familyUi.handleCopyFamilyCode,
      toggleTheme,
      handleLeaveFamily: familyUi.handleLeaveFamily,
      handleSignOut: familyUi.handleSignOut,
      handleCloseFamilyDialog: familyUi.handleCloseFamilyDialog,
      handleRemoveMember: familyUi.handleRemoveMember,
    },
    todo: {
      handleCreateTodoList,
      handleDeleteTodoList,
      handleUpdateTodoListArchiveSetting,
      handleToggleTodoListCollapsed,
      handleMoveTodoList,
      handleCreateTodoItem,
      handleToggleTodoItem,
      handleUpdateTodoItemTitle,
      handleDeleteTodoItem,
    },
    expense: {
      handleLoadMoreExpenses,
      handleCreateExpense,
      handleUpdateExpense,
      handleDeleteExpense,
      handleCreateTag,
      handleUpdateTag,
      handleDeleteTag,
    },
  })

  return {
    handleSignIn,
    handleFamilyComplete,
    familyUi,
    shellActions,
  }
}

export type AppControllerActionsResult = ReturnType<typeof useAppControllerActions>
