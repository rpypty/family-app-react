import { Box, Fab, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { ExerciseMeta, Workout } from '../types'
import { MicroCalendar } from '../components/MicroCalendar'
import { WorkoutCard } from '../components/WorkoutCard'
import { formatDateLabel } from '../utils/date'
import { exerciseKey, volumeForSet } from '../utils/workout'

interface WorkoutsHomeProps {
  workouts: Workout[]
  selectedDate: string | null
  exerciseMeta: Record<string, ExerciseMeta>
  onSelectDate: (date: string | null) => void
  onOpenWorkout: (workoutId: string) => void
  onCreateWorkout: (date?: string) => void
}

export function WorkoutsHome({
  workouts,
  selectedDate,
  exerciseMeta,
  onSelectDate,
  onOpenWorkout,
  onCreateWorkout,
}: WorkoutsHomeProps) {
  const workoutDates = new Set(workouts.map((w) => w.date))

  const grouped = workouts.reduce<Record<string, Workout[]>>((acc, workout) => {
    const key = workout.date
    if (!acc[key]) acc[key] = []
    acc[key].push(workout)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  const visibleDates = selectedDate ? [selectedDate] : sortedDates

  const getWorkoutStats = (workout: Workout) => {
    const exercises = new Set(workout.sets.map((set) => exerciseKey(set.exercise))).size
    const sets = workout.sets.length
    const volume = workout.sets.reduce((sum, set) => {
      const meta = exerciseMeta[exerciseKey(set.exercise)]
      return sum + volumeForSet(set, Boolean(meta?.isWeightless))
    }, 0)
    return { exercises, sets, volume: Math.round(volume) }
  }

  return (
    <Box sx={{ pb: 'calc(220px + env(safe-area-inset-bottom))' }}>
      <Stack spacing={3}>
        <MicroCalendar selectedDate={selectedDate} workoutDates={workoutDates} onSelectDate={onSelectDate} />

        <Stack spacing={2.5}>
          {visibleDates.length === 0 ? (
            <Typography sx={{ color: 'var(--wk-muted)' }}>Пока нет тренировок.</Typography>
          ) : (
            visibleDates.map((date) => {
              const list = grouped[date] || []
              return (
                <Stack key={date} spacing={1.5}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'var(--wk-muted)' }}>
                    {formatDateLabel(date)}
                  </Typography>
                  {list.length === 0 ? (
                    <Typography sx={{ color: 'var(--wk-muted)' }}>Нет тренировок за этот день.</Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {list.map((workout) => {
                        const stats = getWorkoutStats(workout)
                        return (
                          <WorkoutCard
                            key={workout.id}
                            workout={workout}
                            exercises={stats.exercises}
                            sets={stats.sets}
                            volume={stats.volume}
                            onClick={() => onOpenWorkout(workout.id)}
                          />
                        )
                      })}
                    </Stack>
                  )}
                </Stack>
              )
            })
          )}
        </Stack>
      </Stack>

      <Fab
        color="primary"
        aria-label="Добавить тренировку"
        onClick={() => onCreateWorkout(selectedDate || undefined)}
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
    </Box>
  )
}
