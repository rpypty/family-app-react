import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import RocketLaunchRounded from '@mui/icons-material/RocketLaunchRounded'
import { Box, Button, Container, Stack, Typography } from '@mui/material'

const NEW_APP_URL = 'https://kupilka.site'

export function ExpensesMovedScreen() {
  return (
    <Container maxWidth="sm" sx={{ px: 0 }}>
      <Stack spacing={3} alignItems="center" textAlign="center" sx={{ pt: 4 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <RocketLaunchRounded sx={{ fontSize: 36 }} />
        </Box>

        <Stack spacing={1.5}>
          <Typography variant="h5" fontWeight={700}>
            Приложение переехало
          </Typography>
          <Typography variant="body1" color="text.secondary">
            «Расходы» стали самостоятельным приложением — «Купилка». Теперь оно живёт
            на отдельном адресе: откройте его там и установите на телефон.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Вход — тем же аккаунтом Google.
          </Typography>
        </Stack>

        <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
          <Button
            component="a"
            href={NEW_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size="large"
            endIcon={<OpenInNewRounded />}
            sx={{ alignSelf: 'stretch' }}
          >
            Перейти в «Купилку»
          </Button>
          <Typography variant="caption" color="text.secondary">
            kupilka.site
          </Typography>
        </Stack>
      </Stack>
    </Container>
  )
}
