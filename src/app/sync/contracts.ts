import type { Dispatch, SetStateAction } from 'react'
import type { DataSyncStatus } from './types'

export type DataSyncSetters = {
  setDataSyncStatus: Dispatch<SetStateAction<DataSyncStatus>>
  setSyncInFlight: Dispatch<SetStateAction<boolean>>
  setManualRetrying: Dispatch<SetStateAction<boolean>>
  setSyncErrorMessage: Dispatch<SetStateAction<string | null>>
  setDataStale: Dispatch<SetStateAction<boolean>>
  setLastSyncAt: Dispatch<SetStateAction<string | null>>
  setExpensesTotal: Dispatch<SetStateAction<number>>
  setExpensesOffset: Dispatch<SetStateAction<number>>
  setExpensesLoadingMore: Dispatch<SetStateAction<boolean>>
  setOfflineSyncNoticeOpen: Dispatch<SetStateAction<boolean>>
}
