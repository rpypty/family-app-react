import { Chip, Stack } from '@mui/material'

interface WeightChipsProps {
  lastWeight: number | null
  bestWeight: number | null
  onSelect: (weight: number) => void
}

export function WeightChips({ lastWeight, bestWeight, onSelect }: WeightChipsProps) {
  if (!lastWeight && !bestWeight) return null
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      {lastWeight ? (
        <Chip
          label={`Последний ${lastWeight} кг`}
          size="small"
          onClick={() => onSelect(lastWeight)}
          sx={{ bgcolor: 'var(--wk-ink-soft)', fontWeight: 600 }}
        />
      ) : null}
      {bestWeight && bestWeight !== lastWeight ? (
        <Chip
          label={`Лучший ${bestWeight} кг`}
          size="small"
          onClick={() => onSelect(bestWeight)}
          sx={{ bgcolor: 'var(--wk-accent-soft)', fontWeight: 600 }}
        />
      ) : null}
    </Stack>
  )
}
