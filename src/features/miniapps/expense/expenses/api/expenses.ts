import type { Currency, Expense } from '../../../../../shared/types'
import { apiFetch } from '../../../../../shared/api/client'

type ApiExpense = {
  id: string
  family_id: string
  user_id: string
  date: string
  amount: number
  currency: string
  title: string
  tag_ids: string[]
  created_at: string
  updated_at: string
}

type ExpenseListResponse = {
  items: ApiExpense[]
  total: number
}

export type ExpenseListParams = {
  from?: string
  to?: string
  tagId?: string
  tagIds?: string[]
  limit?: number
  offset?: number
}

const mapExpense = (expense: ApiExpense): Expense => ({
  id: expense.id,
  date: expense.date,
  amount: expense.amount,
  currency: expense.currency as Currency,
  title: expense.title,
  tagIds: expense.tag_ids ?? [],
})

const buildQuery = (params: ExpenseListParams): string => {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.tagIds && params.tagIds.length > 0) {
    search.set('tag_ids', params.tagIds.join(','))
  } else if (params.tagId) {
    search.set('tag_id', params.tagId)
  }
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listExpensePage = async (
  params: ExpenseListParams = {},
): Promise<{ items: Expense[]; total: number }> => {
  const response = await apiFetch<ExpenseListResponse>(`/expenses${buildQuery(params)}`)
  return {
    items: response.items.map(mapExpense),
    total: response.total,
  }
}

export const listExpenses = async (params: ExpenseListParams = {}): Promise<Expense[]> => {
  const response = await listExpensePage(params)
  return response.items
}

export const createExpense = async (expense: Expense): Promise<Expense> => {
  const response = await apiFetch<ApiExpense>('/expenses', {
    method: 'POST',
    body: JSON.stringify({
      date: expense.date,
      amount: expense.amount,
      currency: expense.currency,
      title: expense.title,
      tag_ids: expense.tagIds,
    }),
  })
  return mapExpense(response)
}

export const updateExpense = async (expense: Expense): Promise<Expense> => {
  const response = await apiFetch<ApiExpense>(`/expenses/${expense.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: expense.date,
      amount: expense.amount,
      currency: expense.currency,
      title: expense.title,
      tag_ids: expense.tagIds,
    }),
  })
  return mapExpense(response)
}

export const deleteExpense = async (expenseId: string): Promise<void> => {
  await apiFetch<void>(`/expenses/${expenseId}`, { method: 'DELETE' })
}
