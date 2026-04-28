import { DEFAULT_CURRENCY, type Expense } from '../../../../../shared/types'

export type DayCurrencyBreakdownItem = {
  currency: string
  amount: number
}

export type DayExpenseSummary = {
  convertedTotal: number
  currency: string
  breakdown: DayCurrencyBreakdownItem[]
  hasUnconverted: boolean
  unconvertedCount: number
}

const normalizeCurrency = (currency?: string | null): string | null => {
  const value = currency?.trim().toUpperCase()
  return value || null
}

const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100

export const buildExpenseDaySummaryMemoKey = (expenses: Expense[]): string =>
  expenses
    .map((expense) =>
      [
        expense.id,
        expense.date,
        expense.amount,
        expense.currency,
        expense.amountInBase ?? '',
        expense.baseCurrency ?? '',
        expense.updatedAt ?? '',
      ].join(':'),
    )
    .join('|')

const resolveDayTotalCurrency = (expenses: Expense[], familyDefaultCurrency?: string | null): string => {
  const baseCurrencies = Array.from(
    new Set(
      expenses
        .map((expense) => normalizeCurrency(expense.baseCurrency))
        .filter((currency): currency is string => Boolean(currency)),
    ),
  )

  if (baseCurrencies.length === 1) return baseCurrencies[0]

  return (
    normalizeCurrency(familyDefaultCurrency) ??
    baseCurrencies[0] ??
    normalizeCurrency(expenses[0]?.currency) ??
    DEFAULT_CURRENCY
  )
}

export const createDayExpenseSummary = (
  expenses: Expense[],
  familyDefaultCurrency?: string | null,
): DayExpenseSummary => {
  const totalCurrency = resolveDayTotalCurrency(expenses, familyDefaultCurrency)
  const breakdownByCurrency = new Map<string, number>()
  let convertedTotal = 0
  let unconvertedCount = 0

  expenses.forEach((expense) => {
    const sourceCurrency = normalizeCurrency(expense.currency) ?? DEFAULT_CURRENCY
    const effectiveBaseCurrency = normalizeCurrency(expense.baseCurrency) ?? totalCurrency

    breakdownByCurrency.set(
      sourceCurrency,
      (breakdownByCurrency.get(sourceCurrency) ?? 0) + expense.amount,
    )

    if (typeof expense.amountInBase === 'number' && Number.isFinite(expense.amountInBase)) {
      convertedTotal += expense.amountInBase
      return
    }

    if (sourceCurrency === effectiveBaseCurrency) {
      convertedTotal += expense.amount
      return
    }

    unconvertedCount += 1
  })

  return {
    convertedTotal: roundMoney(convertedTotal),
    currency: totalCurrency,
    breakdown: Array.from(breakdownByCurrency, ([currency, amount]) => ({
      currency,
      amount: roundMoney(amount),
    })),
    hasUnconverted: unconvertedCount > 0,
    unconvertedCount,
  }
}
