type OfflineUser = {
  id: string
  name: string
  email: string
  provider?: string
  createdAt?: string
  avatarUrl?: string
}

type OfflineFamily = {
  id: string
  name: string
  code?: string
  ownerId?: string
}

export type OfflineCache = {
  lastUser?: OfflineUser
  lastFamily?: OfflineFamily
  lastSyncAt?: string | null
}

const OFFLINE_CACHE_KEY = 'family-app-offline-cache-v1'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isValidUser = (value: unknown): value is OfflineUser => {
  if (!isPlainObject(value)) return false
  return isString(value.id) && isString(value.name) && isString(value.email)
}

const isValidFamily = (value: unknown): value is OfflineFamily => {
  if (!isPlainObject(value)) return false
  return isString(value.id) && isString(value.name)
}

const isValidCache = (value: unknown): value is OfflineCache => {
  if (!isPlainObject(value)) return false
  if (value.lastUser && !isValidUser(value.lastUser)) return false
  if (value.lastFamily && !isValidFamily(value.lastFamily)) return false
  if (value.lastSyncAt !== undefined && value.lastSyncAt !== null && !isString(value.lastSyncAt)) {
    return false
  }
  return true
}

export const loadOfflineCache = (): OfflineCache | null => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isValidCache(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export const saveOfflineCache = (cache: OfflineCache) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore storage errors
  }
}

export const clearOfflineCache = () => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(OFFLINE_CACHE_KEY)
  } catch {
    // ignore
  }
}
