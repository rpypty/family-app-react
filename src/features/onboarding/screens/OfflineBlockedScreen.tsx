import { Alert, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material'

export function OfflineBlockedScreen() {
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Stack spacing={3} sx={{ width: '100%' }}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Что-то пошло не так, попробуйте позже
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Приложение не может загрузить сессию и данные из сети, а локального кэша нет.
          </Typography>
        </Stack>

        <Card elevation={0}>
          <CardContent>
            <Alert severity="info">
              Проверьте интернет-соединение и повторите попытку.
            </Alert>
          </CardContent>
        </Card>

        <Button variant="contained" onClick={() => window.location.reload()}>
          Повторить
        </Button>
      </Stack>
    </Container>
  )
}
