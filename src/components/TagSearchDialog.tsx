import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { Tag } from '../data/types'
import { findTagByName } from '../utils/tagUtils'

type TagSearchDialogProps = {
  isOpen: boolean
  tags: Tag[]
  initialSelected: string[]
  onClose: () => void
  onConfirm: (selected: string[]) => void
  onCreateTag?: (name: string) => Promise<Tag>
  title?: string
}

export function TagSearchDialog({
  isOpen,
  tags,
  initialSelected,
  onClose,
  onConfirm,
  onCreateTag,
  title = 'Поиск тегов',
}: TagSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [isCreating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelected(new Set(initialSelected))
      setCreateError('')
      setCreating(false)
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
                <ListItem key={tag.id} disablePadding>
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
    </Dialog>
  )
}
