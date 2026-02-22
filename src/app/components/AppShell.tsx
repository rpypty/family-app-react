import { Container, Stack } from '@mui/material'
import type { AppShellModel } from '../hooks/useAppController'
import { AppFamilyDialog } from './shell/AppFamilyDialog'
import { AppShellExpensesTabs } from './shell/AppShellExpensesTabs'
import { AppShellHeader } from './shell/AppShellHeader'
import { AppShellMainContent } from './shell/AppShellMainContent'
import { AppShellMenu } from './shell/AppShellMenu'
import { AppShellOfflineSyncNotice } from './shell/AppShellOfflineSyncNotice'
import { AppShellSyncAlerts } from './shell/AppShellSyncAlerts'

type AppShellProps = {
  model: AppShellModel
}

export function AppShell({ model }: AppShellProps) {
  return (
    <>
      <AppShellHeader model={model} />
      <AppShellMenu model={model} />
      <AppFamilyDialog model={model} />

      <Container maxWidth="md" sx={{ pt: 2, pb: model.activeApp === 'expenses' ? 12 : 6 }}>
        <Stack spacing={3}>
          <AppShellSyncAlerts model={model} />
          <AppShellMainContent model={model} />
        </Stack>
      </Container>

      <AppShellExpensesTabs model={model} />
      <AppShellOfflineSyncNotice model={model} />
    </>
  )
}
