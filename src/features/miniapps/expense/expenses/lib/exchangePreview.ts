export type ExchangePreview = {
  exchangeRate: number | null
  amountInBase: number | null
}

const roundCurrency = (value: number) => Number(value.toFixed(2))

export const resolveExchangePreview = (params: {
  amount: number | null
  expenseCurrency: string
  baseCurrency: string
  exchangeRate: number | null
}): ExchangePreview => {
  const amount = params.amount
  if (amount === null || !Number.isFinite(amount) || amount <= 0) {
    return {
      exchangeRate: null,
      amountInBase: null,
    }
  }

  if (params.expenseCurrency === params.baseCurrency) {
    return {
      exchangeRate: 1,
      amountInBase: roundCurrency(amount),
    }
  }

  if (params.exchangeRate === null || !Number.isFinite(params.exchangeRate) || params.exchangeRate <= 0) {
    return {
      exchangeRate: null,
      amountInBase: null,
    }
  }

  return {
    exchangeRate: params.exchangeRate,
    amountInBase: roundCurrency(amount * params.exchangeRate),
  }
}

export const parseAmountInput = (value: string): number | null => {
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
