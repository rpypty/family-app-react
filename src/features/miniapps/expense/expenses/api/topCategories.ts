import { apiFetch } from '../../../../../shared/api/client'

export type TopCategoriesStatus = 'OK' | 'NEED_MORE_DATA' | 'TOP_CATEGORIES_DISABLED'

export type TopCategoryItem = {
  categoryId: string
  categoryName: string
  total: number
  count: number
}

type TopCategoriesResponse = {
  status: TopCategoriesStatus
  items: Array<{
    category_id: string
    category_name: string
    total: number
    count: number
  }>
}

export const getTopCategories = async (): Promise<{
  status: TopCategoriesStatus
  items: TopCategoryItem[]
}> => {
  const response = await apiFetch<TopCategoriesResponse>('/top_categories')
  return {
    status: response.status,
    items: response.items.map((item) => ({
      categoryId: item.category_id,
      categoryName: item.category_name,
      total: item.total,
      count: item.count,
    })),
  }
}

