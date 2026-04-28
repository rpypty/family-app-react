import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listCurrencies } from './currencies'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('../../../../shared/api/client', () => ({
  apiFetch: apiFetchMock,
}))

describe('listCurrencies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps currency symbols from the backend response', async () => {
    apiFetchMock.mockResolvedValue([
      { code: 'byn', name: 'Belarusian Ruble', icon: '🇧🇾', symbol: 'ƃ' },
      { code: 'usd', name: 'US Dollar', icon: null, symbol: '  ' },
    ])

    await expect(listCurrencies()).resolves.toEqual([
      { code: 'BYN', name: 'Belarusian Ruble', icon: '🇧🇾', symbol: 'ƃ' },
      { code: 'USD', name: 'US Dollar', icon: undefined, symbol: undefined },
    ])
  })
})
