import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import GoogleIcon from '@mui/icons-material/Google'
type AuthScreenProps = {
  onSignIn: () => Promise<void> | void
  onBack?: () => void
  isConfigured?: boolean
}

export function AuthScreen({ onSignIn, onBack, isConfigured = true }: AuthScreenProps) {
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    if (!isConfigured) {
      setError('Добавьте ключи Supabase в .env, чтобы включить авторизацию.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSignIn()
    } catch {
      setError('Не удалось войти. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container
      maxWidth="sm"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}
    >
      <Stack spacing={3} sx={{ width: '100%' }}>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            Авторизация
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Вход работает через Supabase Auth. Пока доступен только Google.
          </Typography>
        </Stack>

        <Card elevation={0}>
          <CardContent>
            <Stack spacing={2}>
              <Button
                size="large"
                variant="contained"
                startIcon={<GoogleIcon />}
                onClick={handleSignIn}
                disabled={isLoading || !isConfigured}
              >
                {isLoading ? 'Входим…' : 'Войти через Google'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {!isConfigured ? (
          <Alert severity="warning">
            Нужно указать VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.
          </Alert>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        {onBack ? (
          <Button
            color="inherit"
            startIcon={<ArrowBackRounded />}
            onClick={onBack}
          >
            Назад
          </Button>
        ) : null}
      </Stack>
    </Container>
  )
}
