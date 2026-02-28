import {
  type AppId,
  ROUTES,
  resolveExpensesBackNavigationTarget,
  resolveWorkoutsBackNavigationTarget,
} from '../routing/routes'

export const resolveBackNavigationTarget = ({
  activeApp,
  currentPath,
}: {
  activeApp: AppId
  currentPath: string
}): string => {
  if (activeApp === 'workouts') {
    return resolveWorkoutsBackNavigationTarget(currentPath)
  }
  if (activeApp === 'expenses') {
    return resolveExpensesBackNavigationTarget(currentPath)
  }

  return ROUTES.home
}
