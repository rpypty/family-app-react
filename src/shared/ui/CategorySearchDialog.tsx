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
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import { isApiError } from '../api/client'
import type { Category } from '../types'
import { findCategoryByName } from '../lib/categoryUtils'
import { EmojiPickerField } from './EmojiPickerField'
import { CategoryColorPickerField } from './CategoryColorPickerField'
import {
  DEFAULT_CATEGORY_COLOR,
  CATEGORY_COLOR_OPTIONS,
  normalizeCategoryColor,
  normalizeCategoryEmoji,
  withCategoryEmoji,
  type CategoryAppearanceInput,
} from '../lib/categoryAppearance'

type CategorySearchDialogProps = {
  isOpen: boolean
  categories: Category[]
  initialSelected: string[]
  onClose: () => void
  onConfirm: (selected: string[]) => void
  onCreateCategory?: (name: string, payload?: CategoryAppearanceInput) => Promise<Category>
  onUpdateCategory?: (categoryId: string, name: string, payload?: CategoryAppearanceInput) => Promise<Category>
  onDeleteCategory?: (categoryId: string) => Promise<void>
  title?: string
  enableSelectAll?: boolean
  enableSelection?: boolean
}

export function CategorySearchDialog({
  isOpen,
  categories,
  initialSelected,
  onClose,
  onConfirm,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  title = 'Поиск категорий',
  enableSelectAll = false,
  enableSelection = true,
}: CategorySearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [isCreating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createColor, setCreateColor] = useState<string | null>(DEFAULT_CATEGORY_COLOR)
  const [createEmoji, setCreateEmoji] = useState('')
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [menuCategory, setMenuCategory] = useState<Category | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string | null>(DEFAULT_CATEGORY_COLOR)
  const [editEmoji, setEditEmoji] = useState('')
  const [isUpdating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isDeleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const hasActions = Boolean(onUpdateCategory || onDeleteCategory)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelected(new Set(initialSelected))
      setCreateError('')
      setCreating(false)
      setCreateColor(DEFAULT_CATEGORY_COLOR)
      setCreateEmoji('')
      setMenuAnchorEl(null)
      setMenuCategory(null)
      setEditingCategory(null)
      setEditName('')
      setEditColor(DEFAULT_CATEGORY_COLOR)
      setEditEmoji('')
      setUpdating(false)
      setUpdateError('')
      setDeleteTarget(null)
      setDeleting(false)
      setDeleteError('')
    }
  }, [isOpen, initialSelected])

  const createAppearancePayload = (): CategoryAppearanceInput => ({
    color: createColor === null ? null : normalizeCategoryColor(createColor) ?? null,
    emoji: normalizeCategoryEmoji(createEmoji) ?? null,
  })

  const editAppearancePayload = (): CategoryAppearanceInput => ({
    color: editColor === null ? null : normalizeCategoryColor(editColor) ?? null,
    emoji: normalizeCategoryEmoji(editEmoji) ?? null,
  })

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return categories
    return categories.filter((category) => category.name.toLowerCase().includes(normalized))
  }, [query, categories])

  const allSelected = enableSelection && categories.length > 0 && selected.size === categories.length
  const isPartiallySelected =
    enableSelection && selected.size > 0 && selected.size < categories.length
  const handleToggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(categories.map((category) => category.id)))
  }

  const toggleCategory = (categoryId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleCreate = async () => {
    if (!onCreateCategory) return
    const name = query.trim()
    if (!name) return
    const existing = findCategoryByName(categories, name)
    if (existing) {
      setSelected((prev) => new Set(prev).add(existing.id))
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const category = await onCreateCategory(name, createAppearancePayload())
      setSelected((prev) => new Set(prev).add(category.id))
    } catch {
      setCreateError('Не удалось создать категорию. Попробуйте ещё раз.')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenMenu = (event: MouseEvent<HTMLElement>, category: Category) => {
    event.stopPropagation()
    setMenuAnchorEl(event.currentTarget)
    setMenuCategory(category)
  }

  const handleCloseMenu = () => {
    setMenuAnchorEl(null)
    setMenuCategory(null)
  }

  const handleStartEdit = () => {
    if (!menuCategory || !onUpdateCategory) return
    setEditingCategory(menuCategory)
    setEditName(menuCategory.name)
    setEditColor(normalizeCategoryColor(menuCategory.color) ?? null)
    setEditEmoji(normalizeCategoryEmoji(menuCategory.emoji) ?? '')
    setUpdateError('')
    handleCloseMenu()
  }

  const handleUpdate = async () => {
    if (!editingCategory || !onUpdateCategory) return
    const name = editName.trim()
    if (!name) {
      setUpdateError('Название не может быть пустым.')
      return
    }
    const existing = findCategoryByName(categories, name)
    if (existing && existing.id !== editingCategory.id) {
      setUpdateError('Категория с таким названием уже существует.')
      return
    }
    setUpdating(true)
    setUpdateError('')
    try {
      await onUpdateCategory(editingCategory.id, name, editAppearancePayload())
      setEditingCategory(null)
      setEditName('')
      setEditColor(DEFAULT_CATEGORY_COLOR)
      setEditEmoji('')
    } catch (error) {
      if (isApiError(error) && error.code === 'category_name_taken') {
        setUpdateError('Категория с таким названием уже существует.')
      } else {
        setUpdateError('Не удалось обновить категорию. Попробуйте ещё раз.')
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleRequestDelete = () => {
    if (!menuCategory || !onDeleteCategory) return
    setDeleteTarget(menuCategory)
    setDeleteError('')
    handleCloseMenu()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteCategory) return
    setDeleting(true)
    setDeleteError('')
    try {
      await onDeleteCategory(deleteTarget.id)
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
          error.code === 'category_in_use' ||
          error.code === 'category_has_expenses')
      ) {
        setDeleteError('Для удаления этой категории сначала уберите ее у записей')
      } else {
        setDeleteError('Не удалось удалить категорию. Попробуйте ещё раз.')
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
      <DialogTitle
        sx={{
          bgcolor: 'background.paper',
          color: 'text.secondary',
          borderBottom: 1,
          borderColor: 'divider',
          py: 1.5,
        }}
      >
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <IconButton
            color="inherit"
            onClick={onClose}
            aria-label="Назад"
            sx={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)' }}
          >
            <ArrowBackRounded />
          </IconButton>
          <Typography
            component="span"
            color="inherit"
            sx={{
              display: 'block',
              px: 5,
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              lineHeight: 1.25,
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Найти или создать категорию"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              if (createError) setCreateError('')
            }}
            fullWidth
          />
          {enableSelection && enableSelectAll ? (
            <List dense disablePadding>
              <ListItem disablePadding>
                <ListItemButton onClick={handleToggleAll} disabled={categories.length === 0}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={isPartiallySelected}
                    onChange={handleToggleAll}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <ListItemText primary={allSelected ? 'Убрать все' : 'Выбрать все'} />
                </ListItemButton>
              </ListItem>
            </List>
          ) : null}
          {filtered.length === 0 ? (
            <Stack spacing={1.25}>
              <Typography color="text.secondary">Ничего не найдено</Typography>
              {onCreateCategory && query.trim() ? (
                <Stack spacing={1.25}>
                  <EmojiPickerField
                    value={createEmoji}
                    onChange={(emoji) => {
                      setCreateEmoji(emoji)
                      if (createError) setCreateError('')
                    }}
                  />
                  <CategoryColorPickerField
                    value={createColor}
                    onChange={setCreateColor}
                    options={CATEGORY_COLOR_OPTIONS}
                  />
                  <Button variant="contained" onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? 'Создаём…' : `Добавить категорию "${query.trim()}"`}
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
              {filtered.map((category) => {
                const categoryColor = normalizeCategoryColor(category.color)
                return (
                  <ListItem
                    key={category.id}
                    disablePadding
                    secondaryAction={
                      hasActions ? (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(event) => handleOpenMenu(event, category)}
                          aria-label="Открыть меню"
                        >
                          <MoreHorizRounded fontSize="small" />
                        </IconButton>
                      ) : null
                    }
                  >
                    <ListItemButton
                      onClick={enableSelection ? () => toggleCategory(category.id) : undefined}
                      disableRipple={!enableSelection}
                      sx={{ cursor: enableSelection ? 'pointer' : 'default' }}
                    >
                      {enableSelection ? (
                        <Checkbox
                          checked={selected.has(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      ) : null}
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          bgcolor: categoryColor ?? 'divider',
                          border: '1px solid',
                          borderColor: categoryColor ? alpha(categoryColor, 0.65) : 'divider',
                          mr: 1.25,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText primary={withCategoryEmoji(category)} />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          )}
        </Stack>
      </DialogContent>
      {enableSelection ? (
        <DialogActions
          sx={{
            bgcolor: 'background.paper',
            py: 2,
            px: 3,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            onClick={() => onConfirm(Array.from(selected))}
            sx={(theme) => ({
              px: 3,
              fontWeight: 700,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            })}
          >
            Сохранить
          </Button>
        </DialogActions>
      ) : null}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {onUpdateCategory ? (
          <MenuItem onClick={handleStartEdit}>
            <ListItemIcon>
              <EditOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Редактировать" />
          </MenuItem>
        ) : null}
        {onDeleteCategory ? (
          <MenuItem onClick={handleRequestDelete}>
            <ListItemIcon>
              <DeleteOutlineRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Удалить" />
          </MenuItem>
        ) : null}
      </Menu>

      <Dialog
        open={Boolean(editingCategory)}
        onClose={() => {
          setEditingCategory(null)
          setEditName('')
          setEditColor(DEFAULT_CATEGORY_COLOR)
          setEditEmoji('')
          setUpdateError('')
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Редактировать категорию</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <TextField
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Название категории"
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
                disabled={!normalizeCategoryEmoji(editEmoji)}
              >
                Убрать эмоджи
              </Button>
            </Stack>
            <CategoryColorPickerField
              value={editColor}
              onChange={setEditColor}
              options={CATEGORY_COLOR_OPTIONS}
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
              setEditingCategory(null)
              setEditName('')
              setEditColor(DEFAULT_CATEGORY_COLOR)
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
        <DialogTitle>Удалить категорию?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Категория <strong>{deleteTarget?.name}</strong> будет удалена.
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
