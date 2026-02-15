import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Paper, BottomNavigation, BottomNavigationAction, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import RocketLaunchRounded from '@mui/icons-material/RocketLaunchRounded'
import GridViewRounded from '@mui/icons-material/GridViewRounded'
import QueryStatsRounded from '@mui/icons-material/QueryStatsRounded'
import { useWorkoutsData } from '../hooks/useWorkoutsData'
import { WorkoutsHome } from './WorkoutsHome'
import { WorkoutsExercises } from './WorkoutsExercises'
import { WorkoutsAnalytics } from './WorkoutsAnalytics'
import { WorkoutEditor } from './WorkoutEditor'

export function WorkoutsScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const accent = theme.palette.mode === 'dark' ? '#FF784F' : '#FF5C35'
  const accentContrast = theme.palette.getContrastText(accent)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const {
    loading,
    workouts,
    exercises,
    exerciseMeta,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    addExercise,
    upsertExerciseMeta,
    renameExercise,
  } = useWorkoutsData()

  useEffect(() => {
    const styleId = 'workouts-font'
    if (typeof document === 'undefined') return
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.innerHTML =
      "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');"
    document.head.appendChild(style)
  }, [])

  const route = useMemo(() => {
    const normalized = location.pathname.replace(/\/+$/, '')
    const segments = normalized.split('/').filter(Boolean)
    if (segments[0] !== 'miniapps' || segments[1] !== 'workouts') {
      return { view: 'home' as const }
    }
    if (segments[2] === 'exercises') return { view: 'exercises' as const }
    if (segments[2] === 'analytics') return { view: 'analytics' as const }
    if (segments[2] === 'workout' && segments[3]) {
      if (segments[4] === 'exercises') {
        return { view: 'workout-exercises' as const, workoutId: segments[3] }
      }
      return { view: 'workout' as const, workoutId: segments[3] }
    }
    return { view: 'home' as const }
  }, [location.pathname])

  const activeTab = route.view === 'analytics' ? 2 : route.view === 'exercises' ? 1 : 0
  const workoutId =
    route.view === 'workout' || route.view === 'workout-exercises' ? route.workoutId : null
  const editingWorkout = workoutId ? workouts.find((w) => w.id === workoutId) || null : null

  useEffect(() => {
    if (!editingWorkout && (route.view === 'workout' || route.view === 'workout-exercises')) {
      navigate('/miniapps/workouts', { replace: true })
    }
  }, [editingWorkout, navigate, route.view])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={(themeValue) => ({
        fontFamily: '"Manrope", system-ui, sans-serif',
        bgcolor: themeValue.palette.background.default,
        borderRadius: 'var(--wk-radius)',
        p: { xs: 1, sm: 2 },
        minHeight: '80vh',
        position: 'relative',
        overflow: 'hidden',
        '--wk-radius': '18px',
        '--wk-radius-sm': '14px',
        '--wk-accent': accent,
        '--wk-accent-contrast': accentContrast,
        '--wk-ink': themeValue.palette.text.primary,
        '--wk-muted': alpha(themeValue.palette.text.primary, 0.6),
        '--wk-card': themeValue.palette.background.paper,
        '--wk-border': alpha(themeValue.palette.text.primary, 0.12),
        '--wk-shadow': themeValue.palette.mode === 'dark'
          ? '0 16px 30px rgba(0, 0, 0, 0.45)'
          : '0 16px 30px rgba(15, 23, 42, 0.18)',
        '--wk-accent-soft': alpha(accent, 0.22),
        '--wk-ink-soft': alpha(themeValue.palette.text.primary, 0.08),
        '--wk-selected-dark': themeValue.palette.mode === 'dark' ? '#1F2937' : 'var(--wk-ink)',
      })}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--wk-accent-soft) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -140,
          left: -100,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--wk-ink-soft) 0%, rgba(255,255,255,0) 70%)',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: 'var(--wk-ink)' }}>
          Workouts
        </Typography>

        {editingWorkout && editingWorkout ? (
          <WorkoutEditor
            workout={editingWorkout}
            allWorkouts={workouts}
            exercises={exercises}
            exerciseMeta={exerciseMeta}
            isExercisePickerOpen={route.view === 'workout-exercises'}
            onOpenExercisePicker={() => navigate(`/miniapps/workouts/workout/${editingWorkout.id}/exercises`)}
            onCloseExercisePicker={() => navigate(`/miniapps/workouts/workout/${editingWorkout.id}`)}
            onAddExercise={(name) => {
              addExercise(name)
            }}
            onSave={(updated) => {
              void updateWorkout(updated)
            }}
            onDeleteWorkout={async (workoutId) => {
              await deleteWorkout(workoutId)
              navigate('/miniapps/workouts')
            }}
          />
        ) : route.view === 'exercises' ? (
          <WorkoutsExercises
            exercises={exercises}
            exerciseMeta={exerciseMeta}
            onAddExercise={addExercise}
            onUpsertMeta={upsertExerciseMeta}
            onRenameExercise={renameExercise}
          />
        ) : route.view === 'analytics' ? (
          <WorkoutsAnalytics workouts={workouts} exerciseMeta={exerciseMeta} />
        ) : (
          <WorkoutsHome
            workouts={workouts}
            selectedDate={selectedDate}
            exerciseMeta={exerciseMeta}
            onSelectDate={setSelectedDate}
            onOpenWorkout={(id) => navigate(`/miniapps/workouts/workout/${id}`)}
            onCreateWorkout={(date) => {
              void (async () => {
                const created = await createWorkout(date)
                navigate(`/miniapps/workouts/workout/${created.id}`)
              })()
            }}
          />
        )}
      </Box>

      {!editingWorkout && (
        <Paper
          elevation={0}
          square
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (themeValue) => themeValue.zIndex.appBar + 1,
            borderTop: 1,
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            value={activeTab}
            onChange={(_, value) => {
              if (value === 1) navigate('/miniapps/workouts/exercises')
              else if (value === 2) navigate('/miniapps/workouts/analytics')
              else navigate('/miniapps/workouts')
            }}
            showLabels
            sx={{ height: 82, bgcolor: theme.palette.background.paper }}
          >
            <BottomNavigationAction label="Главная" icon={<RocketLaunchRounded />} />
            <BottomNavigationAction label="Упражнения" icon={<GridViewRounded />} />
            <BottomNavigationAction label="Аналитика" icon={<QueryStatsRounded />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
