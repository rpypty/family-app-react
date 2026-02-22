import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ExerciseMeta, WorkoutTemplate, TemplateSet } from '../types'
import { ExercisePicker } from '../components/ExercisePicker'
import { exerciseKey } from '../utils/workout'

interface TemplateEditorProps {
  templateId?: string
  templates: WorkoutTemplate[]
  exercises: string[]
  exerciseMeta: Record<string, ExerciseMeta>
  onCreateTemplate: (name: string, sets: TemplateSet[]) => Promise<WorkoutTemplate>
  onUpdateTemplate: (template: WorkoutTemplate) => Promise<WorkoutTemplate>
}

type DraftSet = { id: string; weightKg: number; reps: number }
type DraftExercise = { name: string; sets: DraftSet[]; isWeightless: boolean }

type ConfirmState =
  | { open: false }
  | { open: true; kind: 'set'; exerciseName: string; setId: string }
  | { open: true; kind: 'exercise'; exerciseName: string }

const createRandomId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const serializeDraft = (name: string, items: DraftExercise[]) => JSON.stringify({
  name: name.trim(),
  items: items.map((item) => ({
    name: item.name,
    isWeightless: item.isWeightless,
    sets: item.sets.map((set) => ({
      id: set.id,
      weightKg: set.weightKg,
      reps: set.reps,
    })),
  })),
})

const toDraftItems = (
  template: WorkoutTemplate,
  exerciseMeta: Record<string, ExerciseMeta>,
): DraftExercise[] => {
  const grouped = new Map<string, DraftSet[]>()
  for (const set of template.sets || []) {
    if (!grouped.has(set.exercise)) {
      grouped.set(set.exercise, [])
    }
    grouped.get(set.exercise)!.push({
      id: set.id || createRandomId(),
      weightKg: set.weightKg || 0,
      reps: set.reps || 8,
    })
  }

  return Array.from(grouped.entries()).map(([exerciseName, sets]) => {
    const key = exerciseKey(exerciseName)
    const meta = exerciseMeta[key]
    return {
      name: exerciseName,
      sets,
      isWeightless: meta?.isWeightless || false,
    }
  })
}

