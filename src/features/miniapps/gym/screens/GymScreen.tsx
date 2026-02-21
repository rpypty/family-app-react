import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Container,
  LinearProgress,
  Paper,
} from '@mui/material'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { useGymData } from '../hooks/useGymData'
import { createWorkoutSet } from '../api/gymStore'
import { todayISO } from '../utils/dateUtils'
import { CalendarTab } from './CalendarTab'
import { AnalyticsTab } from './AnalyticsTab'
import { WorkoutEditScreen } from './WorkoutEditScreen'
import { TemplatePickerScreen } from './TemplatePickerScreen'
import TemplateManagerScreen from './TemplateManagerScreen'
import TemplateEditScreen from './TemplateEditScreen'

type GymScreenProps = {
  readOnly?: boolean
}

export function GymScreen({ readOnly = false }: GymScreenProps) {
  const [date, setDate] = useState<string | null>(null)
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
    if (segments[2] === 'manage') {
      if (segments[3] === 'template' && segments[4]) {
        return { view: 'manage-template' as const, sub: segments[4] }
      }
      return { view: 'manage' as const }
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
  const tab = route.view === 'analytics' ? 1 : route.view === 'manage' ? 2 : 0

  const {
    loading,
    sortedWorkouts,
    exerciseOptions,
    entries,
    templates,
    addWorkout,
    addExercise,
    updateWorkoutFull,
    deleteWorkout,
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

  const handleDateChange = (newDate: string | null) => {
    setDate(newDate)
  }

  const handleUseTemplateForDate = async (templateId: string, forDate: string) => {
    if (readOnly) return
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    const d = (forDate || '').trim() || todayISO()
    setDate(d)
    for (const ex of t.exercises) void addExercise(ex.name)
    const w = await addWorkout(d, t.name)
    // Build sets from template exercises preserving order and per-set weights
    const sets = [] as any[]
    for (const ex of t.exercises) {
      const reps = Number(ex.reps) || 8
      const setsCount = Math.max(1, Number(ex.sets) || 0) || 1
      const weights: number[] | undefined = Array.isArray((ex as any).weights) ? (ex as any).weights : undefined
      for (let i = 0; i < setsCount; i += 1) {
        const weight = weights && weights[i] !== undefined ? Number(weights[i]) || 0 : 0
        sets.push(createWorkoutSet({ exercise: ex.name, weightKg: weight, reps }))
      }
    }
    if (sets.length > 0) {
      await updateWorkoutFull(w.id, w.name, w.date, sets)
    }
    navigate(`/miniapps/gym/workout/${w.id}`)
  }

  return (
    <Container maxWidth="sm" disableGutters>
      <Box sx={{ pb: editingWorkout ? 2 : 10 }}>
        {loading ? <LinearProgress sx={{ mb: 1 }} /> : null}
        {editingWorkout ? (
          <WorkoutEditScreen
            workout={editingWorkout}
            allWorkouts={sortedWorkouts}
            exerciseOptions={exerciseOptions}
            readOnly={readOnly}
            onAddExercise={addExercise}
            onSave={(updated) => {
              void updateWorkoutFull(updated.id, updated.name, updated.date, updated.sets)
            }}
          />
        ) : isPickingTemplate ? (
          <TemplatePickerScreen
            templates={templates}
            readOnly={readOnly}
            onCreateCustom={(name) => {
              if (readOnly) return
              void (async () => {
                const w = await addWorkout(date || todayISO(), name || 'Тренировка')
                navigate(`/miniapps/gym/workout/${w.id}`)
              })()
            }}
            onUseTemplate={(templateId) => {
              void handleUseTemplateForDate(templateId, date || todayISO())
            }}
          />
        ) : route.view === 'manage-template' ? (
          <TemplateEditScreen readOnly={readOnly} />
        ) : route.view === 'manage' ? (
          <TemplateManagerScreen readOnly={readOnly} />
        ) : tab === 0 ? (
          <>
            <CalendarTab
              workouts={sortedWorkouts}
              selectedDate={date}
              onSelectDate={handleDateChange}
              onEditWorkout={(workoutId) => {
                if (readOnly) return
                navigate(`/miniapps/gym/workout/${workoutId}`)
              }}
              onAddWorkout={(forDate) => {
                if (readOnly) return
                setDate(forDate)
                navigate('/miniapps/gym/template')
              }}
              onDeleteWorkout={readOnly ? undefined : deleteWorkout}
              readOnly={readOnly}
            />
          </>
        ) : null}

        {tab === 1 && <AnalyticsTab entries={entries} periodDays={periodDays} onPeriodChange={setPeriodDays} />}
      </Box>

      {!editingWorkout && !isPickingTemplate && (
        <Paper
            elevation={3}
            sx={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'white',
              opacity: 1,
            }}
          >
          <Box sx={{ maxWidth: (theme) => theme.breakpoints.values.sm, mx: 'auto' }}>
            <BottomNavigation
              showLabels
              value={tab}
              onChange={(_, v) => {
                if (v === 1) {
                  navigate('/miniapps/gym/analytics')
                } else if (v === 2) {
                  navigate('/miniapps/gym/manage')
                } else {
                  navigate('/miniapps/gym')
                }
              }}
              sx={{ bgcolor: 'white' }}
            >
              <BottomNavigationAction
                label="Календарь"
                icon={<EditNoteIcon />}
              />
              <BottomNavigationAction
                label="Аналитика"
                icon={<AnalyticsIcon />}
              />
              <BottomNavigationAction
                label="Шаблоны"
                icon={<ListAltIcon />}
              />
            </BottomNavigation>
          </Box>
        </Paper>
      )}
    </Container>
  )
}
