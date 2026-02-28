import { useMemo } from 'react'
import ColorLensRounded from '@mui/icons-material/ColorLensRounded'
import {
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { normalizeTagColor } from '../lib/tagAppearance'

type TagColorPickerFieldProps = {
  value: string | null
  onChange: (value: string | null) => void
  options: readonly string[]
  label?: string
  clearLabel?: string
}

export function TagColorPickerField({
  value,
  onChange,
  options,
  label = 'Цвет тэга',
  clearLabel = 'Убрать цвет',
}: TagColorPickerFieldProps) {
  const normalizedValue = normalizeTagColor(value)

  const palette = useMemo(
    () =>
      options
        .map((color) => normalizeTagColor(color))
        .filter((color): color is string => Boolean(color)),
    [options],
  )

  const isCustomColor = Boolean(normalizedValue && !palette.includes(normalizedValue))
  const pickerValue = normalizedValue ?? palette[0] ?? '#d14343'

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          {normalizedValue ? `Выбран: ${normalizedValue}` : 'Без цвета'}
        </Typography>
        <Button
          size="small"
          color="inherit"
          onClick={() => onChange(null)}
          disabled={!normalizedValue}
        >
          {clearLabel}
        </Button>
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {palette.map((color) => {
          const isActive = color === normalizedValue
          return (
            <Box
              key={color}
              component="button"
              type="button"
              onClick={() => onChange(isActive ? null : color)}
              sx={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: '2px solid',
                borderColor: isActive
                  ? (theme) => theme.palette.text.primary
                  : 'transparent',
                bgcolor: color,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            />
          )
        })}

        <Box
          component="label"
          aria-label="Выбрать кастомный цвет"
          sx={{
            position: 'relative',
            width: 26,
            height: 26,
            borderRadius: 999,
            border: '2px solid',
            borderColor:
              isCustomColor && normalizedValue
                ? (theme) => alpha(theme.palette.text.primary, 0.85)
                : 'divider',
            bgcolor: isCustomColor && normalizedValue ? normalizedValue : 'background.paper',
            color:
              isCustomColor && normalizedValue
                ? 'common.white'
                : 'text.secondary',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'border-color 0.2s, transform 0.15s',
            '&:hover': {
              borderColor: 'text.primary',
            },
          }}
        >
          <ColorLensRounded sx={{ fontSize: 15 }} />
          <Box
            component="input"
            type="color"
            value={pickerValue}
            onChange={(event) => onChange(normalizeTagColor(event.target.value) ?? null)}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              border: 0,
              p: 0,
              m: 0,
            }}
          />
        </Box>
      </Stack>
    </Stack>
  )
}
