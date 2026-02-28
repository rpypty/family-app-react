import { Chip } from '@mui/material'

type QuickFilterChipProps = {
  label: string
  onClick: () => void
}

export function QuickFilterChip({ label, onClick }: QuickFilterChipProps) {
  return (
    <Chip
      label={label}
      onClick={onClick}
      clickable
      variant="outlined"
      size="small"
      sx={(theme) => ({
        height: 24,
        fontSize: 12,
        color: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.action.hover,
        '&:hover': {
          backgroundColor: theme.palette.action.selected,
        },
      })}
    />
  )
}
