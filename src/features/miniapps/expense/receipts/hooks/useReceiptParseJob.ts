import { useCallback, useEffect, useState } from 'react'
import { isApiError } from '../../../../../shared/api/client'
import {
  cancelReceiptParse,
  createReceiptParse,
  getActiveReceiptParse,
  getReceiptParse,
  approveReceiptParse,
  type ApproveReceiptParseExpense,
  type CreateReceiptParseInput,
  type ReceiptParse,
  type ReceiptParseStatus,
  type ReceiptParseSummary,
  type UpdateReceiptParseItemInput,
  updateReceiptParseItems,
} from '../api/receiptParses'

const POLL_INTERVAL_MS = 2000

const shouldPoll = (status: ReceiptParseStatus | undefined) =>
  status === 'queued' || status === 'processing'

const resolveCreateErrorMessage = (error: unknown): string => {
  if (!isApiError(error)) {
    return 'Не удалось подключиться к API. Проверьте, что телефон открыт на адресе dev-сервера, а Vite проксирует /api на запущенный backend.'
  }

  if (error.code === 'invalid_receipt_file') {
    return 'Файл не похож на поддерживаемое фото. Загрузите JPEG, PNG или WebP.'
  }
  if (error.code === 'receipt_file_too_large') {
    return 'Фото слишком большое. Сожмите его или выберите файл меньше 8 МБ.'
  }
  if (error.status === 413) {
    return 'Фото слишком большое для загрузки. Сожмите его или выберите файл меньше 8 МБ.'
  }
  if (error.code === 'active_receipt_parse_exists') {
    return 'Уже есть активное распознавание чека. Завершите или отмените его.'
  }
  if (error.code === 'category_selection_required') {
    return 'Выберите хотя бы одну категорию или включите все категории.'
  }

  return error.message || 'Не удалось отправить чек на распознавание.'
}

export function useReceiptParseJob() {
  const [summary, setSummary] = useState<ReceiptParseSummary | null>(null)
  const [parse, setParse] = useState<ReceiptParse | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshActive = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const active = await getActiveReceiptParse()
      setSummary(active)
      if (!active) {
        setParse(null)
        return null
      }
      const details = await getReceiptParse(active.id)
      setParse(details)
      setSummary(details)
      return details
    } catch {
      setError('Не удалось загрузить статус чека.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCurrent = useCallback(async () => {
    const parseId = parse?.id ?? summary?.id
    if (!parseId) {
      return refreshActive()
    }
    try {
      const details = await getReceiptParse(parseId)
      setParse(details)
      setSummary(details)
      setError(null)
      return details
    } catch {
      setError('Не удалось обновить статус чека.')
      return null
    }
  }, [parse?.id, refreshActive, summary?.id])

  const create = async (input: CreateReceiptParseInput) => {
    setLoading(true)
    setError(null)
    try {
      const created = await createReceiptParse(input)
      setSummary(created)
      const details = await getReceiptParse(created.id)
      setParse(details)
      setSummary(details)
      return details
    } catch (error) {
      setError(resolveCreateErrorMessage(error))
      return null
    } finally {
      setLoading(false)
    }
  }

  const approve = async (expenses: ApproveReceiptParseExpense[]) => {
    const parseId = parse?.id ?? summary?.id
    if (!parseId) return []
    setLoading(true)
    setError(null)
    try {
      const created = await approveReceiptParse(parseId, expenses)
      setSummary(null)
      setParse(null)
      return created
    } catch {
      setError('Не удалось создать траты из чека.')
      return []
    } finally {
      setLoading(false)
    }
  }

  const updateItems = async (items: UpdateReceiptParseItemInput[]) => {
    const parseId = parse?.id ?? summary?.id
    if (!parseId) return null
    setLoading(true)
    setError(null)
    try {
      const updated = await updateReceiptParseItems(parseId, items)
      setParse(updated)
      setSummary(updated)
      return updated
    } catch {
      setError('Не удалось сохранить правки позиции.')
      return null
    } finally {
      setLoading(false)
    }
  }

  const cancel = async () => {
    const parseId = parse?.id ?? summary?.id
    if (!parseId) return
    setLoading(true)
    setError(null)
    try {
      await cancelReceiptParse(parseId)
      setSummary(null)
      setParse(null)
    } catch {
      setError('Не удалось отменить распознавание чека.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshActive()
  }, [refreshActive])

  useEffect(() => {
    const status = parse?.status ?? summary?.status
    if (!shouldPoll(status)) return undefined
    const intervalId = window.setInterval(() => {
      void refreshCurrent()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [parse?.status, refreshCurrent, summary?.status])

  return {
    summary,
    parse,
    isLoading,
    error,
    hasActiveJob: Boolean(summary),
    refreshActive,
    refreshCurrent,
    create,
    updateItems,
    approve,
    cancel,
  }
}
