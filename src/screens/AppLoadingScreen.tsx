import { Box, CircularProgress, Stack, Typography } from '@mui/material'

type AppLoadingScreenProps = {
  label?: string
}

export function AppLoadingScreen({ label = 'Загружаем данные…' }: AppLoadingScreenProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
    </Box>
  )
}
