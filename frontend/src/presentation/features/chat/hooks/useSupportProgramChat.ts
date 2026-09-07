import { useEffect, useRef, useState } from 'react'

import { appContainer } from '../../../../app/appContainer'
import { useAppDispatch, useAppSelector } from '../../../../app/hooks'
import type { AppDispatch, RootState } from '../../../../app/store'
import type { SearchSupportProgramsUseCase } from '../../../../domain/usecases/SearchSupportProgramsUseCase'
import type { InterpretSupportProgramConversationUseCase } from '../../../../domain/usecases/InterpretSupportProgramConversationUseCase'
import type { SupportProgramInterpretRequest } from '../../../../domain/entities/SupportProgramConversation'
import type { SupportProgramSearch } from '../../../../domain/repositories/SupportProgramRepository'
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
  interpretationStarted,
  interpretationSucceeded,
  interpretationFailed,
  interpretationDismissed,
  proposalConfirmed,
  selectConversationContext,
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
export const supportProgramInterpretationTimeoutMilliseconds = 40_000

type SupportProgramSearchUseCase = Pick<SearchSupportProgramsUseCase, 'execute'>

/** 채팅의 Redux 상태와 검색 요청·취소 수명을 관리하는 내부 훅입니다. */
export function useSupportProgramChat(
  searchSupportProgramsUseCase: SupportProgramSearchUseCase = appContainer.resolve('searchSupportProgramsUseCase'),
  interpretConversationUseCase: Pick<InterpretSupportProgramConversationUseCase, 'execute'> = appContainer.resolve('interpretSupportProgramConversationUseCase'),
) {
  const dispatchToStore = useAppDispatch()
  const activeSearchRequest = useRef<{
    controller: AbortController
    query: string
    requestId: string
    timeoutId: ReturnType<typeof setTimeout>
  } | null>(null)
  const activeInterpretationRequest = useRef<{
    controller: AbortController; requestId: string; timeoutId: ReturnType<typeof setTimeout>
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
  const interpretation = useAppSelector((state) => state.chat.interpretation)
  const pendingClarification = useAppSelector((state) => state.chat.pendingClarification)
  const conversationQuery = useAppSelector((state) => state.chat.conversationQuery)
  const confirmedContext = {
    query: conversationQuery, acceptingOnly: searchOptions.acceptingOnly,
    companyConditions: { region: searchOptions.companyConditions?.region ?? null,
      industry: searchOptions.companyConditions?.industry ?? null,
      establishedOn: searchOptions.companyConditions?.establishedOn ?? null,
      supportPurpose: searchOptions.companyConditions?.supportPurpose ?? null },
  }
  const isInterpreting = interpretation.status === 'pending'
  const [conditionsError, setConditionsError] = useState<string | null>(null)

  useEffect(() => () => {
    const interpreting = activeInterpretationRequest.current
    activeInterpretationRequest.current = null
    if (interpreting) {
      clearTimeout(interpreting.timeoutId)
      interpreting.controller.abort()
      dispatchToStore(interpretationDismissed())
    }
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
    stopInterpretationRequest()
    const currentRequest = activeSearchRequest.current
    activeSearchRequest.current = null
    if (currentRequest) {
      clearTimeout(currentRequest.timeoutId)
      currentRequest.controller.abort()
    }
    dispatchToStore(conversationReset())
  }

  function cancelSearch() {
    if (activeInterpretationRequest.current) {
      cancelInterpretation()
      return
    }
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

  function stopInterpretationRequest() {
    const current = activeInterpretationRequest.current
    activeInterpretationRequest.current = null
    if (current) {
      clearTimeout(current.timeoutId)
      current.controller.abort()
    }
  }

  function cancelInterpretation() {
    stopInterpretationRequest()
    dispatchToStore(interpretationDismissed())
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

  function runSearch(command: SupportProgramSearch, messageId?: string) {
    async function runSupportProgramSearch(
      dispatchAction: AppDispatch,
      readCurrentState: () => RootState,
    ): Promise<void> {
      const currentState = readCurrentState()
      const currentChatState = selectChatState(currentState)
      const searchQuery = command.query.trim()

      if (searchQuery.length === 0) return
      if (currentChatState.searchStatus === 'pending' || currentChatState.interpretation.status === 'pending') return
      if (searchQuery.length > maximumSupportProgramSearchQueryLength) {
        dispatchAction(searchValidationFailed({ queryLength: searchQuery.length }))
        return
      }

      const searchStartedAction = searchStarted(searchQuery, {
        acceptingOnly: command.acceptingOnly ?? true,
        companyConditions: command.companyConditions,
      }, messageId)
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
          { ...command, query: searchQuery },
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

  function runInterpretation(request: SupportProgramInterpretRequest, messageId?: string) {
    return dispatchToStore(async (dispatch: AppDispatch, getState: () => RootState) => {
      const state = getState().chat
      if (state.searchStatus === 'pending' || state.interpretation.status === 'pending') return
      const started = interpretationStarted(request, messageId)
      const requestId = started.payload.requestId
      const controller = new AbortController()
      dispatch(started)
      const timeoutId = setTimeout(() => {
        if (activeInterpretationRequest.current?.requestId !== requestId) return
        activeInterpretationRequest.current = null
        dispatch(interpretationFailed({ requestId, message: '조건 해석 시간이 초과되었습니다. 다시 해석해 주세요.' }))
        controller.abort()
      }, supportProgramInterpretationTimeoutMilliseconds)
      activeInterpretationRequest.current = { controller, requestId, timeoutId }
      try {
        const result = await interpretConversationUseCase.execute(request, controller.signal)
        if (!controller.signal.aborted) dispatch(interpretationSucceeded({ requestId, result }))
      } catch (error) {
        if (!controller.signal.aborted) dispatch(interpretationFailed({ requestId, message:
          error instanceof SupportProgramRequestError ? supportProgramRequestFailureMessage(error)
            : '메시지의 조건 변경을 해석하지 못했습니다. 다시 해석해 주세요.',
        }))
      } finally {
        if (activeInterpretationRequest.current?.requestId === requestId) {
          clearTimeout(timeoutId)
          activeInterpretationRequest.current = null
        }
      }
    })
  }

  function submitMessage() {
    return dispatchToStore((_dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
      const state = getState()
      const message = state.chat.draft
      if (!message.trim() || state.chat.searchStatus === 'pending' || state.chat.interpretation.status === 'pending') return Promise.resolve()
      if (message.length > maximumSupportProgramSearchQueryLength) {
        dispatchToStore(searchValidationFailed({ queryLength: message.length }))
        return Promise.resolve()
      }
      return runInterpretation({ message, context: selectConversationContext(state), pendingClarification: state.chat.pendingClarification })
    })
  }

  function retryInterpretation() {
    return dispatchToStore((_dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
      const current = getState().chat.interpretation
      return current.status === 'failed' && current.request
        ? runInterpretation(current.request, current.messageId) : Promise.resolve()
    })
  }

  function confirmInterpretation() {
    return dispatchToStore((dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
      const current = getState().chat.interpretation
      if (current.status !== 'ready' || !current.requestId || !current.result?.proposedContext.query) return Promise.resolve()
      setConditionsError(null)
      dispatch(proposalConfirmed(current.requestId))
      const command = getState().chat.confirmedSearch
      return command ? runSearch(command, current.messageId) : Promise.resolve()
    })
  }

  function retrySearch() {
    return dispatchToStore((_dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
      const state = getState().chat
      return state.searchStatus === 'failed' && state.confirmedSearch
        ? runSearch(state.confirmedSearch) : Promise.resolve()
    })
  }

  return {
    confirmedContext,
    interpretation,
    pendingClarification,
    conversationQuery,
    isInterpreting,
    isBusy: isSearching || isInterpreting,
    confirmInterpretation,
    cancelInterpretation,
    retryInterpretation,
    retrySearch,
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
