import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Fab,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import type { Workout, WorkoutSet } from '../types'
import { createWorkoutSet, exerciseKey } from '../api/gymStore'
import { ExercisePickerScreen } from './ExercisePickerScreen'

interface WorkoutEditScreenProps {
  workout: Workout
  allWorkouts: Workout[]
  exerciseOptions: string[]
  onSave: (workout: Workout) => void
  onAddExercise: (name: string) => void
}

export function WorkoutEditScreen({ workout, allWorkouts, exerciseOptions, onSave, onAddExercise }: WorkoutEditScreenProps) {
  const [name, setName] = useState(workout.name || '')
  const [date] = useState(workout.date)
  const [sets, setSets] = useState<WorkoutSet[]>([...(workout.sets || [])])
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({})
  const touchStartX = useRef<number | null>(null)
  const [swipedExerciseKey, setSwipedExerciseKey] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const workoutBasePath = useMemo(() => `/miniapps/gym/workout/${workout.id}`, [workout.id])
  const isPickingExercise = useMemo(() => {
    const normalized = location.pathname.replace(/\/+$/, '')
    const segments = normalized.split('/').filter(Boolean)
    return (
      segments[0] === 'miniapps' &&
      segments[1] === 'gym' &&
      segments[2] === 'workout' &&
      segments[3] === workout.id &&
      segments[4] === 'exercises'
    )
  }, [location.pathname, workout.id])

  const canSave = useMemo(() => Boolean(date.trim()), [date])

  const previousWorkout = useMemo(() => {
    const sorted = [...(allWorkouts || [])]
    sorted.sort((a, b) => {
      const ta = !Number.isNaN(Date.parse(a.date)) ? Date.parse(a.date) : 0
      const tb = !Number.isNaN(Date.parse(b.date)) ? Date.parse(b.date) : 0
      if (ta !== tb) return ta - tb
      return (a.createdAt ?? 0) - (b.createdAt ?? 0)
    })
    const index = sorted.findIndex((w) => w.id === workout.id)
    if (index > 0) return sorted[index - 1]
    return null
  }, [allWorkouts, workout.id])

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        name: string
        sets: WorkoutSet[]
        stats?: {
          avgWeightChange?: number | null
          volumeChange?: number | null
          prevAvgWeight?: number | null
          prevVolume?: number | null
        }
      }
    >()

    for (const s of sets) {
      const name = (s.exercise || '').trim()
      if (!name) continue
      const key = exerciseKey(name)
      const existing = map.get(key) || { key, name, sets: [] }
      existing.sets = [...existing.sets, s]
      map.set(key, existing)
    }

    const list = Array.from(map.values())
    if (previousWorkout) {
      const prevSets = previousWorkout.sets || []
      for (const g of list) {
        const prev = prevSets.filter((s) => exerciseKey(s.exercise) === g.key)
        if (prev.length === 0) {
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
    for (const g of list) {
      g.sets.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    }
    return list
  }, [previousWorkout, sets])

  const handleRemoveSet = (setId: string) => {
    setSets((prev) => prev.filter((s) => s.id !== setId))
  }

  const handleUpdateSet = (setId: string, field: 'weightKg' | 'reps', value: string) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              weightKg: field === 'weightKg' ? Number(value) || 0 : s.weightKg,
              reps: field === 'reps' ? Math.max(1, Number(value) || 0) : s.reps,
            }
          : s
      )
    )
  }

  const handleAddSetToExercise = (exerciseName: string) => {
    const exercise = exerciseName.trim()
    if (!exercise) return
    const newSet = createWorkoutSet({ exercise, weightKg: 0, reps: 8 })
    setSets((prev) => [...prev, newSet])
    onAddExercise(exercise)
  }

  const handleRemoveExercise = (exerciseName: string) => {
    const key = exerciseKey(exerciseName)
    setSets((prev) => prev.filter((s) => exerciseKey(s.exercise) !== key))
  }

  useEffect(() => {
    if (!canSave) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave({ ...workout, name: name.trim(), date, sets })
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [canSave, date, name, onSave, sets, workout])

  if (isPickingExercise) {
    return (
      <ExercisePickerScreen
        exercises={exerciseOptions}
        onSelect={(name) => {
          handleAddSetToExercise(name)
          navigate(workoutBasePath)
        }}
      />
    )
  }

  return (
    <Box
      sx={{ p: 2 }}
      onClickCapture={() => setSwipedExerciseKey(null)}
      onTouchStart={() => setSwipedExerciseKey(null)}
    >
      <Stack spacing={2}>
        <Box>
          <TextField
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название тренировки"
            variant="standard"
            inputProps={{ style: { fontWeight: 800, fontSize: '1.25rem' } }}
            sx={{ mb: 0.5 }}
          />
          <Typography variant="body2" color="text.secondary">
            {date}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {groups.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Добавьте упражнение и подходы
                </Typography>
              </CardContent>
            </Card>
          ) : (
            groups.map((group) => (
              <Box key={group.key} sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 2,
                    bgcolor: 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    pr: 2,
                    color: 'error.contrastText',
                    opacity: swipedExerciseKey === group.key ? 1 : 0,
                    transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleRemoveExercise(group.name)}
                >
                  <DeleteIcon sx={{ fontSize: 36 }} />
                </Box>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
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
                      if (delta > 80) {
                        setSwipedExerciseKey(group.key)
                        return
                      }
                      if (delta < -40) {
                        setSwipedExerciseKey(null)
                        return
                      }
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {group.name}
                        </Typography>
                        {group.stats && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Вес:{' '}
                            <Box component="span" sx={{ color: deltaColor(group.stats.avgWeightChange) }}>
                              {formatPercent(group.stats.avgWeightChange)}
                            </Box>
                            {' '}• Пред. вес:{' '}
                            <Box component="span" sx={{ fontWeight: 600 }}>
                              {group.stats.prevAvgWeight ? `${group.stats.prevAvgWeight.toFixed(1)} кг` : '—'}
                            </Box>
                            <Box component="span" sx={{ display: 'block' }}>
                              Объем:{' '}
                              <Box component="span" sx={{ color: deltaColor(group.stats.volumeChange) }}>
                                {formatPercent(group.stats.volumeChange)}
                              </Box>
                            </Box>
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          size="small"
                          color="primary"
                          variant="text"
                          onClick={() => handleAddSetToExercise(group.name)}
                          sx={{ fontWeight: 600 }}
                        >
                          Добавить подход
                        </Button>
                      </Box>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Свайп влево, чтобы удалить упражнение
                    </Typography>

                    <Stack spacing={1}>
                      {group.sets.map((s) => (
                        <Box
                          key={s.id}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr 1fr auto', sm: '120px 120px auto' },
                            gap: 1,
                            alignItems: 'center',
                          }}
                        >
                          <TextField
                            type="number"
                            label="Повт"
                            value={s.reps}
                            onChange={(e) => handleUpdateSet(s.id, 'reps', e.target.value)}
                            size="small"
                          />
                          <TextField
                            type="number"
                            label="Вес"
                            value={weightDrafts[s.id] ?? (s.weightKg === 0 ? '' : String(s.weightKg))}
                            onChange={(e) => {
                              const value = e.target.value
                              setWeightDrafts((prev) => ({ ...prev, [s.id]: value }))
                              if (value !== '') {
                                handleUpdateSet(s.id, 'weightKg', value)
                              }
                            }}
                            onBlur={() => {
                              const draft = weightDrafts[s.id]
                              if (draft === undefined) return
                              if (draft === '') {
                                handleUpdateSet(s.id, 'weightKg', '0')
                              }
                              setWeightDrafts((prev) => {
                                const next = { ...prev }
                                delete next[s.id]
                                return next
                              })
                            }}
                            size="small"
                          />
                          <IconButton size="small" color="error" onClick={() => handleRemoveSet(s.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            ))
          )}
        </Stack>

        <datalist id="gym-exercises">
          {exerciseOptions.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>

      </Stack>

      <Fab
        variant="extended"
        color="primary"
        aria-label="Добавить упражнение"
        onClick={() => navigate(`${workoutBasePath}/exercises`)}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 88,
        }}
      >
        <AddIcon />
        <Box sx={{ ml: 1, fontWeight: 600 }}>Добавить упражнение</Box>
      </Fab>
    </Box>
  )
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const rounded = Math.round(value)
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded}%`
}

function deltaColor(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'text.secondary'
  if (value > 0) return 'success.main'
  if (value < 0) return 'error.main'
  return 'text.secondary'
}
