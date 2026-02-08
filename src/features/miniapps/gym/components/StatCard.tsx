import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

type StatCardProps = {
  label: string
  value: string | number
  delta?: {
    value: number
    label: string
  }
  color?: string
}

export function StatCard({ label, value, delta, color = 'primary.main' }: StatCardProps) {
  const deltaColor = delta
    ? delta.value > 0
      ? 'success.main'
      : delta.value < 0
      ? 'error.main'
      : 'text.secondary'
    : undefined

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color}>
            {value}
          </Typography>
          {delta && (
            <Chip
              label={delta.label}
              size="small"
              sx={{
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
                color: deltaColor,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

type ProgressIndicatorProps = {
  label: string
  current: number
  previous?: number
  unit?: string
}

export function ProgressIndicator({ label, current, previous, unit = '' }: ProgressIndicatorProps) {
  const hasPrevious = previous !== undefined && previous !== null
  const delta = hasPrevious ? current - previous : 0
  const pct = hasPrevious && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="baseline">
        <Typography variant="h6" fontWeight={700}>
          {current}
          {unit}
        </Typography>
        {hasPrevious && delta !== 0 && (
          <Typography
            variant="body2"
            color={delta > 0 ? 'success.main' : 'error.main'}
            fontWeight={600}
          >
            {delta > 0 ? '+' : ''}
            {Math.round(pct)}%
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
