import { useEffect, useMemo, useRef, useState } from 'react'
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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
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
  isCategoryCreateOpen: boolean
  isDeleteConfirmOpen: boolean
  categories: Category[]
  onClose: () => void
  onOpenCategoryCreate: () => void
  onCloseCategoryCreate: () => void
  onOpenDeleteConfirm: () => void
  onCloseDeleteConfirm: () => void
  onSave: (expense: Expense) => Promise<void>
  onDelete: (expenseId: string) => Promise<void>
  onCreateCategory: (name: string, payload?: CategoryAppearanceInput) => Promise<Category>
}

export function ExpenseFormModal({
  isOpen,
  expense,
  isCategoryCreateOpen,
  isDeleteConfirmOpen,
  categories,
  onClose,
  onOpenCategoryCreate,
  onCloseCategoryCreate,
  onOpenDeleteConfirm,
  onCloseDeleteConfirm,
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
  const [isSaving, setSaving] = useState(false)
  const [isDeleting, setDeleting] = useState(false)
  const [categoryInputValue, setCategoryInputValue] = useState('')
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const wasCategoryCreateOpen = useRef(isCategoryCreateOpen)

  const resetPendingCategoryCreate = () => {
    setPendingCategoryCreate(null)
    setNewCategoryColor(DEFAULT_CATEGORY_COLOR)
    setNewCategoryEmoji('')
    setCategoryCreateError('')
  }

  const closeCategoryCreateDialog = () => {
    if (isCategoryCreating) return
    resetPendingCategoryCreate()
    onCloseCategoryCreate()
  }

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
    setSaving(false)
    setDeleting(false)
    setCategoryInputValue('')
  }, [expense, isOpen])

  useEffect(() => {
    if (wasCategoryCreateOpen.current && !isCategoryCreateOpen) {
      resetPendingCategoryCreate()
    }
    wasCategoryCreateOpen.current = isCategoryCreateOpen
  }, [isCategoryCreateOpen])

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
    onOpenCategoryCreate()
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
      resetPendingCategoryCreate()
      onCloseCategoryCreate()
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
    const fallbackTitle = selectedCategoryList[0]?.name?.trim() ?? ''

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Введите корректные данные')
      return
    }

    const payload: Expense = {
      id: expense?.id ?? createId(),
      date,
      amount: parsedAmount,
      currency,
      title: trimmedTitle || fallbackTitle,
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

  const handleAmountChange = (rawValue: string) => {
    let sanitizedValue = rawValue.replace(/[^\d.,]/g, '')
    const separatorIndex = sanitizedValue.search(/[.,]/)
    if (separatorIndex !== -1) {
      const integerPart = sanitizedValue.slice(0, separatorIndex + 1)
      const fractionalPart = sanitizedValue.slice(separatorIndex + 1).replace(/[.,]/g, '')
      sanitizedValue = `${integerPart}${fractionalPart}`
    }
    setAmount(sanitizedValue)
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
          <Box sx={{ position: 'relative', textAlign: 'center' }}>
            <IconButton
              color="inherit"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              aria-label="Назад"
              sx={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)' }}
            >
              <ArrowBackRounded />
            </IconButton>
            <Typography component="span" variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
              {expense ? 'Редактирование' : 'Новый расход'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.paper' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <TextField
                label="Сумма"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                inputMode="decimal"
                slotProps={{ htmlInput: { pattern: '[0-9]*[.,]?[0-9]*' } }}
                fullWidth
              />
              <TextField
                label="Валюта"
                select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                sx={{ width: { xs: 112, sm: 128 }, flexShrink: 0 }}
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
                <Autocomplete<CategoryOption, true, false, true>
                  multiple
                  freeSolo
                  disableCloseOnSelect
                  filterSelectedOptions
                  options={categories}
                  value={selectedCategoryList}
                  inputValue={categoryInputValue}
                  loading={isCategoryCreating}
                  onInputChange={(_event, value, reason) => {
                    setCategoryInputValue(value)
                    if (reason === 'input' && categoryCreateError) {
                      setCategoryCreateError('')
                    }
                  }}
                  onChange={(_, value, reason) => {
                    if (reason === 'clear') {
                      setCategoryInputValue('')
                      return
                    }
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
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const label =
                        typeof option === 'string'
                          ? option
                          : 'isNew' in option
                            ? option.name
                            : withCategoryEmoji(option)
                      const categoryColor =
                        typeof option === 'object' && !('isNew' in option)
                          ? normalizeCategoryColor(option.color)
                          : null
                      return (
                        <Chip
                          {...getTagProps({ index })}
                          key={
                            typeof option === 'string'
                              ? `${option}-${index}`
                              : 'isNew' in option
                                ? `${option.name}-${index}`
                                : option.id
                          }
                          size="small"
                          label={label}
                          sx={
                            categoryColor
                              ? {
                                  borderColor: alpha(categoryColor, 0.55),
                                  bgcolor: alpha(categoryColor, 0.14),
                                }
                              : undefined
                          }
                        />
                      )
                    })
                  }
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
            <TextField
              type="date"
              label="Дата"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Свое название"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: «Пицца» или «Такси»"
              fullWidth
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'background.paper', py: 2, px: 3, gap: 1, justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            sx={(theme) => ({
              px: 3,
              fontWeight: 700,
              flex: 1,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            })}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          {expense ? (
            <Button
              color="error"
              variant="outlined"
              onClick={onOpenDeleteConfirm}
              disabled={isSaving || isDeleting}
              aria-label="Удалить расход"
              sx={{
                minWidth: 50,
                px: 0,
                flexShrink: 0,
              }}
            >
              <DeleteOutlineRoundedIcon />
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={isCategoryCreateOpen && Boolean(pendingCategoryCreate)}
        onClose={closeCategoryCreateDialog}
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
          <Button onClick={closeCategoryCreateDialog} disabled={isCategoryCreating}>
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

      <Dialog
        open={isDeleteConfirmOpen && Boolean(expense)}
        onClose={() => {
          if (isDeleting) return
          onCloseDeleteConfirm()
        }}
      >
        <DialogTitle>Удалить расход?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDeleteConfirm} disabled={isDeleting}>
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
                onCloseDeleteConfirm()
                onClose()
              } catch {
                setError('Не удалось удалить расход. Попробуйте ещё раз.')
                onCloseDeleteConfirm()
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
