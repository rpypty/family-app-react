import { apiFetch } from '../../../shared/api/client'

export type AuthMe = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
}

type ApiAuthMe = {
  id: string
  email?: string | null
  name?: string | null
  avatar_url?: string | null
}

export const getAuthMe = async (): Promise<AuthMe> => {
  const response = await apiFetch<ApiAuthMe>('/auth/me')
  return {
    id: response.id,
    email: response.email ?? null,
    name: response.name ?? null,
    avatarUrl: response.avatar_url ?? null,
  }
}
