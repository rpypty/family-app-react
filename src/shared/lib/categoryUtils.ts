import type { Category } from '../types'

export const selectedCategories = (categories: Category[], selectedIds: Set<string> | string[]) => {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
  return categories.filter((category) => selectedSet.has(category.id))
}

export const findCategoryByName = (categories: Category[], name: string) => {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return null
  return categories.find((category) => category.name.toLowerCase() === normalized) ?? null
}

export const pluralCategory = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'категория'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'категории'
  }
  return 'категорий'
}
