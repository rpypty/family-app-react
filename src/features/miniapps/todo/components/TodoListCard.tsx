import type { MouseEvent, TouchEvent } from 'react'
import {
  Badge,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Collapse,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import ArchiveRounded from '@mui/icons-material/ArchiveRounded'
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import type { TodoItem, TodoList, TodoUser } from '../../../../shared/types'
import { TodoItemRow } from './TodoItemRow'

type TodoListCardProps = {
  list: TodoList
  visibleItems: TodoItem[]
  archivedCount: number
  completedCount: number
  totalCount: number
  collapseId: string
  draftValue: string
  readOnly: boolean
  canCreateItem: boolean
  canToggleItem: boolean
  onToggleCollapsed: (listId: string, isCollapsed: boolean) => void
  onOpenArchive: (listId: string) => void
  onOpenSettings: (event: MouseEvent<HTMLElement>, listId: string) => void
  onDraftChange: (listId: string, value: string) => void
  onAddItem: (listId: string) => void
  onToggleItem: (listId: string, itemId: string, isCompleted: boolean) => void
  onOpenUserPopover: (event: MouseEvent<HTMLElement>, user: TodoUser) => void
  onOpenItemMenu: (anchor: HTMLElement, listId: string, item: TodoItem) => void
  onStartLongPress: (event: TouchEvent<HTMLElement>, listId: string, item: TodoItem) => void
  onCancelLongPress: () => void
}

export function TodoListCard({
  list,
  visibleItems,
  archivedCount,
  completedCount,
  totalCount,
  collapseId,
  draftValue,
  readOnly,
  canCreateItem,
  canToggleItem,
  onToggleCollapsed,
  onOpenArchive,
  onOpenSettings,
  onDraftChange,
  onAddItem,
  onToggleItem,
  onOpenUserPopover,
  onOpenItemMenu,
  onStartLongPress,
  onCancelLongPress,
}: TodoListCardProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={list.isCollapsed ? 'Развернуть' : 'Свернуть'}>
            <IconButton
              size="small"
              onClick={() => onToggleCollapsed(list.id, !list.isCollapsed)}
              aria-label={list.isCollapsed ? 'Развернуть список' : 'Свернуть список'}
            >
              {list.isCollapsed ? (
                <ExpandMoreRounded fontSize="small" />
              ) : (
                <ExpandLessRounded fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <ButtonBase
            onClick={() => onToggleCollapsed(list.id, !list.isCollapsed)}
            aria-label={list.isCollapsed ? 'Развернуть список' : 'Свернуть список'}
            aria-expanded={!list.isCollapsed}
            aria-controls={collapseId}
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
              borderRadius: 1,
              px: 0.5,
              py: 0.25,
              gap: 1,
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              noWrap
              sx={{ flex: 1, minWidth: 0 }}
            >
              {list.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: 'nowrap' }}
            >
              {completedCount}/{totalCount}
            </Typography>
          </ButtonBase>
          <Tooltip title="Архив списка">
            <IconButton
              size="small"
              onClick={() => onOpenArchive(list.id)}
              aria-label="Открыть архив"
            >
              <Badge
                color="primary"
                badgeContent={archivedCount}
                invisible={archivedCount === 0}
              >
                <ArchiveRounded fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Настройки">
            <IconButton
              size="small"
              onClick={(event) => onOpenSettings(event, list.id)}
              disabled={readOnly}
              aria-label="Настройки списка"
            >
              <SettingsRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Collapse id={collapseId} in={!list.isCollapsed} timeout="auto" unmountOnExit>
          <Stack spacing={1.5} sx={{ pt: 1.5 }}>
            <Divider />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems="stretch"
            >
              <TextField
                value={draftValue}
                onChange={(event) => onDraftChange(list.id, event.target.value)}
                placeholder="Новый пункт"
                size="small"
                fullWidth
                disabled={!canCreateItem}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    onAddItem(list.id)
                  }
                }}
              />
              <Button
                variant="outlined"
                startIcon={<AddRounded />}
                onClick={() => onAddItem(list.id)}
                disabled={!canCreateItem}
              >
                Добавить
              </Button>
            </Stack>

            {visibleItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Пока нет пунктов. Добавьте первый пункт.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {visibleItems.map((item) => (
                  <TodoItemRow
                    key={item.id}
                    item={item}
                    listId={list.id}
                    readOnly={readOnly}
                    canToggleItem={canToggleItem}
                    onToggleItem={onToggleItem}
                    onOpenUserPopover={onOpenUserPopover}
                    onOpenItemMenu={onOpenItemMenu}
                    onStartLongPress={onStartLongPress}
                    onCancelLongPress={onCancelLongPress}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  )
}
