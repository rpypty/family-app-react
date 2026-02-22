import { type AppId, ROUTES } from '../routing/routes'

export const resolveBackNavigationTarget = ({
  activeApp,
  currentPath,
}: {
  activeApp: AppId
  currentPath: string
}): string => {
  if (activeApp === 'gym') {
    return currentPath.startsWith(`${ROUTES.gym}/`) ? ROUTES.gym : ROUTES.home
  }

  if (activeApp === 'workouts') {
    const isWorkoutsNested = currentPath.startsWith(`${ROUTES.workouts}/`)
    if (!isWorkoutsNested) {
      return ROUTES.home
    }

    const pathAfterWorkouts = currentPath.slice(ROUTES.workouts.length + 1)
    const segments = pathAfterWorkouts.split('/').filter(Boolean)

    if (segments[0] === 'templates' && segments[1]) {
      return `${ROUTES.workouts}/templates`
    }
    if (segments[0] === 'exercise') {
      return `${ROUTES.workouts}/templates`
    }
    if (segments[0] === 'workout' || segments[0] === 'new') {
      return ROUTES.workouts
    }
    if (segments[0] === 'templates' || segments[0] === 'analytics') {
      return ROUTES.home
    }

    return ROUTES.workouts
  }

  return ROUTES.home
}
