export type ExchangePreview = {
  exchangeRate: number | null
  amountInBase: number | null
}

export type ResolvedAmountInput = {
  rawValue: string
  sanitizedValue: string
  normalizedValue: string
  resolvedAmount: number | null
  hasExpression: boolean
  isValid: boolean
}

const roundCurrency = (value: number) => Number(value.toFixed(2))
const DIGIT_REGEXP = /\d/

export const sanitizeAmountInput = (value: string): string => {
  let sanitized = ''
  let currentTokenHasDigits = false
  let currentTokenHasSeparator = false

  for (const char of value.replace(/\s/g, '')) {
    if (DIGIT_REGEXP.test(char)) {
      sanitized += char
      currentTokenHasDigits = true
      continue
    }

    if (char === ',' || char === '.') {
      if (!currentTokenHasDigits || currentTokenHasSeparator) continue
      sanitized += char
      currentTokenHasSeparator = true
      continue
    }

    if (char === '+' || char === '-') {
      if (sanitized.length === 0) continue
      const lastChar = sanitized.at(-1)
      if (lastChar === '+' || lastChar === '-') continue
      sanitized += char
      currentTokenHasDigits = false
      currentTokenHasSeparator = false
    }
  }

  return sanitized
}

const trimTrailingOperator = (value: string): string => value.replace(/[+-]$/, '')

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

export const resolveAmountInput = (value: string): ResolvedAmountInput => {
  const sanitizedValue = sanitizeAmountInput(value)
  const normalizedValue = trimTrailingOperator(sanitizedValue)
  const hasExpression = /[+-]/.test(sanitizedValue)

  if (normalizedValue.length === 0) {
    return {
      rawValue: value,
      sanitizedValue,
      normalizedValue,
      resolvedAmount: null,
      hasExpression,
      isValid: false,
    }
  }

  if (!hasExpression) {
    const resolvedAmount = parseAmountInput(normalizedValue)
    return {
      rawValue: value,
      sanitizedValue,
      normalizedValue,
      resolvedAmount,
      hasExpression: false,
      isValid: resolvedAmount !== null,
    }
  }

  const tokens = normalizedValue.split(/([+-])/).filter(Boolean)
  let total: number | null = null
  let operator: '+' | '-' = '+'

  for (const token of tokens) {
    if (token === '+' || token === '-') {
      operator = token
      continue
    }

    const amount = parseAmountInput(token)
    if (amount === null) {
      return {
        rawValue: value,
        sanitizedValue,
        normalizedValue,
        resolvedAmount: null,
        hasExpression,
        isValid: false,
      }
    }

    if (total === null) {
      total = amount
      continue
    }

    total = operator === '+' ? total + amount : total - amount
  }

  const resolvedAmount = total !== null && Number.isFinite(total) && total > 0 ? roundCurrency(total) : null

  return {
    rawValue: value,
    sanitizedValue,
    normalizedValue,
    resolvedAmount,
    hasExpression,
    isValid: resolvedAmount !== null,
  }
}
