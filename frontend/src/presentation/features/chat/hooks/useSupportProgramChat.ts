import { useEffect, useRef } from 'react'

import { appContainer } from '../../../../app/appContainer'
import { useAppDispatch, useAppSelector } from '../../../../app/hooks'
import type { AppDispatch, RootState } from '../../../../app/store'
import type { RestoreSupportProgramSearchUseCase } from '../../../../domain/usecases/RestoreSupportProgramSearchUseCase'
import { SupportProgramSearchRestoreError } from '../../../../domain/errors/SupportProgramSearchRestoreError'
import type { SearchSupportProgramsUseCase } from '../../../../domain/usecases/SearchSupportProgramsUseCase'
import type { InterpretSupportProgramConversationUseCase } from '../../../../domain/usecases/InterpretSupportProgramConversationUseCase'
import type { SupportProgramInterpretRequest } from '../../../../domain/entities/SupportProgramConversation'
import type { SupportProgramSearch } from '../../../../domain/repositories/SupportProgramRepository'
import { SupportProgramRequestError } from '../../../../domain/errors/SupportProgramRequestError'
import { SupportProgramInterpretationError } from '../../../../domain/errors/SupportProgramInterpretationError'
import { SupportProgramSearchTimeoutError } from '../../../../domain/errors/SupportProgramSearchTimeoutError'
import { supportProgramRequestFailureMessage } from '../../../shared/support-program/supportProgramRequestFailureMessage'
import {
  conversationReset,
  draftChanged,
  interpretationStarted,
  interpretationSucceeded,
  interpretationFailed,
  interpretationDismissed,
  interpretationCancelled,
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

export const supportProgramChatSuggestions = [
  '서울 AI 창업지원 사업 찾아줘',
  '현재 접수 중인 수출 지원사업 알려줘',
  '제조기업 R&D 사업을 찾아줘',
]

/** 순차 의미 검색(30초)·점수화(55초)에 여유를 두고 검색 요청 시간을 제한합니다. */
export const supportProgramSearchTimeoutMilliseconds = 90_000
export const supportProgramInterpretationTimeoutMilliseconds = 40_000

type SupportProgramSearchUseCase = Pick<SearchSupportProgramsUseCase, 'execute'>

/** 채팅의 Redux 상태와 검색 요청·취소 수명을 관리하는 내부 훅입니다. */
export function useSupportProgramChat(
  searchSupportProgramsUseCase: SupportProgramSearchUseCase = appContainer.resolve('searchSupportProgramsUseCase'),
  interpretConversationUseCase: Pick<InterpretSupportProgramConversationUseCase, 'execute'> = appContainer.resolve('interpretSupportProgramConversationUseCase'),
  restoreSearchUseCase: Pick<RestoreSupportProgramSearchUseCase, 'execute'> = appContainer.resolve('restoreSupportProgramSearchUseCase'),
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
  const isRestoredHistory = useAppSelector((state) => state.chat.isRestoredHistory)
  const canRetrySearch = useAppSelector(selectCanRetryChatSearch)
  const searchError = useAppSelector(selectChatSearchError)
  const inputError = useAppSelector((state) => state.chat.searchStatus === 'failed' ? null : state.chat.searchError)
  const searchOptions = useAppSelector((state) => state.chat.searchOptions)
  const searchRequestId = useAppSelector((state) => state.chat.activeRequestId)
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

  useEffect(() => {
    // 로그아웃 등으로 Redux의 요청이 초기화되면 화면이 유지되어도 이전 요청을 취소합니다.
    const search = activeSearchRequest.current
    if (search && search.requestId !== searchRequestId) {
      activeSearchRequest.current = null
      clearTimeout(search.timeoutId)
      search.controller.abort()
    }
    const interpreting = activeInterpretationRequest.current
    if (interpreting && interpreting.requestId !== interpretation.requestId) {
      activeInterpretationRequest.current = null
      clearTimeout(interpreting.timeoutId)
      interpreting.controller.abort()
    }
  }, [searchRequestId, interpretation.requestId])

  useEffect(() => () => {
    const interpreting = activeInterpretationRequest.current
    activeInterpretationRequest.current = null
    if (interpreting) {
      clearTimeout(interpreting.timeoutId)
      interpreting.controller.abort()
      dispatchToStore(interpretationCancelled(interpreting.requestId))
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
    const current = activeInterpretationRequest.current
    stopInterpretationRequest()
    dispatchToStore(current ? interpretationCancelled(current.requestId) : interpretationDismissed())
  }

  function selectSuggestion(suggestion: string) {
    dispatchToStore(draftChanged(suggestion))
  }

  function updateDraft(value: string) {
    dispatchToStore(draftChanged(value))
  }

  function runSearch(command: SupportProgramSearch, messageId?: string) {
    async function runSupportProgramSearch(
      dispatchAction: AppDispatch,
      readCurrentState: () => RootState,
    ): Promise<void> {
      const currentState = readCurrentState()
      const currentChatState = selectChatState(currentState)
      const accountEmail = currentState.auth.status === 'authenticated' ? currentState.auth.account?.email : null
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
        let searchResult = await searchSupportProgramsUseCase.execute(
          { ...command, query: searchQuery },
          requestController.signal,
        )

        if (requestController.signal.aborted || readCurrentState().chat.activeRequestId !== requestId) return

        // 회원 화면에 비회원 미리보기가 도착해도 잠금으로 확정하지 않습니다.
        // 같은 결과 토큰을 서버 세션으로 복원하므로 검색·모델 호출을 반복하지 않습니다.
        const latestAuth = readCurrentState().auth
        if (accountEmail && latestAuth.status === 'authenticated'
          && latestAuth.account?.email === accountEmail && searchResult.resultToken) {
          const restored = await restoreSearchUseCase.execute(searchResult.resultToken, requestController.signal)
          if (restored.query !== searchResult.query) throw new SupportProgramSearchRestoreError('unavailable')
          searchResult = restored
        }

        if (requestController.signal.aborted || readCurrentState().chat.activeRequestId !== requestId) return

        const searchSucceededAction = searchSucceeded({
          programs: searchResult.programs,
          totalCount: searchResult.totalCount,
          resultToken: searchResult.resultToken,
          expiresAt: searchResult.expiresAt,
          requestId,
        })
        dispatchAction(searchSucceededAction)
      } catch (error) {
        if (requestController.signal.aborted) return

        const searchFailedAction = searchFailed({
          query: searchQuery,
          requestId,
          message: error instanceof SupportProgramSearchRestoreError
            ? error.reason === 'unauthorized'
              ? '로그인 상태를 확인하지 못했습니다. 새로고침한 뒤 다시 로그인해 주세요.'
              : error.message
            : error instanceof SupportProgramRequestError
              ? supportProgramRequestFailureMessage(error)
              : error instanceof SupportProgramSearchTimeoutError
                ? '서버의 지원사업 검색 시간이 초과되었습니다. 확인한 조건으로 다시 검색해 주세요.'
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
            : error instanceof SupportProgramInterpretationError
              ? error.reason === 'timeout'
                ? '조건 해석 응답이 지연되어 시간이 초과되었습니다. 잠시 후 다시 해석해 주세요.'
                : '조건 해석 서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 해석해 주세요.'
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
      return runInterpretation({ message, context: selectConversationContext(state),
        pendingClarification: state.chat.pendingClarification,
        ...(!state.chat.pendingClarification && state.chat.pendingProposal ? { pendingProposal: state.chat.pendingProposal } : {}),
        ...(state.chat.lastSearch ? { lastSearch: state.chat.lastSearch } : {}),
      })
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
      const state = getState().chat
      if (state.draft.trim()) return Promise.resolve()
      const current = state.interpretation
      if (current.status !== 'ready' || !current.requestId || !current.result?.proposedContext.query) return Promise.resolve()
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
    isRestoredHistory,
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
    conversationCount,
    canRetrySearch,
    draft,
    isReadyToSubmit,
    isSearching,
    messages,
    cancelSearch,
    searchError,
    inputError,
    selectSuggestion,
    startNewConversation,
    submitMessage,
    updateDraft,
  }
}
