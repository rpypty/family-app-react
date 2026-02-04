import { useMemo, useState } from 'react'
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Container,
  CssBaseline,
  IconButton,
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
import type { StorageState, Expense, Tag } from './data/types'
import { loadState, saveState } from './data/storage'
import { findTagByName } from './utils/tagUtils'
import { createId } from './utils/uuid'
import { ExpensesScreen } from './screens/ExpensesScreen'
import { AnalyticsScreen } from './screens/AnalyticsScreen'
import { ReportsScreen } from './screens/ReportsScreen'

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
            <Tooltip title={themeLabel}>
              <IconButton
                color="inherit"
                onClick={toggleTheme}
                aria-label={themeLabel}
                sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
              >
                {themeMode === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
              </IconButton>
            </Tooltip>
          </Box>
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
      </Box>
    </ThemeProvider>
  )
}

export default App
