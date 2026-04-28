import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded'
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded'
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import type { Category } from '../../../../../shared/types'
import { DEFAULT_CURRENCY } from '../../../../../shared/types'
import { formatAmount, formatDate } from '../../../../../shared/lib/formatters'
import {
  getFirstCategoryColor,
  getFirstCategoryEmoji,
  normalizeCategoryColor,
  withCategoryEmoji,
} from '../../../../../shared/lib/categoryAppearance'
import { ExpenseIcon } from '../../../../../shared/ui/ExpenseIcon'
import { listCurrencies, type CurrencyItem } from '../../api/currencies'
import type {
  ApproveReceiptParseExpense,
  CreateReceiptParseInput,
  ReceiptDraftExpense,
  ReceiptParse,
  ReceiptParseItem,
  ReceiptParseStatus,
  UpdateReceiptParseItemInput,
} from '../api/receiptParses'

type ReceiptParseDialogProps = {
  open: boolean
  categories: Category[]
  defaultCurrency?: string | null
  parse: ReceiptParse | null
  activeStatus?: ReceiptParseStatus
  isLoading: boolean
  jobError: string | null
  onClose: () => void
  onCreate: (input: CreateReceiptParseInput) => Promise<void>
  onUpdateItems: (items: UpdateReceiptParseItemInput[]) => Promise<unknown>
  onApprove: (expenses: ApproveReceiptParseExpense[]) => Promise<void>
  onCancel: () => Promise<void>
  onRefresh: () => Promise<unknown>
}

type DraftOverride = {
  title: string
  amount: number
  currency: string
  categoryId: string
}

type VisibleDraft = {
  draft: ReceiptDraftExpense
  title: string
  amount: number
  currency: string
  categoryId: string
  sourceItems: ReceiptParseItem[]
}

type DeleteTarget =
  | { type: 'draft'; draftId: string }
  | { type: 'item'; item: ReceiptParseItem }

function ReceiptDialogTitle({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
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
          onClick={onBack}
          aria-label="Назад"
          sx={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)' }}
        >
          <ArrowBackRounded />
        </IconButton>
        <Typography component="span" variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
    </DialogTitle>
  )
}

const parseAmount = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim()
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const itemAmount = (item: ReceiptParseItem) => item.effectiveLineTotal ?? item.lineTotal

const itemTitle = (item: ReceiptParseItem) => item.normalizedName || item.rawName || 'Позиция чека'

const amountsEqual = (left: number, right: number) => Math.abs(left - right) < 0.01

const formatReceiptTotal = (value: number) =>
  value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const draftCategoryKey = (categoryId: string) => `category:${categoryId}`

const resolveDefaultDate = (parse: ReceiptParse | null) =>
  parse?.receipt.requestedDate ?? parse?.receipt.purchasedAt ?? formatDate(new Date())

const FALLBACK_CURRENCIES: CurrencyItem[] = [
  { code: 'BYN', name: 'Belarusian Ruble' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'RUB', name: 'Russian Ruble' },
]

const formatCurrencyOptionLabel = (item: Pick<CurrencyItem, 'code' | 'icon'>): string =>
  item.icon ? `${item.icon} ${item.code}` : item.code

const MAX_RECEIPT_FILES = 5
const MAX_RECEIPT_FILE_SIZE_BYTES = 8 * 1024 * 1024
const MAX_RECEIPT_TOTAL_SIZE_BYTES = 40 * 1024 * 1024
const RECEIPT_FILE_ACCEPT = [
  'image/png',
  'image/jpeg',
  'image/webp',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
].join(',')
const SUPPORTED_RECEIPT_FILE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])
const isSupportedReceiptFile = (file: File) => SUPPORTED_RECEIPT_FILE_TYPES.has(file.type)

const formatFileSize = (sizeBytes: number) => `${(sizeBytes / 1024 / 1024).toFixed(1)} МБ`

