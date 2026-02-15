import { exerciseKey } from '../utils/workout'

const STORAGE_KEY = 'workouts:exercises:v1'

export const loadLocalExercises = (): string[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => typeof item === 'string')
  } catch {
    return []
  }
}

export const saveLocalExercises = (list: string[]) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export const addLocalExercise = (list: string[], name: string): string[] => {
  const trimmed = name.trim()
  if (!trimmed) return list
  const key = exerciseKey(trimmed)
  if (list.some((item) => exerciseKey(item) === key)) return list
  return [...list, trimmed].sort((a, b) => a.localeCompare(b))
}

export const replaceLocalExercise = (list: string[], from: string, to: string): string[] => {
  const fromKey = exerciseKey(from)
  const toKey = exerciseKey(to)
  const next = list.filter((item) => exerciseKey(item) !== fromKey)
  if (!next.some((item) => exerciseKey(item) === toKey)) {
    next.push(to.trim())
  }
  return next.sort((a, b) => a.localeCompare(b))
}
