import { apiFetch } from '../../../../shared/api/client'
import type { TodoItem, TodoList, TodoListSettings, TodoUser } from '../../../../shared/types'

type ApiTodoListSettings = {
  archive_completed: boolean
}

type ApiTodoCompletedBy = {
  id: string
  name: string
  email: string
  avatar_url?: string | null
}

type ApiTodoItem = {
  id: string
  list_id: string
  title: string
  is_completed: boolean
  is_archived: boolean
  created_at: string
  completed_at?: string | null
  completed_by?: ApiTodoCompletedBy | null
}

type ApiTodoList = {
  id: string
  family_id: string
  title: string
  created_at: string
  settings: ApiTodoListSettings
  is_collapsed?: boolean
  order?: number
  items_total: number
  items_completed: number
  items_archived: number
  items?: ApiTodoItem[]
}

type TodoListListResponse = {
  items: ApiTodoList[]
  total: number
}

type TodoItemListResponse = {
  items: ApiTodoItem[]
  total: number
}

export type TodoListQuery = {
  q?: string
  limit?: number
  offset?: number
  includeItems?: boolean
  itemsArchived?: 'exclude' | 'only' | 'all'
}

const mapTodoUser = (user: ApiTodoCompletedBy): TodoUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatar_url ?? undefined,
})

const mapTodoItem = (item: ApiTodoItem): TodoItem => ({
  id: item.id,
  title: item.title,
  isCompleted: item.is_completed,
  isArchived: item.is_archived,
  createdAt: item.created_at,
  completedAt: item.completed_at ?? undefined,
  completedBy: item.completed_by ? mapTodoUser(item.completed_by) : undefined,
})

const mapTodoList = (list: ApiTodoList): TodoList => ({
  id: list.id,
  title: list.title,
  createdAt: list.created_at,
  settings: {
    archiveCompleted: list.settings?.archive_completed ?? false,
  },
  isCollapsed: list.is_collapsed ?? false,
  order: list.order ?? undefined,
  items: list.items ? list.items.map(mapTodoItem) : [],
})

const buildTodoListQuery = (params: TodoListQuery): string => {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  if (params.includeItems !== undefined) {
    search.set('include_items', params.includeItems ? 'true' : 'false')
  }
  if (params.itemsArchived) search.set('items_archived', params.itemsArchived)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listTodoLists = async (
  params: TodoListQuery = {},
  options?: { timeoutMs?: number },
): Promise<{ items: TodoList[]; total: number }> => {
  const response = await apiFetch<TodoListListResponse>(
    `/todo-lists${buildTodoListQuery(params)}`,
    options,
  )
  return {
    items: response.items.map(mapTodoList),
    total: response.total,
  }
}

export const createTodoList = async (
  title: string,
  settings?: TodoListSettings,
): Promise<TodoList> => {
  const response = await apiFetch<ApiTodoList>('/todo-lists', {
    method: 'POST',
    body: JSON.stringify({
      title,
      settings: settings ? { archive_completed: settings.archiveCompleted } : undefined,
    }),
  })
  return mapTodoList(response)
}

export const updateTodoList = async (
  listId: string,
  payload: {
    title?: string
    settings?: TodoListSettings
    isCollapsed?: boolean
    order?: number
  },
): Promise<TodoList> => {
  const response = await apiFetch<ApiTodoList>(`/todo-lists/${listId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: payload.title,
      settings: payload.settings
        ? { archive_completed: payload.settings.archiveCompleted }
        : undefined,
      is_collapsed: payload.isCollapsed,
      order: payload.order,
    }),
  })
  return mapTodoList(response)
}

export const deleteTodoList = async (listId: string): Promise<void> => {
  await apiFetch<void>(`/todo-lists/${listId}`, { method: 'DELETE' })
}

export const listTodoItems = async (
  listId: string,
  archived: 'exclude' | 'only' | 'all' = 'exclude',
): Promise<{ items: TodoItem[]; total: number }> => {
  const query = archived ? `?archived=${archived}` : ''
  const response = await apiFetch<TodoItemListResponse>(
    `/todo-lists/${listId}/items${query}`,
  )
  return {
    items: response.items.map(mapTodoItem),
    total: response.total,
  }
}

export const createTodoItem = async (listId: string, title: string): Promise<TodoItem> => {
  const response = await apiFetch<ApiTodoItem>(`/todo-lists/${listId}/items`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
  return mapTodoItem(response)
}

export const updateTodoItem = async (
  itemId: string,
  payload: { title?: string; isCompleted?: boolean },
): Promise<TodoItem> => {
  const response = await apiFetch<ApiTodoItem>(`/todo-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: payload.title,
      is_completed: payload.isCompleted,
    }),
  })
  return mapTodoItem(response)
}

export const deleteTodoItem = async (itemId: string): Promise<void> => {
  await apiFetch<void>(`/todo-items/${itemId}`, { method: 'DELETE' })
}
