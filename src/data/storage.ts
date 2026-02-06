import type { StorageState, TodoList } from './types'
import { createSeedState } from './seed'

const STORAGE_KEY = 'family-app-state-v3'

type StoredState = Omit<StorageState, 'todoLists'> & {
  todoLists?: TodoList[]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isValidState = (value: unknown): value is StoredState => {
  if (!isPlainObject(value)) return false
  const expenses = value.expenses
  const tags = value.tags
  const settings = value.settings
  const todoLists = value.todoLists
  if (!Array.isArray(expenses) || !Array.isArray(tags)) return false
  if (todoLists !== undefined && !Array.isArray(todoLists)) return false
  if (!isPlainObject(settings)) return false
  if (settings.themeMode !== 'light' && settings.themeMode !== 'dark') {
    return false
  }
  return true
}

const normalizeState = (value: StoredState): StorageState => ({
  ...value,
  todoLists: Array.isArray(value.todoLists) ? value.todoLists : [],
})

export const loadState = (): StorageState => {
  if (typeof localStorage === 'undefined') {
    return createSeedState()
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = createSeedState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
      return seed
    }

    const parsed = JSON.parse(raw) as unknown
    if (!isValidState(parsed)) {
      const seed = createSeedState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
      return seed
    }

    return normalizeState(parsed)
  } catch {
    const seed = createSeedState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }
}

export const saveState = (state: StorageState) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors to avoid blocking UI updates.
  }
}
