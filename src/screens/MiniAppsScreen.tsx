import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ListAltRounded from '@mui/icons-material/ListAltRounded'
import ChecklistRounded from '@mui/icons-material/ChecklistRounded'

type MiniAppsScreenProps = {
  onOpenExpenses: () => void
  onOpenTodo: () => void
}

export function MiniAppsScreen({ onOpenExpenses, onOpenTodo }: MiniAppsScreenProps) {
  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ListAltRounded />
          </Box>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Расходы
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Быстрые записи, теги и аналитика.
            </Typography>
          </Stack>
          <Button variant="contained" onClick={onOpenExpenses}>
            Открыть
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.24),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChecklistRounded />
          </Box>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              To Do листы
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Списки, отметки и архив выполненного.
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onOpenTodo}>
            Открыть
          </Button>
        </CardContent>
      </Card>
    </Stack>
  )
}
