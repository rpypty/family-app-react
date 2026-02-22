import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import type { FamilyMember } from '../../../features/family/api/families'
import type { Expense, Tag } from '../../../shared/types'
import type { TabId } from '../../routing/routes'

type UseAppShellActionsParams = {
  refresh: {
    canRefreshTodo: boolean
    canRefreshExpenses: boolean
    handleRefreshTodoLists: () => Promise<void>
    handleRefreshExpenses: () => Promise<void>
    performManualRefresh: () => Promise<void>
    setOfflineSyncNoticeOpen: Dispatch<SetStateAction<boolean>>
  }
  navigation: {
    handleBackNavigation: () => void
    navigateExpenseTab: (tab: TabId) => void
    navigateTodo: () => void
    navigateWorkouts: () => void
  }
  family: {
    handleMenuOpen: (event: MouseEvent<HTMLElement>) => void
    handleMenuClose: () => void
    handleOpenFamilyDialog: () => void
    handleCopyFamilyCode: (event?: MouseEvent<HTMLElement>) => Promise<void>
    toggleTheme: () => void
    handleLeaveFamily: () => Promise<void>
    handleSignOut: () => Promise<void>
    handleCloseFamilyDialog: () => void
    handleRemoveMember: (member: FamilyMember) => Promise<void>
  }
  todo: {
    handleCreateTodoList: (title: string) => Promise<void>
    handleDeleteTodoList: (listId: string) => Promise<void>
    handleUpdateTodoListArchiveSetting: (
      listId: string,
      archiveCompleted: boolean,
    ) => Promise<void>
    handleToggleTodoListCollapsed: (listId: string, isCollapsed: boolean) => Promise<void>
    handleMoveTodoList: (listId: string, direction: 'up' | 'down') => Promise<void>
    handleCreateTodoItem: (listId: string, title: string) => Promise<void>
    handleToggleTodoItem: (
      listId: string,
      itemId: string,
      isCompleted: boolean,
    ) => Promise<void>
    handleUpdateTodoItemTitle: (
      listId: string,
      itemId: string,
      title: string,
    ) => Promise<void>
    handleDeleteTodoItem: (listId: string, itemId: string) => Promise<void>
  }
  expense: {
    handleLoadMoreExpenses: () => Promise<void>
    handleCreateExpense: (expense: Expense) => Promise<void>
    handleUpdateExpense: (expense: Expense) => Promise<void>
    handleDeleteExpense: (expenseId: string) => Promise<void>
    handleCreateTag: (name: string) => Promise<Tag>
    handleUpdateTag: (tagId: string, name: string) => Promise<Tag>
    handleDeleteTag: (tagId: string) => Promise<void>
  }
}

export function useAppShellActions({
  refresh: {
    canRefreshTodo,
    canRefreshExpenses,
    handleRefreshTodoLists,
    handleRefreshExpenses,
    performManualRefresh,
    setOfflineSyncNoticeOpen,
  },
  navigation: {
    handleBackNavigation,
    navigateExpenseTab,
    navigateTodo,
    navigateWorkouts,
  },
  family: {
    handleMenuOpen,
    handleMenuClose,
    handleOpenFamilyDialog,
    handleCopyFamilyCode,
    toggleTheme,
    handleLeaveFamily,
    handleSignOut,
    handleCloseFamilyDialog,
    handleRemoveMember,
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
}: UseAppShellActionsParams) {
  const handleManualRetry = async () => {
    await performManualRefresh()
  }

  const handleRefreshActiveScreen = () => {
    if (canRefreshTodo) {
      void handleRefreshTodoLists()
      return
    }
    if (canRefreshExpenses) {
      void handleRefreshExpenses()
    }
  }

  return {
    onBackNavigation: handleBackNavigation,
    onMenuOpen: handleMenuOpen,
    onMenuClose: handleMenuClose,
    onOpenFamilyDialog: handleOpenFamilyDialog,
    onCopyFamilyCode: handleCopyFamilyCode,
    onToggleTheme: toggleTheme,
    onLeaveFamily: handleLeaveFamily,
    onSignOut: handleSignOut,
    onCloseFamilyDialog: handleCloseFamilyDialog,
    onRemoveMember: handleRemoveMember,
    onManualRetry: handleManualRetry,
    onRefreshActiveScreen: handleRefreshActiveScreen,
    onOpenExpenses: () => navigateExpenseTab('expenses'),
    onOpenTodo: navigateTodo,
    onOpenWorkouts: navigateWorkouts,
    onCreateTodoList: handleCreateTodoList,
    onDeleteTodoList: handleDeleteTodoList,
    onToggleTodoListArchiveSetting: handleUpdateTodoListArchiveSetting,
    onToggleTodoListCollapsed: handleToggleTodoListCollapsed,
    onMoveTodoList: handleMoveTodoList,
    onCreateTodoItem: handleCreateTodoItem,
    onToggleTodoItem: handleToggleTodoItem,
    onUpdateTodoItemTitle: handleUpdateTodoItemTitle,
    onDeleteTodoItem: handleDeleteTodoItem,
    onLoadMoreExpenses: handleLoadMoreExpenses,
    onCreateExpense: handleCreateExpense,
    onUpdateExpense: handleUpdateExpense,
    onDeleteExpense: handleDeleteExpense,
    onCreateTag: handleCreateTag,
    onUpdateTag: handleUpdateTag,
    onDeleteTag: handleDeleteTag,
    onNavigateExpenseTab: navigateExpenseTab,
    onCloseOfflineSyncNotice: () => setOfflineSyncNoticeOpen(false),
  }
}
