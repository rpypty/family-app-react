import type { Tag } from '../../../../../shared/types'
import { apiFetch } from '../../../../../shared/api/client'
import {
  normalizeTagColor,
  normalizeTagEmoji,
  type TagAppearanceInput,
} from '../../../../../shared/lib/tagAppearance'

type ApiTag = {
  id: string
  name: string
  color?: string | null
  emoji?: string | null
  created_at: string
}

const mapTag = (tag: ApiTag): Tag => ({
  id: tag.id,
  name: tag.name,
  color: normalizeTagColor(tag.color),
  emoji: normalizeTagEmoji(tag.emoji),
})

const buildAppearancePayload = (payload?: TagAppearanceInput) => {
  if (!payload) return {}
  const next: TagAppearanceInput = {}
  if ('color' in payload) {
    next.color = payload.color === null ? null : normalizeTagColor(payload.color) ?? null
  }
  if ('emoji' in payload) {
    next.emoji = payload.emoji === null ? null : normalizeTagEmoji(payload.emoji) ?? null
  }
  return next
}

export const listTags = async (options?: { timeoutMs?: number }): Promise<Tag[]> => {
  const response = await apiFetch<ApiTag[]>('/tags', options)
  return response.map(mapTag)
}

export const createTag = async (name: string, payload?: TagAppearanceInput): Promise<Tag> => {
  const response = await apiFetch<ApiTag>('/tags', {
    method: 'POST',
    body: JSON.stringify({
      name,
      ...buildAppearancePayload(payload),
    }),
  })
  return mapTag(response)
}

export const updateTag = async (
  tagId: string,
  name: string,
  payload?: TagAppearanceInput,
): Promise<Tag> => {
  const response = await apiFetch<ApiTag>(`/tags/${tagId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name,
      ...buildAppearancePayload(payload),
    }),
  })
  return mapTag(response)
}

export const deleteTag = async (tagId: string): Promise<void> => {
  await apiFetch<void>(`/tags/${tagId}`, { method: 'DELETE' })
}
