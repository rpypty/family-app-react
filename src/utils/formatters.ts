import type { Expense } from '../data/types'

export const parseDate = (value: string): Date => {
  const [y, m, d] = value.split('-').map((part) => Number(part))
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export const formatDate = (date: Date) => {
  const y = date.getFullYear().toString().padStart(4, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const formatAmount = (amount: number) => amount.toFixed(2)

export const formatDateDots = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear().toString().padStart(4, '0')
  return `${d}.${m}.${y}`
}

export const formatTotals = (totals: Record<string, number>) => {
  const entries = Object.entries(totals)
  if (entries.length === 0) return '0'
  return entries.map(([currency, value]) => `${formatAmount(value)} ${currency}`).join(' · ')
}

export const dateOnly = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const formatDayWithMonth = (day: Date) => {
  const monthsGenitive = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]
  const today = new Date()
  const base = `${day.getDate()} ${monthsGenitive[day.getMonth()]}`
  if (day.getFullYear() !== today.getFullYear()) {
    return `${base} ${day.getFullYear()}`
  }
  return base
}

export const formatDayHeader = (day: Date) => {
  const today = dateOnly(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const target = dateOnly(day)
  if (target.getTime() === today.getTime()) return 'Сегодня'
  if (target.getTime() === yesterday.getTime()) return 'Вчера'
  return formatDayWithMonth(target)
}

export const formatMonthHeader = (month: Date) => {
  const months = [
    'январь',
    'февраль',
    'март',
    'апрель',
    'май',
    'июнь',
    'июль',
    'август',
    'сентябрь',
    'октябрь',
    'ноябрь',
    'декабрь',
  ]
  const name = months[month.getMonth()]
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.getFullYear()}`
}

export const formatPercent = (value: number, total: number) => {
  if (total <= 0) return '0'
  return ((value / total) * 100).toFixed(0)
}

export const latestDayOfMonth = (dayOfMonth: number, today: Date) => {
  const base = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
  if (base.getTime() <= today.getTime()) {
    return base
  }
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return new Date(prevMonth.getFullYear(), prevMonth.getMonth(), dayOfMonth)
}

export const aggregateByCurrency = (expenses: Expense[]) => {
  const totals: Record<string, number> = {}
  expenses.forEach((expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.amount
  })
  return totals
}
