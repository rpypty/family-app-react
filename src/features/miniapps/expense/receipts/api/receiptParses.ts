import { apiFetch } from '../../../../../shared/api/client'
import type { Currency, Expense } from '../../../../../shared/types'

export type ReceiptParseStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'approved'
  | 'cancelled'

export type ReceiptParseSummary = {
  id: string
  status: ReceiptParseStatus
  createdAt: string
  updatedAt: string
}

export type ReceiptParseMeta = {
  merchantName: string | null
  requestedDate: string | null
  purchasedAt: string | null
  currency: string | null
  detectedTotal: number | null
  itemsTotal: number | null
}

export type ReceiptDraftExpense = {
  id: string
  title: string
  amount: number
  currency: Currency
  categoryId: string
  confidence: number | null
  warnings: string[]
}

export type ReceiptParseItem = {
  id: string
  rawName: string
  normalizedName: string | null
  quantity: number | null
  unitPrice: number | null
  lineTotal: number
  effectiveLineTotal: number | null
  llmCategoryId: string | null
  llmCategoryConfidence: number | null
  finalCategoryId: string | null
  editedByUser: boolean
}

export type ReceiptParseError = {
  code: string
  message: string
}

export type ReceiptParse = ReceiptParseSummary & {
  receipt: ReceiptParseMeta
  draftExpenses: ReceiptDraftExpense[]
  items: ReceiptParseItem[]
  unresolvedItems: ReceiptParseItem[]
  warnings: string[]
  error: ReceiptParseError | null
}

export type CreateReceiptParseInput = {
  receipt: File
  categoryIds: string[]
  allCategories: boolean
  date?: string
  currency?: string
}

export type ApproveReceiptParseExpense = {
  draftId: string
  title: string
  amount: number
  currency: Currency
  categoryIds: string[]
  date: string
}

export type UpdateReceiptParseItemInput = {
  id: string
  amount?: number
  categoryId?: string
}

type ApiReceiptParseSummary = {
  id: string
  status: ReceiptParseStatus
  created_at: string
  updated_at: string
}

type ApiReceiptParseMeta = {
  merchant_name?: string | null
  requested_date?: string | null
  purchased_at?: string | null
  currency?: string | null
  detected_total?: number | null
  items_total?: number | null
}

type ApiReceiptDraftExpense = {
  id: string
  title: string
  amount: number
  currency: string
  category_id: string
  confidence?: number | null
  warnings?: string[] | null
}

type ApiReceiptParseItem = {
  id: string
  raw_name: string
  normalized_name?: string | null
  quantity?: number | null
  unit_price?: number | null
  line_total: number
  effective_line_total?: number | null
  llm_category_id?: string | null
  llm_category_confidence?: number | null
  final_category_id?: string | null
  edited_by_user: boolean
}

type ApiReceiptParse = ApiReceiptParseSummary & {
  receipt?: ApiReceiptParseMeta | null
  draft_expenses?: ApiReceiptDraftExpense[] | null
  items?: ApiReceiptParseItem[] | null
  unresolved_items?: ApiReceiptParseItem[] | null
  warnings?: string[] | null
  error?: ReceiptParseError | null
}

type ActiveReceiptParseResponse = {
  item: ApiReceiptParseSummary | null
}

type ApproveReceiptParseResponse = {
  status: ReceiptParseStatus
  expenses: Array<{
    id: string
    date: string
    amount: number
    currency: string
    base_currency?: string | null
    exchange_rate?: number | null
    amount_in_base?: number | null
    rate_date?: string | null
    rate_source?: string | null
    title: string
    category_ids: string[]
  }>
}

const mapSummary = (item: ApiReceiptParseSummary): ReceiptParseSummary => ({
  id: item.id,
  status: item.status,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
})

const mapItem = (item: ApiReceiptParseItem): ReceiptParseItem => ({
  id: item.id,
  rawName: item.raw_name,
  normalizedName: item.normalized_name ?? null,
  quantity: item.quantity ?? null,
  unitPrice: item.unit_price ?? null,
  lineTotal: item.line_total,
  effectiveLineTotal: item.effective_line_total ?? null,
  llmCategoryId: item.llm_category_id ?? null,
  llmCategoryConfidence: item.llm_category_confidence ?? null,
  finalCategoryId: item.final_category_id ?? null,
  editedByUser: item.edited_by_user,
})

