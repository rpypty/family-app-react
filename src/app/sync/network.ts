import { ApiTimeoutError, isApiTimeoutError } from '../../shared/api/client'

export const isNetworkLikeError = (error: unknown): boolean => {
  if (isApiTimeoutError(error)) return true
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (error instanceof TypeError) return true
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof error.name === 'string' &&
    error.name === 'AbortError'
  ) {
    return true
  }
  return false
}

export const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new ApiTimeoutError(timeoutMs))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}
