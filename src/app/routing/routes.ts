export type TabId = 'expenses' | 'analytics' | 'reports'
export type AppId = 'home' | 'expenses' | 'todo' | 'workouts'
export type WorkoutsRoute =
  | { view: 'home' }
  | { view: 'new'; date?: string }
  | { view: 'exercise'; exerciseName: string }
  | { view: 'templates' }
  | { view: 'template'; templateId: string }
  | { view: 'analytics' }
  | { view: 'workout'; workoutId: string }
  | { view: 'workout-exercises'; workoutId: string }

export const ROUTES = {
  home: '/',
  expenses: '/miniapps/expenses',
  expenseAnalytics: '/miniapps/expenses/analytics',
  expenseReports: '/miniapps/expenses/reports',
  todo: '/miniapps/todo',
  workouts: '/miniapps/workouts',
} as const

export const WORKOUTS_ROUTES = {
  home: ROUTES.workouts,
  templates: `${ROUTES.workouts}/templates`,
  analytics: `${ROUTES.workouts}/analytics`,
  exerciseNew: `${ROUTES.workouts}/exercise/new`,
  new: (date?: string) => {
    if (!date) return `${ROUTES.workouts}/new`
    const params = new URLSearchParams({ date })
    return `${ROUTES.workouts}/new?${params.toString()}`
  },
  template: (templateId: string) => `${ROUTES.workouts}/templates/${templateId}`,
  exercise: (exerciseName: string) =>
    `${ROUTES.workouts}/exercise/${encodeURIComponent(exerciseName)}`,
  workout: (workoutId: string) => `${ROUTES.workouts}/workout/${workoutId}`,
  workoutExercises: (workoutId: string) =>
    `${ROUTES.workouts}/workout/${workoutId}/exercises`,
} as const

export const EXPENSE_TAB_ROUTES: Record<TabId, string> = {
  expenses: ROUTES.expenses,
  analytics: ROUTES.expenseAnalytics,
  reports: ROUTES.expenseReports,
}

export type ResolvedRoute = {
  activeApp: AppId
  activeTab: TabId
  redirectTo?: string
}

export const normalizePathname = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed.length === 0 ? '/' : trimmed
}

const getPathSegments = (pathname: string) =>
  normalizePathname(pathname).split('/').filter(Boolean)

export const resolveWorkoutsRoute = (
  pathname: string,
  search = '',
): WorkoutsRoute => {
  const segments = getPathSegments(pathname)
  if (segments[0] !== 'miniapps' || segments[1] !== 'workouts') {
    return { view: 'home' }
  }

  if (segments[2] === 'new') {
    const params = new URLSearchParams(search)
    return { view: 'new', date: params.get('date') || undefined }
  }
  if (segments[2] === 'exercise' && segments[3]) {
    return { view: 'exercise', exerciseName: segments[3] }
  }
  if (segments[2] === 'templates' && segments[3]) {
    return { view: 'template', templateId: segments[3] }
  }
  if (segments[2] === 'templates') {
    return { view: 'templates' }
  }
  if (segments[2] === 'analytics') {
    return { view: 'analytics' }
  }
  if (segments[2] === 'workout' && segments[3]) {
    if (segments[4] === 'exercises') {
      return { view: 'workout-exercises', workoutId: segments[3] }
    }
    return { view: 'workout', workoutId: segments[3] }
  }

  return { view: 'home' }
}

export const resolveWorkoutsBackNavigationTarget = (pathname: string): string => {
  const normalized = normalizePathname(pathname)
  if (normalized === WORKOUTS_ROUTES.home) {
    return ROUTES.home
  }
  if (!normalized.startsWith(`${WORKOUTS_ROUTES.home}/`)) {
    return ROUTES.home
  }

  const route = resolveWorkoutsRoute(normalized)
  if (route.view === 'template' || route.view === 'exercise') {
    return WORKOUTS_ROUTES.templates
  }
  if (
    route.view === 'workout' ||
    route.view === 'workout-exercises' ||
    route.view === 'new'
  ) {
    return WORKOUTS_ROUTES.home
  }
  if (route.view === 'templates' || route.view === 'analytics') {
    return ROUTES.home
  }

  return WORKOUTS_ROUTES.home
}

export const resolveAppRoute = (pathname: string): ResolvedRoute => {
  const segments = getPathSegments(pathname)

  if (segments.length === 0) {
    return { activeApp: 'home', activeTab: 'expenses' }
  }

  if (segments[0] !== 'miniapps') {
    return { activeApp: 'home', activeTab: 'expenses', redirectTo: ROUTES.home }
  }

  if (segments.length === 1) {
    return { activeApp: 'home', activeTab: 'expenses', redirectTo: ROUTES.home }
  }

  const app = segments[1]

  if (app === 'expenses') {
    const section = segments[2]
    if (!section) {
      return { activeApp: 'expenses', activeTab: 'expenses' }
    }
    if (section === 'analytics') {
      return { activeApp: 'expenses', activeTab: 'analytics' }
    }
    if (section === 'reports') {
      return { activeApp: 'expenses', activeTab: 'reports' }
    }
    return {
      activeApp: 'expenses',
      activeTab: 'expenses',
      redirectTo: ROUTES.expenses,
    }
  }

  if (app === 'todo') {
    if (segments.length > 2) {
      return { activeApp: 'todo', activeTab: 'expenses', redirectTo: ROUTES.todo }
    }
    return { activeApp: 'todo', activeTab: 'expenses' }
  }

  if (app === 'gym') {
    return { activeApp: 'workouts', activeTab: 'expenses', redirectTo: ROUTES.workouts }
  }

  if (app === 'workouts') {
    return { activeApp: 'workouts', activeTab: 'expenses' }
  }

  return { activeApp: 'home', activeTab: 'expenses', redirectTo: ROUTES.home }
}
