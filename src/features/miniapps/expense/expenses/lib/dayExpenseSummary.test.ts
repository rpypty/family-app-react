import { describe, expect, it } from 'vitest'
import type { Expense } from '../../../../../shared/types'
import {
  buildExpenseDaySummaryMemoKey,
  createDayExpenseSummary,
} from './dayExpenseSummary'

const createExpense = (expense: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'currency'>): Expense => ({
  date: '2026-04-28',
  title: 'Expense',
  categoryIds: [],
  ...expense,
})

describe('createDayExpenseSummary', () => {
  it('shows one converted total in base currency and keeps source currency breakdown', () => {
    const summary = createDayExpenseSummary([
      createExpense({
        id: 'usd',
        amount: 10,
        currency: 'USD',
        amountInBase: 32.5,
        baseCurrency: 'BYN',
      }),
      createExpense({
        id: 'byn',
        amount: 15,
        currency: 'BYN',
        amountInBase: 15,
        baseCurrency: 'BYN',
      }),
      createExpense({
        id: 'rub',
        amount: 1000,
        currency: 'RUB',
        amountInBase: 35.125,
        baseCurrency: 'BYN',
      }),
    ])

    expect(summary).toEqual({
      convertedTotal: 82.63,
      currency: 'BYN',
      breakdown: [
        { currency: 'USD', amount: 10 },
        { currency: 'BYN', amount: 15 },
        { currency: 'RUB', amount: 1000 },
      ],
      hasUnconverted: false,
      unconvertedCount: 0,
    })
  })

  it('uses amount for base-currency expenses and marks missing converted non-base expenses', () => {
    const summary = createDayExpenseSummary([
      createExpense({
        id: 'old-base',
        amount: 15,
        currency: 'BYN',
        baseCurrency: 'BYN',
        amountInBase: null,
      }),
      createExpense({
        id: 'old-foreign',
        amount: 10,
        currency: 'USD',
        baseCurrency: 'BYN',
        amountInBase: null,
      }),
    ])

    expect(summary.convertedTotal).toBe(15)
    expect(summary.currency).toBe('BYN')
    expect(summary.hasUnconverted).toBe(true)
    expect(summary.unconvertedCount).toBe(1)
  })

  it('falls back to family default currency for old expenses without base currency', () => {
    const summary = createDayExpenseSummary([
      createExpense({
        id: 'old-byn',
        amount: 15,
        currency: 'BYN',
        amountInBase: null,
      }),
    ], 'BYN')

    expect(summary.convertedTotal).toBe(15)
    expect(summary.currency).toBe('BYN')
    expect(summary.hasUnconverted).toBe(false)
  })

  it('uses family default currency when expenses have different base currencies', () => {
    const summary = createDayExpenseSummary([
      createExpense({
        id: 'first',
        amount: 10,
        currency: 'USD',
        amountInBase: 32,
        baseCurrency: 'BYN',
      }),
      createExpense({
        id: 'second',
        amount: 10,
        currency: 'EUR',
        amountInBase: 9,
        baseCurrency: 'USD',
      }),
    ], 'EUR')

    expect(summary.convertedTotal).toBe(41)
    expect(summary.currency).toBe('EUR')
  })
})

describe('buildExpenseDaySummaryMemoKey', () => {
  it('includes fields that affect day header calculation', () => {
    const first = buildExpenseDaySummaryMemoKey([
      createExpense({
        id: 'expense',
        date: '2026-04-28',
        amount: 10,
        currency: 'USD',
        amountInBase: 32,
        baseCurrency: 'BYN',
        updatedAt: '2026-04-28T10:00:00Z',
      }),
    ])
    const second = buildExpenseDaySummaryMemoKey([
      createExpense({
        id: 'expense',
        date: '2026-04-28',
        amount: 10,
        currency: 'USD',
        amountInBase: 33,
        baseCurrency: 'BYN',
        updatedAt: '2026-04-28T10:00:01Z',
      }),
    ])

    expect(first).not.toBe(second)
  })
})
