import { alpha, createTheme } from '@mui/material/styles'

export const createAppTheme = (themeMode: 'light' | 'dark') => {
  const primaryMain = themeMode === 'dark' ? '#4db6ac' : '#1f6b63'

  return createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: primaryMain,
      },
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
      h4: {
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 999,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 500,
          },
          outlined: {
            borderColor: alpha(primaryMain, 0.5),
            backgroundColor: alpha(primaryMain, 0.08),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24,
          },
        },
      },
    },
  })
}
