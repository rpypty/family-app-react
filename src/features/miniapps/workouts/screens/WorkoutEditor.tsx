import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import type { ExerciseMeta, Workout, WorkoutSet } from '../types'
import {
  WorkoutExerciseGroupCard,
  type WorkoutExerciseGroup,
} from '../components/WorkoutExerciseGroupCard'
import { ExercisePicker } from '../components/ExercisePicker'
import { createWorkoutSet, exerciseKey, workoutEntries } from '../utils/workout'
import { formatDateLabel } from '../utils/date'

interface WorkoutEditorProps {
  workout: Workout
  allWorkouts: Workout[]
  exercises: string[]
  exerciseMeta: Record<string, ExerciseMeta>
  isExercisePickerOpen: boolean
  onOpenExercisePicker: () => void
  onCloseExercisePicker: () => void
  onAddExercise: (name: string) => void
  onSave: (workout: Workout) => void
  onDeleteWorkout: (workoutId: string) => void | Promise<void>
}

type ConfirmState =
  | { open: false }
  | { open: true; kind: 'set'; setId: string }
  | { open: true; kind: 'exercise'; exerciseName: string }
  | { open: true; kind: 'workout' }

export function WorkoutEditor({
  workout,
  allWorkouts,
  exercises,
  exerciseMeta,
  isExercisePickerOpen,
  onOpenExercisePicker,
  onCloseExercisePicker,
  onAddExercise,
  onSave,
  onDeleteWorkout,
}: WorkoutEditorProps) {
  const serialize = useCallback((n: string, d: string, s: WorkoutSet[]) => {
    return JSON.stringify({
      name: n.trim(),
      date: d,
      sets: s.map((set) => ({
        id: set.id,
        exercise: set.exercise,
        reps: set.reps,
        weightKg: set.weightKg,
      })),
    })
  }, [])

  const initialName = workout.name || ''
  const initialDate = workout.date
  const initialSets = [...(workout.sets || [])]

  const [name, setName] = useState(initialName)
  const [date, setDate] = useState(initialDate)
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets)
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false })
  const [isEditingHeader, setEditingHeader] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [swipedExerciseKey, setSwipedExerciseKey] = useState<string | null>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())
  const lastSaved = useRef(serialize(initialName, initialDate, initialSets))

  const groups = useMemo(() => {
    const map = new Map<string, WorkoutExerciseGroup>()
    for (const set of sets) {
      const display = set.exercise.trim()
      if (!display) continue
      const key = exerciseKey(display)
      const meta = exerciseMeta[key]
      const existing = map.get(key) || {
        key,
        name: meta?.name || display,
        isWeightless: meta?.isWeightless || false,
        note: meta?.note || '',
        sets: [],
      }
      existing.sets = [...existing.sets, set]
      map.set(key, existing)
    }
    
    const list = Array.from(map.values())
    
    // Calculate stats by comparing with previous workout
    const previousWorkout = allWorkouts
      .filter((w) => w.id !== workout.id && w.date < workout.date)
      .sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0))[0]

    if (previousWorkout) {
      const prevSets = previousWorkout.sets || []
      for (const g of list) {
        const prev = prevSets.filter((s) => exerciseKey(s.exercise) === g.key)
        if (prev.length === 0 || g.isWeightless) {
          g.stats = { avgWeightChange: null, volumeChange: null, prevAvgWeight: null, prevVolume: null }
          continue
        }
        const prevAvg = prev.reduce((sum, s) => sum + (s.weightKg || 0), 0) / prev.length
        const prevVol = prev.reduce((sum, s) => sum + (s.weightKg || 0) * (s.reps || 0), 0)
        const currAvg = g.sets.reduce((sum, s) => sum + (s.weightKg || 0), 0) / (g.sets.length || 1)
        const currVol = g.sets.reduce((sum, s) => sum + (s.weightKg || 0) * (s.reps || 0), 0)
        g.stats = {
          prevAvgWeight: prevAvg,
          prevVolume: prevVol,
          avgWeightChange: prevAvg > 0 ? ((currAvg - prevAvg) / prevAvg) * 100 : null,
          volumeChange: prevVol > 0 ? ((currVol - prevVol) / prevVol) * 100 : null,
        }
      }
    }
    
    return list
  }, [exerciseMeta, sets, allWorkouts, workout.id, workout.date])

  const history = useMemo(() => {
    const other = allWorkouts.filter((w) => w.id !== workout.id)
    return workoutEntries(other)
  }, [allWorkouts, workout.id])

  const suggestions = useMemo(() => {
    const map = new Map<
      string,
      { lastWeight: number | null; bestWeight: number | null; lastTs: number }
    >()
    for (const entry of history) {
      const key = exerciseKey(entry.exercise)
      const existing = map.get(key) || { lastWeight: null, bestWeight: null, lastTs: 0 }
      const weight = Number(entry.weightKg) || 0
      const timestamp = Date.parse(entry.date) || entry.createdAt || 0
      if (!existing.lastWeight || timestamp > existing.lastTs) {
        existing.lastTs = timestamp
        existing.lastWeight = weight
      }
      if (!existing.bestWeight || weight > existing.bestWeight) {
        existing.bestWeight = weight
      }
      map.set(key, existing)
    }
    return map
  }, [history])

  const handleUpdateSet = (setId: string, patch: Partial<WorkoutSet>) => {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)))
  }

  const handleRemoveSet = (setId: string) => {
    setSets((prev) => {
      const updated = prev.filter((s) => s.id !== setId)
      
      // Save with the new state
      setTimeout(() => {
        const snapshot = serialize(name, date, updated)
        if (snapshot === lastSaved.current) return
        lastSaved.current = snapshot
        onSave({
          ...workout,
          name: name.trim() || 'Тренировка',
          date,
          sets: updated,
        })
      }, 0)
      
      return updated
    })
  }

  const handleRemoveExercise = (exerciseName: string) => {
    const key = exerciseKey(exerciseName)
    setSets((prev) => {
      const updated = prev.filter((s) => exerciseKey(s.exercise) !== key)
      
      // Save with the new state
      setTimeout(() => {
        const snapshot = serialize(name, date, updated)
        if (snapshot === lastSaved.current) return
        lastSaved.current = snapshot
        onSave({
          ...workout,
          name: name.trim() || 'Тренировка',
          date,
          sets: updated,
        })
      }, 0)
      
      return updated
    })
  }

  const handleAddSetToExercise = (exerciseName: string) => {
    const exercise = exerciseName.trim()
    if (!exercise) return
    const newSet = createWorkoutSet({ exercise, reps: 8, weightKg: 0 })
    setSets((prev) => [...prev, newSet])
    onAddExercise(exercise)
  }

  // Manual save function (called on blur)
  const handleSave = useCallback(() => {
    const snapshot = serialize(name, date, sets)
    if (snapshot === lastSaved.current) return
    lastSaved.current = snapshot
    onSave({
      ...workout,
      name: name.trim() || 'Тренировка',
      date,
      sets,
    })
  }, [date, name, onSave, sets, workout, serialize])

  // Close swiped card when clicking outside
  useEffect(() => {
    if (!swipedExerciseKey) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      const swipedCard = cardRefs.current.get(swipedExerciseKey)
      
      // Check if click is outside the swiped card
      if (swipedCard && !swipedCard.contains(target)) {
        setSwipedExerciseKey(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [swipedExerciseKey])

  return (
    <Box sx={{ pb: 10 }}>
      <Stack spacing={2.5}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 'var(--wk-radius)',
            borderColor: 'var(--wk-border)',
            bgcolor: 'var(--wk-card)',
          }}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {isEditingHeader ? (
                  <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSave}
                    placeholder="Название тренировки"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: { fontSize: '1.8rem', fontWeight: 700, color: 'var(--wk-ink)' },
                    }}
                    fullWidth
                  />
                ) : (
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: 'var(--wk-ink)', flex: 1, minWidth: 0 }}
                    noWrap
                  >
                    {name || 'Тренировка'}
                  </Typography>
                )}
                <IconButton
                  size="small"
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                  sx={{ bgcolor: 'var(--wk-ink-soft)' }}
                >
                  <MoreVertRounded fontSize="small" />
                </IconButton>
              </Stack>
              {isEditingHeader ? (
                <TextField
                  type="date"
                  label="Дата"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onBlur={handleSave}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              ) : (
                <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                  {formatDateLabel(date)}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {groups.length === 0 ? (
          <Card variant="outlined" sx={{ borderRadius: 'var(--wk-radius)', borderColor: 'var(--wk-border)' }}>
            <CardContent>
              <Typography sx={{ color: 'var(--wk-muted)' }} textAlign="center">
                Добавьте упражнение и подходы
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {groups.map((group) => (
              <WorkoutExerciseGroupCard
                key={group.key}
                group={group}
                hint={suggestions.get(group.key)}
                isSwiped={swipedExerciseKey === group.key}
                onSwipeOpen={() => setSwipedExerciseKey(group.key)}
                onSwipeClose={() => setSwipedExerciseKey(null)}
                onConfirmDeleteExercise={() => {
                  setConfirm({ open: true, kind: 'exercise', exerciseName: group.name })
                }}
                onConfirmDeleteSet={(setId) => {
                  setConfirm({ open: true, kind: 'set', setId })
                }}
                onUpdateSet={handleUpdateSet}
                onSave={handleSave}
                onAddSet={() => handleAddSetToExercise(group.name)}
                cardRef={(element) => {
                  if (element) {
                    cardRefs.current.set(group.key, element)
                  } else {
                    cardRefs.current.delete(group.key)
                  }
                }}
              />
            ))}
          </Stack>
        )}

        <Fab
          color="primary"
          aria-label="Добавить упражнение"
          onClick={onOpenExercisePicker}
          sx={{
            position: 'fixed',
            right: 20,
            bottom: 'calc(24px + env(safe-area-inset-bottom))',
            bgcolor: 'var(--wk-accent)',
            color: 'var(--wk-accent-contrast)',
            boxShadow: 'var(--wk-shadow)',
            '&:hover': { bgcolor: 'var(--wk-accent)' },
          }}
        >
          <AddIcon />
        </Fab>
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setEditingHeader((prev) => !prev)
            setMenuAnchor(null)
          }}
        >
          {isEditingHeader ? 'Завершить редактирование' : 'Редактировать название'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            setConfirm({ open: true, kind: 'workout' })
          }}
          sx={{ color: 'error.main' }}
        >
          Удалить тренировку
        </MenuItem>
      </Menu>

      <ExercisePicker
        open={isExercisePickerOpen}
        exercises={exercises}
        onClose={onCloseExercisePicker}
        onCreate={(name) => {
          onAddExercise(name)
          handleAddSetToExercise(name)
          onCloseExercisePicker()
        }}
        onSelect={(name) => {
          handleAddSetToExercise(name)
          onCloseExercisePicker()
        }}
      />

      <Dialog open={confirm.open} onClose={() => setConfirm({ open: false })}>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--wk-card)' }}>
          <Typography variant="body2" sx={{ color: 'var(--wk-muted)' }}>
            {confirm.open && confirm.kind === 'exercise'
              ? `Удалить упражнение «${confirm.exerciseName}» и все его подходы?`
              : confirm.open && confirm.kind === 'workout'
                ? 'Удалить тренировку целиком?'
                : 'Удалить выбранный подход?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm({ open: false })}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!confirm.open) return
              if (confirm.kind === 'exercise') {
                handleRemoveExercise(confirm.exerciseName)
              } else if (confirm.kind === 'set') {
                handleRemoveSet(confirm.setId)
              } else {
                await onDeleteWorkout(workout.id)
              }
              setConfirm({ open: false })
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
