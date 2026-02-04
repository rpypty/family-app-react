import { Chip } from '@mui/material'

type QuickFilterChipProps = {
  label: string
  onClick: () => void
}

export function QuickFilterChip({ label, onClick }: QuickFilterChipProps) {
  return <Chip label={label} onClick={onClick} clickable color="primary" variant="outlined" />
}
