import { describe, expect, it } from 'vitest'
import { parseAmountInput, resolveExchangePreview } from './exchangePreview'

describe('resolveExchangePreview', () => {
  it('returns base preview when expense currency equals base currency', () => {
    const result = resolveExchangePreview({
      amount: 15.57,
      expenseCurrency: 'BYN',
      baseCurrency: 'BYN',
      exchangeRate: null,
    })

    expect(result).toEqual({
      exchangeRate: 1,
      amountInBase: 15.57,
    })
  })

  it('calculates converted amount for non-base currency', () => {
    const result = resolveExchangePreview({
      amount: 10,
      expenseCurrency: 'USD',
      baseCurrency: 'BYN',
      exchangeRate: 3.264,
    })

    expect(result).toEqual({
      exchangeRate: 3.264,
      amountInBase: 32.64,
    })
  })

  it('returns nulls when amount or rate is invalid', () => {
    expect(
      resolveExchangePreview({
        amount: null,
        expenseCurrency: 'USD',
        baseCurrency: 'BYN',
        exchangeRate: 3.2,
      }),
    ).toEqual({ exchangeRate: null, amountInBase: null })

    expect(
      resolveExchangePreview({
        amount: 10,
        expenseCurrency: 'USD',
        baseCurrency: 'BYN',
        exchangeRate: null,
      }),
    ).toEqual({ exchangeRate: null, amountInBase: null })
  })
})

describe('parseAmountInput', () => {
  it('parses decimal input with comma', () => {
    expect(parseAmountInput('12,34')).toBe(12.34)
  })

  it('returns null for non-positive values', () => {
    expect(parseAmountInput('0')).toBeNull()
    expect(parseAmountInput('-1')).toBeNull()
  })
})
