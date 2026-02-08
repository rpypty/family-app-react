import type { Tag } from '../types'

export const selectedTags = (tags: Tag[], selectedIds: Set<string> | string[]) => {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
  return tags.filter((tag) => selectedSet.has(tag.id))
}

export const findTagByName = (tags: Tag[], name: string) => {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return null
  return tags.find((tag) => tag.name.toLowerCase() === normalized) ?? null
}

export const pluralTag = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'тег'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'тега'
  }
  return 'тегов'
}
