import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReceiptParse } from './receiptParses'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('../../../../../shared/api/client', () => ({
  apiFetch: apiFetchMock,
}))

describe('createReceiptParse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiFetchMock.mockResolvedValue({
      id: 'parse-1',
      status: 'queued',
      created_at: '2026-04-28T00:00:00Z',
      updated_at: '2026-04-28T00:00:00Z',
    })
  })

  it('normalizes extension-only HEIC files before upload', async () => {
    const receipt = new File(['receipt'], 'IMG_0001.HEIC')

    await createReceiptParse({
      receipt,
      allCategories: true,
      categoryIds: [],
    })

    const body = apiFetchMock.mock.calls[0][1].body as FormData
    const uploadedReceipt = body.get('receipt') as File
    expect(uploadedReceipt.name).toBe('IMG_0001.HEIC')
    expect(uploadedReceipt.type).toBe('image/heic')
  })
})
