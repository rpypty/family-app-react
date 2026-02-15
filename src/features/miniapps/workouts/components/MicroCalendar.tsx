import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import { addDays, formatWeekday, parseISODate, toISODate, todayISO } from '../utils/date'

interface MicroCalendarProps {
  selectedDate: string | null
  workoutDates: Set<string>
  onSelectDate: (date: string | null) => void
}

export function MicroCalendar({ selectedDate, workoutDates, onSelectDate }: MicroCalendarProps) {
  const theme = useTheme()
  const accent = theme.palette.mode === 'dark' ? '#FF784F' : '#FF5C35'
  const ink = theme.palette.text.primary
  const muted = alpha(ink, 0.6)
  const card = theme.palette.background.paper
  const border = alpha(ink, 0.12)
  const inkSoft = alpha(ink, 0.08)
  const accentSoft = alpha(accent, 0.22)
  const selectedBg = theme.palette.mode === 'dark' ? '#1F2937' : ink
  const today = useMemo(() => new Date(), [])
  const [isFullOpen, setFullOpen] = useState(false)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const days = useMemo(() => {
    const start = addDays(today, -13)
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(start, i)
      return {
        date,
        iso: toISODate(date),
      }
    })
  }, [today])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const focusIso = selectedDate || todayISO()

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const el = container.querySelector(`[data-iso="${focusIso}"]`) as HTMLElement | null
    if (!el) return
    const offset = el.offsetLeft - (container.clientWidth - el.clientWidth) / 2
    container.scrollTo({ left: Math.max(0, offset), behavior: 'auto' })
  }, [focusIso])

  const openFullCalendar = () => {
    const base = selectedDate ? parseISODate(selectedDate) : today
    if (base) {
      setViewYear(base.getFullYear())
      setViewMonth(base.getMonth())
    }
    setFullOpen(true)
  }

  const closeFullCalendar = () => setFullOpen(false)

  const calendarMonth = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth])
  const calendarLabel = useMemo(() => {
    const label = calendarMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [calendarMonth])

  const monthCells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const offset = (first.getDay() + 6) % 7
    const cells: Array<{ key: string; day?: number; iso?: string }> = []
    for (let i = 0; i < offset; i += 1) {
      cells.push({ key: `empty-${i}` })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({ key: iso, day, iso })
    }
    return cells
  }, [viewYear, viewMonth])

  const canGoNext =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth())

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="baseline">
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: 'var(--wk-ink)' }}>
            История
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
            14 дней
          </Typography>
        </Stack>
        <IconButton
          size="small"
          onClick={openFullCalendar}
          sx={{ bgcolor: 'var(--wk-ink-soft)', borderRadius: 'var(--wk-radius-sm)' }}
        >
          <CalendarMonthRounded fontSize="small" />
        </IconButton>
      </Stack>
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {days.map((day) => {
          const isSelected = selectedDate === day.iso
          const isToday = day.iso === todayISO()
          const hasWorkout = workoutDates.has(day.iso)
          return (
            <Button
              key={day.iso}
              data-iso={day.iso}
              onClick={() => onSelectDate(isSelected ? null : day.iso)}
              sx={{
                minWidth: 64,
                height: 84,
                borderRadius: 3,
                textTransform: 'none',
                flexDirection: 'column',
                gap: 0.5,
                alignItems: 'center',
                bgcolor: isSelected ? 'var(--wk-selected-dark)' : 'var(--wk-card)',
                color: isSelected ? 'white' : 'var(--wk-ink)',
                border: '1px solid',
                borderColor: hasWorkout ? 'var(--wk-accent)' : 'var(--wk-border)',
                boxShadow: isSelected ? 'var(--wk-shadow)' : 'none',
                borderRadius: 'var(--wk-radius-sm)',
              }}
            >
              <Typography variant="caption" sx={{ textTransform: 'capitalize', opacity: 0.6 }}>
                {formatWeekday(day.iso)}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {day.date.getDate()}
              </Typography>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: hasWorkout ? 'var(--wk-accent)' : 'transparent',
                  }}
                />
              {isToday && (
                <Typography variant="caption" sx={{ color: isSelected ? 'white' : 'var(--wk-ink)' }}>
                  Сегодня
                </Typography>
              )}
            </Button>
          )
        })}
      </Box>

      <Dialog
        open={isFullOpen}
        onClose={closeFullCalendar}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            '--wk-accent': accent,
            '--wk-accent-soft': accentSoft,
            '--wk-ink': ink,
            '--wk-muted': muted,
            '--wk-card': card,
            '--wk-border': border,
            '--wk-ink-soft': inkSoft,
            '--wk-selected-dark': selectedBg,
          } as any,
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography fontWeight={700}>{calendarLabel}</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewYear(viewYear - 1)
                  setViewMonth(11)
                } else {
                  setViewMonth(viewMonth - 1)
                }
              }}
              sx={{ bgcolor: 'var(--wk-ink-soft)' }}
            >
              <ChevronLeftRounded />
            </IconButton>
            <IconButton
              size="small"
              disabled={!canGoNext}
              onClick={() => {
                if (!canGoNext) return
                if (viewMonth === 11) {
                  setViewYear(viewYear + 1)
                  setViewMonth(0)
                } else {
                  setViewMonth(viewMonth + 1)
                }
              }}
              sx={{ bgcolor: 'var(--wk-ink-soft)' }}
            >
              <ChevronRightRounded />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--wk-card)' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 1,
              mb: 2,
              mt: 2,
              textAlign: 'center',
            }}
          >
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <Typography key={day} variant="caption" sx={{ color: 'var(--wk-muted)', fontWeight: 600 }}>
                {day}
              </Typography>
            ))}
            {monthCells.map((cell) => {
              if (!cell.day || !cell.iso) {
                return <Box key={cell.key} sx={{ height: 40 }} />
              }
              const disabled = cell.iso > todayISO()
              const isSelected = selectedDate === cell.iso
              const hasWorkout = workoutDates.has(cell.iso)
              return (
                <Button
                  key={cell.key}
                  variant="text"
                  size="small"
                  disabled={disabled}
                  onClick={() => {
                    onSelectDate(isSelected ? null : cell.iso)
                    closeFullCalendar()
                  }}
                  sx={{
                    height: 40,
                    minWidth: 0,
                    borderRadius: '50%',
                    fontWeight: 700,
                    bgcolor: isSelected ? 'var(--wk-selected-dark)' : 'transparent',
                    color: isSelected ? 'white' : 'var(--wk-ink)',
                    opacity: disabled ? 0.4 : 1,
                    position: 'relative',
                    '&:hover': {
                      bgcolor: isSelected ? 'var(--wk-selected-dark)' : 'var(--wk-ink-soft)',
                    },
                  }}
                >
                  {cell.day}
                  {hasWorkout && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: isSelected ? 'white' : 'var(--wk-accent)',
                      }}
                    />
                  )}
                </Button>
              )
            })}
          </Box>
        </DialogContent>
      </Dialog>
    </Stack>
  )
}
