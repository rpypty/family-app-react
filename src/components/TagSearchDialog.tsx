import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import { isApiError } from '../api/client'
import type { Tag } from '../data/types'
import { findTagByName } from '../utils/tagUtils'

type TagSearchDialogProps = {
  isOpen: boolean
  tags: Tag[]
  initialSelected: string[]
  onClose: () => void
  onConfirm: (selected: string[]) => void
  onCreateTag?: (name: string) => Promise<Tag>
  onUpdateTag?: (tagId: string, name: string) => Promise<Tag>
  onDeleteTag?: (tagId: string) => Promise<void>
  title?: string
}

export function TagSearchDialog({
  isOpen,
  tags,
  initialSelected,
  onClose,
  onConfirm,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  title = 'Поиск тегов',
}: TagSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [isCreating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [menuTag, setMenuTag] = useState<Tag | null>(null)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [isUpdating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const [isDeleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const hasActions = Boolean(onUpdateTag || onDeleteTag)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelected(new Set(initialSelected))
      setCreateError('')
      setCreating(false)
      setMenuAnchorEl(null)
      setMenuTag(null)
      setEditingTag(null)
      setEditName('')
      setUpdating(false)
      setUpdateError('')
      setDeleteTarget(null)
      setDeleting(false)
      setDeleteError('')
    }
  }, [isOpen, initialSelected])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return tags
    return tags.filter((tag) => tag.name.toLowerCase().includes(normalized))
  }, [query, tags])

  const toggleTag = (tagId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  const handleCreate = async () => {
    if (!onCreateTag) return
    const name = query.trim()
    if (!name) return
    const existing = findTagByName(tags, name)
    if (existing) {
      setSelected((prev) => new Set(prev).add(existing.id))
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const tag = await onCreateTag(name)
      setSelected((prev) => new Set(prev).add(tag.id))
    } catch {
      setCreateError('Не удалось создать тег. Попробуйте ещё раз.')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenMenu = (event: MouseEvent<HTMLElement>, tag: Tag) => {
    event.stopPropagation()
    setMenuAnchorEl(event.currentTarget)
    setMenuTag(tag)
  }

  const handleCloseMenu = () => {
    setMenuAnchorEl(null)
    setMenuTag(null)
  }

  const handleStartEdit = () => {
    if (!menuTag || !onUpdateTag) return
    setEditingTag(menuTag)
    setEditName(menuTag.name)
    setUpdateError('')
    handleCloseMenu()
  }

  const handleUpdate = async () => {
    if (!editingTag || !onUpdateTag) return
    const name = editName.trim()
    if (!name) {
      setUpdateError('Название не может быть пустым.')
      return
    }
    const existing = findTagByName(tags, name)
    if (existing && existing.id !== editingTag.id) {
      setUpdateError('Тег с таким названием уже существует.')
      return
    }
    setUpdating(true)
    setUpdateError('')
    try {
      await onUpdateTag(editingTag.id, name)
      setEditingTag(null)
      setEditName('')
    } catch (error) {
      if (isApiError(error) && error.code === 'tag_name_taken') {
        setUpdateError('Тег с таким названием уже существует.')
      } else {
        setUpdateError('Не удалось обновить тег. Попробуйте ещё раз.')
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleRequestDelete = () => {
    if (!menuTag || !onDeleteTag) return
    setDeleteTarget(menuTag)
    setDeleteError('')
    handleCloseMenu()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteTag) return
    setDeleting(true)
    setDeleteError('')
    try {
      await onDeleteTag(deleteTarget.id)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      setDeleteTarget(null)
    } catch (error) {
      if (
        isApiError(error) &&
        (error.status === 409 ||
          error.code === 'tag_in_use' ||
          error.code === 'tag_has_expenses')
      ) {
        setDeleteError('Для удаления этого тэга необходимо сначала убрать его с записей')
      } else {
        setDeleteError('Не удалось удалить тег. Попробуйте ещё раз.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Найти тег"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            fullWidth
          />
          {filtered.length === 0 ? (
            <Stack spacing={1}>
              <Typography color="text.secondary">Ничего не найдено</Typography>
              {onCreateTag && query.trim() ? (
                <Button variant="contained" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Создаём…' : `Добавить тег "${query.trim()}"`}
                </Button>
              ) : null}
              {createError ? (
                <Typography color="error" variant="body2">
                  {createError}
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <List dense>
              {filtered.map((tag) => (
                <ListItem
                  key={tag.id}
                  disablePadding
                  secondaryAction={
                    hasActions ? (
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(event) => handleOpenMenu(event, tag)}
                        aria-label="Открыть меню"
                      >
                        <MoreHorizRounded fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                >
                  <ListItemButton onClick={() => toggleTag(tag.id)}>
                    <Checkbox
                      checked={selected.has(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <ListItemText primary={tag.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => onConfirm(Array.from(selected))}>
          Готово
        </Button>
      </DialogActions>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {onUpdateTag ? (
          <MenuItem onClick={handleStartEdit}>
            <ListItemIcon>
              <EditOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Редактировать" />
          </MenuItem>
        ) : null}
        {onDeleteTag ? (
          <MenuItem onClick={handleRequestDelete}>
            <ListItemIcon>
              <DeleteOutlineRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Удалить" />
          </MenuItem>
        ) : null}
      </Menu>

      <Dialog
        open={Boolean(editingTag)}
        onClose={() => {
          setEditingTag(null)
          setEditName('')
          setUpdateError('')
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Редактировать тег</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <TextField
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Название тега"
              fullWidth
              autoFocus
              size="small"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleUpdate()
                }
              }}
            />
            {updateError ? (
              <Typography color="error" variant="body2">
                {updateError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditingTag(null)
              setEditName('')
              setUpdateError('')
            }}
          >
            Отмена
          </Button>
          <Button variant="contained" onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null)
          setDeleteError('')
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить тег?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Тег <strong>{deleteTarget?.name}</strong> будет удален.
            </Typography>
            {deleteError ? (
              <Typography color="error" variant="body2">
                {deleteError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteTarget(null)
              setDeleteError('')
            }}
          >
            Отмена
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? 'Удаляем…' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
