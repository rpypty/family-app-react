import { useState, useMemo } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
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

type WorkoutOption = Workout | string | { inputValue: string; title: string }

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
}: LogTabProps) {
  const [exercise, setExercise] = useState<ExerciseOption>('')
  const [query, setQuery] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [reps, setReps] = useState('')
  const [setsCount, setSetsCount] = useState('1')
  const [workoutQuery, setWorkoutQuery] = useState('')

  const activeExerciseName = useMemo(() => {
    const fromSelected =
      typeof exercise === 'string'
        ? exercise.trim()
        : typeof exercise === 'object' && exercise !== null
        ? (exercise.inputValue || '').trim()
        : ''
    return fromSelected || query.trim()
  }, [exercise, query])

  const workoutOptions: WorkoutOption[] = useMemo(() => {
    const opts: WorkoutOption[] = [...workoutsForDate]
    if (templates.length > 0) {
      opts.push(
        ...templates.map((t) => ({
          kind: 'template' as const,
          id: t.id,
          name: t.name,
        }))
      )
    }
    return opts
  }, [workoutsForDate, templates])

  const getWorkoutLabel = (option: WorkoutOption): string => {
    if (typeof option === 'string') return option
    if ('inputValue' in option) return option.title
    if ('kind' in option) return `📋 ${option.name}`
    return option.name || 'Тренировка'
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
            fullWidth
            sx={{ mb: 2 }}
          />

          <Autocomplete
            freeSolo
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            options={workoutOptions}
            getOptionLabel={getWorkoutLabel}
            isOptionEqualToValue={(option, value) => {
              if (typeof option === 'object' && 'id' in option && typeof value === 'object' && 'id' in value) {
                return option.id === value.id
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
              <li {...props} key={'id' in option ? option.id : getWorkoutLabel(option)}>
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

                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Добавить подходы
                    </Typography>
                    <Stack spacing={1.5}>
                      <Autocomplete
                        freeSolo
                        options={exerciseOptions}
                        value={exercise}
                        onChange={(_, val) => setExercise(val || '')}
                        inputValue={query}
                        onInputChange={(_, val) => setQuery(val)}
                        renderInput={(params) => <TextField {...params} label="Упражнение" size="small" />}
                      />

                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
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
