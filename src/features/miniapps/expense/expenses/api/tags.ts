import type { Tag } from '../../../../../shared/types'
import { apiFetch } from '../../../../../shared/api/client'

type ApiTag = {
  id: string
  name: string
  created_at: string
}

const mapTag = (tag: ApiTag): Tag => ({
  id: tag.id,
  name: tag.name,
})

export const listTags = async (options?: { timeoutMs?: number }): Promise<Tag[]> => {
  const response = await apiFetch<ApiTag[]>('/tags', options)
  return response.map(mapTag)
}

export const createTag = async (name: string): Promise<Tag> => {
  const response = await apiFetch<ApiTag>('/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return mapTag(response)
}

export const updateTag = async (tagId: string, name: string): Promise<Tag> => {
  const response = await apiFetch<ApiTag>(`/tags/${tagId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  return mapTag(response)
}

export const deleteTag = async (tagId: string): Promise<void> => {
  await apiFetch<void>(`/tags/${tagId}`, { method: 'DELETE' })
}
