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
  tags: Tag[]
  todoLists: TodoList[]
  settings: Settings
}
