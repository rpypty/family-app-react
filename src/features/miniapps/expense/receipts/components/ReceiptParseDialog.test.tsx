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

describe('ReceiptParseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listCurrenciesMock.mockResolvedValue([
      { code: 'BYN', name: 'Belarusian Ruble' },
      { code: 'USD', name: 'US Dollar' },
    ])
  })

  it.each([
    ['HEIC MIME type', new File(['receipt'], 'iphone-receipt.heic', { type: 'image/heic' })],
    ['HEIF MIME type', new File(['receipt'], 'iphone-receipt.heif', { type: 'image/heif' })],
    ['HEIC extension without MIME type', new File(['receipt'], 'IMG_0001.HEIC')],
  ])('accepts iPhone photos with %s for receipt parsing', async (_, receipt) => {
    const user = userEvent.setup()
    const onCreate = vi.fn(async () => {})
    render(<ReceiptParseDialog {...baseProps} onCreate={onCreate} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, receipt)
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          receipt,
          allCategories: true,
        }),
      )
    })
  })
})
