import CloudOffRounded from '@mui/icons-material/CloudOffRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
} from '@mui/material'
import type { AppShellModel } from '../../hooks/useAppController'

type AppShellSyncAlertsProps = {
  model: AppShellModel
}

export function AppShellSyncAlerts({ model }: AppShellSyncAlertsProps) {
  const handleRetry = () => {
    void model.onManualRetry()
  }

  return (
    <>
      {model.dataSyncStatus === 'offline' ? (
        <Alert
          severity="warning"
          iconMapping={{ warning: <CloudOffRounded fontSize="inherit" /> }}
          action={(
            <IconButton
              color="inherit"
              size="small"
              aria-label="Повторить синхронизацию"
              onClick={handleRetry}
              disabled={!model.canRetrySync || model.isManualRetrying}
            >
              {model.isManualRetrying ? <CircularProgress size={18} color="inherit" /> : <RefreshRounded />}
            </IconButton>
          )}
        >
          Нет соединения.
          {model.formattedLastSyncAt ? ` Последнее обновление в ${model.formattedLastSyncAt}.` : ''}
        </Alert>
      ) : null}
      {model.dataSyncStatus === 'error' ? (
        <Alert
          severity="error"
          action={(
            <Button
              color="inherit"
              size="small"
              onClick={handleRetry}
              disabled={!model.canRetrySync || model.isManualRetrying}
            >
              {model.isManualRetrying ? 'Обновляем…' : 'Обновить'}
            </Button>
          )}
        >
          {model.syncErrorMessage ?? 'Не удалось обновить данные.'}
        </Alert>
      ) : null}
      {model.isDataStale && model.dataSyncStatus !== 'offline' && model.dataSyncStatus !== 'error' ? (
        <Alert severity="warning">
          Нет соединения. Данные могут быть неактуальны.
          {model.formattedLastSyncAt ? ` Последнее обновление: ${model.formattedLastSyncAt}.` : ''}
        </Alert>
      ) : null}
    </>
  )
}
