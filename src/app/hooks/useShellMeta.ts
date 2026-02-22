import { useMemo } from 'react'
import type { AuthSession, AuthUser } from '../../features/auth/api/auth'
import type { Family } from '../../features/family/api/families'
import type { TabId } from '../routing/routes'

type AppId = 'home' | 'expenses' | 'todo' | 'workouts'

const TABS: Array<{
  id: TabId
  label: string
  title: string
  subtitle: string
}> = [
  {
    id: 'expenses',
    label: 'Список',
    title: 'Расходы',
    subtitle: 'Ежедневные записи и теги.',
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    title: 'Аналитика',
    subtitle: 'Фильтры, диаграммы и разрезы.',
  },
  {
    id: 'reports',
    label: 'Отчеты',
    title: 'Отчеты',
    subtitle: 'Сравнение месячных итогов.',
  },
]

type UseShellMetaParams = {
  activeApp: AppId
  activeTab: TabId
  lastSyncAt: string | null
  isReadOnly: boolean
  isSyncInFlight: boolean
  isExpensesRefreshing: boolean
  isTodoRefreshing: boolean
  themeMode: 'light' | 'dark'
  family: Family | null
  authUser: AuthUser | null
  authSession: AuthSession | null
  familyId: string | null
}

export function useShellMeta({
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
}: UseShellMetaParams) {
  const active = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) ?? TABS[0],
    [activeTab],
  )

  const headerTitle =
    activeApp === 'expenses'
      ? active.title
      : activeApp === 'todo'
        ? 'To Do листы'
        : activeApp === 'workouts'
          ? 'Тренировки'
          : 'Миниаппы'

  const formattedLastSyncAt = useMemo(() => {
    if (!lastSyncAt) return null
    try {
      const syncedAt = new Date(lastSyncAt)
      if (Number.isNaN(syncedAt.getTime())) return null

      const now = new Date()
      const isToday =
        syncedAt.getFullYear() === now.getFullYear() &&
        syncedAt.getMonth() === now.getMonth() &&
        syncedAt.getDate() === now.getDate()

      if (isToday) {
        return syncedAt.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })
      }

      return syncedAt
        .toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
        .replace(' в ', ', ')
    } catch {
      return null
    }
  }, [lastSyncAt])

  const canRefreshTodo = activeApp === 'todo'
  const canRefreshExpenses = activeApp === 'expenses' && activeTab === 'expenses'
  const canRefresh = !isReadOnly && (canRefreshTodo || canRefreshExpenses)
  const isRefreshing = canRefreshTodo
    ? isTodoRefreshing
    : canRefreshExpenses
      ? isExpensesRefreshing
      : false

  const themeLabel = themeMode === 'dark' ? 'Светлая тема' : 'Тёмная тема'
  const isOwner = family?.ownerId === authUser?.id
  const isBackgroundSyncVisible = isSyncInFlight || isExpensesRefreshing || isTodoRefreshing
  const canRetrySync = Boolean(authSession && familyId)

  return {
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
  }
}
