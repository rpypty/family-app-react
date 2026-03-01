export type ExpenseSettingsItemId =
  | 'theme'
  | 'premiumSubscription'
  | 'defaultCurrency'
  | 'categories'
  | 'quickFilters'
  | 'recurringExpenses'
  | 'family'
  | 'export'

export type ExpenseSettingsItemAvailability = 'ready' | 'comingSoon'

export type ExpenseSettingsItem = {
  id: ExpenseSettingsItemId
  title: string
  description: string
  availability: ExpenseSettingsItemAvailability
}

export const EXPENSE_SETTINGS_ITEMS: ExpenseSettingsItem[] = [
  {
    id: 'theme',
    title: 'Тема',
    description: 'Светлая или тёмная тема приложения.',
    availability: 'ready',
  },
  {
    id: 'premiumSubscription',
    title: 'Premium подписка',
    description: 'Расширенные возможности и будущие премиум-функции.',
    availability: 'comingSoon',
  },
  {
    id: 'defaultCurrency',
    title: 'Валюта по умолчанию',
    description: 'Базовая валюта для новых расходов.',
    availability: 'comingSoon',
  },
  {
    id: 'categories',
    title: 'Категории',
    description: 'Управление категориями расходов.',
    availability: 'ready',
  },
  {
    id: 'quickFilters',
    title: 'Быстрые фильтры',
    description: 'Быстрые диапазоны и фильтры в аналитике.',
    availability: 'comingSoon',
  },
  {
    id: 'recurringExpenses',
    title: 'Регулярные расходы',
    description: 'Шаблоны и автосоздание повторяющихся трат.',
    availability: 'comingSoon',
  },
  {
    id: 'family',
    title: 'Моя семья',
    description: 'Участники семьи и код приглашения.',
    availability: 'ready',
  },
  {
    id: 'export',
    title: 'Экспорт',
    description: 'Выгрузка данных расходов в файл.',
    availability: 'comingSoon',
  },
]
