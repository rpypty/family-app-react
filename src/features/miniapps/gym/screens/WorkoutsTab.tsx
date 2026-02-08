import { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { TemplateExercise, Workout } from '../types'
import { formatWorkoutSet } from '../utils/metricsUtils'
import { exerciseKey } from '../api/gymStore'

type TemplateDraft = {
  name: string
  exercises: TemplateExercise[]
}

interface WorkoutsTabProps {
  sortedWorkouts: Workout[]
  onDeleteWorkout: (workoutId: string) => void
  onDeleteWorkoutSet: (workoutId: string, setId: string) => void
  exerciseOptions: string[]
  templates: Array<{ id: string; name: string; exercises: TemplateExercise[] }>
  onCreateTemplate: (name: string, exercises: TemplateExercise[]) => void
  onUpdateTemplate: (templateId: string, name: string, exercises: TemplateExercise[]) => void
  onDeleteTemplate: (templateId: string) => void
  onUseTemplate: (templateId: string) => void
}

export function WorkoutsTab({
  sortedWorkouts,
  onDeleteWorkout,
  onDeleteWorkoutSet,
  exerciseOptions,
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onUseTemplate,
}: WorkoutsTabProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TemplateDraft>({ name: '', exercises: [] })
  const [exerciseQuery, setExerciseQuery] = useState('')

  const parsedExercises = useMemo(() => {
    const raw = (draft.exercises || []).map((x) => String(x?.name || '').trim()).filter(Boolean)
    const seen = new Set<string>()
    const out: string[] = []
    for (const ex of raw) {
      const k = exerciseKey(ex)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(ex)
    }
    return out
  }, [draft.exercises])

  const canSave = draft.name.trim().length > 0 && parsedExercises.length > 0

  const handleSave = () => {
    if (!canSave) return
    const seen = new Set<string>()
    const exercises: TemplateExercise[] = []
    for (const ex of draft.exercises || []) {
      const name = String(ex?.name || '').trim()
      if (!name) continue
      const k = exerciseKey(name)
      if (seen.has(k)) continue
      seen.add(k)
      exercises.push({
        name,
        reps: Math.max(1, Number(ex?.reps) || 0) || 8,
        sets: Math.max(1, Number(ex?.sets) || 0) || 3,
      })
    }

    if (editingId) {
      onUpdateTemplate(editingId, draft.name.trim(), exercises)
    } else {
      onCreateTemplate(draft.name.trim(), exercises)
    }
    setDraft({ name: '', exercises: [] })
    setExerciseQuery('')
    setEditingId(null)
    setOpen(false)
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setDraft({ name: '', exercises: [] })
    setExerciseQuery('')
    setOpen(true)
  }

  const handleOpenEdit = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    setEditingId(t.id)
    setDraft({
      name: t.name,
      exercises: (t.exercises || []).map((e) => ({
        name: String(e.name || '').trim(),
        reps: Math.max(1, Number(e.reps) || 0) || 8,
        sets: Math.max(1, Number(e.sets) || 0) || 3,
      })),
    })
    setExerciseQuery('')
    setOpen(true)
  }

  const handleAddExercise = (exerciseName: string) => {
    const name = (exerciseName || '').trim()
    if (!name) return
    const k = exerciseKey(name)
    const exists = draft.exercises.some((e) => exerciseKey(e.name) === k)
    if (exists) return
    setDraft({
      ...draft,
      exercises: [...draft.exercises, { name, reps: 8, sets: 3 }],
    })
    setExerciseQuery('')
  }

  const handleRemoveExercise = (index: number) => {
    setDraft({
      ...draft,
      exercises: draft.exercises.filter((_, i) => i !== index),
    })
  }

  const handleUpdateExercise = (index: number, field: 'reps' | 'sets', value: number) => {
    const updated = [...draft.exercises]
    updated[index] = { ...updated[index], [field]: Math.max(1, value) }
    setDraft({ ...draft, exercises: updated })
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            Шаблоны и история
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={handleOpenCreate}
            sx={{ borderRadius: 2 }}
          >
            Шаблон
          </Button>
        </Box>

        {templates.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Шаблоны тренировок
              </Typography>
              <Stack spacing={1}>
                {templates.map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={700} noWrap>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.exercises.length} упр.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => onUseTemplate(t.id)}
                      sx={{ borderRadius: 1.5, fontWeight: 700 }}
                    >
                      Начать
                    </Button>
                    <IconButton size="small" onClick={() => handleOpenEdit(t.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDeleteTemplate(t.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Typography variant="subtitle2" fontWeight={700}>
          История тренировок
        </Typography>

        {sortedWorkouts.length === 0 ? (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Пока нет записанных тренировок
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1}>
            {sortedWorkouts.map((w) => (
              <Accordion
                key={w.id}
                disableGutters
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:before': { display: 'none' },
                  overflow: 'hidden',
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1, pr: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {w.name || 'Тренировка'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {w.date} · {w.sets?.length || 0} подх.
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteWorkout(w.id)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pt: 0 }}>
                  <List dense disablePadding>
                    {(w.sets || []).map((s) => (
                      <ListItem
                        key={s.id}
                        disableGutters
                        secondaryAction={
                          <IconButton
                            edge="end"
                            size="small"
                            color="error"
                            onClick={() => onDeleteWorkoutSet(w.id, s.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={s.exercise}
                          secondary={formatWorkoutSet(s)}
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Редактировать шаблон' : 'Новый шаблон'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Название"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Упражнения
              </Typography>
              <Autocomplete
                freeSolo
                options={exerciseOptions}
                inputValue={exerciseQuery}
                onInputChange={(_, val) => setExerciseQuery(val)}
                onChange={(_, val) => {
                  if (typeof val === 'string') handleAddExercise(val)
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Добавить упражнение" size="small" />
                )}
              />
            </Box>

            {draft.exercises.length > 0 && (
              <Stack spacing={1}>
                {draft.exercises.map((ex, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                      {ex.name}
                    </Typography>
                    <TextField
                      type="number"
                      value={ex.sets}
                      onChange={(e) => handleUpdateExercise(index, 'sets', Number(e.target.value))}
                      size="small"
                      label="Подх"
                      sx={{ width: 70 }}
                    />
                    <TextField
                      type="number"
                      value={ex.reps}
                      onChange={(e) => handleUpdateExercise(index, 'reps', Number(e.target.value))}
                      size="small"
                      label="Повт"
                      sx={{ width: 70 }}
                    />
                    <IconButton size="small" color="error" onClick={() => handleRemoveExercise(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={!canSave} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
