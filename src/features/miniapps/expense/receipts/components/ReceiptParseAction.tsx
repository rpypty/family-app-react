import { Badge, CircularProgress, Fab, Tooltip } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import type { ReceiptParseStatus } from '../api/receiptParses'

type ReceiptParseActionProps = {
  status?: ReceiptParseStatus
  disabled?: boolean
  onClick: () => void
}

const resolveTooltip = (status?: ReceiptParseStatus) => {
  switch (status) {
  case 'queued':
    return 'Чек ожидает распознавания'
  case 'processing':
    return 'Чек распознается'
  case 'ready':
    return 'Проверить распознанные траты'
  case 'failed':
    return 'Распознавание чека не удалось'
  default:
    return 'Распознать чек'
  }
}

export function ReceiptParseAction({ status, disabled, onClick }: ReceiptParseActionProps) {
  const isProcessing = status === 'queued' || status === 'processing'
  const badgeContent = status === 'ready'
    ? <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'success.main' }} />
    : status === 'failed'
      ? <ErrorRoundedIcon sx={{ fontSize: 18, color: 'error.main' }} />
      : isProcessing
        ? <CircularProgress size={16} thickness={5} />
        : null

  return (
    <Tooltip title={resolveTooltip(status)}>
      <span>
        <Badge
          overlap="circular"
          badgeContent={badgeContent}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Fab
            color={status === 'ready' ? 'success' : 'default'}
            aria-label="Распознать чек"
            disabled={disabled}
            onClick={onClick}
            sx={{
              position: 'fixed',
              right: 16,
              bottom: 'calc(160px + env(safe-area-inset-bottom))',
              zIndex: (theme) => theme.zIndex.appBar + 1,
            }}
          >
            <ReceiptLongRoundedIcon />
          </Fab>
        </Badge>
      </span>
    </Tooltip>
  )
}
