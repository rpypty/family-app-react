import { useMemo, useState, useEffect } from 'react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Fab,
  IconButton,
  List,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import type { ExerciseMeta, WorkoutTemplate, TemplateExercise } from '../types'
import { exerciseKey } from '../utils/workout'

interface WorkoutsTemplatesProps {
  templates: WorkoutTemplate[]
  exercises: string[]
  exerciseMeta: Record<string, ExerciseMeta>
  onCreateTemplate: (name: string, exercises: TemplateExercise[]) => Promise<WorkoutTemplate>
  onUpdateTemplate: (template: WorkoutTemplate) => Promise<WorkoutTemplate>
  onDeleteTemplate: (id: string) => void | Promise<void>
  onAddExercise: (name: string) => void
  onUpsertMeta: (meta: ExerciseMeta) => void
  onRenameExercise: (from: string, to: string) => void
  onDeleteExercise: (name: string) => void
}

type Mode = 'templates' | 'exercises'

export function WorkoutsTemplates({
  templates,
  exercises,
  exerciseMeta,
  onDeleteTemplate,
  onDeleteExercise,
}: WorkoutsTemplatesProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('templates')
  const [query, setQuery] = useState('')
  const [swipedExercise, setSwipedExercise] = useState<string | null>(null)
  const touchStartX = React.useRef<number | null>(null)
  const cardRefs = React.useRef<Map<string, HTMLElement>>(new Map())

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((t) => t.name.toLowerCase().includes(q))
  }, [templates, query])

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter((e) => e.toLowerCase().includes(q))
  }, [exercises, query])

  // Template handlers
  const openNewTemplate = () => {
    navigate('/miniapps/workouts/templates/new')
  }

  const openEditTemplate = (id: string) => {
    navigate(`/miniapps/workouts/templates/${id}`)
  }

  // Exercise handlers
  const openNewExercise = () => {
    navigate('/miniapps/workouts/exercise/new')
  }

  const openEditExercise = (name: string) => {
    navigate(`/miniapps/workouts/exercise/${encodeURIComponent(name)}`)
  }

  // Close swiped card when clicking outside
  useEffect(() => {
    if (!swipedExercise) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const swipedCard = cardRefs.current.get(swipedExercise)
      if (swipedCard && !swipedCard.contains(target)) {
        setSwipedExercise(null)
      }
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [swipedExercise])

  const handleDeleteExercise = (name: string) => {
    onDeleteExercise(name)
  }

  return (
    <Box sx={{ pb: 'calc(220px + env(safe-area-inset-bottom))' }}>
      <Stack spacing={2.5}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
          {mode === 'templates' ? 'Шаблоны тренировок' : 'Упражнения'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={mode === 'templates' ? 'contained' : 'outlined'}
            onClick={() => setMode('templates')}
            sx={{
              flex: 1,
              bgcolor: mode === 'templates' ? 'var(--wk-accent)' : 'transparent',
              color: mode === 'templates' ? 'var(--wk-accent-contrast)' : 'var(--wk-ink)',
              borderColor: 'var(--wk-border)',
              '&:hover': {
                bgcolor: mode === 'templates' ? 'var(--wk-accent)' : 'var(--wk-accent-soft)',
              },
            }}
          >
            Тренировки
          </Button>
          <Button
            variant={mode === 'exercises' ? 'contained' : 'outlined'}
            onClick={() => setMode('exercises')}
            sx={{
              flex: 1,
              bgcolor: mode === 'exercises' ? 'var(--wk-accent)' : 'transparent',
              color: mode === 'exercises' ? 'var(--wk-accent-contrast)' : 'var(--wk-ink)',
              borderColor: 'var(--wk-border)',
              '&:hover': {
                bgcolor: mode === 'exercises' ? 'var(--wk-accent)' : 'var(--wk-accent-soft)',
              },
            }}
          >
            Упражнения
          </Button>
        </Box>

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'templates' ? 'Поиск шаблонов' : 'Поиск упражнений'}
          fullWidth
        />

        {mode === 'templates' ? (
          <List disablePadding>
            {filteredTemplates.length === 0 ? (
              <Typography sx={{ color: 'var(--wk-muted)', textAlign: 'center', py: 4 }}>
                Нет шаблонов
              </Typography>
            ) : (
              filteredTemplates.map((t) => (
                <Card
                  key={t.id}
                  variant="outlined"
                  sx={{
                    mb: 1.5,
                    bgcolor: 'var(--wk-card)',
                    borderColor: 'var(--wk-border)',
                    borderRadius: 'var(--wk-radius-sm)',
                  }}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      '&:last-child': { pb: 2 },
                    }}
                  >
                    <Box sx={{ flex: 1 }} onClick={() => openEditTemplate(t.id)}>
                      <Typography variant="body1" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                        {(t.exercises || []).length} упр.
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => openEditTemplate(t.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteTemplate(t.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </List>
        ) : (
          <List disablePadding>
            {filteredExercises.length === 0 ? (
              <Typography sx={{ color: 'var(--wk-muted)', textAlign: 'center', py: 4 }}>
                Нет упражнений
              </Typography>
            ) : (
              filteredExercises.map((e) => {
                const key = exerciseKey(e)
                const meta = exerciseMeta[key]
                return (
                  <Box
                    key={e}
                    ref={(el: HTMLElement | null) => {
                      if (el) cardRefs.current.set(e, el)
                      else cardRefs.current.delete(e)
                    }}
                    sx={{
                      position: 'relative',
                      mb: 1.5,
                    }}
                  >
                    {/* Delete Button (Behind) */}
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 80,
                        bgcolor: '#f44336',
                        borderRadius: '0 var(--wk-radius-sm) var(--wk-radius-sm) 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: swipedExercise === e ? 1 : 0,
                        transition: 'opacity 0.2s ease',
                        pointerEvents: swipedExercise === e ? 'auto' : 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        handleDeleteExercise(e)
                        setSwipedExercise(null)
                      }}
                    >
                      <DeleteIcon sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>

                    {/* Card (Front) */}
                    <Card
                      variant="outlined"
                      sx={{
                        bgcolor: 'var(--wk-card)',
                        borderColor: 'var(--wk-border)',
                        borderRadius: 'var(--wk-radius-sm)',
                        transform: swipedExercise === e ? 'translateX(-80px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                        position: 'relative',
                        zIndex: 1,
                      }}
                      style={{ touchAction: 'pan-y' }}
                      onTouchStart={(ev) => {
                        touchStartX.current = ev.touches[0]?.clientX ?? null
                      }}
                      onTouchEnd={(ev) => {
                        const startX = touchStartX.current
                        const endX = ev.changedTouches[0]?.clientX
                        touchStartX.current = null

                        if (startX !== null && endX !== undefined) {
                          const delta = startX - endX
                          // Swipe left to reveal delete
                          if (delta > 80) {
                            setSwipedExercise(e)
                          }
                          // Swipe right to close
                          else if (delta < -40 && swipedExercise === e) {
                            setSwipedExercise(null)
                          }
                        }
                      }}
                    >
                      <CardContent
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          '&:last-child': { pb: 2 },
                        }}
                        onClick={() => openEditExercise(e)}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
                            {e}
                          </Typography>
                          {meta?.note && (
                            <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
                              {meta.note}
                            </Typography>
                          )}
                          {meta?.isWeightless && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'var(--wk-accent)',
                                display: 'block',
                                fontWeight: 600,
                              }}
                            >
                              Без веса
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            openEditExercise(e)
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </CardContent>
                    </Card>
                  </Box>
                )
              })
            )}
          </List>
        )}
      </Stack>

      <Fab
        color="primary"
        aria-label={mode === 'templates' ? 'Добавить шаблон' : 'Добавить упражнение'}
        onClick={() => (mode === 'templates' ? openNewTemplate() : openNewExercise())}
        sx={{
          position: 'fixed',
          right: 20,
          bottom: 'calc(120px + env(safe-area-inset-bottom))',
          bgcolor: 'var(--wk-accent)',
          color: 'var(--wk-accent-contrast)',
          boxShadow: 'var(--wk-shadow)',
          '&:hover': { bgcolor: 'var(--wk-accent)' },
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  )
}
