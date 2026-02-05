import { createId } from '../utils/uuid'

export type Family = {
  id: string
  name: string
  code: string
  ownerId: string
  createdAt: string
  memberIds: string[]
}

type FamilyStore = {
  families: Record<string, Family>
  codeIndex: Record<string, string>
  memberships: Record<string, string>
}

const FAMILY_STORAGE_KEY = 'family-app-families-v1'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const createEmptyStore = (): FamilyStore => ({
  families: {},
  codeIndex: {},
  memberships: {},
})

const loadStore = (): FamilyStore => {
  if (typeof localStorage === 'undefined') return createEmptyStore()
  try {
    const raw = localStorage.getItem(FAMILY_STORAGE_KEY)
    if (!raw) return createEmptyStore()
    const parsed = JSON.parse(raw) as unknown
    if (!isPlainObject(parsed)) return createEmptyStore()
    const families = isPlainObject(parsed.families) ? parsed.families : {}
    const codeIndex = isPlainObject(parsed.codeIndex) ? parsed.codeIndex : {}
    const memberships = isPlainObject(parsed.memberships) ? parsed.memberships : {}
    return {
      families: families as Record<string, Family>,
      codeIndex: codeIndex as Record<string, string>,
      memberships: memberships as Record<string, string>,
    }
  } catch {
    return createEmptyStore()
  }
}

const saveStore = (store: FamilyStore) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Ignore storage errors to avoid blocking UI updates.
  }
}

const normalizeCode = (code: string) => code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

const generateFamilyCode = (existing: Set<string>): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 24; attempt += 1) {
    let value = ''
    for (let i = 0; i < 6; i += 1) {
      value += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    if (!existing.has(value)) return value
  }
  const fallback = normalizeCode(createId()).slice(0, 6)
  return fallback.padEnd(6, 'X')
}

export const getUserFamilyId = async (userId: string): Promise<string | null> => {
  const store = loadStore()
  const familyId = store.memberships[userId]
  if (!familyId) return null
  if (!store.families[familyId]) {
    delete store.memberships[userId]
    saveStore(store)
    return null
  }
  return familyId
}

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const store = loadStore()
  return store.families[familyId] ?? null
}

export const createFamily = async ({
  name,
  ownerId,
}: {
  name: string
  ownerId: string
}): Promise<Family> => {
  const store = loadStore()
  const id = createId()
  const code = generateFamilyCode(new Set(Object.keys(store.codeIndex)))
  const trimmedName = name.trim() || 'Моя семья'
  const family: Family = {
    id,
    name: trimmedName,
    code,
    ownerId,
    createdAt: new Date().toISOString(),
    memberIds: [ownerId],
  }
  store.families[id] = family
  store.codeIndex[code] = id
  store.memberships[ownerId] = id
  saveStore(store)
  return family
}

export const joinFamilyByCode = async ({
  code,
  userId,
}: {
  code: string
  userId: string
}): Promise<Family> => {
  const store = loadStore()
  const normalized = normalizeCode(code)
  const familyId = store.codeIndex[normalized]
  if (!familyId) {
    throw new Error('family_code_not_found')
  }
  const family = store.families[familyId]
  if (!family) {
    throw new Error('family_missing')
  }
  if (!family.memberIds.includes(userId)) {
    family.memberIds = [...family.memberIds, userId]
  }
  store.families[familyId] = family
  store.memberships[userId] = familyId
  saveStore(store)
  return family
}

export const leaveFamily = async ({
  familyId,
  userId,
}: {
  familyId: string
  userId: string
}): Promise<void> => {
  const store = loadStore()
  const family = store.families[familyId]
  if (!family) {
    delete store.memberships[userId]
    saveStore(store)
    return
  }

  family.memberIds = family.memberIds.filter((memberId) => memberId !== userId)
  store.families[familyId] = family
  delete store.memberships[userId]
  saveStore(store)
}
