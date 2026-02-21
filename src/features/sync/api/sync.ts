import { apiFetch } from '../../../shared/api/client'
import type { Currency } from '../../../shared/types'

export type SyncCreateExpensePayload = {
  date: string
  amount: number
  currency: Currency
  title: string
  tag_ids?: string[]
}

export type SyncCreateTodoPayload = {
  list_id: string
  title: string
}

export type SyncSetTodoCompletedPayload = {
  todo_id?: string
  todo_local_id?: string
  is_completed: boolean
}

export type SyncCreateExpenseOperation = {
  operation_id: string
  type: 'create_expense'
  local_id: string
  payload: SyncCreateExpensePayload
}

export type SyncCreateTodoOperation = {
  operation_id: string
  type: 'create_todo'
  local_id: string
  payload: SyncCreateTodoPayload
}

export type SyncSetTodoCompletedOperation = {
  operation_id: string
  type: 'set_todo_completed'
  payload: SyncSetTodoCompletedPayload
}

export type SyncOperation =
  | SyncCreateExpenseOperation
  | SyncCreateTodoOperation
  | SyncSetTodoCompletedOperation

export type SyncBatchRequest = {
  operations: SyncOperation[]
}

export type SyncOperationError = {
  code: string
  message: string
  retryable: boolean
}

export type SyncOperationResult = {
  operation_id: string
  type: SyncOperation['type']
  status: 'applied' | 'duplicate' | 'failed'
  local_id?: string | null
  entity?: 'expense' | 'todo_item' | null
  server_id?: string | null
  error?: SyncOperationError | null
}

export type SyncEntityMapping = {
  entity: 'expense' | 'todo_item'
  local_id: string
  server_id: string
}

export type SyncBatchResponse = {
  sync_id: string
  status: 'success' | 'partial_success' | 'failed'
  summary: {
    total: number
    applied: number
    duplicate: number
    failed: number
  }
  results: SyncOperationResult[]
  mappings: SyncEntityMapping[]
  server_time: string
}

const createBatchIdempotencyKey = () => {
  const random = Math.random().toString(16).slice(2, 14)
  return `offline-sync-${Date.now().toString(36)}-${random}`
}

export const syncOfflineBatch = async (
  request: SyncBatchRequest,
  options?: { timeoutMs?: number; idempotencyKey?: string },
): Promise<SyncBatchResponse> => {
  const idempotencyKey = options?.idempotencyKey ?? createBatchIdempotencyKey()

  return apiFetch<SyncBatchResponse>('/sync', {
    method: 'POST',
    timeoutMs: options?.timeoutMs,
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(request),
  })
}
