import { Button, Card, CardContent, Container, Stack, Typography } from '@mui/material'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'

type WelcomeScreenProps = {
  onContinue: () => void
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <Container
      maxWidth="sm"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}
    >
      <Stack spacing={3} sx={{ width: '100%' }}>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            Добро пожаловать
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Family App помогает вести общие расходы семьи и делиться данными в реальном
            времени.
          </Typography>
        </Stack>

        <Card elevation={0}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                Что дальше
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  1. Авторизуйтесь через удобный провайдер.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Создайте семью или подключитесь по коду.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Сразу переходите к учёту расходов.
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Button
          size="large"
          variant="contained"
          endIcon={<ArrowForwardRounded />}
          onClick={onContinue}
        >
          Продолжить
        </Button>
      </Stack>
    </Container>
  )
}
