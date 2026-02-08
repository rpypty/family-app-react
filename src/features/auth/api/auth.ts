import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/api/supabaseClient'

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

export const getSession = async (): Promise<{
  session: AuthSession | null
  user: AuthUser | null
}> => {
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
  if (!isSupabaseConfigured) return
  await getSupabaseClient().auth.signOut()
}

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: AuthSession | null, user: AuthUser | null) => void,
) => {
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
