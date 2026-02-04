import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
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
import { useTheme } from '@mui/material/styles'
import type { Currency, Expense, Tag } from '../data/types'
import { formatDate } from '../utils/formatters'
import { selectedTags } from '../utils/tagUtils'
import { createId } from '../utils/uuid'
import { TagPickerInput } from './TagPickerInput'
import { TagSearchDialog } from './TagSearchDialog'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'BYN', 'RUB']

type ExpenseFormModalProps = {
  isOpen: boolean
  expense?: Expense | null
  tags: Tag[]
  onClose: () => void
  onSave: (expense: Expense) => void
  onDelete: (expenseId: string) => void
  onCreateTag: (name: string) => Tag
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
  const [isTagDialogOpen, setTagDialogOpen] = useState(false)
  const [isConfirmOpen, setConfirmOpen] = useState(false)
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
    setConfirmOpen(false)
  }, [expense, isOpen])

  const selectedTagList = useMemo(
    () => selectedTags(tags, selectedTagIds),
    [tags, selectedTagIds],
  )

  const handleSave = () => {
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

    onSave(payload)
    onClose()
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
        <DialogTitle>{expense ? 'Редактирование' : 'Новый расход'}</DialogTitle>
        <DialogContent dividers>
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
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Теги
                </Typography>
                <Button size="small" onClick={() => setTagDialogOpen(true)}>
                  Новый тег
                </Button>
              </Stack>
              <TagPickerInput label="Выбрать тег" onClick={() => setTagDialogOpen(true)} />
              {selectedTagList.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Теги не выбраны
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {selectedTagList.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      onDelete={() =>
                        setSelectedTagIds((prev) => {
                          const next = new Set(prev)
                          next.delete(tag.id)
                          return next
                        })
                      }
                    />
                  ))}
                </Box>
              )}
            </Box>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          {expense ? (
            <Button color="error" onClick={() => setConfirmOpen(true)}>
              Удалить
            </Button>
          ) : null}
          <Button variant="contained" onClick={handleSave}>
            Сохранить
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
          <Button onClick={() => setConfirmOpen(false)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (expense) {
                onDelete(expense.id)
              }
              setConfirmOpen(false)
              onClose()
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <TagSearchDialog
        isOpen={isTagDialogOpen}
        tags={tags}
        initialSelected={Array.from(selectedTagIds)}
        onClose={() => setTagDialogOpen(false)}
        onConfirm={(selected) => {
          setSelectedTagIds(new Set(selected))
          setTagDialogOpen(false)
        }}
        onCreateTag={onCreateTag}
      />
    </>
  )
}
