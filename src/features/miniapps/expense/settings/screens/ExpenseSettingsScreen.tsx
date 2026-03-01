import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import CurrencyExchangeRounded from '@mui/icons-material/CurrencyExchangeRounded'
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded'
import GroupRounded from '@mui/icons-material/GroupRounded'
import LocalOfferRounded from '@mui/icons-material/LocalOfferRounded'
import RepeatRounded from '@mui/icons-material/RepeatRounded'
import TuneRounded from '@mui/icons-material/TuneRounded'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import {
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { useMemo, type ReactElement } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, normalizePathname } from '../../../../../app/routing/routes'
import type { ThemeMode } from '../../../../../shared/types'
import { resolveSettingsItemHandlers } from '../model/resolveSettingsItemHandlers'
import {
  EXPENSE_SETTINGS_ITEMS,
  type ExpenseSettingsItemId,
} from '../model/settingsItems'

type ExpenseSettingsScreenProps = {
  themeMode: ThemeMode
  onToggleTheme: () => void
  onOpenFamilyDialog: () => void
}

const SETTINGS_ITEM_ICONS: Record<ExpenseSettingsItemId, ReactElement> = {
  theme: <DarkModeRounded />,
  premiumSubscription: <WorkspacePremiumRounded />,
  defaultCurrency: <CurrencyExchangeRounded />,
  categories: <LocalOfferRounded />,
  quickFilters: <TuneRounded />,
  recurringExpenses: <RepeatRounded />,
  family: <GroupRounded />,
  export: <FileDownloadRounded />,
}

export function ExpenseSettingsScreen({
  themeMode,
  onToggleTheme,
  onOpenFamilyDialog,
}: ExpenseSettingsScreenProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = normalizePathname(location.pathname)
  const themeDescription = themeMode === 'dark' ? 'Сейчас: тёмная.' : 'Сейчас: светлая.'

  const openCategories = () => {
    const params = new URLSearchParams()
    params.set('from', currentPath)
    navigate(`${ROUTES.expenseTags}?${params.toString()}`)
  }

  const itemHandlers = useMemo(
    () =>
      resolveSettingsItemHandlers({
        onToggleTheme,
        onOpenCategories: openCategories,
        onOpenFamilyDialog,
      }),
    [onToggleTheme, onOpenFamilyDialog, currentPath],
  )

  return (
    <Card elevation={0}>
      <CardContent>
        <List disablePadding>
          {EXPENSE_SETTINGS_ITEMS.map((item, index) => {
            const action = itemHandlers[item.id]
            const description =
              item.id === 'theme'
                ? `${item.description} ${themeDescription}`
                : item.description

            return (
              <ListItem
                key={item.id}
                disablePadding
                divider={index < EXPENSE_SETTINGS_ITEMS.length - 1}
              >
                <ListItemButton onClick={action} disabled={!action} sx={{ py: 1.25 }}>
                  <ListItemIcon sx={{ minWidth: 38 }}>
                    {SETTINGS_ITEM_ICONS[item.id]}
                  </ListItemIcon>
                  <ListItemText primary={item.title} secondary={description} />
                  {item.availability === 'comingSoon' ? (
                    <Chip label="Скоро" size="small" variant="outlined" />
                  ) : (
                    <ChevronRightRounded color="action" />
                  )}
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </CardContent>
    </Card>
  )
}
