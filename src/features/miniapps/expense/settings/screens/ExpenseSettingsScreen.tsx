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
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
} from '@mui/material'
import { useMemo, useState, type ReactElement } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, normalizePathname } from '../../../../../app/routing/routes'
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  isCurrency,
  type Currency,
  type ThemeMode,
} from '../../../../../shared/types'
import { resolveSettingsItemHandlers } from '../model/resolveSettingsItemHandlers'
import {
  EXPENSE_SETTINGS_ITEMS,
  type ExpenseSettingsItemId,
} from '../model/settingsItems'

type ExpenseSettingsScreenProps = {
  themeMode: ThemeMode
  familyDefaultCurrency?: string | null
  isReadOnly: boolean
  onToggleTheme: () => void
  onOpenFamilyDialog: () => void
  onUpdateFamilyDefaultCurrency: (currency: string) => Promise<void>
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
  familyDefaultCurrency,
  isReadOnly,
  onToggleTheme,
  onOpenFamilyDialog,
  onUpdateFamilyDefaultCurrency,
}: ExpenseSettingsScreenProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isCurrencyDialogOpen, setCurrencyDialogOpen] = useState(false)
  const [draftCurrency, setDraftCurrency] = useState<Currency>(DEFAULT_CURRENCY)
  const [isSavingCurrency, setSavingCurrency] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const currentPath = normalizePathname(location.pathname)
  const themeDescription = themeMode === 'dark' ? 'Сейчас: тёмная.' : 'Сейчас: светлая.'
  const canEditDefaultCurrency = !isReadOnly
  const normalizedFamilyCurrency = useMemo(() => {
    const raw = familyDefaultCurrency?.trim().toUpperCase()
    return raw && isCurrency(raw) ? raw : DEFAULT_CURRENCY
  }, [familyDefaultCurrency])

  const openCategories = () => {
    const params = new URLSearchParams()
    params.set('from', currentPath)
    navigate(`${ROUTES.expenseTags}?${params.toString()}`)
  }

  const openDefaultCurrencyDialog = () => {
    setDraftCurrency(normalizedFamilyCurrency)
    setCurrencyError(null)
    setCurrencyDialogOpen(true)
  }

  const closeDefaultCurrencyDialog = () => {
    if (isSavingCurrency) return
    setCurrencyDialogOpen(false)
  }

  const handleSaveDefaultCurrency = async () => {
    if (!canEditDefaultCurrency || isSavingCurrency) return
    if (draftCurrency === normalizedFamilyCurrency) {
      setCurrencyDialogOpen(false)
      return
    }
    setSavingCurrency(true)
    setCurrencyError(null)
    try {
      await onUpdateFamilyDefaultCurrency(draftCurrency)
      setCurrencyDialogOpen(false)
    } catch {
      setCurrencyError('Не удалось обновить валюту семьи. Попробуйте ещё раз.')
    } finally {
      setSavingCurrency(false)
    }
  }

  const itemHandlers = useMemo(
    () =>
      resolveSettingsItemHandlers({
        onToggleTheme,
        onOpenDefaultCurrency: openDefaultCurrencyDialog,
        onOpenCategories: openCategories,
        onOpenFamilyDialog,
      }),
    [onToggleTheme, onOpenFamilyDialog, currentPath, normalizedFamilyCurrency],
  )

  return (
    <>
      <Card elevation={0}>
        <CardContent>
          <List disablePadding>
            {EXPENSE_SETTINGS_ITEMS.map((item, index) => {
              const action = itemHandlers[item.id]
              const description =
                item.id === 'theme'
                  ? `${item.description} ${themeDescription}`
                  : item.id === 'defaultCurrency'
                    ? `Сейчас: ${normalizedFamilyCurrency}. ${
                        isReadOnly
                          ? 'Нет соединения. Изменение недоступно.'
                          : item.description
                      }`
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

      <Dialog open={isCurrencyDialogOpen} onClose={closeDefaultCurrencyDialog} fullWidth maxWidth="xs">
        <DialogTitle>Валюта по умолчанию</DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            label="Валюта"
            value={draftCurrency}
            onChange={(event) => setDraftCurrency(event.target.value as Currency)}
            fullWidth
            disabled={!canEditDefaultCurrency || isSavingCurrency}
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <MenuItem key={currency} value={currency}>
                {currency}
              </MenuItem>
            ))}
          </TextField>
          {currencyError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {currencyError}
            </Alert>
          ) : null}
          {!canEditDefaultCurrency ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Нет соединения. Изменение валюты сейчас недоступно.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDefaultCurrencyDialog} disabled={isSavingCurrency}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDefaultCurrency}
            disabled={
              !canEditDefaultCurrency ||
              isSavingCurrency ||
              draftCurrency === normalizedFamilyCurrency
            }
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
