import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import type { ExerciseMeta, Workout } from '../types'
import { buildExerciseSummaries, computeMaxVolumeByDay, computeSeries } from '../utils/analytics'
import { formatShortDate } from '../utils/date'
import { workoutEntries } from '../utils/workout'

interface WorkoutsAnalyticsProps {
  workouts: Workout[]
  exerciseMeta: Record<string, ExerciseMeta>
}

export function WorkoutsAnalytics({ workouts, exerciseMeta }: WorkoutsAnalyticsProps) {
  const [expandedKey, setExpandedKey] = useState<string>('')

  const entries = useMemo(() => workoutEntries(workouts), [workouts])
  const summaries = useMemo(() => buildExerciseSummaries(entries, exerciseMeta), [entries, exerciseMeta])

  const renderTrend = (count: number) => (
    <Chip
      label={`PR x${count}`}
      size="small"
      sx={{ bgcolor: count > 0 ? 'var(--wk-accent-soft)' : 'var(--wk-ink-soft)', fontWeight: 600 }}
    />
  )

  const renderSparkline = (exercise: string, isWeightless: boolean) => {
    const points = computeSeries(entries, exercise, isWeightless)
    if (points.length < 2) {
      return (
        <Typography variant="body2" color="text.secondary">
          Недостаточно данных для графика
        </Typography>
      )
    }

    const values = points.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(1, max - min)
    const last = points[points.length - 1]?.value ?? 0
    const mid = min + range / 2
    const width = 240
    const height = 120
    const padding = 8
    const stepX = (width - padding * 2) / (points.length - 1)
    const legendWidth = 64
    const unit = isWeightless ? 'повт.' : 'кг'
    const formatValue = (value: number) =>
      Number.isFinite(value) ? (Number.isInteger(value) ? value.toString() : value.toFixed(1)) : '—'

    const toX = (i: number) => padding + i * stepX
    const toY = (v: number) => height - padding - ((v - min) / range) * (height - padding * 2)

    const line = points.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ')

    return (
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <Box sx={{ minWidth: width + legendWidth }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: 'var(--wk-accent)' }} />
              <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                {isWeightless ? 'Повторы' : 'Вес'}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
              мин {formatValue(min)} {unit} · макс {formatValue(max)} {unit} · посл {formatValue(last)} {unit}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={line}
                style={{ color: 'var(--wk-accent)' }}
              />
              {points.map((p, i) => (
                <circle key={p.dateISO} cx={toX(i)} cy={toY(p.value)} r={3} fill="var(--wk-accent)" />
              ))}
            </svg>
            <Stack
              sx={{
                height,
                width: legendWidth,
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                py: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                {formatValue(max)} {unit}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                {formatValue(mid)} {unit}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                {formatValue(min)} {unit}
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {formatShortDate(points[0]?.dateISO ?? '')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatShortDate(points[points.length - 1]?.dateISO ?? '')}
            </Typography>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 'calc(220px + env(safe-area-inset-bottom))' }}>
      <Stack spacing={2.5}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
          Аналитика
        </Typography>

        {summaries.length === 0 ? (
          <Typography sx={{ color: 'var(--wk-muted)' }}>Нет данных для аналитики</Typography>
        ) : (
          summaries.map((item) => {
            const isExpanded = expandedKey === item.key
            const maxVolumeDay = computeMaxVolumeByDay(entries, item.name, item.isWeightless)
            return (
              <Card
                key={item.key}
                variant="outlined"
                sx={{ borderRadius: 'var(--wk-radius)', overflow: 'hidden', borderColor: 'var(--wk-border)', bgcolor: 'var(--wk-card)' }}
                onClick={() => setExpandedKey(isExpanded ? '' : item.key)}
              >
                <CardContent>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: 'var(--wk-ink)', minWidth: 0 }}>
                        {item.name}
                      </Typography>
                      {renderTrend(item.prCount)}
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: 'var(--wk-ink-soft)',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                          Подходы
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                          {item.totalSets}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: 'var(--wk-ink-soft)',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                          {item.isWeightless ? 'Лучшие повторы' : 'Лучший вес'}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                          {item.isWeightless
                            ? `${item.bestReps ?? '—'} повт.`
                            : `${item.bestWeight ?? '—'} кг`}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: 'var(--wk-ink-soft)',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                          Последний
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                          {item.isWeightless
                            ? `${item.lastReps ?? '—'} повт.`
                            : `${item.lastWeight ?? '—'} кг`}
                        </Typography>
                      </Box>
                    </Stack>

                    {isExpanded && (
                      <>
                        <Divider />
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 0.5,
                              px: 1,
                              py: 0.5,
                              borderRadius: 999,
                              bgcolor: 'var(--wk-ink-soft)',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                              Кол-во рекордов
                            </Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                              {item.prCount}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 0.5,
                              px: 1,
                              py: 0.5,
                              borderRadius: 999,
                              bgcolor: 'var(--wk-ink-soft)',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                              Лучший объём
                            </Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                              {maxVolumeDay ? Math.round(maxVolumeDay) : '—'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Divider />
                        <Box>
                          <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }} display="block" gutterBottom>
                            Динамика максимума
                          </Typography>
                          {renderSparkline(item.name, item.isWeightless)}
                        </Box>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )
          })
        )}
      </Stack>
    </Box>
  )
}
