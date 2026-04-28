import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsScreen } from './AnalyticsScreen'

const {
  getAnalyticsSummaryMock,
  getAnalyticsByCategoryMock,
  getAnalyticsTimeseriesMock,
  listExpensePageMock,
  listCurrenciesMock,
} = vi.hoisted(() => ({
  getAnalyticsSummaryMock: vi.fn(),
  getAnalyticsByCategoryMock: vi.fn(),
  getAnalyticsTimeseriesMock: vi.fn(),
  listExpensePageMock: vi.fn(),
  listCurrenciesMock: vi.fn(),
}))

vi.mock('../api/analytics', () => ({
  getAnalyticsSummary: getAnalyticsSummaryMock,
  getAnalyticsByCategory: getAnalyticsByCategoryMock,
  getAnalyticsTimeseries: getAnalyticsTimeseriesMock,
}))

vi.mock('../../expenses/api/expenses', () => ({
  listExpensePage: listExpensePageMock,
}))

vi.mock('../../api/currencies', () => ({
  listCurrencies: listCurrenciesMock,
}))

describe('AnalyticsScreen currency filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    listCurrenciesMock.mockResolvedValue([
      { code: 'BYN', name: 'Belarusian Ruble' },
      { code: 'USD', name: 'US Dollar' },
    ])
    getAnalyticsSummaryMock.mockResolvedValue({
      totalAmount: 100,
      currency: 'BYN',
      count: 2,
      avgPerDay: 50,
      from: '2026-01-01',
      to: '2026-01-31',
    })
    getAnalyticsByCategoryMock.mockResolvedValue([])
    getAnalyticsTimeseriesMock.mockResolvedValue([])
    listExpensePageMock.mockResolvedValue({ items: [], total: 0 })
  })

  it('requests analytics without currency by default', async () => {
    render(
      <MemoryRouter initialEntries={['/miniapps/expenses/analytics']}>
        <AnalyticsScreen categories={[]} familyDefaultCurrency="BYN" readOnly={false} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(getAnalyticsSummaryMock).toHaveBeenCalled()
    })

    expect(getAnalyticsSummaryMock).toHaveBeenCalledWith(
      expect.objectContaining({ currency: undefined }),
    )
    expect(getAnalyticsByCategoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ currency: undefined }),
    )
  })

  it('requests analytics with selected currency', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/miniapps/expenses/analytics']}>
        <AnalyticsScreen categories={[]} familyDefaultCurrency="BYN" readOnly={false} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(getAnalyticsSummaryMock).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('combobox', { name: 'Валюта аналитики' }))
    await user.click(await screen.findByRole('option', { name: 'USD' }))

    await waitFor(() => {
      expect(getAnalyticsSummaryMock).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD' }),
      )
    })

    expect(getAnalyticsByCategoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' }),
    )
  })

  it('keeps backend currency order and shows currency icon in filter menu', async () => {
    const user = userEvent.setup()
    listCurrenciesMock.mockResolvedValue([
      { code: 'USD', name: 'US Dollar', icon: '$' },
      { code: 'BYN', name: 'Belarusian Ruble', icon: '🇧🇾', symbol: 'ƃ' },
    ])

    render(
      <MemoryRouter initialEntries={['/miniapps/expenses/analytics']}>
        <AnalyticsScreen categories={[]} familyDefaultCurrency="BYN" readOnly={false} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(getAnalyticsSummaryMock).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('combobox', { name: 'Валюта аналитики' }))
    const options = await screen.findAllByRole('option')
    const labels = options.map((option) => option.textContent?.trim())

    expect(labels).toEqual(['Все / BYN', '$ USD', '🇧🇾 BYN'])
  })

  it('shows filtered expenses as a read-only grouped list when analytics is read-only', async () => {
    localStorage.setItem('expense:analytics:filters:v2', JSON.stringify({
      fromDate: '2026-04-20',
      toDate: '2026-04-20',
      categoryIds: [],
      currency: null,
    }))
    listExpensePageMock.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'expense-1',
          date: '2026-04-20',
          title: 'Coffee',
          amount: 12,
          currency: 'BYN',
          baseCurrency: 'BYN',
          amountInBase: 12,
          categoryIds: [],
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/miniapps/expenses/analytics']}>
        <AnalyticsScreen categories={[]} familyDefaultCurrency="BYN" readOnly />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Coffee')).toBeTruthy()
    expect(screen.getByRole('button', { name: /12.00 BYN/ }).textContent).toContain('20 апреля')
    expect(screen.queryByRole('button', { name: /Coffee/ })).toBeNull()
  })
})
