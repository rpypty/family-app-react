import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles'
import ListAltRounded from '@mui/icons-material/ListAltRounded'
import PieChartRounded from '@mui/icons-material/PieChartRounded'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded'
import GroupRounded from '@mui/icons-material/GroupRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import type { StorageState, Expense, Tag, TodoList } from './data/types'
import { loadState, saveState } from './data/storage'
import type { AuthSession, AuthUser } from './data/auth'
import {
  getSession,
  onAuthStateChange,
  signInWithGoogle,
  signOut,
  isSupabaseConfigured,
} from './data/auth'
import type { Family, FamilyMember } from './data/families'
import { getCurrentFamily, leaveFamily, listFamilyMembers, removeFamilyMember } from './data/families'
import { listExpensePage, createExpense, updateExpense, deleteExpense } from './data/expenses'
import { listTags, createTag } from './data/tags'
import { findTagByName } from './utils/tagUtils'
import { copyToClipboard } from './utils/clipboard'
import {
  listTodoLists,
  createTodoList,
  updateTodoList,
  deleteTodoList,
  createTodoItem,
  updateTodoItem,
  deleteTodoItem,
} from './data/todos'
import { ExpensesScreen } from './screens/ExpensesScreen'
import { AnalyticsScreen } from './screens/AnalyticsScreen'
import { ReportsScreen } from './screens/ReportsScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { AuthScreen } from './screens/AuthScreen'
import { FamilyScreen } from './screens/FamilyScreen'
import { AppLoadingScreen } from './screens/AppLoadingScreen'
import { MiniAppsScreen } from './screens/MiniAppsScreen'
import { TodoScreen } from './screens/TodoScreen'

type TabId = 'expenses' | 'analytics' | 'reports'
type AppId = 'home' | 'expenses' | 'todo'

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

