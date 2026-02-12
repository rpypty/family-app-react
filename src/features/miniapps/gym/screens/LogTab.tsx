import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import type { ExerciseOption, TemplateExercise, Workout, WorkoutTemplate } from '../types'
import { exerciseKey } from '../api/gymStore'

type TemplateOption = { kind: 'template'; id: string; name: string }
type WorkoutOption = Workout | TemplateOption | string | { inputValue: string; title: string }

interface LogTabProps {
  date: string
  onDateChange: (date: string) => void
  workoutsForDate: Workout[]
  selectedWorkout: Workout | null
  onSelectWorkout: (workoutId: string) => void
  onCreateWorkout: (name: string) => void
  templates: WorkoutTemplate[]
  onUseTemplate: (templateId: string) => void
  exerciseOptions: string[]
  onAddSets: (exercise: string, weightKg: number, reps: number, count: number) => void
  onAddExercise: (exercise: string) => void
  templateExercises?: TemplateExercise[]
  allWorkouts: Workout[]
  selectedWorkoutGroups: Array<{
    key: string
    exercise: string
    sets: Array<{ id: string; exercise: string; weightKg: number; reps: number; createdAt: number }>
    totalVolume: number
  }>
  selectedWorkoutTotalVolume: number
  onDeleteOneSet: (exerciseName: string, reps: number, weight: number) => void
}

