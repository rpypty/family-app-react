export const SUPPORTED_CURRENCIES = ['BYN', 'USD', 'EUR', 'RUB'] as const
export type Currency = string
export const DEFAULT_CURRENCY: Currency = 'BYN'

export const isCurrency = (value: string): value is Currency =>
  (SUPPORTED_CURRENCIES as readonly string[]).includes(value)

export type ThemeMode = 'light' | 'dark'

export type SyncState = 'pending' | 'synced' | 'failed'

export type Expense = {
  id: string
  date: string
  amount: number
  currency: Currency
  baseCurrency?: string | null
  exchangeRate?: number | null
  amountInBase?: number | null
  rateDate?: string | null
  rateSource?: string | null
  title: string
  categoryIds: string[]
  syncState?: SyncState
}

export type Category = {
  id: string
  name: string
  color?: string
  emoji?: string
}

export type TodoUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export type TodoItem = {
  id: string
  title: string
  isCompleted: boolean
  isArchived: boolean
  createdAt: string
  completedAt?: string
  completedBy?: TodoUser
  syncState?: SyncState
}

export type TodoListSettings = {
  archiveCompleted: boolean
}

export type TodoList = {
  id: string
  title: string
  createdAt: string
  settings: TodoListSettings
  isCollapsed: boolean
  order?: number
  items: TodoItem[]
}

export type Settings = {
  themeMode: ThemeMode
}

export type StorageState = {
  expenses: Expense[]
  categories: Category[]
  todoLists: TodoList[]
  settings: Settings
}
