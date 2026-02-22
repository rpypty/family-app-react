import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ListAltRounded from '@mui/icons-material/ListAltRounded'
import ChecklistRounded from '@mui/icons-material/ChecklistRounded'
import BoltRounded from '@mui/icons-material/BoltRounded'

type MiniAppsScreenProps = {
  onOpenExpenses: () => void
  onOpenTodo: () => void
  onOpenWorkouts: () => void
}

export function MiniAppsScreen({ onOpenExpenses, onOpenTodo, onOpenWorkouts }: MiniAppsScreenProps) {
  return (
    <Stack spacing={3}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 3,
          },
        }}
        onClick={onOpenExpenses}
      >
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
          <Button
            variant="contained"
            onClick={(event) => {
              event.stopPropagation()
              onOpenExpenses()
            }}
          >
            Открыть
          </Button>
        </CardContent>
      </Card>

      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 3,
          },
        }}
        onClick={onOpenTodo}
      >
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
          <Button
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation()
              onOpenTodo()
            }}
          >
            Открыть
          </Button>
        </CardContent>
      </Card>

      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          borderColor: 'rgba(255, 92, 53, 0.3)',
          backgroundImage: 'linear-gradient(135deg, rgba(255, 92, 53, 0.12) 0%, rgba(15, 23, 42, 0.08) 100%)',
          '&:hover': {
            borderColor: 'rgb(255, 92, 53)',
            boxShadow: 3,
          },
        }}
        onClick={onOpenWorkouts}
      >
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255, 92, 53, 0.18)',
              color: '#FF5C35',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BoltRounded />
          </Box>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Тренировки
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Новый журнал тренировок.
            </Typography>
          </Stack>
          <Button
            variant="contained"
            onClick={(event) => {
              event.stopPropagation()
              onOpenWorkouts()
            }}
            sx={{
              bgcolor: '#FF5C35',
              '&:hover': { bgcolor: '#E04A24' },
            }}
          >
            Открыть
          </Button>
        </CardContent>
      </Card>
    </Stack>
  )
}
