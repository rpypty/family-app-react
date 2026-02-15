import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
  Button,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface ExercisePickerProps {
  open: boolean
  exercises: string[]
  onClose: () => void
  onSelect: (name: string) => void
  onCreate: (name: string) => void
}

export function ExercisePicker({ open, exercises, onClose, onSelect, onCreate }: ExercisePickerProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return exercises
    return exercises.filter((item) => item.toLowerCase().includes(normalized))
  }, [exercises, query])

  const canCreate = query.trim().length > 0 && !filtered.some((item) => item.toLowerCase() === query.trim().toLowerCase())

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          Добавить упражнение
        </Typography>
        <IconButton onClick={onClose} aria-label="Закрыть">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: 'var(--wk-card)' }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск или новое упражнение"
            fullWidth
          />

          {canCreate && (
            <Button
              variant="contained"
              onClick={() => {
                const name = query.trim()
                if (!name) return
                onCreate(name)
                onSelect(name)
                setQuery('')
              }}
            >
              Создать «{query.trim()}»
            </Button>
          )}

          <List disablePadding sx={{ bgcolor: 'var(--wk-ink-soft)', borderRadius: 'var(--wk-radius-sm)' }}>
            {filtered.length === 0 ? (
              <Typography variant="body2" sx={{ p: 2, color: 'var(--wk-muted)' }}>
                Ничего не найдено
              </Typography>
            ) : (
              filtered.map((item) => (
                <ListItemButton
                  key={item}
                  onClick={() => {
                    onSelect(item)
                    setQuery('')
                  }}
                >
                  {item}
                </ListItemButton>
              ))
            )}
          </List>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
