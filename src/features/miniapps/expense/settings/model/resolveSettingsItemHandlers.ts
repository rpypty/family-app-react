import type { ExpenseSettingsItemId } from './settingsItems'

type ResolveSettingsItemHandlersParams = {
  onToggleTheme: () => void
  onOpenCategories: () => void
  onOpenFamilyDialog: () => void
}

export const resolveSettingsItemHandlers = ({
  onToggleTheme,
  onOpenCategories,
  onOpenFamilyDialog,
}: ResolveSettingsItemHandlersParams): Partial<Record<ExpenseSettingsItemId, () => void>> => ({
  theme: onToggleTheme,
  categories: onOpenCategories,
  family: onOpenFamilyDialog,
})
