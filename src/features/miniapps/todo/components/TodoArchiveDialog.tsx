import type { MouseEvent, TouchEvent } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  Typography,
} from '@mui/material'
import type { TodoItem, TodoList, TodoUser } from '../../../../shared/types'
import { TodoItemRow } from './TodoItemRow'

type TodoArchiveDialogProps = {
  archiveList: TodoList | null
  archivedItems: TodoItem[]
  readOnly: boolean
  canToggleItem: boolean
  onClose: () => void
  onToggleItem: (listId: string, itemId: string, isCompleted: boolean) => void
  onOpenUserPopover: (event: MouseEvent<HTMLElement>, user: TodoUser) => void
  onOpenItemMenu: (anchor: HTMLElement, listId: string, item: TodoItem) => void
  onStartLongPress: (event: TouchEvent<HTMLElement>, listId: string, item: TodoItem) => void
  onCancelLongPress: () => void
}

export function TodoArchiveDialog({
  archiveList,
  archivedItems,
  readOnly,
  canToggleItem,
  onClose,
  onToggleItem,
  onOpenUserPopover,
  onOpenItemMenu,
  onStartLongPress,
  onCancelLongPress,
}: TodoArchiveDialogProps) {
  return (
    <Dialog open={Boolean(archiveList)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Архив · {archiveList?.title ?? ''}</DialogTitle>
      <DialogContent dividers>
        {archivedItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Архив пуст.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {archiveList
              ? archivedItems.map((item) => (
                  <TodoItemRow
                    key={item.id}
                    item={item}
                    listId={archiveList.id}
                    readOnly={readOnly}
                    canToggleItem={canToggleItem}
                    forceCompletedStyle
                    onToggleItem={onToggleItem}
                    onOpenUserPopover={onOpenUserPopover}
                    onOpenItemMenu={onOpenItemMenu}
                    onStartLongPress={onStartLongPress}
                    onCancelLongPress={onCancelLongPress}
                  />
                ))
              : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}
