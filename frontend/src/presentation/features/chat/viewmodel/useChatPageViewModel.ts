import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  supportProgramChatSuggestions,
  useSupportProgramChat,
} from '../hooks/useSupportProgramChat'
import { useSupportProgramSearchReadiness } from '../hooks/useSupportProgramSearchReadiness'
import { formatSupportProgramEligibilityCounts } from '../supportProgramEligibility'

const chatMobileMediaQuery = '(max-width: 47.5rem)'

/** 내부 훅을 조합해 ChatPage에 제공할 최종 화면 상태와 사용자 동작을 관리합니다. */
export function useChatPageViewModel() {
  const readiness = useSupportProgramSearchReadiness()
  const chat = useSupportProgramChat()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isComposingInput = useRef(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const sidebarPrimaryActionRef = useRef<HTMLButtonElement>(null)
  const shouldRestoreMenuFocusRef = useRef(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const latestMessage = chat.messages.at(-1)
  const searchStatusAnnouncement = chat.isInterpreting
    ? '메시지의 조건 변경을 해석하고 있습니다. 아직 검색하지 않았습니다.'
    : chat.interpretation.status === 'ready'
      ? '조건 변경안이 준비되었습니다. 확인 버튼을 눌러야 검색합니다.'
      : chat.interpretation.status === 'clarification'
        ? `조건 확인이 필요합니다. ${chat.interpretation.result?.clarificationQuestion ?? ''}`
        : chat.isSearching
    ? '지원사업 공고를 검색하고 있습니다.'
    : latestMessage?.role === 'assistant' && latestMessage.programs
      ? `지원사업 검색 결과 ${latestMessage.programs.length}건: ${formatSupportProgramEligibilityCounts(latestMessage.programs)}을 표시했습니다.`
      : ''

  const closeSidebar = useCallback(() => {
    shouldRestoreMenuFocusRef.current = true
    setIsSidebarOpen(false)
  }, [])

  useEffect(() => {
    const timeline = timelineRef.current
    if (timeline) timeline.scrollTop = timeline.scrollHeight
  }, [chat.messages, chat.isSearching, chat.interpretation.status])

  useEffect(() => {
    if (!isSidebarOpen) {
      if (shouldRestoreMenuFocusRef.current) {
        menuButtonRef.current?.focus()
        shouldRestoreMenuFocusRef.current = false
      }
      return
    }

    const sidebar = sidebarRef.current
    if (!sidebar) return

    focusFirstSidebarElement(sidebar)

    function handleSidebarKeyboardNavigation(event: KeyboardEvent) {
      const currentSidebar = sidebarRef.current
      if (!currentSidebar) return

      if (event.key === 'Escape') {
        event.preventDefault()
        closeSidebar()
        return
      }
      if (event.key !== 'Tab') return

      const focusableElements = getSidebarFocusableElements(currentSidebar)
      if (focusableElements.length === 0) {
        event.preventDefault()
        currentSidebar.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      const activeElement = document.activeElement
      const isFocusInsideSidebar = currentSidebar.contains(activeElement)
      const shouldMoveToFirst = !event.shiftKey && (
        activeElement === lastElement || !isFocusInsideSidebar
      )
      const shouldMoveToLast = event.shiftKey && (
        activeElement === firstElement || activeElement === currentSidebar || !isFocusInsideSidebar
      )

      if (shouldMoveToFirst) {
        event.preventDefault()
        firstElement.focus()
      }
      if (shouldMoveToLast && lastElement) {
        event.preventDefault()
        lastElement.focus()
      }
    }

    document.addEventListener('keydown', handleSidebarKeyboardNavigation)
    return () => document.removeEventListener('keydown', handleSidebarKeyboardNavigation)
  }, [isSidebarOpen, closeSidebar])

  useEffect(() => {
    if (!isSidebarOpen) return

    const mediaQuery = window.matchMedia(chatMobileMediaQuery)

    function closeSidebarForDesktop(event: MediaQueryListEvent) {
      if (event.matches) return

      shouldRestoreMenuFocusRef.current = false
      setIsSidebarOpen(false)
      sidebarPrimaryActionRef.current?.focus()
    }

    mediaQuery.addEventListener('change', closeSidebarForDesktop)
    return () => mediaQuery.removeEventListener('change', closeSidebarForDesktop)
  }, [isSidebarOpen])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void chat.submitMessage()
  }

  function handleStartNewConversation() {
    chat.startNewConversation()
    closeSidebar()
  }

  function handleSelectSuggestion(suggestion: string) {
    chat.selectSuggestion(suggestion)
    closeSidebar()
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

  function openSidebar() {
    shouldRestoreMenuFocusRef.current = false
    setIsSidebarOpen(true)
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
    companyConditionsDraft: chat.companyConditionsDraft,
    conditionsError: chat.conditionsError,
    updateCompanyCondition: chat.updateCompanyCondition,
    applyCompanyConditions: chat.applyCompanyConditions,
    removeCompanyCondition: chat.removeCompanyCondition,
    clearCompanyConditions: chat.clearCompanyConditions,
    updateAcceptingOnly: chat.updateAcceptingOnly,
    canSearch: readiness.canSearch,
    canRetrySearch: readiness.canSearch && chat.canRetrySearch,
    isReadyToSubmit: chat.isReadyToSubmit,
    conversationCount: chat.conversationCount,
    draft: chat.draft,
    isSearching: chat.isSearching,
    messages: chat.messages,
    searchError: chat.searchError,
    cancelSearch: chat.cancelSearch,
    readiness,
    suggestions: supportProgramChatSuggestions,
    isSidebarOpen,
    searchStatusAnnouncement,
    menuButtonRef,
    sidebarRef,
    sidebarPrimaryActionRef,
    timelineRef,
    closeSidebar,
    openSidebar,
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

const sidebarFocusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusFirstSidebarElement(sidebar: HTMLElement) {
  const [firstElement] = getSidebarFocusableElements(sidebar)
  if (firstElement) {
    firstElement.focus()
    return
  }
  sidebar.focus()
}

function getSidebarFocusableElements(sidebar: HTMLElement): HTMLElement[] {
  return Array.from(sidebar.querySelectorAll<HTMLElement>(sidebarFocusableSelector))
    .filter((element) => element.getAttribute('aria-hidden') !== 'true')
}
