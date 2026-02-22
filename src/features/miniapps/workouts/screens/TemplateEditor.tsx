import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Fab,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { WORKOUTS_ROUTES } from '../../../../app/routing/routes'
import type { ExerciseMeta, WorkoutTemplate, TemplateSet } from '../types'
import { TemplateExerciseCard } from '../components/TemplateExerciseCard'
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
          navigate(WORKOUTS_ROUTES.template(created.id), { replace: true })
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
                  <TemplateExerciseCard
                    key={item.name}
                    item={item}
                    swipedExercise={swipedExercise}
                    onSwipe={setSwipedExercise}
                    cardRefs={cardRefs}
                    touchStartXRef={touchStartXRef}
                    onConfirmRemoveExercise={(exerciseName) => {
                      setConfirm({ open: true, kind: 'exercise', exerciseName })
                    }}
                    onConfirmRemoveSet={(exerciseName, setId) => {
                      setConfirm({ open: true, kind: 'set', exerciseName, setId })
                    }}
                    onAddSet={handleAddSet}
                    onUpdateSet={handleUpdateSet}
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
