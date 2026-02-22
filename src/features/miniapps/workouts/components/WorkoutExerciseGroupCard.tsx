import { useRef } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import type { WorkoutSet } from '../types'
import { volumeForSet } from '../utils/workout'
import { WeightChips } from './WeightChips'

export interface WorkoutExerciseGroup {
  key: string
  name: string
  isWeightless: boolean
  note: string
  sets: WorkoutSet[]
  stats?: {
    avgWeightChange?: number | null
    volumeChange?: number | null
    prevAvgWeight?: number | null
    prevVolume?: number | null
  }
}

type WeightSuggestion = {
  lastWeight: number | null
  bestWeight: number | null
}

interface WorkoutExerciseGroupCardProps {
  group: WorkoutExerciseGroup
  hint?: WeightSuggestion
  isSwiped: boolean
  onSwipeOpen: () => void
  onSwipeClose: () => void
  onConfirmDeleteExercise: () => void
  onConfirmDeleteSet: (setId: string) => void
  onUpdateSet: (setId: string, patch: Partial<WorkoutSet>) => void
  onSave: () => void
  onAddSet: () => void
  cardRef?: (el: HTMLDivElement | null) => void
}

export function WorkoutExerciseGroupCard({
  group,
  hint,
  isSwiped,
  onSwipeOpen,
  onSwipeClose,
  onConfirmDeleteExercise,
  onConfirmDeleteSet,
  onUpdateSet,
  onSave,
  onAddSet,
  cardRef,
}: WorkoutExerciseGroupCardProps) {
  const touchStartXRef = useRef<number | null>(null)
  const volume = group.sets.reduce((sum, set) => sum + volumeForSet(set, group.isWeightless), 0)

  return (
    <Box key={group.key} sx={{ position: 'relative' }} ref={cardRef}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'var(--wk-radius)',
          bgcolor: 'error.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pr: 2,
          color: 'error.contrastText',
          opacity: isSwiped ? 1 : 0,
          transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          cursor: 'pointer',
          pointerEvents: isSwiped ? 'auto' : 'none',
        }}
        onClick={() => {
          onConfirmDeleteExercise()
          onSwipeClose()
        }}
      >
        <DeleteOutlineRounded sx={{ fontSize: 36 }} />
      </Box>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 'var(--wk-radius)',
          borderColor: 'var(--wk-border)',
          bgcolor: 'var(--wk-card)',
          transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          position: 'relative',
        }}
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current
          const endX = event.changedTouches[0]?.clientX
          touchStartXRef.current = null

          if (startX === null || endX === undefined) {
            return
          }

          const delta = startX - endX
          if (delta > 80) {
            onSwipeOpen()
          } else if (delta < -40 && isSwiped) {
            onSwipeClose()
          }
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: 'var(--wk-ink)' }}>
                  {group.name}
                </Typography>
                {group.note ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'var(--wk-muted)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {group.note}
                  </Typography>
                ) : null}
                {group.isWeightless ? (
                  <Typography variant="caption" color="warning.main">
                    Без веса
                  </Typography>
                ) : null}
              </Stack>
            </Stack>

            {group.stats && !group.isWeightless ? (
              <Typography variant="caption" sx={{ color: 'var(--wk-muted)', display: 'block' }}>
                Вес:{' '}
                <Box component="span" sx={{ color: deltaColor(group.stats.avgWeightChange) }}>
                  {formatPercent(group.stats.avgWeightChange)}
                </Box>
                {' '}• Пред. вес:{' '}
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {group.stats.prevAvgWeight ? `${group.stats.prevAvgWeight.toFixed(1)} кг` : '—'}
                </Box>
                <br />
                Объем:{' '}
                <Box component="span" sx={{ color: deltaColor(group.stats.volumeChange) }}>
                  {formatPercent(group.stats.volumeChange)}
                </Box>
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                Объем: {Math.round(volume)}
              </Typography>
            )}

            <Typography variant="caption" sx={{ color: 'var(--wk-muted)', fontStyle: 'italic' }}>
              Свайпните влево для удаления
            </Typography>

            <Stack spacing={1}>
              {group.sets.map((set) => (
                <Stack key={set.id} spacing={0.75}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: group.isWeightless
                        ? { xs: '1fr auto', sm: '140px auto' }
                        : { xs: '1fr 1fr auto', sm: '120px 120px auto' },
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      label="Повт."
                      type="number"
                      value={set.reps || ''}
                      onChange={(event) => {
                        const value = event.target.value
                        onUpdateSet(set.id, { reps: value === '' ? 0 : Number(value) })
                      }}
                      onBlur={onSave}
                      size="small"
                      sx={{ minWidth: 0 }}
                    />
                    {!group.isWeightless ? (
                      <TextField
                        label="Вес"
                        type="number"
                        value={set.weightKg || ''}
                        onChange={(event) => {
                          const value = event.target.value
                          onUpdateSet(set.id, { weightKg: value === '' ? 0 : Number(value) })
                        }}
                        onBlur={onSave}
                        size="small"
                        sx={{ minWidth: 0 }}
                      />
                    ) : null}
                    <IconButton
                      size="small"
                      onClick={() => onConfirmDeleteSet(set.id)}
                      sx={{
                        bgcolor: 'var(--wk-ink-soft)',
                        width: 28,
                        height: 28,
                        justifySelf: 'end',
                        flexShrink: 0,
                      }}
                    >
                      <CloseRounded fontSize="small" sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                  {!group.isWeightless && hint && !set.weightKg ? (
                    <WeightChips
                      lastWeight={hint.lastWeight}
                      bestWeight={hint.bestWeight}
                      onSelect={(weight) => onUpdateSet(set.id, { weightKg: weight })}
                    />
                  ) : null}
                  <Divider />
                </Stack>
              ))}
            </Stack>

            <Button
              variant="text"
              size="small"
              onClick={onAddSet}
              startIcon={<AddIcon />}
              sx={{
                fontWeight: 700,
                alignSelf: 'flex-start',
                textTransform: 'none',
                borderRadius: 999,
                color: 'var(--wk-accent)',
                bgcolor: 'transparent',
                border: '1px solid transparent',
                px: 1.5,
                '&:hover': {
                  bgcolor: 'transparent',
                },
              }}
            >
              Добавить подход
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

function deltaColor(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'var(--wk-muted)'
  if (value > 0) return 'success.main'
  if (value < 0) return 'error.main'
  return 'var(--wk-muted)'
}

function formatPercent(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
