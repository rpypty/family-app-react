export const logDataSync = (
  event: string,
  payload: Record<string, string | number | boolean | null | undefined>,
) => {
  const detail = {
    event,
    at: new Date().toISOString(),
    ...payload,
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('family-app:data-sync', {
        detail,
      }),
    )
  }

  console.info('[data-sync]', detail)
}
