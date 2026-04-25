import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ExpenseFormModal } from './ExpenseFormModal'
import type { Category } from '../../../../../shared/types'

const {
  listCurrenciesMock,
  getExchangeRateMock,
  getTopCategoriesMock,
} = vi.hoisted(() => ({
  listCurrenciesMock: vi.fn(),
  getExchangeRateMock: vi.fn(),
  getTopCategoriesMock: vi.fn(),
}))

vi.mock('../../api/currencies', () => ({
  listCurrencies: listCurrenciesMock,
}))

vi.mock('../../api/exchangeRates', () => ({
  getExchangeRate: getExchangeRateMock,
}))

vi.mock('../api/topCategories', () => ({
  getTopCategories: getTopCategoriesMock,
}))

const baseProps = {
  isOpen: true,
  expense: null,
  defaultCurrency: 'BYN',
  isCategoryCreateOpen: false,
  isDeleteConfirmOpen: false,
  categories: [] as Category[],
  onClose: vi.fn(),
  onOpenCategoryCreate: vi.fn(),
  onCloseCategoryCreate: vi.fn(),
  onOpenDeleteConfirm: vi.fn(),
  onCloseDeleteConfirm: vi.fn(),
  onSave: vi.fn(async () => {}),
  onDelete: vi.fn(async () => {}),
  onCreateCategory: vi.fn(async () => ({ id: 'c1', name: 'Еда' })),
  onRefreshCategories: vi.fn(),
}

describe('ExpenseFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listCurrenciesMock.mockResolvedValue([
      { code: 'BYN', name: 'Belarusian Ruble' },
      { code: 'USD', name: 'US Dollar' },
    ])
    getTopCategoriesMock.mockResolvedValue({ status: 'NO_DATA', items: [] })
    getExchangeRateMock.mockResolvedValue({
      from: 'USD',
      to: 'BYN',
      date: '2026-03-05',
      rate: 3.2,
      source: 'nb',
    })
  })

  it('shows rate preview and submits expense payload without manual rate fields', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => {})

    render(<ExpenseFormModal {...baseProps} onSave={onSave} />)

    await user.type(screen.getByLabelText('Сумма'), '10')
    await user.click(screen.getByRole('combobox', { name: 'Валюта' }))
    await user.click(await screen.findByRole('option', { name: 'USD' }))

    await waitFor(() => {
      expect(getExchangeRateMock).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        date: expect.any(String),
        amount: 10,
        currency: 'USD',
        title: '',
        categoryIds: [],
      }),
    )
  })

  it('shows user-friendly error for rate_not_available on submit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => {
      const error = new Error('rate not available') as Error & { status: number; code: string }
      error.status = 422
      error.code = 'rate_not_available'
      throw error
    })

    render(<ExpenseFormModal {...baseProps} onSave={onSave} />)

    await user.type(screen.getByLabelText('Сумма'), '25')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(
      await screen.findByText('Курс на выбранную дату недоступен. Проверьте дату или выберите другую валюту.'),
    ).toBeTruthy()
  })

  it('keeps backend currency order and shows currency icon in menu', async () => {
    const user = userEvent.setup()
    listCurrenciesMock.mockResolvedValue([
      { code: 'USD', name: 'US Dollar', icon: '$' },
      { code: 'BYN', name: 'Belarusian Ruble', icon: 'Br' },
    ])

    render(<ExpenseFormModal {...baseProps} />)

    await user.click(screen.getByRole('combobox', { name: 'Валюта' }))
    const options = await screen.findAllByRole('option')
    const labels = options.map((option) => option.textContent?.trim())

    expect(labels).toEqual(['$ USD', 'Br BYN'])
  })

  it('builds an expression with helper buttons, shows a result hint, and saves the resolved amount', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => {})

    render(<ExpenseFormModal {...baseProps} onSave={onSave} />)

    await user.type(screen.getByLabelText('Сумма'), '1200')
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.type(screen.getByLabelText('Сумма'), '350')
    await user.click(screen.getByRole('button', { name: '-' }))
    await user.type(screen.getByLabelText('Сумма'), '99')

    const resultHint = await screen.findByRole('button', { name: /Итог:/ })
    expect(resultHint.textContent).toBe('=1451')

    await user.click(resultHint)
    expect((screen.getByLabelText('Сумма') as HTMLInputElement).value).toBe('1451')

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1451,
        }),
      )
    })
  })

  it('does not append a second operator when helper buttons are pressed twice in a row', async () => {
    const user = userEvent.setup()

    render(<ExpenseFormModal {...baseProps} />)

    const amountInput = screen.getByLabelText('Сумма')
    await user.type(amountInput, '1200')
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '-' }))

    expect((amountInput as HTMLInputElement).value).toBe('1200+')
  })

  it('keeps focus on the amount input after tapping helper buttons', async () => {
    const user = userEvent.setup()

    render(<ExpenseFormModal {...baseProps} />)

    const amountInput = screen.getByLabelText('Сумма') as HTMLInputElement
    amountInput.focus()

    await user.type(amountInput, '1200')
    await user.click(screen.getByRole('button', { name: '+' }))

    await waitFor(() => {
      expect(document.activeElement).toBe(amountInput)
    })
  })
})
