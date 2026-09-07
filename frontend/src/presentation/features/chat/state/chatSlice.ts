import { createSelector, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '../../../../app/store'
import type { SupportProgram } from '../../../../domain/entities/SupportProgram'
import type { SupportProgramCompanyConditions } from '../../../../domain/repositories/SupportProgramRepository'
import { emptyCompanyConditionsDraft, type CompanyConditionsDraft } from '../validation/companyConditionsForm'
import { formatSupportProgramEligibilityCounts } from '../supportProgramEligibility'

export type ChatSearchOptions = {
  acceptingOnly: boolean
  companyConditions?: SupportProgramCompanyConditions
}

export type SupportProgramChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  programs?: SupportProgram[]
  searchOptions?: ChatSearchOptions
}

type ChatSearchStatus = 'idle' | 'pending' | 'failed'

type ChatState = {
  activeRequestId: string | null
  draft: string
  messages: SupportProgramChatMessage[]
  searchError: string | null
  searchStatus: ChatSearchStatus
  searchOptions: ChatSearchOptions
  companyConditionsDraft: CompanyConditionsDraft
}

/** Core API의 query 최대 길이 계약과 일치합니다. */
export const maximumSupportProgramSearchQueryLength = 500

const initialState: ChatState = createInitialState()

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    conversationReset: {
      reducer(_state, action: PayloadAction<{ welcomeMessage: SupportProgramChatMessage }>) {
        return createInitialState(action.payload.welcomeMessage)
      },
      prepare() {
        return { payload: { welcomeMessage: createWelcomeMessage() } }
      },
    },
    draftChanged(state, action: PayloadAction<string>) {
      state.draft = action.payload
      state.searchError = null
    },
    companyConditionDraftChanged(state, action: PayloadAction<{ field: keyof CompanyConditionsDraft; value: string }>) {
      if (state.searchStatus === 'pending') return
      state.companyConditionsDraft[action.payload.field] = action.payload.value
    },
    companyConditionsApplied(state, action: PayloadAction<SupportProgramCompanyConditions>) {
      if (state.searchStatus === 'pending') return
      state.searchOptions.companyConditions = Object.keys(action.payload).length ? action.payload : undefined
      state.companyConditionsDraft = { ...emptyCompanyConditionsDraft(), ...action.payload }
    },
    companyConditionRemoved(state, action: PayloadAction<keyof CompanyConditionsDraft>) {
      if (state.searchStatus === 'pending') return
      delete state.searchOptions.companyConditions?.[action.payload]
      if (Object.keys(state.searchOptions.companyConditions ?? {}).length === 0) {
        state.searchOptions.companyConditions = undefined
      }
      state.companyConditionsDraft[action.payload] = ''
    },
    companyConditionsCleared(state) {
      if (state.searchStatus === 'pending') return
      state.searchOptions = { acceptingOnly: true }
      state.companyConditionsDraft = emptyCompanyConditionsDraft()
    },
    acceptingOnlyChanged(state, action: PayloadAction<boolean>) {
      if (state.searchStatus === 'pending') return
      state.searchOptions.acceptingOnly = action.payload
    },
    searchCancelled(state, action: PayloadAction<{ query: string; requestId: string }>) {
      if (state.activeRequestId !== action.payload.requestId) return
      state.activeRequestId = null
      if (state.draft.trim().length === 0) {
        state.draft = action.payload.query
      }
      state.searchError = null
      state.searchStatus = 'idle'
    },
    searchFailed(state, action: PayloadAction<{ query: string; requestId: string; message?: string }>) {
      if (state.activeRequestId !== action.payload.requestId) return
      state.activeRequestId = null
      if (state.draft.trim().length === 0) {
        state.draft = action.payload.query
      }
      state.searchError = action.payload.message ?? '지원사업을 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      state.searchStatus = 'failed'
    },
    searchTimedOut(state, action: PayloadAction<{ query: string; requestId: string }>) {
      if (state.activeRequestId !== action.payload.requestId) return
      state.activeRequestId = null
      if (state.draft.trim().length === 0) {
        state.draft = action.payload.query
      }
      state.searchError = '검색 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
      state.searchStatus = 'failed'
    },
    searchValidationFailed(state, action: PayloadAction<{ queryLength: number }>) {
      if (state.searchStatus === 'pending') return
      state.searchError = `검색어는 ${maximumSupportProgramSearchQueryLength}자 이하로 입력해 주세요. 현재 ${action.payload.queryLength}자입니다.`
      state.searchStatus = 'idle'
    },
    searchStarted: {
      reducer(
        state,
        action: PayloadAction<{ messageId: string; query: string; requestId: string }>,
      ) {
        if (state.searchStatus === 'pending') return
        state.activeRequestId = action.payload.requestId
        state.draft = ''
        state.messages.push({
          id: action.payload.messageId,
          role: 'user',
          text: action.payload.query,
          searchOptions: copySearchOptions(state.searchOptions),
        })
        state.searchError = null
        state.searchStatus = 'pending'
      },
      prepare(query: string) {
        return {
          payload: {
            messageId: nanoid(),
            query,
            requestId: nanoid(),
          },
        }
      },
    },
    searchSucceeded: {
      reducer(
        state,
        action: PayloadAction<{
          messageId: string
          programs: SupportProgram[]
          requestId: string
        }>,
      ) {
        if (state.activeRequestId !== action.payload.requestId) return
        state.activeRequestId = null
        state.messages.push({
          id: action.payload.messageId,
          role: 'assistant',
          text: createSearchResponseText(action.payload.programs, state.searchOptions.acceptingOnly),
          programs: action.payload.programs,
          searchOptions: copySearchOptions(state.searchOptions),
        })
        state.searchError = null
        state.searchStatus = 'idle'
      },
      prepare(payload: { programs: SupportProgram[]; requestId: string }) {
        return {
          payload: {
            ...payload,
            messageId: nanoid(),
          },
        }
      },
    },
  },
})