export function LogTab({
  date,
  onDateChange,
  workoutsForDate,
  selectedWorkout,
  onSelectWorkout,
  onCreateWorkout,
  templates,
  onUseTemplate,
  exerciseOptions,
  onAddSets,
  onAddExercise,
  selectedWorkoutGroups,
  selectedWorkoutTotalVolume,
  onDeleteOneSet,
  templateExercises,
  allWorkouts,
}: LogTabProps) {
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const [exercise, setExercise] = useState<ExerciseOption>('')
  const [query, setQuery] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [reps, setReps] = useState('')
  const [setsCount, setSetsCount] = useState('1')
  const [workoutQuery, setWorkoutQuery] = useState('')
  const [templateInputs, setTemplateInputs] = useState<
    Record<string, { weightKg: string; reps: string; sets: string }>
  >({})

  const activeExerciseName = useMemo(() => {
    const fromSelected =
      typeof exercise === 'string'
        ? exercise.trim()
        : String(exercise?.inputValue || exercise?.title || '').trim()
    return fromSelected || query.trim()
  }, [exercise, query])

  // Auto-fill reps/sets from template when exercise is selected
  useEffect(() => {
    if (!activeExerciseName || !templateExercises) return
    const templateEx = templateExercises.find(
      (te) => exerciseKey(te.name) === exerciseKey(activeExerciseName)
    )
    if (templateEx) {
      setReps(String(templateEx.reps))
      setSetsCount(String(templateEx.sets))
    }
  }, [activeExerciseName, templateExercises])

  useEffect(() => {
    if (!templateExercises || templateExercises.length === 0) {
      setTemplateInputs({})
      return
    }
    setTemplateInputs((prev) => {
      const next: Record<string, { weightKg: string; reps: string; sets: string }> = {}
      for (const ex of templateExercises) {
        const key = exerciseKey(ex.name)
        next[key] = prev[key] ?? {
          weightKg: '',
          reps: String(ex.reps),
          sets: String(ex.sets),
        }
      }
      return next
    })
  }, [templateExercises])

  // Compute last exercise stats (weight, volume)
  const lastExerciseStats = useMemo(() => {
    if (!activeExerciseName || !selectedWorkout) return null

    const key = exerciseKey(activeExerciseName)
    const currentDate = selectedWorkout.date

    // Find last workout with this exercise before current date
    const previousWorkouts = allWorkouts
      .filter((w) => w.date < currentDate)
      .sort((a, b) => b.date.localeCompare(a.date))

    let lastWeight = 0
    let lastVolume = 0
    let lastReps = 0
    let lastSets = 0
    let found = false

    for (const workout of previousWorkouts) {
      const sets = workout.sets?.filter((s) => exerciseKey(s.exercise) === key) || []
      if (sets.length > 0) {
        // Calculate average weight and total volume from last workout
        lastWeight = sets.reduce((sum, s) => sum + (s.weightKg || 0), 0) / sets.length
        lastVolume = sets.reduce((sum, s) => sum + (s.weightKg || 0) * s.reps, 0)
        lastReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0) / sets.length
        lastSets = sets.length
        found = true
        break
      }
    }

    if (!found) return null

    const currentWeight = Number(weightKg) || 0
    const currentReps = Number(reps) || 0
    const currentSets = Number(setsCount) || 1
    const currentVolume = currentWeight * currentReps * currentSets

    return {
      lastWeight,
      lastVolume,
      lastReps,
      lastSets,
      currentWeight,
      currentReps,
      currentSets,
      currentVolume,
    }
  }, [activeExerciseName, selectedWorkout, allWorkouts, weightKg, reps, setsCount])

  const getExerciseStats = (
    exerciseName: string,
    weightValue: string,
    repsValue: string,
    setsValue: string
  ) => {
    if (!exerciseName || !selectedWorkout) return null

    const key = exerciseKey(exerciseName)
    const currentDate = selectedWorkout.date

    const previousWorkouts = allWorkouts
      .filter((w) => w.date < currentDate)
      .sort((a, b) => b.date.localeCompare(a.date))

    let lastWeight = 0
    let lastVolume = 0
    let lastReps = 0
    let lastSets = 0
    let found = false

    for (const workout of previousWorkouts) {
      const sets = workout.sets?.filter((s) => exerciseKey(s.exercise) === key) || []
      if (sets.length > 0) {
        lastWeight = sets.reduce((sum, s) => sum + (s.weightKg || 0), 0) / sets.length
        lastVolume = sets.reduce((sum, s) => sum + (s.weightKg || 0) * s.reps, 0)
        lastReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0) / sets.length
        lastSets = sets.length
        found = true
        break
      }
    }

    if (!found) return null

    const currentWeight = Number(weightValue) || 0
    const currentReps = Number(repsValue) || 0
    const currentSets = Number(setsValue) || 1
    const currentVolume = currentWeight * currentReps * currentSets

    return {
      lastWeight,
      lastVolume,
      lastReps,
      lastSets,
      currentWeight,
      currentReps,
      currentSets,
      currentVolume,
    }
  }

  const getDeltaColor = (current: number, last: number) => {
    if (!last || !current) return 'text.secondary'
    if (current > last) return 'success.main'
    if (current < last) return 'error.main'
    return 'text.secondary'
  }

  const formatDeltaPercent = (current: number, last: number) => {
    if (!last || !current) return '—'
    const delta = ((current - last) / last) * 100
    const sign = delta > 0 ? '+' : ''
    return `${sign}${delta.toFixed(1)}%`
  }

  const formatDeltaKg = (current: number, last: number) => {
    if (!last || !current) return '—'
    const delta = current - last
    const sign = delta > 0 ? '+' : ''
    return `${sign}${delta.toFixed(1)} кг`
  }

  const formatPrevSummary = (lastWeight: number, currentWeight: number, lastVolume: number) => {
    if (!lastWeight) return '—'
    return `Прошлый: ${lastWeight.toFixed(1)} кг · ${formatDeltaPercent(currentWeight, lastWeight)} (${formatDeltaKg(currentWeight, lastWeight)}) · Объём до: ${formatVolume(lastVolume)}`
  }

  const workoutOptions: WorkoutOption[] = useMemo(() => {
    const templateOptions: WorkoutOption[] = templates.map((t) => ({
      kind: 'template' as const,
      id: t.id,
      name: t.name,
    }))
    return [...templateOptions, ...workoutsForDate]
  }, [workoutsForDate, templates])

  const getWorkoutLabel = (option: WorkoutOption): string => {
    if (typeof option === 'string') return option
    if ('inputValue' in option) return option.title
    if ('kind' in option) return `📋 Шаблон: ${option.name}`
    return option.name || 'Тренировка'
  }

  const getWorkoutKey = (option: WorkoutOption): string => {
    if (typeof option === 'string') return option
    if ('inputValue' in option) return option.inputValue
    return option.id
  }

  const handleWorkoutChange = (_: any, value: WorkoutOption | null) => {
    if (!value) return
    if (typeof value === 'string') {
      onCreateWorkout(value)
      setWorkoutQuery('')
    } else if ('inputValue' in value) {
      onCreateWorkout(value.inputValue)
      setWorkoutQuery('')
    } else if ('kind' in value && value.kind === 'template') {
      onUseTemplate(value.id)
      setWorkoutQuery('')
    } else {
      onSelectWorkout(value.id)
      setWorkoutQuery('')
    }
  }

  const handleAddSets = () => {
    const ex = activeExerciseName
    if (!ex) return
    const w = Number(weightKg) || 0
    const r = Number(reps) || 0
    const c = Math.max(1, Number(setsCount) || 1)
    if (r <= 0) return

    onAddExercise(ex)
    onAddSets(ex, w, r, c)
    setWeightKg('')
    setReps('')
    setSetsCount('1')
    setExercise('')
    setQuery('')
  }

  const handleTemplateInputChange = (
    key: string,
    field: 'weightKg' | 'reps' | 'sets',
    value: string
  ) => {
    setTemplateInputs((prev) => ({
      ...prev,
      [key]: {
        weightKg: field === 'weightKg' ? value : prev[key]?.weightKg ?? '',
        reps: field === 'reps' ? value : prev[key]?.reps ?? '0',
        sets: field === 'sets' ? value : prev[key]?.sets ?? '1',
      },
    }))
  }

  const handleAddTemplateSets = (exerciseName: string) => {
    const key = exerciseKey(exerciseName)
    const entry = templateInputs[key]
    const w = Number(entry?.weightKg) || 0
    const r = Number(entry?.reps) || 0
    const c = Math.max(1, Number(entry?.sets) || 1)
    if (r <= 0) return
    onAddExercise(exerciseName)
    onAddSets(exerciseName, w, r, c)
  }

  const formatVolume = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}т`
    return `${Math.round(v)}кг`
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        <Box>
          <TextField
            type="date"
            label="Дата"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            inputRef={dateInputRef}
            onClick={() => {
              const input = dateInputRef.current
              if (input && 'showPicker' in input) {
                ;(input as HTMLInputElement & { showPicker: () => void }).showPicker()
              }
            }}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Autocomplete<WorkoutOption, false, false, true>
            freeSolo
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            options={workoutOptions}
            getOptionLabel={getWorkoutLabel}
            isOptionEqualToValue={(option, value) => {
              if (typeof option === 'string' && typeof value === 'string') {
                return option === value
              }
              if (
                typeof option === 'object' &&
                option !== null &&
                typeof value === 'object' &&
                value !== null
              ) {
                if ('id' in option && 'id' in value) {
                  return option.id === value.id
                }
                if ('inputValue' in option && 'inputValue' in value) {
                  return option.inputValue === value.inputValue
                }
              }
              return false
            }}
            filterOptions={(options, params) => {
              const filtered = options.filter((opt) => {
                const label = getWorkoutLabel(opt).toLowerCase()
                return label.includes(params.inputValue.toLowerCase())
              })
              if (params.inputValue !== '' && !filtered.some((opt) => getWorkoutLabel(opt) === params.inputValue)) {
                filtered.push({
                  inputValue: params.inputValue,
                  title: `Создать "${params.inputValue}"`,
                })
              }
              return filtered
            }}
            value={selectedWorkout}
            onChange={handleWorkoutChange}
            inputValue={workoutQuery}
            onInputChange={(_, val) => setWorkoutQuery(val)}
            renderInput={(params) => <TextField {...params} label="Выбрать или создать тренировку" />}
            renderOption={(props, option) => (
              <li {...props} key={getWorkoutKey(option)}>
                {getWorkoutLabel(option)}
              </li>
            )}
          />
        </Box>

        {selectedWorkout && (
          <>
            <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedWorkout.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Объём: {formatVolume(selectedWorkoutTotalVolume)} · {selectedWorkoutGroups.reduce((sum, g) => sum + g.sets.length, 0)} подх.
                    </Typography>
                  </Box>

                  <Divider />

                  {templateExercises && templateExercises.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Упражнения шаблона
                      </Typography>
                      <Stack spacing={1}>
                        {templateExercises.map((ex) => {
                          const key = exerciseKey(ex.name)
                          const entry = templateInputs[key] || {
                            weightKg: '',
                            reps: String(ex.reps),
                            sets: String(ex.sets),
                          }
                          const stats = getExerciseStats(
                            ex.name,
                            entry.weightKg,
                            entry.reps,
                            entry.sets
                          )
                          return (
                            <Stack
                              key={key}
                              spacing={0.75}
                              sx={{
                                p: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'grid',
                                  gap: 1,
                                  gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body2" fontWeight={700} noWrap>
                                  {ex.name}
                                </Typography>
                                {stats ? (
                                  <Typography
                                    variant="caption"
                                    fontWeight={600}
                                    sx={{
                                      gridColumn: '2 / -1',
                                      color: getDeltaColor(stats.currentWeight, stats.lastWeight),
                                    }}
                                  >
                                    {formatPrevSummary(
                                      stats.lastWeight,
                                      stats.currentWeight,
                                      stats.lastVolume
                                    )}
                                  </Typography>
                                ) : (
                                  <Box />
                                )}
                              </Box>

                              <Box
                                sx={{
                                  display: 'grid',
                                  gap: 1,
                                  gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto',
                                  alignItems: 'center',
                                }}
                              >
                                <Box />
                                <TextField
                                  type="number"
                                  label="Вес"
                                  value={entry.weightKg}
                                  onChange={(e) => handleTemplateInputChange(key, 'weightKg', e.target.value)}
                                  size="small"
                                />
                                <TextField
                                  type="number"
                                  label="Повт"
                                  value={entry.reps}
                                  onChange={(e) => handleTemplateInputChange(key, 'reps', e.target.value)}
                                  size="small"
                                />
                                <TextField
                                  type="number"
                                  label="Подх"
                                  value={entry.sets}
                                  onChange={(e) => handleTemplateInputChange(key, 'sets', e.target.value)}
                                  size="small"
                                />
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleAddTemplateSets(ex.name)}
                                  disabled={!entry.reps}
                                  sx={{ borderRadius: 2, height: 40 }}
                                >
                                  Добавить
                                </Button>
                              </Box>
                            </Stack>
                          )
                        })}
                      </Stack>
                      <Divider sx={{ my: 2 }} />
                    </Box>
                  )}

                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Добавить подходы
                    </Typography>
                    <Stack spacing={1.5}>
                      <Autocomplete<ExerciseOption, false, false, true>
                        freeSolo
                        options={exerciseOptions as ExerciseOption[]}
                        value={exercise}
                        onChange={(_, val) => setExercise(val || '')}
                        inputValue={query}
                        onInputChange={(_, val) => setQuery(val)}
                        renderInput={(params) => <TextField {...params} label="Упражнение" size="small" />}
                      />

                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                        {lastExerciseStats && (
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            sx={{
                              gridColumn: '1 / -1',
                              color: getDeltaColor(
                                lastExerciseStats.currentWeight,
                                lastExerciseStats.lastWeight
                              ),
                            }}
                          >
                            {formatPrevSummary(
                              lastExerciseStats.lastWeight,
                              lastExerciseStats.currentWeight,
                              lastExerciseStats.lastVolume
                            )}
                          </Typography>
                        )}
                        <TextField
                          type="number"
                          label="Вес, кг"
                          value={weightKg}
                          onChange={(e) => setWeightKg(e.target.value)}
                          size="small"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">⚖️</InputAdornment>,
                          }}
                        />
                        <TextField
                          type="number"
                          label="Повторы"
                          value={reps}
                          onChange={(e) => setReps(e.target.value)}
                          size="small"
                        />
                        <TextField
                          type="number"
                          label="Подходов"
                          value={setsCount}
                          onChange={(e) => setSetsCount(e.target.value)}
                          size="small"
                        />
                      </Box>

                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddSets}
                        disabled={!activeExerciseName || !reps}
                        fullWidth
                        sx={{ borderRadius: 2 }}
                      >
                        Добавить
                      </Button>

                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {selectedWorkoutGroups.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Упражнения
                </Typography>
                <Stack spacing={1.5}>
                  {selectedWorkoutGroups.map((group) => (
                    <Card key={group.key} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {group.exercise}
                            </Typography>
                            <Chip
                              label={formatVolume(group.totalVolume)}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {group.sets.map((set) => (
                              <Chip
                                key={set.id}
                                label={`${set.reps} × ${set.weightKg || 'BW'}`}
                                size="small"
                                onDelete={() => onDeleteOneSet(set.exercise, set.reps, set.weightKg)}
                                deleteIcon={<DeleteIcon />}
                                sx={{
                                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                  fontWeight: 600,
                                }}
                              />
                            ))}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}
      </Stack>
    </Box>
  )
}
