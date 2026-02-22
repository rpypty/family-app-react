import { Alert, Snackbar } from '@mui/material'
import type { AppShellModel } from '../../hooks/useAppController'

type AppShellOfflineSyncNoticeProps = {
  model: AppShellModel
}

export function AppShellOfflineSyncNotice({ model }: AppShellOfflineSyncNoticeProps) {
  return (
    <Snackbar
      open={model.isOfflineSyncNoticeOpen}
      autoHideDuration={4_000}
      onClose={model.onCloseOfflineSyncNotice}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={model.onCloseOfflineSyncNotice}
        severity="success"
        variant="filled"
        sx={{ width: '100%' }}
      >
        Офлайн-изменения успешно загружены
      </Alert>
    </Snackbar>
  )
}
