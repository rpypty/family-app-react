import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { WORKOUTS_ROUTES } from '../../../../app/routing/routes'
import type { ExerciseMeta } from '../types'
import { exerciseKey } from '../utils/workout'

interface ExerciseEditorProps {
  exerciseName?: string
  exerciseMeta: Record<string, ExerciseMeta>
  onAddExercise: (name: string) => void
  onUpsertMeta: (meta: ExerciseMeta) => void
  onRenameExercise: (from: string, to: string) => void
}

type Draft = {
  name: string
  note: string
  isWeightless: boolean
}

const resolveInitialDraft = (
  exerciseName: string | undefined,
  exerciseMeta: Record<string, ExerciseMeta>,
): Draft => {
  const isEditing = Boolean(exerciseName && exerciseName !== 'new')
  if (!isEditing || !exerciseName) {
    return { name: '', note: '', isWeightless: false }
  }

  const decodedName = decodeURIComponent(exerciseName)
  const key = exerciseKey(decodedName)
  const meta = exerciseMeta[key]

  return {
    name: decodedName,
    note: meta?.note || '',
    isWeightless: meta?.isWeightless || false,
  }
}

export function ExerciseEditor({
  exerciseName: exerciseNameProp,
  exerciseMeta,
  onAddExercise,
  onUpsertMeta,
  onRenameExercise,
}: ExerciseEditorProps) {
  const navigate = useNavigate()
  const exerciseName = exerciseNameProp
  const isEditing = Boolean(exerciseName && exerciseName !== 'new')
  const [draft, setDraft] = useState<Draft>(() => resolveInitialDraft(exerciseName, exerciseMeta))

  const handleSave = () => {
    const trimmed = draft.name.trim()
    if (!trimmed) return

    if (isEditing && exerciseName) {
      const decodedName = decodeURIComponent(exerciseName)
      if (exerciseKey(decodedName) !== exerciseKey(trimmed)) {
        onRenameExercise(decodedName, trimmed)
      }
    }

    onAddExercise(trimmed)
    onUpsertMeta({
      name: trimmed,
      note: draft.note.trim(),
      isWeightless: draft.isWeightless,
      updatedAt: Date.now(),
    })

    navigate(WORKOUTS_ROUTES.templates)
  }

  const handleCancel = () => {
    navigate(WORKOUTS_ROUTES.templates)
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
          {isEditing ? 'Редактировать упражнение' : 'Новое упражнение'}
        </Typography>

        {/* Form */}
        <Stack spacing={2.5}>
          <TextField
            label="Название"
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'var(--wk-card)',
                borderRadius: 'var(--wk-radius-sm)',
              },
            }}
          />

          <TextField
            label="Заметка"
            value={draft.note}
            onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
            fullWidth
            multiline
            minRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'var(--wk-card)',
                borderRadius: 'var(--wk-radius-sm)',
              },
            }}
          />

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              p: 2,
              bgcolor: 'var(--wk-card)',
              borderRadius: 'var(--wk-radius-sm)',
              border: '1px solid var(--wk-border)',
            }}
          >
            <Switch
              checked={draft.isWeightless}
              onChange={(e) => setDraft((prev) => ({ ...prev, isWeightless: e.target.checked }))}
            />
            <Box>
              <Typography fontWeight={600}>Без веса</Typography>
              <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                Упражнение выполняется без отягощений
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            fullWidth
            sx={{
              borderColor: 'var(--wk-border)',
              color: 'var(--wk-ink)',
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!draft.name.trim()}
            fullWidth
            sx={{
              bgcolor: 'var(--wk-accent)',
              color: 'var(--wk-accent-contrast)',
              '&:hover': { bgcolor: 'var(--wk-accent)' },
            }}
          >
            Сохранить
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
