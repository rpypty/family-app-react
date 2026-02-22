import type { AuthSession, AuthUser } from '../../features/auth/api/auth'
import type { Family } from '../../features/family/api/families'

export const toOfflineAuthUser = (cachedUser: {
  id: string
  name: string
  email: string
  provider?: string
  createdAt?: string
  avatarUrl?: string
}): AuthUser => ({
  id: cachedUser.id,
  name: cachedUser.name,
  email: cachedUser.email,
  provider: 'google',
  createdAt: cachedUser.createdAt ?? new Date().toISOString(),
  avatarUrl: cachedUser.avatarUrl,
})

export const toOfflineFamily = (
  cachedFamily: { id: string; name: string; code?: string; ownerId?: string; createdAt?: string },
  fallbackOwnerId?: string,
): Family => ({
  id: cachedFamily.id,
  name: cachedFamily.name,
  code: cachedFamily.code ?? '',
  ownerId: cachedFamily.ownerId ?? fallbackOwnerId ?? '',
  createdAt: cachedFamily.createdAt ?? new Date().toISOString(),
})

export const toOfflineSession = (user: AuthUser): AuthSession => ({
  id: `offline-${user.id}`,
  userId: user.id,
  provider: user.provider,
  createdAt: user.createdAt,
})
