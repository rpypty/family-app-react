import { apiFetch } from '../../../../shared/api/client'

export type CurrencyItem = {
  code: string
  name: string
  icon?: string
  symbol?: string
}

type CurrencyItemResponse = {
  code: string
  name: string
  icon?: string | null
  symbol?: string | null
}

export const listCurrencies = async (): Promise<CurrencyItem[]> => {
  const response = await apiFetch<CurrencyItemResponse[]>('/currencies')
  return response
    .filter((item) => typeof item.code === 'string' && item.code.trim().length > 0)
    .map((item) => {
      const icon = typeof item.icon === 'string' && item.icon.trim().length > 0 ? item.icon.trim() : undefined
      const symbol = typeof item.symbol === 'string' && item.symbol.trim().length > 0 ? item.symbol.trim() : undefined
      return {
        code: item.code.trim().toUpperCase(),
        name: item.name,
        icon,
        symbol,
      }
    })
}
