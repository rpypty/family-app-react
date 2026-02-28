import type { Tag } from '../types'

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const GRAPHEME_SEGMENTER =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

export type TagAppearanceInput = {
  color?: string | null
  emoji?: string | null
}

export const TAG_COLOR_OPTIONS = [
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

export const DEFAULT_TAG_COLOR = TAG_COLOR_OPTIONS[0]

export const normalizeTagColor = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  const normalized = value.trim()
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined
  if (normalized.length === 4) {
    const [hash, r, g, b] = normalized
    return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return normalized.toLowerCase()
}

export const normalizeTagEmoji = (value: string | null | undefined): string | undefined => {
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

export const withTagEmoji = (tag: Pick<Tag, 'name' | 'emoji'>): string => {
  const emoji = normalizeTagEmoji(tag.emoji)
  return emoji ? `${emoji} ${tag.name}` : tag.name
}

export const getFirstTagEmoji = (tags: Array<Pick<Tag, 'emoji'>>): string | undefined => {
  for (const tag of tags) {
    const emoji = normalizeTagEmoji(tag.emoji)
    if (emoji) return emoji
  }
  return undefined
}

export const getFirstTagColor = (tags: Array<Pick<Tag, 'color'>>): string | undefined => {
  for (const tag of tags) {
    const color = normalizeTagColor(tag.color)
    if (color) return color
  }
  return undefined
}

export const applyTagAppearance = (tag: Tag, appearance?: TagAppearanceInput): Tag => {
  if (!appearance) return tag
  const next: Tag = { ...tag }

  if ('color' in appearance) {
    const color = appearance.color === null ? undefined : normalizeTagColor(appearance.color)
    if (color) {
      next.color = color
    } else {
      delete next.color
    }
  }

  if ('emoji' in appearance) {
    const emoji = appearance.emoji === null ? undefined : normalizeTagEmoji(appearance.emoji)
    if (emoji) {
      next.emoji = emoji
    } else {
      delete next.emoji
    }
  }

  return next
}
