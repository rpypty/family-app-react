import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import type { Family } from '../api/families'
import { isApiError } from '../../../shared/api/client'
import { createFamily, joinFamilyByCode } from '../api/families'
import { copyToClipboard } from '../../../shared/lib/clipboard'

type FamilyScreenProps = {
  onComplete: (family: Family) => void
}

type FamilyTab = 'create' | 'join'

const resolveJoinError = (error: unknown) => {
  if (isApiError(error)) {
    if (error.code === 'family_code_not_found') {
      return 'Код не найден. Проверьте правильность и попробуйте снова.'
    }
    if (error.code === 'already_in_family') {
      return 'Вы уже состоите в семье.'
    }
    if (error.code === 'family_not_found') {
      return 'Семья по этому коду недоступна. Попробуйте другой код.'
    }
  }
  return 'Не удалось подключиться. Попробуйте ещё раз.'
}

export function FamilyScreen({ onComplete }: FamilyScreenProps) {
  const [tab, setTab] = useState<FamilyTab>('create')
  const [familyName, setFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [createdFamily, setCreatedFamily] = useState<Family | null>(null)
  const [isCopying, setCopying] = useState(false)

  const normalizedJoinCode = useMemo(() => joinCode.replace(/\s+/g, '').toUpperCase(), [joinCode])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const family = await createFamily({ name: familyName })
      setCreatedFamily(family)
    } catch {
      setError('Не удалось создать семью. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    setLoading(true)
    setError(null)
    try {
      const family = await joinFamilyByCode({ code: normalizedJoinCode })
      onComplete(family)
    } catch (joinError) {
      setError(resolveJoinError(joinError))
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    setCopying(true)
    try {
      await copyToClipboard(code)
    } finally {
      setCopying(false)
    }
  }

  if (createdFamily) {
    return (
      <Container
        maxWidth="sm"
        sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}
      >
        <Stack spacing={3} sx={{ width: '100%' }}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={700}>
              Семья создана
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Отправьте код близким, чтобы они смогли подключиться.
            </Typography>
          </Stack>

          <Card elevation={0}>
            <CardContent>
              <Stack spacing={2} alignItems="center">
                <Typography variant="subtitle2" color="text.secondary">
                  Код семьи
                </Typography>
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="h4" fontWeight={700} letterSpacing={4}>
                    {createdFamily.code}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyRounded />}
                  onClick={() => handleCopyCode(createdFamily.code)}
                  disabled={isCopying}
                >
                  {isCopying ? 'Копируем…' : 'Скопировать код'}
                </Button>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Семья “{createdFamily.name}” готова. Можно сразу переходить в приложение.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Button
            size="large"
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            onClick={() => onComplete(createdFamily)}
          >
            Перейти в приложение
          </Button>
        </Stack>
      </Container>
    )
  }

  return (
    <Container
      maxWidth="sm"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}
    >
      <Stack spacing={3} sx={{ width: '100%' }}>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            Семья
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Выберите: создать новую семью или подключиться по коду.
          </Typography>
        </Stack>

        <Card elevation={0}>
          <CardContent>
            <Stack spacing={2}>
              <Tabs
                value={tab}
                onChange={(_, value) => {
                  setTab(value)
                  setError(null)
                }}
                variant="fullWidth"
              >
                <Tab value="create" label="Создать" />
                <Tab value="join" label="Подключиться" />
              </Tabs>

              {tab === 'create' ? (
                <Stack spacing={2}>
                  <TextField
                    label="Название семьи"
                    placeholder="Например, Семья Ивановых"
                    value={familyName}
                    onChange={(event) => setFamilyName(event.target.value)}
                    fullWidth
                  />
                  <Typography variant="body2" color="text.secondary">
                    Код для подключения создадим автоматически.
                  </Typography>
                  <Button
                    size="large"
                    variant="contained"
                    onClick={handleCreate}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Создаём…' : 'Создать семью'}
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="Код семьи"
                    placeholder="Например, 8KF2LM"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    fullWidth
                    inputProps={{ maxLength: 8 }}
                    helperText="Код можно получить у владельца семьи"
                  />
                  <Button
                    size="large"
                    variant="contained"
                    onClick={handleJoin}
                    disabled={isLoading || normalizedJoinCode.length < 4}
                  >
                    {isLoading ? 'Подключаем…' : 'Подключиться'}
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Container>
  )
}
