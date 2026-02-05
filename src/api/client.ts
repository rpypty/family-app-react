import { getSupabaseClient, isSupabaseConfigured } from '../data/supabaseClient'

type ApiErrorPayload = {
  error?: {
    code?: string
    message?: string
  }
}

export type ApiError = Error & {
  status: number
  code?: string
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5010').replace(
  /\/$/,
  '',
)

const resolveAccessToken = async (): Promise<string | null> => {
  if (!isSupabaseConfigured) return null
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) return null
  return data.session?.access_token ?? null
}

const parseErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  try {
    const data = (await response.json()) as unknown
    if (isPlainObject(data)) {
      return data as ApiErrorPayload
    }
  } catch {
    // ignore
  }
  return null
}

const buildError = async (response: Response): Promise<ApiError> => {
  const payload = await parseErrorPayload(response)
  const message = payload?.error?.message ?? response.statusText
  const error = new Error(message) as ApiError
  error.status = response.status
  error.code = payload?.error?.code
  return error
}

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await resolveAccessToken()
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  if (!response.ok) {
    throw await buildError(response)
  }

  const data = (await response.json()) as T
  return data
}

export const isApiError = (error: unknown): error is ApiError => {
  return typeof error === 'object' && error !== null && 'status' in error
}
