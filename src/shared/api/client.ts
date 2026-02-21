import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

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

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number
}

export class ApiTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'ApiTimeoutError'
    this.timeoutMs = timeoutMs
  }
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

const isAbortError = (error: unknown): boolean => {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}

const resolveSignal = (
  externalSignal: AbortSignal | null,
  timeoutMs?: number,
): {
  signal: AbortSignal | undefined
  isTimedOut: () => boolean
  cleanup: () => void
} => {
  if (timeoutMs === undefined || timeoutMs <= 0) {
    return {
      signal: externalSignal ?? undefined,
      isTimedOut: () => false,
      cleanup: () => {},
    }
  }

  const controller = new AbortController()
  let timedOut = false
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const handleExternalAbort = () => {
    controller.abort()
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort)
    }
  }

  return {
    signal: controller.signal,
    isTimedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeoutId)
      if (externalSignal) {
        externalSignal.removeEventListener('abort', handleExternalAbort)
      }
    },
  }
}

export const apiFetch = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const token = await resolveAccessToken()
  const { timeoutMs, signal: externalSignal, ...requestOptions } = options
  const headers = new Headers(requestOptions.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (requestOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const requestSignal = resolveSignal(externalSignal ?? null, timeoutMs)

  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  let response: Response
  try {
    response = await fetch(url, {
      ...requestOptions,
      headers,
      signal: requestSignal.signal,
    })
  } catch (error) {
    requestSignal.cleanup()
    if (requestSignal.isTimedOut() && isAbortError(error)) {
      throw new ApiTimeoutError(timeoutMs ?? 0)
    }
    throw error
  }
  requestSignal.cleanup()

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

export const isApiTimeoutError = (error: unknown): error is ApiTimeoutError => {
  return error instanceof ApiTimeoutError
}
