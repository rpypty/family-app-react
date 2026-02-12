import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { TemplateExercise } from '../types'

interface TemplatePickerScreenProps {
  templates: Array<{ id: string; name: string; exercises: TemplateExercise[] }>
  onUseTemplate: (templateId: string) => void
  onCreateCustom: () => void
  onBack: () => void
}

export function TemplatePickerScreen({
  templates,
  onUseTemplate,
  onCreateCustom,
  onBack,
}: TemplatePickerScreenProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((t) => t.name.toLowerCase().includes(q))
  }, [query, templates])

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            Выберите шаблон
          </Typography>
          <Button onClick={onBack}>Назад</Button>
        </Box>

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск шаблона"
          fullWidth
        />

        <Button variant="contained" onClick={onCreateCustom}>
          Создать кастомную тренировку
        </Button>

        <Stack spacing={1}>
          {filtered.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Шаблоны не найдены
                </Typography>
              </CardContent>
            </Card>
          ) : (
            filtered.map((t) => (
              <Card
                key={t.id}
                variant="outlined"
                sx={{ borderRadius: 2, cursor: 'pointer' }}
                onClick={() => onUseTemplate(t.id)}
              >
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.exercises.length} упр.
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
