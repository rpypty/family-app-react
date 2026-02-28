import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Popover,
  Stack,
  Typography,
} from '@mui/material'
import { normalizeTagEmoji } from '../lib/tagAppearance'

type EmojiCategory = {
  id: string
  label: string
  icon: string
  emojis: string[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'popular',
    label: 'Популярные',
    icon: '⭐',
    emojis: [
      '🛒', '🏠', '🚰', '🚗', '📱', '💊', '👟', '🧹', '🍽️', '🎮', '💳', '📚',
      '🧸', '🎁', '✈️',
    ],
  },
  {
    id: 'smileys',
    label: 'Смайлы',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '🥹', '😊', '🙂', '😉', '😍', '😘', '😋',
      '😎', '🤓', '😇', '🤩', '😐', '😑', '😶', '🙄', '😏', '😴', '😬', '🤗',
      '🤔', '🫡', '🤐', '🤨', '😢', '😭', '😤', '😡', '🤯', '😱', '😳', '🥳',
    ],
  },
  {
    id: 'people',
    label: 'Люди',
    icon: '👍',
    emojis: [
      '👍', '👎', '👌', '✌️', '🤝', '👏', '🙌', '🙏', '💪', '🫶', '🫰', '👀',
      '🧠', '❤️', '🩷', '🧡', '💛', '💚', '🩵', '💙', '💜', '🤍', '🖤', '💔',
      '💯', '🔥', '✨', '💥', '🫂', '👨‍👩‍👧', '👨‍👩‍👦', '👨‍👩‍👧‍👦', '👩‍👩‍👧',
      '👨‍👨‍👦', '🧑‍💻', '👨‍🍳',
    ],
  },
  {
    id: 'animals',
    label: 'Животные',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉', '🦄', '🐝', '🦋', '🐢',
      '🐟', '🐠', '🐬', '🦭', '🐙', '🦀', '🦐', '🦑', '🐌', '🐞', '🕷️', '🐲',
    ],
  },
  {
    id: 'food',
    label: 'Еда',
    icon: '🍔',
    emojis: [
      '🍏', '🍎', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥑', '🥦',
      '🥕', '🌽', '🍞', '🥐', '🥨', '🧀', '🍳', '🥚', '🥓', '🍔', '🍟', '🍕',
      '🌭', '🥪', '🌮', '🌯', '🍜', '🍝', '🍣', '🍤', '🍩', '🍪', '🍫', '☕',
    ],
  },
  {
    id: 'travel',
    label: 'Путешествия',
    icon: '✈️',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🚓', '🚑', '🚒', '🚚', '🚜', '🏎️', '🚲',
      '🛴', '🏍️', '✈️', '🛫', '🛬', '🚆', '🚇', '🚊', '🚢', '⛵', '🛳️', '🚀',
      '🗺️', '🏝️', '🏖️', '🏕️', '🗽', '🗼', '🏰', '🏟️', '🌆', '🌃', '🌅', '🌉',
    ],
  },
  {
    id: 'activities',
    label: 'Активности',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🥊', '🥋', '🎯',
      '🎮', '🕹️', '🎲', '🧩', '♟️', '🎸', '🎹', '🥁', '🎤', '🎧', '🎬', '🎨',
      '📚', '🏋️', '🏃', '🚴', '🧘', '🏊', '⛷️', '🏂', '🛹', '🪁', '🎪', '🎉',
    ],
  },
  {
    id: 'objects',
    label: 'Предметы',
    icon: '💡',
    emojis: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '🎥', '📺', '📻', '🎛️', '🔋',
      '🔌', '💡', '🔦', '🕯️', '🧯', '🧰', '🪛', '🔧', '🔨', '⚙️', '🧲', '🧪',
      '💊', '🩺', '💰', '💳', '💎', '🧸', '🎁', '📦', '📌', '🗂️', '📝', '📎',
    ],
  },
  {
    id: 'symbols',
    label: 'Символы',
    icon: '✅',
    emojis: [
      '✅', '☑️', '✔️', '❌', '❎', '➕', '➖', '✖️', '➗', '♻️', '⚠️', '🚫',
      '🔞', '❗', '❓', '💤', '💢', '💬', '🗯️', '💭', '🔔', '🔕', '🔒', '🔓',
      '🔐', '⭐', '🌟', '💫', '📌', '🔖', '🎯', '🏁', '🚩', '⚡', '☀️', '🌙',
    ],
  },
]

const DEFAULT_CATEGORY_ID = EMOJI_CATEGORIES[0]?.id ?? 'smileys'

type EmojiPickerFieldProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

export function EmojiPickerField({
  value,
  onChange,
  label = 'Эмоджи',
  placeholder = 'Выбрать эмоджи',
  disabled = false,
}: EmojiPickerFieldProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string>(DEFAULT_CATEGORY_ID)
  const currentEmoji = normalizeTagEmoji(value) ?? ''
  const isOpen = Boolean(anchorEl)

  const activeCategory = useMemo(
    () => EMOJI_CATEGORIES.find((category) => category.id === activeCategoryId) ?? EMOJI_CATEGORIES[0],
    [activeCategoryId],
  )

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Button
        variant="outlined"
        color="inherit"
        disabled={disabled}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={(theme) => ({
          justifyContent: 'space-between',
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
          minHeight: 40,
          px: 1.25,
          '&:hover': {
            borderColor: theme.palette.text.secondary,
            backgroundColor: theme.palette.action.hover,
          },
        })}
      >
        <Box
          component="span"
          sx={{
            fontSize: currentEmoji ? '1.25rem' : '0.95rem',
            lineHeight: 1.15,
          }}
        >
          {currentEmoji || placeholder}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {currentEmoji ? 'Сменить' : 'Выбрать'}
        </Typography>
      </Button>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              width: 332,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 2,
            },
          },
        }}
      >
        <Box sx={{ p: 1.25 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {EMOJI_CATEGORIES.map((category) => (
                <Chip
                  key={category.id}
                  size="small"
                  label={`${category.icon} ${category.label}`}
                  color={category.id === activeCategory.id ? 'primary' : 'default'}
                  variant={category.id === activeCategory.id ? 'filled' : 'outlined'}
                  onClick={() => setActiveCategoryId(category.id)}
                />
              ))}
            </Stack>

            <Box
              sx={{
                maxHeight: 220,
                overflowY: 'auto',
                pr: 0.25,
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                  gap: 0.4,
                }}
              >
                {activeCategory.emojis.map((emoji) => {
                  const isActive = emoji === currentEmoji
                  return (
                    <Box
                      key={`${activeCategory.id}-${emoji}`}
                      component="button"
                      type="button"
                      onClick={() => {
                        onChange(emoji)
                        setAnchorEl(null)
                      }}
                      sx={(theme) => ({
                        width: 36,
                        height: 36,
                        border: 'none',
                        borderRadius: 1,
                        backgroundColor: isActive
                          ? theme.palette.action.selected
                          : 'transparent',
                        fontSize: '1.2rem',
                        lineHeight: 1,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      })}
                    >
                      {emoji}
                    </Box>
                  )
                })}
              </Box>
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button
                size="small"
                color="inherit"
                disabled={!currentEmoji}
                onClick={() => {
                  onChange('')
                  setAnchorEl(null)
                }}
              >
                Очистить
              </Button>
              <Button size="small" onClick={() => setAnchorEl(null)}>
                Закрыть
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Popover>
    </Stack>
  )
}
