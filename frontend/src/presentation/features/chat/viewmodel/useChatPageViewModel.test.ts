// @vitest-environment jsdom

import { type FormEvent } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { supportPrograms } from '../../../../data/fixtures/supportPrograms'
import type { useSupportProgramChatViewModel } from './useSupportProgramChatViewModel'
import { useChatPageViewModel } from './useChatPageViewModel'
import type { useSupportProgramSearchReadinessViewModel } from './useSupportProgramSearchReadinessViewModel'

const viewModelMocks = vi.hoisted(() => ({
  chat: vi.fn(),
  readiness: vi.fn(),
}))

vi.mock('./useSupportProgramChatViewModel', () => ({
  supportProgramChatSuggestions: [
    '서울 AI 창업지원 사업 찾아줘',
    '현재 접수 중인 수출 지원사업 알려줘',
    '제조기업 R&D 사업을 찾아줘',
  ],
  useSupportProgramChatViewModel: viewModelMocks.chat,
}))

vi.mock('./useSupportProgramSearchReadinessViewModel', () => ({
  useSupportProgramSearchReadinessViewModel: viewModelMocks.readiness,
}))

type ChatViewModel = ReturnType<typeof useSupportProgramChatViewModel>
type ReadinessViewModel = ReturnType<typeof useSupportProgramSearchReadinessViewModel>

beforeEach(() => {
  viewModelMocks.chat.mockReturnValue(createChatViewModel())
  viewModelMocks.readiness.mockReturnValue(createReadinessViewModel())
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('useChatPageViewModel', () => {
  it('검색 불가 상태에서 직접 호출해도 제출·재시도·추천 선택을 위임하지 않는다', () => {
    const chat = createChatViewModel({
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
    viewModelMocks.chat.mockReturnValue(chat)
    viewModelMocks.readiness.mockReturnValue(createReadinessViewModel({ canSearch: false }))
    const { result } = renderHook(() => useChatPageViewModel())
    const submitEvent = createSubmitEvent()

    act(() => result.current.openSidebar())
    act(() => {
      result.current.handleSubmit(submitEvent.event)
      result.current.handleRetrySearch()
      result.current.handleSelectSuggestion('서울 AI')
    })

    expect(submitEvent.preventDefault).toHaveBeenCalledOnce()
    expect(chat.submitMessage).not.toHaveBeenCalled()
    expect(chat.selectSuggestion).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({
      canSearch: false,
      canRetrySearch: false,
      isReadyToSubmit: false,
      isSidebarOpen: true,
    })
  })

  it('검색 가능 상태에서 하위 ViewModel에 위임하고 추천 선택 후 사이드바를 닫는다', () => {
    const chat = createChatViewModel({
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
    const readiness = createReadinessViewModel()
    viewModelMocks.chat.mockReturnValue(chat)
    viewModelMocks.readiness.mockReturnValue(readiness)
    const { result } = renderHook(() => useChatPageViewModel())
    const submitEvent = createSubmitEvent()

    act(() => {
      result.current.handleSubmit(submitEvent.event)
      result.current.handleRetrySearch()
    })
    expect(submitEvent.preventDefault).toHaveBeenCalledOnce()
    expect(chat.submitMessage).toHaveBeenCalledTimes(2)

    act(() => result.current.openSidebar())
    expect(result.current.isSidebarOpen).toBe(true)
    act(() => result.current.handleSelectSuggestion('서울 AI'))
    expect(chat.selectSuggestion).toHaveBeenCalledWith('서울 AI')
    expect(result.current.isSidebarOpen).toBe(false)

    act(() => result.current.refetchReadiness())
    expect(readiness.refetch).toHaveBeenCalledOnce()
  })

  it('준비 상태가 바뀌면 검색·재시도·제출 가능 여부를 다시 계산한다', () => {
    const chat = createChatViewModel({
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
    let readiness = createReadinessViewModel({ canSearch: false })
    viewModelMocks.chat.mockReturnValue(chat)
    viewModelMocks.readiness.mockImplementation(() => readiness)
    const { result, rerender } = renderHook(() => useChatPageViewModel())

    expect(result.current).toMatchObject({
      canSearch: false,
      canRetrySearch: false,
      isReadyToSubmit: false,
    })

    readiness = createReadinessViewModel({ canSearch: true })
    rerender()

    expect(result.current).toMatchObject({
      canSearch: true,
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
  })

  it('검색 불가 상태에서도 새 대화를 시작하고 사이드바를 닫는다', () => {
    const chat = createChatViewModel()
    viewModelMocks.chat.mockReturnValue(chat)
    viewModelMocks.readiness.mockReturnValue(createReadinessViewModel({ canSearch: false }))
    const { result } = renderHook(() => useChatPageViewModel())

    act(() => result.current.openSidebar())
    expect(result.current.isSidebarOpen).toBe(true)
    act(() => result.current.handleStartNewConversation())

    expect(chat.startNewConversation).toHaveBeenCalledOnce()
    expect(result.current.isSidebarOpen).toBe(false)
  })

  it('검색 중·0건·성공 결과를 스크린 리더 안내로 구분한다', () => {
    let chat = createChatViewModel({
      isSearching: true,
      messages: [{
        id: 'previous-result',
        role: 'assistant',
        text: '검색 결과',
        programs: [supportPrograms[0]],
      }],
    })
    viewModelMocks.chat.mockImplementation(() => chat)
    const { result, rerender } = renderHook(() => useChatPageViewModel())

    expect(result.current.searchStatusAnnouncement).toBe('지원사업 공고를 검색하고 있습니다.')

    chat = createChatViewModel({
      messages: [{ id: 'empty-result', role: 'assistant', text: '결과 없음', programs: [] }],
    })
    rerender()
    expect(result.current.searchStatusAnnouncement).toBe('지원사업 검색 결과 0건을 표시했습니다.')

    chat = createChatViewModel({
      messages: [{
        id: 'successful-result',
        role: 'assistant',
        text: '검색 결과',
        programs: supportPrograms.slice(0, 2),
      }],
    })
    rerender()
    expect(result.current.searchStatusAnnouncement).toBe('지원사업 검색 결과 2건을 표시했습니다.')
  })
})

function createChatViewModel(overrides: Partial<ChatViewModel> = {}): ChatViewModel {
  return {
    canRetrySearch: false,
    conversationCount: 0,
    cancelSearch: vi.fn(),
    draft: '',
    isReadyToSubmit: false,
    isSearching: false,
    messages: [{ id: 'welcome', role: 'assistant', text: '안녕하세요.' }],
    searchError: null,
    selectSuggestion: vi.fn(),
    startNewConversation: vi.fn(),
    submitMessage: vi.fn().mockResolvedValue(undefined),
    updateDraft: vi.fn(),
    ...overrides,
  }
}

function createReadinessViewModel(
  overrides: Partial<ReadinessViewModel> = {},
): ReadinessViewModel {
  return {
    canSearch: true,
    data: {
      searchState: 'SEARCHABLE',
      programCount: 12,
      indexReady: true,
      lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
      lastFailedSyncAt: null,
      sources: [{
        sourceCode: 'BIZINFO',
        sourceName: '기업마당',
        searchState: 'SEARCHABLE',
        programCount: 12,
        indexReady: true,
        lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
        lastFailedSyncAt: null,
      }],
    },
    isError: false,
    isInitialLoading: false,
    isRefreshing: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createSubmitEvent() {
  const preventDefault = vi.fn()
  return {
    event: { preventDefault } as unknown as FormEvent<HTMLFormElement>,
    preventDefault,
  }
}
