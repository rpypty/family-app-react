import { useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Fab,
  IconButton,
  Stack,
  Typography,
  Button,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import type { Workout } from '../types'

interface CalendarTabProps {
  workouts: Workout[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onEditWorkout: (workoutId: string) => void
  onAddWorkout: (date: string) => void
}

export function CalendarTab({
  workouts,
  selectedDate,
  onSelectDate,
  onEditWorkout,
  onAddWorkout,
}: CalendarTabProps) {
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Workout[]>()
    for (const w of workouts) {
      const key = String(w.date || '').trim()
      if (!key) continue
      const list = map.get(key) || []
      list.push(w)
      map.set(key, list)
    }
    return map
  }, [workouts])

  const selectedWorkouts = useMemo(() => {
    return workoutsByDate.get(selectedDate) || []
  }, [workoutsByDate, selectedDate])

  const [year, month] = useMemo(() => {
    const [y, m] = selectedDate.split('-')
    return [Number(y) || new Date().getFullYear(), Number(m) - 1 || new Date().getMonth()]
  }, [selectedDate])

  const calendarMonth = useMemo(() => new Date(year, month, 1), [year, month])

  const calendarLabel = useMemo(() => {
    const label = calendarMonth.toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
    const cleaned = label.replace(/\s*г\.?$/i, '')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }, [calendarMonth])

  const calendarCells = useMemo(() => {
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
        count: (workoutsByDate.get(iso) || []).length,
      })
    }
    return cells
  }, [year, month, workoutsByDate])

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    onSelectDate(iso)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Календарь тренировок
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton size="small" onClick={() => shiftMonth(-1)}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2" fontWeight={600}>
                  {calendarLabel}
                </Typography>
                <IconButton size="small" onClick={() => shiftMonth(1)}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
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
                if (!cell.day || !cell.iso) {
                  return <Box key={cell.key} sx={{ height: 44 }} />
                }
                const hasWorkout = (cell.count || 0) > 0
                const isSelected = cell.iso === selectedDate
                return (
                  <Button
                    key={cell.key}
                    variant={isSelected ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => onSelectDate(cell.iso!)}
                    sx={{
                      height: 44,
                      minWidth: 0,
                      borderRadius: 2,
                      fontWeight: 700,
                      position: 'relative',
                    }}
                  >
                    {cell.day}
                    {hasWorkout && (
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 6,
                          bottom: 6,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: isSelected ? 'background.paper' : 'secondary.main',
                        }}
                      />
                    )}
                  </Button>
                )
              })}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Выберите дату, чтобы увидеть тренировки ниже.
            </Typography>
          </CardContent>
        </Card>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Тренировки за {selectedDate}
          </Typography>
          <Stack spacing={1}>
            {selectedWorkouts.length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Нет тренировок за этот день
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              selectedWorkouts.map((w) => (
                <Card
                  key={w.id}
                  variant="outlined"
                  sx={{ borderRadius: 2, cursor: 'pointer' }}
                  onClick={() => onEditWorkout(w.id)}
                >
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {w.name || 'Тренировка'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {w.sets?.length || 0} подх.
                    </Typography>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </Box>
      </Stack>

      <Fab
        color="primary"
        aria-label="Добавить тренировку"
        onClick={() => onAddWorkout(selectedDate)}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 88,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  )
}