function App() {
  const [state, setState] = useState<StorageState>(() => loadState())
  const [activeTab, setActiveTab] = useState<TabId>('expenses')
  const [activeApp, setActiveApp] = useState<AppId>('home')
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [isBootstrapping, setBootstrapping] = useState(true)
  const [isDataLoading, setDataLoading] = useState(false)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesOffset, setExpensesOffset] = useState(0)
  const [isExpensesLoadingMore, setExpensesLoadingMore] = useState(false)
  const [isCopyingFamilyCode, setCopyingFamilyCode] = useState(false)
  const [isFamilyDialogOpen, setFamilyDialogOpen] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [familyMembersLoading, setFamilyMembersLoading] = useState(false)
  const [familyMembersError, setFamilyMembersError] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [unauthStep, setUnauthStep] = useState<'welcome' | 'auth'>('welcome')
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    let isActive = true
    const applySnapshot = async (session: AuthSession | null, user: AuthUser | null) => {
      if (!isActive) return
      setAuthSession(session)
      setAuthUser(user)
      if (!session || !user) {
        setFamilyId(null)
        setFamily(null)
        setUnauthStep('welcome')
        setMenuAnchorEl(null)
        setActiveApp('home')
        return
      }
      let currentFamily: Family | null = null
      try {
        currentFamily = await getCurrentFamily()
      } catch {
        currentFamily = null
      }
      if (!isActive) return
      setFamily(currentFamily)
      setFamilyId(currentFamily?.id ?? null)
    }
    const bootstrap = async () => {
      const snapshot = await getSession()
      await applySnapshot(snapshot.session, snapshot.user)
      if (!isActive) return
      setBootstrapping(false)
    }
    bootstrap()
    const unsubscribe = onAuthStateChange((_event, session, user) => {
      void applySnapshot(session, user)
    })
    return () => {
      isActive = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const loadMembers = async () => {
      if (!isFamilyDialogOpen) return
      setFamilyMembersLoading(true)
      setFamilyMembersError(null)
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
  }, [isFamilyDialogOpen])

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

  const updateState = (updater: (prev: StorageState) => StorageState) => {
    setState((prev) => {
      const next = updater(prev)
      saveState(next)
      return next
    })
  }

  const updateTodoLists = (updater: (prev: TodoList[]) => TodoList[]) => {
    updateState((prev) => ({
      ...prev,
      todoLists: updater(prev.todoLists),
    }))
  }

  useEffect(() => {
    let isActive = true
    const loadData = async () => {
      if (!authSession || !familyId) return
      setDataLoading(true)
      setExpensesTotal(0)
      setExpensesOffset(0)
      setExpensesLoadingMore(false)
      updateState((prev) => ({ ...prev, expenses: [], tags: [], todoLists: [] }))
      try {
        const [expensePage, tags, todoListPage] = await Promise.all([
          listExpensePage({ limit: EXPENSES_PAGE_SIZE, offset: 0 }),
          listTags(),
          listTodoLists({ includeItems: true, itemsArchived: 'all' }),
        ])
        if (!isActive) return
        updateState((prev) => ({
          ...prev,
          expenses: expensePage.items,
          tags,
          todoLists: todoListPage.items,
        }))
        setExpensesTotal(expensePage.total)
        setExpensesOffset(expensePage.items.length)
      } catch {
        if (!isActive) return
        updateState((prev) => ({ ...prev, expenses: [], tags: [], todoLists: [] }))
        setExpensesTotal(0)
        setExpensesOffset(0)
      } finally {
        if (isActive) setDataLoading(false)
      }
    }

    if (authSession && familyId) {
      void loadData()
    }

    return () => {
      isActive = false
    }
  }, [authSession, familyId])

  const active = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) ?? TABS[0],
    [activeTab],
  )

  const headerTitle =
    activeApp === 'expenses'
      ? active.title
      : activeApp === 'todo'
        ? 'To Do листы'
        : 'Миниаппы'

  const themeMode = state.settings.themeMode
  const themeLabel = themeMode === 'dark' ? 'Светлая тема' : 'Тёмная тема'
  const isOwner = family?.ownerId === authUser?.id

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

  const handleFamilyComplete = (nextFamily: Family) => {
    setFamily(nextFamily)
    setFamilyId(nextFamily.id)
    setActiveApp('home')
  }

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleSignOut = async () => {
    await signOut()
    setAuthSession(null)
    setAuthUser(null)
    setFamilyId(null)
    setFamily(null)
    setActiveApp('home')
    setDataLoading(false)
    setExpensesTotal(0)
    setExpensesOffset(0)
    setExpensesLoadingMore(false)
    updateState((prev) => ({ ...prev, expenses: [], tags: [], todoLists: [] }))
    setUnauthStep('welcome')
    setMenuAnchorEl(null)
  }

  const handleLeaveFamily = async () => {
    if (!authUser || !familyId) {
      setMenuAnchorEl(null)
      return
    }
    await leaveFamily()
    setFamilyId(null)
    setFamily(null)
    setActiveApp('home')
    setDataLoading(false)
    setExpensesTotal(0)
    setExpensesOffset(0)
    setExpensesLoadingMore(false)
    updateState((prev) => ({ ...prev, expenses: [], tags: [], todoLists: [] }))
    setMenuAnchorEl(null)
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
    const created = await createExpense(expense)
    updateState((prev) => ({
      ...prev,
      expenses: [...prev.expenses, created],
    }))
    setExpensesTotal((prev) => prev + 1)
    setExpensesOffset((prev) => prev + 1)
  }

  const handleUpdateExpense = async (expense: Expense) => {
    const updated = await updateExpense(expense)
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((item) => (item.id === updated.id ? updated : item)),
    }))
  }

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId)
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== expenseId),
    }))
    setExpensesTotal((prev) => Math.max(0, prev - 1))
    setExpensesOffset((prev) => Math.max(0, prev - 1))
  }

  const handleLoadMoreExpenses = async () => {
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
      setExpensesTotal(page.total)
      setExpensesOffset((prev) => prev + page.items.length)
    } finally {
      setExpensesLoadingMore(false)
    }
  }

  const handleCreateTag = async (name: string): Promise<Tag> => {
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

  const handleCreateTodoList = async (title: string) => {
    const created = await createTodoList(title)
    updateTodoLists((prev) => [created, ...prev])
  }

  const handleUpdateTodoListArchiveSetting = async (
    listId: string,
    archiveCompleted: boolean,
  ) => {
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

  const handleDeleteTodoList = async (listId: string) => {
    await deleteTodoList(listId)
    updateTodoLists((prev) => prev.filter((list) => list.id !== listId))
  }

  const handleCreateTodoItem = async (listId: string, title: string) => {
    const created = await createTodoItem(listId, title)
    updateTodoLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, items: [...list.items, created] } : list,
      ),
    )
  }

  const handleToggleTodoItem = async (
    listId: string,
    itemId: string,
    isCompleted: boolean,
  ) => {
    const updated = await updateTodoItem(itemId, { isCompleted: !isCompleted })
    updateTodoLists((prev) =>
      prev.map((entry) => {
        if (entry.id !== listId) return entry
        return {
          ...entry,
          items: entry.items.map((current) => (current.id === itemId ? updated : current)),
        }
      }),
    )
  }

  const handleDeleteTodoItem = async (listId: string, itemId: string) => {
    await deleteTodoItem(itemId)
    updateTodoLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
          : list,
      ),
    )
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
            <Tooltip title="На главный экран">
              <IconButton
                color="inherit"
                onClick={() => setActiveApp('home')}
                aria-label="На главный экран"
                sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              >
                <ArrowBackRounded />
              </IconButton>
            </Tooltip>
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
          <MenuItem onClick={handleLeaveFamily}>
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
                  const canRemove = Boolean(isOwner && !isOwnerMember && !isSelf)
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
                                disabled={removingMemberId === member.userId}
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
          {activeApp === 'home' && (
            <MiniAppsScreen
              onOpenExpenses={() => setActiveApp('expenses')}
              onOpenTodo={() => setActiveApp('todo')}
            />
          )}

          {activeApp === 'todo' ? (
            <TodoScreen
              lists={state.todoLists}
              onCreateList={handleCreateTodoList}
              onDeleteList={handleDeleteTodoList}
              onToggleArchiveSetting={handleUpdateTodoListArchiveSetting}
              onCreateItem={handleCreateTodoItem}
              onToggleItem={handleToggleTodoItem}
              onDeleteItem={handleDeleteTodoItem}
            />
          ) : null}

          {activeApp === 'expenses' && activeTab === 'expenses' ? (
            <ExpensesScreen
              expenses={state.expenses}
              tags={state.tags}
              total={expensesTotal}
              hasMore={state.expenses.length < expensesTotal}
              isLoadingMore={isExpensesLoadingMore}
              onLoadMore={handleLoadMoreExpenses}
              onCreateExpense={handleCreateExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onCreateTag={handleCreateTag}
            />
          ) : null}

          {activeApp === 'expenses' && activeTab === 'analytics' ? (
            <AnalyticsScreen tags={state.tags} />
          ) : null}

          {activeApp === 'expenses' && activeTab === 'reports' ? (
            <ReportsScreen />
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
            onChange={(_, value) => setActiveTab(value)}
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
    </>
  )

  const content = (() => {
    if (isBootstrapping) {
      return <AppLoadingScreen />
    }
    if (!authSession || !authUser) {
      return unauthStep === 'welcome' ? (
        <WelcomeScreen onContinue={() => setUnauthStep('auth')} />
      ) : (
        <AuthScreen
          onSignIn={handleSignIn}
          onBack={() => setUnauthStep('welcome')}
          isConfigured={isSupabaseConfigured}
        />
      )
    }
    if (!familyId) {
      return <FamilyScreen onComplete={handleFamilyComplete} />
    }
    if (isDataLoading) {
      return <AppLoadingScreen label="Загружаем данные…" />
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
