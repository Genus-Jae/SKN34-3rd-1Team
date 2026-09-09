import { configureStore } from '@reduxjs/toolkit'

import chatReducer from '../presentation/features/chat/state/chatSlice'
import authReducer from '../presentation/shared/auth/state/authSlice'
import receivedProposalsReducer from '../presentation/shared/partner-proposal/state/receivedProposalsSlice'
import sampleItemReducer from '../presentation/features/sample-item/state/sampleItemSlice'

export function createAppStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      chat: chatReducer,
      receivedProposals: receivedProposalsReducer,
      sampleItem: sampleItemReducer,
    },
  })
}

export type AppStore = ReturnType<typeof createAppStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
