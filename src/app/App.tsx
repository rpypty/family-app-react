import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles'
import ListAltRounded from '@mui/icons-material/ListAltRounded'
import PieChartRounded from '@mui/icons-material/PieChartRounded'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded'
import GroupRounded from '@mui/icons-material/GroupRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import type { StorageState, Expense, Tag, TodoItem, TodoList } from '../shared/types'
import { loadState, saveState } from '../shared/storage/storage'
import type { AuthSession, AuthUser } from '../features/auth/api/auth'
import {
  getSession,
  onAuthStateChange,
  signInWithGoogle,
  signOut,
  isSupabaseConfigured,
} from '../features/auth/api/auth'
import type { Family, FamilyMember } from '../features/family/api/families'
import {
  getCurrentFamily,
  leaveFamily,
  listFamilyMembers,
  removeFamilyMember,
} from '../features/family/api/families'
import {
  listExpensePage,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../features/miniapps/expense/expenses/api/expenses'
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
} from '../features/miniapps/expense/expenses/api/tags'
import { findTagByName } from '../shared/lib/tagUtils'
import { copyToClipboard } from '../shared/lib/clipboard'
import { clearCacheMeta, loadCacheMeta, saveCacheMeta } from '../shared/storage/cacheMeta'
import {
  clearOfflineCache,
  loadOfflineCache,
  saveOfflineCache,
} from '../shared/storage/offlineCache'
import {
  listTodoLists,
  createTodoList,
  updateTodoList,
  deleteTodoList,
  createTodoItem,
  updateTodoItem,
  deleteTodoItem,
} from '../features/miniapps/todo/api/todos'
import { ExpensesScreen } from '../features/miniapps/expense/expenses/screens/ExpensesScreen'
import { AnalyticsScreen } from '../features/miniapps/expense/analytics/screens/AnalyticsScreen'
import { ReportsScreen } from '../features/miniapps/expense/reports/screens/ReportsScreen'
import { AuthScreen } from '../features/auth/screens/AuthScreen'
import { FamilyScreen } from '../features/family/screens/FamilyScreen'
import { AppLoadingScreen } from '../features/onboarding/screens/AppLoadingScreen'
import { OfflineBlockedScreen } from '../features/onboarding/screens/OfflineBlockedScreen'
import { MiniAppsScreen } from '../features/home/screens/MiniAppsScreen'
import { TodoScreen } from '../features/miniapps/todo/screens/TodoScreen'
import { WorkoutsScreen } from '../features/miniapps/workouts/screens/WorkoutsScreen'
import { ApiTimeoutError, isApiError, isApiTimeoutError } from '../shared/api/client'
import { createId } from '../shared/lib/uuid'
import {
  syncOfflineBatch,
  type SyncEntityMapping,
  type SyncOperation,
  type SyncOperationResult,
} from '../features/sync/api/sync'
import {
  applyTodoMappingsToOperations,
  clearOfflineOutbox,
  createOperationId,
  loadOfflineOutbox,
  resolvePendingCreateIds,
  resolvePendingTodoItemIds,
  saveOfflineOutbox,
  upsertTodoToggleOperation,
  type OfflineOutboxOperation,
} from '../features/sync/model/offlineOutbox'

type TabId = 'expenses' | 'analytics' | 'reports'
type AppId = 'home' | 'expenses' | 'todo' | 'gym' | 'workouts'

const ROUTES = {
  home: '/',
  expenses: '/miniapps/expenses',
  expenseAnalytics: '/miniapps/expenses/analytics',
  expenseReports: '/miniapps/expenses/reports',
  todo: '/miniapps/todo',
  gym: '/miniapps/gym',
  workouts: '/miniapps/workouts',
} as const

const EXPENSE_TAB_ROUTES: Record<TabId, string> = {
  expenses: ROUTES.expenses,
  analytics: ROUTES.expenseAnalytics,
  reports: ROUTES.expenseReports,
}

const toOfflineAuthUser = (cachedUser: {
  id: string
  name: string
  email: string
  provider?: string
  createdAt?: string
  avatarUrl?: string
}): AuthUser => ({
  id: cachedUser.id,
  name: cachedUser.name,
  email: cachedUser.email,
  provider: 'google',
  createdAt: cachedUser.createdAt ?? new Date().toISOString(),
  avatarUrl: cachedUser.avatarUrl,
})

const toOfflineFamily = (
  cachedFamily: { id: string; name: string; code?: string; ownerId?: string; createdAt?: string },
  fallbackOwnerId?: string,
): Family => ({
  id: cachedFamily.id,
  name: cachedFamily.name,
  code: cachedFamily.code ?? '',
  ownerId: cachedFamily.ownerId ?? fallbackOwnerId ?? '',
  createdAt: cachedFamily.createdAt ?? new Date().toISOString(),
})

const toOfflineSession = (user: AuthUser): AuthSession => ({
  id: `offline-${user.id}`,
  userId: user.id,
  provider: user.provider,
  createdAt: user.createdAt,
})

const isNetworkLikeError = (error: unknown): boolean => {
  if (isApiTimeoutError(error)) return true
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (error instanceof TypeError) return true
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof error.name === 'string' &&
    error.name === 'AbortError'
  ) {
    return true
  }
  return false
}

const logDataSync = (
  event: string,
  payload: Record<string, string | number | boolean | null | undefined>,
) => {
  const detail = {
    event,
    at: new Date().toISOString(),
    ...payload,
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('family-app:data-sync', {
        detail,
      }),
    )
  }

  console.info('[data-sync]', detail)
}

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new ApiTimeoutError(timeoutMs))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

type ResolvedRoute = {
  activeApp: AppId
  activeTab: TabId
  redirectTo?: string
}

const normalizePathname = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed.length === 0 ? '/' : trimmed
}

const resolveAppRoute = (pathname: string): ResolvedRoute => {
  const normalized = normalizePathname(pathname)
  const segments = normalized.split('/').filter(Boolean)

  if (segments.length === 0) {
    return { activeApp: 'home', activeTab: 'expenses' }
  }

  if (segments[0] !== 'miniapps') {
    return { activeApp: 'home', activeTab: 'expenses', redirectTo: ROUTES.home }
  }

  if (segments.length === 1) {
    return { activeApp: 'home', activeTab: 'expenses', redirectTo: ROUTES.home }
  }

  const app = segments[1]

  if (app === 'expenses') {
    const section = segments[2]
    if (!section) {
      return { activeApp: 'expenses', activeTab: 'expenses' }
    }
    if (section === 'analytics') {
      return { activeApp: 'expenses', activeTab: 'analytics' }
    }
    if (section === 'reports') {
      return { activeApp: 'expenses', activeTab: 'reports' }
    }
    return {
      activeApp: 'expenses',
      activeTab: 'expenses',
      redirectTo: ROUTES.expenses,
    }
  }

  if (app === 'todo') {
    if (segments.length > 2) {
      return { activeApp: 'todo', activeTab: 'expenses', redirectTo: ROUTES.todo }
    }
    return { activeApp: 'todo', activeTab: 'expenses' }
  }

  if (app === 'gym') {
    return { activeApp: 'gym', activeTab: 'expenses' }
  }

  if (app === 'workouts') {
    return { activeApp: 'workouts', activeTab: 'expenses' }
  }

  return { activeApp: 'home', activeTab: 'expenses', redirectTo: ROUTES.home }
}

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

