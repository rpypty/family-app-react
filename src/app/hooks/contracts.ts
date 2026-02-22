import type { Dispatch, SetStateAction } from 'react'
import type { AuthSession, AuthUser } from '../../features/auth/api/auth'
import type { Family } from '../../features/family/api/families'

export type AuthFamilySetters = {
  setAuthSession: Dispatch<SetStateAction<AuthSession | null>>
  setAuthUser: Dispatch<SetStateAction<AuthUser | null>>
  setFamilyId: Dispatch<SetStateAction<string | null>>
  setFamily: Dispatch<SetStateAction<Family | null>>
}
