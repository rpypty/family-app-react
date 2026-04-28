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

  it('uploads one receipt file with the receipt field name', async () => {
    const receipt = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })

    await createReceiptParse({
      receipts: [receipt],
      allCategories: true,
      categoryIds: [],
    })

    const body = apiFetchMock.mock.calls[0][1].body as FormData
    expect(body.getAll('receipt')).toEqual([receipt])
  })

  it('uploads multiple receipt files as repeated receipt fields in order', async () => {
    const firstReceipt = new File(['first'], 'first.jpg', { type: 'image/jpeg' })
    const secondReceipt = new File(['second'], 'second.png', { type: 'image/png' })

    await createReceiptParse({
      receipts: [firstReceipt, secondReceipt],
      allCategories: false,
      categoryIds: ['food', 'home'],
      date: '2026-04-28',
      currency: 'BYN',
    })

    const body = apiFetchMock.mock.calls[0][1].body as FormData
    expect(body.getAll('receipt')).toEqual([firstReceipt, secondReceipt])
    expect(body.getAll('category_ids')).toEqual(['food', 'home'])
    expect(body.get('all_categories')).toBe('false')
    expect(body.get('date')).toBe('2026-04-28')
    expect(body.get('currency')).toBe('BYN')
  })

  it('normalizes extension-only JPEG files before upload', async () => {
    const receipt = new File(['receipt'], 'IMG_0001.JPG')

    await createReceiptParse({
      receipts: [receipt],
      allCategories: true,
      categoryIds: [],
    })

    const body = apiFetchMock.mock.calls[0][1].body as FormData
    const uploadedReceipt = body.get('receipt') as File
    expect(uploadedReceipt.name).toBe('IMG_0001.JPG')
    expect(uploadedReceipt.type).toBe('image/jpeg')
  })
})
