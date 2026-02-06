import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
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
  Paper,
  Popover,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import ArchiveRounded from '@mui/icons-material/ArchiveRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import type { AuthUser } from '../data/auth'
import type { TodoItem, TodoList, TodoUser } from '../data/types'
import { createId } from '../utils/uuid'

type TodoScreenProps = {
  lists: TodoList[]
  authUser: AuthUser
  onUpdateLists: (updater: (prev: TodoList[]) => TodoList[]) => void
}

const buildUserSnapshot = (user: AuthUser): TodoUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
})

export function TodoScreen({ lists, authUser, onUpdateLists }: TodoScreenProps) {
  const [listQuery, setListQuery] = useState('')
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [draftItems, setDraftItems] = useState<Record<string, string>>({})
  const [archiveListId, setArchiveListId] = useState<string | null>(null)
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLElement | null>(null)
  const [settingsListId, setSettingsListId] = useState<string | null>(null)
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const [userAnchorEl, setUserAnchorEl] = useState<HTMLElement | null>(null)
  const [activeUser, setActiveUser] = useState<TodoUser | null>(null)

  const userSnapshot = useMemo(() => buildUserSnapshot(authUser), [authUser])

  const updateList = (listId: string, updater: (list: TodoList) => TodoList) => {
    onUpdateLists((prev) => prev.map((list) => (list.id === listId ? updater(list) : list)))
  }

  const handleCreateList = () => {
    const title = newListTitle.trim()
    if (!title) return
    const now = new Date().toISOString()
    const newList: TodoList = {
      id: createId(),
      title,
      createdAt: now,
      settings: { archiveCompleted: false },
      items: [],
    }
    onUpdateLists((prev) => [newList, ...prev])
    setNewListTitle('')
    setCreateOpen(false)
  }

  const handleAddItem = (listId: string) => {
    const title = (draftItems[listId] ?? '').trim()
    if (!title) return
    const now = new Date().toISOString()
    const newItem: TodoItem = {
      id: createId(),
      title,
      isCompleted: false,
      isArchived: false,
      createdAt: now,
    }
    updateList(listId, (list) => ({
      ...list,
      items: [...list.items, newItem],
    }))
    setDraftItems((prev) => ({ ...prev, [listId]: '' }))
  }

  const handleToggleItem = (listId: string, itemId: string) => {
    const now = new Date().toISOString()
    updateList(listId, (list) => ({
      ...list,
      items: list.items.map((item) => {
        if (item.id !== itemId) return item
        if (item.isCompleted) {
          return {
            ...item,
            isCompleted: false,
            isArchived: false,
            completedAt: undefined,
            completedBy: undefined,
          }
        }
        const shouldArchive = list.settings.archiveCompleted
        return {
          ...item,
          isCompleted: true,
          isArchived: shouldArchive,
          completedAt: now,
          completedBy: userSnapshot,
        }
      }),
    }))
  }

  const handleDeleteItem = (listId: string, itemId: string) => {
    updateList(listId, (list) => ({
      ...list,
      items: list.items.filter((item) => item.id !== itemId),
    }))
  }

  const handleToggleArchiveSetting = (listId: string) => {
    updateList(listId, (list) => {
      const nextValue = !list.settings.archiveCompleted
      const updatedItems = list.items.map((item) => {
        if (!item.isCompleted) return item
        return {
          ...item,
          isArchived: nextValue ? true : false,
        }
      })
      return {
        ...list,
        settings: { ...list.settings, archiveCompleted: nextValue },
        items: updatedItems,
      }
    })
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

  const handleConfirmDeleteList = () => {
    if (!deleteListId) return
    onUpdateLists((prev) => prev.filter((list) => list.id !== deleteListId))
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

  const settingsList = settingsListId
    ? lists.find((list) => list.id === settingsListId) ?? null
    : null

  const archiveList = archiveListId
    ? lists.find((list) => list.id === archiveListId) ?? null
    : null

  const archivedItems = archiveList?.items.filter((item) => item.isArchived) ?? []
  const normalizedQuery = listQuery.trim().toLocaleLowerCase()
  const visibleLists = useMemo(() => {
    if (!normalizedQuery) return lists
    return lists.filter((list) =>
      list.title.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [lists, normalizedQuery])

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
        const visibleItems = list.items.filter((item) => !item.isArchived)
        const archivedCount = list.items.filter((item) => item.isArchived).length
        const completedCount = list.items.filter((item) => item.isCompleted).length
        const totalCount = list.items.length

        return (
          <Card key={list.id} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
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
                      }}
                    >
                      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                          checked={item.isCompleted}
                          onChange={() => handleToggleItem(list.id, item.id)}
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
                      <Tooltip title="Удалить">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteItem(list.id, item.id)}
                          aria-label="Удалить пункт"
                        >
                          <DeleteOutlineRounded fontSize="small" />
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
                  onChange={() => handleToggleArchiveSetting(settingsList.id)}
                />
              }
              label="Архивировать отмеченные"
            />
            <Typography variant="caption" color="text.secondary">
              Если включено, отмеченные пункты сразу переносятся в архив.
            </Typography>
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
                  }}
                >
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={item.isCompleted}
                      onChange={() => handleToggleItem(archiveList!.id, item.id)}
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
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteItem(archiveList!.id, item.id)}
                      aria-label="Удалить пункт"
                    >
                      <DeleteOutlineRounded fontSize="small" />
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
