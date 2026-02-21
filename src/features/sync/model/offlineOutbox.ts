import type {
  SyncCreateExpenseOperation,
  SyncCreateTodoOperation,
  SyncEntityMapping,
  SyncOperation,
  SyncSetTodoCompletedOperation,
} from '../api/sync'

const OFFLINE_OUTBOX_KEY = 'family-app-offline-outbox-v1'

export type OfflineOutboxOperation = SyncOperation & {
  created_at: string
}

export type OfflineOutboxState = {
  family_id: string | null
  operations: OfflineOutboxOperation[]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isCreateExpensePayload = (value: unknown): boolean =>
  isPlainObject(value) &&
  isString(value.date) &&
  typeof value.amount === 'number' &&
  isString(value.currency) &&
  isString(value.title)

const isCreateTodoPayload = (value: unknown): boolean =>
  isPlainObject(value) &&
  isString(value.list_id) &&
  isString(value.title)

const isSetTodoCompletedPayload = (value: unknown): boolean =>
  isPlainObject(value) &&
  typeof value.is_completed === 'boolean' &&
  (isString(value.todo_id) || isString(value.todo_local_id))

const isCreateExpenseOperation = (value: unknown): value is SyncCreateExpenseOperation =>
  isPlainObject(value) &&
  value.type === 'create_expense' &&
  isString(value.operation_id) &&
  isString(value.local_id) &&
  isCreateExpensePayload(value.payload)

const isCreateTodoOperation = (value: unknown): value is SyncCreateTodoOperation =>
  isPlainObject(value) &&
  value.type === 'create_todo' &&
  isString(value.operation_id) &&
  isString(value.local_id) &&
  isCreateTodoPayload(value.payload)

const isSetTodoCompletedOperation = (value: unknown): value is SyncSetTodoCompletedOperation =>
  isPlainObject(value) &&
  value.type === 'set_todo_completed' &&
  isString(value.operation_id) &&
  isSetTodoCompletedPayload(value.payload)

const isOfflineOutboxOperation = (value: unknown): value is OfflineOutboxOperation =>
  isPlainObject(value) &&
  isString(value.created_at) &&
  (isCreateExpenseOperation(value) ||
    isCreateTodoOperation(value) ||
    isSetTodoCompletedOperation(value))

const createFallbackUuid = () => {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`
}

const getToggleTargetKey = (
  operation: SyncSetTodoCompletedOperation,
): string => {
  if (operation.payload.todo_id) return `todo:${operation.payload.todo_id}`
  return `todo_local:${operation.payload.todo_local_id ?? ''}`
}

const normalizeOutboxState = (value: unknown): OfflineOutboxState => {
  if (!isPlainObject(value)) {
    return { family_id: null, operations: [] }
  }

  const family_id = isString(value.family_id) || value.family_id === null
    ? value.family_id
    : null
  const operations = Array.isArray(value.operations)
    ? value.operations.filter(isOfflineOutboxOperation)
    : []

  return { family_id, operations }
}

export const createOperationId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return createFallbackUuid()
}

export const loadOfflineOutbox = (): OfflineOutboxState => {
  if (typeof localStorage === 'undefined') {
    return { family_id: null, operations: [] }
  }

  try {
    const raw = localStorage.getItem(OFFLINE_OUTBOX_KEY)
    if (!raw) {
      return { family_id: null, operations: [] }
    }
    return normalizeOutboxState(JSON.parse(raw) as unknown)
  } catch {
    return { family_id: null, operations: [] }
  }
}

export const saveOfflineOutbox = (state: OfflineOutboxState) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

export const clearOfflineOutbox = () => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(OFFLINE_OUTBOX_KEY)
  } catch {
    // ignore
  }
}

export const upsertTodoToggleOperation = (
  operations: OfflineOutboxOperation[],
  operation: SyncSetTodoCompletedOperation,
): OfflineOutboxOperation[] => {
  const targetKey = getToggleTargetKey(operation)
  const filtered = operations.filter((item) => {
    if (item.type !== 'set_todo_completed') return true
    return getToggleTargetKey(item) !== targetKey
  })
  filtered.push({
    ...operation,
    created_at: new Date().toISOString(),
  })
  return filtered
}

export const applyTodoMappingsToOperations = (
  operations: OfflineOutboxOperation[],
  mappings: SyncEntityMapping[],
): OfflineOutboxOperation[] => {
  const todoMappings = mappings.filter((mapping) => mapping.entity === 'todo_item')
  if (todoMappings.length === 0) return operations
  const mappingMap = new Map(todoMappings.map((mapping) => [mapping.local_id, mapping.server_id]))

  return operations.map((operation) => {
    if (operation.type !== 'set_todo_completed') return operation
    if (!operation.payload.todo_local_id) return operation
    const mappedServerId = mappingMap.get(operation.payload.todo_local_id)
    if (!mappedServerId) return operation
    return {
      ...operation,
      payload: {
        is_completed: operation.payload.is_completed,
        todo_id: mappedServerId,
      },
    }
  })
}

export const resolvePendingCreateIds = (operations: OfflineOutboxOperation[]): {
  expenseIds: Set<string>
  todoIds: Set<string>
} => {
  const expenseIds = new Set<string>()
  const todoIds = new Set<string>()

  operations.forEach((operation) => {
    if (operation.type === 'create_expense') {
      expenseIds.add(operation.local_id)
    }
    if (operation.type === 'create_todo') {
      todoIds.add(operation.local_id)
    }
  })

  return { expenseIds, todoIds }
}

export const resolvePendingTodoItemIds = (
  operations: OfflineOutboxOperation[],
): Set<string> => {
  const todoItemIds = new Set<string>()

  operations.forEach((operation) => {
    if (operation.type === 'create_todo') {
      todoItemIds.add(operation.local_id)
      return
    }
    if (operation.type !== 'set_todo_completed') return
    if (operation.payload.todo_id) {
      todoItemIds.add(operation.payload.todo_id)
      return
    }
    if (operation.payload.todo_local_id) {
      todoItemIds.add(operation.payload.todo_local_id)
    }
  })

  return todoItemIds
}