const EXPENSES_PAGE_SIZE = 30
const INITIAL_SYNC_TIMEOUT_MS = 5_000
const AUTO_RETRY_INTERVAL_MS = 20_000
const MANUAL_RETRY_TIMEOUT_MS = 15_000

const sortExpensesByDateDesc = (expenses: Expense[]) =>
  [...expenses].sort((left, right) => {
    if (left.date === right.date) return 0
    return left.date < right.date ? 1 : -1
  })

const applySyncEntityMappingsToState = (
  state: StorageState,
  mappings: SyncEntityMapping[],
): StorageState => {
  if (mappings.length === 0) return state

  const expenseMappings = new Map<string, string>()
  const todoMappings = new Map<string, string>()

  mappings.forEach((mapping) => {
    if (mapping.entity === 'expense') {
      expenseMappings.set(mapping.local_id, mapping.server_id)
      return
    }
    if (mapping.entity === 'todo_item') {
      todoMappings.set(mapping.local_id, mapping.server_id)
    }
  })

  if (expenseMappings.size === 0 && todoMappings.size === 0) {
    return state
  }

  const expenses = expenseMappings.size > 0
    ? state.expenses.map((expense) => ({
        ...expense,
        id: expenseMappings.get(expense.id) ?? expense.id,
      }))
    : state.expenses

  const todoLists = todoMappings.size > 0
    ? state.todoLists.map((list) => ({
        ...list,
        items: list.items.map((item) => ({
          ...item,
          id: todoMappings.get(item.id) ?? item.id,
        })),
      }))
    : state.todoLists

  return {
    ...state,
    expenses,
    todoLists,
  }
}

const applyPendingSyncState = (
  state: StorageState,
  operations: OfflineOutboxOperation[],
): StorageState => {
  const pendingCreateIds = resolvePendingCreateIds(operations)
  const pendingTodoItemIds = resolvePendingTodoItemIds(operations)

  const expenses = state.expenses.map((expense) => {
    if (pendingCreateIds.expenseIds.has(expense.id)) {
      if (expense.syncState === 'pending') return expense
      return {
        ...expense,
        syncState: 'pending' as const,
      }
    }
    if (expense.syncState !== undefined) {
      const { syncState, ...rest } = expense
      void syncState
      return rest
    }
    return expense
  })

  const todoLists = state.todoLists.map((list) => ({
    ...list,
    items: list.items.map((item) => {
      if (pendingTodoItemIds.has(item.id)) {
        if (item.syncState === 'pending') return item
        return {
          ...item,
          syncState: 'pending' as const,
        }
      }
      if (item.syncState !== undefined) {
        const { syncState, ...rest } = item
        void syncState
        return rest
      }
      return item
    }),
  }))

  return {
    ...state,
    expenses,
    todoLists,
  }
}

const mergeFetchedStateWithPendingCreates = (
  fetchedState: Pick<StorageState, 'expenses' | 'tags' | 'todoLists'>,
  previousState: StorageState,
  operations: OfflineOutboxOperation[],
): Pick<StorageState, 'expenses' | 'tags' | 'todoLists'> => {
  const pendingCreateIds = resolvePendingCreateIds(operations)
  if (pendingCreateIds.expenseIds.size === 0 && pendingCreateIds.todoIds.size === 0) {
    return fetchedState
  }

  const pendingExpenses = previousState.expenses.filter((expense) =>
    pendingCreateIds.expenseIds.has(expense.id),
  )
  const mergedExpenseIds = new Set(fetchedState.expenses.map((expense) => expense.id))
  const mergedExpenses = sortExpensesByDateDesc([
    ...pendingExpenses.filter((expense) => !mergedExpenseIds.has(expense.id)),
    ...fetchedState.expenses,
  ])

  const pendingTodoByList = new Map<string, TodoItem[]>()
  previousState.todoLists.forEach((list) => {
    const pendingItems = list.items.filter((item) => pendingCreateIds.todoIds.has(item.id))
    if (pendingItems.length > 0) {
      pendingTodoByList.set(list.id, pendingItems)
    }
  })

  const mergedTodoLists = fetchedState.todoLists.map((list) => {
    const pendingItems = pendingTodoByList.get(list.id)
    if (!pendingItems || pendingItems.length === 0) {
      return list
    }
    const existingIds = new Set(list.items.map((item) => item.id))
    return {
      ...list,
      items: [
        ...pendingItems.filter((item) => !existingIds.has(item.id)),
        ...list.items,
      ],
    }
  })

  const fetchedListIds = new Set(fetchedState.todoLists.map((list) => list.id))
  const pendingOnlyLists = previousState.todoLists
    .filter((list) => !fetchedListIds.has(list.id))
    .map((list) => ({
      ...list,
      items: list.items.filter((item) => pendingCreateIds.todoIds.has(item.id)),
    }))
    .filter((list) => list.items.length > 0)

  return {
    expenses: mergedExpenses,
    tags: fetchedState.tags,
    todoLists: [...pendingOnlyLists, ...mergedTodoLists],
  }
}

type OfflineFlushResult = {
  syncedOperations: number
  remainingOperations: number
}

type DataSyncStatus = 'loading' | 'offline' | 'updated' | 'error'
type DataSyncTrigger = 'initial' | 'auto-retry' | 'manual'

