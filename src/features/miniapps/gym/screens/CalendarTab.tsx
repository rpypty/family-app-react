import { useMemo, useState, useRef, useEffect } from 'react'
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
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { Workout } from '../types'

interface CalendarTabProps {
  workouts: Workout[]
  selectedDate?: string | null
  onSelectDate: (date: string | null) => void
  onEditWorkout: (workoutId: string) => void
  onAddWorkout: (date: string) => void
  onDeleteWorkout?: (workoutId: string) => void | Promise<any>
  readOnly?: boolean
}

export function CalendarTab({
  workouts,
  selectedDate,
  onSelectDate,
  onEditWorkout,
  onAddWorkout,
  onDeleteWorkout,
  readOnly = false,
}: CalendarTabProps) {
  const [removingIds, setRemovingIds] = useState<string[]>([])
  const canEdit = !readOnly
  const canDelete = Boolean(onDeleteWorkout) && !readOnly

  const visibleWorkouts = useMemo(() => workouts.filter((w) => !removingIds.includes(w.id)), [workouts, removingIds])
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Workout[]>()
    for (const w of visibleWorkouts) {
      const key = String(w.date || '').trim()
      if (!key) continue
      const list = map.get(key) || []
      list.push(w)
      map.set(key, list)
    }
    return map
  }, [visibleWorkouts])

  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return workouts
    return workoutsByDate.get(selectedDate) || []
  }, [workoutsByDate, selectedDate, workouts])

  const groupedByDate = useMemo(() => {
    if (selectedDate) return null
    const map = new Map<string, Workout[]>()
    for (const w of workouts) {
      const d = String(w.date || '').trim() || 'Без даты'
      const list = map.get(d) || []
      list.push(w)
      map.set(d, list)
    }
    const arr = Array.from(map.entries())
    arr.sort((a, b) => {
      const ta = !Number.isNaN(Date.parse(a[0])) ? Date.parse(a[0]) : 0
      const tb = !Number.isNaN(Date.parse(b[0])) ? Date.parse(b[0]) : 0
      return tb - ta
    })
    return arr // [date, workouts[]]
  }, [workouts, selectedDate])

  const initialYearMonth = useMemo(() => {
    const ref = selectedDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
    const [y, m] = ref.split('-')
    return { y: Number(y) || new Date().getFullYear(), m: (Number(m) - 1) || new Date().getMonth() }
  }, [selectedDate])

  const [viewYear, setViewYear] = useState<number>(initialYearMonth.y)
  const [viewMonth, setViewMonth] = useState<number>(initialYearMonth.m)

  // keep visible month in sync with selectedDate when it changes
  useEffect(() => {
    setViewYear(initialYearMonth.y)
    setViewMonth(initialYearMonth.m)
  }, [initialYearMonth.y, initialYearMonth.m])

  const calendarMonth = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth])

  const calendarLabel = useMemo(() => {
    const label = calendarMonth.toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
    const cleaned = label.replace(/\s*г\.?$/i, '')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }, [calendarMonth])

  const calendarCells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const offset = (first.getDay() + 6) % 7

    const cells: Array<{ key: string; day?: number; iso?: string; count?: number }> = []
    for (let i = 0; i < offset; i += 1) {
      cells.push({ key: `empty-${i}` })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        key: iso,
        day,
        iso,
        count: (workoutsByDate.get(iso) || []).length,
      })
    }
    return cells
  }, [viewYear, viewMonth, workoutsByDate])

  // Swipe state for workout cards (shows delete on swipe)
  const [swipedWorkoutId, setSwipedWorkoutId] = useState<string | null>(null)
  const workoutStartX = useRef<number | null>(null)

  const handleWorkoutTouchStart = (e: any) => {
    if (!canDelete) return
    workoutStartX.current = e.touches?.[0]?.clientX ?? null
  }

  const handleWorkoutTouchEnd = (e: any, id: string) => {
    if (!canDelete) return
    const startX = workoutStartX.current
    const endX = e.changedTouches?.[0]?.clientX
    workoutStartX.current = null
    if (startX === null || endX === undefined) return
    const delta = startX - endX
    if (delta > 80) {
      setSwipedWorkoutId(id)
      return
    }
    if (delta < -40) {
      setSwipedWorkoutId(null)
      return
    }
  }
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <IconButton size="small" onClick={() => {
                if (viewMonth === 0) {
                  setViewYear(viewYear - 1)
                  setViewMonth(11)
                } else {
                  setViewMonth(viewMonth - 1)
                }
              }}>
                <ChevronLeftIcon />
              </IconButton>

              <Typography variant="subtitle2" fontWeight={700}>
                {calendarLabel}
              </Typography>

              <IconButton size="small" onClick={() => {
                if (viewMonth === 11) {
                  setViewYear(viewYear + 1)
                  setViewMonth(0)
                } else {
                  setViewMonth(viewMonth + 1)
                }
              }}>
                <ChevronRightIcon />
              </IconButton>
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
                const isSelected = selectedDate ? cell.iso === selectedDate : false
                return (
                  <Box key={cell.key} sx={{ position: 'relative' }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onSelectDate(cell.iso === selectedDate ? null : cell.iso!)}
                      sx={{
                        height: 36,
                        width: 36,
                        minWidth: 0,
                        borderRadius: '50%',
                        fontWeight: 700,
                        position: 'relative',
                        bgcolor: isSelected ? 'success.main' : 'transparent',
                        color: isSelected ? 'common.white' : 'text.primary',
                        border: 'none',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: isSelected ? 'success.dark' : 'action.hover' },
                        fontSize: 14,
                      }}
                    >
                      {cell.day}
                      {hasWorkout && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bottom: 6,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: isSelected ? 'background.paper' : 'secondary.main',
                          }}
                        />
                      )}
                    </Button>
                  </Box>
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
            {selectedDate ? `Тренировки за ${selectedDate}` : 'Все тренировки'}
          </Typography>
          <Stack spacing={1}>
            {selectedDate ? (
              selectedWorkouts.length === 0 ? (
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Нет тренировок за этот день
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                selectedWorkouts.map((w) => (
                  <Box
                    key={w.id}
                    sx={{ position: 'relative' }}
                    onTouchStart={(e) => handleWorkoutTouchStart(e)}
                    onTouchEnd={(e) => handleWorkoutTouchEnd(e, w.id)}
                  >
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
                          opacity: swipedWorkoutId === w.id ? 1 : 0,
                          transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                          cursor: 'pointer',
                        }}
                          onClick={async (ev) => {
                            if (!canDelete) return
                            ev.stopPropagation()
                            if (!onDeleteWorkout) {
                              setSwipedWorkoutId(null)
                              return
                            }
                          setRemovingIds((prev) => [...prev, w.id])
                          try {
                            const res = onDeleteWorkout(w.id)
                            if (res && typeof (res as any).then === 'function') {
                              await (res as any)
                            }
                          } finally {
                            setSwipedWorkoutId(null)
                            setRemovingIds((prev) => prev.filter((id) => id !== w.id))
                          }
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 36 }} />
                      </Box>

                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        cursor: canEdit ? 'pointer' : 'default',
                        transform: swipedWorkoutId === w.id ? 'translateX(-80px)' : 'translateX(0px)',
                        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                        zIndex: 1,
                      }}
                      onClick={() => {
                        if (!canEdit) return
                        if (swipedWorkoutId === w.id) {
                          setSwipedWorkoutId(null)
                          return
                        }
                        onEditWorkout(w.id)
                      }}
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
                  </Box>
                ))
              )
            ) : (
              // grouped view when no date selected
              (groupedByDate && groupedByDate.length === 0) ? (
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Нет тренировок
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                groupedByDate?.map(([d, list]) => (
                  <Box key={d}>
                    <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5, fontWeight: 700 }}>
                      {(() => {
                        const dt = new Date(d)
                        if (!isNaN(dt.getTime())) {
                          return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
                        }
                        return d
                      })()}
                    </Typography>
                    <Stack spacing={1}>
                      {list.map((w) => (
                        <Box
                          key={w.id}
                          sx={{ position: 'relative' }}
                          onTouchStart={(e) => handleWorkoutTouchStart(e)}
                          onTouchEnd={(e) => handleWorkoutTouchEnd(e, w.id)}
                        >
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
                              opacity: swipedWorkoutId === w.id ? 1 : 0,
                              transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                              cursor: 'pointer',
                            }}
                            onClick={async (ev) => {
                              if (!canDelete) return
                              ev.stopPropagation()
                              if (!onDeleteWorkout) {
                                setSwipedWorkoutId(null)
                                return
                              }
                              setRemovingIds((prev) => [...prev, w.id])
                              try {
                                const res = onDeleteWorkout(w.id)
                                if (res && typeof (res as any).then === 'function') {
                                  await (res as any)
                                }
                              } finally {
                                setSwipedWorkoutId(null)
                                setRemovingIds((prev) => prev.filter((id) => id !== w.id))
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 36 }} />
                          </Box>

                          <Card
                            variant="outlined"
                            sx={{
                              borderRadius: 2,
                              cursor: canEdit ? 'pointer' : 'default',
                              transform: swipedWorkoutId === w.id ? 'translateX(-80px)' : 'translateX(0px)',
                              transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                              zIndex: 1,
                            }}
                            onClick={() => {
                              if (!canEdit) return
                              if (swipedWorkoutId === w.id) {
                                setSwipedWorkoutId(null)
                                return
                              }
                              onEditWorkout(w.id)
                            }}
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
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))
              )
            )}
          </Stack>
        </Box>
      </Stack>

      {canEdit ? (
        <Fab
          color="primary"
          aria-label="Добавить тренировку"
          onClick={() =>
            onAddWorkout(
              selectedDate ??
                `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`,
            )
          }
          sx={{
            position: 'fixed',
            right: 16,
            bottom: 60,
          }}
        >
          <AddIcon />
        </Fab>
      ) : null}
    </Box>
  )
}
