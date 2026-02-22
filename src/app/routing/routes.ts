export type TabId = 'expenses' | 'analytics' | 'reports'
export type AppId = 'home' | 'expenses' | 'todo' | 'gym' | 'workouts'

export const ROUTES = {
  home: '/',
  expenses: '/miniapps/expenses',
  expenseAnalytics: '/miniapps/expenses/analytics',
  expenseReports: '/miniapps/expenses/reports',
  todo: '/miniapps/todo',
  gym: '/miniapps/gym',
  workouts: '/miniapps/workouts',
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

export const resolveAppRoute = (pathname: string): ResolvedRoute => {
  const normalized = normalizePathname(pathname)
  const segments = normalized.split('/').filter(Boolean)

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
    return { activeApp: 'gym', activeTab: 'expenses' }
  }

  if (app === 'workouts') {
    return { activeApp: 'workouts', activeTab: 'expenses' }
  }

  return { activeApp: 'home', activeTab: 'expenses', redirectTo: ROUTES.home }
}