export const {
  acceptingOnlyChanged,
  companyConditionDraftChanged,
  companyConditionRemoved,
  companyConditionsApplied,
  companyConditionsCleared,
  conversationReset,
  draftChanged,
  searchCancelled,
  searchFailed,
  searchStarted,
  searchSucceeded,
  searchTimedOut,
  searchValidationFailed,
} = chatSlice.actions

export const selectChatState = (state: RootState) => state.chat
export const selectChatDraft = (state: RootState) => state.chat.draft
export const selectChatMessages = (state: RootState) => state.chat.messages
export const selectChatSearchError = (state: RootState) => state.chat.searchError
export const selectCanRetryChatSearch = (state: RootState) => state.chat.searchStatus === 'failed'
export const selectIsChatSearching = (state: RootState) => state.chat.searchStatus === 'pending'
export const selectConversationCount = createSelector(
  [selectChatMessages],
  (messages) => messages.filter((message) => message.role === 'user').length,
)
export const selectIsReadyToSubmit = createSelector(
  [selectChatDraft, selectIsChatSearching],
  (draft, isSearching) => draft.trim().length > 0 && !isSearching,
)

export default chatSlice.reducer

function createInitialState(welcomeMessage = createWelcomeMessage()): ChatState {
  return {
    activeRequestId: null,
    draft: '',
    messages: [welcomeMessage],
    searchError: null,
    searchStatus: 'idle',
    searchOptions: { acceptingOnly: true },
    companyConditionsDraft: emptyCompanyConditionsDraft(),
  }
}

function createWelcomeMessage(): SupportProgramChatMessage {
  return {
    id: nanoid(),
    role: 'assistant',
    text: '안녕하세요. GovBiz가 현재 접수 중인 정부지원사업을 찾아드릴게요. 지역이나 업종을 포함해 편하게 말씀해 주세요.',
  }
}

function createSearchResponseText(programs: SupportProgram[], acceptingOnly: boolean) {
  return programs.length > 0
    ? `${acceptingOnly ? '현재 접수 중인 공고에서' : '접수 상태 전체에서'} ${formatSupportProgramEligibilityCounts(programs)}을 찾았습니다. 조건 확인은 공식 API 본문 기준이며 최종 신청 자격을 보장하지 않습니다. 확인 필요 공고는 원문 조건을 추가로 확인해 주세요.`
    : '현재 일치하는 공고를 찾지 못했습니다. 지역이나 분야를 바꿔 다시 검색해 보세요.'
}

function copySearchOptions(options: ChatSearchOptions): ChatSearchOptions {
  return {
    acceptingOnly: options.acceptingOnly,
    ...(options.companyConditions ? { companyConditions: { ...options.companyConditions } } : {}),
  }
}
