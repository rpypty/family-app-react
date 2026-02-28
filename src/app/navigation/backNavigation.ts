import {
  type AppId,
  ROUTES,
  resolveExpensesBackNavigationTarget,
  resolveWorkoutsBackNavigationTarget,
} from '../routing/routes'

export const resolveBackNavigationTarget = ({
  activeApp,
  currentPath,
  search,
}: {
  activeApp: AppId
  currentPath: string
  search?: string
}): string => {
  if (activeApp === 'workouts') {
    return resolveWorkoutsBackNavigationTarget(currentPath)
  }
  if (activeApp === 'expenses') {
    return resolveExpensesBackNavigationTarget(currentPath, search)
  }

  return ROUTES.home
}
