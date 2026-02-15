export type WorkoutSet = {
  id: string
  exercise: string
  reps: number
  weightKg: number
  createdAt: number
}

export type Workout = {
  id: string
  date: string
  name: string
  sets: WorkoutSet[]
  createdAt: number
}

export type WorkoutEntry = {
  id: string
  date: string
  exercise: string
  reps: number
  weightKg: number
  createdAt: number
}

export type ExerciseMeta = {
  name: string
  note: string
  isWeightless: boolean
  updatedAt: number
}

export type ExerciseSummary = {
  key: string
  name: string
  note: string
  isWeightless: boolean
  totalSets: number
  lastDate: Date | null
  lastWeight: number | null
  bestWeight: number | null
  bestReps: number | null
  lastReps: number | null
  maxVolumeDay: number | null
  prCount: number
}

export type ExerciseSeriesPoint = {
  date: Date
  dateISO: string
  value: number
}
