import type { Expense } from '../data/types'
import { parseDate } from './formatters'

export const aggregateByTag = (expenses: Expense[]) => {
  const totals: Record<string, number> = {}
  expenses.forEach((expense) => {
    expense.tagIds.forEach((tagId) => {
      totals[tagId] = (totals[tagId] ?? 0) + expense.amount
    })
  })
  return totals
}

export const groupByMonth = (expenses: Expense[]) => {
  const totals: Record<string, number> = {}
  expenses.forEach((expense) => {
    const date = parseDate(expense.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    totals[key] = (totals[key] ?? 0) + expense.amount
  })
  return totals
}

export const percentChange = (previous: number, current: number) => {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
