import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
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
import type { Currency, Expense, Category } from '../../../../../shared/types'
import { formatDate } from '../../../../../shared/lib/formatters'
import {
  DEFAULT_CATEGORY_COLOR,
  CATEGORY_COLOR_OPTIONS,
  normalizeCategoryColor,
  normalizeCategoryEmoji,
  withCategoryEmoji,
  type CategoryAppearanceInput,
} from '../../../../../shared/lib/categoryAppearance'
import { EmojiPickerField } from '../../../../../shared/ui/EmojiPickerField'
import { CategoryColorPickerField } from '../../../../../shared/ui/CategoryColorPickerField'
import { findCategoryByName, selectedCategories } from '../../../../../shared/lib/categoryUtils'
import { createId } from '../../../../../shared/lib/uuid'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'BYN', 'RUB']

type CategoryCreateOption = {
  inputValue: string
  name: string
  isNew: true
}

type CategoryOption = Category | CategoryCreateOption

type PendingCategoryCreate = {
  name: string
  nextIds: string[]
}

type ExpenseFormModalProps = {
  isOpen: boolean
  expense?: Expense | null
  categories: Category[]
  onClose: () => void
  onSave: (expense: Expense) => Promise<void>
  onDelete: (expenseId: string) => Promise<void>
  onCreateCategory: (name: string, payload?: CategoryAppearanceInput) => Promise<Category>
}

export function ExpenseFormModal({
  isOpen,
  expense,
  categories,
  onClose,
  onSave,
  onDelete,
  onCreateCategory,
}: ExpenseFormModalProps) {
  const [date, setDate] = useState(formatDate(new Date()))
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('BYN')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [isCategoryCreating, setCategoryCreating] = useState(false)
  const [categoryCreateError, setCategoryCreateError] = useState('')
  const [pendingCategoryCreate, setPendingCategoryCreate] = useState<PendingCategoryCreate | null>(null)
  const [newCategoryColor, setNewCategoryColor] = useState<string | null>(DEFAULT_CATEGORY_COLOR)
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('')
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
    setSelectedCategoryIds(new Set(expense?.categoryIds ?? []))
    setError('')
    setCategoryCreateError('')
    setCategoryCreating(false)
    setPendingCategoryCreate(null)
    setNewCategoryColor(DEFAULT_CATEGORY_COLOR)
    setNewCategoryEmoji('')
    setConfirmOpen(false)
    setSaving(false)
    setDeleting(false)
  }, [expense, isOpen])

  const selectedCategoryList = useMemo(
    () => selectedCategories(categories, selectedCategoryIds),
    [categories, selectedCategoryIds],
  )

  const handleCategoriesChange = async (value: Array<CategoryOption | string>) => {
    setCategoryCreateError('')
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
      setSelectedCategoryIds(nextIds)
      return
    }

    const trimmed = createName.trim()
    if (!trimmed) {
      setSelectedCategoryIds(nextIds)
      return
    }

    const existing = findCategoryByName(categories, trimmed)
    if (existing) {
      nextIds.add(existing.id)
      setSelectedCategoryIds(nextIds)
      return
    }

    setSelectedCategoryIds(nextIds)
    setPendingCategoryCreate({
      name: trimmed,
      nextIds: Array.from(nextIds),
    })
    setNewCategoryColor(DEFAULT_CATEGORY_COLOR)
    setNewCategoryEmoji('')
  }

  const handleConfirmCategoryCreate = async () => {
    if (!pendingCategoryCreate) return
    setCategoryCreating(true)
    setCategoryCreateError('')
    try {
      const created = await onCreateCategory(pendingCategoryCreate.name, {
        color: newCategoryColor === null ? null : normalizeCategoryColor(newCategoryColor) ?? null,
        emoji: normalizeCategoryEmoji(newCategoryEmoji) ?? null,
      })
      const nextIds = new Set(pendingCategoryCreate.nextIds)
      nextIds.add(created.id)
      setSelectedCategoryIds(nextIds)
      setPendingCategoryCreate(null)
      setNewCategoryColor(DEFAULT_CATEGORY_COLOR)
      setNewCategoryEmoji('')
    } catch {
      setCategoryCreateError('Не удалось создать категорию. Попробуйте ещё раз.')
    } finally {
      setCategoryCreating(false)
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
      categoryIds: Array.from(selectedCategoryIds),
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
                  Категории
                </Typography>
                <Autocomplete<CategoryOption, true, false, true>
                  multiple
                  freeSolo
                  disableCloseOnSelect
                  filterSelectedOptions
                  options={categories}
                  value={selectedCategoryList}
                  loading={isCategoryCreating}
                  onInputChange={(_event, _value, reason) => {
                    if (reason === 'input' && categoryCreateError) {
                      setCategoryCreateError('')
                    }
                  }}
                  onChange={(_, value) => {
                    void handleCategoriesChange(value)
                  }}
                  filterOptions={(options, params) => {
                    const inputValue = params.inputValue.trim()
                    const normalized = inputValue.toLowerCase()
                    const filtered = options.filter((option) =>
                      option.name.toLowerCase().includes(normalized),
                    )
                    if (inputValue && !findCategoryByName(categories, inputValue)) {
                      filtered.push({ inputValue, name: inputValue, isNew: true })
                    }
                    return filtered
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option
                    if ('isNew' in option) return option.name
                    return withCategoryEmoji(option)
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
                      return <li {...props}>{`Добавить категорию "${option.name}"`}</li>
                    }
                    const categoryColor = normalizeCategoryColor(option.color)
                    return (
                      <li {...props}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              bgcolor: categoryColor ?? 'divider',
                              border: '1px solid',
                              borderColor: categoryColor ? alpha(categoryColor, 0.5) : 'divider',
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2">{withCategoryEmoji(option)}</Typography>
                        </Stack>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Выбрать категории"
                      placeholder="Поиск или создание"
                      error={Boolean(categoryCreateError)}
                      helperText={categoryCreateError || undefined}
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
        open={Boolean(pendingCategoryCreate)}
        onClose={() => {
          if (isCategoryCreating) return
          setPendingCategoryCreate(null)
          setNewCategoryColor(DEFAULT_CATEGORY_COLOR)
          setNewCategoryEmoji('')
          setCategoryCreateError('')
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Новая категория</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <TextField
              label="Название"
              value={pendingCategoryCreate?.name ?? ''}
              fullWidth
              disabled
              size="small"
            />
            <EmojiPickerField
              value={newCategoryEmoji}
              onChange={(emoji) => {
                setNewCategoryEmoji(emoji)
                if (categoryCreateError) setCategoryCreateError('')
              }}
            />
            <CategoryColorPickerField
              value={newCategoryColor}
              onChange={setNewCategoryColor}
              options={CATEGORY_COLOR_OPTIONS}
            />
            {categoryCreateError ? (
              <Typography color="error" variant="body2">
                {categoryCreateError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPendingCategoryCreate(null)
              setNewCategoryColor(DEFAULT_CATEGORY_COLOR)
              setNewCategoryEmoji('')
              setCategoryCreateError('')
            }}
            disabled={isCategoryCreating}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleConfirmCategoryCreate()
            }}
            disabled={isCategoryCreating}
          >
            {isCategoryCreating ? 'Создаём…' : 'Создать'}
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
