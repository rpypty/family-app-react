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
  Divider,
  Fab,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import type { ExerciseMeta, Workout, WorkoutSet } from '../types'
import { ExercisePicker } from '../components/ExercisePicker'
import { WeightChips } from '../components/WeightChips'
import { createWorkoutSet, exerciseKey, volumeForSet, workoutEntries } from '../utils/workout'
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

type ExerciseGroup = {
  key: string
  name: string
  isWeightless: boolean
  note: string
  sets: WorkoutSet[]
  stats?: {
    avgWeightChange?: number | null
    volumeChange?: number | null
    prevAvgWeight?: number | null
    prevVolume?: number | null
  }
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
  const [name, setName] = useState(workout.name || '')
  const [date, setDate] = useState(workout.date)
  const [sets, setSets] = useState<WorkoutSet[]>([...(workout.sets || [])])
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false })
  const [isEditingHeader, setEditingHeader] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [swipedExerciseKey, setSwipedExerciseKey] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHydrating = useRef(false)
  const lastSaved = useRef<string>('')

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

  const workoutSignature = useMemo(
    () => serialize(workout.name || '', workout.date, workout.sets || []),
    [workout]
  )

  useEffect(() => {
    isHydrating.current = true
    setName(workout.name || '')
    setDate(workout.date)
    setSets([...(workout.sets || [])])
    setEditingHeader(false)
    lastSaved.current = workoutSignature
    const t = setTimeout(() => {
      isHydrating.current = false
    }, 0)
    return () => clearTimeout(t)
  }, [workoutSignature])

  const groups = useMemo(() => {
    const map = new Map<string, ExerciseGroup>()
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
    setSets((prev) => prev.filter((s) => s.id !== setId))
  }

  const handleRemoveExercise = (exerciseName: string) => {
    const key = exerciseKey(exerciseName)
    setSets((prev) => prev.filter((s) => exerciseKey(s.exercise) !== key))
  }

  const handleAddSetToExercise = (exerciseName: string) => {
    const exercise = exerciseName.trim()
    if (!exercise) return
    const newSet = createWorkoutSet({ exercise, reps: 8, weightKg: 0 })
    setSets((prev) => [...prev, newSet])
    onAddExercise(exercise)
  }

  useEffect(() => {
    if (isHydrating.current) return
    const snapshot = serialize(name, date, sets)
    if (snapshot === lastSaved.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      lastSaved.current = snapshot
      onSave({
        ...workout,
        name: name.trim() || 'Тренировка',
        date,
        sets,
      })
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
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
            {groups.map((group) => {
              const hint = suggestions.get(group.key)
              const volume = group.sets.reduce(
                (sum, set) => sum + volumeForSet(set, group.isWeightless),
                0
              )
              return (
                <Box 
                  key={group.key} 
                  sx={{ position: 'relative' }}
                  ref={(el: HTMLDivElement | null) => {
                    if (el) {
                      cardRefs.current.set(group.key, el)
                    } else {
                      cardRefs.current.delete(group.key)
                    }
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'var(--wk-radius)',
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      pr: 2,
                      color: 'error.contrastText',
                      opacity: swipedExerciseKey === group.key ? 1 : 0,
                      transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                      cursor: 'pointer',
                      pointerEvents: swipedExerciseKey === group.key ? 'auto' : 'none',
                    }}
                    onClick={() => {
                      setConfirm({ open: true, kind: 'exercise', exerciseName: group.name })
                      setSwipedExerciseKey(null)
                    }}
                  >
                    <DeleteOutlineRounded sx={{ fontSize: 36 }} />
                  </Box>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 'var(--wk-radius)',
                      borderColor: 'var(--wk-border)',
                      bgcolor: 'var(--wk-card)',
                      transform: swipedExerciseKey === group.key ? 'translateX(-80px)' : 'translateX(0)',
                      transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                      position: 'relative',
                    }}
                    style={{ touchAction: 'pan-y' }}
                    onTouchStart={(e) => {
                      touchStartX.current = e.touches[0]?.clientX ?? null
                    }}
                    onTouchEnd={(e) => {
                      const startX = touchStartX.current
                      const endX = e.changedTouches[0]?.clientX
                      touchStartX.current = null
                      
                      if (startX !== null && endX !== undefined) {
                        const delta = startX - endX
                        // Swipe left to reveal delete
                        if (delta > 80) {
                          setSwipedExerciseKey(group.key)
                        }
                        // Swipe right to close
                        else if (delta < -40 && swipedExerciseKey === group.key) {
                          setSwipedExerciseKey(null)
                        }
                      }
                    }}
                  >
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: 'var(--wk-ink)' }}>
                            {group.name}
                          </Typography>
                          {group.note ? (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'var(--wk-muted)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {group.note}
                            </Typography>
                          ) : null}
                          {group.isWeightless ? (
                            <Typography variant="caption" color="warning.main">
                              Без веса
                            </Typography>
                          ) : null}
                        </Stack>
                      </Stack>

                      {group.stats && !group.isWeightless ? (
                        <Typography variant="caption" sx={{ color: 'var(--wk-muted)', display: 'block' }}>
                          Вес:{' '}
                          <Box component="span" sx={{ color: deltaColor(group.stats.avgWeightChange) }}>
                            {formatPercent(group.stats.avgWeightChange)}
                          </Box>
                          {' '}• Пред. вес:{' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {group.stats.prevAvgWeight ? `${group.stats.prevAvgWeight.toFixed(1)} кг` : '—'}
                          </Box>
                          <br />
                          Объем:{' '}
                          <Box component="span" sx={{ color: deltaColor(group.stats.volumeChange) }}>
                            {formatPercent(group.stats.volumeChange)}
                          </Box>
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                          Объём: {Math.round(volume)}
                        </Typography>
                      )}

                      <Typography variant="caption" sx={{ color: 'var(--wk-muted)', fontStyle: 'italic' }}>
                        Свайпните влево для удаления
                      </Typography>

                      <Stack spacing={1}>
                        {group.sets.map((set) => (
                          <Stack key={set.id} spacing={0.75}>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: group.isWeightless
                                  ? { xs: '1fr auto', sm: '140px auto' }
                                  : { xs: '1fr 1fr auto', sm: '120px 120px auto' },
                                gap: 1,
                                alignItems: 'center',
                              }}
                            >
                              <TextField
                                label="Повт."
                                type="number"
                                value={set.reps}
                                onChange={(e) => handleUpdateSet(set.id, { reps: Number(e.target.value) || 0 })}
                                size="small"
                                sx={{ minWidth: 0 }}
                              />
                              {!group.isWeightless && (
                                <TextField
                                  label="Вес"
                                  type="number"
                                  value={set.weightKg || ''}
                                  onChange={(e) => handleUpdateSet(set.id, { weightKg: Number(e.target.value) || 0 })}
                                  size="small"
                                  sx={{ minWidth: 0 }}
                                />
                              )}
                              <IconButton
                                size="small"
                                onClick={() => setConfirm({ open: true, kind: 'set', setId: set.id })}
                                sx={{
                                  bgcolor: 'var(--wk-ink-soft)',
                                  width: 28,
                                  height: 28,
                                  justifySelf: 'end',
                                  flexShrink: 0,
                                }}
                              >
                                <CloseRounded fontSize="small" sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Box>
                            {!group.isWeightless && hint && !set.weightKg ? (
                              <WeightChips
                                lastWeight={hint.lastWeight}
                                bestWeight={hint.bestWeight}
                                onSelect={(weight) => handleUpdateSet(set.id, { weightKg: weight })}
                              />
                            ) : null}
                            <Divider />
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleAddSetToExercise(group.name)}
                        startIcon={<AddIcon />}
                        sx={{
                          fontWeight: 700,
                          alignSelf: 'flex-start',
                          textTransform: 'none',
                          borderRadius: 999,
                          color: 'var(--wk-accent)',
                          bgcolor: 'transparent',
                          border: '1px solid transparent',
                          px: 1.5,
                          '&:hover': {
                            bgcolor: 'transparent',
                          },
                        }}
                      >
                        Добавить подход
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
                </Box>
              )
            })}
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
        onCreate={onAddExercise}
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

function deltaColor(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'var(--wk-muted)'
  if (value > 0) return 'success.main'
  if (value < 0) return 'error.main'
  return 'var(--wk-muted)'
}

function formatPercent(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
