import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import {
  supportProgramChatSuggestions,
  useSupportProgramChat,
} from '../hooks/useSupportProgramChat'
import { useSupportProgramSearchReadiness } from '../hooks/useSupportProgramSearchReadiness'
import { formatSupportProgramEligibilityCounts } from '../supportProgramEligibility'

/** 내부 훅을 조합해 ChatPage에 제공할 최종 화면 상태와 사용자 동작을 관리합니다. */
export function useChatPageViewModel() {
  const readiness = useSupportProgramSearchReadiness()
  const chat = useSupportProgramChat()
  const isComposingInput = useRef(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const composerInputRef = useRef<HTMLTextAreaElement>(null)
  const focusComposerAfterAction = useRef(false)
  const latestMessage = chat.messages.at(-1)
  const previousTimelineState = useRef({
    isInitial: true,
    latestMessageId: latestMessage?.id,
    interpretationStatus: chat.interpretation.status,
    isSearching: chat.isSearching,
  })
  const searchStatusAnnouncement = useMemo(() => chat.isInterpreting
    ? '메시지의 조건 변경을 해석하고 있습니다. 아직 검색하지 않았습니다.'
    : chat.interpretation.status === 'ready'
      ? '조건 변경안이 준비되었습니다. 확인 버튼을 눌러야 검색합니다.'
      : chat.interpretation.status === 'clarification'
        ? `조건 확인이 필요합니다. ${chat.interpretation.result?.clarificationQuestion ?? ''}`
        : chat.isSearching
    ? '지원사업 공고를 검색하고 있습니다.'
    : latestMessage?.role === 'assistant' && latestMessage.programs
      ? `지원사업 검색 결과 ${latestMessage.programs.length}건: ${formatSupportProgramEligibilityCounts(latestMessage.programs)}을 표시했습니다.`
      : '', [chat.isInterpreting, chat.interpretation.status, chat.interpretation.result?.clarificationQuestion,
        chat.isSearching, latestMessage])

  useEffect(() => {
    const previous = previousTimelineState.current
    const latestMessageId = chat.messages.at(-1)?.id
    const hasNewContent = (latestMessageId !== previous.latestMessageId && chat.messages.length > 1)
      || (chat.isSearching && !previous.isSearching)
      || (chat.interpretation.status !== previous.interpretationStatus
        && ['pending', 'ready', 'clarification'].includes(chat.interpretation.status))
    previousTimelineState.current = {
      isInitial: false,
      latestMessageId,
      interpretationStatus: chat.interpretation.status,
      isSearching: chat.isSearching,
    }
    if (focusComposerAfterAction.current) {
      focusComposerAfterAction.current = false
      composerInputRef.current?.focus()
      return
    }
    if (!hasNewContent && !previous.isInitial) return
    const timeline = timelineRef.current
    if (!timeline) return
    const overflowY = getComputedStyle(timeline).overflowY
    if (timeline.scrollHeight > timeline.clientHeight && ['auto', 'scroll'].includes(overflowY)) {
      timeline.scrollTop = timeline.scrollHeight
    } else if (hasNewContent) {
      // 공개 화면·모바일은 타임라인 내부가 아닌 문서 전체가 스크롤됩니다.
      timeline.lastElementChild?.scrollIntoView?.({ block: 'start' })
    }
  }, [chat.messages, chat.isSearching, chat.interpretation.status])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void chat.submitMessage()
  }

  function handleStartNewConversation() {
    focusComposerAfterAction.current = true
    chat.startNewConversation()
  }

  function handleCancelSearch() {
    focusComposerAfterAction.current = true
    chat.cancelSearch()
  }

  function handleSelectSuggestion(suggestion: string) {
    chat.selectSuggestion(suggestion)
  }

  function handleRetrySearch() {
    if (!readiness.canSearch) return
    void chat.retrySearch()
  }

  function handleConfirmInterpretation() {
    if (!readiness.canSearch) return
    void chat.confirmInterpretation()
  }

  function handleRetryInterpretation() {
    void chat.retryInterpretation()
  }

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    chat.updateDraft(event.target.value)
  }

  function handleCompositionStart() {
    isComposingInput.current = true
  }

  function handleCompositionEnd() {
    isComposingInput.current = false
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (
      isComposingInput.current ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  function refetchReadiness() {
    void readiness.refetch()
  }

  return {
    confirmedContext: chat.confirmedContext,
    interpretation: chat.interpretation,
    pendingClarification: chat.pendingClarification,
    isInterpreting: chat.isInterpreting,
    isBusy: chat.isBusy,
    cancelInterpretation: chat.cancelInterpretation,
    handleConfirmInterpretation,
    handleRetryInterpretation,
    searchOptions: chat.searchOptions,
    canSearch: readiness.canSearch,
    canRetrySearch: readiness.canSearch && chat.canRetrySearch,
    isReadyToSubmit: chat.isReadyToSubmit,
    conversationCount: chat.conversationCount,
    draft: chat.draft,
    isSearching: chat.isSearching,
    messages: chat.messages,
    searchError: chat.searchError,
    cancelSearch: handleCancelSearch,
    readiness,
    suggestions: supportProgramChatSuggestions,
    searchStatusAnnouncement,
    timelineRef,
    composerInputRef,
    handleSubmit,
    handleStartNewConversation,
    handleSelectSuggestion,
    handleRetrySearch,
    handleDraftChange,
    handleCompositionStart,
    handleCompositionEnd,
    handleInputKeyDown,
    refetchReadiness,
  }
}
