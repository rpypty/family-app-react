import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Container,
  CssBaseline,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Avatar,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles'
import ListAltRounded from '@mui/icons-material/ListAltRounded'
import PieChartRounded from '@mui/icons-material/PieChartRounded'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded'
import GroupRounded from '@mui/icons-material/GroupRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import type { StorageState, Expense, Tag } from './data/types'
import { loadState, saveState } from './data/storage'
import type { AuthSession, AuthUser } from './data/auth'
import {
  getSession,
  onAuthStateChange,
  signInWithGoogle,
  signOut,
  isSupabaseConfigured,
} from './data/auth'
import type { Family } from './data/families'
import { getFamilyById, getUserFamilyId, leaveFamily } from './data/families'
import { findTagByName } from './utils/tagUtils'
import { createId } from './utils/uuid'
import { ExpensesScreen } from './screens/ExpensesScreen'
import { AnalyticsScreen } from './screens/AnalyticsScreen'
import { ReportsScreen } from './screens/ReportsScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { AuthScreen } from './screens/AuthScreen'
import { FamilyScreen } from './screens/FamilyScreen'
import { AppLoadingScreen } from './screens/AppLoadingScreen'

type TabId = 'expenses' | 'analytics' | 'reports'

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

function App() {
  const [state, setState] = useState<StorageState>(() => loadState())
  const [activeTab, setActiveTab] = useState<TabId>('expenses')
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [isBootstrapping, setBootstrapping] = useState(true)
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
        return
      }
      const storedFamilyId = await getUserFamilyId(user.id)
      if (!isActive) return
      setFamilyId(storedFamilyId)
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
    const loadFamily = async () => {
      if (!familyId) {
        setFamily(null)
        return
      }
      const storedFamily = await getFamilyById(familyId)
      if (!isActive) return
      setFamily(storedFamily)
    }
    loadFamily()
    return () => {
      isActive = false
    }
  }, [familyId])

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

  const active = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) ?? TABS[0],
    [activeTab],
  )

  const themeMode = state.settings.themeMode
  const themeLabel = themeMode === 'dark' ? 'Светлая тема' : 'Тёмная тема'

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

  const handleFamilyComplete = (nextFamilyId: string) => {
    setFamilyId(nextFamilyId)
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
    setUnauthStep('welcome')
    setMenuAnchorEl(null)
  }

  const handleLeaveFamily = async () => {
    if (!authUser || !familyId) {
      setMenuAnchorEl(null)
      return
    }
    await leaveFamily({ familyId, userId: authUser.id })
    setFamilyId(null)
    setFamily(null)
    setMenuAnchorEl(null)
  }

  const handleCreateExpense = (expense: Expense) => {
    updateState((prev) => ({
      ...prev,
      expenses: [...prev.expenses, expense],
    }))
  }

  const handleUpdateExpense = (expense: Expense) => {
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((item) => (item.id === expense.id ? expense : item)),
    }))
  }

  const handleDeleteExpense = (expenseId: string) => {
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== expenseId),
    }))
  }

  const handleCreateTag = (name: string): Tag => {
    const trimmed = name.trim()
    const existing = findTagByName(state.tags, trimmed)
    if (existing) return existing

    const newTag: Tag = {
      id: createId(),
      name: trimmed,
    }

    updateState((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag],
    }))

    return newTag
  }

  const mainApp = (
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
          <Typography variant="subtitle1" color="text.secondary">
            {active.title}
          </Typography>
          <Tooltip title="Профиль и настройки">
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              aria-label="Открыть меню пользователя"
              sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
            >
              <AccountCircleRounded />
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
          <MenuItem disabled>
            <ListItemIcon>
              <GroupRounded />
            </ListItemIcon>
            <ListItemText
              primary={family?.name ?? 'Семья'}
              secondary={family?.code ? `Код: ${family.code}` : undefined}
            />
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

      <Container maxWidth="md" sx={{ pt: 2, pb: 12 }}>
        <Stack spacing={3}>
          {activeTab === 'expenses' && (
            <ExpensesScreen
              expenses={state.expenses}
              tags={state.tags}
              onCreateExpense={handleCreateExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onCreateTag={handleCreateTag}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsScreen expenses={state.expenses} tags={state.tags} />
          )}

          {activeTab === 'reports' && (
            <ReportsScreen expenses={state.expenses} />
          )}
        </Stack>
      </Container>

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
      return <FamilyScreen user={authUser} onComplete={handleFamilyComplete} />
    }
    return mainApp
  })()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>{content}</Box>
    </ThemeProvider>
  )
}

export default App
