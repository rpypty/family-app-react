import { ExpensesMovedScreen } from '../../../features/miniapps/expense/screens/ExpensesMovedScreen'
import { TodoScreen } from '../../../features/miniapps/todo/screens/TodoScreen'
import { WorkoutsScreen } from '../../../features/miniapps/workouts/screens/WorkoutsScreen'
import { MiniAppsScreen } from '../../../features/home/screens/MiniAppsScreen'
import type { AppShellModel } from '../../hooks/useAppController'

type AppShellMainContentProps = {
  model: AppShellModel
}

export function AppShellMainContent({ model }: AppShellMainContentProps) {
  return (
    <>
      {model.activeApp === 'home' ? (
        <MiniAppsScreen
          onOpenExpenses={model.onOpenExpenses}
          onOpenTodo={model.onOpenTodo}
          onOpenWorkouts={model.onOpenWorkouts}
        />
      ) : null}

      {model.activeApp === 'todo' ? (
        <TodoScreen
          lists={model.state.todoLists}
          readOnly={model.isReadOnly}
          onCreateList={model.onCreateTodoList}
          onDeleteList={model.onDeleteTodoList}
          onToggleArchiveSetting={model.onToggleTodoListArchiveSetting}
          onToggleCollapsed={model.onToggleTodoListCollapsed}
          onMoveList={model.onMoveTodoList}
          onCreateItem={model.onCreateTodoItem}
          onToggleItem={model.onToggleTodoItem}
          onUpdateItemTitle={model.onUpdateTodoItemTitle}
          onDeleteItem={model.onDeleteTodoItem}
          allowOfflineItemCreate={model.isOfflineLike}
          allowOfflineItemToggle={model.isOfflineLike}
        />
      ) : null}

      {/* Расходы переехали в «Купилку» на kupilka.site: весь мини-апп, на любой
          его вкладке и по любой старой ссылке, показывает только объявление. */}
      {model.activeApp === 'expenses' ? <ExpensesMovedScreen /> : null}

      {model.activeApp === 'workouts' ? (
        <WorkoutsScreen />
      ) : null}
    </>
  )
}
