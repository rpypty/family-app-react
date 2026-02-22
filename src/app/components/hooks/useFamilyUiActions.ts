import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { leaveFamily, listFamilyMembers, removeFamilyMember, type Family } from '../../../features/family/api/families'
import { signOut, type AuthUser } from '../../../features/auth/api/auth'
import { copyToClipboard } from '../../../shared/lib/clipboard'
import type { FamilyMember } from '../../../features/family/api/families'

type UseFamilyUiActionsParams = {
  state: {
    authUser: AuthUser | null
    family: Family | null
    familyId: string | null
    isReadOnly: boolean
  }
  mutators: {
    guardReadOnly: () => boolean
  }
  callbacks: {
    onSignedOut: () => void
    onFamilyLeft: () => void
  }
}

export function useFamilyUiActions({
  state: {
    authUser,
    family,
    familyId,
    isReadOnly,
  },
  mutators: {
    guardReadOnly,
  },
  callbacks: {
    onSignedOut,
    onFamilyLeft,
  },
}: UseFamilyUiActionsParams) {
  const [isCopyingFamilyCode, setCopyingFamilyCode] = useState(false)
  const [isFamilyDialogOpen, setFamilyDialogOpen] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [familyMembersLoading, setFamilyMembersLoading] = useState(false)
  const [familyMembersError, setFamilyMembersError] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    let isActive = true
    const loadMembers = async () => {
      if (!isFamilyDialogOpen) return
      setFamilyMembersLoading(true)
      setFamilyMembersError(null)
      if (isReadOnly) {
        if (!isActive) return
        setFamilyMembers([])
        setFamilyMembersError('Нет соединения. Доступ только для просмотра.')
        setFamilyMembersLoading(false)
        return
      }
      try {
        const members = await listFamilyMembers()
        if (!isActive) return
        setFamilyMembers(members)
      } catch {
        if (!isActive) return
        setFamilyMembersError('Не удалось загрузить список участников.')
        setFamilyMembers([])
      } finally {
        if (isActive) setFamilyMembersLoading(false)
      }
    }

    void loadMembers()
    return () => {
      isActive = false
    }
  }, [isFamilyDialogOpen, isReadOnly])

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleSignOut = async () => {
    await signOut()
    onSignedOut()
    setMenuAnchorEl(null)
    setFamilyDialogOpen(false)
    setFamilyMembers([])
    setFamilyMembersError(null)
  }

  const handleLeaveFamily = async () => {
    if (!authUser || !familyId) {
      setMenuAnchorEl(null)
      return
    }
    await leaveFamily()
    onFamilyLeft()
    setMenuAnchorEl(null)
    setFamilyDialogOpen(false)
    setFamilyMembers([])
    setFamilyMembersError(null)
  }

  const handleCopyFamilyCode = async (event?: MouseEvent<HTMLElement>) => {
    if (event) {
      event.stopPropagation()
    }
    if (!family?.code) return
    setCopyingFamilyCode(true)
    try {
      await copyToClipboard(family.code)
    } finally {
      setCopyingFamilyCode(false)
    }
  }

  const handleOpenFamilyDialog = () => {
    setMenuAnchorEl(null)
    setFamilyDialogOpen(true)
  }

  const handleCloseFamilyDialog = () => {
    setFamilyDialogOpen(false)
  }

  const handleRemoveMember = async (member: FamilyMember) => {
    if (!family || member.role === 'owner') return
    if (guardReadOnly()) return
    setRemovingMemberId(member.userId)
    setFamilyMembersError(null)
    try {
      await removeFamilyMember(member.userId)
      setFamilyMembers((prev) => prev.filter((item) => item.userId !== member.userId))
    } catch {
      setFamilyMembersError('Не удалось исключить участника.')
    } finally {
      setRemovingMemberId(null)
    }
  }

  return {
    isCopyingFamilyCode,
    isFamilyDialogOpen,
    familyMembers,
    familyMembersLoading,
    familyMembersError,
    removingMemberId,
    menuAnchorEl,
    handleMenuOpen,
    handleMenuClose,
    handleSignOut,
    handleLeaveFamily,
    handleCopyFamilyCode,
    handleOpenFamilyDialog,
    handleCloseFamilyDialog,
    handleRemoveMember,
  }
}
