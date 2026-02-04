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
  onCreateTag?: (name: string) => Tag
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
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelected(new Set(initialSelected))
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

  const handleCreate = () => {
    if (!onCreateTag) return
    const name = query.trim()
    if (!name) return
    const existing = findTagByName(tags, name)
    const tag = existing ?? onCreateTag(name)
    if (!tag) return
    setSelected((prev) => new Set(prev).add(tag.id))
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
                <Button variant="contained" onClick={handleCreate}>
                  Добавить тег "{query.trim()}"
                </Button>
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
