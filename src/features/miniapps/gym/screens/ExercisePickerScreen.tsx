import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

interface ExercisePickerScreenProps {
  exercises: string[]
  onSelect: (name: string) => void
  onBack: () => void
}

export function ExercisePickerScreen({ exercises, onSelect, onBack }: ExercisePickerScreenProps) {
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')

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
          <Button onClick={onBack}>Назад</Button>
        </Box>

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск упражнения"
          fullWidth
        />

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                Добавить новое
              </Typography>
              <TextField
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Название упражнения"
                fullWidth
              />
              <Button
                variant="contained"
                onClick={() => customName.trim() && onSelect(customName.trim())}
                disabled={!customName.trim()}
              >
                Добавить
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={1}>
          {filtered.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Ничего не найдено
                </Typography>
              </CardContent>
            </Card>
          ) : (
            filtered.map((name) => (
              <Card
                key={name}
                variant="outlined"
                sx={{ borderRadius: 2, cursor: 'pointer' }}
                onClick={() => onSelect(name)}
              >
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {name}
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
