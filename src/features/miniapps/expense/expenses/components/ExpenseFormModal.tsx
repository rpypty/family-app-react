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
import { alpha, useTheme } from '@mui/material/styles'
import type { Currency, Expense, Tag } from '../../../../../shared/types'
import { formatDate } from '../../../../../shared/lib/formatters'
import { selectedTags } from '../../../../../shared/lib/tagUtils'
import { createId } from '../../../../../shared/lib/uuid'
import { TagPickerInput } from '../../../../../shared/ui/TagPickerInput'
import { TagSearchDialog } from '../../../../../shared/ui/TagSearchDialog'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'BYN', 'RUB']

type ExpenseFormModalProps = {
  isOpen: boolean
  expense?: Expense | null
  tags: Tag[]
  onClose: () => void
  onSave: (expense: Expense) => Promise<void>
  onDelete: (expenseId: string) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
  onUpdateTag: (tagId: string, name: string) => Promise<Tag>
  onDeleteTag: (tagId: string) => Promise<void>
}

export function ExpenseFormModal({
  isOpen,
  expense,
  tags,
  onClose,
  onSave,
  onDelete,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: ExpenseFormModalProps) {
  const [date, setDate] = useState(formatDate(new Date()))
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('BYN')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [isTagDialogOpen, setTagDialogOpen] = useState(false)
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
    setConfirmOpen(false)
    setSaving(false)
    setDeleting(false)
  }, [expense, isOpen])

  const selectedTagList = useMemo(
    () => selectedTags(tags, selectedTagIds),
    [tags, selectedTagIds],
  )

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
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
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
        onUpdateTag={onUpdateTag}
        onDeleteTag={onDeleteTag}
      />
    </>
  )
}
