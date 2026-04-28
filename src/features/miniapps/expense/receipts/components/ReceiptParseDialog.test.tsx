import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReceiptParseDialog } from './ReceiptParseDialog'

const { listCurrenciesMock } = vi.hoisted(() => ({
  listCurrenciesMock: vi.fn(),
}))

vi.mock('../../api/currencies', () => ({
  listCurrencies: listCurrenciesMock,
}))

const baseProps = {
  open: true,
  categories: [],
  defaultCurrency: 'BYN',
  parse: null,
  activeStatus: undefined,
  isLoading: false,
  jobError: null,
  onClose: vi.fn(),
  onCreate: vi.fn(async () => {}),
  onUpdateItems: vi.fn(async () => null),
  onApprove: vi.fn(async () => {}),
  onCancel: vi.fn(async () => {}),
  onRefresh: vi.fn(async () => null),
}

const createSizedFile = (size: number, name = 'receipt.jpg', type = 'image/jpeg') =>
  new File([new Uint8Array(size)], name, { type })

describe('ReceiptParseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listCurrenciesMock.mockResolvedValue([
      { code: 'BYN', name: 'Belarusian Ruble' },
      { code: 'USD', name: 'US Dollar' },
    ])
  })

  it('submits one receipt image', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => {})
    const receipt = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })
    render(<ReceiptParseDialog {...baseProps} onCreate={onCreate} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, receipt)
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          receipts: [receipt],
          allCategories: true,
        }),
      )
    })
  })

  it('submits multiple receipt images in the displayed order', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => {})
    const firstReceipt = new File(['first'], 'first.jpg', { type: 'image/jpeg' })
    const secondReceipt = new File(['second'], 'second.png', { type: 'image/png' })
    render(<ReceiptParseDialog {...baseProps} onCreate={onCreate} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, [firstReceipt, secondReceipt])
    expect(screen.getByText('1. first.jpg')).toBeTruthy()
    expect(screen.getByText('2. second.png')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          receipts: [firstReceipt, secondReceipt],
          allCategories: true,
        }),
      )
    })
  })

  it('removes a selected receipt image before submit', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => {})
    const firstReceipt = new File(['first'], 'first.jpg', { type: 'image/jpeg' })
    const secondReceipt = new File(['second'], 'second.png', { type: 'image/png' })
    render(<ReceiptParseDialog {...baseProps} onCreate={onCreate} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, [firstReceipt, secondReceipt])
    await user.click(screen.getByRole('button', { name: 'Удалить файл first.jpg' }))
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          receipts: [secondReceipt],
        }),
      )
    })
  })

  it('shows an error when more than five images are selected', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => {})
    const files = Array.from({ length: 6 }, (_, index) =>
      new File(['receipt'], `receipt-${index}.jpg`, { type: 'image/jpeg' }),
    )
    render(<ReceiptParseDialog {...baseProps} onCreate={onCreate} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, files)

    expect(screen.getByText('Можно загрузить не больше 5 файлов.')).toBeTruthy()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('shows an error for unsupported MIME types', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const onCreate = vi.fn(async () => {})
    const receipt = new File(['receipt'], 'receipt.gif', { type: 'image/gif' })
    render(<ReceiptParseDialog {...baseProps} onCreate={onCreate} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, receipt)

    expect(screen.getByText('Неподдерживаемый формат файла (image/gif). Загрузите JPEG, PNG или WebP.')).toBeTruthy()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('shows an error when an image exceeds the per-file size limit', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => {})
    const receipt = createSizedFile(8 * 1024 * 1024 + 1)
    render(<ReceiptParseDialog {...baseProps} onCreate={onCreate} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, receipt)

    expect(screen.getByText('Файл receipt.jpg слишком большой: 8.0 МБ. Максимум 8 МБ на файл.')).toBeTruthy()
    expect(onCreate).not.toHaveBeenCalled()
  })
})
