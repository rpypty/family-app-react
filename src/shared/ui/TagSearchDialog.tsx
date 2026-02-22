import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  Box,
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
import { alpha, useTheme } from '@mui/material/styles'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import { isApiError } from '../api/client'
import type { Tag } from '../types'
import { findTagByName } from '../lib/tagUtils'
import { EmojiPickerField } from './EmojiPickerField'
import { TagColorPickerField } from './TagColorPickerField'
import {
  DEFAULT_TAG_COLOR,
  TAG_COLOR_OPTIONS,
  normalizeTagColor,
  normalizeTagEmoji,
  withTagEmoji,
  type TagAppearanceInput,
} from '../lib/tagAppearance'

type TagSearchDialogProps = {
  isOpen: boolean
  tags: Tag[]
  initialSelected: string[]
  onClose: () => void
  onConfirm: (selected: string[]) => void
  onCreateTag?: (name: string, payload?: TagAppearanceInput) => Promise<Tag>
  onUpdateTag?: (tagId: string, name: string, payload?: TagAppearanceInput) => Promise<Tag>
  onDeleteTag?: (tagId: string) => Promise<void>
  title?: string
  enableSelectAll?: boolean
  enableSelection?: boolean
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
  enableSelectAll = false,
  enableSelection = true,
}: TagSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [isCreating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createColor, setCreateColor] = useState<string | null>(DEFAULT_TAG_COLOR)
  const [createEmoji, setCreateEmoji] = useState('')
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [menuTag, setMenuTag] = useState<Tag | null>(null)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string | null>(DEFAULT_TAG_COLOR)
  const [editEmoji, setEditEmoji] = useState('')
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
      setCreateColor(DEFAULT_TAG_COLOR)
      setCreateEmoji('')
      setMenuAnchorEl(null)
      setMenuTag(null)
      setEditingTag(null)
      setEditName('')
      setEditColor(DEFAULT_TAG_COLOR)
      setEditEmoji('')
      setUpdating(false)
      setUpdateError('')
      setDeleteTarget(null)
      setDeleting(false)
      setDeleteError('')
    }
  }, [isOpen, initialSelected])

  const createAppearancePayload = (): TagAppearanceInput => ({
    color: createColor === null ? null : normalizeTagColor(createColor) ?? null,
    emoji: normalizeTagEmoji(createEmoji) ?? null,
  })

  const editAppearancePayload = (): TagAppearanceInput => ({
    color: editColor === null ? null : normalizeTagColor(editColor) ?? null,
    emoji: normalizeTagEmoji(editEmoji) ?? null,
  })

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return tags
    return tags.filter((tag) => tag.name.toLowerCase().includes(normalized))
  }, [query, tags])

  const allSelected = enableSelection && tags.length > 0 && selected.size === tags.length
  const handleToggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(tags.map((tag) => tag.id)))
  }

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
      const tag = await onCreateTag(name, createAppearancePayload())
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
    setEditColor(normalizeTagColor(menuTag.color) ?? null)
    setEditEmoji(normalizeTagEmoji(menuTag.emoji) ?? '')
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
      await onUpdateTag(editingTag.id, name, editAppearancePayload())
      setEditingTag(null)
      setEditName('')
      setEditColor(DEFAULT_TAG_COLOR)
      setEditEmoji('')
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
            onChange={(event) => {
              setQuery(event.target.value)
              if (createError) setCreateError('')
            }}
            fullWidth
          />
          {filtered.length === 0 ? (
            <Stack spacing={1.25}>
              <Typography color="text.secondary">Ничего не найдено</Typography>
              {onCreateTag && query.trim() ? (
                <Stack spacing={1.25}>
                  <EmojiPickerField
                    value={createEmoji}
                    onChange={(emoji) => {
                      setCreateEmoji(emoji)
                      if (createError) setCreateError('')
                    }}
                  />
                  <TagColorPickerField
                    value={createColor}
                    onChange={setCreateColor}
                    options={TAG_COLOR_OPTIONS}
                  />
                  <Button variant="contained" onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? 'Создаём…' : `Добавить тег "${query.trim()}"`}
                  </Button>
                </Stack>
              ) : null}
              {createError ? (
                <Typography color="error" variant="body2">
                  {createError}
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <List dense>
              {filtered.map((tag) => {
                const tagColor = normalizeTagColor(tag.color)
                return (
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
                    <ListItemButton
                      onClick={enableSelection ? () => toggleTag(tag.id) : undefined}
                      disableRipple={!enableSelection}
                      sx={{ cursor: enableSelection ? 'pointer' : 'default' }}
                    >
                      {enableSelection ? (
                        <Checkbox
                          checked={selected.has(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      ) : null}
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          bgcolor: tagColor ?? 'divider',
                          border: '1px solid',
                          borderColor: tagColor ? alpha(tagColor, 0.65) : 'divider',
                          mr: 1.25,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText primary={withTagEmoji(tag)} />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent:
            enableSelection && enableSelectAll ? 'space-between' : 'flex-end',
        }}
      >
        {enableSelection && enableSelectAll ? (
          <Button onClick={handleToggleAll} disabled={tags.length === 0}>
            {allSelected ? 'Убрать все' : 'Выбрать все'}
          </Button>
        ) : null}
        {enableSelection ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose}>Отмена</Button>
            <Button variant="contained" onClick={() => onConfirm(Array.from(selected))}>
              Готово
            </Button>
          </Box>
        ) : (
          <Button onClick={onClose}>Закрыть</Button>
        )}
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
          setEditColor(DEFAULT_TAG_COLOR)
          setEditEmoji('')
          setUpdateError('')
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Редактировать тег</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
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
            <EmojiPickerField
              value={editEmoji}
              onChange={(emoji) => setEditEmoji(emoji)}
            />
            <Stack direction="row" justifyContent="flex-end">
              <Button
                size="small"
                color="inherit"
                onClick={() => setEditEmoji('')}
                disabled={!normalizeTagEmoji(editEmoji)}
              >
                Убрать эмоджи
              </Button>
            </Stack>
            <TagColorPickerField
              value={editColor}
              onChange={setEditColor}
              options={TAG_COLOR_OPTIONS}
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
              setEditColor(DEFAULT_TAG_COLOR)
              setEditEmoji('')
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
