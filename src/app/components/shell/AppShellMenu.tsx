import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import GroupRounded from '@mui/icons-material/GroupRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type { AppShellModel } from '../../hooks/useAppController'

type AppShellMenuProps = {
  model: AppShellModel
}

export function AppShellMenu({ model }: AppShellMenuProps) {
  const familySecondary = model.family
    ? `${model.family.name}${model.family.code ? ` · Код: ${model.family.code}` : ''}`
    : '—'

  return (
    <Menu
      anchorEl={model.menuAnchorEl}
      open={Boolean(model.menuAnchorEl)}
      onClose={model.onMenuClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { minWidth: 240, borderRadius: 2 } } }}
    >
      <MenuItem
        disableRipple
        onClick={model.onMenuClose}
        sx={{
          cursor: 'default',
          '&:hover': { backgroundColor: 'transparent' },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={model.authUser?.avatarUrl}
            alt={model.authUser?.name ?? 'Пользователь'}
            sx={{ width: 36, height: 36 }}
          >
            {model.authUser?.name?.slice(0, 1).toUpperCase()}
          </Avatar>
          <Stack spacing={0}>
            <Typography variant="subtitle2" fontWeight={600}>
              {model.authUser?.name ?? 'Пользователь'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {model.authUser?.email ?? ''}
            </Typography>
          </Stack>
        </Stack>
      </MenuItem>
      <Divider />
      <MenuItem onClick={model.onOpenFamilyDialog}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <GroupRounded />
          </ListItemIcon>
          <Box sx={{ flex: 1 }}>
            <ListItemText
              primary="Моя семья"
              secondary={familySecondary}
            />
          </Box>
          <Tooltip title="Скопировать код">
            <span>
              <IconButton
                size="small"
                onClick={model.onCopyFamilyCode}
                disabled={!model.family?.code || model.isCopyingFamilyCode}
                aria-label="Скопировать код семьи"
              >
                <ContentCopyRounded fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </MenuItem>
      <Divider />
      <MenuItem
        onClick={() => {
          model.onToggleTheme()
          model.onMenuClose()
        }}
      >
        <ListItemIcon>
          {model.themeMode === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
        </ListItemIcon>
        <ListItemText primary={model.themeLabel} />
      </MenuItem>
      <MenuItem onClick={model.onLeaveFamily} disabled={model.isReadOnly}>
        <ListItemIcon>
          <GroupRounded />
        </ListItemIcon>
        <ListItemText primary="Выйти из семьи" />
      </MenuItem>
      <MenuItem onClick={model.onSignOut}>
        <ListItemIcon>
          <LogoutRounded />
        </ListItemIcon>
        <ListItemText primary="Выйти из аккаунта" />
      </MenuItem>
    </Menu>
  )
}
