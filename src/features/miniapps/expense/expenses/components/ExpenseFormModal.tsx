import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { Currency, Expense, Tag } from '../../../../../shared/types'
import { formatDate } from '../../../../../shared/lib/formatters'
import {
  DEFAULT_TAG_COLOR,
  TAG_COLOR_OPTIONS,
  normalizeTagColor,
  normalizeTagEmoji,
  withTagEmoji,
  type TagAppearanceInput,
} from '../../../../../shared/lib/tagAppearance'
import { EmojiPickerField } from '../../../../../shared/ui/EmojiPickerField'
import { TagColorPickerField } from '../../../../../shared/ui/TagColorPickerField'
import { findTagByName, selectedTags } from '../../../../../shared/lib/tagUtils'
import { createId } from '../../../../../shared/lib/uuid'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'BYN', 'RUB']

type TagCreateOption = {
  inputValue: string
  name: string
  isNew: true
}

type TagOption = Tag | TagCreateOption

type PendingTagCreate = {
  name: string
  nextIds: string[]
}

type ExpenseFormModalProps = {
  isOpen: boolean
  expense?: Expense | null
  tags: Tag[]
  onClose: () => void
  onSave: (expense: Expense) => Promise<void>
  onDelete: (expenseId: string) => Promise<void>
  onCreateTag: (name: string, payload?: TagAppearanceInput) => Promise<Tag>
}

