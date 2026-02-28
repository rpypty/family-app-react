import type { Category } from '../types'

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const GRAPHEME_SEGMENTER =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

export type CategoryAppearanceInput = {
  color?: string | null
  emoji?: string | null
}

export const CATEGORY_COLOR_OPTIONS = [
  '#FF1744',
  '#FF6D00',
  '#FFD600',
  '#76FF03',
  '#00E676',
  '#00E5FF',
  '#2979FF',
  '#651FFF',
  '#D500F9',
  '#FF4081',
] as const

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLOR_OPTIONS[0]

export const normalizeCategoryColor = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  const normalized = value.trim()
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined
  if (normalized.length === 4) {
    const [hash, r, g, b] = normalized
    return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return normalized.toLowerCase()
}

export const normalizeCategoryEmoji = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (GRAPHEME_SEGMENTER) {
    for (const segment of GRAPHEME_SEGMENTER.segment(trimmed)) {
      return segment.segment
    }
  }
  return Array.from(trimmed)[0]
}

export const withCategoryEmoji = (category: Pick<Category, 'name' | 'emoji'>): string => {
  const emoji = normalizeCategoryEmoji(category.emoji)
  return emoji ? `${emoji} ${category.name}` : category.name
}

export const getFirstCategoryEmoji = (categories: Array<Pick<Category, 'emoji'>>): string | undefined => {
  for (const category of categories) {
    const emoji = normalizeCategoryEmoji(category.emoji)
    if (emoji) return emoji
  }
  return undefined
}

export const getFirstCategoryColor = (categories: Array<Pick<Category, 'color'>>): string | undefined => {
  for (const category of categories) {
    const color = normalizeCategoryColor(category.color)
    if (color) return color
  }
  return undefined
}

export const applyCategoryAppearance = (category: Category, appearance?: CategoryAppearanceInput): Category => {
  if (!appearance) return category
  const next: Category = { ...category }

  if ('color' in appearance) {
    const color = appearance.color === null ? undefined : normalizeCategoryColor(appearance.color)
    if (color) {
      next.color = color
    } else {
      delete next.color
    }
  }

  if ('emoji' in appearance) {
    const emoji = appearance.emoji === null ? undefined : normalizeCategoryEmoji(appearance.emoji)
    if (emoji) {
      next.emoji = emoji
    } else {
      delete next.emoji
    }
  }

  return next
}
