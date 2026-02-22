import { AnalyticsScreen } from '../../../features/miniapps/expense/analytics/screens/AnalyticsScreen'
import { ExpensesScreen } from '../../../features/miniapps/expense/expenses/screens/ExpensesScreen'
import { ReportsScreen } from '../../../features/miniapps/expense/reports/screens/ReportsScreen'
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

      {model.activeApp === 'expenses' && model.activeTab === 'expenses' ? (
        <ExpensesScreen
          expenses={model.state.expenses}
          tags={model.state.tags}
          total={model.expensesTotal}
          hasMore={!model.isReadOnly && model.state.expenses.length < model.expensesTotal}
          isLoadingMore={model.isExpensesLoadingMore}
          onLoadMore={model.onLoadMoreExpenses}
          onCreateExpense={model.onCreateExpense}
          onUpdateExpense={model.onUpdateExpense}
          onDeleteExpense={model.onDeleteExpense}
          onCreateTag={model.onCreateTag}
          readOnly={model.isReadOnly}
          allowOfflineCreate={model.isOfflineLike}
        />
      ) : null}

      {model.activeApp === 'expenses' && model.activeTab === 'analytics' ? (
        <AnalyticsScreen
          tags={model.state.tags}
          readOnly={model.isReadOnly}
          onUpdateTag={model.onUpdateTag}
          onDeleteTag={model.onDeleteTag}
        />
      ) : null}

      {model.activeApp === 'expenses' && model.activeTab === 'reports' ? (
        <ReportsScreen readOnly={model.isReadOnly} />
      ) : null}

      {model.activeApp === 'workouts' ? (
        <WorkoutsScreen />
      ) : null}
    </>
  )
}
