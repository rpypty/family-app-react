import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'

interface ExerciseCardProps {
  name: string
  note: string
  isWeightless: boolean
  onEdit?: () => void
}

export function ExerciseCard({ name, note, isWeightless, onEdit }: ExerciseCardProps) {
  return (
    <Card
      variant="outlined"
      onClick={onEdit}
      sx={{
        borderRadius: 'var(--wk-radius)',
        borderColor: 'var(--wk-border)',
        bgcolor: 'var(--wk-card)',
        cursor: onEdit ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease',
        '&:hover': onEdit ? { boxShadow: 'var(--wk-shadow)' } : undefined,
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, minWidth: 0 }} noWrap>
              {name}
            </Typography>
            {isWeightless && (
              <Chip
                label="Без веса"
                size="small"
                sx={{ bgcolor: 'var(--wk-ink-soft)', color: 'var(--wk-ink)' }}
              />
            )}
          </Stack>
          {note ? (
            <Typography
              variant="body2"
              sx={{
                color: 'var(--wk-muted)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {note}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: 'var(--wk-muted)' }}>
              Без заметок
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
