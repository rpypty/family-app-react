import type { Category } from '../../../../../shared/types'
import { apiFetch } from '../../../../../shared/api/client'
import {
  normalizeCategoryColor,
  normalizeCategoryEmoji,
  type CategoryAppearanceInput,
} from '../../../../../shared/lib/categoryAppearance'

type ApiCategory = {
  id: string
  name: string
  color?: string | null
  emoji?: string | null
  created_at: string
}

const mapCategory = (category: ApiCategory): Category => ({
  id: category.id,
  name: category.name,
  color: normalizeCategoryColor(category.color),
  emoji: normalizeCategoryEmoji(category.emoji),
})

const buildAppearancePayload = (payload?: CategoryAppearanceInput) => {
  if (!payload) return {}
  const next: CategoryAppearanceInput = {}
  if ('color' in payload) {
    next.color = payload.color === null ? null : normalizeCategoryColor(payload.color) ?? null
  }
  if ('emoji' in payload) {
    next.emoji = payload.emoji === null ? null : normalizeCategoryEmoji(payload.emoji) ?? null
  }
  return next
}

export const listCategories = async (options?: { timeoutMs?: number }): Promise<Category[]> => {
  const response = await apiFetch<ApiCategory[]>('/categories', options)
  return response.map(mapCategory)
}

export const createCategory = async (name: string, payload?: CategoryAppearanceInput): Promise<Category> => {
  const response = await apiFetch<ApiCategory>('/categories', {
    method: 'POST',
    body: JSON.stringify({
      name,
      ...buildAppearancePayload(payload),
    }),
  })
  return mapCategory(response)
}

export const updateCategory = async (
  categoryId: string,
  name: string,
  payload?: CategoryAppearanceInput,
): Promise<Category> => {
  const response = await apiFetch<ApiCategory>(`/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name,
      ...buildAppearancePayload(payload),
    }),
  })
  return mapCategory(response)
}

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await apiFetch<void>(`/categories/${categoryId}`, { method: 'DELETE' })
}
