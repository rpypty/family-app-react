import type { ExpenseSettingsItemId } from './settingsItems'

type ResolveSettingsItemHandlersParams = {
  onToggleTheme: () => void
  onOpenDefaultCurrency: () => void
  onOpenCategories: () => void
  onOpenFamilyDialog: () => void
}

export const resolveSettingsItemHandlers = ({
  onToggleTheme,
  onOpenDefaultCurrency,
  onOpenCategories,
  onOpenFamilyDialog,
}: ResolveSettingsItemHandlersParams): Partial<Record<ExpenseSettingsItemId, () => void>> => ({
  theme: onToggleTheme,
  defaultCurrency: onOpenDefaultCurrency,
  categories: onOpenCategories,
  family: onOpenFamilyDialog,
})
