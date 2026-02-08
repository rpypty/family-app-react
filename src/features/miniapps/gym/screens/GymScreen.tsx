import { useMemo, useState } from 'react'
import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  CircularProgress,
  Container,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ViewListIcon from '@mui/icons-material/ViewList'
import { useGymData } from '../hooks/useGymData'
import { todayISO } from '../utils/dateUtils'
import type { TemplateExercise } from '../types'
import { LogTab } from './LogTab'
import { WorkoutsTab } from './WorkoutsTab'
import { AnalyticsTab } from './AnalyticsTab'

type GymScreenProps = {
  onBack: () => void
}

export function GymScreen({ onBack }: GymScreenProps) {
  const [tab, setTab] = useState(0)
  const [date, setDate] = useState(todayISO())
  const [activeTemplateExercises, setActiveTemplateExercises] = useState<TemplateExercise[] | null>(null)
  const [periodDays, setPeriodDays] = useState(30)

  const {
    loading,
    sortedWorkouts,
    selectedWorkout,
    selectedWorkoutId,
    setSelectedWorkoutId,
    exerciseOptions,
    selectedWorkoutGroups,
    selectedWorkoutTotalVolume,
    entries,
    templates,
    addWorkout,
    addSets,
    deleteWorkout,
    deleteWorkoutSet,
    deleteOneWorkoutSetBySignature,
    addExercise,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  } = useGymData()

  const workoutsForSelectedDate = useMemo(() => {
    return sortedWorkouts.filter((w) => w.date === date)
  }, [sortedWorkouts, date])

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    setActiveTemplateExercises(null)
    if (selectedWorkout && selectedWorkout.date !== newDate) {
      setSelectedWorkoutId('')
    }
  }

  const handleSelectWorkout = (id: string) => {
    setSelectedWorkoutId(id)
    setActiveTemplateExercises(null)
  }

  const handleCreateWorkout = async (name: string) => {
    const workout = await addWorkout(date, name)
    setSelectedWorkoutId(workout.id)
    setActiveTemplateExercises(null)
  }

  const handleUseTemplate = async (templateId: string) => {
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    const d = todayISO()
    setDate(d)
    for (const ex of t.exercises) void addExercise(ex.name)
    const workout = await addWorkout(d, t.name)
    setSelectedWorkoutId(workout.id)
    setActiveTemplateExercises(t.exercises)
    setTab(0)
  }

  const handleUseTemplateForDate = async (templateId: string, forDate: string) => {
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    const d = (forDate || '').trim() || todayISO()
    setDate(d)
    for (const ex of t.exercises) void addExercise(ex.name)
    const workout = await addWorkout(d, t.name)
    setSelectedWorkoutId(workout.id)
    setActiveTemplateExercises(t.exercises)
    setTab(0)
  }

  const handleAddSets = async (exercise: string, weightKg: number, reps: number, count: number) => {
    if (!selectedWorkoutId) return
    await addSets(selectedWorkoutId, exercise, weightKg, reps, count)
  }

  const handleDeleteOneSet = async (exerciseName: string, reps: number, weight: number) => {
    if (!selectedWorkoutId) return
    await deleteOneWorkoutSetBySignature(selectedWorkoutId, exerciseName, reps, weight)
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
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Тренировки
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ pb: 10 }}>
        {tab === 0 && (
          <LogTab
            date={date}
            onDateChange={handleDateChange}
            workoutsForDate={workoutsForSelectedDate}
            selectedWorkout={selectedWorkout}
            onSelectWorkout={handleSelectWorkout}
            onCreateWorkout={handleCreateWorkout}
            templates={templates}
            onUseTemplate={(templateId) => void handleUseTemplateForDate(templateId, date)}
            exerciseOptions={exerciseOptions}
            onAddSets={handleAddSets}
            onAddExercise={addExercise}
            selectedWorkoutGroups={selectedWorkoutGroups}
            selectedWorkoutTotalVolume={selectedWorkoutTotalVolume}
            onDeleteOneSet={handleDeleteOneSet}
            templateExercises={activeTemplateExercises || undefined}
            allWorkouts={sortedWorkouts}
          />
        )}

        {tab === 1 && (
          <WorkoutsTab
            sortedWorkouts={sortedWorkouts}
            onDeleteWorkout={deleteWorkout}
            onDeleteWorkoutSet={deleteWorkoutSet}
            exerciseOptions={exerciseOptions}
            templates={templates}
            onCreateTemplate={(name, exercises) => {
              void addTemplate(name, exercises)
              for (const ex of exercises) void addExercise(ex.name)
            }}
            onUpdateTemplate={(id, name, exercises) => {
              void updateTemplate(id, name, exercises)
              for (const ex of exercises) void addExercise(ex.name)
            }}
            onDeleteTemplate={(id) => void deleteTemplate(id)}
            onUseTemplate={(id) => void handleUseTemplate(id)}
          />
        )}

        {tab === 2 && <AnalyticsTab entries={entries} periodDays={periodDays} onPeriodChange={setPeriodDays} />}
      </Box>

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
            onChange={(_, v) => setTab(v)}
            sx={{ bgcolor: 'transparent' }}
          >
            <BottomNavigationAction
              label="Журнал"
              icon={<EditNoteIcon />}
            />
            <BottomNavigationAction
              label="История"
              icon={<ViewListIcon />}
            />
            <BottomNavigationAction
              label="Аналитика"
              icon={<AnalyticsIcon />}
            />
          </BottomNavigation>
        </Box>
      </Paper>
    </Container>
  )
}
