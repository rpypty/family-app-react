import { apiFetch } from '../../../../shared/api/client'

export type ExchangeRate = {
  from: string
  to: string
  date: string
  rate: number
  source: string | null
}

type ExchangeRateResponse = {
  from: string
  to: string
  date: string
  rate: number
  source?: string | null
}

export const getExchangeRate = async (params: {
  from: string
  to: string
  date: string
}): Promise<ExchangeRate> => {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    date: params.date,
  })
  const response = await apiFetch<ExchangeRateResponse>(`/exchange-rates?${search.toString()}`)

  return {
    from: response.from,
    to: response.to,
    date: response.date,
    rate: response.rate,
    source: response.source ?? null,
  }
}
