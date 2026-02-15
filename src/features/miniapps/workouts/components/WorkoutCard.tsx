import { Card, CardContent, Stack, Typography, Box } from '@mui/material'
import type { Workout } from '../types'

interface WorkoutCardProps {
  workout: Workout
  volume: number
  exercises: number
  sets: number
  onClick?: () => void
}

export function WorkoutCard({ workout, volume, exercises, sets, onClick }: WorkoutCardProps) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        borderRadius: 'var(--wk-radius)',
        borderColor: 'var(--wk-border)',
        bgcolor: 'var(--wk-card)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 'var(--wk-shadow)' } : undefined,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 'var(--wk-radius-sm)',
              bgcolor: 'var(--wk-ink-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'var(--wk-accent)',
            }}
          >
            {exercises}
          </Box>
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: 'var(--wk-ink)' }}>
              {workout.name || 'Тренировка'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
              {sets} подход. · {volume} объём
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
