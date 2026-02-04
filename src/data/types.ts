export type Currency = 'BYN' | 'USD' | 'EUR' | 'RUB'

export type ThemeMode = 'light' | 'dark'

export type Expense = {
  id: string
  date: string
  amount: number
  currency: Currency
  title: string
  tagIds: string[]
}

export type Tag = {
  id: string
  name: string
}

export type Settings = {
  themeMode: ThemeMode
}

export type StorageState = {
  expenses: Expense[]
  tags: Tag[]
  settings: Settings
}
