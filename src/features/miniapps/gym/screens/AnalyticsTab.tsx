import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import type { GymEntry } from '../types'
import { computeAnalytics } from '../utils/analyticsUtils'
import { computeExerciseProgress } from '../utils/exerciseProgressUtils'
import { parseISODate } from '../utils/dateUtils'
import { StatCard } from '../components/StatCard'

interface AnalyticsTabProps {
  entries: GymEntry[]
  periodDays: number
  onPeriodChange: (days: number) => void
}

export function AnalyticsTab({ entries, periodDays, onPeriodChange }: AnalyticsTabProps) {
  const [expandedKey, setExpandedKey] = useState<string>('')
  const [selectedPoints, setSelectedPoints] = useState<Record<string, number>>({})

  const analytics = useMemo(() => computeAnalytics(entries, periodDays), [entries, periodDays])

  const restDaysAvg = useMemo(() => {
    if (entries.length === 0) return null
    const now = new Date()
    const start = periodDays === 0 ? null : new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    const dates = entries
      .map((e) => parseISODate(e.date))
      .filter((dt): dt is Date => Boolean(dt))
      .filter((dt) => (!start ? true : dt >= start && dt <= now))
      .map((dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime())

    const unique = Array.from(new Set(dates)).sort((a, b) => a - b)
    if (unique.length < 2) return null

    const gaps: number[] = []
    for (let i = 1; i < unique.length; i += 1) {
      const diffDays = Math.round((unique[i] - unique[i - 1]) / (24 * 60 * 60 * 1000))
      gaps.push(Math.max(0, diffDays - 1))
    }
    const avg = gaps.reduce((sum, v) => sum + v, 0) / gaps.length
    return Number.isFinite(avg) ? avg : null
  }, [entries, periodDays])

  const renderDelta = (val: number | null) => {
    if (val === null) return <TrendingFlatIcon fontSize="small" color="disabled" />
    const rounded = Math.round(val)
    if (rounded === 0) return <TrendingFlatIcon fontSize="small" color="disabled" />
    if (rounded > 0)
      return (
        <Chip icon={<TrendingUpIcon />} label={`+${rounded}%`} color="success" size="small" sx={{ fontWeight: 600 }} />
      )
    return (
      <Chip icon={<TrendingDownIcon />} label={`${rounded}%`} color="error" size="small" sx={{ fontWeight: 600 }} />
    )
  }

  const formatVolume = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}т`
    return `${Math.round(v)}кг`
  }

  const formatEpley1RM = (weightKg: number, reps: number) => {
    if (!weightKg || !reps) return '—'
    const oneRm = weightKg * (1 + reps / 30)
    return `${Math.round(oneRm)} кг`
  }

  const renderWeightProgress = (exercise: string, itemKey: string) => {
    const points = computeExerciseProgress(entries, exercise, periodDays)
    if (points.length < 2) {
      return (
        <Typography variant="body2" color="text.secondary">
          Недостаточно данных для графика
        </Typography>
      )
    }

    const values = points.map((p) => p.bestWeightKg)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(1, max - min)
    const width = 240
    const height = 120
    const padding = 8
    const stepX = (width - padding * 2) / (points.length - 1)
    const selectedIndex = selectedPoints[itemKey]

    const toX = (i: number) => padding + i * stepX
    const toY = (v: number) => height - padding - ((v - min) / range) * (height - padding * 2)

    const line = points
      .map((p, i) => `${toX(i)},${toY(p.bestWeightKg)}`)
      .join(' ')

    const handlePointSelect = (clientX: number, targetRect: DOMRect) => {
      const localX = ((clientX - targetRect.left) / targetRect.width) * width
      const index = Math.max(0, Math.min(points.length - 1, Math.round((localX - padding) / stepX)))
      setSelectedPoints((prev) => ({ ...prev, [itemKey]: index }))
    }

    return (
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <Box sx={{ minWidth: width }}>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            onClick={(e) => {
              e.stopPropagation()
              handlePointSelect(e.clientX, (e.currentTarget as SVGElement).getBoundingClientRect())
            }}
            style={{ cursor: 'pointer' }}
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points={line}
              style={{ color: '#2e7d32' }}
            />
            {points.map((p, i) => (
              <circle
                key={p.dateISO}
                cx={toX(i)}
                cy={toY(p.bestWeightKg)}
                r={selectedIndex === i ? 4 : 3}
                fill={selectedIndex === i ? '#1b5e20' : '#2e7d32'}
              />
            ))}
          </svg>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {points[0]?.dateISO}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {points[points.length - 1]?.dateISO}
            </Typography>
          </Box>
          <Box sx={{ mt: 0.5 }}>
            {selectedIndex !== undefined ? (
              <Typography variant="caption" color="text.secondary">
                {points[selectedIndex].dateISO}: лучший вес {points[selectedIndex].bestWeightKg || '—'} кг ·
                объём {formatVolume(points[selectedIndex].volume)} · подходы {points[selectedIndex].sets}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Нажмите на график, чтобы увидеть значения
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
              Обзор
            </Typography>
            <Select
              size="small"
              value={periodDays}
              onChange={(e) => onPeriodChange(Number(e.target.value))}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value={7}>7 дней</MenuItem>
              <MenuItem value={14}>14 дней</MenuItem>
              <MenuItem value={30}>30 дней</MenuItem>
              <MenuItem value={90}>90 дней</MenuItem>
              <MenuItem value={0}>Всё время</MenuItem>
            </Select>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            <StatCard
              label="Объём"
              value={formatVolume(analytics.totalVolume)}
              delta={
                analytics.totalDeltaPct !== null
                  ? {
                      value: Math.round(analytics.totalDeltaPct),
                      label: `${Math.round(analytics.totalDeltaPct) > 0 ? '+' : ''}${Math.round(analytics.totalDeltaPct)}%`,
                    }
                  : undefined
              }
            />
            <StatCard
              label="Подходы"
              value={analytics.totalSets}
              delta={
                analytics.totalSetsDeltaPct !== null
                  ? {
                      value: Math.round(analytics.totalSetsDeltaPct),
                      label: `${Math.round(analytics.totalSetsDeltaPct) > 0 ? '+' : ''}${Math.round(analytics.totalSetsDeltaPct)}%`,
                    }
                  : undefined
              }
            />
            <StatCard
              label="Средние дни отдыха"
              value={restDaysAvg !== null ? restDaysAvg.toFixed(1) : '—'}
            />
          </Box>
        </Box>

        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            По упражнениям
          </Typography>

          {analytics.list.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Нет данных за выбранный период
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <List disablePadding>
              {analytics.list.map((item, index) => {
                const isExpanded = expandedKey === item.key
                const formatBestSet = () => {
                  if (!item.bestSet) return '—'
                  const w = item.bestSet.weightKg ? `${item.bestSet.weightKg} кг` : 'BW'
                  return `${item.bestSet.reps} × ${w}`
                }

                return (
                  <Card
                    key={item.key}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      mb: index < analytics.list.length - 1 ? 2 : 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        boxShadow: 1,
                      },
                    }}
                    onClick={() => setExpandedKey(isExpanded ? '' : item.key)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack spacing={1.5}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight={700}>
                            {item.exercise}
                          </Typography>
                          {renderDelta(item.deltaPct)}
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Объём
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {formatVolume(item.totalVolume)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Подходы
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {item.sets}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Лучший
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {formatBestSet()}
                            </Typography>
                          </Box>
                        </Box>

                        {isExpanded && (
                          <>
                            <Divider />
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Пред. период
                                </Typography>
                                <Typography variant="body2">
                                  {formatVolume(item.prevVolume)} · {item.prevSets} подх.
                                </Typography>
                              </Box>
                              {item.lastDate && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Последняя
                                  </Typography>
                                  <Typography variant="body2">
                                    {new Intl.DateTimeFormat('ru', { month: 'short', day: 'numeric' }).format(
                                      item.lastDate
                                    )}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Средний вес
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.bestSet ? `${item.bestSet.weightKg} кг` : '—'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  1RM (Эпли)
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.bestSet
                                    ? formatEpley1RM(item.bestSet.weightKg, item.bestSet.reps)
                                    : '—'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Частота
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {periodDays > 0 ? `${(item.sets / (periodDays / 7)).toFixed(1)}/нед` : '—'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Объём/подход
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.sets > 0 ? `${Math.round(item.totalVolume / item.sets)} кг` : '—'}
                                </Typography>
                              </Box>
                            </Box>
                            <Divider />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                Прогресс веса
                              </Typography>
                              {renderWeightProgress(item.exercise, item.key)}
                            </Box>
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </List>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
