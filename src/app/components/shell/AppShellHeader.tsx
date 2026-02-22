import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import type { AppShellModel } from '../../hooks/useAppController'

type AppShellHeaderProps = {
  model: AppShellModel
}

export function AppShellHeader({ model }: AppShellHeaderProps) {
  return (
    <Paper
      elevation={0}
      square
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (themeValue) => themeValue.zIndex.appBar,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ position: 'relative', py: 1.5, px: 2, textAlign: 'center' }}>
        {model.activeApp !== 'home' ? (
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Tooltip title="Назад">
              <IconButton
                color="inherit"
                onClick={model.onBackNavigation}
                aria-label="Назад"
              >
                <ArrowBackRounded />
              </IconButton>
            </Tooltip>
            {model.canRefresh ? (
              <Tooltip title="Обновить">
                <span>
                  <IconButton
                    color="inherit"
                    onClick={model.onRefreshActiveScreen}
                    disabled={model.isRefreshing}
                    aria-label="Обновить данные"
                  >
                    {model.isRefreshing ? <CircularProgress size={18} /> : <RefreshRounded />}
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </Box>
        ) : null}
        <Typography variant="subtitle1" color="text.secondary">
          {model.headerTitle}
        </Typography>
        <Tooltip title="Профиль и настройки">
          <IconButton
            color="inherit"
            onClick={model.onMenuOpen}
            aria-label="Открыть меню пользователя"
            sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
          >
            {model.authUser ? (
              <Avatar
                src={model.authUser.avatarUrl}
                alt={model.authUser.name ?? 'Пользователь'}
                sx={{ width: 32, height: 32 }}
              >
                {model.authUser.name?.slice(0, 1).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircleRounded />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      {model.isBackgroundSyncVisible ? (
        <LinearProgress
          color={model.dataSyncStatus === 'error' ? 'error' : 'primary'}
          sx={{ height: 3 }}
        />
      ) : null}
    </Paper>
  )
}
