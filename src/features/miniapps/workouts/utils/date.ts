export const todayISO = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const parseISODate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const dt = new Date(iso)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export const toISODate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const addDays = (date: Date, delta: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

export const formatDateLabel = (iso: string): string => {
  const dt = parseISODate(iso)
  if (!dt) return iso
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const formatShortDate = (iso: string): string => {
  const dt = parseISODate(iso)
  if (!dt) return iso
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export const formatShortMonth = (iso: string): string => {
  const dt = parseISODate(iso)
  if (!dt) return iso
  return dt.toLocaleDateString('ru-RU', { month: 'short' })
}

export const formatWeekday = (iso: string): string => {
  const dt = parseISODate(iso)
  if (!dt) return ''
  return dt.toLocaleDateString('ru-RU', { weekday: 'short' })
}
