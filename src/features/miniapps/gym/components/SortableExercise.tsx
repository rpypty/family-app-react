import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ExerciseGroup from './ExerciseGroup'

type SetLike = { id: string; weightKg: number; reps: number }
type DraftExercise = { name: string; sets: SetLike[] }

type Props = {
  item: DraftExercise
  onAddSet: (name: string) => void
  onRemoveSet: (exerciseName: string, setId: string) => void
  onUpdateSet: (exerciseName: string, setId: string, field: 'weightKg' | 'reps', value: any) => void
  onRemoveExercise: (name: string) => void
}

export function SortableExercise({ item, onAddSet, onRemoveSet, onUpdateSet, onRemoveExercise }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.name })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ExerciseGroup
        name={item.name}
        sets={item.sets}
        onAddSet={() => onAddSet(item.name)}
        onRemoveSet={(setId) => onRemoveSet(item.name, setId)}
        onUpdateSet={(setId, field, value) => onUpdateSet(item.name, setId, field, value)}
        onRemoveExercise={() => onRemoveExercise(item.name)}
      />
    </div>
  )
}

export default SortableExercise
