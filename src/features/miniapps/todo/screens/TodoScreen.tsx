import { useMemo, useRef, useState } from 'react'
import type { MouseEvent, TouchEvent } from 'react'
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import type { TodoItem, TodoList, TodoUser } from '../../../../shared/types'
import { TodoArchiveDialog } from '../components/TodoArchiveDialog'
import { TodoListCard } from '../components/TodoListCard'

type TodoScreenProps = {
  lists: TodoList[]
  readOnly?: boolean
  onCreateList: (title: string) => Promise<void>
  onDeleteList: (listId: string) => Promise<void>
  onToggleArchiveSetting: (listId: string, archiveCompleted: boolean) => Promise<void>
  onToggleCollapsed: (listId: string, isCollapsed: boolean) => Promise<void>
  onMoveList: (listId: string, direction: 'up' | 'down') => Promise<void>
  onCreateItem: (listId: string, title: string) => Promise<void>
  onToggleItem: (listId: string, itemId: string, isCompleted: boolean) => Promise<void>
  onUpdateItemTitle: (listId: string, itemId: string, title: string) => Promise<void>
  onDeleteItem: (listId: string, itemId: string) => Promise<void>
  allowOfflineItemCreate?: boolean
  allowOfflineItemToggle?: boolean
}

export function TodoScreen({
  lists,
  readOnly = false,
  onCreateList,
  onDeleteList,
  onToggleArchiveSetting,
  onToggleCollapsed,
  onMoveList,
  onCreateItem,
  onToggleItem,
  onUpdateItemTitle,
  onDeleteItem,
  allowOfflineItemCreate = false,
  allowOfflineItemToggle = false,
}: TodoScreenProps) {
  const canManageLists = !readOnly
  const canCreateItem = !readOnly || allowOfflineItemCreate
  const canToggleItem = !readOnly || allowOfflineItemToggle
  const [listQuery, setListQuery] = useState('')
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [draftItems, setDraftItems] = useState<Record<string, string>>({})
  const [archiveListId, setArchiveListId] = useState<string | null>(null)
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLElement | null>(null)
  const [settingsListId, setSettingsListId] = useState<string | null>(null)
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const [itemMenuAnchorEl, setItemMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [itemMenuTarget, setItemMenuTarget] = useState<{
    listId: string
    item: TodoItem
  } | null>(null)
  const [editingItem, setEditingItem] = useState<{ listId: string; item: TodoItem } | null>(
    null,
  )
  const [editItemTitle, setEditItemTitle] = useState('')
  const [deleteItemTarget, setDeleteItemTarget] = useState<{
    listId: string
    item: TodoItem
  } | null>(null)
  const [userAnchorEl, setUserAnchorEl] = useState<HTMLElement | null>(null)
  const [activeUser, setActiveUser] = useState<TodoUser | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCreateList = async () => {
    if (!canManageLists) return
    const title = newListTitle.trim()
    if (!title) return
    await onCreateList(title)
    setNewListTitle('')
    setCreateOpen(false)
  }

  const handleAddItem = (listId: string) => {
    if (!canCreateItem) return
    const title = (draftItems[listId] ?? '').trim()
    if (!title) return
    setDraftItems((prev) => ({ ...prev, [listId]: '' }))
    void onCreateItem(listId, title)
  }

  const handleToggleItem = (listId: string, itemId: string, isCompleted: boolean) => {
    if (!canToggleItem) return
    void onToggleItem(listId, itemId, isCompleted)
  }

  const handleDeleteItem = (listId: string, itemId: string) => {
    if (readOnly) return
    void onDeleteItem(listId, itemId)
  }

  const handleToggleArchiveSetting = async (listId: string, nextValue: boolean) => {
    if (readOnly) return
    await onToggleArchiveSetting(listId, nextValue)
  }

  const handleOpenSettings = (event: MouseEvent<HTMLElement>, listId: string) => {
    if (readOnly) return
    setSettingsAnchorEl(event.currentTarget)
    setSettingsListId(listId)
  }

  const handleCloseSettings = () => {
    setSettingsAnchorEl(null)
    setSettingsListId(null)
  }

  const handleRequestDeleteList = (listId: string) => {
    setDeleteListId(listId)
    handleCloseSettings()
  }

  const handleConfirmDeleteList = async () => {
    if (readOnly) return
    if (!deleteListId) return
    await onDeleteList(deleteListId)
    setDeleteListId(null)
  }

  const handleCancelDeleteList = () => {
    setDeleteListId(null)
  }

  const handleOpenArchive = (listId: string) => {
    setArchiveListId(listId)
  }

  const handleCloseArchive = () => {
    setArchiveListId(null)
  }

  const handleOpenUserPopover = (event: MouseEvent<HTMLElement>, user: TodoUser) => {
    event.stopPropagation()
    setUserAnchorEl(event.currentTarget)
    setActiveUser(user)
  }

  const handleCloseUserPopover = () => {
    setUserAnchorEl(null)
    setActiveUser(null)
  }

  const handleOpenItemMenu = (anchor: HTMLElement, listId: string, item: TodoItem) => {
    if (readOnly) return
    setItemMenuAnchorEl(anchor)
    setItemMenuTarget({ listId, item })
  }

  const handleCloseItemMenu = () => {
    setItemMenuAnchorEl(null)
    setItemMenuTarget(null)
  }

  const handleEditItem = () => {
    if (readOnly) return
    if (!itemMenuTarget) return
    setEditingItem(itemMenuTarget)
    setEditItemTitle(itemMenuTarget.item.title)
    handleCloseItemMenu()
  }

  const handleSaveItemEdit = () => {
    if (readOnly) return
    if (!editingItem) return
    const title = editItemTitle.trim()
    if (!title) return
    setEditingItem(null)
    setEditItemTitle('')
    void onUpdateItemTitle(editingItem.listId, editingItem.item.id, title)
  }

  const handleDeleteItemRequest = () => {
    if (readOnly) return
    if (!itemMenuTarget) return
    setDeleteItemTarget(itemMenuTarget)
    handleCloseItemMenu()
  }

  const handleConfirmDeleteItem = () => {
    if (readOnly) return
    if (!deleteItemTarget) return
    const { listId, item } = deleteItemTarget
    setDeleteItemTarget(null)
    handleDeleteItem(listId, item.id)
  }

  const handleCancelDeleteItem = () => {
    setDeleteItemTarget(null)
  }

  const handleStartLongPress = (event: TouchEvent<HTMLElement>, listId: string, item: TodoItem) => {
    if (readOnly) return
    const target = event.currentTarget
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
    longPressTimerRef.current = window.setTimeout(() => {
      handleOpenItemMenu(target, listId, item)
    }, 500)
  }

  const handleCancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const sortedLists = useMemo(() => {
    return [...lists].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [lists])

  const listIndexMap = useMemo(() => {
    return new Map(sortedLists.map((list, index) => [list.id, index]))
  }, [sortedLists])

  const settingsList = settingsListId
    ? lists.find((list) => list.id === settingsListId) ?? null
    : null
  const settingsListIndex =
    settingsList && listIndexMap.has(settingsList.id)
      ? (listIndexMap.get(settingsList.id) as number)
      : -1
  const canMoveSettingsUp = settingsListIndex > 0
  const canMoveSettingsDown =
    settingsListIndex >= 0 && settingsListIndex < sortedLists.length - 1

  const sortItems = (items: TodoItem[]) => {
    return [...items].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1
      }
      const aTime = a.createdAt ?? ''
      const bTime = b.createdAt ?? ''
      return bTime.localeCompare(aTime)
    })
  }

  const archiveList = archiveListId
    ? lists.find((list) => list.id === archiveListId) ?? null
    : null

  const archivedItems = sortItems(archiveList?.items.filter((item) => item.isArchived) ?? [])
  const normalizedQuery = listQuery.trim().toLocaleLowerCase()
  const visibleLists = useMemo(() => {
    if (!normalizedQuery) return sortedLists
    return sortedLists.filter((list) =>
      list.title.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [sortedLists, normalizedQuery])

  const deleteList = deleteListId
    ? lists.find((list) => list.id === deleteListId) ?? null
    : null

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            value={listQuery}
            onChange={(event) => setListQuery(event.target.value)}
            placeholder="Поиск по спискам"
            size="small"
            fullWidth
          />
          <Tooltip title="Создать список">
            <IconButton
              color="primary"
              onClick={() => setCreateOpen(true)}
              disabled={!canManageLists}
            >
              <AddRounded />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {lists.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Пока нет списков. Создайте первый список выше.
          </Typography>
        </Paper>
      ) : visibleLists.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Ничего не найдено по запросу.
          </Typography>
        </Paper>
      ) : null}

      {visibleLists.map((list) => {
        const visibleItems = sortItems(list.items.filter((item) => !item.isArchived))
        const archivedCount = list.items.filter((item) => item.isArchived).length
        const completedCount = list.items.filter((item) => item.isCompleted).length
        const totalCount = list.items.length
        const collapseId = `todo-list-${list.id}-items`

        return (
          <TodoListCard
            key={list.id}
            list={list}
            visibleItems={visibleItems}
            archivedCount={archivedCount}
            completedCount={completedCount}
            totalCount={totalCount}
            collapseId={collapseId}
            draftValue={draftItems[list.id] ?? ''}
            readOnly={readOnly}
            canCreateItem={canCreateItem}
            canToggleItem={canToggleItem}
            onToggleCollapsed={(listId, isCollapsed) => {
              void onToggleCollapsed(listId, isCollapsed)
            }}
            onOpenArchive={handleOpenArchive}
            onOpenSettings={handleOpenSettings}
            onDraftChange={(listId, value) => {
              setDraftItems((prev) => ({ ...prev, [listId]: value }))
            }}
            onAddItem={handleAddItem}
            onToggleItem={handleToggleItem}
            onOpenUserPopover={handleOpenUserPopover}
            onOpenItemMenu={handleOpenItemMenu}
            onStartLongPress={handleStartLongPress}
            onCancelLongPress={handleCancelLongPress}
          />
        )
      })}

      <Popover
        open={Boolean(settingsAnchorEl) && Boolean(settingsList)}
        anchorEl={settingsAnchorEl}
        onClose={handleCloseSettings}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, borderRadius: 2, minWidth: 240 } } }}
      >
        {settingsList ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              Настройки списка
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settingsList.settings.archiveCompleted}
                  onChange={(_, checked) => handleToggleArchiveSetting(settingsList.id, checked)}
                  disabled={readOnly}
                />
              }
              label="Архивировать отмеченные"
            />
            <Typography variant="caption" color="text.secondary">
              Если включено, отмеченные пункты сразу переносятся в архив.
            </Typography>
            <Divider />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={async () => {
                  await onMoveList(settingsList.id, 'up')
                  handleCloseSettings()
                }}
                disabled={readOnly || !canMoveSettingsUp}
                startIcon={<ArrowUpwardRounded fontSize="small" />}
              >
                Вверх
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={async () => {
                  await onMoveList(settingsList.id, 'down')
                  handleCloseSettings()
                }}
                disabled={readOnly || !canMoveSettingsDown}
                startIcon={<ArrowDownwardRounded fontSize="small" />}
              >
                Вниз
              </Button>
            </Stack>
            <Divider />
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleRequestDeleteList(settingsList.id)}
              disabled={readOnly}
            >
              Удалить список
            </Button>
          </Stack>
        ) : null}
      </Popover>

      <Dialog open={isCreateOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Новый список</DialogTitle>
        <DialogContent dividers>
          <TextField
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="Название списка"
            size="small"
            fullWidth
            autoFocus
            disabled={!canManageLists}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleCreateList()
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateList} disabled={!canManageLists}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteList)} onClose={handleCancelDeleteList} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить список?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Список <strong>{deleteList?.title}</strong> будет удален вместе с пунктами.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteList}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteList}
            disabled={readOnly}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={itemMenuAnchorEl}
        open={Boolean(itemMenuAnchorEl)}
        onClose={handleCloseItemMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEditItem} disabled={readOnly}>
          <ListItemIcon>
            <EditOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Редактировать" />
        </MenuItem>
        <MenuItem onClick={handleDeleteItemRequest} disabled={readOnly}>
          <ListItemIcon>
            <DeleteOutlineRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Удалить" />
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(editingItem)}
        onClose={() => {
          setEditingItem(null)
          setEditItemTitle('')
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Редактировать пункт</DialogTitle>
        <DialogContent dividers>
          <TextField
            value={editItemTitle}
            onChange={(event) => setEditItemTitle(event.target.value)}
            placeholder="Текст пункта"
            size="small"
            fullWidth
            autoFocus
            disabled={readOnly}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleSaveItemEdit()
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditingItem(null)
              setEditItemTitle('')
            }}
          >
            Отмена
          </Button>
          <Button variant="contained" onClick={handleSaveItemEdit} disabled={readOnly}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteItemTarget)}
        onClose={handleCancelDeleteItem}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить пункт?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Пункт <strong>{deleteItemTarget?.item.title}</strong> будет удален.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteItem}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteItem}
            disabled={readOnly}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <TodoArchiveDialog
        archiveList={archiveList}
        archivedItems={archivedItems}
        readOnly={readOnly}
        canToggleItem={canToggleItem}
        onClose={handleCloseArchive}
        onToggleItem={handleToggleItem}
        onOpenUserPopover={handleOpenUserPopover}
        onOpenItemMenu={handleOpenItemMenu}
        onStartLongPress={handleStartLongPress}
        onCancelLongPress={handleCancelLongPress}
      />

      <Popover
        open={Boolean(userAnchorEl) && Boolean(activeUser)}
        anchorEl={userAnchorEl}
        onClose={handleCloseUserPopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2 } } }}
      >
        {activeUser ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar src={activeUser.avatarUrl} alt={activeUser.name}>
              {activeUser.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Stack spacing={0}>
              <Typography variant="subtitle2" fontWeight={600}>
                {activeUser.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeUser.email}
              </Typography>
            </Stack>
          </Stack>
        ) : null}
      </Popover>
    </Stack>
  )
}