export function ExpenseFormModal({
  isOpen,
  expense,
  tags,
  onClose,
  onSave,
  onDelete,
  onCreateTag,
}: ExpenseFormModalProps) {
  const [date, setDate] = useState(formatDate(new Date()))
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('BYN')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [isTagCreating, setTagCreating] = useState(false)
  const [tagCreateError, setTagCreateError] = useState('')
  const [pendingTagCreate, setPendingTagCreate] = useState<PendingTagCreate | null>(null)
  const [newTagColor, setNewTagColor] = useState<string | null>(DEFAULT_TAG_COLOR)
  const [newTagEmoji, setNewTagEmoji] = useState('')
  const [isConfirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [isDeleting, setDeleting] = useState(false)
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    if (!isOpen) return
    setDate(expense?.date ?? formatDate(new Date()))
    setTitle(expense?.title ?? '')
    setAmount(expense?.amount?.toString() ?? '')
    setCurrency(expense?.currency ?? 'BYN')
    setSelectedTagIds(new Set(expense?.tagIds ?? []))
    setError('')
    setTagCreateError('')
    setTagCreating(false)
    setPendingTagCreate(null)
    setNewTagColor(DEFAULT_TAG_COLOR)
    setNewTagEmoji('')
    setConfirmOpen(false)
    setSaving(false)
    setDeleting(false)
  }, [expense, isOpen])

  const selectedTagList = useMemo(
    () => selectedTags(tags, selectedTagIds),
    [tags, selectedTagIds],
  )

  const handleTagsChange = async (value: Array<TagOption | string>) => {
    setTagCreateError('')
    const nextIds = new Set<string>()
    let createName = ''

    value.forEach((option) => {
      if (typeof option === 'string') {
        createName = option
        return
      }
      if ('isNew' in option) {
        createName = option.name
        return
      }
      nextIds.add(option.id)
    })

    if (!createName) {
      setSelectedTagIds(nextIds)
      return
    }

    const trimmed = createName.trim()
    if (!trimmed) {
      setSelectedTagIds(nextIds)
      return
    }

    const existing = findTagByName(tags, trimmed)
    if (existing) {
      nextIds.add(existing.id)
      setSelectedTagIds(nextIds)
      return
    }

    setSelectedTagIds(nextIds)
    setPendingTagCreate({
      name: trimmed,
      nextIds: Array.from(nextIds),
    })
    setNewTagColor(DEFAULT_TAG_COLOR)
    setNewTagEmoji('')
  }

  const handleConfirmTagCreate = async () => {
    if (!pendingTagCreate) return
    setTagCreating(true)
    setTagCreateError('')
    try {
      const created = await onCreateTag(pendingTagCreate.name, {
        color: newTagColor === null ? null : normalizeTagColor(newTagColor) ?? null,
        emoji: normalizeTagEmoji(newTagEmoji) ?? null,
      })
      const nextIds = new Set(pendingTagCreate.nextIds)
      nextIds.add(created.id)
      setSelectedTagIds(nextIds)
      setPendingTagCreate(null)
      setNewTagColor(DEFAULT_TAG_COLOR)
      setNewTagEmoji('')
    } catch {
      setTagCreateError('Не удалось создать тег. Попробуйте ещё раз.')
    } finally {
      setTagCreating(false)
    }
  }

  const handleSave = async () => {
    const normalizedAmount = amount.replace(/\s/g, '').replace(',', '.')
    const parsedAmount = Number.parseFloat(normalizedAmount)
    const trimmedTitle = title.trim()

    if (!trimmedTitle || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Введите корректные данные')
      return
    }

    const payload: Expense = {
      id: expense?.id ?? createId(),
      date,
      amount: parsedAmount,
      currency,
      title: trimmedTitle,
      tagIds: Array.from(selectedTagIds),
    }
    setSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch {
      setError('Не удалось сохранить расход. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
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
          {expense ? 'Редактирование' : 'Новый расход'}
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.paper' }}>
          <Stack spacing={2}>
            <TextField
              type="date"
              label="Дата"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Название"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: продукты"
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Сумма"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                fullWidth
              />
              <TextField
                label="Валюта"
                select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                fullWidth
              >
                {CURRENCIES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Box>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Теги
                </Typography>
                <Autocomplete<TagOption, true, false, true>
                  multiple
                  freeSolo
                  disableCloseOnSelect
                  filterSelectedOptions
                  options={tags}
                  value={selectedTagList}
                  loading={isTagCreating}
                  onInputChange={(_event, _value, reason) => {
                    if (reason === 'input' && tagCreateError) {
                      setTagCreateError('')
                    }
                  }}
                  onChange={(_, value) => {
                    void handleTagsChange(value)
                  }}
                  filterOptions={(options, params) => {
                    const inputValue = params.inputValue.trim()
                    const normalized = inputValue.toLowerCase()
                    const filtered = options.filter((option) =>
                      option.name.toLowerCase().includes(normalized),
                    )
                    if (inputValue && !findTagByName(tags, inputValue)) {
                      filtered.push({ inputValue, name: inputValue, isNew: true })
                    }
                    return filtered
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option
                    if ('isNew' in option) return option.name
                    return withTagEmoji(option)
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof option === 'string' || typeof value === 'string') {
                      return option === value
                    }
                    if ('isNew' in option || 'isNew' in value) return false
                    return option.id === value.id
                  }}
                  renderOption={(props, option) => {
                    if ('isNew' in option) {
                      return <li {...props}>{`Добавить тег "${option.name}"`}</li>
                    }
                    const tagColor = normalizeTagColor(option.color)
                    return (
                      <li {...props}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              bgcolor: tagColor ?? 'divider',
                              border: '1px solid',
                              borderColor: tagColor ? alpha(tagColor, 0.5) : 'divider',
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2">{withTagEmoji(option)}</Typography>
                        </Stack>
                      </li>
                    )
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      if (typeof option === 'string' || 'isNew' in option) {
                        return (
                          <Chip
                            {...getTagProps({ index })}
                            key={`${option}-${index}`}
                            label={typeof option === 'string' ? option : option.name}
                            size="small"
                          />
                        )
                      }
                      const tagColor = normalizeTagColor(option.color)
                      return (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={withTagEmoji(option)}
                          size="small"
                          sx={(theme) => ({
                            color: tagColor ?? theme.palette.text.secondary,
                            borderColor: tagColor ? alpha(tagColor, 0.45) : theme.palette.divider,
                            bgcolor: tagColor
                              ? alpha(tagColor, theme.palette.mode === 'dark' ? 0.28 : 0.12)
                              : 'transparent',
                          })}
                        />
                      )
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Выбрать теги"
                      placeholder="Поиск или создание"
                      error={Boolean(tagCreateError)}
                      helperText={tagCreateError || undefined}
                    />
                  )}
                />
              </Stack>
            </Box>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'background.paper', py: 2 }}>
          <Button color="inherit" onClick={onClose} disabled={isSaving || isDeleting}>
            Отмена
          </Button>
          {expense ? (
            <Button
              color="error"
              onClick={() => setConfirmOpen(true)}
              disabled={isSaving || isDeleting}
            >
              Удалить
            </Button>
          ) : null}
          <Button
            variant="outlined"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            sx={(theme) => ({
              color: theme.palette.primary.main,
              borderColor: alpha(theme.palette.primary.main, 0.4),
              backgroundColor: alpha(
                theme.palette.background.paper,
                theme.palette.mode === 'dark' ? 0.2 : 0.7,
              ),
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontWeight: 600,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
            })}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pendingTagCreate)}
        onClose={() => {
          if (isTagCreating) return
          setPendingTagCreate(null)
          setNewTagColor(DEFAULT_TAG_COLOR)
          setNewTagEmoji('')
          setTagCreateError('')
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Новый тег</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <TextField
              label="Название"
              value={pendingTagCreate?.name ?? ''}
              fullWidth
              disabled
              size="small"
            />
            <EmojiPickerField
              value={newTagEmoji}
              onChange={(emoji) => {
                setNewTagEmoji(emoji)
                if (tagCreateError) setTagCreateError('')
              }}
            />
            <TagColorPickerField
              value={newTagColor}
              onChange={setNewTagColor}
              options={TAG_COLOR_OPTIONS}
            />
            {tagCreateError ? (
              <Typography color="error" variant="body2">
                {tagCreateError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPendingTagCreate(null)
              setNewTagColor(DEFAULT_TAG_COLOR)
              setNewTagEmoji('')
              setTagCreateError('')
            }}
            disabled={isTagCreating}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleConfirmTagCreate()
            }}
            disabled={isTagCreating}
          >
            {isTagCreating ? 'Создаём…' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isConfirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Удалить расход?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
            Отмена
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={async () => {
              if (!expense) return
              setDeleting(true)
              try {
                await onDelete(expense.id)
                setConfirmOpen(false)
                onClose()
              } catch {
                setError('Не удалось удалить расход. Попробуйте ещё раз.')
                setConfirmOpen(false)
              } finally {
                setDeleting(false)
              }
            }}
          >
            {isDeleting ? 'Удаляем…' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
