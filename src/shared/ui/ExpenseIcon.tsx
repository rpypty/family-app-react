import { Avatar } from '@mui/material'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'

type ExpenseIconProps = {
  size?: number
}

export function ExpenseIcon({ size = 36 }: ExpenseIconProps) {
  return (
    <Avatar
      aria-hidden
      sx={{
        width: size,
        height: size,
        bgcolor: 'action.hover',
        color: 'text.secondary',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <LocalOfferOutlinedIcon fontSize="small" />
    </Avatar>
  )
}
