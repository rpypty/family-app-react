import type { MouseEvent, TouchEvent } from 'react'
import {
  Avatar,
  Box,
  Checkbox,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import CloudOffRounded from '@mui/icons-material/CloudOffRounded'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import type { TodoItem, TodoUser } from '../../../../shared/types'

type TodoItemRowProps = {
  item: TodoItem
  listId: string
  readOnly: boolean
  canToggleItem: boolean
  forceCompletedStyle?: boolean
  onToggleItem: (listId: string, itemId: string, isCompleted: boolean) => void
  onOpenUserPopover: (event: MouseEvent<HTMLElement>, user: TodoUser) => void
  onOpenItemMenu: (anchor: HTMLElement, listId: string, item: TodoItem) => void
  onStartLongPress?: (event: TouchEvent<HTMLElement>, listId: string, item: TodoItem) => void
  onCancelLongPress?: () => void
}

export function TodoItemRow({
  item,
  listId,
  readOnly,
  canToggleItem,
  forceCompletedStyle = false,
  onToggleItem,
  onOpenUserPopover,
  onOpenItemMenu,
  onStartLongPress,
  onCancelLongPress,
}: TodoItemRowProps) {
  const isCompletedView = forceCompletedStyle || item.isCompleted

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: 1.5,
      }}
      onTouchStart={(event) => onStartLongPress?.(event, listId, item)}
      onTouchEnd={onCancelLongPress}
      onTouchMove={onCancelLongPress}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Checkbox
          checked={item.isCompleted}
          onChange={() => onToggleItem(listId, item.id, item.isCompleted)}
          inputProps={{
            'aria-label': isCompletedView ? 'Снять отметку' : 'Отметить пункт',
          }}
          sx={{ p: 0.5 }}
          disabled={!canToggleItem}
        />
        {item.completedBy ? (
          <Tooltip title="Кто отметил">
            <IconButton
              size="small"
              onClick={(event) => onOpenUserPopover(event, item.completedBy!)}
              sx={{
                position: 'absolute',
                right: -6,
                top: 6,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                p: 0.25,
              }}
              aria-label="Кто отметил"
            >
              <Avatar
                src={item.completedBy.avatarUrl}
                alt={item.completedBy.name}
                sx={{ width: 18, height: 18 }}
              >
                {item.completedBy.name.slice(0, 1).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          color: isCompletedView ? 'text.secondary' : 'text.primary',
          textDecoration: isCompletedView ? 'line-through' : 'none',
          wordBreak: 'break-word',
        }}
      >
        {item.title}
      </Typography>
      {item.syncState && item.syncState !== 'synced' ? (
        <Tooltip title="Изменение сохранено локально и будет отправлено при подключении к сети">
          <CloudOffRounded sx={{ fontSize: 16, color: 'warning.main' }} />
        </Tooltip>
      ) : null}
      <Tooltip title="Действия">
        <IconButton
          size="small"
          onClick={(event) => onOpenItemMenu(event.currentTarget, listId, item)}
          disabled={readOnly}
          aria-label="Открыть меню"
        >
          <MoreHorizRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  )
}
