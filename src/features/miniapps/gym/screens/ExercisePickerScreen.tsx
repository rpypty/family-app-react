import { useMemo, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import {
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import AddIcon from '@mui/icons-material/Add'

interface ExercisePickerScreenProps {
  exercises: string[]
  onSelect: (name: string) => void
}

export function ExercisePickerScreen({ exercises, onSelect }: ExercisePickerScreenProps) {
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [isCreateOpen, setCreateOpen] = useState(false)
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter((e) => e.toLowerCase().includes(q))
  }, [exercises, query])

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            Выберите упражнение
          </Typography>
        </Box>

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск упражнения"
          fullWidth
        />

        {filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Ничего не найдено
          </Typography>
        ) : (
          <List disablePadding sx={{ border: 1, borderColor: 'divider' }}>
            {filtered.map((name, index) => (
              <Box key={name}>
                <ListItemButton onClick={() => onSelect(name)}>
                  <ListItemText
                    primary={name}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </ListItemButton>
                {index < filtered.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Stack>

      <Fab
        variant="extended"
        color="primary"
        aria-label="Создать новое"
        onClick={() => setCreateOpen(true)}
        sx={{ position: 'fixed', right: 16, bottom: 60 }}
      >
        <AddIcon />
        <Box sx={{ ml: 1, fontWeight: 600 }}>Создать новое</Box>
      </Fab>

      <Dialog
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
      >
        <DialogTitle>Создать новое упражнение</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Название упражнения"
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!customName.trim()) return
              onSelect(customName.trim())
              setCustomName('')
              setCreateOpen(false)
            }}
            disabled={!customName.trim()}
          >
            Создать новое
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
