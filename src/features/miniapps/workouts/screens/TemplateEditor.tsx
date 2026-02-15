import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { WorkoutTemplate, TemplateSet } from '../types'
import { ExercisePicker } from '../components/ExercisePicker'
import { exerciseKey } from '../utils/workout'

interface TemplateEditorProps {
  templateId?: string
  templates: WorkoutTemplate[]
  exercises: string[]
  onCreateTemplate: (name: string, sets: TemplateSet[]) => Promise<WorkoutTemplate>
  onUpdateTemplate: (template: WorkoutTemplate) => Promise<WorkoutTemplate>
}

type DraftSet = { id: string; weightKg: number; reps: number }
type DraftExercise = { name: string; sets: DraftSet[] }

type ConfirmState =
  | { open: false }
  | { open: true; kind: 'set'; exerciseName: string; setId: string }
  | { open: true; kind: 'exercise'; exerciseName: string }

export function TemplateEditor({
  templateId: templateIdProp,
  templates,
  exercises,
  onCreateTemplate,
  onUpdateTemplate,
}: TemplateEditorProps) {
  const navigate = useNavigate()
  const templateId = templateIdProp
  const isNew = templateId === 'new'

  const [name, setName] = useState('')
  const [items, setItems] = useState<DraftExercise[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [swipedExercise, setSwipedExercise] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false })
  const applyingRemote = useRef(false)
  const isEditing = useRef(false)
  const touchStartX = useRef<number | null>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())

  const cryptoRandomId = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }, [])

  // Load template data (only on initial load or template change)
  useEffect(() => {
    console.log('TemplateEditor: Loading template', { templateId, isNew, templatesCount: templates.length })
    
    if (isNew) {
      console.log('TemplateEditor: Is new template, clearing form')
      setName('')
      setItems([])
      isEditing.current = false
      return
    }

    if (templateId) {
      const template = templates.find((t) => t.id === templateId)
      console.log('TemplateEditor: Found template?', { found: !!template, template })
      
      // Skip reload if user is actively editing
      if (isEditing.current && template) {
        console.log('TemplateEditor: Skipping reload - user is editing')
        return
      }
      
      if (template) {
        applyingRemote.current = true
        setName(template.name)
        
        // Convert flat TemplateSet[] to grouped DraftExercise[]
        const grouped = new Map<string, DraftSet[]>()
        for (const set of template.sets || []) {
          if (!grouped.has(set.exercise)) {
            grouped.set(set.exercise, [])
          }
          grouped.get(set.exercise)!.push({
            id: set.id || cryptoRandomId(),
            weightKg: set.weightKg || 0,
            reps: set.reps || 8,
          })
        }
        
        setItems(
          Array.from(grouped.entries()).map(([name, sets]) => ({
            name,
            sets,
          }))
        )
        
        console.log('TemplateEditor: Loaded template data', { name: template.name, setsCount: template.sets?.length })
        setTimeout(() => {
          applyingRemote.current = false
        }, 50)
      }
    }
  }, [templateId, templates, isNew, cryptoRandomId])

  // Auto-save with debounce
  useEffect(() => {
    if (applyingRemote.current) {
      console.log('TemplateEditor: Skipping auto-save (applying remote)')
      return
    }
    if (!name.trim() || items.length === 0) {
      console.log('TemplateEditor: Skipping auto-save (empty data)', { name: name.trim(), itemsLength: items.length })
      return
    }

    console.log('TemplateEditor: Setting up auto-save timer', { name, itemsLength: items.length, templateId, isNew })

    const timer = setTimeout(async () => {
      // Convert DraftExercise[] to flat TemplateSet[]
      const converted: TemplateSet[] = items.flatMap((it) =>
        it.sets.map((s) => ({
          id: s.id,
          exercise: it.name,
          reps: s.reps,
          weightKg: s.weightKg,
        }))
      )

      console.log('TemplateEditor: Auto-saving template', { isNew, templateId, name, sets: converted })

      try {
        if (isNew) {
          console.log('TemplateEditor: Creating new template')
          const created = await onCreateTemplate(name.trim(), converted)
          console.log('TemplateEditor: Created template', created)
          isEditing.current = false
          navigate(`/miniapps/workouts/templates/${created.id}`, { replace: true })
        } else if (templateId) {
          console.log('TemplateEditor: Updating existing template', templateId)
          await onUpdateTemplate({
            id: templateId,
            name: name.trim(),
            sets: converted,
            createdAt: templates.find((t) => t.id === templateId)?.createdAt || Date.now(),
          })
          console.log('TemplateEditor: Updated template')
          // Reset editing flag after successful save
          setTimeout(() => {
            isEditing.current = false
          }, 100)
        }
      } catch (error) {
        console.error('TemplateEditor: Failed to save template:', error)
      }
    }, 500)

    return () => {
      console.log('TemplateEditor: Clearing auto-save timer')
      clearTimeout(timer)
    }
  }, [name, items, templateId, isNew, onCreateTemplate, onUpdateTemplate, navigate, templates])

  const handleAddExercise = (exerciseName: string) => {
    const n = (exerciseName || '').trim()
    if (!n) return
    const key = exerciseKey(n)
    if (items.some((it) => exerciseKey(it.name) === key)) return
    isEditing.current = true
    setItems((prev) => [
      ...prev,
      { name: n, sets: [{ id: cryptoRandomId(), weightKg: 0, reps: 8 }] },
    ])
    setIsPickerOpen(false)
  }

  const handleAddSet = (exerciseName: string) => {
    isEditing.current = true
    setItems((prev) =>
      prev.map((it) =>
        it.name === exerciseName
          ? { ...it, sets: [...it.sets, { id: cryptoRandomId(), weightKg: 0, reps: 8 }] }
          : it
      )
    )
  }

  const handleRemoveSet = (exerciseName: string, setId: string) => {
    isEditing.current = true
    setItems((prev) =>
      prev.map((it) =>
        it.name === exerciseName ? { ...it, sets: it.sets.filter((s) => s.id !== setId) } : it
      )
    )
  }

  const handleUpdateSet = (
    exerciseName: string,
    setId: string,
    field: 'weightKg' | 'reps',
    value: number
  ) => {
    isEditing.current = true
    setItems((prev) =>
      prev.map((it) =>
        it.name === exerciseName
          ? { ...it, sets: it.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : it
      )
    )
  }

  const handleRemoveExercise = (exerciseName: string) => {
    isEditing.current = true
    setItems((prev) => prev.filter((it) => it.name !== exerciseName))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    isEditing.current = true
    setItems((items) => {
      const oldIndex = items.findIndex((item) => item.name === active.id)
      const newIndex = items.findIndex((item) => item.name === over.id)
      return arrayMove(items, oldIndex, newIndex)
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
        onSelect={handleAddExercise}
        onClose={() => setIsPickerOpen(false)}
        onCreate={handleAddExercise}
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
          onChange={(e) => {
            isEditing.current = true
            setName(e.target.value)
          }}
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
                    touchStartX={touchStartX}
                    setConfirm={setConfirm}
                    onAddSet={handleAddSet}
                    onRemoveSet={handleRemoveSet}
                    onUpdateSet={handleUpdateSet}
                    onRemoveExercise={handleRemoveExercise}
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
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>
  touchStartX: React.MutableRefObject<number | null>
  setConfirm: (state: ConfirmState) => void
  onAddSet: (exerciseName: string) => void
  onRemoveSet: (exerciseName: string, setId: string) => void
  onUpdateSet: (exerciseName: string, setId: string, field: 'weightKg' | 'reps', value: number) => void
  onRemoveExercise: (exerciseName: string) => void
}

function SortableExerciseCard({
  item,
  swipedExercise,
  onSwipe,
  cardRefs,
  touchStartX,
  setConfirm,
  onAddSet,
  onUpdateSet,
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
          touchStartX.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          const startX = touchStartX.current
          const endX = e.changedTouches[0]?.clientX
          touchStartX.current = null

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
                      gridTemplateColumns: { xs: '1fr 1fr auto', sm: '120px 120px auto' },
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      label="Повт."
                      type="number"
                      value={set.reps || ''}
                      onChange={(e) =>
                        onUpdateSet(item.name, set.id, 'reps', parseInt(e.target.value) || 0)
                      }
                      size="small"
                      sx={{ minWidth: 0 }}
                    />
                    <TextField
                      label="Вес"
                      type="number"
                      value={set.weightKg || ''}
                      onChange={(e) =>
                        onUpdateSet(item.name, set.id, 'weightKg', parseFloat(e.target.value) || 0)
                      }
                      size="small"
                      sx={{ minWidth: 0 }}
                    />
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

