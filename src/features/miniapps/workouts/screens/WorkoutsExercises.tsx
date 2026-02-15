import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { ExerciseMeta } from '../types'
import { ExerciseCard } from '../components/ExerciseCard'
import { exerciseKey } from '../utils/workout'

interface WorkoutsExercisesProps {
  exercises: string[]
  exerciseMeta: Record<string, ExerciseMeta>
  onUpsertMeta: (meta: ExerciseMeta) => void
  onRenameExercise: (from: string, to: string) => void
  onAddExercise: (name: string) => void
}

type Draft = {
  name: string
  note: string
  isWeightless: boolean
}

export function WorkoutsExercises({
  exercises,
  exerciseMeta,
  onUpsertMeta,
  onRenameExercise,
  onAddExercise,
}: WorkoutsExercisesProps) {
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ name: '', note: '', isWeightless: false })

  const list = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return exercises
      .filter((item) => item.toLowerCase().includes(normalized))
      .sort((a, b) => a.localeCompare(b))
  }, [exercises, query])

  const openCreate = () => {
    setEditingName(null)
    setDraft({ name: '', note: '', isWeightless: false })
    setDialogOpen(true)
  }

  const openEdit = (name: string) => {
    const key = exerciseKey(name)
    const meta = exerciseMeta[key]
    setEditingName(name)
    setDraft({
      name,
      note: meta?.note || '',
      isWeightless: meta?.isWeightless || false,
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    const trimmed = draft.name.trim()
    if (!trimmed) return
    if (editingName && exerciseKey(editingName) !== exerciseKey(trimmed)) {
      onRenameExercise(editingName, trimmed)
    }
    onAddExercise(trimmed)
    onUpsertMeta({
      name: trimmed,
      note: draft.note.trim(),
      isWeightless: draft.isWeightless,
      updatedAt: Date.now(),
    })
    setDialogOpen(false)
  }

  return (
    <Box sx={{ pb: 'calc(220px + env(safe-area-inset-bottom))' }}>
      <Stack spacing={2.5}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
          Упражнения
        </Typography>

        <TextField
          placeholder="Поиск упражнения"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
        />

        <Stack spacing={1.5}>
          {list.length === 0 ? (
            <Typography sx={{ color: 'var(--wk-muted)' }}>Нет упражнений</Typography>
          ) : (
            list.map((name) => {
              const meta = exerciseMeta[exerciseKey(name)]
              return (
                <ExerciseCard
                  key={name}
                  name={name}
                  note={meta?.note || ''}
                  isWeightless={meta?.isWeightless || false}
                  onEdit={() => openEdit(name)}
                />
              )
            })
          )}
        </Stack>
      </Stack>

      <Fab
        color="primary"
        aria-label="Добавить упражнение"
        onClick={openCreate}
        sx={{
          position: 'fixed',
          right: 20,
          bottom: 'calc(120px + env(safe-area-inset-bottom))',
          bgcolor: 'var(--wk-accent)',
          color: 'var(--wk-accent-contrast)',
          boxShadow: 'var(--wk-shadow)',
          '&:hover': { bgcolor: 'var(--wk-accent)' },
        }}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle>{editingName ? 'Редактировать упражнение' : 'Новое упражнение'}</DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'var(--wk-card)' }}>
          <Stack spacing={2}>
            <TextField
              label="Название"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Заметка"
              value={draft.note}
              onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <Switch
                checked={draft.isWeightless}
                onChange={(e) => setDraft((prev) => ({ ...prev, isWeightless: e.target.checked }))}
              />
              <Typography>Без веса</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