const mapParse = (item: ApiReceiptParse): ReceiptParse => ({
  ...mapSummary(item),
  receipt: {
    merchantName: item.receipt?.merchant_name ?? null,
    requestedDate: item.receipt?.requested_date ?? null,
    purchasedAt: item.receipt?.purchased_at ?? null,
    currency: item.receipt?.currency ?? null,
    detectedTotal: item.receipt?.detected_total ?? null,
    itemsTotal: item.receipt?.items_total ?? null,
  },
  draftExpenses: (item.draft_expenses ?? []).map((draft) => ({
    id: draft.id,
    title: draft.title,
    amount: draft.amount,
    currency: draft.currency as Currency,
    categoryId: draft.category_id,
    confidence: draft.confidence ?? null,
    warnings: draft.warnings ?? [],
  })),
  items: (item.items ?? []).map(mapItem),
  unresolvedItems: (item.unresolved_items ?? []).map(mapItem),
  warnings: item.warnings ?? [],
  error: item.error ?? null,
})

const mapExpense = (expense: ApproveReceiptParseResponse['expenses'][number]): Expense => ({
  id: expense.id,
  date: expense.date,
  amount: expense.amount,
  currency: expense.currency as Currency,
  baseCurrency: expense.base_currency ?? null,
  exchangeRate: expense.exchange_rate ?? null,
  amountInBase: expense.amount_in_base ?? null,
  rateDate: expense.rate_date ?? null,
  rateSource: expense.rate_source ?? null,
  title: expense.title,
  categoryIds: expense.category_ids ?? [],
})

export const createReceiptParse = async (input: CreateReceiptParseInput): Promise<ReceiptParseSummary> => {
  const body = new FormData()
  body.append('receipt', input.receipt)
  body.append('all_categories', input.allCategories ? 'true' : 'false')
  input.categoryIds.forEach((categoryId) => body.append('category_ids', categoryId))
  if (input.date) body.append('date', input.date)
  if (input.currency) body.append('currency', input.currency)

  const response = await apiFetch<ApiReceiptParseSummary>('/receipt-parses', {
    method: 'POST',
    body,
  })
  return mapSummary(response)
}

export const getActiveReceiptParse = async (): Promise<ReceiptParseSummary | null> => {
  const response = await apiFetch<ActiveReceiptParseResponse>('/receipt-parses/active')
  return response.item ? mapSummary(response.item) : null
}

export const getReceiptParse = async (parseId: string): Promise<ReceiptParse> => {
  const response = await apiFetch<ApiReceiptParse>(`/receipt-parses/${parseId}`)
  return mapParse(response)
}

export const updateReceiptParseItems = async (
  parseId: string,
  items: UpdateReceiptParseItemInput[],
): Promise<ReceiptParse> => {
  const response = await apiFetch<ApiReceiptParse>(`/receipt-parses/${parseId}/items`, {
    method: 'PATCH',
    body: JSON.stringify({
      items: items.map((item) => ({
        id: item.id,
        amount: item.amount,
        category_id: item.categoryId,
      })),
    }),
  })
  return mapParse(response)
}

export const approveReceiptParse = async (
  parseId: string,
  expenses: ApproveReceiptParseExpense[],
): Promise<Expense[]> => {
  const response = await apiFetch<ApproveReceiptParseResponse>(`/receipt-parses/${parseId}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      expenses: expenses.map((expense) => ({
        draft_id: expense.draftId,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        category_ids: expense.categoryIds,
        date: expense.date,
      })),
    }),
  })
  return response.expenses.map(mapExpense)
}

export const cancelReceiptParse = async (parseId: string): Promise<ReceiptParseSummary> => {
  const response = await apiFetch<ApiReceiptParseSummary>(`/receipt-parses/${parseId}/cancel`, {
    method: 'POST',
  })
  return mapSummary(response)
}
