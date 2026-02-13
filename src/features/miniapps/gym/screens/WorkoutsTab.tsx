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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { TemplateExercise, Workout, WorkoutSet } from '../types'
import { formatWorkoutSet } from '../utils/metricsUtils'
import { createWorkoutSet, exerciseKey } from '../api/gymStore'

type TemplateDraft = {
  name: string
  exercises: TemplateExercise[]
}

interface WorkoutsTabProps {
  sortedWorkouts: Workout[]
  onDeleteWorkout: (workoutId: string) => void
  onDeleteWorkoutSet: (workoutId: string, setId: string) => void
  onUpdateWorkout: (workoutId: string, name: string, date: string, sets: WorkoutSet[]) => void
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
  onUpdateWorkout,
  exerciseOptions,
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onUseTemplate,
}: WorkoutsTabProps) {
  const [removingIds, setRemovingIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TemplateDraft>({ name: '', exercises: [] })
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [exerciseValue, setExerciseValue] = useState<string | null>(null)
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editingWorkoutName, setEditingWorkoutName] = useState('')
  const [editingWorkoutDate, setEditingWorkoutDate] = useState('')
  const [editingWorkoutSets, setEditingWorkoutSets] = useState<WorkoutSet[]>([])
  const [newSetExercise, setNewSetExercise] = useState('')
  const [newSetWeight, setNewSetWeight] = useState('')
  const [newSetReps, setNewSetReps] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

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

  const canSave = (draft.name.trim().length > 0 || exerciseQuery.trim().length > 0) && parsedExercises.length > 0

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of sortedWorkouts) {
      const key = String(w.date || '').trim()
      if (!key) continue
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }, [sortedWorkouts])

  const calendarLabel = useMemo(() => {
    const label = calendarMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [calendarMonth])

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const first = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const offset = (first.getDay() + 6) % 7

    const cells: Array<{ key: string; day?: number; iso?: string; count?: number }> = []
    for (let i = 0; i < offset; i += 1) {
      cells.push({ key: `empty-${i}` })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        key: iso,
        day,
        iso,
        count: workoutsByDate.get(iso) || 0,
      })
    }
    return cells
  }, [calendarMonth, workoutsByDate])

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

    const nameToUse = draft.name.trim() || exerciseQuery.trim()
    if (editingId) {
      onUpdateTemplate(editingId, nameToUse, exercises)
    } else {
      onCreateTemplate(nameToUse, exercises)
    }
    setDraft({ name: '', exercises: [] })
    setExerciseQuery('')
    setExerciseValue(null)
    setEditingId(null)
    setOpen(false)
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setDraft({ name: '', exercises: [] })
    setExerciseQuery('')
    setExerciseValue(null)
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
    setExerciseValue(null)
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
      name: draft.name.trim() || name,
      exercises: [...draft.exercises, { name, reps: 8, sets: 3 }],
    })
    setExerciseQuery('')
    setExerciseValue(null)
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

  const handleOpenWorkoutEdit = (workout: Workout) => {
    setEditingWorkoutId(workout.id)
    setEditingWorkoutName(workout.name || '')
    setEditingWorkoutDate(workout.date)
    setEditingWorkoutSets([...(workout.sets || [])])
    setNewSetExercise('')
    setNewSetWeight('')
    setNewSetReps('')
  }

  const handleSaveWorkoutEdit = () => {
    if (!editingWorkoutId) return
    onUpdateWorkout(editingWorkoutId, editingWorkoutName, editingWorkoutDate, editingWorkoutSets)
    setEditingWorkoutId(null)
  }

  const handleUpdateWorkoutSet = (index: number, field: 'exercise' | 'weightKg' | 'reps', value: string) => {
    setEditingWorkoutSets((prev) => {
      const next = [...prev]
      const current = next[index]
      if (!current) return prev
      next[index] = {
        ...current,
        exercise: field === 'exercise' ? value : current.exercise,
        weightKg: field === 'weightKg' ? Number(value) || 0 : current.weightKg,
        reps: field === 'reps' ? Number(value) || 0 : current.reps,
      }
      return next
    })
  }

  const handleRemoveWorkoutSet = (index: number) => {
    setEditingWorkoutSets((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddWorkoutSet = () => {
    const name = newSetExercise.trim()
    if (!name) return
    const w = Number(newSetWeight) || 0
    const r = Number(newSetReps) || 0
    if (r <= 0) return
    const newSet = createWorkoutSet({ exercise: name, weightKg: w, reps: r })
    setEditingWorkoutSets((prev) => [...prev, newSet])
    setNewSetExercise('')
    setNewSetWeight('')
    setNewSetReps('')
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

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Календарь тренировок
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() =>
                    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2" fontWeight={600}>
                  {calendarLabel}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() =>
                    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.75,
                alignItems: 'center',
                mb: 1,
              }}
            >
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                <Typography
                  key={d}
                  variant="caption"
                  color="text.secondary"
                  textAlign="center"
                  fontWeight={600}
                >
                  {d}
                </Typography>
              ))}
              {calendarCells.map((cell) => {
                if (!cell.day) {
                  return <Box key={cell.key} sx={{ height: 32 }} />
                }
                const hasWorkout = (cell.count || 0) > 0
                return (
                  <Box
                    key={cell.key}
                    sx={{
                      height: 32,
                      borderRadius: 1,
                      bgcolor: hasWorkout ? 'primary.main' : 'action.hover',
                      color: hasWorkout ? 'primary.contrastText' : 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                    title={hasWorkout ? `Тренировок: ${cell.count}` : undefined}
                  >
                    {cell.day}
                    {hasWorkout && (
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 4,
                          bottom: 4,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: 'secondary.main',
                        }}
                      />
                    )}
                  </Box>
                )
              })}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Цветом отмечены дни с тренировками.
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="subtitle2" fontWeight={700}>
          История тренировок
        </Typography>

        {sortedWorkouts.filter((w) => !removingIds.includes(w.id)).length === 0 ? (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Пока нет записанных тренировок
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1}>
            {sortedWorkouts.filter((w) => !removingIds.includes(w.id)).map((w) => (
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
                      onClick={async (e) => {
                        e.stopPropagation()
                        setRemovingIds((prev) => [...prev, w.id])
                        try {
                          const res: any = onDeleteWorkout(w.id)
                          if (res && typeof res.then === 'function') await res
                        } finally {
                          setRemovingIds((prev) => prev.filter((id) => id !== w.id))
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenWorkoutEdit(w)
                      }}
                    >
                      <EditIcon fontSize="small" />
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
                value={exerciseValue}
                inputValue={exerciseQuery}
                onInputChange={(_, val) => setExerciseQuery(val)}
                filterOptions={(options, params) => {
                  const filtered = options.filter((opt) =>
                    String(opt).toLowerCase().includes(params.inputValue.toLowerCase())
                  )
                  if (params.inputValue !== '' && !filtered.some((opt) => String(opt) === params.inputValue)) {
                    filtered.push(`Создать новый: ${params.inputValue}`)
                  }
                  return filtered
                }}
                onChange={(_, val) => {
                  if (typeof val === 'string') {
                    const prefix = 'Создать новый: '
                    const name = val.startsWith(prefix) ? val.slice(prefix.length) : val
                    handleAddExercise(name)
                  }
                  setExerciseValue(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && exerciseQuery.trim()) {
                    e.preventDefault()
                    handleAddExercise(exerciseQuery)
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Добавить упражнение"
                    size="small"
                    helperText="Enter — добавить, поле очищается автоматически"
                  />
                )}
              />
            </Box>

            {draft.exercises.length > 0 && (
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 90px 90px 40px' },
                      gap: 1,
                      mb: 1,
                      color: 'text.secondary',
                      fontSize: 12,
                      fontWeight: 600,
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>Упражнение</Box>
                    <Box>Подх.</Box>
                    <Box>Повт.</Box>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
                  </Box>
                  <Stack spacing={1}>
                    {draft.exercises.map((ex, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 90px 90px 40px' },
                          gap: 1,
                          alignItems: 'center',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2,
                          px: 1.5,
                          py: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                        >
                          {ex.name}
                        </Typography>
                        <TextField
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleUpdateExercise(index, 'sets', Number(e.target.value))}
                          size="small"
                          label="Подх"
                        />
                        <TextField
                          type="number"
                          value={ex.reps}
                          onChange={(e) => handleUpdateExercise(index, 'reps', Number(e.target.value))}
                          size="small"
                          label="Повт"
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveExercise(index)}
                          sx={{ justifySelf: { xs: 'end', sm: 'auto' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
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

      <Dialog
        open={Boolean(editingWorkoutId)}
        onClose={() => setEditingWorkoutId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Редактировать тренировку</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Название"
              value={editingWorkoutName}
              onChange={(e) => setEditingWorkoutName(e.target.value)}
              fullWidth
            />
            <TextField
              type="date"
              label="Дата"
              value={editingWorkoutDate}
              onChange={(e) => setEditingWorkoutDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Подходы
              </Typography>
              {editingWorkoutSets.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Пока нет подходов
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {editingWorkoutSets.map((s, index) => (
                    <Box
                      key={s.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1.4fr 90px 90px 40px' },
                        gap: 1,
                        alignItems: 'center',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <TextField
                        value={s.exercise}
                        onChange={(e) => handleUpdateWorkoutSet(index, 'exercise', e.target.value)}
                        size="small"
                        label="Упражнение"
                      />
                      <TextField
                        type="number"
                        value={s.weightKg}
                        onChange={(e) => handleUpdateWorkoutSet(index, 'weightKg', e.target.value)}
                        size="small"
                        label="Вес"
                      />
                      <TextField
                        type="number"
                        value={s.reps}
                        onChange={(e) => handleUpdateWorkoutSet(index, 'reps', e.target.value)}
                        size="small"
                        label="Повт"
                      />
                      <IconButton size="small" color="error" onClick={() => handleRemoveWorkoutSet(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Добавить подход
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1.4fr 90px 90px auto' },
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <TextField
                  value={newSetExercise}
                  onChange={(e) => setNewSetExercise(e.target.value)}
                  size="small"
                  label="Упражнение"
                />
                <TextField
                  type="number"
                  value={newSetWeight}
                  onChange={(e) => setNewSetWeight(e.target.value)}
                  size="small"
                  label="Вес"
                />
                <TextField
                  type="number"
                  value={newSetReps}
                  onChange={(e) => setNewSetReps(e.target.value)}
                  size="small"
                  label="Повт"
                />
                <Button
                  variant="contained"
                  onClick={handleAddWorkoutSet}
                  disabled={!newSetExercise.trim() || !newSetReps}
                >
                  Добавить
                </Button>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingWorkoutId(null)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSaveWorkoutEdit}
            disabled={!editingWorkoutDate.trim()}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
