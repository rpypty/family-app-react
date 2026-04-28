import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCompleteTimeseriesRows } from '../lib/timeseries'
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

vi.mock('../components/TimeseriesBarChart', () => ({
  TimeseriesBarChart: ({ mode }: { mode: string }) => <div data-testid={`timeseries-chart-${mode}`} />,
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

  it('fills missing daily periods with zero totals for the bar chart', () => {
    const rows = buildCompleteTimeseriesRows(
      [
        { period: '2026-04-20', total: 10, count: 1 },
        { period: '2026-04-22', total: 30, count: 2 },
      ],
      { from: '2026-04-20', to: '2026-04-22' },
      'day',
    )

    expect(rows).toEqual([
      { period: '2026-04-20', total: 10, count: 1 },
      { period: '2026-04-21', total: 0, count: 0, breakdown: [] },
      { period: '2026-04-22', total: 30, count: 2 },
    ])
  })

  it('fills missing weekly periods with zero totals for the bar chart', () => {
    const rows = buildCompleteTimeseriesRows(
      [
        { period: '2026-04-13', total: 10, count: 1 },
        { period: '2026-04-27', total: 30, count: 2 },
      ],
      { from: '2026-04-13', to: '2026-04-27' },
      'week',
    )

    expect(rows).toEqual([
      { period: '2026-04-13', total: 10, count: 1 },
      { period: '2026-04-20', total: 0, count: 0, breakdown: [] },
      { period: '2026-04-27', total: 30, count: 2 },
    ])
  })

  it('shows drilldown stat cards and hides category chart when there is only one category', async () => {
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
          categoryIds: ['category-1'],
        },
      ],
    })

    render(
      <MemoryRouter
        initialEntries={[
          '/miniapps/expenses/analytics/drilldown?from=2026-04-20&to=2026-04-20&title=Coffee&categoryId=category-1',
        ]}
      >
        <AnalyticsScreen
          categories={[{ id: 'category-1', name: 'Food', color: '#00aa88' }]}
          familyDefaultCurrency="BYN"
          readOnly={false}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Всего трат')).toBeTruthy()
    expect(screen.getByText('Сумма трат')).toBeTruthy()
    expect(screen.getByText('Средний чек')).toBeTruthy()
    expect(await screen.findAllByText('Coffee')).toHaveLength(2)
    expect(screen.queryByText('Разбивка по категориям')).toBeNull()
    expect(screen.queryByTestId('timeseries-chart-category')).toBeNull()
  })
})
