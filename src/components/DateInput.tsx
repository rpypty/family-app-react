import { TextField } from '@mui/material'

type DateInputProps = {
  label: string
  value: string | null
  onClick: () => void
}

export function DateInput({ label, value, onClick }: DateInputProps) {
  return (
    <TextField
      label={label}
      value={value ?? ''}
      placeholder="—"
      onClick={onClick}
      InputProps={{ readOnly: true }}
      fullWidth
    />
  )
}