function App() {
  const initialOfflineSnapshot = useRef(loadOfflineCache()).current
  const initialOfflineOutbox = useRef(loadOfflineOutbox()).current
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
  const [offlineSnapshot, setOfflineSnapshot] = useState(() => initialOfflineSnapshot)
  const offlineSnapshotRef = useRef(offlineSnapshot)
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
  const [isCopyingFamilyCode, setCopyingFamilyCode] = useState(false)
  const [isOfflineSyncNoticeOpen, setOfflineSyncNoticeOpen] = useState(false)
  const [isFamilyDialogOpen, setFamilyDialogOpen] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [familyMembersLoading, setFamilyMembersLoading] = useState(false)
  const [familyMembersError, setFamilyMembersError] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const syncInFlightRef = useRef(false)
  const offlineOutboxRef = useRef(initialOfflineOutbox)
  const stateRef = useRef(state)
  const location = useLocation()
  const navigate = useNavigate()
  const route = useMemo(() => resolveAppRoute(location.pathname), [location.pathname])
  const activeApp = route.activeApp
  const activeTab = route.activeTab
  const isReadOnly = isOffline || dataSyncStatus === 'offline'
  const isOfflineLike = isOffline || dataSyncStatus === 'offline'
  const hasResolvedAppContext = Boolean(authSession && authUser && familyId)

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

  useEffect(() => {
    if (route.redirectTo) {
      navigate(route.redirectTo, { replace: true })
    }
  }, [route.redirectTo, navigate])

  const currentPath = normalizePathname(location.pathname)
  const navigateHome = (replace = false) => {
    if (currentPath !== ROUTES.home || replace) {
      navigate(ROUTES.home, { replace })
    }
  }
  const navigateExpenseTab = (tab: TabId) => {
    const target = EXPENSE_TAB_ROUTES[tab]
    if (currentPath !== target) {
      navigate(target)
    }
  }
  const navigateTodo = () => {
    if (currentPath !== ROUTES.todo) {
      navigate(ROUTES.todo)
    }
  }
  const navigateWorkouts = () => {
    if (currentPath !== ROUTES.workouts) {
      navigate(ROUTES.workouts)
    }
  }

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
          setMenuAnchorEl(null)
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
        setMenuAnchorEl(null)
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
        offlineOutboxRef.current = { family_id: null, operations: [] }
        clearOfflineOutbox()
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
          persistOfflineSnapshot({ lastUser: user, lastFamily: cachedFamily })
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
        persistOfflineSnapshot({ lastUser: user, lastFamily: currentFamily })
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
    // Bootstrap should run once; persistOfflineSnapshot is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  useEffect(() => {
    let isActive = true
    const loadMembers = async () => {
      if (!isFamilyDialogOpen) return
      setFamilyMembersLoading(true)
      setFamilyMembersError(null)
      if (isReadOnly) {
        if (!isActive) return
        setFamilyMembers([])
        setFamilyMembersError('Нет соединения. Доступ только для просмотра.')
        setFamilyMembersLoading(false)
        return
      }
      try {
        const members = await listFamilyMembers()
        if (!isActive) return
        setFamilyMembers(members)
      } catch {
        if (!isActive) return
        setFamilyMembersError('Не удалось загрузить список участников.')
        setFamilyMembers([])
      } finally {
        if (isActive) setFamilyMembersLoading(false)
      }
    }

    void loadMembers()
    return () => {
      isActive = false
    }
  }, [isFamilyDialogOpen, isReadOnly])

  const theme = useMemo(() => {
    const primaryMain = state.settings.themeMode === 'dark' ? '#4db6ac' : '#1f6b63'
    return createTheme({
      palette: {
        mode: state.settings.themeMode,
        primary: {
          main: primaryMain,
        },
      },
        shape: {
          borderRadius: 16,
        },
        typography: {
          fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
          h4: {
            fontWeight: 600,
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 999,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 500,
              },
              outlined: {
                borderColor: alpha(primaryMain, 0.5),
                backgroundColor: alpha(primaryMain, 0.08),
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 24,
              },
            },
          },
        },
      })
    }, [state.settings.themeMode])

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
    setOfflineSnapshot(next)
  }, [])

  const clearOfflineSnapshot = useCallback(() => {
    clearOfflineCache()
    offlineSnapshotRef.current = null
    setOfflineSnapshot(null)
  }, [])

  const updateState = useCallback((updater: (prev: StorageState) => StorageState) => {
    setState((prev) => {
      const next = updater(prev)
      saveState(next)
      return next
    })
  }, [])

  const updateTodoLists = useCallback((updater: (prev: TodoList[]) => TodoList[]) => {
    updateState((prev) => ({
      ...prev,
      todoLists: updater(prev.todoLists),
    }))
  }, [updateState])

  const getOutboxOperationsForFamily = useCallback((): OfflineOutboxOperation[] => {
    if (!familyId) return []

    const current = offlineOutboxRef.current
    if (current.family_id && current.family_id !== familyId) {
      const reset = {
        family_id: familyId,
        operations: [] as OfflineOutboxOperation[],
      }
      offlineOutboxRef.current = reset
      saveOfflineOutbox(reset)
      return []
    }

    if (current.family_id === null) {
      const adopted = {
        family_id: familyId,
        operations: current.operations,
      }
      offlineOutboxRef.current = adopted
      saveOfflineOutbox(adopted)
      return adopted.operations
    }

    return current.operations
  }, [familyId])

  const setOutboxOperations = useCallback((operations: OfflineOutboxOperation[]) => {
    const next = {
      family_id: familyId ?? offlineOutboxRef.current.family_id ?? null,
      operations,
    }
    offlineOutboxRef.current = next
    saveOfflineOutbox(next)
  }, [familyId])

  const enqueueOfflineOperation = useCallback(
    (operation: SyncOperation) => {
      if (!familyId) return

      const currentOperations = getOutboxOperationsForFamily()
      const nextOperations = operation.type === 'set_todo_completed'
        ? upsertTodoToggleOperation(currentOperations, operation)
        : [
            ...currentOperations,
            {
              ...operation,
              created_at: new Date().toISOString(),
            },
          ]
      setOutboxOperations(nextOperations)
      updateState((prev) => applyPendingSyncState(prev, nextOperations))
    },
    [familyId, getOutboxOperationsForFamily, setOutboxOperations, updateState],
  )

  const flushOfflineOutbox = useCallback(
    async ({ timeoutMs }: { timeoutMs: number }): Promise<OfflineFlushResult> => {
      if (!familyId) {
        return { syncedOperations: 0, remainingOperations: 0 }
      }

      const operations = getOutboxOperationsForFamily()
      if (operations.length === 0) {
        return { syncedOperations: 0, remainingOperations: 0 }
      }

      const requestOperations = operations.map((operation) => {
        const { created_at, ...requestOperation } = operation
        void created_at
        return requestOperation
      })
      const response = await syncOfflineBatch(
        {
          operations: requestOperations,
        },
        { timeoutMs },
      )

      const resultsMap = new Map<string, SyncOperationResult>(
        response.results.map((result) => [result.operation_id, result]),
      )
      const mappedOperations = applyTodoMappingsToOperations(operations, response.mappings)
      const nextOperations = mappedOperations.filter((operation) => {
        const result = resultsMap.get(operation.operation_id)
        if (!result) return true
        return result.status === 'failed'
      })

      const syncedOperations = operations.length - nextOperations.length
      setOutboxOperations(nextOperations)
      updateState((prev) =>
        applyPendingSyncState(
          applySyncEntityMappingsToState(prev, response.mappings),
          nextOperations,
        ),
      )

      if (syncedOperations > 0 && nextOperations.length === 0) {
        setOfflineSyncNoticeOpen(true)
      }

      return {
        syncedOperations,
        remainingOperations: nextOperations.length,
      }
    },
    [familyId, getOutboxOperationsForFamily, setOutboxOperations, updateState],
  )

  useEffect(() => {
    if (!familyId) return
    const operations = getOutboxOperationsForFamily()
    if (operations.length === 0) return
    updateState((prev) => applyPendingSyncState(prev, operations))
  }, [familyId, getOutboxOperationsForFamily, updateState])

  const syncAllData = useCallback(
    async ({
      timeoutMs,
      trigger,
    }: {
      timeoutMs: number
      trigger: DataSyncTrigger
    }): Promise<boolean> => {
      if (!familyId) return false
      if (!authSession && !isOfflineRef.current) return false
      if (syncInFlightRef.current) return false
      const hasLocalData =
        stateRef.current.expenses.length > 0 ||
        stateRef.current.tags.length > 0 ||
        stateRef.current.todoLists.length > 0

      syncInFlightRef.current = true
      setSyncInFlight(true)
      if (trigger === 'manual') {
        setManualRetrying(true)
      }
      if (trigger !== 'auto-retry') {
        setDataSyncStatus('loading')
      }
      setSyncErrorMessage(null)

      const startedAt = performance.now()
      logDataSync('sync_started', {
        trigger,
        timeoutMs,
        hasLocalData,
      })

      try {
        let flushResult: OfflineFlushResult = {
          syncedOperations: 0,
          remainingOperations: getOutboxOperationsForFamily().length,
        }

        try {
          flushResult = await flushOfflineOutbox({ timeoutMs })
        } catch (flushError) {
          if (isNetworkLikeError(flushError)) {
            throw flushError
          }
          logDataSync('offline_flush_failed', {
            trigger,
            timeoutMs,
            message:
              isApiError(flushError) || isApiTimeoutError(flushError)
                ? flushError.message
                : flushError instanceof Error
                  ? flushError.message
                  : 'unknown_flush_error',
          })
        }

        const [expensePage, tags, todoListPage] = await Promise.all([
          listExpensePage(
            { limit: EXPENSES_PAGE_SIZE, offset: 0 },
            { timeoutMs },
          ),
          listTags({ timeoutMs }),
          listTodoLists(
            { includeItems: true, itemsArchived: 'all' },
            { timeoutMs },
          ),
        ])

        const pendingOperations = getOutboxOperationsForFamily()
        const pendingCreateIds = resolvePendingCreateIds(pendingOperations)
        const nextSlices = mergeFetchedStateWithPendingCreates(
          {
            expenses: expensePage.items,
            tags,
            todoLists: todoListPage.items,
          },
          stateRef.current,
          pendingOperations,
        )

        updateState((prev) =>
          applyPendingSyncState(
            {
              ...prev,
              expenses: nextSlices.expenses,
              tags: nextSlices.tags,
              todoLists: nextSlices.todoLists,
            },
            pendingOperations,
          ),
        )
        setExpensesTotal(
          Math.max(
            expensePage.total + pendingCreateIds.expenseIds.size,
            nextSlices.expenses.length,
          ),
        )
        setExpensesOffset(expensePage.items.length)
        const now = new Date().toISOString()
        setLastSyncAt(now)
        saveCacheMeta({ familyId, lastSyncAt: now })
        persistOfflineSnapshot({ lastSyncAt: now })
        setDataSyncStatus('updated')
        setDataStale(false)
        setSyncErrorMessage(null)
        logDataSync('sync_succeeded', {
          trigger,
          timeoutMs,
          durationMs: Math.round(performance.now() - startedAt),
          expensesCount: expensePage.items.length,
          expensesTotal: expensePage.total,
          syncedOfflineOperations: flushResult.syncedOperations,
          pendingOfflineOperations: flushResult.remainingOperations,
        })
        return true
      } catch (error) {
        const status: DataSyncStatus = isNetworkLikeError(error) ? 'offline' : 'error'
        setDataSyncStatus(status)
        setSyncErrorMessage(
          status === 'error'
            ? isApiError(error)
              ? error.message
              : 'Не удалось обновить данные.'
            : null,
        )
        if (hasLocalData) {
          setDataStale(true)
        }
        logDataSync('sync_failed', {
          trigger,
          timeoutMs,
          status,
          durationMs: Math.round(performance.now() - startedAt),
          hasLocalData,
          message:
            isApiError(error) || isApiTimeoutError(error)
              ? error.message
              : error instanceof Error
                ? error.message
                : 'unknown_error',
        })
        return false
      } finally {
        syncInFlightRef.current = false
        setSyncInFlight(false)
        if (trigger === 'manual') {
          setManualRetrying(false)
        }
      }
    },
    [
      authSession,
      familyId,
      flushOfflineOutbox,
      getOutboxOperationsForFamily,
      persistOfflineSnapshot,
      updateState,
    ],
  )

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
  }, [authSession, familyId, syncAllData])

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

  const active = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) ?? TABS[0],
    [activeTab],
  )

  const headerTitle =
    activeApp === 'expenses'
      ? active.title
      : activeApp === 'todo'
        ? 'To Do листы'
        : activeApp === 'gym'
          ? 'Тренировки'
          : activeApp === 'workouts'
            ? 'Тренировки'
          : 'Миниаппы'

  const formattedLastSyncAt = useMemo(() => {
    if (!lastSyncAt) return null
    try {
      return new Date(lastSyncAt).toLocaleString('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return null
    }
  }, [lastSyncAt])

  const guardReadOnly = () => {
    if (!isReadOnly) return false
    setDataStale(true)
    return true
  }

  const canRefreshTodo = activeApp === 'todo'
  const canRefreshExpenses = activeApp === 'expenses' && activeTab === 'expenses'
  const canRefresh = !isReadOnly && (canRefreshTodo || canRefreshExpenses)
  const isRefreshing = canRefreshTodo
    ? isTodoRefreshing
    : canRefreshExpenses
      ? isExpensesRefreshing
      : false

  const themeMode = state.settings.themeMode
  const themeLabel = themeMode === 'dark' ? 'Светлая тема' : 'Тёмная тема'
  const isOwner = family?.ownerId === authUser?.id
  const isBackgroundSyncVisible = isSyncInFlight || isExpensesRefreshing || isTodoRefreshing
  const canRetrySync = Boolean(authSession && familyId)

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

  const handleManualRetry = async () => {
    if (!authSession || !familyId) return
    await syncAllData({
      timeoutMs: MANUAL_RETRY_TIMEOUT_MS,
      trigger: 'manual',
    })
  }

  const handleFamilyComplete = (nextFamily: Family) => {
    setFamily(nextFamily)
    setFamilyId(nextFamily.id)
    setDataSyncStatus('loading')
    setSyncErrorMessage(null)
    if (authUser) {
      persistOfflineSnapshot({ lastUser: authUser, lastFamily: nextFamily })
    }
    navigateHome(true)
  }

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleSignOut = async () => {
    await signOut()
    syncInFlightRef.current = false
    offlineOutboxRef.current = { family_id: null, operations: [] }
    clearOfflineOutbox()
    setAuthSession(null)
    setAuthUser(null)
    setFamilyId(null)
    setFamily(null)
    navigateHome(true)
    setSyncInFlight(false)
    setManualRetrying(false)
    setDataSyncStatus('loading')
    setSyncErrorMessage(null)
    setDataStale(false)
    setLastSyncAt(null)
    setExpensesTotal(0)
    setExpensesOffset(0)
    setExpensesLoadingMore(false)
    setOfflineSyncNoticeOpen(false)
    updateState((prev) => ({ ...prev, expenses: [], tags: [], todoLists: [] }))
    setMenuAnchorEl(null)
    clearCacheMeta()
    clearOfflineSnapshot()
  }

  const handleLeaveFamily = async () => {
    if (!authUser || !familyId) {
      setMenuAnchorEl(null)
      return
    }
    await leaveFamily()
    syncInFlightRef.current = false
    offlineOutboxRef.current = { family_id: null, operations: [] }
    clearOfflineOutbox()
    setFamilyId(null)
    setFamily(null)
    navigateHome(true)
    setSyncInFlight(false)
    setManualRetrying(false)
    setDataSyncStatus('loading')
    setSyncErrorMessage(null)
    setDataStale(false)
    setLastSyncAt(null)
    setExpensesTotal(0)
    setExpensesOffset(0)
    setExpensesLoadingMore(false)
    setOfflineSyncNoticeOpen(false)
    updateState((prev) => ({ ...prev, expenses: [], tags: [], todoLists: [] }))
    setMenuAnchorEl(null)
    clearCacheMeta()
    clearOfflineSnapshot()
  }

  const handleCopyFamilyCode = async (event?: MouseEvent<HTMLElement>) => {
    if (event) {
      event.stopPropagation()
    }
    if (!family?.code) return
    setCopyingFamilyCode(true)
    try {
      await copyToClipboard(family.code)
    } finally {
      setCopyingFamilyCode(false)
    }
  }

  const handleOpenFamilyDialog = () => {
    setMenuAnchorEl(null)
    setFamilyDialogOpen(true)
  }

  const handleCloseFamilyDialog = () => {
    setFamilyDialogOpen(false)
  }

  const handleRemoveMember = async (member: FamilyMember) => {
    if (!family || member.role === 'owner') return
    if (guardReadOnly()) return
    setRemovingMemberId(member.userId)
    setFamilyMembersError(null)
    try {
      await removeFamilyMember(member.userId)
      setFamilyMembers((prev) => prev.filter((item) => item.userId !== member.userId))
    } catch {
      setFamilyMembersError('Не удалось исключить участника.')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleCreateExpense = async (expense: Expense) => {
    const addPendingExpense = () => {
      const hasExisting = stateRef.current.expenses.some((item) => item.id === expense.id)
      const localExpense: Expense = {
        ...expense,
        syncState: 'pending',
      }
      updateState((prev) => ({
        ...prev,
        expenses: sortExpensesByDateDesc(
          hasExisting
            ? prev.expenses.map((item) => (item.id === localExpense.id ? localExpense : item))
            : [localExpense, ...prev.expenses],
        ),
      }))
      if (!hasExisting) {
        setExpensesTotal((prev) => prev + 1)
        setExpensesOffset((prev) => prev + 1)
      }
      enqueueOfflineOperation({
        operation_id: createOperationId(),
        type: 'create_expense',
        local_id: localExpense.id,
        payload: {
          date: localExpense.date,
          amount: localExpense.amount,
          currency: localExpense.currency,
          title: localExpense.title,
          tag_ids: localExpense.tagIds,
        },
      })
      setDataStale(true)
    }

    if (isOfflineLike) {
      addPendingExpense()
      return
    }

    try {
      const created = await createExpense(expense)
      updateState((prev) => ({
        ...prev,
        expenses: sortExpensesByDateDesc([created, ...prev.expenses]),
      }))
      setExpensesTotal((prev) => prev + 1)
      setExpensesOffset((prev) => prev + 1)
    } catch (error) {
      if (!isNetworkLikeError(error)) {
        throw error
      }
      setDataSyncStatus('offline')
      addPendingExpense()
    }
  }

  const handleUpdateExpense = async (expense: Expense) => {
    if (guardReadOnly()) {
      throw new Error('read_only')
    }
    const updated = await updateExpense(expense)
    updateState((prev) => ({
      ...prev,
      expenses: sortExpensesByDateDesc(
        prev.expenses.map((item) => (item.id === updated.id ? updated : item)),
      ),
    }))
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (guardReadOnly()) {
      throw new Error('read_only')
    }
    await deleteExpense(expenseId)
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== expenseId),
    }))
    setExpensesTotal((prev) => Math.max(0, prev - 1))
    setExpensesOffset((prev) => Math.max(0, prev - 1))
  }

  const handleLoadMoreExpenses = async () => {
    if (guardReadOnly()) return
    if (isExpensesLoadingMore) return
    if (state.expenses.length >= expensesTotal) return
    setExpensesLoadingMore(true)
    try {
      const page = await listExpensePage({
        limit: EXPENSES_PAGE_SIZE,
        offset: expensesOffset,
      })
      updateState((prev) => ({
        ...prev,
        expenses: [...prev.expenses, ...page.items],
      }))
      const pendingCreateCount = resolvePendingCreateIds(
        getOutboxOperationsForFamily(),
      ).expenseIds.size
      setExpensesTotal((prev) =>
        Math.max(prev, page.total + pendingCreateCount),
      )
      setExpensesOffset((prev) => prev + page.items.length)
    } finally {
      setExpensesLoadingMore(false)
    }
  }

  const handleCreateTag = async (name: string): Promise<Tag> => {
    if (guardReadOnly()) {
      const trimmed = name.trim()
      const existing = findTagByName(state.tags, trimmed)
      if (existing) return existing
      throw new Error('read_only')
    }
    const trimmed = name.trim()
    const existing = findTagByName(state.tags, trimmed)
    if (existing) return existing
    const created = await createTag(trimmed)
    updateState((prev) => ({
      ...prev,
      tags: [...prev.tags, created],
    }))
    return created
  }

  const handleUpdateTag = async (tagId: string, name: string): Promise<Tag> => {
    if (guardReadOnly()) {
      throw new Error('read_only')
    }
    const trimmed = name.trim()
    const existing = findTagByName(state.tags, trimmed)
    if (existing && existing.id !== tagId) {
      return existing
    }
    const updated = await updateTag(tagId, trimmed)
    updateState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag) => (tag.id === updated.id ? updated : tag)),
    }))
    return updated
  }

  const handleDeleteTag = async (tagId: string): Promise<void> => {
    if (guardReadOnly()) return
    await deleteTag(tagId)
    updateState((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag.id !== tagId),
      expenses: prev.expenses.map((expense) => ({
        ...expense,
        tagIds: expense.tagIds.filter((id) => id !== tagId),
      })),
    }))
  }

  const handleRefreshExpenses = async () => {
    if (!authSession || !familyId || isExpensesRefreshing) return
    setExpensesRefreshing(true)
    try {
      await syncAllData({
        timeoutMs: MANUAL_RETRY_TIMEOUT_MS,
        trigger: 'manual',
      })
    } finally {
      setExpensesRefreshing(false)
    }
  }

  const handleRefreshTodoLists = async () => {
    if (!authSession || !familyId || isTodoRefreshing) return
    setTodoRefreshing(true)
    try {
      await syncAllData({
        timeoutMs: MANUAL_RETRY_TIMEOUT_MS,
        trigger: 'manual',
      })
    } finally {
      setTodoRefreshing(false)
    }
  }

  const handleCreateTodoList = async (title: string) => {
    if (guardReadOnly()) return
    const created = await createTodoList(title)
    updateTodoLists((prev) => [created, ...prev])
  }

  const handleUpdateTodoListArchiveSetting = async (
    listId: string,
    archiveCompleted: boolean,
  ) => {
    if (guardReadOnly()) return
    const updated = await updateTodoList(listId, {
      settings: { archiveCompleted },
    })
    updateTodoLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list
        const updatedItems = list.items.map((item) => {
          if (!item.isCompleted) return item
          return { ...item, isArchived: archiveCompleted }
        })
        return {
          ...list,
          title: updated.title,
          settings: updated.settings,
          items: updatedItems,
        }
      }),
    )
  }

  const handleToggleTodoListCollapsed = async (listId: string, isCollapsed: boolean) => {
    updateTodoLists((prev) =>
      prev.map((list) => (list.id === listId ? { ...list, isCollapsed } : list)),
    )
    if (isReadOnly) return
    try {
      await updateTodoList(listId, { isCollapsed })
    } catch {
      setDataStale(true)
    }
  }

  const handleMoveTodoList = async (listId: string, direction: 'up' | 'down') => {
    if (guardReadOnly()) return
    const sorted = [...state.todoLists].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.createdAt.localeCompare(b.createdAt)
    })
    const currentIndex = sorted.findIndex((list) => list.id === listId)
    if (currentIndex < 0) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sorted.length) return
    const current = sorted[currentIndex]
    const target = sorted[targetIndex]
    const currentOrder = current.order ?? currentIndex
    const targetOrder = target.order ?? targetIndex

    await Promise.all([
      updateTodoList(current.id, { order: targetOrder }),
      updateTodoList(target.id, { order: currentOrder }),
    ])

    updateTodoLists((prev) =>
      prev.map((list) => {
        if (list.id === current.id) return { ...list, order: targetOrder }
        if (list.id === target.id) return { ...list, order: currentOrder }
        return list
      }),
    )
  }

  const handleDeleteTodoList = async (listId: string) => {
    if (guardReadOnly()) return
    await deleteTodoList(listId)
    updateTodoLists((prev) => prev.filter((list) => list.id !== listId))
  }

  const handleCreateTodoItem = async (listId: string, title: string) => {
    const localId = `local-todo-${createId()}`
    const optimisticItem: TodoItem = {
      id: localId,
      title,
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    }
    updateTodoLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, items: [...list.items, optimisticItem] } : list,
      ),
    )
    if (isOfflineLike) {
      updateTodoLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                items: list.items.map((item) =>
                  item.id === localId ? { ...item, syncState: 'pending' } : item,
                ),
              }
            : list,
        ),
      )
      enqueueOfflineOperation({
        operation_id: createOperationId(),
        type: 'create_todo',
        local_id: localId,
        payload: {
          list_id: listId,
          title,
        },
      })
      setDataStale(true)
      return
    }

    try {
      const created = await createTodoItem(listId, title)
      updateTodoLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                items: list.items.map((item) => (item.id === localId ? created : item)),
              }
            : list,
        ),
      )
    } catch (error) {
      if (isNetworkLikeError(error)) {
        setDataSyncStatus('offline')
        updateTodoLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: list.items.map((item) =>
                    item.id === localId ? { ...item, syncState: 'pending' } : item,
                  ),
                }
              : list,
          ),
        )
        enqueueOfflineOperation({
          operation_id: createOperationId(),
          type: 'create_todo',
          local_id: localId,
          payload: {
            list_id: listId,
            title,
          },
        })
        setDataStale(true)
        return
      }

      setDataStale(true)
      updateTodoLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? { ...list, items: list.items.filter((item) => item.id !== localId) }
            : list,
        ),
      )
    }
  }

  const handleToggleTodoItem = async (
    listId: string,
    itemId: string,
    isCompleted: boolean,
  ) => {
    const list = state.todoLists.find((entry) => entry.id === listId)
    const currentItem = list?.items.find((item) => item.id === itemId) ?? null
    const nextCompleted = !isCompleted
    const optimisticUser = authUser
      ? {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          avatarUrl: authUser.avatarUrl,
        }
      : undefined

    if (currentItem && list) {
      const optimisticItem: TodoItem = {
        ...currentItem,
        isCompleted: nextCompleted,
        isArchived: list.settings.archiveCompleted ? nextCompleted : false,
        completedAt: nextCompleted ? new Date().toISOString() : undefined,
        completedBy: nextCompleted ? optimisticUser : undefined,
      }
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((current) =>
              current.id === itemId ? optimisticItem : current,
            ),
          }
        }),
      )
    }

    const togglePayload =
      currentItem?.syncState === 'pending'
        ? { todo_local_id: itemId, is_completed: nextCompleted }
        : { todo_id: itemId, is_completed: nextCompleted }

    if (isOfflineLike) {
      enqueueOfflineOperation({
        operation_id: createOperationId(),
        type: 'set_todo_completed',
        payload: togglePayload,
      })
      setDataStale(true)
      return
    }

    try {
      const updated = await updateTodoItem(itemId, { isCompleted: nextCompleted })
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((current) => (current.id === itemId ? updated : current)),
          }
        }),
      )
    } catch (error) {
      if (isNetworkLikeError(error)) {
        setDataSyncStatus('offline')
        enqueueOfflineOperation({
          operation_id: createOperationId(),
          type: 'set_todo_completed',
          payload: togglePayload,
        })
        setDataStale(true)
        return
      }

      setDataStale(true)
      if (currentItem) {
        updateTodoLists((prev) =>
          prev.map((entry) => {
            if (entry.id !== listId) return entry
            return {
              ...entry,
              items: entry.items.map((current) =>
                current.id === itemId ? currentItem : current,
              ),
            }
          }),
        )
      }
    }
  }

  const handleUpdateTodoItemTitle = async (
    listId: string,
    itemId: string,
    title: string,
  ) => {
    if (guardReadOnly()) return
    const list = state.todoLists.find((entry) => entry.id === listId)
    const currentItem = list?.items.find((item) => item.id === itemId) ?? null

    if (currentItem) {
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((item) =>
              item.id === itemId ? { ...item, title } : item,
            ),
          }
        }),
      )
    }

    try {
      const updated = await updateTodoItem(itemId, { title })
      updateTodoLists((prev) =>
        prev.map((entry) => {
          if (entry.id !== listId) return entry
          return {
            ...entry,
            items: entry.items.map((item) => (item.id === itemId ? updated : item)),
          }
        }),
      )
    } catch {
      setDataStale(true)
      if (currentItem) {
        updateTodoLists((prev) =>
          prev.map((entry) => {
            if (entry.id !== listId) return entry
            return {
              ...entry,
              items: entry.items.map((item) =>
                item.id === itemId ? currentItem : item,
              ),
            }
          }),
        )
      }
    }
  }

  const handleDeleteTodoItem = async (listId: string, itemId: string) => {
    if (guardReadOnly()) return
    const list = state.todoLists.find((entry) => entry.id === listId)
      const removedIndex = list ? list.items.findIndex((item) => item.id === itemId) : -1
      const removedItem =
        removedIndex >= 0 && list ? list.items[removedIndex] : null

      if (removedItem) {
        updateTodoLists((prev) =>
          prev.map((entry) =>
            entry.id === listId
              ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
              : entry,
          ),
        )
    }

    try {
      await deleteTodoItem(itemId)
    } catch {
      setDataStale(true)
      if (removedItem) {
        updateTodoLists((prev) =>
          prev.map((entry) => {
            if (entry.id !== listId) return entry
            if (entry.items.some((item) => item.id === itemId)) return entry
            const items = [...entry.items]
            const insertIndex = Math.min(Math.max(removedIndex, 0), items.length)
            items.splice(insertIndex, 0, removedItem)
            return { ...entry, items }
          }),
        )
      }
    }
  }

  const appShell = (
    <>
      <Paper
        elevation={0}
        square
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (themeValue) => themeValue.zIndex.appBar,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ position: 'relative', py: 1.5, px: 2, textAlign: 'center' }}>
          {activeApp !== 'home' ? (
            <Box
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Tooltip title="Назад">
                <IconButton
                  color="inherit"
                  onClick={() => {
                    const isGymNested = currentPath.startsWith(`${ROUTES.gym}/`)
                    const isWorkoutsNested = currentPath.startsWith(`${ROUTES.workouts}/`)
                    
                    if (activeApp === 'gym') {
                      if (isGymNested) {
                        navigate(ROUTES.gym)
                      } else {
                        navigateHome()
                      }
                      return
                    }
                    
                    if (activeApp === 'workouts') {
                      if (isWorkoutsNested) {
                        // Parse workouts route to determine parent
                        const pathAfterWorkouts = currentPath.slice(ROUTES.workouts.length + 1)
                        const segments = pathAfterWorkouts.split('/').filter(Boolean)
                        
                        if (segments[0] === 'templates' && segments[1]) {
                          // From template editor -> templates tab
                          navigate(`${ROUTES.workouts}/templates`)
                        } else if (segments[0] === 'exercise') {
                          // From exercise editor -> templates tab
                          navigate(`${ROUTES.workouts}/templates`)
                        } else if (segments[0] === 'workout' || segments[0] === 'new') {
                          // From workout editor or picker -> home tab
                          navigate(ROUTES.workouts)
                        } else if (segments[0] === 'templates' || segments[0] === 'analytics') {
                          // From templates/analytics tab -> home
                          navigateHome()
                        } else {
                          // Default: go to workouts home
                          navigate(ROUTES.workouts)
                        }
                      } else {
                        navigateHome()
                      }
                      return
                    }
                    
                    navigateHome()
                  }}
                  aria-label="Назад"
                >
                  <ArrowBackRounded />
                </IconButton>
              </Tooltip>
              {canRefresh ? (
                <Tooltip title="Обновить">
                  <span>
                    <IconButton
                      color="inherit"
                      onClick={() => {
                        if (canRefreshTodo) {
                          void handleRefreshTodoLists()
                        } else if (canRefreshExpenses) {
                          void handleRefreshExpenses()
                        }
                      }}
                      disabled={isRefreshing}
                      aria-label="Обновить данные"
                    >
                      {isRefreshing ? <CircularProgress size={18} /> : <RefreshRounded />}
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Box>
          ) : null}
          <Typography variant="subtitle1" color="text.secondary">
            {headerTitle}
          </Typography>
          <Tooltip title="Профиль и настройки">
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              aria-label="Открыть меню пользователя"
              sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
            >
              {authUser ? (
                <Avatar
                  src={authUser.avatarUrl}
                  alt={authUser.name ?? 'Пользователь'}
                  sx={{ width: 32, height: 32 }}
                >
                  {authUser.name?.slice(0, 1).toUpperCase()}
                </Avatar>
              ) : (
                <AccountCircleRounded />
              )}
            </IconButton>
          </Tooltip>
        </Box>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 240, borderRadius: 2 } } }}
        >
          <MenuItem
            disableRipple
            onClick={handleMenuClose}
            sx={{
              cursor: 'default',
              '&:hover': { backgroundColor: 'transparent' },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={authUser?.avatarUrl}
                alt={authUser?.name ?? 'Пользователь'}
                sx={{ width: 36, height: 36 }}
                children={authUser?.name?.slice(0, 1).toUpperCase()}
              />
              <Stack spacing={0}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {authUser?.name ?? 'Пользователь'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {authUser?.email ?? ''}
                </Typography>
              </Stack>
            </Stack>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleOpenFamilyDialog}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GroupRounded />
              </ListItemIcon>
              <Box sx={{ flex: 1 }}>
                <ListItemText
                  primary="Моя семья"
                  secondary={
                    family
                      ? `${family.name}${family.code ? ` · Код: ${family.code}` : ''}`
                      : '—'
                  }
                />
              </Box>
              <Tooltip title="Скопировать код">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleCopyFamilyCode}
                    disabled={!family?.code || isCopyingFamilyCode}
                    aria-label="Скопировать код семьи"
                  >
                    <ContentCopyRounded fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              toggleTheme()
              handleMenuClose()
            }}
          >
            <ListItemIcon>
              {themeMode === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
            </ListItemIcon>
            <ListItemText primary={themeLabel} />
          </MenuItem>
          <MenuItem onClick={handleLeaveFamily} disabled={isReadOnly}>
            <ListItemIcon>
              <GroupRounded />
            </ListItemIcon>
            <ListItemText primary="Выйти из семьи" />
          </MenuItem>
          <MenuItem onClick={handleSignOut}>
            <ListItemIcon>
              <LogoutRounded />
            </ListItemIcon>
            <ListItemText primary="Выйти из аккаунта" />
          </MenuItem>
        </Menu>
        {isBackgroundSyncVisible ? (
          <LinearProgress
            color={dataSyncStatus === 'error' ? 'error' : 'primary'}
            sx={{ height: 3 }}
          />
        ) : null}
      </Paper>

      <Dialog
        open={isFamilyDialogOpen}
        onClose={handleCloseFamilyDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Моя семья</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle1" fontWeight={600}>
                {family?.name ?? 'Семья'}
              </Typography>
              {family?.code ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Код: {family.code}
                  </Typography>
                  <Tooltip title="Скопировать код">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleCopyFamilyCode}
                        disabled={!family?.code || isCopyingFamilyCode}
                        aria-label="Скопировать код семьи"
                      >
                        <ContentCopyRounded fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ) : null}
            </Stack>

            {familyMembersError ? (
              <Alert severity="error">{familyMembersError}</Alert>
            ) : null}

            {familyMembersLoading ? (
              <Stack alignItems="center" sx={{ py: 3 }}>
                <CircularProgress size={28} />
              </Stack>
            ) : familyMembersError ? null : familyMembers.length === 0 ? (
              <Alert severity="info">Пока нет участников.</Alert>
            ) : (
              <List disablePadding>
                {familyMembers.map((member, index) => {
                  const isOwnerMember = member.role === 'owner'
                  const isSelf = member.userId === authUser?.id
                  const canRemove = Boolean(isOwner && !isOwnerMember && !isSelf && !isReadOnly)
                  const displayEmail = member.email ?? 'Без почты'
                  const initial = (member.email ?? member.userId).slice(0, 1).toUpperCase()

                  return (
                    <ListItem
                      key={member.userId}
                      divider={index < familyMembers.length - 1}
                      sx={{ alignItems: 'center', py: 1.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 48 }}>
                        <Avatar src={member.avatarUrl ?? undefined} alt={displayEmail}>
                          {initial}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        sx={{ mr: 2, minWidth: 0 }}
                        primary={
                          <Typography
                            variant="body1"
                            fontWeight={600}
                            noWrap
                            title={displayEmail}
                          >
                            {displayEmail}
                          </Typography>
                        }
                        secondary={undefined}
                      />
                      <Stack
                        direction="column"
                        spacing={0.5}
                        alignItems="center"
                        sx={{ ml: 'auto' }}
                      >
                        {isOwnerMember ? (
                          <Typography component="span" sx={{ fontSize: 18 }} aria-label="Владелец">
                            👑
                          </Typography>
                        ) : null}
                        {canRemove ? (
                          <Tooltip title="Исключить">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveMember(member)}
                                disabled={isReadOnly || removingMemberId === member.userId}
                                aria-label="Исключить участника"
                              >
                                <DeleteOutlineRounded fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </ListItem>
                  )
                })}
              </List>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFamilyDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="md" sx={{ pt: 2, pb: activeApp === 'expenses' ? 12 : 6 }}>
        <Stack spacing={3}>
          {dataSyncStatus === 'offline' ? (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void handleManualRetry()
                  }}
                  disabled={!canRetrySync || isManualRetrying}
                >
                  {isManualRetrying ? 'Обновляем…' : 'Обновить'}
                </Button>
              }
            >
              Offline: нет сети, показываем сохраненные данные.
              {formattedLastSyncAt ? ` Последнее обновление: ${formattedLastSyncAt}.` : ''}
            </Alert>
          ) : null}
          {dataSyncStatus === 'error' ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void handleManualRetry()
                  }}
                  disabled={!canRetrySync || isManualRetrying}
                >
                  {isManualRetrying ? 'Обновляем…' : 'Обновить'}
                </Button>
              }
            >
              {syncErrorMessage ?? 'Не удалось обновить данные.'}
            </Alert>
          ) : null}
          {isDataStale && dataSyncStatus !== 'offline' && dataSyncStatus !== 'error' ? (
            <Alert severity="warning">
              Нет соединения. Данные могут быть неактуальны.
              {formattedLastSyncAt ? ` Последнее обновление: ${formattedLastSyncAt}.` : ''}
            </Alert>
          ) : null}

          {activeApp === 'home' && (
            <MiniAppsScreen
              onOpenExpenses={() => navigateExpenseTab('expenses')}
              onOpenTodo={navigateTodo}
              onOpenWorkouts={navigateWorkouts}
            />
          )}

          {activeApp === 'todo' ? (
            <TodoScreen
              lists={state.todoLists}
              readOnly={isReadOnly}
              onCreateList={handleCreateTodoList}
              onDeleteList={handleDeleteTodoList}
              onToggleArchiveSetting={handleUpdateTodoListArchiveSetting}
              onToggleCollapsed={handleToggleTodoListCollapsed}
              onMoveList={handleMoveTodoList}
              onCreateItem={handleCreateTodoItem}
              onToggleItem={handleToggleTodoItem}
              onUpdateItemTitle={handleUpdateTodoItemTitle}
              onDeleteItem={handleDeleteTodoItem}
              allowOfflineItemCreate={isOfflineLike}
              allowOfflineItemToggle={isOfflineLike}
            />
          ) : null}

          {activeApp === 'expenses' && activeTab === 'expenses' ? (
            <ExpensesScreen
              expenses={state.expenses}
              tags={state.tags}
              total={expensesTotal}
              hasMore={!isReadOnly && state.expenses.length < expensesTotal}
              isLoadingMore={isExpensesLoadingMore}
              onLoadMore={handleLoadMoreExpenses}
              onCreateExpense={handleCreateExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onCreateTag={handleCreateTag}
              readOnly={isReadOnly}
              allowOfflineCreate={isOfflineLike}
            />
          ) : null}

          {activeApp === 'expenses' && activeTab === 'analytics' ? (
            <AnalyticsScreen
              tags={state.tags}
              readOnly={isReadOnly}
              onUpdateTag={handleUpdateTag}
              onDeleteTag={handleDeleteTag}
            />
          ) : null}

          {activeApp === 'expenses' && activeTab === 'reports' ? (
            <ReportsScreen readOnly={isReadOnly} />
          ) : null}


          {activeApp === 'workouts' ? (
            <WorkoutsScreen />
          ) : null}
        </Stack>
      </Container>

      {activeApp === 'expenses' ? (
        <Paper
          elevation={0}
          square
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            value={activeTab}
            onChange={(_, value) => navigateExpenseTab(value as TabId)}
            showLabels
            sx={{ height: 82 }}
          >
            <BottomNavigationAction
              label="Список"
              value="expenses"
              icon={<ListAltRounded />}
            />
            <BottomNavigationAction
              label="Аналитика"
              value="analytics"
              icon={<PieChartRounded />}
            />
            <BottomNavigationAction
              label="Отчеты"
              value="reports"
              icon={<BarChartRounded />}
            />
          </BottomNavigation>
        </Paper>
      ) : null}

      <Snackbar
        open={isOfflineSyncNoticeOpen}
        autoHideDuration={4_000}
        onClose={() => setOfflineSyncNoticeOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOfflineSyncNoticeOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Офлайн-изменения успешно загружены
        </Alert>
      </Snackbar>
    </>
  )

  const content = (() => {
    const canRenderFromCache = hasResolvedAppContext
    if (isBootstrapping && !canRenderFromCache) {
      return <AppLoadingScreen />
    }
    const isUnauthenticated = !authSession || !authUser
    const shouldShowConnectionError = isUnauthenticated && (isOffline || dataSyncStatus === 'offline')
    if (shouldShowConnectionError) {
      return <OfflineBlockedScreen />
    }
    if (isUnauthenticated) {
      return <AuthScreen onSignIn={handleSignIn} isConfigured={isSupabaseConfigured} />
    }
    if (!familyId) {
      return <FamilyScreen onComplete={handleFamilyComplete} />
    }
    return appShell
  })()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>{content}</Box>
    </ThemeProvider>
  )
}

export default App
