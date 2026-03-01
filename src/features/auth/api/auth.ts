import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/api/supabaseClient'
import { getAuthMe, type AuthMe } from './authApi'

export type AuthProvider = 'google'

export type AuthUser = {
  id: string
  name: string
  email: string
  provider: AuthProvider
  createdAt: string
  avatarUrl?: string
}

export type AuthSession = {
  id: string
  userId: string
  provider: AuthProvider
  createdAt: string
}

const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export const isSkipAuthEnabled = parseBooleanEnv(import.meta.env.VITE_SKIP_AUTH)
export const isAuthConfigured = isSkipAuthEnabled || isSupabaseConfigured

const resolveProvider = (user: User | null): AuthProvider => {
  const provider = user?.app_metadata?.provider
  return provider === 'google' ? 'google' : 'google'
}

const resolveName = (user: User): string => {
  const meta = user.user_metadata ?? {}
  return (
    meta.full_name ??
    meta.name ??
    meta.preferred_username ??
    (user.email ? user.email.split('@')[0] : null) ??
    'Пользователь'
  )
}

const mapUser = (user: User | null): AuthUser | null => {
  if (!user || !user.email) return null
  return {
    id: user.id,
    name: resolveName(user),
    email: user.email,
    provider: resolveProvider(user),
    createdAt: user.created_at ?? new Date().toISOString(),
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined),
  }
}

const mapSession = (session: Session | null): AuthSession | null => {
  if (!session) return null
  return {
    id: session.access_token,
    userId: session.user.id,
    provider: resolveProvider(session.user),
    createdAt: session.user.created_at ?? new Date().toISOString(),
  }
}

const mapSkipAuthIdentity = (authMe: AuthMe | null): { session: AuthSession; user: AuthUser } => {
  const createdAt = new Date().toISOString()
  const userId = authMe?.id?.trim() || 'skip-auth-user'
  const email = authMe?.email ?? `${userId}@local.skip`
  return {
    session: {
      id: `skip-auth:${userId}`,
      userId,
      provider: 'google',
      createdAt,
    },
    user: {
      id: userId,
      name: authMe?.name ?? email.split('@')[0] ?? 'Пользователь',
      email,
      provider: 'google',
      createdAt,
      avatarUrl: authMe?.avatarUrl ?? undefined,
    },
  }
}

export const getSession = async (): Promise<{
  session: AuthSession | null
  user: AuthUser | null
}> => {
  if (isSkipAuthEnabled) {
    try {
      const authMe = await getAuthMe()
      return mapSkipAuthIdentity(authMe)
    } catch {
      return mapSkipAuthIdentity(null)
    }
  }

  if (!isSupabaseConfigured) return { session: null, user: null }
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) {
    return { session: null, user: null }
  }
  return {
    session: mapSession(data.session),
    user: mapUser(data.session?.user ?? null),
  }
}

export const signInWithGoogle = async (): Promise<void> => {
  if (isSkipAuthEnabled) return
  if (!isSupabaseConfigured) {
    throw new Error('supabase_not_configured')
  }
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) {
    throw error
  }
}

export const signOut = async (): Promise<void> => {
  if (isSkipAuthEnabled) return
  if (!isSupabaseConfigured) return
  await getSupabaseClient().auth.signOut()
}

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: AuthSession | null, user: AuthUser | null) => void,
) => {
  if (isSkipAuthEnabled) {
    return () => {}
  }
  if (!isSupabaseConfigured) {
    return () => {}
  }
  const {
    data: { subscription },
  } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
    callback(event, mapSession(session), mapUser(session?.user ?? null))
  })
  return () => subscription.unsubscribe()
}

export { isSupabaseConfigured }
