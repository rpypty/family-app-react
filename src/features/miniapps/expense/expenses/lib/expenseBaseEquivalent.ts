import type { Expense } from '../../../../../shared/types'
import {
  formatAmountWithCurrency,
  type CurrencyLabels,
} from '../../../../../shared/lib/formatters'

export const formatExpenseBaseApproxAmount = (
  expense: Expense,
  currencyLabels?: CurrencyLabels,
): string | null => {
  if (expense.amountInBase === null || expense.amountInBase === undefined) return null
  if (!expense.baseCurrency) return null
  if (expense.currency === expense.baseCurrency) return null
  return `~${formatAmountWithCurrency(expense.amountInBase, expense.baseCurrency, currencyLabels)}`
}
