import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import EditNoteIcon from '@mui/icons-material/EditNote'
import { useGymData } from '../hooks/useGymData'
import { todayISO } from '../utils/dateUtils'
import { CalendarTab } from './CalendarTab'
import { AnalyticsTab } from './AnalyticsTab'
import { WorkoutEditScreen } from './WorkoutEditScreen'
import { TemplatePickerScreen } from './TemplatePickerScreen'

export function GymScreen() {
  const [date, setDate] = useState(todayISO())
  const [periodDays, setPeriodDays] = useState(30)
  const location = useLocation()
  const navigate = useNavigate()

  const route = useMemo(() => {
    const normalized = location.pathname.replace(/\/+$/, '')
    const segments = normalized.split('/').filter(Boolean)
    if (segments[0] !== 'miniapps' || segments[1] !== 'gym') {
      return { view: 'calendar' as const }
    }
    if (segments[2] === 'analytics') {
      return { view: 'analytics' as const }
    }
    if (segments[2] === 'template') {
      return { view: 'template' as const }
    }
    if (segments[2] === 'workout' && segments[3]) {
      return { view: 'workout' as const, workoutId: segments[3] }
    }
    return { view: 'calendar' as const }
  }, [location.pathname])

  const isPickingTemplate = route.view === 'template'
  const editingWorkoutId = route.view === 'workout' ? route.workoutId : null
  const tab = route.view === 'analytics' ? 1 : 0

  const {
    loading,
    sortedWorkouts,
    exerciseOptions,
    entries,
    templates,
    addWorkout,
    addExercise,
    updateWorkoutFull,
  } = useGymData()

  const editingWorkout = useMemo(() => {
    if (!editingWorkoutId) return null
    return sortedWorkouts.find((w) => w.id === editingWorkoutId) || null
  }, [editingWorkoutId, sortedWorkouts])

  useEffect(() => {
    if (loading) return
    if (editingWorkoutId && !editingWorkout) {
      navigate('/miniapps/gym', { replace: true })
    }
  }, [editingWorkout, editingWorkoutId, loading, navigate])

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
  }

  const handleUseTemplateForDate = async (templateId: string, forDate: string) => {
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    const d = (forDate || '').trim() || todayISO()
    setDate(d)
    for (const ex of t.exercises) void addExercise(ex.name)
    const w = await addWorkout(d, t.name)
    navigate(`/miniapps/gym/workout/${w.id}`)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="sm" disableGutters>
      <Box sx={{ pb: editingWorkout ? 2 : 10 }}>
        {editingWorkout ? (
          <WorkoutEditScreen
            workout={editingWorkout}
            allWorkouts={sortedWorkouts}
            exerciseOptions={exerciseOptions}
            onAddExercise={addExercise}
            onSave={(updated) => {
              void updateWorkoutFull(updated.id, updated.name, updated.date, updated.sets)
            }}
          />
        ) : isPickingTemplate ? (
          <TemplatePickerScreen
            templates={templates}
            onBack={() => navigate('/miniapps/gym')}
            onCreateCustom={() => {
              void (async () => {
                const w = await addWorkout(date, 'Тренировка')
                navigate(`/miniapps/gym/workout/${w.id}`)
              })()
            }}
            onUseTemplate={(templateId) => {
              void handleUseTemplateForDate(templateId, date)
            }}
          />
        ) : tab === 0 ? (
          <CalendarTab
            workouts={sortedWorkouts}
            selectedDate={date}
            onSelectDate={handleDateChange}
            onEditWorkout={(workoutId) => navigate(`/miniapps/gym/workout/${workoutId}`)}
            onAddWorkout={(forDate) => {
              setDate(forDate)
              navigate('/miniapps/gym/template')
            }}
          />
        ) : null}

        {tab === 1 && <AnalyticsTab entries={entries} periodDays={periodDays} onPeriodChange={setPeriodDays} />}
      </Box>

      {!editingWorkout && !isPickingTemplate && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ maxWidth: (theme) => theme.breakpoints.values.sm, mx: 'auto' }}>
            <BottomNavigation
              showLabels
              value={tab}
              onChange={(_, v) => {
                if (v === 1) {
                  navigate('/miniapps/gym/analytics')
                } else {
                  navigate('/miniapps/gym')
                }
              }}
              sx={{ bgcolor: 'transparent' }}
            >
              <BottomNavigationAction
                label="Календарь"
                icon={<EditNoteIcon />}
              />
              <BottomNavigationAction
                label="Аналитика"
                icon={<AnalyticsIcon />}
              />
            </BottomNavigation>
          </Box>
        </Paper>
      )}
    </Container>
  )
}
