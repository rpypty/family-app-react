import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Fab,
  IconButton,
  List,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { useGymData } from '../hooks/useGymData'

type TemplateManagerScreenProps = {
  readOnly?: boolean
}

export function TemplateManagerScreen({ readOnly = false }: TemplateManagerScreenProps) {
  const navigate = useNavigate()
  const { templates, exercises, deleteTemplate, addExercise, deleteExercise } = useGymData()
  const [mode, setMode] = useState<'templates' | 'exercises'>('templates')
  const [query, setQuery] = useState('')
  const canEdit = !readOnly

  // Templates UI state (editing opens full-page editor)

  // Exercise UI state
  const [editingExercise, setEditingExercise] = useState<string | null>(null)
  const [exerciseDraftName, setExerciseDraftName] = useState('')
  const [isExerciseDialogOpen, setExerciseDialogOpen] = useState(false)

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((t) => t.name.toLowerCase().includes(q))
  }, [templates, query])

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter((e) => e.toLowerCase().includes(q))
  }, [exercises, query])

  const openNewTemplate = () => {
    if (readOnly) return
    // navigate to full-page editor
    navigate('/miniapps/gym/manage/template/new')
  }

  const openEditTemplate = (id: string) => {
    if (readOnly) return
    navigate(`/miniapps/gym/manage/template/${id}`)
  }

  // saving handled in full-page editor

  const openNewExercise = () => {
    if (readOnly) return
    setEditingExercise(null)
    setExerciseDraftName('')
    setExerciseDialogOpen(true)
  }

  const openEditExercise = (name: string) => {
    if (readOnly) return
    setEditingExercise(name)
    setExerciseDraftName(name)
    setExerciseDialogOpen(true)
  }

  const saveExercise = async () => {
    if (readOnly) return
    const name = exerciseDraftName.trim()
    if (!name) return
    if (!editingExercise) {
      await addExercise(name)
    } else {
      // rename: delete old and add new
      // simple approach: add new then user can remove old
      await addExercise(name)
    }
    setExerciseDialogOpen(false)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant={mode === 'templates' ? 'contained' : 'outlined'} onClick={() => setMode('templates')}>Шаблоны тренировок</Button>
          <Button variant={mode === 'exercises' ? 'contained' : 'outlined'} onClick={() => setMode('exercises')}>Упражнения</Button>
        </Box>

        <TextField value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === 'templates' ? 'Поиск шаблонов' : 'Поиск упражнений'} fullWidth />

        {mode === 'templates' ? (
          <List disablePadding>
            {filteredTemplates.map((t) => (
              <Card
                key={t.id}
                variant="outlined"
                sx={{ mb: 1 }}
                onPointerDown={(e) => ((e.currentTarget as any).__startX = (e as any).clientX)}
                onPointerUp={(e) => {
                  if (readOnly) return
                  const start = (e.currentTarget as any).__startX
                  const dx = start ? ((e as any).clientX - start) : 0
                  if (dx < -60) {
                    // swipe left -> delete
                    deleteTemplate(t.id)
                  }
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }} onClick={() => openEditTemplate(t.id)}>
                    <Typography variant="body1" fontWeight={700}>{t.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{(t.exercises || []).length} упр.</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEditTemplate(t.id)} disabled={!canEdit}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteTemplate(t.id)} disabled={!canEdit}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        ) : (
          <List disablePadding>
            {filteredExercises.map((e) => (
              <Card
                key={e}
                variant="outlined"
                sx={{ mb: 1 }}
                onPointerDown={(ev) => ((ev.currentTarget as any).__startX = (ev as any).clientX)}
                onPointerUp={(ev) => {
                  if (readOnly) return
                  const start = (ev.currentTarget as any).__startX
                  const dx = start ? ((ev as any).clientX - start) : 0
                  if (dx < -60) {
                    deleteExercise(e)
                  }
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }} onClick={() => openEditExercise(e)}>
                    <Typography variant="body1" fontWeight={700}>{e}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEditExercise(e)} disabled={!canEdit}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => {
                      // @ts-ignore
                      deleteExercise(e)
                    }} disabled={!canEdit}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </Stack>

      {canEdit ? (
        <Fab
          variant="extended"
          color="primary"
          sx={{ position: 'fixed', right: 16, bottom: 88 }}
          onClick={() => (mode === 'templates' ? openNewTemplate() : openNewExercise())}
        >
          <AddIcon />
          <Box sx={{ ml: 1, fontWeight: 600 }}>
            {mode === 'templates' ? 'Создать шаблон' : 'Создать упражнение'}
          </Box>
        </Fab>
      ) : null}

      {/* Template editing uses the full-page editor at /miniapps/gym/manage/template/:id */}

      <Dialog open={isExerciseDialogOpen} onClose={() => setExerciseDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingExercise ? 'Редактировать упражнение' : 'Новое упражнение'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus value={exerciseDraftName} onChange={(e) => setExerciseDraftName(e.target.value)} fullWidth sx={{ mt: 1 }} disabled={readOnly} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveExercise} disabled={readOnly || !exerciseDraftName.trim()}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TemplateManagerScreen
