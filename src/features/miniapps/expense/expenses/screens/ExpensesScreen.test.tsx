import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Expense } from '../../../../../shared/types'
import { ExpensesScreen } from './ExpensesScreen'

vi.mock('../../receipts/hooks/useReceiptParseJob', () => ({
  useReceiptParseJob: () => ({
    summary: null,
    parse: null,
    isLoading: false,
    error: null,
    hasActiveJob: false,
    refreshActive: vi.fn(),
    refreshCurrent: vi.fn(),
    create: vi.fn(),
    updateItems: vi.fn(),
    approve: vi.fn(),
    cancel: vi.fn(),
  }),
}))

const createExpense = (expense: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'currency'>): Expense => ({
  date: '2026-04-28',
  title: 'Expense',
  categoryIds: [],
  baseCurrency: 'BYN',
  ...expense,
})

const baseProps = {
  categories: [],
  familyDefaultCurrency: 'BYN',
  total: 3,
  hasMore: false,
  isLoadingMore: false,
  onLoadMore: vi.fn(),
  onCreateExpense: vi.fn(),
  onUpdateExpense: vi.fn(),
  onDeleteExpense: vi.fn(),
  onCreateCategory: vi.fn(),
  readOnly: true,
}

describe('ExpensesScreen day header', () => {
  it('shows one converted day total and expands source currency breakdown', async () => {
    const user = userEvent.setup()
    const expenses = [
      createExpense({
        id: 'usd',
        title: 'USD expense',
        amount: 10,
        currency: 'USD',
        amountInBase: 32.5,
      }),
      createExpense({
        id: 'byn',
        title: 'BYN expense',
        amount: 15,
        currency: 'BYN',
        amountInBase: 15,
      }),
      createExpense({
        id: 'rub',
        title: 'RUB expense',
        amount: 1000,
        currency: 'RUB',
        amountInBase: 35.125,
      }),
    ]

    render(
      <MemoryRouter initialEntries={['/miniapps/expenses']}>
        <ExpensesScreen {...baseProps} expenses={expenses} />
      </MemoryRouter>,
    )

    const dayHeader = screen.getByRole('button', { name: /82.63 BYN/ })
    expect(dayHeader.textContent).not.toContain('1000.00 RUB')
    expect(screen.getAllByText('1000.00 RUB')).toHaveLength(1)

    await user.click(dayHeader)

    expect(screen.getAllByText('10.00 USD')).toHaveLength(2)
    expect(screen.getAllByText('15.00 BYN')).toHaveLength(2)
    expect(screen.getAllByText('1000.00 RUB')).toHaveLength(2)
  })
})
