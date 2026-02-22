import BarChartRounded from '@mui/icons-material/BarChartRounded'
import ListAltRounded from '@mui/icons-material/ListAltRounded'
import PieChartRounded from '@mui/icons-material/PieChartRounded'
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material'
import type { AppShellModel } from '../../hooks/useAppController'
import type { TabId } from '../../routing/routes'

type AppShellExpensesTabsProps = {
  model: AppShellModel
}

export function AppShellExpensesTabs({ model }: AppShellExpensesTabsProps) {
  if (model.activeApp !== 'expenses') {
    return null
  }

  return (
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
        value={model.activeTab}
        onChange={(_, value) => model.onNavigateExpenseTab(value as TabId)}
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
  )
}
