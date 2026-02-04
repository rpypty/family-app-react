import { Button } from '@mui/material'

type TagPickerInputProps = {
  label: string
  onClick: () => void
}

export function TagPickerInput({ label, onClick }: TagPickerInputProps) {
  return (
    <Button variant="outlined" fullWidth onClick={onClick}>
      {label}
    </Button>
  )
}
