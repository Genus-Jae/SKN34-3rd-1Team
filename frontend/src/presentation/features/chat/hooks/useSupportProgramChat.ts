import { useEffect, useRef, useState } from 'react'

import { appContainer } from '../../../../app/appContainer'
import { useAppDispatch, useAppSelector } from '../../../../app/hooks'
import type { AppDispatch, RootState } from '../../../../app/store'
import type { SearchSupportProgramsUseCase } from '../../../../domain/usecases/SearchSupportProgramsUseCase'
import { SupportProgramRequestError } from '../../../../domain/errors/SupportProgramRequestError'
import { supportProgramRequestFailureMessage } from '../../../shared/support-program/supportProgramRequestFailureMessage'
import {
  acceptingOnlyChanged,
  companyConditionDraftChanged,
  companyConditionRemoved,
  companyConditionsApplied,
  companyConditionsCleared,
  conversationReset,
  draftChanged,
  maximumSupportProgramSearchQueryLength,
  searchCancelled,
  searchFailed,
  searchStarted,
  searchSucceeded,
  searchTimedOut,
  searchValidationFailed,
  selectCanRetryChatSearch,
  selectChatDraft,
  selectChatMessages,
  selectChatSearchError,
  selectChatState,
  selectConversationCount,
  selectIsChatSearching,
  selectIsReadyToSubmit,
} from '../state/chatSlice'
import { validateCompanyConditions, type CompanyConditionsDraft } from '../validation/companyConditionsForm'

export const supportProgramChatSuggestions = [
  '서울 AI 창업지원 사업 찾아줘',
  '현재 접수 중인 수출 지원사업 알려줘',
  '제조기업 R&D 사업을 찾아줘',
]

/** 순차 의미 검색(30초)·점수화(35초)에 여유를 두고 검색 요청 시간을 제한합니다. */
export const supportProgramSearchTimeoutMilliseconds = 70_000

type SupportProgramSearchUseCase = Pick<SearchSupportProgramsUseCase, 'execute'>

