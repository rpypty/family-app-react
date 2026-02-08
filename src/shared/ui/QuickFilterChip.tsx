import { Chip, Tooltip } from '@mui/material'

type QuickFilterChipProps = {
  label: string
  onClick: () => void
}

export function QuickFilterChip({ label, onClick }: QuickFilterChipProps) {
  return (
    <Tooltip title={label}>
      <Chip
        label={label}
        onClick={onClick}
        clickable
        color="primary"
        variant="outlined"
        size="small"
        sx={(theme) => ({
          height: 24,
          fontSize: 12,
          borderColor:
            theme.palette.mode === 'dark'
              ? theme.palette.primary.main
              : theme.palette.primary.light,
          backgroundColor:
            theme.palette.mode === 'dark'
              ? theme.palette.action.selected
              : theme.palette.action.hover,
        })}
      />
    </Tooltip>
  )
}
