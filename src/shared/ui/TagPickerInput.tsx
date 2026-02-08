import { Button } from '@mui/material'

type TagPickerInputProps = {
  label: string
  onClick: () => void
}

export function TagPickerInput({ label, onClick }: TagPickerInputProps) {
  return (
    <Button
      variant="outlined"
      color="inherit"
      fullWidth
      onClick={onClick}
      sx={(theme) => ({
        justifyContent: 'center',
        borderColor: theme.palette.divider,
        color: theme.palette.text.secondary,
        backgroundColor: 'transparent',
        '&:hover': {
          borderColor: theme.palette.text.secondary,
          backgroundColor: theme.palette.action.hover,
        },
      })}
    >
      {label}
    </Button>
  )
}