/** 채팅의 Redux 상태와 검색 요청·취소 수명을 관리하는 내부 훅입니다. */
export function useSupportProgramChat(
  searchSupportProgramsUseCase: SupportProgramSearchUseCase = appContainer.resolve('searchSupportProgramsUseCase')
) {
  const dispatchToStore = useAppDispatch()
  const activeSearchRequest = useRef<{
    controller: AbortController
    query: string
    requestId: string
    timeoutId: ReturnType<typeof setTimeout>
  } | null>(null)
  const conversationCount = useAppSelector(selectConversationCount)
  const draft = useAppSelector(selectChatDraft)
  const isReadyToSubmit = useAppSelector(selectIsReadyToSubmit)
  const isSearching = useAppSelector(selectIsChatSearching)
  const messages = useAppSelector(selectChatMessages)
  const canRetrySearch = useAppSelector(selectCanRetryChatSearch)
  const searchError = useAppSelector(selectChatSearchError)
  const searchOptions = useAppSelector((state) => state.chat.searchOptions)
  const companyConditionsDraft = useAppSelector((state) => state.chat.companyConditionsDraft)
  const [conditionsError, setConditionsError] = useState<string | null>(null)

  useEffect(() => () => {
    const currentRequest = activeSearchRequest.current
    activeSearchRequest.current = null
    if (!currentRequest) return

    clearTimeout(currentRequest.timeoutId)
    currentRequest.controller.abort()
    dispatchToStore(searchCancelled({
      query: currentRequest.query,
      requestId: currentRequest.requestId,
    }))
  }, [dispatchToStore])

  function startNewConversation() {
    setConditionsError(null)
    const currentRequest = activeSearchRequest.current
    activeSearchRequest.current = null
    if (currentRequest) {
      clearTimeout(currentRequest.timeoutId)
      currentRequest.controller.abort()
    }
    dispatchToStore(conversationReset())
  }

  function cancelSearch() {
    const currentRequest = activeSearchRequest.current
    activeSearchRequest.current = null
    if (!currentRequest) return

    clearTimeout(currentRequest.timeoutId)
    currentRequest.controller.abort()
    dispatchToStore(searchCancelled({
      query: currentRequest.query,
      requestId: currentRequest.requestId,
    }))
  }

  function selectSuggestion(suggestion: string) {
    dispatchToStore(draftChanged(suggestion))
  }

  function updateDraft(value: string) {
    dispatchToStore(draftChanged(value))
  }

  function updateCompanyCondition(field: keyof CompanyConditionsDraft, value: string) {
    dispatchToStore(companyConditionDraftChanged({ field, value }))
    setConditionsError(null)
  }

  function applyCompanyConditions() {
    const validation = validateCompanyConditions(companyConditionsDraft)
    setConditionsError(validation.error)
    if (validation.conditions) dispatchToStore(companyConditionsApplied(validation.conditions))
  }

  function removeCompanyCondition(field: keyof CompanyConditionsDraft) {
    dispatchToStore(companyConditionRemoved(field))
    setConditionsError(null)
  }

  function clearCompanyConditions() {
    dispatchToStore(companyConditionsCleared())
    setConditionsError(null)
  }

  function updateAcceptingOnly(value: boolean) {
    dispatchToStore(acceptingOnlyChanged(value))
  }

  function submitMessage() {
    async function runSupportProgramSearch(
      dispatchAction: AppDispatch,
      readCurrentState: () => RootState,
    ): Promise<void> {
      const currentState = readCurrentState()
      const currentChatState = selectChatState(currentState)
      const searchQuery = currentChatState.draft.trim()

      if (searchQuery.length === 0) return
      if (currentChatState.searchStatus === 'pending') return
      if (searchQuery.length > maximumSupportProgramSearchQueryLength) {
        dispatchAction(searchValidationFailed({ queryLength: searchQuery.length }))
        return
      }

      const searchStartedAction = searchStarted(searchQuery)
      const requestController = new AbortController()
      const requestId = searchStartedAction.payload.requestId

      dispatchAction(searchStartedAction)
      const timeoutId = setTimeout(() => {
        if (activeSearchRequest.current?.requestId !== requestId) return

        activeSearchRequest.current = null
        dispatchAction(searchTimedOut({ query: searchQuery, requestId }))
        requestController.abort()
      }, supportProgramSearchTimeoutMilliseconds)
      activeSearchRequest.current = {
        controller: requestController,
        query: searchQuery,
        requestId,
        timeoutId,
      }

      try {
        const searchResult = await searchSupportProgramsUseCase.execute(
          { query: searchQuery, ...currentChatState.searchOptions },
          requestController.signal,
        )

        if (requestController.signal.aborted) return

        const searchSucceededAction = searchSucceeded({
          programs: searchResult.programs,
          requestId,
        })
        dispatchAction(searchSucceededAction)
      } catch (error) {
        if (requestController.signal.aborted) return

        const searchFailedAction = searchFailed({
          query: searchQuery,
          requestId,
          message: error instanceof SupportProgramRequestError
            ? supportProgramRequestFailureMessage(error)
            : undefined,
        })
        dispatchAction(searchFailedAction)
      } finally {
        const currentRequest = activeSearchRequest.current
        if (currentRequest?.requestId === requestId) {
          clearTimeout(currentRequest.timeoutId)
          activeSearchRequest.current = null
        }
      }
    }

    return dispatchToStore(runSupportProgramSearch)
  }

  return {
    searchOptions,
    companyConditionsDraft,
    conditionsError,
    updateCompanyCondition,
    applyCompanyConditions,
    removeCompanyCondition,
    clearCompanyConditions,
    updateAcceptingOnly,
    conversationCount,
    canRetrySearch,
    draft,
    isReadyToSubmit,
    isSearching,
    messages,
    cancelSearch,
    searchError,
    selectSuggestion,
    startNewConversation,
    submitMessage,
    updateDraft,
  }
}
