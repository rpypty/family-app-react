import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded'
import type { WorkoutTemplate } from '../types'
import { formatDateLabel } from '../utils/date'

interface WorkoutPickerProps {
  templates: WorkoutTemplate[]
  selectedDate?: string
  onCreateFromTemplate: (templateId: string) => void
  onCreateCustom: () => void
}

export function WorkoutPicker({
  templates,
  selectedDate,
  onCreateFromTemplate,
  onCreateCustom
}: WorkoutPickerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggleExpand = (templateId: string) => {
    setExpandedId(expandedId === templateId ? null : templateId)
  }

  return (
    <Box sx={{ pb: 'calc(140px + env(safe-area-inset-bottom))' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={800} sx={{ color: 'var(--wk-ink)' }}>
              Новая тренировка
            </Typography>
            {selectedDate && (
              <Typography variant="body2" sx={{ color: 'var(--wk-muted)' }}>
                {formatDateLabel(selectedDate)}
              </Typography>
            )}
          </Stack>
        </Box>

        {/* Custom Workout Button */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 'var(--wk-radius)',
            borderColor: 'var(--wk-border)',
            bgcolor: 'var(--wk-card)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'var(--wk-accent)',
              transform: 'translateY(-2px)',
              boxShadow: 'var(--wk-shadow)',
            },
          }}
          onClick={onCreateCustom}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--wk-radius-sm)',
                  bgcolor: 'var(--wk-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--wk-accent-contrast)',
                }}
              >
                <AddIcon fontSize="large" />
              </Box>
              <Stack spacing={0.5} sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                  Создать пустую тренировку
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                  Начните с чистого листа
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Templates Section */}
        {templates.length > 0 && (
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'var(--wk-muted)' }}>
              Или выберите шаблон
            </Typography>

            {templates.map((template) => {
              const isExpanded = expandedId === template.id
              const exerciseGroups = template.sets.reduce<Record<string, number>>((acc, set) => {
                acc[set.exercise] = (acc[set.exercise] || 0) + 1
                return acc
              }, {})
              const exerciseCount = Object.keys(exerciseGroups).length
              const setCount = template.sets.length

              return (
                <Card
                  key={template.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 'var(--wk-radius)',
                    borderColor: 'var(--wk-border)',
                    bgcolor: 'var(--wk-card)',
                  }}
                >
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleToggleExpand(template.id)}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 'var(--wk-radius-sm)',
                              bgcolor: 'var(--wk-ink-soft)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--wk-ink)',
                              flexShrink: 0,
                            }}
                          >
                            <FitnessCenterRounded />
                          </Box>
                          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: 'var(--wk-ink)' }}>
                              {template.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                              {exerciseCount} {exerciseCount === 1 ? 'упражнение' : 'упражнения'} • {setCount}{' '}
                              {setCount === 1 ? 'подход' : 'подходов'}
                            </Typography>
                          </Stack>
                        </Stack>
                        <IconButton
                          size="small"
                          sx={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s',
                          }}
                        >
                          <ExpandMoreRounded />
                        </IconButton>
                      </Box>

                      <Collapse in={isExpanded}>
                        <Stack spacing={1.5}>
                          <Divider />
                          <Stack spacing={1}>
                            {Object.entries(exerciseGroups).map(([exercise, count]) => (
                              <Box
                                key={exercise}
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  py: 0.5,
                                }}
                              >
                                <Typography variant="body2" sx={{ color: 'var(--wk-ink)' }}>
                                  {exercise}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                                  {count} {count === 1 ? 'подход' : 'подходов'}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={(e) => {
                              e.stopPropagation()
                              onCreateFromTemplate(template.id)
                            }}
                            sx={{
                              bgcolor: 'var(--wk-accent)',
                              color: 'var(--wk-accent-contrast)',
                              fontWeight: 700,
                              textTransform: 'none',
                              borderRadius: 'var(--wk-radius-sm)',
                              py: 1.5,
                              '&:hover': {
                                bgcolor: 'var(--wk-accent)',
                                opacity: 0.9,
                              },
                            }}
                          >
                            Начать тренировку
                          </Button>
                        </Stack>
                      </Collapse>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
