import type { Expense } from '../../../../../shared/types'
import { formatAmount } from '../../../../../shared/lib/formatters'

export const formatExpenseBaseApproxAmount = (expense: Expense): string | null => {
  if (expense.amountInBase === null || expense.amountInBase === undefined) return null
  if (!expense.baseCurrency) return null
  if (expense.currency === expense.baseCurrency) return null
  return `~${formatAmount(expense.amountInBase)} ${expense.baseCurrency}`
}
