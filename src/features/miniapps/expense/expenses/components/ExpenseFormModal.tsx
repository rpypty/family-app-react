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
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  DEFAULT_CURRENCY,
  type Expense,
  type Category,
} from '../../../../../shared/types'
import { isApiError } from '../../../../../shared/api/client'
import {
  formatAmount,
  formatAmountWithCurrency,
  formatDate,
} from '../../../../../shared/lib/formatters'
import {
  normalizeCategoryColor,
  withCategoryEmoji,
  type CategoryAppearanceInput,
} from '../../../../../shared/lib/categoryAppearance'
import { selectedCategories } from '../../../../../shared/lib/categoryUtils'
import { CategorySearchDialog } from '../../../../../shared/ui/CategorySearchDialog'
import { createId } from '../../../../../shared/lib/uuid'
import { getTopCategories, type TopCategoryItem, type TopCategoriesStatus } from '../api/topCategories'
import { listCurrencies, type CurrencyItem } from '../../api/currencies'
import { getExchangeRate } from '../../api/exchangeRates'
import {
  resolveAmountInput,
  resolveExchangePreview,
  sanitizeAmountInput,
} from '../lib/exchangePreview'

type ExpenseFormModalProps = {
  isOpen: boolean
  expense?: Expense | null
  defaultCurrency?: string | null
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
  onRefreshCategories?: () => void
}

const FALLBACK_CURRENCIES: CurrencyItem[] = [
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'ƃ' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
]

const formatCurrencyOptionLabel = (item: Pick<CurrencyItem, 'code' | 'icon'>): string =>
  item.icon ? `${item.icon} ${item.code}` : item.code

