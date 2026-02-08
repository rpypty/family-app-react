type CacheMeta = {
  familyId: string
  lastSyncAt: string
}

const CACHE_META_KEY = 'family-app-cache-meta-v1'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isValidMeta = (value: unknown): value is CacheMeta => {
  if (!isPlainObject(value)) return false
  return typeof value.familyId === 'string' && typeof value.lastSyncAt === 'string'
}

export const loadCacheMeta = (familyId: string): CacheMeta | null => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isValidMeta(parsed)) return null
    if (parsed.familyId !== familyId) return null
    return parsed
  } catch {
    return null
  }
}

export const saveCacheMeta = (meta: CacheMeta) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta))
  } catch {
    // ignore storage errors
  }
}

export const clearCacheMeta = () => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(CACHE_META_KEY)
  } catch {
    // ignore
  }
}