export function TemplateEditor({
  templateId: templateIdProp,
  templates,
  exercises,
  exerciseMeta,
  onCreateTemplate,
  onUpdateTemplate,
}: TemplateEditorProps) {
  const navigate = useNavigate()
  const templateId = templateIdProp
  const isNew = templateId === 'new'
  const sourceTemplate = !isNew && templateId ? templates.find((template) => template.id === templateId) : undefined
  const initialDraft = useMemo(() => {
    if (!sourceTemplate) {
      return { name: '', items: [] as DraftExercise[] }
    }
    return {
      name: sourceTemplate.name,
      items: toDraftItems(sourceTemplate, exerciseMeta),
    }
  }, [sourceTemplate, exerciseMeta])

  const [name, setName] = useState(() => initialDraft.name)
  const [items, setItems] = useState<DraftExercise[]>(() => initialDraft.items)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [swipedExercise, setSwipedExercise] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false })
  const lastSaved = useRef(isNew ? '' : serializeDraft(initialDraft.name, initialDraft.items))
  const touchStartXRef = useRef<number | null>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Manual save function (called on blur)
  const handleSave = useCallback(() => {
    if (!name.trim() || items.length === 0) return

    const snapshot = serializeDraft(name, items)
    if (snapshot === lastSaved.current) return

    lastSaved.current = snapshot

    // Convert DraftExercise[] to flat TemplateSet[]
    const converted: TemplateSet[] = items.flatMap((it) =>
      it.sets.map((s) => ({
        id: s.id,
        exercise: it.name,
        reps: s.reps,
        weightKg: s.weightKg,
      }))
    )

    if (isNew) {
      void (async () => {
        try {
          const created = await onCreateTemplate(name.trim(), converted)
          navigate(`/miniapps/workouts/templates/${created.id}`, { replace: true })
        } catch (error) {
          console.error('TemplateEditor: Failed to create template:', error)
        }
      })()
    } else if (templateId) {
      void onUpdateTemplate({
        id: templateId,
        name: name.trim(),
        sets: converted,
        createdAt: templates.find((t) => t.id === templateId)?.createdAt || Date.now(),
      })
    }
  }, [name, items, templateId, isNew, onCreateTemplate, onUpdateTemplate, navigate, templates])

  const handleAddExercise = (exerciseName: string) => {
    const n = (exerciseName || '').trim()
    if (!n) return
    const key = exerciseKey(n)
    if (items.some((it) => exerciseKey(it.name) === key)) return
    const meta = exerciseMeta[key]
    setItems((prev) => [
      ...prev,
      { name: n, sets: [{ id: createRandomId(), weightKg: 0, reps: 8 }], isWeightless: meta?.isWeightless || false },
    ])
    setIsPickerOpen(false)
  }

  const handleAddSet = (exerciseName: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.name === exerciseName
          ? { ...it, sets: [...it.sets, { id: createRandomId(), weightKg: 0, reps: 8 }] }
          : it
      )
    )
  }

  const handleRemoveSet = (exerciseName: string, setId: string) => {
    setItems((prev) => {
      const updated = prev.map((it) =>
        it.name === exerciseName ? { ...it, sets: it.sets.filter((s) => s.id !== setId) } : it
      )
      
      // Save with the new state
      setTimeout(() => {
        const converted = updated.flatMap((it) =>
          it.sets.map((s) => ({
            id: s.id,
            exercise: it.name,
            reps: s.reps,
            weightKg: s.weightKg,
          }))
        )
        
        if (!isNew && templateId) {
          void onUpdateTemplate({
            id: templateId,
            name: name.trim(),
            sets: converted,
            createdAt: templates.find((t) => t.id === templateId)?.createdAt || Date.now(),
          })
        }
      }, 0)
      
      return updated
    })
  }

  const handleUpdateSet = (
    exerciseName: string,
    setId: string,
    field: 'weightKg' | 'reps',
    value: number
  ) => {
    setItems((prev) =>
      prev.map((it) =>
        it.name === exerciseName
          ? { ...it, sets: it.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : it
      )
    )
  }

  const handleRemoveExercise = (exerciseName: string) => {
    setItems((prev) => {
      const updated = prev.filter((it) => it.name !== exerciseName)
      
      // Save with the new state
      setTimeout(() => {
        const converted = updated.flatMap((it) =>
          it.sets.map((s) => ({
            id: s.id,
            exercise: it.name,
            reps: s.reps,
            weightKg: s.weightKg,
          }))
        )
        
        if (!isNew && templateId) {
          void onUpdateTemplate({
            id: templateId,
            name: name.trim(),
            sets: converted,
            createdAt: templates.find((t) => t.id === templateId)?.createdAt || Date.now(),
          })
        }
      }, 0)
      
      return updated
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems((items) => {
      const oldIndex = items.findIndex((item) => item.name === active.id)
      const newIndex = items.findIndex((item) => item.name === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex)
      
      // Save after reordering with the new state
      setTimeout(() => {
        const converted = reordered.flatMap((it) =>
          it.sets.map((s) => ({
            id: s.id,
            exercise: it.name,
            reps: s.reps,
            weightKg: s.weightKg,
          }))
        )
        
        if (!isNew && templateId) {
          void onUpdateTemplate({
            id: templateId,
            name: name.trim(),
            sets: converted,
            createdAt: templates.find((t) => t.id === templateId)?.createdAt || Date.now(),
          })
        }
      }, 0)
      
      return reordered
    })
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

  return (
    <Box sx={{ pb: 'calc(140px + env(safe-area-inset-bottom))' }}>
      <ExercisePicker
        open={isPickerOpen}
        exercises={exercises}
        onSelect={(name) => {
          handleAddExercise(name)
          setIsPickerOpen(false)
        }}
        onClose={() => setIsPickerOpen(false)}
        onCreate={(name) => {
          handleAddExercise(name)
          setIsPickerOpen(false)
        }}
      />

      <Stack spacing={2.5}>
        {/* Header */}
        <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--wk-ink)' }}>
          {isNew ? 'Новый шаблон' : 'Редактировать шаблон'}
        </Typography>

        {/* Template Name */}
        <TextField
          label="Название шаблона"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          fullWidth
          autoFocus
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'var(--wk-card)',
              borderRadius: 'var(--wk-radius-sm)',
            },
          }}
        />

        {/* Exercise List */}
        {items.length === 0 ? (
          <Card
            variant="outlined"
            sx={{
              bgcolor: 'var(--wk-card)',
              borderColor: 'var(--wk-border)',
              borderRadius: 'var(--wk-radius-sm)',
            }}
          >
            <CardContent>
              <Typography variant="body2" sx={{ color: 'var(--wk-muted)', textAlign: 'center' }}>
                Добавьте упражнения
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((item) => item.name)} strategy={verticalListSortingStrategy}>
              <Stack spacing={2}>
                {items.map((item) => (
                  <SortableExerciseCard
                    key={item.name}
                    item={item}
                    swipedExercise={swipedExercise}
                    onSwipe={setSwipedExercise}
                    cardRefs={cardRefs}
                    touchStartXRef={touchStartXRef}
                    setConfirm={setConfirm}
                    onAddSet={handleAddSet}
                    onRemoveSet={handleRemoveSet}
                    onUpdateSet={handleUpdateSet}
                    onRemoveExercise={handleRemoveExercise}
                    onSave={handleSave}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        )}
      </Stack>

      <Fab
        color="primary"
        aria-label="Добавить упражнение"
        onClick={() => setIsPickerOpen(true)}
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

      <Dialog open={confirm.open} onClose={() => setConfirm({ open: false })}>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--wk-card)' }}>
          <Typography variant="body2" sx={{ color: 'var(--wk-muted)' }}>
            {confirm.open && confirm.kind === 'exercise'
              ? `Удалить упражнение «${confirm.exerciseName}» и все его подходы?`
              : 'Удалить выбранный подход?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm({ open: false })}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!confirm.open) return
              if (confirm.kind === 'exercise') {
                handleRemoveExercise(confirm.exerciseName)
              } else {
                handleRemoveSet(confirm.exerciseName, confirm.setId)
              }
              setConfirm({ open: false })
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// Sortable Exercise Card Component
interface SortableExerciseCardProps {
  item: DraftExercise
  swipedExercise: string | null
  onSwipe: (name: string | null) => void
  cardRefs: MutableRefObject<Map<string, HTMLElement>>
  touchStartXRef: MutableRefObject<number | null>
  setConfirm: (state: ConfirmState) => void
  onAddSet: (exerciseName: string) => void
  onRemoveSet: (exerciseName: string, setId: string) => void
  onUpdateSet: (exerciseName: string, setId: string, field: 'weightKg' | 'reps', value: number) => void
  onRemoveExercise: (exerciseName: string) => void
  onSave: () => void
}

function SortableExerciseCard({
  item,
  swipedExercise,
  onSwipe,
  cardRefs,
  touchStartXRef,
  setConfirm,
  onAddSet,
  onUpdateSet,
  onSave,
}: SortableExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.name,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Box
      ref={(el: HTMLElement | null) => {
        if (el) cardRefs.current.set(item.name, el)
        else cardRefs.current.delete(item.name)
      }}
      style={style}
      sx={{ 
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
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
          opacity: swipedExercise === item.name ? 1 : 0,
          transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          cursor: 'pointer',
          pointerEvents: swipedExercise === item.name ? 'auto' : 'none',
        }}
        onClick={() => {
          setConfirm({ open: true, kind: 'exercise', exerciseName: item.name })
          onSwipe(null)
        }}
      >
        <DeleteOutlineRounded sx={{ fontSize: 36 }} />
      </Box>
      <Card
        ref={setNodeRef}
        variant="outlined"
        sx={{
          borderRadius: 'var(--wk-radius)',
          borderColor: 'var(--wk-border)',
          bgcolor: 'var(--wk-card)',
          transform: swipedExercise === item.name ? 'translateX(-80px)' : 'translateX(0)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          position: 'relative',
        }}
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          const startX = touchStartXRef.current
          const endX = e.changedTouches[0]?.clientX
          touchStartXRef.current = null

          if (startX !== null && endX !== undefined) {
            const delta = startX - endX
            // Swipe left to reveal delete
            if (delta > 80) {
              onSwipe(item.name)
            }
            // Swipe right to close
            else if (delta < -40 && swipedExercise === item.name) {
              onSwipe(null)
            }
          }
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  {...attributes}
                  {...listeners}
                  sx={{
                    cursor: 'grab',
                    display: 'flex',
                    color: 'var(--wk-muted)',
                    touchAction: 'none',
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <DragIndicatorIcon />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: 'var(--wk-ink)' }}>
                  {item.name}
                </Typography>
              </Stack>
            </Stack>

            <Typography variant="caption" sx={{ color: 'var(--wk-muted)', fontStyle: 'italic' }}>
              Свайпните влево для удаления
            </Typography>

            <Stack spacing={1}>
              {item.sets.map((set) => (
                <Stack key={set.id} spacing={0.75}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: item.isWeightless
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
                      onChange={(e) =>
                        onUpdateSet(item.name, set.id, 'reps', e.target.value === '' ? 0 : parseInt(e.target.value))
                      }
                      onBlur={onSave}
                      size="small"
                      sx={{ minWidth: 0 }}
                    />
                    {!item.isWeightless && (
                      <TextField
                        label="Вес"
                        type="number"
                        value={set.weightKg || ''}
                        onChange={(e) =>
                          onUpdateSet(item.name, set.id, 'weightKg', e.target.value === '' ? 0 : parseFloat(e.target.value))
                        }
                        onBlur={onSave}
                        size="small"
                        sx={{ minWidth: 0 }}
                      />
                    )}
                    <IconButton
                      size="small"
                      onClick={() =>
                        setConfirm({ open: true, kind: 'set', exerciseName: item.name, setId: set.id })
                      }
                      sx={{
                        bgcolor: 'var(--wk-ink-soft)',
                        width: 28,
                        height: 28,
                        justifySelf: 'end',
                        flexShrink: 0,
                      }}
                    >
                      <DeleteOutlineRounded fontSize="small" sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                  <Divider />
                </Stack>
              ))}
            </Stack>

            <Button
              variant="text"
              size="small"
              onClick={() => onAddSet(item.name)}
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
