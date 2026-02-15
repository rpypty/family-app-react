import { Alert, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material'

export function OfflineBlockedScreen() {
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Stack spacing={3} sx={{ width: '100%' }}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Нет подключения к интернету
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Для первого входа нужен интернет. Подключитесь к сети и обновите страницу.
          </Typography>
        </Stack>

        <Card elevation={0}>
          <CardContent>
            <Alert severity="info">
              После первого входа приложение сможет открываться оффлайн и показывать
              последние синхронизированные данные.
            </Alert>
          </CardContent>
        </Card>

        <Button variant="contained" onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
      </Stack>
    </Container>
  )
}
