import { useMemo, useRef, useState } from 'react'
import type { MouseEvent, TouchEvent } from 'react'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
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
  Checkbox,
  Collapse,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import ArchiveRounded from '@mui/icons-material/ArchiveRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import type { TodoItem, TodoList, TodoUser } from '../data/types'

type TodoScreenProps = {
  lists: TodoList[]
  onCreateList: (title: string) => Promise<void>
  onDeleteList: (listId: string) => Promise<void>
  onToggleArchiveSetting: (listId: string, archiveCompleted: boolean) => Promise<void>
  onToggleCollapsed: (listId: string, isCollapsed: boolean) => Promise<void>
  onMoveList: (listId: string, direction: 'up' | 'down') => Promise<void>
  onCreateItem: (listId: string, title: string) => Promise<void>
  onToggleItem: (listId: string, itemId: string, isCompleted: boolean) => Promise<void>
  onUpdateItemTitle: (listId: string, itemId: string, title: string) => Promise<void>
  onDeleteItem: (listId: string, itemId: string) => Promise<void>
}

export function TodoScreen({
  lists,
  onCreateList,
  onDeleteList,
  onToggleArchiveSetting,
  onToggleCollapsed,
  onMoveList,
  onCreateItem,
  onToggleItem,
  onUpdateItemTitle,
  onDeleteItem,
}: TodoScreenProps) {
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
    const title = newListTitle.trim()
    if (!title) return
    await onCreateList(title)
    setNewListTitle('')
    setCreateOpen(false)
  }

  const handleAddItem = async (listId: string) => {
    const title = (draftItems[listId] ?? '').trim()
    if (!title) return
    await onCreateItem(listId, title)
    setDraftItems((prev) => ({ ...prev, [listId]: '' }))
  }

  const handleToggleItem = async (listId: string, itemId: string, isCompleted: boolean) => {
    await onToggleItem(listId, itemId, isCompleted)
  }

  const handleDeleteItem = async (listId: string, itemId: string) => {
    await onDeleteItem(listId, itemId)
  }

  const handleToggleArchiveSetting = async (listId: string, nextValue: boolean) => {
    await onToggleArchiveSetting(listId, nextValue)
  }

  const handleOpenSettings = (event: MouseEvent<HTMLElement>, listId: string) => {
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
    setItemMenuAnchorEl(anchor)
    setItemMenuTarget({ listId, item })
  }

  const handleCloseItemMenu = () => {
    setItemMenuAnchorEl(null)
    setItemMenuTarget(null)
  }

  const handleEditItem = () => {
    if (!itemMenuTarget) return
    setEditingItem(itemMenuTarget)
    setEditItemTitle(itemMenuTarget.item.title)
    handleCloseItemMenu()
  }

  const handleSaveItemEdit = async () => {
    if (!editingItem) return
    const title = editItemTitle.trim()
    if (!title) return
    await onUpdateItemTitle(editingItem.listId, editingItem.item.id, title)
    setEditingItem(null)
    setEditItemTitle('')
  }

  const handleDeleteItemRequest = () => {
    if (!itemMenuTarget) return
    setDeleteItemTarget(itemMenuTarget)
    handleCloseItemMenu()
  }

  const handleConfirmDeleteItem = async () => {
    if (!deleteItemTarget) return
    await onDeleteItem(deleteItemTarget.listId, deleteItemTarget.item.id)
    setDeleteItemTarget(null)
  }

  const handleCancelDeleteItem = () => {
    setDeleteItemTarget(null)
  }

  const handleStartLongPress = (event: TouchEvent<HTMLElement>, listId: string, item: TodoItem) => {
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
            <IconButton color="primary" onClick={() => setCreateOpen(true)}>
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
        const listIndex = listIndexMap.get(list.id) ?? 0
        const canMoveUp = listIndex > 0
        const canMoveDown = listIndex < sortedLists.length - 1

        return (
          <Card key={list.id} variant="outlined" sx={{ borderRadius: 2 }}>
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
                <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
                  {list.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {completedCount}/{totalCount}
                </Typography>
                <Tooltip title="Архив списка">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenArchive(list.id)}
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
                onClick={(event) => handleOpenSettings(event, list.id)}
                aria-label="Настройки списка"
              >
                <SettingsRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

              <Collapse in={!list.isCollapsed} timeout="auto" unmountOnExit>
                <Stack spacing={1.5} sx={{ pt: 1.5 }}>
                  <Divider />

                  {visibleItems.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Пока нет пунктов. Добавьте первый ниже.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {visibleItems.map((item) => (
                        <Paper
                          key={item.id}
                          variant="outlined"
                          sx={{
                            px: 1,
                            py: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            borderRadius: 1.5,
                          }}
                          onTouchStart={(event) => handleStartLongPress(event, list.id, item)}
                          onTouchEnd={handleCancelLongPress}
                          onTouchMove={handleCancelLongPress}
                        >
                          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Checkbox
                              checked={item.isCompleted}
                              onChange={() =>
                                handleToggleItem(list.id, item.id, item.isCompleted)
                              }
                              inputProps={{ 'aria-label': 'Отметить пункт' }}
                              sx={{ p: 0.5 }}
                            />
                            {item.completedBy ? (
                              <Tooltip title="Кто отметил">
                                <IconButton
                                  size="small"
                                  onClick={(event) => handleOpenUserPopover(event, item.completedBy!)}
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
                              color: item.isCompleted ? 'text.secondary' : 'text.primary',
                              textDecoration: item.isCompleted ? 'line-through' : 'none',
                              wordBreak: 'break-word',
                            }}
                          >
                            {item.title}
                          </Typography>
                          <Tooltip title="Действия">
                            <IconButton
                              size="small"
                              onClick={(event) =>
                                handleOpenItemMenu(event.currentTarget, list.id, item)
                              }
                              aria-label="Открыть меню"
                            >
                              <MoreHorizRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
                    <TextField
                      value={draftItems[list.id] ?? ''}
                      onChange={(event) =>
                        setDraftItems((prev) => ({ ...prev, [list.id]: event.target.value }))
                      }
                      placeholder="Новый пункт"
                      size="small"
                      fullWidth
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddItem(list.id)
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<AddRounded />}
                      onClick={() => handleAddItem(list.id)}
                    >
                      Добавить
                    </Button>
                  </Stack>
                </Stack>
              </Collapse>
            </CardContent>
          </Card>
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
                disabled={!canMoveSettingsUp}
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
                disabled={!canMoveSettingsDown}
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
          <Button variant="contained" onClick={handleCreateList}>
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
          <Button color="error" variant="contained" onClick={handleConfirmDeleteList}>
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
        <MenuItem onClick={handleEditItem}>
          <ListItemIcon>
            <EditOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Редактировать" />
        </MenuItem>
        <MenuItem onClick={handleDeleteItemRequest}>
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
          <Button variant="contained" onClick={handleSaveItemEdit}>
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
          <Button color="error" variant="contained" onClick={handleConfirmDeleteItem}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(archiveList)} onClose={handleCloseArchive} fullWidth maxWidth="sm">
        <DialogTitle>Архив · {archiveList?.title ?? ''}</DialogTitle>
        <DialogContent dividers>
          {archivedItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Архив пуст.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {archivedItems.map((item) => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{
                    px: 1,
                    py: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderRadius: 1.5,
                  }}
                  onTouchStart={(event) => handleStartLongPress(event, archiveList!.id, item)}
                  onTouchEnd={handleCancelLongPress}
                  onTouchMove={handleCancelLongPress}
                >
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={item.isCompleted}
                      onChange={() =>
                        handleToggleItem(archiveList!.id, item.id, item.isCompleted)
                      }
                      inputProps={{ 'aria-label': 'Снять отметку' }}
                      sx={{ p: 0.5 }}
                    />
                    {item.completedBy ? (
                      <Tooltip title="Кто отметил">
                        <IconButton
                          size="small"
                          onClick={(event) => handleOpenUserPopover(event, item.completedBy!)}
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
                      color: 'text.secondary',
                      textDecoration: 'line-through',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Tooltip title="Действия">
                    <IconButton
                      size="small"
                      onClick={(event) =>
                        handleOpenItemMenu(event.currentTarget, archiveList!.id, item)
                      }
                      aria-label="Открыть меню"
                    >
                      <MoreHorizRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseArchive}>Закрыть</Button>
        </DialogActions>
      </Dialog>

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
