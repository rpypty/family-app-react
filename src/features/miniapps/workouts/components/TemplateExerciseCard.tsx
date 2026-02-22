import type { MutableRefObject } from 'react'
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
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type DraftSet = {
  id: string
  weightKg: number
  reps: number
}

export type TemplateDraftExercise = {
  name: string
  sets: DraftSet[]
  isWeightless: boolean
}

interface TemplateExerciseCardProps {
  item: TemplateDraftExercise
  swipedExercise: string | null
  onSwipe: (name: string | null) => void
  cardRefs: MutableRefObject<Map<string, HTMLElement>>
  touchStartXRef: MutableRefObject<number | null>
  onConfirmRemoveExercise: (exerciseName: string) => void
  onConfirmRemoveSet: (exerciseName: string, setId: string) => void
  onAddSet: (exerciseName: string) => void
  onUpdateSet: (exerciseName: string, setId: string, field: 'weightKg' | 'reps', value: number) => void
  onSave: () => void
}

export function TemplateExerciseCard({
  item,
  swipedExercise,
  onSwipe,
  cardRefs,
  touchStartXRef,
  onConfirmRemoveExercise,
  onConfirmRemoveSet,
  onAddSet,
  onUpdateSet,
  onSave,
}: TemplateExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.name,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Box
      ref={(element: HTMLElement | null) => {
        if (element) cardRefs.current.set(item.name, element)
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
          onConfirmRemoveExercise(item.name)
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
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current
          const endX = event.changedTouches[0]?.clientX
          touchStartXRef.current = null

          if (startX !== null && endX !== undefined) {
            const delta = startX - endX
            if (delta > 80) {
              onSwipe(item.name)
            } else if (delta < -40 && swipedExercise === item.name) {
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
                      onChange={(event) => {
                        const value = event.target.value
                        onUpdateSet(item.name, set.id, 'reps', value === '' ? 0 : parseInt(value, 10))
                      }}
                      onBlur={onSave}
                      size="small"
                      sx={{ minWidth: 0 }}
                    />
                    {!item.isWeightless ? (
                      <TextField
                        label="Вес"
                        type="number"
                        value={set.weightKg || ''}
                        onChange={(event) => {
                          const value = event.target.value
                          onUpdateSet(item.name, set.id, 'weightKg', value === '' ? 0 : parseFloat(value))
                        }}
                        onBlur={onSave}
                        size="small"
                        sx={{ minWidth: 0 }}
                      />
                    ) : null}
                    <IconButton
                      size="small"
                      onClick={() => onConfirmRemoveSet(item.name, set.id)}
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