export function ExpenseFormModal({
  isOpen,
  expense,
  defaultCurrency,
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
  onRefreshCategories,
}: ExpenseFormModalProps) {
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const normalizedDefaultCurrency = useMemo(() => {
    const raw = defaultCurrency?.trim().toUpperCase()
    return raw || DEFAULT_CURRENCY
  }, [defaultCurrency])
  const [date, setDate] = useState(formatDate(new Date()))
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([])
  const [isCurrenciesLoading, setCurrenciesLoading] = useState(false)
  const [currenciesError, setCurrenciesError] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isRateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [isSaving, setSaving] = useState(false)
  const [isDeleting, setDeleting] = useState(false)
  const [categoryInputValue, setCategoryInputValue] = useState('')
  const [topCategoryItems, setTopCategoryItems] = useState<TopCategoryItem[]>([])
  const [topCategoriesStatus, setTopCategoriesStatus] = useState<TopCategoriesStatus | null>(null)
  const [isTopCategoriesLoading, setTopCategoriesLoading] = useState(false)
  const [isPopularInfoOpen, setPopularInfoOpen] = useState(false)
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    if (!isOpen) return
    setDate(expense?.date ?? formatDate(new Date()))
    setTitle(expense?.title ?? '')
    setAmount(expense?.amount?.toString() ?? '')
    setCurrency(expense?.currency ?? normalizedDefaultCurrency)
    setExchangeRate(expense?.exchangeRate ?? null)
    setRateError(null)
    setRateLoading(false)
    setSelectedCategoryIds(new Set(expense?.categoryIds ?? []))
    setError('')
    setSaving(false)
    setDeleting(false)
    setCategoryInputValue('')
    setTopCategoryItems([])
    setTopCategoriesStatus(null)
    setTopCategoriesLoading(false)
    setPopularInfoOpen(false)
  }, [expense, isOpen, normalizedDefaultCurrency])

  useEffect(() => {
    if (!fullScreen && isCategoryCreateOpen) {
      onCloseCategoryCreate()
    }
  }, [fullScreen, isCategoryCreateOpen, onCloseCategoryCreate])

  useEffect(() => {
    if (!isOpen || expense) {
      setTopCategoryItems([])
      setTopCategoriesStatus(null)
      setTopCategoriesLoading(false)
      return
    }
    let isCancelled = false
    setTopCategoriesLoading(true)
    ;(async () => {
      try {
        const response = await getTopCategories()
        if (isCancelled) return
        setTopCategoriesStatus(response.status)
        setTopCategoryItems(response.status === 'OK' ? response.items : [])
      } catch {
        if (isCancelled) return
        setTopCategoriesStatus(null)
        setTopCategoryItems([])
      } finally {
        if (!isCancelled) {
          setTopCategoriesLoading(false)
        }
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [isOpen, expense])

  useEffect(() => {
    if (!isOpen) return
    let isCancelled = false
    setCurrenciesLoading(true)
    setCurrenciesError(null)
    ;(async () => {
      try {
        const response = await listCurrencies()
        if (isCancelled) return
        setCurrencies(response.length > 0 ? response : FALLBACK_CURRENCIES)
      } catch {
        if (isCancelled) return
        setCurrencies(FALLBACK_CURRENCIES)
        setCurrenciesError('Не удалось загрузить список валют. Доступен базовый набор.')
      } finally {
        if (!isCancelled) {
          setCurrenciesLoading(false)
        }
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [isOpen])

  const resolvedAmount = useMemo(() => resolveAmountInput(amount), [amount])

  const currencyOptions = useMemo(() => {
    const map = new Map<string, CurrencyItem>()
    currencies.forEach((item) => {
      map.set(item.code, item)
    })
    if (!map.has(normalizedDefaultCurrency)) {
      map.set(normalizedDefaultCurrency, {
        code: normalizedDefaultCurrency,
        name: normalizedDefaultCurrency,
      })
    }
    if (currency && !map.has(currency)) {
      map.set(currency, { code: currency, name: currency })
    }
    return Array.from(map.values())
  }, [currencies, normalizedDefaultCurrency, currency])
  const currencyLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    currencyOptions.forEach((item) => {
      if (item.symbol) {
        labels[item.code] = item.symbol
      }
    })
    return labels
  }, [currencyOptions])

  useEffect(() => {
    if (!isOpen) return

    const shouldSkipRateLookup =
      resolvedAmount.resolvedAmount === null || currency.trim().length === 0 || date.trim().length === 0
    if (shouldSkipRateLookup) {
      setExchangeRate(null)
      setRateError(null)
      setRateLoading(false)
      return
    }

    if (currency === normalizedDefaultCurrency) {
      setExchangeRate(1)
      setRateError(null)
      setRateLoading(false)
      return
    }

    let isCancelled = false
    setRateLoading(true)
    setRateError(null)
    ;(async () => {
      try {
        const response = await getExchangeRate({
          from: currency,
          to: normalizedDefaultCurrency,
          date,
        })
        if (isCancelled) return
        setExchangeRate(response.rate)
      } catch (caughtError) {
        if (isCancelled) return
        setExchangeRate(null)
        if (
          isApiError(caughtError) &&
          caughtError.status === 422 &&
          caughtError.code === 'rate_not_available'
        ) {
          setRateError('Курс на выбранную дату недоступен. Выберите другую дату или валюту.')
          return
        }
        setRateError('Не удалось получить курс валюты.')
      } finally {
        if (!isCancelled) {
          setRateLoading(false)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [isOpen, resolvedAmount.resolvedAmount, currency, date, normalizedDefaultCurrency])

  const exchangePreview = useMemo(
    () =>
      resolveExchangePreview({
        amount: resolvedAmount.resolvedAmount,
        expenseCurrency: currency,
        baseCurrency: normalizedDefaultCurrency,
        exchangeRate,
      }),
    [resolvedAmount.resolvedAmount, currency, normalizedDefaultCurrency, exchangeRate],
  )
  const isBaseCurrencySelected = currency === normalizedDefaultCurrency
  const shouldShowBasePreviewHint = !isBaseCurrencySelected && (
    isRateLoading ||
    rateError !== null ||
    exchangePreview.amountInBase !== null
  )
  const basePreviewText =
    exchangePreview.amountInBase === null
      ? null
      : `~${formatAmountWithCurrency(exchangePreview.amountInBase, normalizedDefaultCurrency, currencyLabels)}`
  const shouldShowResolvedAmountHint = resolvedAmount.hasExpression && resolvedAmount.resolvedAmount !== null
  const resolvedAmountText =
    resolvedAmount.resolvedAmount === null
      ? null
      : Number.isInteger(resolvedAmount.resolvedAmount)
        ? resolvedAmount.resolvedAmount.toString()
        : formatAmount(resolvedAmount.resolvedAmount)
  const resolvedAmountHint = shouldShowResolvedAmountHint
    ? `Итог: ${resolvedAmountText}`
    : null
  const resolvedAmountChipText = shouldShowResolvedAmountHint ? `=${resolvedAmountText}` : null
  const isSaveDisabled = isSaving || isDeleting || !resolvedAmount.isValid

  const selectedCategoryList = useMemo(
    () => selectedCategories(categories, selectedCategoryIds),
    [categories, selectedCategoryIds],
  )

  const popularCategorySuggestions = useMemo(() => {
    if (expense || topCategoriesStatus !== 'OK') return []
    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    const unique = new Map<string, Category>()
    topCategoryItems.forEach((item) => {
      if (selectedCategoryIds.has(item.categoryId)) return
      const category = categoryMap.get(item.categoryId) ?? {
        id: item.categoryId,
        name: item.categoryName,
      }
      if (!unique.has(category.id)) {
        unique.set(category.id, category)
      }
    })
    return Array.from(unique.values())
  }, [categories, expense, selectedCategoryIds, topCategoryItems, topCategoriesStatus])

  const shouldShowTopCategoriesCard =
    !expense && (isTopCategoriesLoading || popularCategorySuggestions.length > 0)

  const unifiedPlaceholderSx = {
    '& .MuiInputBase-input::placeholder': {
      color: 'text.secondary',
      opacity: 1,
    },
  }

  const handleCategoryRemove = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
  }

  const handleSelectTopCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.has(categoryId)) return prev
      const next = new Set(prev)
      next.add(categoryId)
      return next
    })
  }

  const handleOpenCategorySearch = () => {
    onRefreshCategories?.()
    onOpenCategoryCreate()
  }

  const focusAmountInput = () => {
    window.setTimeout(() => {
      const input = amountInputRef.current
      if (!input) return
      input.focus()
      const position = input.value.length
      input.setSelectionRange(position, position)
    }, 0)
  }

  const handleAmountHelperPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    focusAmountInput()
  }

  const handleSave = async () => {
    const trimmedTitle = title.trim()
    const fallbackTitle = selectedCategoryList[0]?.name?.trim() ?? ''

    if (resolvedAmount.resolvedAmount === null) {
      setError('Введите корректные данные')
      return
    }

    const payload: Expense = {
      id: expense?.id ?? createId(),
      date,
      amount: resolvedAmount.resolvedAmount,
      currency,
      title: trimmedTitle || fallbackTitle,
      categoryIds: Array.from(selectedCategoryIds),
    }
    setSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch (caughtError) {
      if (
        isApiError(caughtError) &&
        caughtError.status === 422 &&
        caughtError.code === 'rate_not_available'
      ) {
        setError('Курс на выбранную дату недоступен. Проверьте дату или выберите другую валюту.')
        return
      }
      setError('Не удалось сохранить расход. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  const handleAmountChange = (rawValue: string) => {
    setAmount(sanitizeAmountInput(rawValue))
    setError('')
  }

  const handleAppendAmountOperator = (operator: '+' | '-') => {
    setAmount((prev) => {
      const sanitizedValue = sanitizeAmountInput(prev)
      if (sanitizedValue.length === 0 || sanitizedValue.endsWith('+') || sanitizedValue.endsWith('-')) {
        return sanitizedValue
      }
      return `${sanitizedValue}${operator}`
    })
    setError('')
    focusAmountInput()
  }

  const handleApplyResolvedAmount = () => {
    if (resolvedAmount.resolvedAmount === null) return
    setAmount(resolvedAmount.resolvedAmount.toString())
    setError('')
    focusAmountInput()
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
            <Stack spacing={0.35}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <TextField
                  label="Сумма"
                  value={amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  inputRef={amountInputRef}
                  error={amount.length > 0 && !resolvedAmount.isValid}
                  slotProps={{ htmlInput: { inputMode: 'decimal', pattern: '[0-9.,+-]*' } }}
                  InputProps={{
                    endAdornment: shouldShowResolvedAmountHint ? (
                      <InputAdornment position="end">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleApplyResolvedAmount}
                          onPointerDown={handleAmountHelperPointerDown}
                          disabled={isSaving || isDeleting}
                          aria-label={resolvedAmountHint ?? undefined}
                          sx={(theme) => ({
                            minWidth: 0,
                            px: 1.25,
                            py: 0.375,
                            borderRadius: 999,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                          })}
                        >
                          {resolvedAmountChipText}
                        </Button>
                      </InputAdornment>
                    ) : undefined,
                  }}
                  fullWidth
                />
                <TextField
                  label="Валюта"
                  select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  SelectProps={{
                    renderValue: (value) => {
                      const selected = currencyOptions.find((item) => item.code === value)
                      return selected ? formatCurrencyOptionLabel(selected) : String(value)
                    },
                  }}
                  sx={{ width: { xs: 112, sm: 128 }, flexShrink: 0 }}
                  disabled={isSaving || isDeleting || isCurrenciesLoading}
                  helperText={isCurrenciesLoading ? 'Загрузка...' : undefined}
                >
                  {currencyOptions.map((item) => (
                    <MenuItem key={item.code} value={item.code}>
                      {formatCurrencyOptionLabel(item)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ pl: 0.25, pt: 0.25 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleAppendAmountOperator('+')}
                  onPointerDown={handleAmountHelperPointerDown}
                  disabled={isSaving || isDeleting}
                  sx={(theme) => ({
                    minWidth: 34,
                    width: 34,
                    height: 24,
                    borderRadius: '6px',
                    px: 0,
                    fontSize: '0.85rem',
                    lineHeight: 1,
                    minHeight: 0,
                    boxShadow: 'none',
                    color: 'text.secondary',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    '&:hover': {
                      backgroundColor: theme.palette.action.selected,
                      borderColor: theme.palette.divider,
                      boxShadow: 'none',
                    },
                  })}
                >
                  +
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleAppendAmountOperator('-')}
                  onPointerDown={handleAmountHelperPointerDown}
                  disabled={isSaving || isDeleting}
                  sx={(theme) => ({
                    minWidth: 34,
                    width: 34,
                    height: 24,
                    borderRadius: '6px',
                    px: 0,
                    fontSize: '0.85rem',
                    lineHeight: 1,
                    minHeight: 0,
                    boxShadow: 'none',
                    color: 'text.secondary',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    '&:hover': {
                      backgroundColor: theme.palette.action.selected,
                      borderColor: theme.palette.divider,
                      boxShadow: 'none',
                    },
                  })}
                >
                  -
                </Button>
              </Stack>
              {amount.length > 0 && !resolvedAmount.isValid ? (
                <Typography variant="caption" color="warning.main" sx={{ pl: 0.25 }}>
                  Введите корректную сумму
                </Typography>
              ) : null}
              {shouldShowBasePreviewHint ? (
                <Typography variant="caption" color={rateError ? 'warning.main' : 'text.secondary'} sx={{ pl: 0.25 }}>
                  {rateError
                    ? rateError
                    : isRateLoading
                      ? 'Эквивалент в базовой валюте: пересчитываем...'
                      : `Эквивалент в базовой валюте: ${basePreviewText}`}
                </Typography>
              ) : null}
              {currenciesError ? (
                <Typography variant="caption" color="warning.main" sx={{ pl: 0.25 }}>
                  {currenciesError}
                </Typography>
              ) : null}
            </Stack>
            <Box>
              <Stack spacing={1}>
                {shouldShowTopCategoriesCard ? (
                  <Stack spacing={0.75} sx={{ pt: 0.5 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Популярные категории
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="О популярных категориях"
                        onClick={() => setPopularInfoOpen(true)}
                        sx={{ p: 0.25 }}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                    {isTopCategoriesLoading ? (
                      <Typography variant="body2" color="text.secondary">
                        Подбираем подсказки...
                      </Typography>
                    ) : (
                      <Box sx={{ pb: 0.5 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: '100%' }}>
                          {popularCategorySuggestions.map((category) => {
                            const categoryColor = normalizeCategoryColor(category.color)
                            return (
                              <Chip
                                key={category.id}
                                label={withCategoryEmoji(category)}
                                size="small"
                                variant="filled"
                                clickable
                                onClick={() => handleSelectTopCategory(category.id)}
                                disabled={isSaving || isDeleting}
                                sx={{
                                  flexShrink: 0,
                                  ...(categoryColor
                                    ? {
                                        borderColor: 'transparent',
                                        bgcolor: alpha(categoryColor, 0.12),
                                      }
                                    : {
                                        borderColor: 'transparent',
                                        bgcolor: 'action.hover',
                                      }),
                                }}
                              />
                            )
                          })}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                ) : null}
                {fullScreen ? (
                  <>
                    <TextField
                      fullWidth
                      value=""
                      onClick={isSaving || isDeleting ? undefined : handleOpenCategorySearch}
                      onKeyDown={(event) => {
                        if (isSaving || isDeleting) return
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleOpenCategorySearch()
                        }
                      }}
                      label=""
                      placeholder={selectedCategoryList.length === 0 ? 'Выбрать категории...' : ''}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        readOnly: true,
                        startAdornment:
                          selectedCategoryList.length > 0 ? (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                width: '100%',
                                px: 0.25,
                                py: 0.5,
                              }}
                            >
                              {selectedCategoryList.map((category) => {
                                const categoryColor = normalizeCategoryColor(category.color)
                                return (
                                  <Chip
                                    key={category.id}
                                    label={category.name}
                                    size="small"
                                    variant="outlined"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onTouchStart={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                    onDelete={
                                      isSaving || isDeleting
                                        ? undefined
                                        : () => {
                                            handleCategoryRemove(category.id)
                                          }
                                    }
                                    sx={{
                                      flexShrink: 0,
                                      ...(categoryColor
                                        ? {
                                          borderColor: alpha(categoryColor, 0.55),
                                          bgcolor: alpha(categoryColor, 0.14),
                                        }
                                        : {}),
                                    }}
                                  />
                                )
                              })}
                            </Box>
                          ) : undefined,
                      }}
                      disabled={isSaving || isDeleting}
                      sx={{
                        ...unifiedPlaceholderSx,
                        '& .MuiInputBase-root': {
                          alignItems: 'center',
                          minHeight: 56,
                          py: selectedCategoryList.length > 0 ? 0.75 : 0,
                        },
                        '& .MuiInputBase-input': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: selectedCategoryList.length > 0 ? 0 : 'auto',
                          width: selectedCategoryList.length > 0 ? 0 : 'auto',
                          padding: selectedCategoryList.length > 0 ? 0 : undefined,
                          cursor: isSaving || isDeleting ? 'default' : 'pointer',
                        },
                      }}
                    />
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
                    onOpen={() => onRefreshCategories?.()}
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
                        const { key, ...tagProps } = getTagProps({ index })
                        return (
                          <Chip
                            {...tagProps}
                            key={key}
                            size="small"
                            label={category.name}
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
                        sx={unifiedPlaceholderSx}
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
              label="Ввести свой заголовок..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: «Пицца» или «Такси»"
              sx={unifiedPlaceholderSx}
              fullWidth
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'background.paper', py: 2, px: 3, gap: 1, justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaveDisabled}
            sx={(theme) => ({
              px: 3,
              fontWeight: 700,
              flex: 1,
              borderRadius: `${theme.shape.borderRadius}px`,
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
              sx={(theme) => ({
                minWidth: 50,
                px: 0,
                flexShrink: 0,
                borderRadius: `${theme.shape.borderRadius}px`,
              })}
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
        open={isPopularInfoOpen}
        onClose={() => setPopularInfoOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>О популярных категориях</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Популярные категории сформированы на основе ваших выборов
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPopularInfoOpen(false)}>Понятно</Button>
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
