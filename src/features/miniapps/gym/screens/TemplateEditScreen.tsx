import { useMemo, useState, useEffect } from 'react'
import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Box, Stack, TextField, Typography, Fab, Card, CardContent } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { ExercisePickerScreen } from './ExercisePickerScreen'
// ExerciseGroup is used inside SortableExercise; no direct import needed here
import SortableExercise from '../components/SortableExercise'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { TemplateExercise } from '../types'
import { useGymData } from '../hooks/useGymData'
import { exerciseKey } from '../api/gymStore'

type DraftSet = { id: string; weightKg: number; reps: number }
type DraftExercise = { name: string; sets: DraftSet[] }

export function TemplateEditScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const parts = useMemo(() => location.pathname.replace(/\/+$/, '').split('/').filter(Boolean), [location.pathname])
  const last = parts[4] // 'new' or template id

  const { templates, exercises: exerciseOptions, addTemplate, updateTemplate } = useGymData()

  const [templateId, setTemplateId] = useState<string | null>(last !== 'new' ? last : null)
  const [name, setName] = useState('')
  const [items, setItems] = useState<DraftExercise[]>([])
  const applyingRemote = useRef(false)

  const isPicking = useMemo(() => location.pathname.endsWith('/exercises'), [location.pathname])

  useEffect(() => {
    if (templateId) {
      const t = templates.find((x) => x.id === templateId)
      if (t) {
        setName(t.name || '')
        // Avoid triggering autosave loop when we're applying server/template updates
        applyingRemote.current = true
        setItems(
          (t.exercises || []).map((e) => ({
            name: e.name,
            sets: Array.from({ length: Math.max(1, e.sets || 1) }, (_v, idx) => ({ id: cryptoRandomId(), weightKg: (e as any).weights?.[idx] ?? 0, reps: e.reps || 8 })),
          }))
        )
        // allow autosave after we've applied the remote state
        setTimeout(() => {
          applyingRemote.current = false
        }, 50)
      }
    } else {
      setName('')
      setItems([])
    }
  }, [templateId, templates])

  function cryptoRandomId() {
    return Math.random().toString(36).slice(2, 10)
  }

  const base = useMemo(() => `/miniapps/gym/manage/template/${templateId ?? 'new'}`, [templateId])

  const handleAddExercise = (exerciseName: string) => {
    const n = (exerciseName || '').trim()
    if (!n) return
    const key = exerciseKey(n)
    if (items.some((it) => exerciseKey(it.name) === key)) return
    setItems((prev) => [...prev, { name: n, sets: [{ id: cryptoRandomId(), weightKg: 0, reps: 8 }] }])
  }

  const handleAddSet = (exerciseName: string) => {
    setItems((prev) => prev.map((it) => (it.name === exerciseName ? { ...it, sets: [...it.sets, { id: cryptoRandomId(), weightKg: 0, reps: 8 }] } : it)))
  }

  const handleRemoveSet = (exerciseName: string, setId: string) => {
    setItems((prev) => prev.map((it) => (it.name === exerciseName ? { ...it, sets: it.sets.filter((s) => s.id !== setId) } : it)))
  }

  const handleUpdateSet = (exerciseName: string, setId: string, field: 'weightKg' | 'reps', value: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.name === exerciseName
          ? { ...it, sets: it.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : it
      )
    )
  }

  // Auto-save: create or update template on any change
  useEffect(() => {
    let active = true
    ;(async () => {
      if (applyingRemote.current) return

      const converted: TemplateExercise[] = items.map((it) => ({
        name: it.name,
        reps: it.sets[it.sets.length - 1]?.reps || 8,
        sets: it.sets.length,
        weights: it.sets.map((s) => s.weightKg),
      }))
      if (!name.trim() || items.length === 0) return
      if (!templateId) {
        const t = await addTemplate(name.trim(), converted)
        if (!active) return
        setTemplateId(t.id)
        // replace history to reflect new id
        navigate(`/miniapps/gym/manage/template/${t.id}`, { replace: true })
      } else {
        await updateTemplate(templateId, name.trim(), converted)
      }
    })()
    return () => {
      active = false
    }
  }, [name, items])

  if (isPicking) {
    return (
      <ExercisePickerScreen
        exercises={exerciseOptions}
        onSelect={(n) => {
          handleAddExercise(n)
          navigate(base)
        }}
      />
    )
  }

  return (
    <Box sx={{ p: 2, pb: 20 }}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={700}>{templateId ? 'Редактировать шаблон' : 'Новый шаблон'}</Typography>
        <TextField label="Название" value={name} onChange={(e) => setName(e.target.value)} fullWidth />

        {items.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Добавьте упражнения</Typography>
            </CardContent>
          </Card>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={(e: any) => {
            const { active, over } = e
            if (!over) return
            const fromIndex = items.findIndex((it) => it.name === String(active.id))
            const toIndex = items.findIndex((it) => it.name === String(over.id))
            if (fromIndex === -1 || toIndex === -1) return
            if (fromIndex !== toIndex) {
              setItems((prev) => arrayMove(prev, fromIndex, toIndex))
            }
          }}>
            <SortableContext items={items.map((it) => it.name)} strategy={verticalListSortingStrategy}>
              <Stack spacing={2}>
                {items.map((it) => (
                  <SortableExercise key={it.name} item={it} onAddSet={handleAddSet} onRemoveSet={handleRemoveSet} onUpdateSet={handleUpdateSet} onRemoveExercise={(n) => setItems((prev) => prev.filter((x) => x.name !== n))} />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        )}
      </Stack>

      <Fab variant="extended" color="primary" aria-label="Добавить упражнение" onClick={() => navigate(`${base}/exercises`)} sx={{ position: 'fixed', right: 16, bottom: 88 }}>
        <AddIcon />
        <Box sx={{ ml: 1, fontWeight: 600 }}>Добавить упражнение</Box>
      </Fab>
    </Box>
  )
}

export default TemplateEditScreen
