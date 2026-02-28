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
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
          }),
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.secondary,
            borderBottom: `1px solid ${theme.palette.divider}`,
            paddingTop: theme.spacing(1.5),
            paddingBottom: theme.spacing(1.5),
          }),
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
          }),
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
          }),
        },
      },
    },
  })
}
