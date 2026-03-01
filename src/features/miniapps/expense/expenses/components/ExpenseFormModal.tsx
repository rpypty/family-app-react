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
  normalizeCategoryColor,
  withCategoryEmoji,
  type CategoryAppearanceInput,
} from '../../../../../shared/lib/categoryAppearance'
import { selectedCategories } from '../../../../../shared/lib/categoryUtils'
import { CategorySearchDialog } from '../../../../../shared/ui/CategorySearchDialog'
import { createId } from '../../../../../shared/lib/uuid'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'BYN', 'RUB']

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
  const [isSaving, setSaving] = useState(false)
  const [isDeleting, setDeleting] = useState(false)
  const [categoryInputValue, setCategoryInputValue] = useState('')
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
    setSaving(false)
    setDeleting(false)
    setCategoryInputValue('')
  }, [expense, isOpen])

  useEffect(() => {
    if (!fullScreen && isCategoryCreateOpen) {
      onCloseCategoryCreate()
    }
  }, [fullScreen, isCategoryCreateOpen, onCloseCategoryCreate])

  const selectedCategoryList = useMemo(
    () => selectedCategories(categories, selectedCategoryIds),
    [categories, selectedCategoryIds],
  )

  const handleCategoryRemove = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
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
                {fullScreen ? (
                  <>
                    <TextField
                      fullWidth
                      value="Выбрать категории"
                      onClick={isSaving || isDeleting ? undefined : onOpenCategoryCreate}
                      onKeyDown={(event) => {
                        if (isSaving || isDeleting) return
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onOpenCategoryCreate()
                        }
                      }}
                      InputProps={{ readOnly: true }}
                      disabled={isSaving || isDeleting}
                      sx={{
                        '& .MuiInputBase-input': {
                          cursor: isSaving || isDeleting ? 'default' : 'pointer',
                        },
                      }}
                    />
                    {selectedCategoryList.length > 0 ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selectedCategoryList.map((category) => {
                          const categoryColor = normalizeCategoryColor(category.color)
                          return (
                            <Chip
                              key={category.id}
                              label={withCategoryEmoji(category)}
                              size="small"
                              variant="outlined"
                              onDelete={
                                isSaving || isDeleting
                                  ? undefined
                                  : () => handleCategoryRemove(category.id)
                              }
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
                        })}
                      </Stack>
                    ) : null}
                  </>
                ) : (
                  <Autocomplete<Category, true, false, false>
                    multiple
                    filterSelectedOptions
                    options={categories}
                    value={selectedCategoryList}
                    inputValue={categoryInputValue}
                    onInputChange={(_event, value) => {
                      setCategoryInputValue(value)
                    }}
                    onChange={(_event, value, reason) => {
                      if (reason === 'clear') {
                        setCategoryInputValue('')
                        return
                      }
                      setSelectedCategoryIds(new Set(value.map((category) => category.id)))
                    }}
                    disabled={isSaving || isDeleting}
                    getOptionLabel={(option) => withCategoryEmoji(option)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, option) => {
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
                      value.map((category, index) => {
                        const categoryColor = normalizeCategoryColor(category.color)
                        return (
                          <Chip
                            {...getTagProps({ index })}
                            key={category.id}
                            size="small"
                            label={withCategoryEmoji(category)}
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
                        placeholder="Поиск категории"
                      />
                    )}
                  />
                )}
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

      <CategorySearchDialog
        isOpen={fullScreen && isCategoryCreateOpen}
        categories={categories}
        initialSelected={Array.from(selectedCategoryIds)}
        onClose={onCloseCategoryCreate}
        onConfirm={(selected) => {
          setSelectedCategoryIds(new Set(selected))
          onCloseCategoryCreate()
        }}
        onCreateCategory={onCreateCategory}
        title="Выбрать категории"
      />

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
