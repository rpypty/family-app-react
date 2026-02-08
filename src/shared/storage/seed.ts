import type { Expense, StorageState, Tag } from '../types'
import { createId } from '../lib/uuid'

const TAG_NAMES = [
  'Еда',
  'Транспорт',
  'Дом',
  'Отдых',
  'Кафе',
  'Рестораны',
  'Супермаркет',
  'Доставка',
  'Топливо',
  'Парковка',
  'Такси',
  'Метро',
  'Автобус',
  'Связь',
  'Интернет',
  'Подписки',
  'Развлечения',
  'Спорт',
  'Здоровье',
  'Аптека',
  'Подарки',
  'Одежда',
  'Обувь',
  'Образование',
  'Книги',
  'Путешествия',
  'Домашние',
  'Ремонт',
  'Красота',
  'Дети',
  'Питомцы',
  'Хобби',
  'Техника',
  'Коммунальные',
  'Финансы',
]

const TITLES = [
  'Кофе и выпечка',
  'Продукты',
  'Такси',
  'Метро',
  'Обед',
  'Ужин',
  'Кино',
  'Хозтовары',
  'Заправка',
  'Подарок',
  'Книги',
  'Аптека',
  'Доставка',
  'Связь',
]

const DEFAULT_TARGET_COUNT = 50
const MONTHS_TO_GENERATE = 16

const createDateKey = (date: Date) => {
  const y = date.getFullYear().toString().padStart(4, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

const pickRandom = <T,>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)]

const pickUnique = <T,>(items: T[], count: number) => {
  const result = new Set<T>()
  while (result.size < count) {
    result.add(pickRandom(items))
  }
  return Array.from(result)
}

const createExpense = ({
  date,
  title,
  tagIds,
  multiplier = 1,
}: {
  date: string
  title: string
  tagIds: string[]
  multiplier?: number
}): Expense => {
  const base = 5 + Math.floor(Math.random() * 150) + Math.random()
  const scaled = Math.max(1, base * multiplier)
  return {
    id: createId(),
    date,
    amount: Number(scaled.toFixed(2)),
    currency: 'BYN',
    title,
    tagIds,
  }
}

export const createSeedState = (
  targetCount: number = DEFAULT_TARGET_COUNT,
): StorageState => {
  const tags: Tag[] = TAG_NAMES.map((name) => ({
    id: createId(),
    name,
  }))

  const expenses: Expense[] = []
  const today = new Date()
  const baseDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const reserved = Math.max(targetCount - 2, 0)
  const months = Array.from({ length: MONTHS_TO_GENERATE }, (_, index) => {
    return new Date(baseDay.getFullYear(), baseDay.getMonth() - index, 1)
  })
  const basePerMonth = Math.floor(reserved / MONTHS_TO_GENERATE)
  let remainder = reserved % MONTHS_TO_GENERATE

  const monthMultipliers = new Map<string, number>()
  months.forEach((month) => {
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    const delta = Math.random() * 2 - 1
    const multiplier = 1 + delta
    monthMultipliers.set(key, multiplier)
  })

  months.forEach((month) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    const monthMultiplier = monthMultipliers.get(monthKey) ?? 1
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const maxDay =
      year === baseDay.getFullYear() && monthIndex === baseDay.getMonth()
        ? baseDay.getDate()
        : daysInMonth
    let count = basePerMonth
    if (remainder > 0) {
      count += 1
      remainder -= 1
    }
    if (count <= 0) return

    for (let j = 0; j < count; j += 1) {
      const day = 1 + Math.floor(Math.random() * maxDay)
      const tagCount = 1 + Math.floor(Math.random() * 2)
      const picked = pickUnique(tags, tagCount).map((tag) => tag.id)
      const localMultiplier = Math.min(
        2,
        Math.max(0.1, monthMultiplier * (0.85 + Math.random() * 0.3)),
      )
      expenses.push(
        createExpense({
          date: createDateKey(new Date(year, monthIndex, day)),
          title: pickRandom(TITLES),
          tagIds: picked,
          multiplier: localMultiplier,
        }),
      )
    }
  })

  if (targetCount >= 2) {
    expenses.push({
      id: createId(),
      date: createDateKey(baseDay),
      amount: 12.4,
      currency: 'BYN',
      title: 'Сегодня: кофе',
      tagIds: tags[0] ? [tags[0].id] : [],
    })
    const yesterday = new Date(baseDay)
    yesterday.setDate(baseDay.getDate() - 1)
    expenses.push({
      id: createId(),
      date: createDateKey(yesterday),
      amount: 28.3,
      currency: 'BYN',
      title: 'Вчера: такси',
      tagIds: tags[1] ? [tags[1].id] : [],
    })
  }

  return {
    expenses,
    tags,
    todoLists: [],
    settings: { themeMode: 'light' },
  }
}
