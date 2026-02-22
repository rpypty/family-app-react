import { isSupabaseConfigured } from '../../features/auth/api/auth'
import { AuthScreen } from '../../features/auth/screens/AuthScreen'
import { FamilyScreen } from '../../features/family/screens/FamilyScreen'
import { AppLoadingScreen } from '../../features/onboarding/screens/AppLoadingScreen'
import { OfflineBlockedScreen } from '../../features/onboarding/screens/OfflineBlockedScreen'
import type { AppGateModel, AppShellModel } from '../hooks/useAppController'
import { AppShell } from './AppShell'

type AppGateProps = {
  gate: AppGateModel
  shell: AppShellModel
}

export function AppGate({ gate, shell }: AppGateProps) {
  const canRenderFromCache = gate.hasResolvedAppContext
  if (gate.isBootstrapping && !canRenderFromCache) {
    return <AppLoadingScreen />
  }

  const isUnauthenticated = !gate.authSession || !gate.authUser
  const shouldShowConnectionError =
    isUnauthenticated && (gate.isOffline || gate.dataSyncStatus === 'offline')
  if (shouldShowConnectionError) {
    return <OfflineBlockedScreen />
  }

  if (isUnauthenticated) {
    return <AuthScreen onSignIn={gate.onSignIn} isConfigured={isSupabaseConfigured} />
  }

  if (!gate.familyId) {
    return <FamilyScreen onComplete={gate.onFamilyComplete} />
  }

  return <AppShell model={shell} />
}
