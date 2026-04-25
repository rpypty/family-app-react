import { describe, expect, it } from 'vitest'
import { parseAmountInput, resolveAmountInput, resolveExchangePreview } from './exchangePreview'

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

describe('resolveAmountInput', () => {
  it('resolves plain numeric input', () => {
    expect(resolveAmountInput('12,34')).toEqual({
      rawValue: '12,34',
      sanitizedValue: '12,34',
      normalizedValue: '12,34',
      resolvedAmount: 12.34,
      hasExpression: false,
      isValid: true,
    })
  })

  it('resolves addition and subtraction expressions', () => {
    expect(resolveAmountInput('1200+350-99')).toEqual({
      rawValue: '1200+350-99',
      sanitizedValue: '1200+350-99',
      normalizedValue: '1200+350-99',
      resolvedAmount: 1451,
      hasExpression: true,
      isValid: true,
    })
  })

  it('trims a trailing operator before calculation', () => {
    expect(resolveAmountInput('1200+350-')).toEqual({
      rawValue: '1200+350-',
      sanitizedValue: '1200+350-',
      normalizedValue: '1200+350',
      resolvedAmount: 1550,
      hasExpression: true,
      isValid: true,
    })
  })

  it('prevents duplicate operators and unsupported characters during sanitization', () => {
    expect(resolveAmountInput('1200++3 абв')).toEqual({
      rawValue: '1200++3 абв',
      sanitizedValue: '1200+3',
      normalizedValue: '1200+3',
      resolvedAmount: 1203,
      hasExpression: true,
      isValid: true,
    })
  })

  it('returns invalid when no positive amount can be resolved', () => {
    expect(resolveAmountInput('1-1')).toEqual({
      rawValue: '1-1',
      sanitizedValue: '1-1',
      normalizedValue: '1-1',
      resolvedAmount: null,
      hasExpression: true,
      isValid: false,
    })
  })
})
