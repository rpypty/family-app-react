import { apiFetch, isApiError } from '../api/client'

export type Family = {
  id: string
  name: string
  code: string
  ownerId: string
  createdAt: string
}

export type FamilyMember = {
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
}

type ApiFamily = {
  id: string
  name: string
  code: string
  owner_id: string
  created_at: string
}

type ApiFamilyMember = {
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

const mapFamily = (family: ApiFamily): Family => ({
  id: family.id,
  name: family.name,
  code: family.code,
  ownerId: family.owner_id,
  createdAt: family.created_at,
})

const mapFamilyMember = (member: ApiFamilyMember): FamilyMember => ({
  userId: member.user_id,
  role: member.role,
  joinedAt: member.joined_at,
})

export const getCurrentFamily = async (): Promise<Family | null> => {
  try {
    const family = await apiFetch<ApiFamily>('/families/me')
    return mapFamily(family)
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.code === 'family_not_found')) {
      return null
    }
    throw error
  }
}

export const getUserFamilyId = async (_userId: string): Promise<string | null> => {
  const family = await getCurrentFamily()
  return family?.id ?? null
}

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const family = await getCurrentFamily()
  if (!family) return null
  return family.id === familyId ? family : null
}

export const createFamily = async ({ name }: { name: string }): Promise<Family> => {
  const family = await apiFetch<ApiFamily>('/families', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() || 'Моя семья' }),
  })
  return mapFamily(family)
}

export const joinFamilyByCode = async ({ code }: { code: string }): Promise<Family> => {
  const family = await apiFetch<ApiFamily>('/families/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return mapFamily(family)
}

export const leaveFamily = async (): Promise<void> => {
  await apiFetch<void>('/families/leave', {
    method: 'POST',
  })
}

export const updateFamilyName = async (name: string): Promise<Family> => {
  const family = await apiFetch<ApiFamily>('/families/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  return mapFamily(family)
}

export const listFamilyMembers = async (): Promise<FamilyMember[]> => {
  const members = await apiFetch<ApiFamilyMember[]>('/families/me/members')
  return members.map(mapFamilyMember)
}
