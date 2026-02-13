import { Box, IconButton, Tooltip } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

interface MinimalCalendarProps {
  year: number
  month: number
  trainingDates: string[] // ISO date strings: 'YYYY-MM-DD'
  selectedDate?: string | null
  onSelectDate: (date: string | null) => void
  onMonthChange: (year: number, month: number) => void
}

export function MinimalCalendar({
  year,
  month,
  trainingDates,
  selectedDate = null,
  onSelectDate,
  onMonthChange,
}: MinimalCalendarProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7

  const cells: Array<{ day: number; iso: string } | null> = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, iso })
  }

  const isTrainingDay = (iso: string) => trainingDates.includes(iso)

  return (
      <Box sx={{ width: '100%', maxWidth: 320, mx: 'auto', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <IconButton size="small" onClick={() => onMonthChange(year, month - 1)}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Box sx={{ fontWeight: 600, fontSize: 14 }}>
          {new Date(year, month, 1).toLocaleString('ru-RU', { month: 'short', year: 'numeric' })}
        </Box>
        <IconButton size="small" onClick={() => onMonthChange(year, month + 1)}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
        {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => (
          <Box key={d} sx={{ textAlign: 'center', fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{d}</Box>
        ))}
        {cells.map((cell, idx) =>
          cell ? (
            <Tooltip key={cell.iso} title={isTrainingDay(cell.iso) ? 'Есть тренировка' : ''}>
              <Box
                onClick={() => onSelectDate(cell.iso === selectedDate ? null : cell.iso)}
                sx={{
                  height: 28,
                  width: 28,
                  mx: 'auto',
                  borderRadius: '50%',
                  bgcolor: cell.iso === selectedDate ? 'primary.main' : 'background.paper',
                  color: cell.iso === selectedDate ? 'white' : 'text.primary',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box>{cell.day}</Box>
                  {isTrainingDay(cell.iso) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 2,
                        bottom: 2,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: cell.iso === selectedDate ? 'background.paper' : 'secondary.main',
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Tooltip>
          ) : (
            <Box key={idx} />
          )
        )}
      </Box>
    </Box>
  )
}
