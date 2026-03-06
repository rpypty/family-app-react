import { Avatar } from '@mui/material'
import { alpha } from '@mui/material/styles'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import { normalizeCategoryColor, normalizeCategoryEmoji } from '../lib/categoryAppearance'

type ExpenseIconProps = {
  size?: number
  color?: string | null
  emoji?: string | null
  showBorder?: boolean
  showBackground?: boolean
}

export function ExpenseIcon({
  size = 36,
  color,
  emoji,
  showBorder = true,
  showBackground = true,
}: ExpenseIconProps) {
  const normalizedColor = normalizeCategoryColor(color)
  const normalizedEmoji = normalizeCategoryEmoji(emoji)
  return (
    <Avatar
      aria-hidden
      sx={{
        width: size,
        height: size,
        bgcolor: showBackground ? (normalizedColor ? alpha(normalizedColor, 0.14) : 'action.hover') : 'transparent',
        color: normalizedColor ?? 'text.secondary',
        border: showBorder ? '1px solid' : 'none',
        borderColor: showBorder ? (normalizedColor ? alpha(normalizedColor, 0.5) : 'divider') : 'transparent',
        fontSize: Math.max(16, Math.round(size * 0.48)),
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {normalizedEmoji ? normalizedEmoji : <LocalOfferOutlinedIcon fontSize="small" />}
    </Avatar>
  )
}
