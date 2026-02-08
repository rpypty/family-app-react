export interface GymEntry {
  id: string
  date: string // YYYY-MM-DD
  exercise: string
  weightKg: number
  reps: number
  createdAt: number
}

export interface WorkoutSet {
  id: string
  exercise: string
  weightKg: number
  reps: number
  createdAt: number
}

export interface Workout {
  id: string
  date: string // YYYY-MM-DD
  name: string
  createdAt: number
  sets: WorkoutSet[]
}

export interface TemplateExercise {
  name: string
  reps: number
  sets: number
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: TemplateExercise[]
  createdAt: number
}

export interface ExerciseAgg {
  exercise: string
  key: string
  sets: number
  totalVolume: number
  bestSet: { weightKg: number; reps: number } | null
  lastDate: Date | null
  prevSets: number
  prevVolume: number
  setsDeltaPct: number | null
  deltaPct: number | null
}

export interface AnalyticsResult {
  list: ExerciseAgg[]
  totalSets: number
  prevTotalSets: number
  totalVolume: number
  prevTotal: number
  totalDeltaPct: number | null
  totalSetsDeltaPct: number | null
}

export type ExerciseOption = string | { inputValue: string; title: string }
