import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolveBackNavigationTarget } from '../navigation/backNavigation'
import {
  EXPENSE_TAB_ROUTES,
  ROUTES,
  normalizePathname,
  resolveAppRoute,
  type TabId,
} from '../routing/routes'

export function useAppNavigation() {
  const location = useLocation()
  const navigate = useNavigate()

  const route = useMemo(() => resolveAppRoute(location.pathname), [location.pathname])
  const activeApp = route.activeApp
  const activeTab = route.activeTab
  const currentPath = normalizePathname(location.pathname)

  useEffect(() => {
    if (route.redirectTo) {
      navigate(route.redirectTo, { replace: true })
    }
  }, [route.redirectTo, navigate])

  const navigateHome = (replace = false) => {
    if (currentPath !== ROUTES.home || replace) {
      navigate(ROUTES.home, { replace })
    }
  }

  const navigateExpenseTab = (tab: TabId) => {
    const target = EXPENSE_TAB_ROUTES[tab]
    if (currentPath !== target) {
      navigate(target)
    }
  }

  const navigateTodo = () => {
    if (currentPath !== ROUTES.todo) {
      navigate(ROUTES.todo)
    }
  }

  const navigateWorkouts = () => {
    if (currentPath !== ROUTES.workouts) {
      navigate(ROUTES.workouts)
    }
  }

  const handleBackNavigation = () => {
    const target = resolveBackNavigationTarget({ activeApp, currentPath })
    if (target === ROUTES.home) {
      navigateHome()
      return
    }
    if (currentPath !== target) {
      navigate(target)
    }
  }

  return {
    navigate,
    activeApp,
    activeTab,
    currentPath,
    navigateHome,
    navigateExpenseTab,
    navigateTodo,
    navigateWorkouts,
    handleBackNavigation,
  }
}
