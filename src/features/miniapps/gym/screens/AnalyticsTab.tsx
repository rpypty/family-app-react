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
import { StatCard } from '../components/StatCard'

interface AnalyticsTabProps {
  entries: GymEntry[]
  periodDays: number
  onPeriodChange: (days: number) => void
}

export function AnalyticsTab({ entries, periodDays, onPeriodChange }: AnalyticsTabProps) {
  const [expandedKey, setExpandedKey] = useState<string>('')

  const analytics = useMemo(() => computeAnalytics(entries, periodDays), [entries, periodDays])

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

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
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
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
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
