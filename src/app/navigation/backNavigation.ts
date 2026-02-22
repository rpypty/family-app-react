import {
  type AppId,
  ROUTES,
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

  return ROUTES.home
}
