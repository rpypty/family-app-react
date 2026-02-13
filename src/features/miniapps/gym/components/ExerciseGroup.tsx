import { useRef, useState, useEffect } from 'react'
import { Box, Button, Card, CardContent, IconButton, Stack, TextField, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

type SetLike = { id: string; weightKg: number; reps: number }

type Props = {
  name: string
  sets: SetLike[]
  onAddSet?: () => void
  onRemoveSet?: (setId: string) => void
  onUpdateSet?: (setId: string, field: 'weightKg' | 'reps', value: number | string) => void
  onRemoveExercise?: () => void
  stats?: any
}

export function ExerciseGroup({ name, sets, onAddSet, onRemoveSet, onUpdateSet, onRemoveExercise, stats }: Props) {
  const touchStartX = useRef<number | null>(null)
  const [swiped, setSwiped] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (ev: PointerEvent) => {
      try {
        const target = ev.target as Node | null
        if (!rootRef.current) return
        if (!target) return
        if (!rootRef.current.contains(target)) {
          setSwiped(false)
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('pointerdown', handler, { passive: true })
    return () => window.removeEventListener('pointerdown', handler)
  }, [])

  return (
    <Box ref={rootRef} sx={{ position: 'relative', mb: 1 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 2,
          bgcolor: 'error.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pr: 2,
          color: 'error.contrastText',
          opacity: swiped ? 1 : 0,
          transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          cursor: 'pointer',
        }}
        onClick={() => onRemoveExercise && onRemoveExercise()}
      >
        <DeleteIcon sx={{ fontSize: 36 }} />
      </Box>

      <Card
        variant="outlined"
        sx={{ borderRadius: 2, transform: swiped ? 'translateX(-80px)' : 'translateX(0)', transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)', position: 'relative' }}
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null }}
        onTouchEnd={(e) => {
          const startX = touchStartX.current
          const endX = e.changedTouches[0]?.clientX
          touchStartX.current = null
          if (startX !== null && endX !== undefined) {
            const delta = startX - endX
            if (delta > 80) {
              setSwiped(true)
              return
            }
            if (delta < -40) {
              setSwiped(false)
              return
            }
          }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>{name}</Typography>
              {stats && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {/* optional stats rendering */}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button size="small" color="primary" variant="text" onClick={() => onAddSet && onAddSet()} sx={{ fontWeight: 600 }}>Добавить подход</Button>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Свайп влево, чтобы удалить упражнение</Typography>

          <Stack spacing={1}>
            {sets.map((s: SetLike) => (
              <Box key={s.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr auto', sm: '120px 120px auto' }, gap: 1, alignItems: 'center' }}>
                <TextField type="number" label="Повт" value={String(s.reps)} onChange={(e) => onUpdateSet && onUpdateSet(s.id, 'reps', Number(e.target.value) || 0)} size="small" />
                <TextField type="number" label="Вес" value={s.weightKg === 0 ? '' : String(s.weightKg)} onChange={(e) => onUpdateSet && onUpdateSet(s.id, 'weightKg', e.target.value === '' ? '' : Number(e.target.value) || 0)} size="small" />
                <IconButton size="small" color="error" onClick={(ev) => { ev.stopPropagation(); onRemoveSet && onRemoveSet(s.id) }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ExerciseGroup