const validateReceiptFiles = (files: File[]): string | null => {
  if (files.length > MAX_RECEIPT_FILES) {
    return `Можно загрузить не больше ${MAX_RECEIPT_FILES} файлов.`
  }

  const unsupportedFile = files.find((file) => !isSupportedReceiptFile(file))
  if (unsupportedFile) {
    return `Неподдерживаемый формат файла${unsupportedFile.type ? ` (${unsupportedFile.type})` : ''}. Загрузите JPEG, PNG или WebP.`
  }

  const oversizedFile = files.find((file) => file.size > MAX_RECEIPT_FILE_SIZE_BYTES)
  if (oversizedFile) {
    return `Файл ${oversizedFile.name} слишком большой: ${formatFileSize(oversizedFile.size)}. Максимум 8 МБ на файл.`
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_RECEIPT_TOTAL_SIZE_BYTES) {
    return `Файлы слишком большие суммарно: ${formatFileSize(totalSize)}. Максимум 40 МБ.`
  }

  return null
}

export function ReceiptParseDialog({
  open,
  categories,
  defaultCurrency,
  parse,
  activeStatus,
  isLoading,
  jobError,
  onClose,
  onCreate,
  onUpdateItems,
  onApprove,
  onCancel,
  onRefresh,
}: ReceiptParseDialogProps) {
  const normalizedDefaultCurrency = defaultCurrency?.trim().toUpperCase() || DEFAULT_CURRENCY
  const [receiptFiles, setReceiptFiles] = useState<File[]>([])
  const [allCategories, setAllCategories] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const defaultDate = resolveDefaultDate(parse)
  const [manualDate, setManualDate] = useState<string | null>(null)
  const date = manualDate ?? defaultDate
  const [currency, setCurrency] = useState(parse?.receipt.currency ?? normalizedDefaultCurrency)
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([])
  const [isCurrenciesLoading, setCurrenciesLoading] = useState(false)
  const [currenciesError, setCurrenciesError] = useState<string | null>(null)
  const [expandedDraftIds, setExpandedDraftIds] = useState<string[]>([])
  const [draftOverrides, setDraftOverrides] = useState<Record<string, DraftOverride>>({})
  const [deletedDraftIds, setDeletedDraftIds] = useState<string[]>([])
  const [deletedDraftKeys, setDeletedDraftKeys] = useState<string[]>([])
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [hasManualAmountChanges, setHasManualAmountChanges] = useState(false)
  const [editingDraft, setEditingDraft] = useState<ReceiptDraftExpense | null>(null)
  const [draftTitleValue, setDraftTitleValue] = useState('')
  const [draftAmountValue, setDraftAmountValue] = useState('')
  const [draftCurrencyValue, setDraftCurrencyValue] = useState('')
  const [draftCategoryId, setDraftCategoryId] = useState('')
  const [editingItem, setEditingItem] = useState<ReceiptParseItem | null>(null)
  const [itemAmountValue, setItemAmountValue] = useState('')
  const [itemCategoryId, setItemCategoryId] = useState('')
  const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const currentStatus = parse?.status ?? activeStatus

  useEffect(() => {
    if (!open) return
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
  }, [open])

  const currencyOptions = useMemo(() => {
    const map = new Map<string, CurrencyItem>()
    currencies.forEach((item) => {
      map.set(item.code, item)
    })
    ;[
      normalizedDefaultCurrency,
      currency,
      parse?.receipt.currency ?? '',
      ...(parse?.draftExpenses.map((draft) => draft.currency) ?? []),
      draftCurrencyValue,
    ]
      .filter(Boolean)
      .forEach((code) => {
        if (!map.has(code)) {
          map.set(code, { code, name: code })
        }
      })
    return Array.from(map.values())
  }, [
    currencies,
    currency,
    draftCurrencyValue,
    normalizedDefaultCurrency,
    parse?.draftExpenses,
    parse?.receipt.currency,
  ])

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, ReceiptParseItem[]>()
    parse?.items.forEach((item) => {
      if (!item.finalCategoryId) return
      const items = grouped.get(item.finalCategoryId) ?? []
      items.push(item)
      grouped.set(item.finalCategoryId, items)
    })
    return grouped
  }, [parse?.items])

  const visibleUnresolvedItems = useMemo(
    () => parse?.unresolvedItems.filter((item) => !deletedItemIds.includes(item.id)) ?? [],
    [deletedItemIds, parse?.unresolvedItems],
  )

  const visibleDrafts = useMemo<VisibleDraft[]>(() => {
    if (!parse) return []

    return parse.draftExpenses
      .filter((draft) => !deletedDraftIds.includes(draft.id))
      .filter((draft) => !deletedDraftKeys.includes(draftCategoryKey(draft.categoryId)))
      .map((draft) => {
        const sourceItems = itemsByCategory
          .get(draft.categoryId)
          ?.filter((item) => !deletedItemIds.includes(item.id)) ?? []
        const allSourceItems = itemsByCategory.get(draft.categoryId) ?? []
        const amountFromVisibleItems =
          allSourceItems.length > 0 && sourceItems.length !== allSourceItems.length
            ? sourceItems.reduce((sum, item) => sum + itemAmount(item), 0)
            : draft.amount
        const override = draftOverrides[draft.id] ?? draftOverrides[draftCategoryKey(draft.categoryId)]
        return {
          draft,
          title: override?.title ?? draft.title,
          amount: override?.amount ?? amountFromVisibleItems,
          currency: override?.currency ?? draft.currency,
          categoryId: override?.categoryId ?? draft.categoryId,
          sourceItems,
        }
      })
      .filter((item) => item.amount > 0 && (itemsByCategory.get(item.draft.categoryId)?.length ? item.sourceItems.length > 0 : true))
  }, [deletedDraftIds, deletedDraftKeys, deletedItemIds, draftOverrides, itemsByCategory, parse])

  const title = !currentStatus
    ? 'Распознать чек'
    : currentStatus === 'ready'
      ? 'Проверка трат'
      : currentStatus === 'failed'
        ? 'Чек не распознан'
        : 'Распознавание чека'

  const canSubmitUpload =
    receiptFiles.length > 0 && (allCategories || selectedCategories.length > 0) && !isLoading

  const approvePayload = useMemo<ApproveReceiptParseExpense[]>(() => {
    return visibleDrafts.map((item) => ({
      draftId: item.draft.id,
      title: item.title.trim() || categoryMap.get(item.categoryId)?.name || 'Трата из чека',
      amount: item.amount,
      currency: item.currency,
      categoryIds: [item.categoryId],
      date,
    }))
  }, [categoryMap, date, visibleDrafts])

  const hasUnresolvedItems = visibleUnresolvedItems.length > 0
  const canApprove =
    visibleDrafts.length > 0 && !hasUnresolvedItems && !isLoading

  const toggleDraft = (draftId: string) => {
    setExpandedDraftIds((prev) =>
      prev.includes(draftId) ? prev.filter((id) => id !== draftId) : [...prev, draftId],
    )
  }

  const openItemEditor = (item: ReceiptParseItem) => {
    setEditingItem(item)
    setItemAmountValue(String(itemAmount(item)))
    setItemCategoryId(item.finalCategoryId ?? item.llmCategoryId ?? '')
    setFormError(null)
  }

  const openDraftEditor = (draft: ReceiptDraftExpense) => {
    const visibleDraft = visibleDrafts.find((item) => item.draft.id === draft.id)
    setEditingDraft(draft)
    setDraftTitleValue(visibleDraft?.title ?? draft.title)
    setDraftAmountValue(String(visibleDraft?.amount ?? draft.amount))
    setDraftCurrencyValue(visibleDraft?.currency ?? draft.currency)
    setDraftCategoryId(visibleDraft?.categoryId ?? draft.categoryId)
    setFormError(null)
  }

  const handleUpload = async () => {
    if (receiptFiles.length === 0) return
    const filesError = validateReceiptFiles(receiptFiles)
    if (filesError) {
      setFormError(filesError)
      return
    }
    if (!allCategories && selectedCategories.length === 0) {
      setFormError('Выберите хотя бы одну категорию.')
      return
    }
    setFormError(null)
    await onCreate({
      receipts: receiptFiles,
      allCategories,
      categoryIds: selectedCategories.map((category) => category.id),
      date,
      currency,
    })
  }

  const openFileInput = (input: HTMLInputElement | null) => {
    if (!input) return
    input.value = ''
    input.click()
  }

  const handleReceiptFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    const nextFiles = [...receiptFiles, ...selectedFiles]
    const filesError = validateReceiptFiles(nextFiles)
    if (filesError) {
      setFormError(filesError)
      return
    }
    setReceiptFiles(nextFiles)
    setFormError(null)
  }

  const handleRemoveReceiptFile = (index: number) => {
    const nextFiles = receiptFiles.filter((_, currentIndex) => currentIndex !== index)
    setReceiptFiles(nextFiles)
    setFormError(validateReceiptFiles(nextFiles))
  }

  const handleSaveItem = async () => {
    if (!editingItem) return
    const amount = parseAmount(itemAmountValue)
    if (amount === null) {
      setFormError('Укажите корректную сумму позиции.')
      return
    }
    if (!itemCategoryId) {
      setFormError('Выберите категорию позиции.')
      return
    }
    setFormError(null)
    const updated = await onUpdateItems([{ id: editingItem.id, amount, categoryId: itemCategoryId }])
    if (updated) {
      setHasManualAmountChanges(true)
      setEditingItem(null)
    }
  }

  const handleSaveDraft = () => {
    if (!editingDraft) return
    const amount = parseAmount(draftAmountValue)
    if (amount === null) {
      setFormError('Укажите корректную сумму траты.')
      return
    }
    if (!draftCategoryId) {
      setFormError('Выберите категорию траты.')
      return
    }
    const titleValue = draftTitleValue.trim()
    if (titleValue === '') {
      setFormError('Укажите название траты.')
      return
    }
    setDraftOverrides((prev) => ({
      ...prev,
      [editingDraft.id]: {
        title: titleValue,
        amount,
        currency: draftCurrencyValue,
        categoryId: draftCategoryId,
      },
      [draftCategoryKey(editingDraft.categoryId)]: {
        title: titleValue,
        amount,
        currency: draftCurrencyValue,
        categoryId: draftCategoryId,
      },
    }))
    setHasManualAmountChanges(true)
    setFormError(null)
    setEditingDraft(null)
  }

  const handleDeleteDraft = (draftId: string) => {
    const draft = parse?.draftExpenses.find((item) => item.id === draftId)
    setDeletedDraftIds((prev) => (prev.includes(draftId) ? prev : [...prev, draftId]))
    setHasManualAmountChanges(true)
    if (draft) {
      const key = draftCategoryKey(draft.categoryId)
      setDeletedDraftKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
    }
    setExpandedDraftIds((prev) => prev.filter((id) => id !== draftId))
    if (editingDraft?.id === draftId) {
      setEditingDraft(null)
    }
  }

  const handleDeleteItem = async (item: ReceiptParseItem) => {
    if (!item.finalCategoryId) {
      const fallbackCategoryId = categories[0]?.id
      if (!fallbackCategoryId) {
        setFormError('Нужна хотя бы одна категория, чтобы удалить неопределенную позицию.')
        return
      }
      await onUpdateItems([{ id: item.id, amount: 0.01, categoryId: fallbackCategoryId }])
    }
    setHasManualAmountChanges(true)
    setDeletedItemIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
    if (editingItem?.id === item.id) {
      setEditingItem(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'draft') {
      handleDeleteDraft(deleteTarget.draftId)
      setDeleteTarget(null)
      return
    }
    await handleDeleteItem(deleteTarget.item)
    setDeleteTarget(null)
  }

  const handleApprove = async () => {
    if (hasUnresolvedItems) {
      setFormError('Сначала распределите все неопределенные позиции.')
      return
    }
    if (!canApprove) {
      setFormError('В черновике нет трат для создания.')
      return
    }
    setFormError(null)
    await onApprove(approvePayload)
  }

  const renderUpload = () => (
    <Stack spacing={2}>
      <input
        ref={galleryInputRef}
        type="file"
        accept={RECEIPT_FILE_ACCEPT}
        multiple
        hidden
        onChange={handleReceiptFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={RECEIPT_FILE_ACCEPT}
        capture="environment"
        multiple
        hidden
        onChange={handleReceiptFileChange}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="outlined"
          startIcon={<PhotoLibraryRoundedIcon />}
          onClick={() => openFileInput(galleryInputRef.current)}
          fullWidth
        >
          Из галереи
        </Button>
        <Button
          variant="outlined"
          startIcon={<PhotoCameraRoundedIcon />}
          onClick={() => openFileInput(cameraInputRef.current)}
          fullWidth
        >
          Сфоткать часть чека
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Загрузите один чек или несколько фото частей одного чека. До 5 изображений JPEG, PNG или WebP.
      </Typography>
      {receiptFiles.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">
            Выбранные файлы: {receiptFiles.length} · {formatFileSize(receiptFiles.reduce((sum, file) => sum + file.size, 0))}
          </Typography>
          {receiptFiles.map((file, index) => (
            <Paper
              key={`${file.name}-${file.lastModified}-${index}`}
              variant="outlined"
              sx={{
                borderRadius: 1,
                p: 1,
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <UploadFileRoundedIcon color="action" fontSize="small" />
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>
                  {index + 1}. {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(file.size)}
                  {file.type ? ` · ${file.type}` : ''}
                </Typography>
              </Box>
              <IconButton
                aria-label={`Удалить файл ${file.name}`}
                color="error"
                size="small"
                onClick={() => handleRemoveReceiptFile(index)}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Stack>
      ) : null}
      <FormControlLabel
        control={
          <Checkbox
            checked={allCategories}
            onChange={(event) => setAllCategories(event.target.checked)}
          />
        }
        label="Использовать все категории"
      />
      {!allCategories ? (
        <Autocomplete<Category, true, false, false>
          multiple
          disableCloseOnSelect
          options={categories}
          value={selectedCategories}
          onChange={(_, value) => setSelectedCategories(value)}
          getOptionLabel={(category) => withCategoryEmoji(category)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} label="Категории" placeholder="Выберите категории" />
          )}
        />
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Дата"
          type="date"
          value={date}
          onChange={(event) => {
            setManualDate(event.target.value)
          }}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Валюта"
          select
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          fullWidth
          SelectProps={{
            renderValue: (value) => {
              const selected = currencyOptions.find((item) => item.code === value)
              return selected ? formatCurrencyOptionLabel(selected) : String(value)
            },
          }}
          disabled={isCurrenciesLoading}
          helperText={currenciesError ?? (isCurrenciesLoading ? 'Загрузка...' : undefined)}
        >
          {currencyOptions.map((item) => (
            <MenuItem key={item.code} value={item.code}>
              {formatCurrencyOptionLabel(item)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Stack>
  )

  const renderProcessing = () => (
    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
      <CircularProgress size={32} />
      <Typography fontWeight={700}>
        {currentStatus === 'queued' ? 'Чек в очереди' : 'Чек распознается'}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Можно закрыть окно и вернуться к результату по иконке рядом с добавлением траты.
      </Typography>
    </Stack>
  )

  const renderFailed = () => (
    <Stack spacing={2}>
      <Alert severity="error">
        {parse?.error?.message || 'Не удалось распознать чек. Попробуйте другое фото.'}
      </Alert>
      <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
        Сбросить результат
      </Button>
    </Stack>
  )

  const renderCategoryChip = (categoryId: string | null) => {
    const category = categoryId ? categoryMap.get(categoryId) : null
    if (!category) return <Chip size="small" label="Категория не выбрана" color="warning" />
    const categoryColor = normalizeCategoryColor(category.color)
    return (
      <Chip
        size="small"
        label={category.name}
        sx={{
          alignSelf: 'flex-start',
          borderColor: categoryColor ?? 'divider',
          bgcolor: categoryColor ? alpha(categoryColor, 0.12) : 'transparent',
          color: categoryColor ?? 'text.secondary',
        }}
        variant="outlined"
      />
    )
  }

  const renderItemRow = (item: ReceiptParseItem, options?: { unresolved?: boolean }) => (
    <Paper
      key={item.id}
      variant="outlined"
      role="button"
      tabIndex={0}
      onClick={() => openItemEditor(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openItemEditor(item)
        }
      }}
      sx={{
        p: 1.2,
        borderRadius: 1,
        cursor: 'pointer',
        borderColor: options?.unresolved ? 'warning.main' : 'divider',
        bgcolor: options?.unresolved
          ? alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)
          : 'background.paper',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 1,
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography fontWeight={600} sx={{ minWidth: 0 }} noWrap>
            {itemTitle(item)}
          </Typography>
          {item.editedByUser ? <Chip size="small" label="Исправлено" /> : null}
          {item.llmCategoryConfidence !== null ? (
            <Chip size="small" label={`AI ${Math.round(item.llmCategoryConfidence * 100)}%`} />
          ) : null}
          {!item.finalCategoryId ? (
            <Typography variant="caption" color="warning.main">
              Требуется категория
            </Typography>
          ) : null}
          {item.quantity !== null ? (
            <Typography variant="caption" color="text.secondary">
              Кол-во: {item.quantity}
            </Typography>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
            {formatAmount(itemAmount(item))}
          </Typography>
          <IconButton
            aria-label="Удалить позицию"
            color="error"
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              setDeleteTarget({ type: 'item', item })
            }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  )

  const renderDraft = (draft: ReceiptDraftExpense) => {
    const visibleDraft = visibleDrafts.find((item) => item.draft.id === draft.id)
    if (!visibleDraft) return null
    const category = categoryMap.get(visibleDraft.categoryId)
    const expenseCategories = category ? [category] : []
    const iconEmoji = getFirstCategoryEmoji(expenseCategories)
    const iconColor = getFirstCategoryColor(expenseCategories)
    const sourceItems = visibleDraft.sourceItems
    const isExpanded = expandedDraftIds.includes(draft.id)

    return (
      <Paper
        key={draft.id}
        variant="outlined"
        sx={{
          borderRadius: 1,
          overflow: 'hidden',
          borderLeft: iconColor ? `3px solid ${alpha(iconColor, 0.85)}` : undefined,
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          onClick={() => toggleDraft(draft.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleDraft(draft.id)
            }
          }}
          sx={{
            p: 1.5,
            display: 'grid',
            gridTemplateColumns: '40px minmax(0, 1fr) auto',
            alignItems: 'center',
            columnGap: 1.1,
            cursor: 'pointer',
          }}
        >
          <Stack justifyContent="center" alignItems="center" sx={{ width: 40 }}>
            <ExpenseIcon
              size={45}
              emoji={iconEmoji}
              color={iconColor}
              showBorder={false}
              showBackground={false}
            />
          </Stack>
          <Stack spacing={0.25} sx={{ minWidth: 0, justifyContent: 'center' }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography
                fontWeight={400}
                variant="body1"
                color={theme.palette.mode === 'dark' ? 'common.white' : 'text.primary'}
                noWrap
                sx={{ minWidth: 0, textOverflow: 'ellipsis' }}
              >
                {visibleDraft.title.trim() || category?.name || 'Трата из чека'}
              </Typography>
              <IconButton
                aria-label="Редактировать трату"
                size="small"
                onClick={(event) => {
                  event.stopPropagation()
                  openDraftEditor(draft)
                }}
                sx={{
                  color: 'text.disabled',
                  opacity: 0.65,
                  '&:hover': {
                    color: 'text.secondary',
                    opacity: 1,
                  },
                }}
              >
                <EditRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {renderCategoryChip(visibleDraft.categoryId)}
              <Typography variant="caption" color="text.secondary">
                {sourceItems.length} поз.
              </Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Stack alignItems="flex-end" sx={{ whiteSpace: 'nowrap' }}>
              <Typography
                fontWeight={400}
                variant="body1"
                color={theme.palette.mode === 'dark' ? 'common.white' : 'text.primary'}
              >
                {formatAmount(visibleDraft.amount)} {visibleDraft.currency}
              </Typography>
              {draft.confidence !== null ? (
                <Typography variant="caption" color="text.secondary">
                  {Math.round(draft.confidence * 100)}%
                </Typography>
              ) : null}
            </Stack>
            {isExpanded ? <KeyboardArrowDownRoundedIcon /> : <KeyboardArrowRightRoundedIcon />}
          </Stack>
        </Box>
        <Collapse in={isExpanded} unmountOnExit>
          <Stack spacing={1} sx={{ px: 1.5, pb: 1.5 }}>
            {sourceItems.length ? (
              sourceItems.map((item) => renderItemRow(item))
            ) : (
              <Alert severity="info">Позиции для этой категории не найдены.</Alert>
            )}
          </Stack>
        </Collapse>
      </Paper>
    )
  }

  const renderReady = () => {
    const draftTotal = visibleDrafts.reduce((sum, draft) => sum + draft.amount, 0)
    const detectedTotal = parse?.receipt.detectedTotal
    const itemsTotal = parse?.receipt.itemsTotal
    const hasTotalsMismatch =
      typeof detectedTotal === 'number' &&
      typeof itemsTotal === 'number' &&
      !amountsEqual(detectedTotal, itemsTotal) &&
      !hasManualAmountChanges

    return (
      <Stack spacing={2}>
        {hasTotalsMismatch ? (
          <Alert severity="warning">
            Итого по чеку: {formatReceiptTotal(detectedTotal)}; по позициям:{' '}
            {formatReceiptTotal(itemsTotal)}
          </Alert>
        ) : null}
        {parse?.warnings.length ? (
          <Alert severity="warning">{parse.warnings.join(' ')}</Alert>
        ) : null}
        {hasUnresolvedItems ? (
          <Alert severity="warning">
            Распределите неопределенные позиции, чтобы создать траты.
          </Alert>
        ) : null}
        <TextField
          label="Дата трат"
          type="date"
          value={date}
          onChange={(event) => {
            setManualDate(event.target.value)
          }}
          fullWidth
          InputLabelProps={{ shrink: true }}
          helperText={
            parse?.receipt.requestedDate
              ? 'Дата выбрана при отправке чека'
              : parse?.receipt.purchasedAt
                ? 'Дата распознана из чека'
                : 'Дата не найдена в чеке'
          }
        />
        {visibleDrafts.length === 0 ? (
          <Alert severity="warning">В черновике не осталось трат.</Alert>
        ) : null}
        {visibleUnresolvedItems.length ? (
          <Stack spacing={1}>
            <Typography fontWeight={700}>Неопределенные</Typography>
            {visibleUnresolvedItems.map((item) => renderItemRow(item, { unresolved: true }))}
          </Stack>
        ) : null}
        <Stack spacing={1.5}>
          {parse?.draftExpenses.map(renderDraft)}
        </Stack>
        {visibleDrafts.length ? (
          <Typography variant="body2" color="text.secondary">
            К созданию: {formatAmount(draftTotal)} {visibleDrafts[0]?.currency ?? currency}
          </Typography>
        ) : null}
      </Stack>
    )
  }

  const renderContent = () => {
    if (!parse) {
      if (currentStatus === 'failed') return renderFailed()
      return currentStatus ? renderProcessing() : renderUpload()
    }
    if (parse.status === 'failed') return renderFailed()
    if (parse.status === 'ready') return renderReady()
    return renderProcessing()
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <ReceiptDialogTitle title={title} onBack={onClose} />
        <DialogContent dividers sx={{ bgcolor: 'background.paper' }}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {jobError ? <Alert severity="error">{jobError}</Alert> : null}
            {formError ? <Alert severity="warning">{formError}</Alert> : null}
            <Box>{renderContent()}</Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
          {!parse && !currentStatus ? (
            <Button variant="contained" onClick={handleUpload} disabled={!canSubmitUpload}>
              Отправить
            </Button>
          ) : null}
          {currentStatus === 'queued' || currentStatus === 'processing' ? (
            <>
              <Button onClick={onRefresh} disabled={isLoading}>
                Обновить
              </Button>
              <Button color="error" onClick={onCancel} disabled={isLoading}>
                Отменить
              </Button>
            </>
          ) : null}
          {parse?.status === 'ready' ? (
            <>
              <Button color="error" onClick={() => setCancelConfirmOpen(true)} disabled={isLoading}>
                Отменить
              </Button>
              <Button variant="contained" onClick={handleApprove} disabled={!canApprove}>
                Создать траты
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingDraft)}
        onClose={() => setEditingDraft(null)}
        fullWidth
        maxWidth="xs"
      >
        <ReceiptDialogTitle title="Редактировать трату" onBack={() => setEditingDraft(null)} />
        <DialogContent dividers sx={{ bgcolor: 'background.paper' }}>
          {editingDraft ? (
            <Stack
              spacing={1.25}
              sx={(theme) => ({
                mt: 0.5,
                p: 1,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.04)
                  : alpha(theme.palette.common.black, 0.025),
              })}
            >
              {formError ? <Alert severity="warning">{formError}</Alert> : null}
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Сумма"
                  value={draftAmountValue}
                  error={draftAmountValue.trim() !== '' && parseAmount(draftAmountValue) === null}
                  onChange={(event) => setDraftAmountValue(event.target.value)}
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                />
                <TextField
                  label="Валюта"
                  value={draftCurrencyValue}
                  onChange={(event) => setDraftCurrencyValue(event.target.value)}
                  select
                  sx={{ width: 118, flexShrink: 0 }}
                  SelectProps={{
                    renderValue: (value) => {
                      const selected = currencyOptions.find((item) => item.code === value)
                      return selected ? formatCurrencyOptionLabel(selected) : String(value)
                    },
                  }}
                  disabled={isCurrenciesLoading}
                >
                  {currencyOptions.map((item) => (
                    <MenuItem key={item.code} value={item.code}>
                      {formatCurrencyOptionLabel(item)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField
                label="Категория"
                value={draftCategoryId}
                onChange={(event) => setDraftCategoryId(event.target.value)}
                select
                fullWidth
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {withCategoryEmoji(category)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Название"
                value={draftTitleValue}
                onChange={(event) => setDraftTitleValue(event.target.value)}
                fullWidth
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={() => editingDraft && setDeleteTarget({ type: 'draft', draftId: editingDraft.id })}
          >
            Удалить
          </Button>
          <Button onClick={() => setEditingDraft(null)}>Закрыть</Button>
          <Button variant="contained" onClick={handleSaveDraft}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        fullWidth
        maxWidth="xs"
      >
        <ReceiptDialogTitle title="Позиция чека" onBack={() => setEditingItem(null)} />
        <DialogContent dividers sx={{ bgcolor: 'background.paper' }}>
          {editingItem ? (
            <Stack
              spacing={1.25}
              sx={(theme) => ({
                mt: 0.5,
                p: 1,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.04)
                  : alpha(theme.palette.common.black, 0.025),
              })}
            >
              {formError ? <Alert severity="warning">{formError}</Alert> : null}
              <Typography fontWeight={700}>{itemTitle(editingItem)}</Typography>
              <TextField
                label="Сумма"
                value={itemAmountValue}
                error={itemAmountValue.trim() !== '' && parseAmount(itemAmountValue) === null}
                onChange={(event) => setItemAmountValue(event.target.value)}
                fullWidth
                inputProps={{ inputMode: 'decimal' }}
                sx={{
                  '& .MuiInputBase-root': {
                    minHeight: 44,
                    borderRadius: 1,
                  },
                }}
              />
              <TextField
                label="Категория"
                value={itemCategoryId}
                onChange={(event) => setItemCategoryId(event.target.value)}
                select
                fullWidth
                sx={{
                  '& .MuiInputBase-root': {
                    minHeight: 44,
                    borderRadius: 1,
                  },
                }}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {withCategoryEmoji(category)}
                  </MenuItem>
                ))}
              </TextField>
              {editingItem.llmCategoryConfidence !== null ? (
                <Typography variant="caption" color="text.secondary">
                  Уверенность AI: {Math.round(editingItem.llmCategoryConfidence * 100)}%
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)}>Закрыть</Button>
          <Button variant="contained" onClick={handleSaveItem} disabled={isLoading}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {deleteTarget?.type === 'draft' ? 'Удалить трату?' : 'Удалить позицию?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteTarget?.type === 'draft'
              ? 'Эта трата не будет создана после подтверждения списка.'
              : 'Эта позиция не будет участвовать в итоговой сумме подготовленной траты.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Назад</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDelete()}
            disabled={isLoading}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isCancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Отменить список трат?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Подготовленный список трат и все правки пропадут. Восстановить их после отмены не получится.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelConfirmOpen(false)}>Назад</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              setCancelConfirmOpen(false)
              await onCancel()
            }}
            disabled={isLoading}
          >
            Отменить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
