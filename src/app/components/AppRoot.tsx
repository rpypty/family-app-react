import { Box, CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { useAppController } from '../hooks/useAppController'
import { AppGate } from './AppGate'

export function AppRoot() {
  const { theme, gate, shell } = useAppController()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppGate gate={gate} shell={shell} />
      </Box>
    </ThemeProvider>
  )
}
